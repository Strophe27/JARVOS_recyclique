"""Story 8.3 — résolution mapping site/caisse avant POST Paheko ; API admin CRUD."""

from __future__ import annotations

import json
import uuid
from typing import Any

import httpx
import pytest
from sqlalchemy.orm import Session

from recyclic_api.core.config import settings
from recyclic_api.core.security import hash_password
from recyclic_api.models.cash_register import CashRegister
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.paheko_cash_session_close_mapping import PahekoCashSessionCloseMapping
from recyclic_api.models.paheko_outbox import PahekoOutboxItem, PahekoOutboxStatus
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.core.exceptions import PahekoSyncPolicyBlockedError
from recyclic_api.services.cash_session_service import CashSessionService
from recyclic_api.services.paheko_sync_final_action_policy import (
    CODE_REFUSED,
    REASON_CLOSE_MAPPING,
)
from recyclic_api.services.paheko_accounting_client import PahekoAccountingClient
from recyclic_api.services.paheko_outbox_processor import process_next_paheko_outbox_item
from tests.paheko_8x_test_utils import attach_latest_accounting_revision_to_session, seed_default_paheko_close_mapping

_V1 = settings.API_V1_STR.rstrip("/")


def _site_user_session(db_session: Session, *, with_register: bool = False) -> tuple[Site, User, CashSession]:
    site = Site(
        name="S8.3 site",
        address="1 rue T",
        city="V",
        postal_code="75000",
        country="FR",
        is_active=True,
    )
    db_session.add(site)
    db_session.flush()
    uid = uuid.uuid4()
    user = User(
        id=uid,
        username=f"u_{uid.hex[:10]}@t.com",
        hashed_password=hash_password("pw"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
        is_active=True,
        site_id=site.id,
    )
    db_session.add(user)
    db_session.flush()
    reg_id = None
    if with_register:
        reg = CashRegister(name="Caisse A", site_id=site.id, is_active=True)
        db_session.add(reg)
        db_session.flush()
        reg_id = reg.id
    cs = CashSession(
        operator_id=user.id,
        site_id=site.id,
        register_id=reg_id,
        initial_amount=10.0,
        current_amount=35.0,
        status=CashSessionStatus.OPEN,
        total_sales=25.0,
        total_items=1,
    )
    db_session.add(cs)
    attach_latest_accounting_revision_to_session(db_session, cs)
    db_session.commit()
    return site, user, cs


def test_mapping_missing_blocks_a1_before_outbox(db_session: Session) -> None:
    """Story 8.6 — pas d'outbox ni d'appel Paheko si mapping absent : refus politique à la clôture."""
    _, _, cs = _site_user_session(db_session)
    svc = CashSessionService(db_session)
    with pytest.raises(PahekoSyncPolicyBlockedError) as exc:
        svc.close_session_with_amounts(str(cs.id), 35.0, "ok", sync_correlation_id="m1")
    p = exc.value.payload
    assert p["code"] == CODE_REFUSED
    assert p["policy_reason_code"] == REASON_CLOSE_MAPPING
    assert p.get("mapping_resolution_code") == "mapping_missing"
    db_session.refresh(cs)
    assert cs.status == CashSessionStatus.OPEN
    assert (
        db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).count()
        == 0
    )


def test_mapping_resolved_enriches_payload_sent_to_paheko(db_session: Session) -> None:
    site, _, cs = _site_user_session(db_session)
    seed_default_paheko_close_mapping(
        db_session,
        site.id,
        destination_params={"id_year": 2, "debit": "530", "credit": "707", "label_prefix": "Cloture test"},
    )
    svc = CashSessionService(db_session)
    svc.close_session_with_amounts(str(cs.id), 35.0, "ok", sync_correlation_id="m2")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()

    bodies: list[dict[str, Any]] = []

    def dispatch(request: httpx.Request) -> httpx.Response:
        bodies.append(json.loads(request.content.decode("utf-8")))
        return httpx.Response(200, text="{}", request=request)

    def factory() -> httpx.Client:
        return httpx.Client(transport=httpx.MockTransport(dispatch), base_url="http://paheko.test")

    client = PahekoAccountingClient(base_url="http://paheko.test", client_factory=factory)
    process_next_paheko_outbox_item(db_session, client=client)
    db_session.refresh(item)

    assert item.outbox_status == PahekoOutboxStatus.delivered.value
    assert item.sync_state_core == "resolu"
    assert bodies
    # Story 23.4 : premier POST = ventilation ADVANCED (plus d’écriture REVENUE agrégée unique).
    b0 = bodies[0]
    assert b0["id_year"] == 2
    assert b0["type"] == "ADVANCED"
    assert b0["date"]
    # Libellé transaction 1 : builder 23.x (ADVANCED) — préfixe expert ventilé ; le `label_prefix` mapping apparaît en note / autre sous-écriture.
    assert cs.id.hex[:8] in b0["label"]
    assert b0.get("lines")
    assert str(cs.id) in b0.get("reference", "")
    assert str(cs.id) in (b0.get("notes") or "")
    assert "cash_session_id" not in b0


def test_register_specific_mapping_overrides_site_default(db_session: Session) -> None:
    site, _, cs = _site_user_session(db_session, with_register=True)
    assert cs.register_id is not None
    seed_default_paheko_close_mapping(
        db_session,
        site.id,
        destination_params={"id_year": 2, "debit": "512", "credit": "707"},
    )
    db_session.add(
        PahekoCashSessionCloseMapping(
            site_id=site.id,
            register_id=cs.register_id,
            enabled=True,
            destination_params={"id_year": 3, "debit": "531", "credit": "706"},
        )
    )
    db_session.commit()

    svc = CashSessionService(db_session)
    svc.close_session_with_amounts(str(cs.id), 35.0, "ok", sync_correlation_id="m3")
    item = db_session.query(PahekoOutboxItem).filter(PahekoOutboxItem.cash_session_id == cs.id).one()

    bodies: list[dict[str, Any]] = []

    def dispatch(request: httpx.Request) -> httpx.Response:
        bodies.append(json.loads(request.content.decode("utf-8")))
        return httpx.Response(200, text="{}", request=request)

    def factory() -> httpx.Client:
        return httpx.Client(transport=httpx.MockTransport(dispatch), base_url="http://paheko.test")

    client = PahekoAccountingClient(base_url="http://paheko.test", client_factory=factory)
    process_next_paheko_outbox_item(db_session, client=client)
    db_session.refresh(item)

    assert item.sync_state_core == "resolu"
    assert bodies[0]["id_year"] == 3
    assert bodies[0]["type"] == "ADVANCED"
    assert bodies[0].get("lines")


def test_disabled_site_default_blocks_a1(db_session: Session) -> None:
    site, _, cs = _site_user_session(db_session)
    row = PahekoCashSessionCloseMapping(
        site_id=site.id,
        register_id=None,
        enabled=False,
        destination_params={"x": 1},
    )
    db_session.add(row)
    db_session.commit()

    svc = CashSessionService(db_session)
    with pytest.raises(PahekoSyncPolicyBlockedError) as exc:
        svc.close_session_with_amounts(str(cs.id), 35.0, "ok")
    assert exc.value.payload.get("mapping_resolution_code") == "mapping_disabled"
    db_session.refresh(cs)
    assert cs.status == CashSessionStatus.OPEN


def test_admin_crud_mappings(super_admin_client: Any, db_session: Session) -> None:
    site, _, _ = _site_user_session(db_session)
    r = super_admin_client.get(f"{_V1}/admin/paheko-mappings/cash-session-close")
    assert r.status_code == 200, r.text
    assert r.json()["total"] >= 0

    c = super_admin_client.post(
        f"{_V1}/admin/paheko-mappings/cash-session-close",
        json={
            "site_id": str(site.id),
            "register_id": None,
            "destination_params": {"id_year": 2, "debit": "512", "credit": "707"},
            "enabled": True,
            "label": "defaut test",
        },
    )
    assert c.status_code == 200, c.text
    mid = c.json()["id"]

    p = super_admin_client.patch(
        f"{_V1}/admin/paheko-mappings/cash-session-close/{mid}",
        json={"enabled": False},
    )
    assert p.status_code == 200, p.text
    assert p.json()["enabled"] is False


def test_admin_list_mappings_invalid_site_id_returns_400(super_admin_client: Any) -> None:
    r = super_admin_client.get(f"{_V1}/admin/paheko-mappings/cash-session-close?site_id=not-a-uuid")
    assert r.status_code == 400, r.text


def test_admin_list_mappings_filter_by_site_id(super_admin_client: Any, db_session: Session) -> None:
    site, _, _ = _site_user_session(db_session)
    super_admin_client.post(
        f"{_V1}/admin/paheko-mappings/cash-session-close",
        json={
            "site_id": str(site.id),
            "register_id": None,
            "destination_params": {"id_year": 2, "debit": "512", "credit": "707"},
            "enabled": True,
        },
    )
    r = super_admin_client.get(f"{_V1}/admin/paheko-mappings/cash-session-close?site_id={site.id}")
    assert r.status_code == 200, r.text
    data = r.json()["data"]
    assert any(row.get("destination_params", {}).get("credit") == "707" for row in data)


def test_admin_create_mapping_empty_destination_returns_422(super_admin_client: Any, db_session: Session) -> None:
    site, _, _ = _site_user_session(db_session)
    r = super_admin_client.post(
        f"{_V1}/admin/paheko-mappings/cash-session-close",
        json={
            "site_id": str(site.id),
            "register_id": None,
            "destination_params": {},
            "enabled": True,
        },
    )
    assert r.status_code == 422, r.text


def test_admin_create_duplicate_site_default_returns_409(super_admin_client: Any, db_session: Session) -> None:
    site, _, _ = _site_user_session(db_session)
    body = {
        "site_id": str(site.id),
        "register_id": None,
        "destination_params": {"id_year": 2, "debit": "512", "credit": "707"},
        "enabled": True,
    }
    a = super_admin_client.post(f"{_V1}/admin/paheko-mappings/cash-session-close", json=body)
    assert a.status_code == 200, a.text
    b = super_admin_client.post(f"{_V1}/admin/paheko-mappings/cash-session-close", json=body)
    assert b.status_code == 409, b.text


def test_admin_patch_mapping_empty_body_returns_422(super_admin_client: Any, db_session: Session) -> None:
    site, _, _ = _site_user_session(db_session)
    c = super_admin_client.post(
        f"{_V1}/admin/paheko-mappings/cash-session-close",
        json={
            "site_id": str(site.id),
            "register_id": None,
            "destination_params": {"id_year": 2, "debit": "512", "credit": "707"},
            "enabled": True,
        },
    )
    assert c.status_code == 200, c.text
    mid = c.json()["id"]
    p = super_admin_client.patch(f"{_V1}/admin/paheko-mappings/cash-session-close/{mid}", json={})
    assert p.status_code == 422, p.text


def test_admin_patch_mapping_invalid_destination_returns_422(super_admin_client: Any, db_session: Session) -> None:
    site, _, _ = _site_user_session(db_session)
    c = super_admin_client.post(
        f"{_V1}/admin/paheko-mappings/cash-session-close",
        json={
            "site_id": str(site.id),
            "register_id": None,
            "destination_params": {"id_year": 2, "debit": "512", "credit": "707"},
            "enabled": True,
        },
    )
    assert c.status_code == 200, c.text
    mid = c.json()["id"]
    p = super_admin_client.patch(
        f"{_V1}/admin/paheko-mappings/cash-session-close/{mid}",
        json={"destination_params": {}},
    )
    assert p.status_code == 422, p.text


def test_admin_patch_mapping_not_found_returns_404(super_admin_client: Any) -> None:
    fake = uuid.uuid4()
    r = super_admin_client.patch(
        f"{_V1}/admin/paheko-mappings/cash-session-close/{fake}",
        json={"enabled": False},
    )
    assert r.status_code == 404, r.text


def test_admin_mappings_forbidden_for_user_role(user_client: Any) -> None:
    r = user_client.get(f"{_V1}/admin/paheko-mappings/cash-session-close")
    assert r.status_code == 403, r.text


def test_invalid_destination_params_in_db_blocks_a1(db_session: Session) -> None:
    """Ligne insérée hors API (params vides) : politique 8.6 refuse la clôture avant outbox."""
    site, _, cs = _site_user_session(db_session)
    db_session.add(
        PahekoCashSessionCloseMapping(
            site_id=site.id,
            register_id=None,
            enabled=True,
            destination_params={},
        )
    )
    db_session.commit()

    svc = CashSessionService(db_session)
    with pytest.raises(PahekoSyncPolicyBlockedError) as exc:
        svc.close_session_with_amounts(str(cs.id), 35.0, "ok", sync_correlation_id="m_bad_dest")
    assert exc.value.payload.get("mapping_resolution_code") == "invalid_destination_params"


def _collect_openapi_operation_ids(schema: dict[str, Any]) -> set[str]:
    out: set[str] = set()
    for _path, methods in (schema.get("paths") or {}).items():
        if not isinstance(methods, dict):
            continue
        for _m, op in methods.items():
            if isinstance(op, dict) and "operationId" in op:
                out.add(str(op["operationId"]))
    return out


def test_openapi_includes_mapping_operation_ids(openapi_schema: dict[str, Any]) -> None:
    ids = _collect_openapi_operation_ids(openapi_schema)
    assert "recyclique_pahekoMapping_listCashSessionCloseMappings" in ids
    assert "recyclique_pahekoMapping_createCashSessionCloseMapping" in ids
    assert "recyclique_pahekoMapping_updateCashSessionCloseMapping" in ids
    assert "recyclique_pahekoOutbox_listItems" in ids
