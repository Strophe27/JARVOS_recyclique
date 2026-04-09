"""
Inscription publique désactivée : seuls les administrateurs créent les comptes (rôles inclus).
POST {API_V1_STR}/auth/signup renvoie 403 ; le préfixe historique /api/v1 n'est pas monté sur l'app de test.
"""

import uuid

from sqlalchemy import func, select

from recyclic_api.core.config import settings
from recyclic_api.models.user import User

_V1 = settings.API_V1_STR.rstrip("/")


class TestPublicSignupDisabled:
    """POST /auth/signup : politique produit — pas de self-signup public."""

    def test_signup_returns_403_forbidden_envelope(self, client):
        response = client.post(
            f"{_V1}/auth/signup",
            json={
                "username": f"would_{uuid.uuid4().hex[:10]}",
                "password": "validpassword123",
                "email": "nobody@example.com",
            },
        )
        assert response.status_code == 403
        data = response.json()
        assert data.get("code") == "FORBIDDEN"
        assert "administrateur" in (data.get("detail") or "").lower()

    def test_signup_does_not_create_user(self, client, db_session):
        count_before = db_session.scalar(select(func.count()).select_from(User))
        username = f"noshow_{uuid.uuid4().hex[:12]}"
        response = client.post(
            f"{_V1}/auth/signup",
            json={"username": username, "password": "validpassword123"},
        )
        assert response.status_code == 403
        count_after = db_session.scalar(select(func.count()).select_from(User))
        assert count_after == count_before

    def test_hardcoded_api_v1_prefix_is_not_mounted(self, client):
        """Documenter : les routes v1 suivent settings.API_V1_STR (ex. /v1), pas /api/v1 en dur."""
        response = client.post(
            "/api/v1/auth/signup",
            json={"username": "x", "password": "yyyyyyyy"},
        )
        assert response.status_code == 404
