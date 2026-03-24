"""
ARCH-04 : fermeture de session caisse (POST /cash-sessions/{id}/close).

Orchestration métier : droits opérateur, validation fermeture, fermeture / session vide,
audit — sans génération de rapport, email ni enrichissement HTTP (reste au routeur).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from recyclic_api.core.audit import log_cash_session_closing
from recyclic_api.core.exceptions import ConflictError, NotFoundError, ValidationError
from recyclic_api.models.cash_session import CashSession
from recyclic_api.models.user import User, UserRole
from recyclic_api.schemas.cash_session import CashSessionClose
from recyclic_api.services.cash_session_service import CashSessionService
from recyclic_api.utils.domain_exception_http import raise_domain_exception_as_http

logger = logging.getLogger(__name__)

_CASH_DOMAIN_HTTP = {
    "not_found_status": 404,
    "conflict_status": 400,
    "validation_status": 400,
}


@dataclass(frozen=True)
class CloseCashSessionOutcome:
    """Résultat métier d'une fermeture réussie."""

    closed_session: Optional[CashSession]
    """``None`` si la session vide a été supprimée (B44-P3)."""

    session_id: str
    """Identifiant de route (UUID string), inchangé après suppression logique."""


def run_close_cash_session(
    *,
    db: Session,
    service: CashSessionService,
    current_user: User,
    session_id: str,
    close_data: CashSessionClose,
) -> CloseCashSessionOutcome:
    """
    Exécute la fermeture métier (hors rapport CSV / email / champs enrichis de réponse).

    Lève ``HTTPException`` ou répercute les exceptions métier mappées comme avant.
    """
    try:
        session = service.get_session_by_id_or_raise(session_id)

        if (
            current_user.role == UserRole.USER
            and str(session.operator_id) != str(current_user.id)
        ):
            log_cash_session_closing(
                user_id=str(current_user.id),
                username=current_user.username or "Unknown",
                session_id=session_id,
                closing_amount=session.current_amount,
                success=False,
                db=db,
            )
            raise HTTPException(
                status_code=403, detail="Accès non autorisé à cette session"
            )

        closing_preview = service.validate_session_close(
            session,
            close_data.actual_amount,
            close_data.variance_comment,
        )
        theoretical_amount = closing_preview["theoretical_amount"]
        variance = closing_preview["variance"]

        logger.info(
            "[close_cash_session] Calcul de variance - "
            "session_id=%s, "
            "initial_amount=%s, "
            "total_sales=%s, "
            "total_donations=%s, "
            "theoretical_amount=%s, "
            "actual_amount=%s, "
            "variance=%s, "
            "abs_variance=%s, "
            "has_comment=%s",
            session_id,
            session.initial_amount,
            session.total_sales,
            closing_preview["total_donations"],
            theoretical_amount,
            close_data.actual_amount,
            variance,
            abs(variance),
            bool(close_data.variance_comment),
        )

        closed_session = service.close_session_with_amounts(
            session_id,
            close_data.actual_amount,
            close_data.variance_comment,
            preview=closing_preview,
        )

        if closed_session is None:
            log_cash_session_closing(
                user_id=str(current_user.id),
                username=current_user.username or "Unknown",
                session_id=session_id,
                closing_amount=0,
                success=True,
                db=db,
            )
            return CloseCashSessionOutcome(closed_session=None, session_id=session_id)

        log_cash_session_closing(
            user_id=str(current_user.id),
            username=current_user.username or "Unknown",
            session_id=session_id,
            closing_amount=closed_session.current_amount,
            success=True,
            db=db,
        )
        return CloseCashSessionOutcome(
            closed_session=closed_session, session_id=session_id
        )

    except NotFoundError as e:
        log_cash_session_closing(
            user_id=str(current_user.id),
            username=current_user.username or "Unknown",
            session_id=session_id,
            closing_amount=0,
            success=False,
            db=db,
        )
        raise_domain_exception_as_http(e, **_CASH_DOMAIN_HTTP)
    except ConflictError as e:
        log_cash_session_closing(
            user_id=str(current_user.id),
            username=current_user.username or "Unknown",
            session_id=session_id,
            closing_amount=close_data.actual_amount,
            success=False,
            db=db,
        )
        raise_domain_exception_as_http(e, **_CASH_DOMAIN_HTTP)
    except ValidationError as e:
        log_cash_session_closing(
            user_id=str(current_user.id),
            username=current_user.username or "Unknown",
            session_id=session_id,
            closing_amount=close_data.actual_amount,
            success=False,
            db=db,
        )
        raise_domain_exception_as_http(e, **_CASH_DOMAIN_HTTP)
    except HTTPException:
        raise
    except Exception:
        log_cash_session_closing(
            user_id=str(current_user.id),
            username=current_user.username or "Unknown",
            session_id=session_id,
            closing_amount=0,
            success=False,
            db=db,
        )
        raise
