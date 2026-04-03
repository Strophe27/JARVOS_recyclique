"""Enrichissement des réponses HTTP session caisse (register_options, dons, poids)."""

from __future__ import annotations

from typing import Optional

from sqlalchemy import func

from recyclic_api.models.cash_session import CashSession
from recyclic_api.models.sale import Sale
from recyclic_api.schemas.cash_session import CashSessionResponse
from recyclic_api.services.cash_session_service import CashSessionService


def enrich_session_response(
    session: CashSession,
    service: CashSessionService,
    total_weight_out: Optional[float] = None,
) -> CashSessionResponse:
    """Story B49-P1: Enrichit une réponse de session avec les options du register.

    Args:
        session: La session de caisse à enrichir
        service: Le service de session pour récupérer les options

    Returns:
        CashSessionResponse enrichi avec register_options et total_donations
    """
    register_options = service.get_register_options(session)

    total_donations = (
        service.db.query(func.coalesce(func.sum(Sale.donation), 0))
        .filter(Sale.cash_session_id == session.id)
        .scalar()
        or 0.0
    )
    total_donations = float(total_donations)

    if total_weight_out is None:
        total_weight_out, _ = service.get_session_weight_aggregations(session)

    response_data = CashSessionResponse.model_validate(session).model_dump()
    response_data["register_options"] = register_options
    response_data["total_donations"] = total_donations
    response_data["total_weight_out"] = total_weight_out

    return CashSessionResponse(**response_data)
