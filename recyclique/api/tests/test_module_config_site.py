"""Tests T-MOD-3 — GET/PATCH /v1/sites/{site_id}/module-config/{module_key}."""

from __future__ import annotations

import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.core.config import settings
from recyclic_api.core.security import create_access_token, hash_password
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus

_V1 = settings.API_V1_STR.rstrip("/")
_MODULE_KEY = "kpi-live-banner"
_DEFAULT_PAYLOAD = {
    "show_on_caisse": True,
    "show_on_reception": True,
    "refresh_interval_seconds": 60,
}


def _url(site_id: uuid.UUID, module_key: str = _MODULE_KEY) -> str:
    return f"{_V1}/sites/{site_id}/module-config/{module_key}"


def _admin_for_site(db_session: Session, site: Site) -> tuple[User, str]:
    uid = uuid.uuid4()
    admin = User(
        id=uid,
        username=f"adm_mc_{uid.hex[:8]}@test.com",
        hashed_password=hash_password("pw"),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        legacy_external_contact_id=f"leg_{uid.hex[:12]}",
        site_id=site.id,
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    token = create_access_token(data={"sub": str(admin.id)})
    return admin, token


def test_get_unknown_module_key_404(client: TestClient, db_session: Session):
    site = Site(id=uuid.uuid4(), name="Site MC", is_active=True)
    db_session.add(site)
    db_session.commit()
    _, token = _admin_for_site(db_session, site)

    r = client.get(
        _url(site.id, "cashflow"),
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 404


def test_get_wrong_site_idor_403(client: TestClient, db_session: Session):
    site_a = Site(id=uuid.uuid4(), name="Site A", is_active=True)
    site_b = Site(id=uuid.uuid4(), name="Site B", is_active=True)
    db_session.add_all([site_a, site_b])
    db_session.commit()

    _, token = _admin_for_site(db_session, site_a)

    r = client.get(
        _url(site_b.id),
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 403


def test_get_default_200(client: TestClient, db_session: Session):
    site = Site(id=uuid.uuid4(), name="Site default", is_active=True)
    db_session.add(site)
    db_session.commit()
    _, token = _admin_for_site(db_session, site)

    r = client.get(
        _url(site.id),
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["schema_version"] == "1.0.0"
    assert body["payload"] == _DEFAULT_PAYLOAD
    assert body.get("version") == 0
    assert r.headers.get("etag") == 'W/"0"' or r.headers.get("ETag") == 'W/"0"'


def test_patch_then_get_reflects_200(client: TestClient, db_session: Session):
    site = Site(id=uuid.uuid4(), name="Site patch", is_active=True)
    db_session.add(site)
    db_session.commit()
    _, token = _admin_for_site(db_session, site)

    patch_body = {
        "schema_version": "1.0.0",
        "payload": {
            "show_on_caisse": False,
            "show_on_reception": True,
            "refresh_interval_seconds": 120,
        },
    }
    r_patch = client.patch(
        _url(site.id),
        json=patch_body,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r_patch.status_code == 200, r_patch.text
    patched = r_patch.json()
    assert patched["payload"]["show_on_caisse"] is False
    assert patched["payload"]["refresh_interval_seconds"] == 120
    assert patched["version"] == 1
    etag = r_patch.headers.get("etag") or r_patch.headers.get("ETag")
    assert etag == 'W/"1"'

    r_get = client.get(
        _url(site.id),
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r_get.status_code == 200
    assert r_get.json()["payload"] == patch_body["payload"]
    assert r_get.json()["version"] == 1


def test_patch_if_match_wrong_409(client: TestClient, db_session: Session):
    site = Site(id=uuid.uuid4(), name="Site conflict", is_active=True)
    db_session.add(site)
    db_session.commit()
    _, token = _admin_for_site(db_session, site)

    body = {
        "schema_version": "1.0.0",
        "payload": _DEFAULT_PAYLOAD,
    }
    r = client.patch(
        _url(site.id),
        json=body,
        headers={
            "Authorization": f"Bearer {token}",
            "If-Match": 'W/"99"',
        },
    )
    assert r.status_code == 409
