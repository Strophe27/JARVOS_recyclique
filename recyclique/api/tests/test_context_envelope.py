"""Tests ContextEnvelope minimal (Story 2.2)."""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.core.security import create_access_token, hash_password
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus


def _auth_headers(user_id: uuid.UUID) -> dict:
    token = create_access_token(data={"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


class TestContextEnvelope:
    def test_context_degraded_without_site(self, client: TestClient, db_session: Session):
        uid = uuid.uuid4()
        user = User(
            id=uid,
            username="ctx_no_site",
            hashed_password=hash_password("Test1234!"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
            site_id=None,
        )
        db_session.add(user)
        db_session.commit()

        r = client.get("/v1/users/me/context", headers=_auth_headers(uid))
        assert r.status_code == 200
        data = r.json()
        assert data["runtime_state"] == "degraded"
        assert data["context"]["site_id"] is None
        assert "permission_keys" in data
        assert "computed_at" in data
        assert data.get("restriction_message")

    def test_context_ok_with_site(self, client: TestClient, db_session: Session):
        site = Site(id=uuid.uuid4(), name="Site A", is_active=True)
        db_session.add(site)
        uid = uuid.uuid4()
        user = User(
            id=uid,
            username="ctx_ok_site",
            hashed_password=hash_password("Test1234!"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
            site_id=site.id,
        )
        db_session.add(user)
        db_session.commit()

        r = client.get("/v1/users/me/context", headers=_auth_headers(uid))
        assert r.status_code == 200
        data = r.json()
        assert data["runtime_state"] == "ok"
        assert data["context"]["site_id"] == str(site.id)
        assert data["context"]["cash_session_id"] is None

    def test_context_forbidden_rejected(self, client: TestClient, db_session: Session):
        uid = uuid.uuid4()
        user = User(
            id=uid,
            username="ctx_rejected",
            hashed_password=hash_password("Test1234!"),
            role=UserRole.USER,
            status=UserStatus.REJECTED,
            is_active=True,
            site_id=None,
        )
        db_session.add(user)
        db_session.commit()

        r = client.get("/v1/users/me/context", headers=_auth_headers(uid))
        assert r.status_code == 200
        data = r.json()
        assert data["runtime_state"] == "forbidden"
        assert data["context"] is None
        assert data["permission_keys"] == []

    def test_context_degraded_session_other_site(self, client: TestClient, db_session: Session):
        site_a = Site(id=uuid.uuid4(), name="A", is_active=True)
        site_b = Site(id=uuid.uuid4(), name="B", is_active=True)
        db_session.add_all([site_a, site_b])
        uid = uuid.uuid4()
        user = User(
            id=uid,
            username="ctx_mismatch",
            hashed_password=hash_password("Test1234!"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
            site_id=site_a.id,
        )
        db_session.add(user)
        db_session.flush()
        session = CashSession(
            id=uuid.uuid4(),
            operator_id=uid,
            site_id=site_b.id,
            register_id=None,
            initial_amount=0.0,
            current_amount=0.0,
            status=CashSessionStatus.OPEN,
        )
        db_session.add(session)
        db_session.commit()

        r = client.get("/v1/users/me/context", headers=_auth_headers(uid))
        assert r.status_code == 200
        data = r.json()
        assert data["runtime_state"] == "degraded"
        assert "autre site" in (data.get("restriction_message") or "").lower()

    def test_refresh_matches_get_and_reflects_db(self, client: TestClient, db_session: Session):
        site = Site(id=uuid.uuid4(), name="S2", is_active=True)
        db_session.add(site)
        uid = uuid.uuid4()
        user = User(
            id=uid,
            username="ctx_refresh",
            hashed_password=hash_password("Test1234!"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
            site_id=None,
        )
        db_session.add(user)
        db_session.commit()
        headers = _auth_headers(uid)

        g1 = client.get("/v1/users/me/context", headers=headers).json()
        assert g1["runtime_state"] == "degraded"

        user_db = db_session.query(User).filter(User.id == uid).first()
        user_db.site_id = site.id
        db_session.commit()

        p = client.post("/v1/users/me/context/refresh", headers=headers).json()
        assert p["runtime_state"] == "ok"
        assert p["context"]["site_id"] == str(site.id)

    def test_me_permissions_unchanged(self, client: TestClient, db_session: Session):
        """Pas de régression sur /v1/users/me/permissions."""
        uid = uuid.uuid4()
        user = User(
            id=uid,
            username="ctx_perms",
            hashed_password=hash_password("Test1234!"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
            site_id=None,
        )
        db_session.add(user)
        db_session.commit()
        headers = _auth_headers(uid)
        r = client.get("/v1/users/me/permissions", headers=headers)
        assert r.status_code == 200
        assert "permissions" in r.json()

    def test_context_unauthenticated_get(self, client: TestClient):
        r = client.get("/v1/users/me/context")
        assert r.status_code in (401, 403)

    def test_context_unauthenticated_refresh(self, client: TestClient):
        r = client.post("/v1/users/me/context/refresh")
        assert r.status_code in (401, 403)

    def test_context_presentation_labels_nav_transverse_dashboard(self, client: TestClient, db_session: Session):
        """Story 5.5 : libellés CREOS servis pour la nav live (évite le fallback `nav.*` côté Peintre_nano)."""
        site = Site(id=uuid.uuid4(), name="Site nav labels", is_active=True)
        db_session.add(site)
        uid = uuid.uuid4()
        user = User(
            id=uid,
            username="ctx_pres_labels",
            hashed_password=hash_password("Test1234!"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
            site_id=site.id,
        )
        db_session.add(user)
        db_session.commit()

        r = client.get("/v1/users/me/context", headers=_auth_headers(uid))
        assert r.status_code == 200
        data = r.json()
        pl = data.get("presentation_labels")
        assert isinstance(pl, dict)
        assert pl.get("nav.transverse.dashboard") == "Tableau de bord"
        assert pl.get("nav.reception.nominal") == "Réception"
        assert pl.get("context.active_site_display_name") == "Site nav labels"

    def test_context_forbidden_no_presentation_labels(self, client: TestClient, db_session: Session):
        uid = uuid.uuid4()
        user = User(
            id=uid,
            username="ctx_no_pl",
            hashed_password=hash_password("Test1234!"),
            role=UserRole.USER,
            status=UserStatus.REJECTED,
            is_active=True,
            site_id=None,
        )
        db_session.add(user)
        db_session.commit()
        data = client.get("/v1/users/me/context", headers=_auth_headers(uid)).json()
        assert data["runtime_state"] == "forbidden"
        assert data.get("presentation_labels") is None

    def test_context_degraded_status_not_active(self, client: TestClient, db_session: Session):
        """Compte authentifié mais statut != ACTIVE → degraded explicite (AC3)."""
        site = Site(id=uuid.uuid4(), name="Site appr", is_active=True)
        db_session.add(site)
        uid = uuid.uuid4()
        user = User(
            id=uid,
            username="ctx_approved_only",
            hashed_password=hash_password("Test1234!"),
            role=UserRole.USER,
            status=UserStatus.APPROVED,
            is_active=True,
            site_id=site.id,
        )
        db_session.add(user)
        db_session.commit()

        r = client.get("/v1/users/me/context", headers=_auth_headers(uid))
        assert r.status_code == 200
        data = r.json()
        assert data["runtime_state"] == "degraded"
        assert "activation" in (data.get("restriction_message") or "").lower()

    def test_context_envelope_payload_shape(self, client: TestClient, db_session: Session):
        """Champs canoniques présents (AC1)."""
        uid = uuid.uuid4()
        user = User(
            id=uid,
            username="ctx_shape",
            hashed_password=hash_password("Test1234!"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
            site_id=None,
        )
        db_session.add(user)
        db_session.commit()
        data = client.get("/v1/users/me/context", headers=_auth_headers(uid)).json()
        assert set(data.keys()) >= {
            "runtime_state",
            "context",
            "permission_keys",
            "computed_at",
            "restriction_message",
            "presentation_labels",
        }
        ctx = data["context"]
        assert ctx is not None
        assert set(ctx.keys()) >= {
            "site_id",
            "cash_register_id",
            "cash_session_id",
            "reception_post_id",
        }
