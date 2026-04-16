"""Story 22.3 — paramétrage expert comptable (API, step-up, révision, session figée)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy.exc import IntegrityError

from recyclic_api.core.exceptions import ConflictError
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.core.config import settings
from recyclic_api.core.step_up import STEP_UP_PIN_HEADER
from recyclic_api.models.cash_register import CashRegister
from recyclic_api.models.cash_session import CashSession
from recyclic_api.models.payment_method import PaymentMethodDefinition, PaymentMethodKind
from recyclic_api.models.payment_transaction import PaymentTransaction
from recyclic_api.models.sale import Sale, PaymentMethod, SaleLifecycleStatus
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.services.accounting_expert_service import AccountingExpertService
from recyclic_api.services.cash_session_service import CashSessionService
_V1 = settings.API_V1_STR.rstrip("/")
_EXPERT = f"{_V1}/admin/accounting-expert"


def _step_headers(super_admin_client: TestClient) -> dict[str, str]:
    h = dict(super_admin_client.headers)
    h[STEP_UP_PIN_HEADER] = "1234"
    return h


class TestAccountingExpertAuth:
    def test_global_accounts_forbidden_non_superadmin(self, client: TestClient, db_session: Session):
        from recyclic_api.core.security import hash_password

        u = User(
            username=f"admin_only_{uuid.uuid4().hex[:8]}",
            hashed_password=hash_password("x"),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(u)
        db_session.commit()
        db_session.refresh(u)
        from recyclic_api.core.security import create_access_token

        tok = create_access_token(data={"sub": str(u.id)})
        r = client.get(
            f"{_EXPERT}/global-accounts",
            headers={"Authorization": f"Bearer {tok}"},
        )
        assert r.status_code == 403

    def test_get_global_accounts_superadmin(self, super_admin_client: TestClient):
        r = super_admin_client.get(f"{_EXPERT}/global-accounts")
        assert r.status_code == 200
        data = r.json()
        assert len(data["default_sales_account"]) >= 1
        assert "prior_year_refund_account" in data


class TestAccountingExpertStepUp:
    def test_patch_global_requires_step_up(self, super_admin_client: TestClient):
        r = super_admin_client.patch(
            f"{_EXPERT}/global-accounts",
            json={
                "default_sales_account": "707",
                "default_donation_account": "708",
                "prior_year_refund_account": "467",
            },
        )
        assert r.status_code == 403
        det = r.json()["detail"]
        if isinstance(det, dict):
            assert det.get("code") == "STEP_UP_PIN_REQUIRED"
        else:
            assert "STEP_UP_PIN" in str(det).upper() or "step-up" in str(det).lower()

    def test_patch_global_ok_with_step_up(self, super_admin_client: TestClient, db_session: Session):
        r = super_admin_client.patch(
            f"{_EXPERT}/global-accounts",
            json={
                "default_sales_account": "7071",
                "default_donation_account": "7081",
                "prior_year_refund_account": "4671",
            },
            headers=_step_headers(super_admin_client),
        )
        assert r.status_code == 200, r.text
        row = AccountingExpertService(db_session).get_global_accounts()
        assert row.default_sales_account == "7071"


class TestAccountingRevisionPublish:
    def test_publish_revision_increments_seq(self, super_admin_client: TestClient, db_session: Session):
        before = AccountingExpertService(db_session).get_latest_revision()
        assert before is not None
        seq0 = before.revision_seq
        r = super_admin_client.post(
            f"{_EXPERT}/revisions/publish",
            json={"note": "pytest 22.3"},
            headers=_step_headers(super_admin_client),
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["revision_seq"] == seq0 + 1
        assert data["snapshot"]["schema_version"] == 1
        assert "global_accounts" in data["snapshot"]


class TestSessionOpenFreezesRevision:
    def test_open_session_keeps_frozen_revision_after_new_publish(
        self,
        db_session: Session,
        super_admin_client: TestClient,
    ):
        site = Site(name="S22 freeze", address="a")
        op = User(
            username=f"op_fr_{uuid.uuid4().hex[:8]}",
            hashed_password="x",
            role=UserRole.USER,
            status=UserStatus.APPROVED,
            is_active=True,
        )
        db_session.add_all([site, op])
        db_session.flush()
        op.site_id = site.id
        reg = CashRegister(name="Rfreeze", site_id=site.id, is_active=True)
        db_session.add(reg)
        db_session.commit()
        from tests.caisse_sale_eligibility import grant_user_caisse_sale_eligibility

        grant_user_caisse_sale_eligibility(db_session, op, site.id)

        cs = CashSessionService(db_session).create_session(str(op.id), str(site.id), 10.0, str(reg.id))
        frozen_rev_id = cs.accounting_config_revision_id
        assert frozen_rev_id is not None

        pub = super_admin_client.post(
            f"{_EXPERT}/revisions/publish",
            json={"note": "pytest publish après ouverture session"},
            headers=_step_headers(super_admin_client),
        )
        assert pub.status_code == 200, pub.text
        latest = AccountingExpertService(db_session).get_latest_revision()
        assert latest is not None
        assert latest.id != frozen_rev_id

        db_session.refresh(cs)
        assert cs.accounting_config_revision_id == frozen_rev_id

    def test_create_session_sets_accounting_revision_id(self, db_session: Session):
        site = Site(name="S22 site", address="a")
        op = User(
            username=f"op_{uuid.uuid4().hex[:8]}",
            hashed_password="x",
            role=UserRole.USER,
            status=UserStatus.APPROVED,
            is_active=True,
            site_id=None,
        )
        db_session.add_all([site, op])
        db_session.flush()
        op.site_id = site.id
        reg = CashRegister(name="R", site_id=site.id, is_active=True)
        db_session.add(reg)
        db_session.commit()

        from tests.caisse_sale_eligibility import grant_user_caisse_sale_eligibility

        grant_user_caisse_sale_eligibility(db_session, op, site.id)

        session = CashSessionService(db_session).create_session(
            str(op.id),
            str(site.id),
            10.0,
            str(reg.id),
        )
        assert session.accounting_config_revision_id is not None
        rev = AccountingExpertService(db_session).get_latest_revision()
        assert rev is not None
        assert session.accounting_config_revision_id == rev.id


class TestDeactivatePaymentMethodOpenSession:
    def test_cannot_deactivate_when_used_in_open_session(
        self,
        super_admin_client: TestClient,
        db_session: Session,
    ):
        pm = PaymentMethodDefinition(
            code=f"tm_{uuid.uuid4().hex[:6]}",
            label="Test moyen 22.3",
            active=True,
            kind=PaymentMethodKind.CASH,
            paheko_debit_account="531",
            paheko_refund_credit_account="531",
            display_order=99,
        )
        db_session.add(pm)
        db_session.commit()
        db_session.refresh(pm)

        site = Site(name="S22 site2", address="a")
        op = User(
            username=f"op2_{uuid.uuid4().hex[:8]}",
            hashed_password="x",
            role=UserRole.USER,
            status=UserStatus.APPROVED,
            is_active=True,
        )
        db_session.add_all([site, op])
        db_session.flush()
        op.site_id = site.id
        reg = CashRegister(name="R2", site_id=site.id, is_active=True)
        db_session.add(reg)
        db_session.commit()
        from tests.caisse_sale_eligibility import grant_user_caisse_sale_eligibility

        grant_user_caisse_sale_eligibility(db_session, op, site.id)

        cs = CashSessionService(db_session).create_session(str(op.id), str(site.id), 5.0, str(reg.id))
        sale = Sale(
            cash_session_id=cs.id,
            total_amount=2.0,
            donation=0.0,
            payment_method=PaymentMethod.CASH,
            lifecycle_status=SaleLifecycleStatus.COMPLETED,
        )
        db_session.add(sale)
        db_session.flush()
        pt = PaymentTransaction(
            sale_id=sale.id,
            payment_method=PaymentMethod.CASH,
            payment_method_id=pm.id,
            amount=2.0,
        )
        db_session.add(pt)
        db_session.commit()

        r = super_admin_client.post(
            f"{_EXPERT}/payment-methods/{pm.id}/active?active=false",
            headers=_step_headers(super_admin_client),
        )
        assert r.status_code == 409


class TestPaymentMethodExpertHttp:
    def test_list_payment_methods_ok(self, super_admin_client: TestClient):
        r = super_admin_client.get(f"{_EXPERT}/payment-methods")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_patch_payment_method_with_step_up(self, super_admin_client: TestClient, db_session: Session):
        code = f"patch_pm_{uuid.uuid4().hex[:10]}"
        created = super_admin_client.post(
            f"{_EXPERT}/payment-methods",
            json={
                "code": code,
                "label": "Avant patch",
                "kind": "cash",
                "paheko_debit_account": "5320",
                "paheko_refund_credit_account": "5320",
                "display_order": 210,
                "active": False,
            },
            headers=_step_headers(super_admin_client),
        )
        assert created.status_code == 201, created.text
        pm_id = created.json()["id"]
        patched = super_admin_client.patch(
            f"{_EXPERT}/payment-methods/{pm_id}",
            json={"label": "Après patch HTTP"},
            headers=_step_headers(super_admin_client),
        )
        assert patched.status_code == 200, patched.text
        assert patched.json()["label"] == "Après patch HTTP"

    def test_set_active_true_on_inactive_payment_method(self, super_admin_client: TestClient):
        code = f"act_pm_{uuid.uuid4().hex[:10]}"
        created = super_admin_client.post(
            f"{_EXPERT}/payment-methods",
            json={
                "code": code,
                "label": "Activation HTTP",
                "kind": "cash",
                "paheko_debit_account": "5330",
                "paheko_refund_credit_account": "5330",
                "display_order": 211,
                "active": False,
            },
            headers=_step_headers(super_admin_client),
        )
        assert created.status_code == 201, created.text
        pm_id = created.json()["id"]
        r = super_admin_client.post(
            f"{_EXPERT}/payment-methods/{pm_id}/active?active=true",
            headers=_step_headers(super_admin_client),
        )
        assert r.status_code == 200, r.text
        assert r.json()["active"] is True

    def test_create_payment_method_requires_step_up(self, super_admin_client: TestClient):
        r = super_admin_client.post(
            f"{_EXPERT}/payment-methods",
            json={
                "code": f"api_pm_{uuid.uuid4().hex[:8]}",
                "label": "Pytest moyen",
                "kind": "cash",
                "paheko_debit_account": "531",
                "paheko_refund_credit_account": "531",
                "display_order": 200,
                "active": False,
            },
        )
        assert r.status_code == 403

    def test_create_payment_method_with_step_up(self, super_admin_client: TestClient, db_session: Session):
        code = f"api_pm_{uuid.uuid4().hex[:10]}"
        r = super_admin_client.post(
            f"{_EXPERT}/payment-methods",
            json={
                "code": code,
                "label": "Pytest création HTTP",
                "kind": "cash",
                "paheko_debit_account": "5310",
                "paheko_refund_credit_account": "5310",
                "display_order": 201,
                "active": False,
            },
            headers=_step_headers(super_admin_client),
        )
        assert r.status_code == 201, r.text
        row = r.json()
        assert row["code"] == code
        assert row["active"] is False
        listed = super_admin_client.get(f"{_EXPERT}/payment-methods")
        assert listed.status_code == 200
        codes = [x["code"] for x in listed.json()]
        assert code in codes


class TestRevisionReadEndpoints:
    def test_get_latest_revision_ok(self, super_admin_client: TestClient):
        r = super_admin_client.get(f"{_EXPERT}/revisions/latest")
        assert r.status_code == 200
        data = r.json()
        assert "snapshot" in data
        assert data["revision_seq"] >= 1

    def test_get_revision_by_id_matches_latest_snapshot(self, super_admin_client: TestClient):
        latest = super_admin_client.get(f"{_EXPERT}/revisions/latest")
        assert latest.status_code == 200
        lid = latest.json()["id"]
        r = super_admin_client.get(f"{_EXPERT}/revisions/{lid}")
        assert r.status_code == 200
        body = r.json()
        assert body["id"] == lid
        assert body["revision_seq"] == latest.json()["revision_seq"]
        assert "snapshot" in body

    def test_list_revisions_ok(self, super_admin_client: TestClient):
        r = super_admin_client.get(f"{_EXPERT}/revisions", params={"limit": 5})
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        assert len(rows) >= 1
        assert "revision_seq" in rows[0]


class TestGlobalAccountsValidation:
    def test_patch_global_rejects_invalid_paheko_account(self, super_admin_client: TestClient):
        r = super_admin_client.patch(
            f"{_EXPERT}/global-accounts",
            json={
                "default_sales_account": "707!",
                "default_donation_account": "708",
                "prior_year_refund_account": "467",
            },
            headers=_step_headers(super_admin_client),
        )
        assert r.status_code == 422


class TestPaymentMethodMinMaxAmounts:
    def test_create_rejects_min_gt_max(self, super_admin_client: TestClient):
        code = f"mm_{uuid.uuid4().hex[:10]}"
        r = super_admin_client.post(
            f"{_EXPERT}/payment-methods",
            json={
                "code": code,
                "label": "Bornes invalides",
                "kind": "cash",
                "paheko_debit_account": "5310",
                "paheko_refund_credit_account": "5310",
                "min_amount": 100.0,
                "max_amount": 10.0,
                "display_order": 220,
                "active": False,
            },
            headers=_step_headers(super_admin_client),
        )
        assert r.status_code == 422

    def test_update_rejects_min_gt_max(self, super_admin_client: TestClient, db_session: Session):
        code = f"mm2_{uuid.uuid4().hex[:10]}"
        created = super_admin_client.post(
            f"{_EXPERT}/payment-methods",
            json={
                "code": code,
                "label": "ok",
                "kind": "cash",
                "paheko_debit_account": "5340",
                "paheko_refund_credit_account": "5340",
                "min_amount": 1.0,
                "max_amount": 50.0,
                "display_order": 221,
                "active": False,
            },
            headers=_step_headers(super_admin_client),
        )
        assert created.status_code == 201, created.text
        pm_id = created.json()["id"]
        r = super_admin_client.patch(
            f"{_EXPERT}/payment-methods/{pm_id}",
            json={"min_amount": 100.0, "max_amount": 10.0},
            headers=_step_headers(super_admin_client),
        )
        assert r.status_code == 422


class TestArchivedPaymentMethodMutations:
    def test_patch_archived_forbidden(self, super_admin_client: TestClient, db_session: Session):
        pm = PaymentMethodDefinition(
            code=f"arc_{uuid.uuid4().hex[:8]}",
            label="Archivé",
            active=False,
            kind=PaymentMethodKind.CASH,
            paheko_debit_account="531",
            paheko_refund_credit_account="531",
            display_order=300,
            archived_at=datetime.now(timezone.utc),
        )
        db_session.add(pm)
        db_session.commit()
        db_session.refresh(pm)
        r = super_admin_client.patch(
            f"{_EXPERT}/payment-methods/{pm.id}",
            json={"label": "hack"},
            headers=_step_headers(super_admin_client),
        )
        assert r.status_code == 409

    def test_set_active_archived_forbidden(self, super_admin_client: TestClient, db_session: Session):
        pm = PaymentMethodDefinition(
            code=f"arc2_{uuid.uuid4().hex[:8]}",
            label="Archivé 2",
            active=False,
            kind=PaymentMethodKind.CASH,
            paheko_debit_account="531",
            paheko_refund_credit_account="531",
            display_order=301,
            archived_at=datetime.now(timezone.utc),
        )
        db_session.add(pm)
        db_session.commit()
        db_session.refresh(pm)
        r = super_admin_client.post(
            f"{_EXPERT}/payment-methods/{pm.id}/active?active=true",
            headers=_step_headers(super_admin_client),
        )
        assert r.status_code == 409


class TestPublishRevisionIntegrity:
    def test_publish_retries_once_on_integrity_error(self, db_session: Session, monkeypatch: pytest.MonkeyPatch):
        from recyclic_api.models.user import User, UserRole, UserStatus
        from recyclic_api.core.security import hash_password

        u = User(
            username=f"pub_u_{uuid.uuid4().hex[:8]}",
            hashed_password=hash_password("x"),
            role=UserRole.SUPER_ADMIN,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(u)
        db_session.commit()
        db_session.refresh(u)
        svc = AccountingExpertService(db_session)
        calls = {"n": 0}
        real_commit = db_session.commit

        def commit_wrap() -> None:
            calls["n"] += 1
            if calls["n"] == 1:
                raise IntegrityError("stmt", {}, Exception("uq_revision_seq"))
            real_commit()

        monkeypatch.setattr(db_session, "commit", commit_wrap)
        rev = svc.publish_revision(actor_user_id=u.id, note="integrity-retry")
        assert rev.id is not None
        assert calls["n"] >= 2

    def test_publish_conflict_after_max_integrity_errors(self, db_session: Session, monkeypatch: pytest.MonkeyPatch):
        from recyclic_api.models.user import User, UserRole, UserStatus
        from recyclic_api.core.security import hash_password

        u = User(
            username=f"pub_u2_{uuid.uuid4().hex[:8]}",
            hashed_password=hash_password("x"),
            role=UserRole.SUPER_ADMIN,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(u)
        db_session.commit()
        db_session.refresh(u)
        svc = AccountingExpertService(db_session)

        def commit_boom() -> None:
            raise IntegrityError("stmt", {}, Exception("uq_revision_seq"))

        monkeypatch.setattr(db_session, "commit", commit_boom)
        with pytest.raises(ConflictError):
            svc.publish_revision(actor_user_id=u.id, note="fail")


class TestRevisionSnapshotParsing:
    def test_get_latest_rejects_malformed_snapshot_json(self, super_admin_client: TestClient, db_session: Session):
        latest = AccountingExpertService(db_session).get_latest_revision()
        assert latest is not None
        latest.snapshot_json = "NOT_JSON{{"
        db_session.commit()
        r = super_admin_client.get(f"{_EXPERT}/revisions/latest")
        assert r.status_code == 422
