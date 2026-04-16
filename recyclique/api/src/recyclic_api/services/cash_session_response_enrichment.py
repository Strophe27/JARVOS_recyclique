"""Enrichissement des réponses HTTP session caisse (register_options, dons, poids)."""

from __future__ import annotations

import logging
import uuid
from typing import Optional

from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import func

from recyclic_api.models.cash_session import CashSession
from recyclic_api.models.sale import Sale, SaleLifecycleStatus
from recyclic_api.models.sale_reversal import SaleReversal
from recyclic_api.schemas.cash_session import CashSessionResponse, CashSessionTotalsV1
from recyclic_api.services.cash_session_service import CashSessionService

logger = logging.getLogger(__name__)


def _session_pk(session: CashSession) -> uuid.UUID:
    """SQLite peut hydrater les PK UUID en str ; les comparaisons ORM exigent uuid.UUID."""
    sid = session.id
    if isinstance(sid, uuid.UUID):
        return sid
    return uuid.UUID(str(sid))


def enrich_session_response(
    session: CashSession,
    service: CashSessionService,
    total_weight_out: Optional[float] = None,
    *,
    degrade_snapshot_on_validation_error: bool = False,
) -> CashSessionResponse:
    """Story B49-P1: Enrichit une réponse de session avec les options du register.

    Args:
        session: La session de caisse à enrichir
        service: Le service de session pour récupérer les options

    Returns:
        CashSessionResponse enrichi avec register_options et total_donations
    """
    register_options = service.get_register_options(session)

    sid = _session_pk(session)
    total_donations = (
        service.db.query(func.coalesce(func.sum(Sale.donation), 0))
        .filter(
            Sale.cash_session_id == sid,
            Sale.lifecycle_status == SaleLifecycleStatus.COMPLETED,
        )
        .scalar()
        or 0.0
    )
    total_donations = float(total_donations)

    if total_weight_out is None:
        total_weight_out, _ = service.get_session_weight_aggregations(session)

    try:
        response_data = CashSessionResponse.model_validate(session).model_dump()
    except PydanticValidationError as exc:
        logger.error(
            "CashSessionResponse.model_validate a échoué pour session_id=%s : %s",
            getattr(session, "id", None),
            exc.errors(),
            exc_info=exc,
        )
        if not degrade_snapshot_on_validation_error:
            raise
        snap_backup = getattr(session, "accounting_close_snapshot", None)
        session.accounting_close_snapshot = None
        try:
            response_data = CashSessionResponse.model_validate(session).model_dump()
        except PydanticValidationError:
            session.accounting_close_snapshot = snap_backup
            raise
        session.accounting_close_snapshot = snap_backup
        logger.warning(
            "CashSessionResponse: réponse dégradée (snapshot omis) session_id=%s",
            getattr(session, "id", None),
        )
    response_data["register_options"] = register_options
    response_data["total_donations"] = total_donations
    response_data["total_weight_out"] = total_weight_out

    # Story 6.4 — agrégats session (Epic 6.7 / clôture locale / NFR21) : inchangé vs total_sales stocké
    # pour sales_completed (ventes completed uniquement) ; refunds depuis sale_reversals.
    # Story 6.5 — les encaissements spéciaux (don / adhésion, sans lignes article) sont des ventes
    # ``completed`` avec ``total_amount`` > 0 (ou 0 pour don) : ils sont inclus dans sales_completed
    # comme le nominal ; une ventilation par ``special_encaissement_kind`` pourra compléter la clôture 6.7.
    # Story 6.6 — idem pour ``social_action_kind`` (montant > 0) : inclus dans sales_completed ; ventilation 6.7.
    db = service.db
    sales_completed = (
        db.query(func.coalesce(func.sum(Sale.total_amount), 0))
        .filter(
            Sale.cash_session_id == sid,
            Sale.lifecycle_status == SaleLifecycleStatus.COMPLETED,
        )
        .scalar()
        or 0.0
    )
    sales_completed = float(sales_completed)
    refunds_alg = (
        db.query(func.coalesce(func.sum(SaleReversal.amount_signed), 0))
        .filter(SaleReversal.cash_session_id == sid)
        .scalar()
        or 0.0
    )
    refunds_alg = float(refunds_alg)
    response_data["totals"] = CashSessionTotalsV1(
        sales_completed=sales_completed,
        refunds=refunds_alg,
        net=sales_completed + refunds_alg,
    )

    return CashSessionResponse(**response_data)
