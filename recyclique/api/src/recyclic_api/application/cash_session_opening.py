"""
ARCH-04 : ouverture de session caisse (POST /cash-sessions/).

Orchestration : permissions saisie différée, anti-doublon opérateur, création,
audit, enrichissement de réponse — sans logique HTTP FastAPI.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from recyclic_api.core.audit import log_cash_session_opening
from recyclic_api.core.auth import user_has_permission
from recyclic_api.core.exceptions import ConflictError, NotFoundError, ValidationError
from recyclic_api.models.user import User, UserRole
from recyclic_api.schemas.cash_session import CashSessionCreate, CashSessionResponse
from recyclic_api.services.cash_session_response_enrichment import enrich_session_response
from recyclic_api.services.cash_session_service import CashSessionService
from recyclic_api.utils.domain_exception_http import raise_domain_exception_as_http

logger = logging.getLogger(__name__)

_CASH_DOMAIN_HTTP = {
    "not_found_status": 404,
    "conflict_status": 400,
    "validation_status": 400,
}


def open_cash_session(
    db: Session,
    current_user: User,
    session_data: CashSessionCreate,
    request_id: Optional[str] = None,
) -> CashSessionResponse:
    """Crée une session de caisse (même comportement que l'ancien corps de route)."""
    service = CashSessionService(db)
    pending_site = str(session_data.site_id) if session_data.site_id else None
    pending_register = str(session_data.register_id) if session_data.register_id else None
    try:
        if session_data.opened_at is not None:
            has_deferred_permission = user_has_permission(
                current_user, "caisse.deferred.access", db
            )
            is_admin = current_user.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]

            if not (is_admin or has_deferred_permission):
                log_cash_session_opening(
                    user_id=str(current_user.id),
                    username=current_user.username or "Unknown",
                    session_id="",
                    opening_amount=session_data.initial_amount,
                    success=False,
                    db=db,
                    request_id=request_id,
                    site_id=pending_site,
                    cash_register_id=pending_register,
                    outcome="refused",
                )
                raise HTTPException(
                    status_code=403,
                    detail=(
                        "Permission requise: caisse.deferred.access pour créer des sessions "
                        "avec une date personnalisée (saisie différée)"
                    ),
                )

        if session_data.opened_at is None:
            existing_session = service.get_open_session_by_operator(session_data.operator_id)
            if existing_session:
                log_cash_session_opening(
                    user_id=str(current_user.id),
                    username=current_user.username or "Unknown",
                    session_id="",
                    opening_amount=session_data.initial_amount,
                    success=False,
                    db=db,
                    request_id=request_id,
                    site_id=pending_site,
                    cash_register_id=pending_register,
                )
                raise HTTPException(
                    status_code=400,
                    detail="Une session de caisse est déjà ouverte pour cet opérateur",
                )

        cash_session = service.create_session(
            operator_id=session_data.operator_id,
            site_id=session_data.site_id,
            initial_amount=session_data.initial_amount,
            register_id=session_data.register_id,
            opened_at=session_data.opened_at,
        )

        is_deferred = session_data.opened_at is not None
        log_cash_session_opening(
            user_id=str(current_user.id),
            username=current_user.username or "Unknown",
            session_id=str(cash_session.id),
            opening_amount=session_data.initial_amount,
            success=True,
            is_deferred=is_deferred,
            opened_at=session_data.opened_at,
            created_at=datetime.now(timezone.utc) if is_deferred else None,
            db=db,
            request_id=request_id,
            site_id=str(cash_session.site_id) if cash_session.site_id else None,
            cash_register_id=str(cash_session.register_id) if cash_session.register_id else None,
        )

        try:
            db.refresh(cash_session)
            return enrich_session_response(cash_session, service)
        except Exception as serialization_error:
            logger.error(
                "Erreur lors de la sérialisation de la session %s: %s",
                cash_session.id,
                serialization_error,
                exc_info=True,
            )
            return CashSessionResponse(
                id=str(cash_session.id),
                operator_id=str(cash_session.operator_id),
                site_id=str(cash_session.site_id),
                register_id=str(cash_session.register_id) if cash_session.register_id else None,
                initial_amount=cash_session.initial_amount,
                current_amount=cash_session.current_amount,
                status=cash_session.status,
                opened_at=cash_session.opened_at,
                closed_at=cash_session.closed_at,
                total_sales=cash_session.total_sales,
                total_items=cash_session.total_items,
                closing_amount=cash_session.closing_amount,
                actual_amount=cash_session.actual_amount,
                variance=cash_session.variance,
                variance_comment=cash_session.variance_comment,
                accounting_config_revision_id=(
                    str(cash_session.accounting_config_revision_id)
                    if cash_session.accounting_config_revision_id
                    else None
                ),
            )
    except NotFoundError as e:
        log_cash_session_opening(
            user_id=str(current_user.id),
            username=current_user.username or "Unknown",
            session_id="",
            opening_amount=session_data.initial_amount,
            success=False,
            db=db,
            request_id=request_id,
            site_id=pending_site,
            cash_register_id=pending_register,
        )
        raise_domain_exception_as_http(e, **_CASH_DOMAIN_HTTP)
    except ConflictError as e:
        log_cash_session_opening(
            user_id=str(current_user.id),
            username=current_user.username or "Unknown",
            session_id="",
            opening_amount=session_data.initial_amount,
            success=False,
            db=db,
            request_id=request_id,
            site_id=pending_site,
            cash_register_id=pending_register,
        )
        raise_domain_exception_as_http(e, **_CASH_DOMAIN_HTTP)
    except ValidationError as e:
        log_cash_session_opening(
            user_id=str(current_user.id),
            username=current_user.username or "Unknown",
            session_id="",
            opening_amount=session_data.initial_amount,
            success=False,
            db=db,
            request_id=request_id,
            site_id=pending_site,
            cash_register_id=pending_register,
        )
        raise_domain_exception_as_http(e, **_CASH_DOMAIN_HTTP)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Unexpected error in open_cash_session: %s", e, exc_info=True)
        log_cash_session_opening(
            user_id=str(current_user.id),
            username=current_user.username or "Unknown",
            session_id="",
            opening_amount=session_data.initial_amount,
            success=False,
            db=db,
            request_id=request_id,
            site_id=pending_site,
            cash_register_id=pending_register,
        )
        raise HTTPException(
            status_code=500,
            detail="Erreur lors de la création de la session de caisse",
        )
