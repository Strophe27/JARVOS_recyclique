"""Story 25.12 — garde-fou AR12 / ADR 25-3 : pas de touchpoint Redis sur le chemin async Paheko outbox.

`_FORBIDDEN` est une heuristique par sous-chaînes : elle ne couvre pas tous les styles possibles
d'import ou d'appel Redis (cf. rapport d'audit) ; elle reste un filet de non-régression ciblé.
"""

from __future__ import annotations

from pathlib import Path

import pytest

_REPO_ROOT = Path(__file__).resolve().parents[3]
_SRC = _REPO_ROOT / "recyclique" / "api" / "src" / "recyclic_api"

# Modules qualifiés « async Paheko » (processeur, enqueue, admin, mapping, supervision SQL).
_REL_PATHS = (
    "services/paheko_outbox_service.py",
    "services/paheko_outbox_processor.py",
    "services/paheko_outbox_transition_audit.py",
    "services/paheko_close_batch_builder.py",
    "services/paheko_mapping_service.py",
    "services/paheko_accounting_client.py",
    "services/paheko_transaction_payload_builder.py",
    "services/paheko_sync_final_action_policy.py",
    "services/scheduler_service.py",
    "services/exploitation_live_snapshot_service.py",
    "api/api_v1/endpoints/admin_paheko_outbox.py",
    "models/paheko_outbox.py",
    "models/paheko_outbox_sync_transition.py",
    "models/paheko_cash_session_close_mapping.py",
    "schemas/paheko_outbox.py",
    "schemas/paheko_mapping.py",
    "application/cash_session_close_presentation.py",
)

# Sous-chaînes — heuristique (voir docstring module).
_FORBIDDEN = (
    "get_redis",
    "from recyclic_api.core.redis",
    "import redis",
)


@pytest.mark.parametrize("rel", _REL_PATHS)
def test_story_25_12_paheko_async_sources_exclude_redis(rel: str) -> None:
    path = _SRC / rel
    assert path.is_file(), f"missing {path}"
    text = path.read_text(encoding="utf-8")
    for sub in _FORBIDDEN:
        assert sub not in text, f"{rel} must not contain {sub!r} (AR12 async Paheko path)"
