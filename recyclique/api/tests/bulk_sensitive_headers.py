"""En-têtes requis pour les POST exports bulk admin (Story 16.4 — step-up + idempotence)."""

from __future__ import annotations

import uuid

from recyclic_api.core.step_up import IDEMPOTENCY_KEY_HEADER, STEP_UP_PIN_HEADER

# Même PIN que les admins de test dans ``conftest.admin_client`` (hashed_pin).
_BULK_EXPORT_TEST_PIN = "1234"


def bulk_export_post_headers(*, pin: str | None = None, idempotency_key: str | None = None) -> dict[str, str]:
    return {
        STEP_UP_PIN_HEADER: pin or _BULK_EXPORT_TEST_PIN,
        IDEMPOTENCY_KEY_HEADER: idempotency_key or str(uuid.uuid4()),
    }
