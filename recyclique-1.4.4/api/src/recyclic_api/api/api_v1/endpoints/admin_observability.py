"""
Endpoints admin : observabilité — lecture des journaux (transaction, audit, email).

Enregistrés sur le même ``APIRouter`` que ``admin.py`` (préfixe /admin inchangé).
"""

from __future__ import annotations

import ast
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status as http_status
from sqlalchemy import String, and_, cast, desc, or_
from sqlalchemy.orm import Session
from slowapi import Limiter

from recyclic_api.core.audit import log_admin_access
from recyclic_api.core.auth import require_admin_role_strict
from recyclic_api.core.database import get_db
from recyclic_api.core.user_identity import username_or_telegram_id
from recyclic_api.core.logging import TRANSACTION_LOG_FILE
from recyclic_api.models.user import User
from recyclic_api.schemas.email_log import EmailLogListResponse
from recyclic_api.services.email_log_service import EmailLogService

logger = logging.getLogger(__name__)


def register_admin_observability_routes(router: APIRouter, limiter: Limiter) -> None:
    """Enregistre GET /transaction-logs, /audit-log, /email-logs."""

    @router.get(
        "/transaction-logs",
        response_model=dict,
        summary="Logs transactionnels (Admin)",
        description="Récupère les logs transactionnels avec filtres et pagination",
    )
    @limiter.limit("30/minute")
    async def get_transaction_logs(
        request: Request,
        _: User = Depends(require_admin_role_strict()),
        page: int = Query(1, ge=1, description="Numéro de page"),
        page_size: int = Query(50, ge=1, le=200, description="Taille de page"),
        event_type: Optional[str] = Query(None, description="Filtrer par type d'événement"),
        user_id: Optional[str] = Query(None, description="Filtrer par ID utilisateur"),
        session_id: Optional[str] = Query(None, description="Filtrer par ID session"),
        start_date: Optional[datetime] = Query(None, description="Date de début (ISO format)"),
        end_date: Optional[datetime] = Query(None, description="Date de fin (ISO format)"),
    ):
        """
        Récupère les logs transactionnels avec filtres et pagination.
        Seuls les administrateurs peuvent accéder à cette fonctionnalité.

        B48-P2: Endpoint pour consulter les logs transactionnels depuis l'interface admin.
        """
        try:
            log_path = TRANSACTION_LOG_FILE.absolute()
            log_exists = TRANSACTION_LOG_FILE.exists()
            logger.info(f"Reading transaction logs from: {log_path}")
            logger.info(f"Log file exists: {log_exists}")

            log_files = []
            if TRANSACTION_LOG_FILE.exists():
                log_files.append(TRANSACTION_LOG_FILE)
                logger.info(f"Found main log file: {TRANSACTION_LOG_FILE}")
            else:
                logger.warning(f"Transaction log file not found: {log_path}")
                return {
                    "entries": [],
                    "pagination": {
                        "page": page,
                        "page_size": page_size,
                        "total_count": 0,
                        "total_pages": 0,
                        "has_next": False,
                        "has_prev": False,
                    },
                }

            for i in range(1, 6):
                backup_file = Path(f"{TRANSACTION_LOG_FILE}.{i}")
                if backup_file.exists():
                    log_files.append(backup_file)
                    logger.info(f"Found backup log file: {backup_file}")

            all_entries = []
            for log_file in log_files:
                try:
                    with open(log_file, encoding="utf-8") as f:
                        for line_num, line in enumerate(f, 1):
                            line = line.strip()
                            if not line:
                                continue
                            try:
                                entry = json.loads(line)
                                if (
                                    "message" in entry
                                    and isinstance(entry["message"], str)
                                    and "event" not in entry
                                ):
                                    try:
                                        parsed_msg = ast.literal_eval(entry["message"])
                                        if isinstance(parsed_msg, dict):
                                            entry = parsed_msg
                                    except (ValueError, SyntaxError):
                                        pass
                                all_entries.append(entry)
                            except json.JSONDecodeError:
                                logger.warning(
                                    f"Ligne invalide dans {log_file}:{line_num}: {line[:100]}"
                                )
                                continue
                except Exception as e:
                    logger.error(f"Erreur lors de la lecture de {log_file}: {e}", exc_info=True)
                    continue

            logger.info(f"Total entries parsed: {len(all_entries)}")

            def get_sort_key(entry):
                timestamp = entry.get("timestamp", "")
                if not timestamp:
                    return "0000-00-00T00:00:00"
                return timestamp

            all_entries.sort(key=get_sort_key, reverse=True)
            logger.info(
                f"Entries sorted, first entry event: {all_entries[0].get('event') if all_entries else 'None'}"
            )

            filtered_entries = []
            logger.info(
                f"Applying filters: event_type={event_type}, user_id={user_id}, "
                f"session_id={session_id}, start_date={start_date}, end_date={end_date}"
            )

            for entry in all_entries:
                if event_type and entry.get("event") != event_type:
                    continue
                if user_id and entry.get("user_id") != user_id:
                    continue
                if session_id and entry.get("session_id") != session_id:
                    continue

                entry_timestamp = entry.get("timestamp")
                if entry_timestamp:
                    try:
                        timestamp_str = entry_timestamp
                        if timestamp_str.endswith("Z"):
                            if "+00:00" not in timestamp_str and "-00:00" not in timestamp_str:
                                timestamp_str = timestamp_str[:-1] + "+00:00"
                        entry_dt = datetime.fromisoformat(timestamp_str)
                        if start_date and entry_dt < start_date:
                            continue
                        if end_date and entry_dt > end_date:
                            continue
                    except (ValueError, AttributeError) as e:
                        logger.warning(f"Erreur de parsing timestamp '{entry_timestamp}': {e}")

                filtered_entries.append(entry)

            logger.info(f"Filtered entries count: {len(filtered_entries)}")

            total_count = len(filtered_entries)
            offset = (page - 1) * page_size
            paginated_entries = filtered_entries[offset : offset + page_size]

            total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 0
            has_next = page < total_pages
            has_prev = page > 1

            logger.info(
                f"Returning {len(paginated_entries)} entries (page {page}/{total_pages}, total: {total_count})"
            )

            return {
                "entries": paginated_entries,
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total_count": total_count,
                    "total_pages": total_pages,
                    "has_next": has_next,
                    "has_prev": has_prev,
                },
            }
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des logs transactionnels: {e}", exc_info=True)
            raise HTTPException(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors de la récupération des logs transactionnels: {str(e)}",
            )

    @router.get(
        "/audit-log",
        response_model=dict,
        summary="Journal d'audit (Admin)",
        description="Récupère le journal d'audit avec filtres et pagination",
    )
    @limiter.limit("30/minute")
    async def get_audit_log(
        request: Request,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_admin_role_strict()),
        page: int = Query(1, ge=1, description="Numéro de page"),
        page_size: int = Query(20, ge=1, le=100, description="Taille de page"),
        action_type: Optional[str] = Query(None, description="Filtrer par type d'action"),
        actor_username: Optional[str] = Query(None, description="Filtrer par nom d'utilisateur acteur"),
        target_type: Optional[str] = Query(None, description="Filtrer par type de cible"),
        start_date: Optional[datetime] = Query(None, description="Date de début (ISO format)"),
        end_date: Optional[datetime] = Query(None, description="Date de fin (ISO format)"),
        search: Optional[str] = Query(None, description="Recherche dans description ou détails"),
    ):
        """
        Récupère le journal d'audit avec filtres et pagination.
        Seuls les administrateurs peuvent accéder à cette fonctionnalité.
        """
        try:
            from recyclic_api.models.audit_log import AuditLog

            query = db.query(AuditLog)
            filters = []

            if action_type:
                filters.append(AuditLog.action_type == action_type)
            if actor_username:
                filters.append(AuditLog.actor_username.ilike(f"%{actor_username}%"))
            if target_type:
                filters.append(AuditLog.target_type == target_type)
            if start_date:
                filters.append(AuditLog.timestamp >= start_date)
            if end_date:
                filters.append(AuditLog.timestamp <= end_date)
            if search:
                search_filter = or_(
                    AuditLog.description.ilike(f"%{search}%"),
                    cast(AuditLog.details_json, String).ilike(f"%{search}%"),
                )
                filters.append(search_filter)

            if filters:
                query = query.filter(and_(*filters))

            total_count = query.count()
            offset = (page - 1) * page_size
            audit_entries = query.order_by(desc(AuditLog.timestamp)).offset(offset).limit(page_size).all()

            total_pages = (total_count + page_size - 1) // page_size
            has_next = page < total_pages
            has_prev = page > 1

            entries = []
            for entry in audit_entries:
                actor_display_name = entry.actor_username or "Système"
                if entry.actor_id:
                    actor_user = db.query(User).filter(User.id == entry.actor_id).first()
                    if actor_user:
                        if actor_user.first_name and actor_user.last_name:
                            if actor_user.username:
                                actor_display_name = (
                                    f"{actor_user.first_name} {actor_user.last_name} (@{actor_user.username})"
                                )
                            else:
                                actor_display_name = (
                                    f"{actor_user.first_name} {actor_user.last_name}"
                                )
                        elif actor_user.first_name:
                            if actor_user.username:
                                actor_display_name = f"{actor_user.first_name} (@{actor_user.username})"
                            else:
                                actor_display_name = actor_user.first_name
                        elif actor_user.username:
                            actor_display_name = f"@{actor_user.username}"
                        else:
                            actor_display_name = f"ID: {str(actor_user.id)[:8]}..."

                target_display_name = None
                if entry.target_id and entry.target_type == "user":
                    target_user = db.query(User).filter(User.id == entry.target_id).first()
                    if target_user:
                        if target_user.first_name and target_user.last_name:
                            if target_user.username:
                                target_display_name = (
                                    f"{target_user.first_name} {target_user.last_name} (@{target_user.username})"
                                )
                            else:
                                target_display_name = (
                                    f"{target_user.first_name} {target_user.last_name}"
                                )
                        elif target_user.first_name:
                            if target_user.username:
                                target_display_name = f"{target_user.first_name} (@{target_user.username})"
                            else:
                                target_display_name = target_user.first_name
                        elif target_user.username:
                            target_display_name = f"@{target_user.username}"
                        else:
                            target_display_name = f"ID: {str(target_user.id)[:8]}..."

                improved_description = entry.description
                if entry.description and entry.target_id and target_display_name:
                    improved_description = entry.description.replace(
                        str(entry.target_id),
                        target_display_name,
                    )

                entry_data = {
                    "id": str(entry.id),
                    "timestamp": entry.timestamp.isoformat(),
                    "actor_id": str(entry.actor_id) if entry.actor_id else None,
                    "actor_username": actor_display_name,
                    "action_type": entry.action_type,
                    "target_id": str(entry.target_id) if entry.target_id else None,
                    "target_username": target_display_name,
                    "target_type": entry.target_type,
                    "details": entry.details_json,
                    "description": improved_description,
                    "ip_address": entry.ip_address,
                    "user_agent": entry.user_agent,
                }
                entries.append(entry_data)

            logger.info(
                f"Audit log accessed by admin {current_user.id}",
                extra={
                    "admin_user_id": str(current_user.id),
                    "admin_username": username_or_telegram_id(
                        current_user.username, current_user.telegram_id
                    ),
                    "action": "audit_log_access",
                    "filters": {
                        "action_type": action_type,
                        "actor_username": actor_username,
                        "target_type": target_type,
                        "start_date": start_date.isoformat() if start_date else None,
                        "end_date": end_date.isoformat() if end_date else None,
                        "search": search,
                    },
                    "page": page,
                    "page_size": page_size,
                    "total_count": total_count,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
            )

            return {
                "entries": entries,
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total_count": total_count,
                    "total_pages": total_pages,
                    "has_next": has_next,
                    "has_prev": has_prev,
                },
                "filters_applied": {
                    "action_type": action_type,
                    "actor_username": actor_username,
                    "target_type": target_type,
                    "start_date": start_date.isoformat() if start_date else None,
                    "end_date": end_date.isoformat() if end_date else None,
                    "search": search,
                },
            }

        except Exception as e:
            logger.error(f"Erreur lors de la récupération du journal d'audit: {str(e)}")
            raise HTTPException(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors de la récupération du journal d'audit: {str(e)}",
            )

    @router.get(
        "/email-logs",
        response_model=EmailLogListResponse,
        summary="Liste des logs d'emails (Admin)",
        description="Récupère la liste des emails envoyés avec filtrage et pagination",
    )
    @limiter.limit("30/minute")
    async def get_email_logs(
        request: Request,
        recipient_email: Optional[str] = Query(None, description="Filtrer par adresse email du destinataire"),
        status: Optional[str] = Query(None, description="Filtrer par statut de l'email"),
        email_type: Optional[str] = Query(None, description="Filtrer par type d'email"),
        user_id: Optional[str] = Query(None, description="Filtrer par ID utilisateur"),
        page: int = Query(1, ge=1, description="Numéro de page"),
        per_page: int = Query(50, ge=1, le=100, description="Nombre d'éléments par page"),
        db: Session = Depends(get_db),
        current_user: User = Depends(require_admin_role_strict()),
    ):
        """
        Récupère la liste des logs d'emails avec filtrage et pagination.

        Seuls les administrateurs et super-administrateurs peuvent accéder à cette fonctionnalité.
        """
        try:
            log_admin_access(
                user_id=str(current_user.id),
                username=username_or_telegram_id(
                    current_user.username, current_user.telegram_id
                ),
                endpoint="get_email_logs",
                success=True,
                db=db,
            )

            email_log_service = EmailLogService(db)

            from recyclic_api.models.email_log import EmailStatus, EmailType

            status_filter = None
            if status:
                try:
                    status_filter = EmailStatus(status)
                except ValueError:
                    raise HTTPException(
                        status_code=http_status.HTTP_400_BAD_REQUEST,
                        detail=f"Statut invalide: {status}",
                    )

            type_filter = None
            if email_type:
                try:
                    type_filter = EmailType(email_type)
                except ValueError:
                    raise HTTPException(
                        status_code=http_status.HTTP_400_BAD_REQUEST,
                        detail=f"Type d'email invalide: {email_type}",
                    )

            skip = (page - 1) * per_page

            email_logs = email_log_service.get_email_logs(
                skip=skip,
                limit=per_page,
                recipient_email=recipient_email,
                status=status_filter,
                email_type=type_filter,
                user_id=user_id,
            )

            total = email_log_service.get_email_logs_count(
                recipient_email=recipient_email,
                status=status_filter,
                email_type=type_filter,
                user_id=user_id,
            )

            total_pages = (total + per_page - 1) // per_page

            return EmailLogListResponse(
                email_logs=email_logs,
                total=total,
                page=page,
                per_page=per_page,
                total_pages=total_pages,
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des logs d'emails: {str(e)}")
            raise HTTPException(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors de la récupération des logs d'emails: {str(e)}",
            )
