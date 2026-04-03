"""
ARCH-04 : présentation HTTP après fermeture réussie (POST /cash-sessions/{id}/close).

Rapport CSV, token / URL de téléchargement, envoi email optionnel,
enrichissement de réponse et corps JSON spécial « session vide supprimée ».
"""

from __future__ import annotations

import logging

from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from recyclic_api.application.cash_session_closing import CloseCashSessionOutcome
from recyclic_api.core.config import settings
from recyclic_api.core.email_service import EmailAttachment
from recyclic_api.schemas.cash_session import CashSessionResponse
from recyclic_api.services.cash_session_response_enrichment import enrich_session_response
from recyclic_api.services.cash_session_service import CashSessionService
from recyclic_api.utils.report_tokens import generate_download_token

logger = logging.getLogger(__name__)


def present_close_cash_session_outcome(
    *,
    db: Session,
    service: CashSessionService,
    outcome: CloseCashSessionOutcome,
) -> JSONResponse | CashSessionResponse:
    """
    Construit la réponse HTTP après ``run_close_cash_session`` (contrat inchangé).

    - Session vide supprimée : ``JSONResponse`` 200 avec message / deleted.
    - Sinon : ``CashSessionResponse`` enrichi (URL rapport, flag email).
    """
    if outcome.closed_session is None:
        return JSONResponse(
            status_code=200,
            content={
                "message": "Session vide non enregistrée",
                "session_id": outcome.session_id,
                "deleted": True,
            },
        )

    closed_session = outcome.closed_session

    # Import local : évite import circulaire (endpoints.cash_sessions → ce module) et
    # permet aux tests de monkeypatcher ``cash_sessions.generate_cash_session_report`` / ``get_email_service``.
    from recyclic_api.api.api_v1.endpoints.cash_sessions import (
        generate_cash_session_report,
        get_email_service,
    )

    report_path = generate_cash_session_report(db, closed_session)
    download_token = generate_download_token(report_path.name)
    report_download_url = (
        f"{settings.API_V1_STR}/admin/reports/cash-sessions/{report_path.name}"
        f"?token={download_token}"
    )
    email_sent = False

    recipient = settings.CASH_SESSION_REPORT_RECIPIENT
    if not recipient:
        logger.warning(
            "CASH_SESSION_REPORT_RECIPIENT is not configured; skipping report email dispatch"
        )
    else:
        try:
            email_service = get_email_service()
            with report_path.open("rb") as report_file:
                attachment = EmailAttachment(
                    filename=report_path.name,
                    content=report_file.read(),
                    mime_type="text/csv",
                )

            if closed_session.operator:
                op = closed_session.operator
                full_name = getattr(op, "full_name", None)
                username = getattr(op, "username", None)
                operator_label = full_name or username or str(closed_session.operator_id)
            else:
                operator_label = str(closed_session.operator_id)

            if closed_session.actual_amount is not None:
                final_amount = closed_session.actual_amount
            elif closed_session.closing_amount is not None:
                final_amount = closed_session.closing_amount
            else:
                final_amount = closed_session.initial_amount or 0.0

            html_rows = [
                "<p>Bonjour,</p>",
                f"<p>Veuillez trouver en pièce jointe le rapport CSV de la session de caisse {closed_session.id}.</p>",
                f"<p>Opérateur : {operator_label}</p>",
                f"<p>Montant final déclaré : {final_amount:.2f} €</p>",
                f"<p>Vous pouvez également le télécharger via {report_download_url} (valide pendant "
                f"{settings.CASH_SESSION_REPORT_TOKEN_TTL_SECONDS // 60} minutes).</p>",
                "<p>- Recyclic</p>",
            ]

            email_sent = email_service.send_email(
                to_email=recipient,
                subject=f"Rapport de session de caisse {closed_session.id}",
                html_content="".join(html_rows),
                db_session=db,
                attachments=[attachment],
            )
        except Exception as exc:  # noqa: BLE001 - keep closing flow resilient
            logger.error("Failed to send cash session report email: %s", exc)

    response_model = enrich_session_response(closed_session, service)
    return response_model.model_copy(
        update={
            "report_download_url": report_download_url,
            "report_email_sent": email_sent,
        }
    )
