"""
Politique d'actions finales critiques — Story 8.6 (Epic 8).

**Action (A1)** : clôture définitive de session caisse + handoff outbox Paheko
(`CashSessionService.close_session_with_amounts` → `enqueue_cash_session_close_outbox`).

**Prédicats versionnés** (``POLICY_VERSION``) :

+------+------------------------------------------------------------------+
| Id   | Condition → refus A1                                             |
+======+==================================================================+
| P1   | Ligne ``paheko_outbox_items`` avec ``cash_session_id`` = session|
|      | cible et ``sync_state_core == 'en_quarantaine'`` (résolution 8.4)|
+------+------------------------------------------------------------------+
| P2   | Résolution mapping clôture (8.3) : ``resolve_cash_session_close_  |
|      | mapping_row`` échoue (``mapping_missing``, ``mapping_disabled``,|
|      | ``invalid_destination_params``) ou session sans ``site_id``.     |
+------+------------------------------------------------------------------+

**Non bloquant pour A1** (explicite) : lignes outbox d'autres sessions (même site) ;
états ``a_reessayer`` / ``pending`` sur d'autres agrégats ; absence de ligne outbox pour
la session courante (clôture nominale).

Les opérations terrain **hors** A1 ne passent pas par ce module (FR66 — pas de gel global).
"""

from __future__ import annotations

import logging
from typing import Optional

from sqlalchemy.orm import Session

from recyclic_api.core.exceptions import PahekoSyncPolicyBlockedError
from recyclic_api.models.cash_session import CashSession
from recyclic_api.models.paheko_outbox import PahekoOutboxItem
from recyclic_api.services.paheko_mapping_service import resolve_cash_session_close_mapping_row
from recyclic_api.services.paheko_outbox_service import OPERATION_CASH_SESSION_CLOSE

logger = logging.getLogger(__name__)

POLICY_VERSION = "8.6.1"

CODE_REFUSED = "PAHEKO_SYNC_FINAL_ACTION_REFUSED"
REASON_SESSION_OUTBOX_QUARANTINE = "PAHEKO_SYNC_A1_BLOCKED_SESSION_OUTBOX_QUARANTINE"
REASON_CLOSE_MAPPING = "PAHEKO_SYNC_A1_BLOCKED_CLOSE_MAPPING"

_MAPPING_MESSAGES = {
    "mapping_missing": (
        "Aucune correspondance Paheko active pour ce site / cette caisse (slice clôture). "
        "Configurez un mapping avant de clôturer."
    ),
    "mapping_disabled": (
        "La correspondance Paheko existe mais est désactivée (enabled=false). "
        "Réactivez-la ou corrigez la configuration avant clôture."
    ),
    "invalid_destination_params": (
        "destination_params vide ou invalide en base pour le mapping clôture — "
        "corrigez la ligne de mapping avant clôture."
    ),
    "site_missing": "Session sans site_id — impossible de résoudre le mapping Paheko pour la clôture.",
}


def _mapping_human(err: str) -> str:
    return _MAPPING_MESSAGES.get(err, _MAPPING_MESSAGES["mapping_missing"])


def assert_a1_allowed_for_cash_session_close(
    db: Session,
    session: CashSession,
    *,
    sync_correlation_id: Optional[str] = None,
) -> None:
    """
    Lève ``PahekoSyncPolicyBlockedError`` si la politique interdit A1 pour cette session.

    Appeler **après** validation métier clôture / preview et **avant** ``close_with_amounts`` /
    enqueue / ``commit``.
    """
    cid = (sync_correlation_id or "").strip() or None
    sid_str = str(session.id)
    site_str = str(session.site_id) if session.site_id else None

    blocking = (
        db.query(PahekoOutboxItem)
        .filter(
            PahekoOutboxItem.cash_session_id == session.id,
            PahekoOutboxItem.operation_type == OPERATION_CASH_SESSION_CLOSE,
            PahekoOutboxItem.sync_state_core == "en_quarantaine",
        )
        .order_by(PahekoOutboxItem.created_at.desc())
        .first()
    )
    if blocking is not None:
        logger.info(
            "paheko_a1_policy_refused policy_version=%s policy_reason_code=%s "
            "cash_session_id=%s site_id=%s correlation_id=%s blocking_outbox_item_id=%s",
            POLICY_VERSION,
            REASON_SESSION_OUTBOX_QUARANTINE,
            sid_str,
            site_str,
            cid,
            blocking.id,
        )
        raise PahekoSyncPolicyBlockedError(
            {
                "code": CODE_REFUSED,
                "message": (
                    "Clôture refusée : une ligne outbox Paheko pour cette session est en "
                    "quarantaine. Résolvez-la via les parcours support (levée / décision 8.4) "
                    "avant une nouvelle finalisation comptable."
                ),
                "policy_reason_code": REASON_SESSION_OUTBOX_QUARANTINE,
                "policy_version": POLICY_VERSION,
                "cash_session_id": sid_str,
                "site_id": site_str,
                "correlation_id": cid or "",
                "blocking_outbox_item_id": str(blocking.id),
            }
        )

    if session.site_id is None:
        logger.info(
            "paheko_a1_policy_refused policy_version=%s policy_reason_code=%s "
            "cash_session_id=%s site_id=None correlation_id=%s mapping_resolution_code=site_missing",
            POLICY_VERSION,
            REASON_CLOSE_MAPPING,
            sid_str,
            cid,
        )
        raise PahekoSyncPolicyBlockedError(
            {
                "code": CODE_REFUSED,
                "message": _mapping_human("site_missing"),
                "policy_reason_code": REASON_CLOSE_MAPPING,
                "policy_version": POLICY_VERSION,
                "cash_session_id": sid_str,
                "site_id": None,
                "correlation_id": cid or "",
                "mapping_resolution_code": "site_missing",
            }
        )

    _row, err = resolve_cash_session_close_mapping_row(
        db, site_id=session.site_id, register_id=session.register_id
    )
    if err is not None:
        logger.info(
            "paheko_a1_policy_refused policy_version=%s policy_reason_code=%s "
            "cash_session_id=%s site_id=%s correlation_id=%s mapping_resolution_code=%s",
            POLICY_VERSION,
            REASON_CLOSE_MAPPING,
            sid_str,
            site_str,
            cid,
            err,
        )
        raise PahekoSyncPolicyBlockedError(
            {
                "code": CODE_REFUSED,
                "message": _mapping_human(err),
                "policy_reason_code": REASON_CLOSE_MAPPING,
                "policy_version": POLICY_VERSION,
                "cash_session_id": sid_str,
                "site_id": site_str,
                "correlation_id": cid or "",
                "mapping_resolution_code": err,
            }
        )
