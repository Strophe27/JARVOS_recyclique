"""
Story 24.10 — P3 preuves / seuils remboursement exceptionnel (intégration API ciblée).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from recyclic_api.main import app
from recyclic_api.models.cash_register import CashRegister
from recyclic_api.models.cash_session import CashSession
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.core.security import create_access_token
from tests.caisse_sale_eligibility import grant_user_exceptional_refund_permission
from tests.memory_redis_for_tests import MemoryRedisForTests


@pytest.fixture
def client():
    return TestClient(app)


def _seed_session_with_register_p3(
    db_session,
    *,
    p3_enabled: bool,
    current_amount: float = 500.0,
):
    site_id = uuid.uuid4()
    op_id = uuid.uuid4()
    reg_id = uuid.uuid4()
    sess_id = uuid.uuid4()

    wo = {}
    if p3_enabled:
        wo = {"features": {"operations_specials_p3": {"enabled": True}}}

    site = Site(
        id=site_id,
        name="S2410",
        address="a",
        city="c",
        postal_code="75000",
        country="FR",
    )
    user = User(
        id=op_id,
        username="cashier_2410",
        hashed_password="x",
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True,
        site_id=site_id,
    )
    register = CashRegister(
        id=reg_id,
        name="Reg2410",
        site_id=site_id,
        is_active=True,
        workflow_options=wo,
    )
    session = CashSession(
        id=sess_id,
        operator_id=op_id,
        site_id=site_id,
        register_id=reg_id,
        initial_amount=current_amount,
        current_amount=current_amount,
        status="open",
        opened_at=datetime.utcnow(),
    )
    db_session.add_all([site, user, register, session])
    db_session.commit()
    grant_user_exceptional_refund_permission(db_session, user)
    token = create_access_token(data={"sub": str(op_id)})
    return {
        "token": token,
        "session_id": str(sess_id),
        "headers": {"Authorization": f"Bearer {token}"},
        "user": user,
    }


def test_p3_missing_evidence_returns_422(client: TestClient, db_session):
    ctx = _seed_session_with_register_p3(db_session, p3_enabled=True)
    body = {
        "amount": 10.0,
        "refund_payment_method": "cash",
        "reason_code": "RETOUR_ARTICLE",
        "justification": "Test justification",
    }
    mem = MemoryRedisForTests()
    with (
        patch(
            "recyclic_api.api.api_v1.endpoints.cash_sessions.get_redis",
            return_value=mem,
        ),
        patch(
            "recyclic_api.api.api_v1.endpoints.cash_sessions.verify_step_up_pin_header",
        ),
    ):
        r = client.post(
            f"/v1/cash-sessions/{ctx['session_id']}/exceptional-refunds",
            json=body,
            headers={
                **ctx["headers"],
                "X-Step-Up-Pin": "1234",
                "Idempotency-Key": "idem-p3-miss-1",
            },
        )
    assert r.status_code == 422, r.text
    assert "approval_evidence_ref" in r.json().get("detail", "").lower() or "preuve" in r.json().get("detail", "").lower()


def test_p3_happy_path_with_evidence(client: TestClient, db_session):
    ctx = _seed_session_with_register_p3(db_session, p3_enabled=True)
    body = {
        "amount": 12.0,
        "refund_payment_method": "cash",
        "reason_code": "RETOUR_ARTICLE",
        "justification": "Test justification",
        "approval_evidence_ref": "EXT-REF-123",
    }
    mem = MemoryRedisForTests()
    with (
        patch(
            "recyclic_api.api.api_v1.endpoints.cash_sessions.get_redis",
            return_value=mem,
        ),
        patch(
            "recyclic_api.api.api_v1.endpoints.cash_sessions.verify_step_up_pin_header",
        ),
    ):
        r = client.post(
            f"/v1/cash-sessions/{ctx['session_id']}/exceptional-refunds",
            json=body,
            headers={
                **ctx["headers"],
                "X-Step-Up-Pin": "1234",
                "Idempotency-Key": "idem-p3-ok-1",
            },
        )
    assert r.status_code == 201, r.text
    data = r.json()
    assert data.get("proof_level_applied") == "N3"
    assert data.get("approval_evidence_ref") == "EXT-REF-123"


def test_p3_threshold_motif_erreur_saisie_rejected(client: TestClient, db_session):
    ctx = _seed_session_with_register_p3(db_session, p3_enabled=True, current_amount=500.0)
    body = {
        "amount": 200.0,
        "refund_payment_method": "cash",
        "reason_code": "ERREUR_SAISIE",
        "justification": "Test justification longue pour dépassement seuil",
        "approval_evidence_ref": "ok-ref",
    }
    mem = MemoryRedisForTests()
    with (
        patch(
            "recyclic_api.api.api_v1.endpoints.cash_sessions.get_redis",
            return_value=mem,
        ),
        patch(
            "recyclic_api.api.api_v1.endpoints.cash_sessions.verify_step_up_pin_header",
        ),
    ):
        r = client.post(
            f"/v1/cash-sessions/{ctx['session_id']}/exceptional-refunds",
            json=body,
            headers={
                **ctx["headers"],
                "X-Step-Up-Pin": "1234",
                "Idempotency-Key": "idem-p3-thresh-1",
            },
        )
    assert r.status_code == 422, r.text
    assert "ERREUR_SAISIE" in r.json().get("detail", "") or "motif" in r.json().get("detail", "")


def test_p2_no_register_flag_allows_without_evidence(client: TestClient, db_session):
    ctx = _seed_session_with_register_p3(db_session, p3_enabled=False)
    body = {
        "amount": 5.0,
        "refund_payment_method": "cash",
        "reason_code": "ANNULATION_CLIENT",
        "justification": "Sans P3 pas besoin de champ preuve",
    }
    mem = MemoryRedisForTests()
    with (
        patch(
            "recyclic_api.api.api_v1.endpoints.cash_sessions.get_redis",
            return_value=mem,
        ),
        patch(
            "recyclic_api.api.api_v1.endpoints.cash_sessions.verify_step_up_pin_header",
        ),
    ):
        r = client.post(
            f"/v1/cash-sessions/{ctx['session_id']}/exceptional-refunds",
            json=body,
            headers={
                **ctx["headers"],
                "X-Step-Up-Pin": "1234",
                "Idempotency-Key": "idem-p2-1",
            },
        )
    assert r.status_code == 201, r.text
    assert r.json().get("proof_level_applied") in (None, "")


def test_operations_specials_p3_validate_unit():
    from recyclic_api.core.exceptions import ValidationError
    from recyclic_api.services.operations_specials_p3 import validate_exceptional_refund_p3_rules

    with pytest.raises(ValidationError):
        validate_exceptional_refund_p3_rules(
            p3_enabled=True,
            amount=10.0,
            reason_code="RETOUR_ARTICLE",
            approval_evidence_ref=None,
        )
    validate_exceptional_refund_p3_rules(
        p3_enabled=True,
        amount=10.0,
        reason_code="RETOUR_ARTICLE",
        approval_evidence_ref="ok-ref",
    )
