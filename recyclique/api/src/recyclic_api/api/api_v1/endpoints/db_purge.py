"""
Database purge endpoint for SuperAdmins.
Allows secure deletion of transactional data.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text, func, select

from recyclic_api.core.database import get_db
from recyclic_api.core.auth import require_super_admin_role
from recyclic_api.core.redis import get_redis
from recyclic_api.core.step_up import (
    SENSITIVE_OPERATION_DB_PURGE_TRANSACTIONS,
    STEP_UP_PIN_HEADER,
    verify_step_up_pin_header,
)
from recyclic_api.core.audit import log_system_action
from recyclic_api.models.audit_log import AuditActionType
from recyclic_api.models.user import User
from recyclic_api.services.idempotency_support import (
    body_fingerprint_sensitive_no_body,
    get_cached_idempotent_close,
    redis_key_db_purge_idempotent,
    store_idempotent_close,
    validate_or_raise_idempotency_conflict,
)

router = APIRouter(tags=["admin"])
logger = logging.getLogger(__name__)


@router.post(
    "/db/purge-transactions",
    summary="Purge sécurisée des données transactionnelles (Super Admin uniquement)",
    description="Supprime toutes les données de ventes, réceptions et sessions de caisse. Action irréversible.",
    status_code=status.HTTP_200_OK
)
async def purge_transactional_data(
    request: Request,
    current_user: User = Depends(require_super_admin_role()),
    db: Session = Depends(get_db),
    redis_client=Depends(get_redis),
):
    """
    Supprime de manière sécurisée toutes les données transactionnelles de l'application.

    Tables affectées (dans cet ordre pour respecter les contraintes de clés étrangères) :
    - sale_items (lignes de vente)
    - sales (ventes)
    - ligne_depot (lignes de dépôt)
    - ticket_depot (tickets de dépôt)
    - cash_sessions (sessions de caisse)

    Tables préservées :
    - users, sites, categories, cash_registers (configuration)

    Restrictions:
    - Accessible uniquement aux Super-Admins
    - Action irréversible
    - Exécutée dans une transaction unique
    """
    verify_step_up_pin_header(
        user=current_user,
        pin_header_value=request.headers.get(STEP_UP_PIN_HEADER),
        redis_client=redis_client,
        operation=SENSITIVE_OPERATION_DB_PURGE_TRANSACTIONS,
    )
    idem_raw = request.headers.get("Idempotency-Key")
    if not idem_raw or not str(idem_raw).strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "IDEMPOTENCY_KEY_REQUIRED",
                "message": "En-tête Idempotency-Key requis pour la purge transactionnelle (Story 16.3).",
            },
        )
    idempotency_key = str(idem_raw).strip()
    body_fp = body_fingerprint_sensitive_no_body()
    rkey = redis_key_db_purge_idempotent(str(current_user.id), idempotency_key)
    cached = get_cached_idempotent_close(redis_client, rkey)
    if cached:
        status_c, body = validate_or_raise_idempotency_conflict(cached, body_fp)
        return JSONResponse(status_code=status_c, content=body)

    _ip = request.client.host if request.client else None
    _ua = request.headers.get("user-agent")

    try:
        logger.warning(f"Database purge requested by user {current_user.id} ({current_user.username})")

        # Ordre de suppression pour respecter les contraintes de clés étrangères
        tables_to_purge = [
            "sale_items",
            "sales",
            "ligne_depot",
            "ticket_depot",
            "cash_sessions",
        ]

        deleted_counts = {}

        try:
            for table in tables_to_purge:
                count_query = text(f"SELECT COUNT(*) FROM {table}")
                count_result = db.execute(count_query).scalar()

                delete_query = text(f"DELETE FROM {table}")
                db.execute(delete_query)

                deleted_counts[table] = count_result
                logger.info(f"Deleted {count_result} records from {table}")

            db.commit()

        except Exception:
            db.rollback()
            raise

        logger.warning(f"Database purge completed by user {current_user.id}. Records deleted: {deleted_counts}")

        ts = db.execute(select(func.now())).scalar()
        ts_out = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)

        log_system_action(
            action_type=AuditActionType.DB_PURGE,
            actor=current_user,
            target_type="database",
            details={
                "success": True,
                "deleted_records": {k: int(v or 0) for k, v in deleted_counts.items()},
            },
            description="Purge des données transactionnelles réussie",
            ip_address=_ip,
            user_agent=_ua,
            db=db,
        )

        payload = {
            "message": "Purge des données transactionnelles effectuée avec succès",
            "deleted_records": deleted_counts,
            "timestamp": ts_out,
        }
        try:
            store_idempotent_close(redis_client, rkey, body_fp, 200, payload)
        except Exception as idem_err:
            logger.warning("idempotency store failed after purge success: %s", type(idem_err).__name__)

        return payload

    except HTTPException:
        raise
    except Exception as e:
        try:
            db.rollback()
        except Exception:
            pass
        logger.error(f"Database purge failed: {str(e)}", exc_info=True)
        try:
            log_system_action(
                action_type=AuditActionType.DB_PURGE,
                actor=current_user,
                target_type="database",
                details={
                    "success": False,
                    "error_type": "purge_failed",
                    "error_message": str(e)[:500],
                },
                description="Échec purge des données transactionnelles",
                ip_address=_ip,
                user_agent=_ua,
                db=db,
            )
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la purge des données: {str(e)}"
        ) from e
