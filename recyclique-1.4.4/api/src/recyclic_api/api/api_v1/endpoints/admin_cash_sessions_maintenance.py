"""
Endpoints admin : maintenance des sessions caisse (sessions différées bloquées, doublons).

Sans Telegram. Enregistré sur le routeur ``/admin`` via ``register_admin_cash_sessions_maintenance_routes``.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from sqlalchemy import func
from sqlalchemy.orm import Session, noload
from slowapi import Limiter

from recyclic_api.core.auth import require_super_admin_role
from recyclic_api.core.database import get_db
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.sale import Sale
from recyclic_api.models.user import User
from recyclic_api.schemas.admin import AdminResponse
from recyclic_api.services.cash_session_service import CashSessionService

logger = logging.getLogger(__name__)


def register_admin_cash_sessions_maintenance_routes(router: APIRouter, limiter: Limiter) -> None:
    """Enregistre POST /cash-sessions/fix-blocked-deferred et merge-duplicate-deferred."""

    @router.post(
        "/cash-sessions/fix-blocked-deferred",
        summary="Corriger les sessions différées bloquées (Super Admin uniquement)",
        description="Ferme ou supprime les sessions différées ouvertes qui sont bloquées (opened_at dans le passé).",
    )
    async def fix_blocked_deferred_sessions(
        current_user: User = Depends(require_super_admin_role()),
        db: Session = Depends(get_db),
    ):
        """
        Corrige les sessions différées bloquées en :
        - Fermant les sessions avec transactions (avec montant théorique calculé)
        - Supprimant les sessions vides

        Cette opération est sécurisée et ne supprime que les sessions différées ouvertes
        qui sont à plus de 90 jours dans le passé (opened_at < NOW() - 90 jours).
        """
        try:
            now = datetime.now(timezone.utc)
            # Seuil de 90 jours : identifier les sessions différées créées avec opened_at
            # explicitement défini dans le passé lointain (cohérent avec les autres méthodes)
            threshold = now - timedelta(days=90)

            # Récupérer toutes les sessions différées ouvertes (opened_at à plus de 90 jours dans le passé)
            blocked_sessions = (
                db.query(CashSession)
                .options(noload(CashSession.register))
                .filter(
                    CashSession.status == CashSessionStatus.OPEN,
                    CashSession.opened_at < threshold,
                )
                .all()
            )

            fixed_count = 0
            deleted_count = 0
            errors = []

            for session in blocked_sessions:
                try:
                    # Compter les ventes réelles
                    sales_count = db.query(Sale).filter(Sale.cash_session_id == session.id).count()

                    # Vérifier si la session est vide
                    is_empty = (
                        (session.total_sales is None or session.total_sales == 0)
                        and (session.total_items is None or session.total_items == 0)
                        and sales_count == 0
                    )

                    if is_empty:
                        # Session vide : supprimer
                        db.delete(session)
                        deleted_count += 1
                        logger.info(f"Session {session.id} supprimée (vide)")
                    else:
                        # Session avec transactions : fermer avec montant théorique
                        total_donations = (
                            db.query(func.coalesce(func.sum(Sale.donation), 0))
                            .filter(Sale.cash_session_id == session.id)
                            .scalar()
                            or 0.0
                        )
                        total_donations = float(total_donations)

                        theoretical_amount = (session.initial_amount or 0.0) + (
                            session.total_sales or 0.0
                        ) + total_donations

                        session.status = CashSessionStatus.CLOSED
                        session.closed_at = datetime.now(timezone.utc)
                        session.variance = 0.0
                        session.variance_comment = "Fermeture automatique - session différée bloquée"

                        fixed_count += 1
                        logger.info(
                            f"Session {session.id} fermée (montant théorique: {theoretical_amount:.2f}€)"
                        )
                except Exception as e:
                    error_msg = f"Erreur lors du traitement de la session {session.id}: {str(e)}"
                    errors.append(error_msg)
                    logger.error(error_msg)

            db.commit()

            return {
                "status": "success",
                "message": f"Correction terminée: {fixed_count} session(s) fermée(s), {deleted_count} session(s) supprimée(s)",
                "fixed_count": fixed_count,
                "deleted_count": deleted_count,
                "errors": errors if errors else None,
            }

        except Exception as e:
            db.rollback()
            logger.error(f"Erreur lors de la correction des sessions bloquées: {e}")
            raise HTTPException(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors de la correction: {str(e)}",
            )

    @router.post(
        "/cash-sessions/merge-duplicate-deferred",
        response_model=AdminResponse,
        summary="Fusionner les sessions différées dupliquées pour une même date (Super Admin uniquement)",
        description="Ferme les sessions différées dupliquées (même opérateur, même date) en gardant seulement la première. Les ventes sont préservées.",
    )
    async def merge_duplicate_deferred_sessions(
        operator_id: str = Query(..., description="ID de l'opérateur"),
        date: str = Query(..., description="Date au format YYYY-MM-DD"),
        current_user: User = Depends(require_super_admin_role()),
        db: Session = Depends(get_db),
    ):
        """Fusionne les sessions différées dupliquées pour un opérateur et une date donnés."""
        try:
            # Parser la date
            target_date = datetime.strptime(date, "%Y-%m-%d")
            target_date = target_date.replace(tzinfo=timezone.utc)

            # Calculer le début et la fin de la journée
            start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = start_of_day + timedelta(days=1)

            now = datetime.now(timezone.utc)
            operator_uuid = UUID(operator_id)

            # Trouver toutes les sessions différées ouvertes pour cette date et cet opérateur
            duplicate_sessions = (
                db.query(CashSession)
                .options(noload(CashSession.register))
                .filter(
                    CashSession.operator_id == operator_uuid,
                    CashSession.status == CashSessionStatus.OPEN,
                    CashSession.opened_at < now,
                    CashSession.opened_at >= start_of_day,
                    CashSession.opened_at < end_of_day,
                )
                .order_by(CashSession.opened_at)
                .all()
            )

            if len(duplicate_sessions) <= 1:
                return {
                    "status": "success",
                    "message": f"Aucune session dupliquée trouvée pour cette date.",
                }

            # Garder la première session (la plus ancienne)
            main_session = duplicate_sessions[0]
            main_session_id = main_session.id
            sessions_to_close = duplicate_sessions[1:]

            service = CashSessionService(db)
            closed_count = 0

            for session in sessions_to_close:
                dup_id = session.id
                # Fermer la session dupliquée
                if service.is_session_empty(session):
                    service.delete_session(str(dup_id))
                else:
                    service.close_session_with_amounts(
                        str(dup_id),
                        actual_amount=0.0,
                        variance_comment=f"Fermeture automatique - session dupliquée fusionnée avec session {main_session_id}",
                    )
                closed_count += 1
                logger.info(f"Session dupliquée fermée: {dup_id} (fusionnée avec {main_session_id})")

            db.commit()

            return {
                "status": "success",
                "message": f"{closed_count} session(s) dupliquée(s) fermée(s). Session principale conservée: {main_session_id}",
            }
        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail=f"Format de date invalide. Utilisez YYYY-MM-DD. Erreur: {str(e)}",
            )
