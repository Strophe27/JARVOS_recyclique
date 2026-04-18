"""Story 24.7 — décaissement typé : permission, validation, journal, rejet."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy.orm import Session

from recyclic_api.core.auth import create_access_token
from recyclic_api.core.exceptions import AuthorizationError, ValidationError as DomainValidationError
from recyclic_api.core.security import hash_password
from recyclic_api.models.cash_disbursement import CashDisbursementMotifCode, CashDisbursementSubtype
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.payment_transaction import PaymentTransaction, PaymentTransactionNature
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.schemas.cash_disbursement import CashDisbursementCreate
from recyclic_api.services.cash_disbursement_service import CashDisbursementService
from recyclic_api.services.cash_session_journal_snapshot import compute_payment_journal_aggregates
from recyclic_api.main import app
from recyclic_api.core.config import settings
from recyclic_api.core.step_up import IDEMPOTENCY_KEY_HEADER, STEP_UP_PIN_HEADER

from tests.caisse_sale_eligibility import (
    grant_user_caisse_sale_eligibility,
    grant_user_cash_disbursement_permission,
)

_V1 = settings.API_V1_STR.rstrip("/")


def _assert_detail_code(response, expected_code: str) -> None:
    """Le handler HTTP peut exposer ``detail`` en dict (code) ou message FR (str)."""
    det = response.json().get("detail")
    if isinstance(det, dict):
        assert det.get("code") == expected_code
        return
    text_u = str(det).upper()
    if expected_code == "STEP_UP_PIN_REQUIRED":
        assert "STEP-UP" in text_u or "STEP_UP" in text_u
    elif expected_code == "STEP_UP_PIN_INVALID":
        assert "PIN" in text_u and ("INVALID" in text_u or "INVALIDE" in text_u)
    elif expected_code == "IDEMPOTENCY_KEY_CONFLICT":
        assert "IDEMPOTENCY" in text_u or "CORPS" in text_u
    else:
        assert expected_code in text_u


def _new_site_user_session(
    db_session: Session,
    *,
    current_amount: float = 100.0,
    step_up_pin_plain: str | None = None,
) -> tuple[User, Site, CashSession]:
    site = Site(
        name="Site 24.7",
        address="A",
        city="C",
        postal_code="75001",
        country="FR",
        is_active=True,
    )
    db_session.add(site)
    db_session.flush()
    user = User(
        username=f"u_{uuid4().hex[:10]}",
        email=f"e_{uuid4().hex[:8]}@t.com",
        hashed_password=hash_password("x"),
        first_name="T",
        last_name="U",
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()
    if step_up_pin_plain is not None:
        user.hashed_pin = hash_password(step_up_pin_plain)
        db_session.add(user)
        db_session.flush()
    grant_user_caisse_sale_eligibility(db_session, user, site.id)
    grant_user_cash_disbursement_permission(db_session, user)
    cs = CashSession(
        operator_id=user.id,
        site_id=site.id,
        initial_amount=current_amount,
        current_amount=current_amount,
        status=CashSessionStatus.OPEN,
        total_sales=0.0,
        total_items=0,
    )
    db_session.add(cs)
    db_session.commit()
    db_session.refresh(user)
    db_session.refresh(cs)
    db_session.refresh(site)
    return user, site, cs


def _base_payload() -> CashDisbursementCreate:
    return CashDisbursementCreate(
        subtype=CashDisbursementSubtype.SMALL_OPERATING_EXPENSE,
        motif_code=CashDisbursementMotifCode.OFFICE_SUPPLIES,
        counterparty_label="Fournit. test",
        amount=12.5,
        justification_reference="REF-DISB-001",
        actual_settlement_at=datetime(2026, 4, 19, 12, 0, tzinfo=timezone.utc),
    )


class TestCashDisbursementServiceStory247:
    def test_create_disbursement_journal_nature_and_balance(self, db_session: Session):
        user, _site, cs = _new_site_user_session(db_session, current_amount=50.0)
        svc = CashDisbursementService(db_session)
        res = svc.create_disbursement(
            cash_session_id=str(cs.id),
            payload=_base_payload(),
            operator=user,
            idempotency_key="idem-1",
        )
        assert float(res.amount) == 12.5
        db_session.refresh(cs)
        assert cs.current_amount == pytest.approx(37.5)

        sid = UUID(str(res.sale_id))
        tx = db_session.query(PaymentTransaction).filter(PaymentTransaction.sale_id == sid).one()
        assert tx.nature == PaymentTransactionNature.DISBURSEMENT

        totals = compute_payment_journal_aggregates(
            db_session,
            cash_session_id=cs.id,
            use_legacy_preview_if_no_journal=False,
        )
        assert len(totals.cash_disbursement_lines) == 1
        assert "petite dépense" in totals.cash_disbursement_lines[0].label_fr.lower()

    def test_permission_denied_without_cash_disbursement(self, db_session: Session):
        site = Site(
            name="S2",
            address="A",
            city="C",
            postal_code="1",
            country="FR",
            is_active=True,
        )
        db_session.add(site)
        db_session.flush()
        user = User(
            username=f"nop_{uuid4().hex[:8]}",
            email=f"n_{uuid4().hex[:8]}@t.com",
            hashed_password=hash_password("x"),
            role=UserRole.USER,
            status=UserStatus.APPROVED,
            is_active=True,
        )
        db_session.add(user)
        db_session.flush()
        grant_user_caisse_sale_eligibility(db_session, user, site.id)
        cs = CashSession(
            operator_id=user.id,
            site_id=site.id,
            initial_amount=80.0,
            current_amount=80.0,
            status=CashSessionStatus.OPEN,
            total_sales=0.0,
            total_items=0,
        )
        db_session.add(cs)
        db_session.commit()
        svc = CashDisbursementService(db_session)
        with pytest.raises(AuthorizationError, match="cash.disbursement"):
            svc.create_disbursement(
                cash_session_id=str(cs.id),
                payload=_base_payload(),
                operator=user,
                idempotency_key="x",
            )

    def test_rejects_amount_over_float_balance(self, db_session: Session):
        user, _site, cs = _new_site_user_session(db_session, current_amount=5.0)
        svc = CashDisbursementService(db_session)
        p = _base_payload()
        p = p.model_copy(update={"amount": 99.0})
        with pytest.raises(DomainValidationError, match="solde"):
            svc.create_disbursement(
                cash_session_id=str(cs.id),
                payload=p,
                operator=user,
                idempotency_key="idem-over",
            )

    def test_other_admin_requires_coded_key(self):
        with pytest.raises(ValidationError):
            CashDisbursementCreate(
                subtype=CashDisbursementSubtype.OTHER_ADMIN_CODED,
                motif_code=CashDisbursementMotifCode.BOARD_APPROVED_OTHER,
                counterparty_label="X",
                amount=1.0,
                justification_reference="R",
                actual_settlement_at=datetime.now(timezone.utc),
                admin_coded_reason_key=None,
            )

    def test_other_admin_rejects_unknown_admin_key(self):
        with pytest.raises(ValidationError, match="reconnue"):
            CashDisbursementCreate(
                subtype=CashDisbursementSubtype.OTHER_ADMIN_CODED,
                motif_code=CashDisbursementMotifCode.BOARD_APPROVED_OTHER,
                counterparty_label="X",
                amount=1.0,
                justification_reference="R",
                actual_settlement_at=datetime.now(timezone.utc),
                admin_coded_reason_key="not_in_enum",
            )


class TestCashDisbursementHttpStory247:
    """POST /v1/cash-sessions/{id}/disbursements — 403 / 201 / 409 / 422."""

    def test_post_disbursement_201_nominal(self, db_session: Session):
        user, _site, cs = _new_site_user_session(db_session, current_amount=200.0)
        token = create_access_token(data={"sub": str(user.id)})
        body = _base_payload().model_dump(mode="json")
        idem = f"idem-201-{uuid4().hex}"
        with TestClient(app) as client:
            r = client.post(
                f"{_V1}/cash-sessions/{cs.id}/disbursements",
                json=body,
                headers={
                    "Authorization": f"Bearer {token}",
                    IDEMPOTENCY_KEY_HEADER: idem,
                },
            )
        assert r.status_code == 201
        data = r.json()
        assert data.get("id") is not None
        assert float(data.get("amount", 0)) == 12.5

    def test_post_disbursement_403_step_up_pin_required(self, db_session: Session):
        user, _site, cs = _new_site_user_session(
            db_session,
            current_amount=200.0,
            step_up_pin_plain="1234",
        )
        token = create_access_token(data={"sub": str(user.id)})
        p = _base_payload().model_copy(
            update={"subtype": CashDisbursementSubtype.VALIDATED_EXCEPTIONAL_OUTFLOW}
        )
        body = p.model_dump(mode="json")
        with TestClient(app) as client:
            r = client.post(
                f"{_V1}/cash-sessions/{cs.id}/disbursements",
                json=body,
                headers={
                    "Authorization": f"Bearer {token}",
                    IDEMPOTENCY_KEY_HEADER: f"idem-nopin-{uuid4().hex}",
                },
            )
        assert r.status_code == 403
        _assert_detail_code(r, "STEP_UP_PIN_REQUIRED")

    def test_post_disbursement_403_step_up_pin_invalid(self, db_session: Session):
        user, _site, cs = _new_site_user_session(
            db_session,
            current_amount=200.0,
            step_up_pin_plain="1234",
        )
        token = create_access_token(data={"sub": str(user.id)})
        p = _base_payload().model_copy(
            update={"subtype": CashDisbursementSubtype.VALIDATED_EXCEPTIONAL_OUTFLOW}
        )
        body = p.model_dump(mode="json")
        with TestClient(app) as client:
            r = client.post(
                f"{_V1}/cash-sessions/{cs.id}/disbursements",
                json=body,
                headers={
                    "Authorization": f"Bearer {token}",
                    IDEMPOTENCY_KEY_HEADER: f"idem-badpin-{uuid4().hex}",
                    STEP_UP_PIN_HEADER: "9999",
                },
            )
        assert r.status_code == 403
        _assert_detail_code(r, "STEP_UP_PIN_INVALID")

    def test_post_disbursement_422_unknown_subtype(self, db_session: Session):
        user, _site, cs = _new_site_user_session(db_session, current_amount=200.0)
        token = create_access_token(data={"sub": str(user.id)})
        body = _base_payload().model_dump(mode="json")
        body["subtype"] = "not_a_valid_disbursement_subtype"
        with TestClient(app) as client:
            r = client.post(
                f"{_V1}/cash-sessions/{cs.id}/disbursements",
                json=body,
                headers={
                    "Authorization": f"Bearer {token}",
                    IDEMPOTENCY_KEY_HEADER: f"idem-422-{uuid4().hex}",
                },
            )
        assert r.status_code == 422

    def test_post_disbursement_idempotency_replay_same_body(self, db_session: Session):
        user, _site, cs = _new_site_user_session(db_session, current_amount=200.0)
        token = create_access_token(data={"sub": str(user.id)})
        body = _base_payload().model_dump(mode="json")
        idem = f"idem-replay-{uuid4().hex}"
        with TestClient(app) as client:
            r1 = client.post(
                f"{_V1}/cash-sessions/{cs.id}/disbursements",
                json=body,
                headers={
                    "Authorization": f"Bearer {token}",
                    IDEMPOTENCY_KEY_HEADER: idem,
                },
            )
            r2 = client.post(
                f"{_V1}/cash-sessions/{cs.id}/disbursements",
                json=body,
                headers={
                    "Authorization": f"Bearer {token}",
                    IDEMPOTENCY_KEY_HEADER: idem,
                },
            )
        assert r1.status_code == 201
        assert r2.status_code == 201
        assert r1.json().get("id") == r2.json().get("id")

    def test_post_disbursement_idempotency_conflict_different_body(self, db_session: Session):
        user, _site, cs = _new_site_user_session(db_session, current_amount=200.0)
        token = create_access_token(data={"sub": str(user.id)})
        body1 = _base_payload().model_dump(mode="json")
        body2 = _base_payload().model_copy(update={"amount": 20.0}).model_dump(mode="json")
        idem = f"idem-conflict-{uuid4().hex}"
        with TestClient(app) as client:
            r1 = client.post(
                f"{_V1}/cash-sessions/{cs.id}/disbursements",
                json=body1,
                headers={
                    "Authorization": f"Bearer {token}",
                    IDEMPOTENCY_KEY_HEADER: idem,
                },
            )
            r2 = client.post(
                f"{_V1}/cash-sessions/{cs.id}/disbursements",
                json=body2,
                headers={
                    "Authorization": f"Bearer {token}",
                    IDEMPOTENCY_KEY_HEADER: idem,
                },
            )
        assert r1.status_code == 201
        assert r2.status_code == 409
        _assert_detail_code(r2, "IDEMPOTENCY_KEY_CONFLICT")

    def test_post_disbursement_403_without_permission(self, db_session: Session):
        site = Site(
            name="S403",
            address="A",
            city="C",
            postal_code="1",
            country="FR",
            is_active=True,
        )
        db_session.add(site)
        db_session.flush()
        user = User(
            username=f"p403_{uuid4().hex[:8]}",
            email=f"p_{uuid4().hex[:8]}@t.com",
            hashed_password=hash_password("x"),
            role=UserRole.USER,
            status=UserStatus.APPROVED,
            is_active=True,
        )
        db_session.add(user)
        db_session.flush()
        grant_user_caisse_sale_eligibility(db_session, user, site.id)
        cs = CashSession(
            operator_id=user.id,
            site_id=site.id,
            initial_amount=100.0,
            current_amount=100.0,
            status=CashSessionStatus.OPEN,
            total_sales=0.0,
            total_items=0,
        )
        db_session.add(cs)
        db_session.commit()

        token = create_access_token(data={"sub": str(user.id)})
        body = _base_payload().model_dump(mode="json")
        with TestClient(app) as client:
            r = client.post(
                f"{_V1}/cash-sessions/{cs.id}/disbursements",
                json=body,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Idempotency-Key": "hk-403",
                },
            )
        assert r.status_code == 403
