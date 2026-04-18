import os
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.main import app
from recyclic_api.core.config import settings
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.site import Site
from recyclic_api.core.auth import create_access_token
from recyclic_api.core.security import hash_password
from tests.reception_story72_eligibility import grant_user_reception_eligibility

os.environ["TESTING"] = "true"
_V1 = settings.API_V1_STR.rstrip("/")


@pytest.fixture
def user_client(db_session: Session) -> TestClient:
    """Créer un client de test avec un utilisateur ayant le rôle USER."""
    site = Site(id=uuid.uuid4(), name="User access test site", is_active=True)
    db_session.add(site)
    db_session.commit()
    db_session.refresh(site)
    # Créer un utilisateur USER
    user = User(
        username="test_user",
        email="user@test.com",
        hashed_password=hash_password("testpassword"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
        is_active=True,
        site_id=site.id,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    grant_user_reception_eligibility(db_session, user, site.id)

    # Générer le token
    access_token = create_access_token(data={"sub": str(user.id)})

    # Configurer le client
    client = TestClient(app)
    client.headers["Authorization"] = f"Bearer {access_token}"
    
    return client


def test_user_can_open_poste(user_client: TestClient):
    """Test qu'un utilisateur USER peut ouvrir un poste de réception."""
    response = user_client.post(f"{_V1}/reception/postes/open")
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["status"] == "opened"


def test_user_can_close_poste(user_client: TestClient):
    """Test qu'un utilisateur USER peut fermer un poste de réception."""
    # D'abord ouvrir un poste
    open_response = user_client.post(f"{_V1}/reception/postes/open")
    assert open_response.status_code == 200
    poste_id = open_response.json()["id"]
    
    # Puis le fermer
    close_response = user_client.post(f"{_V1}/reception/postes/{poste_id}/close")
    assert close_response.status_code == 200
    data = close_response.json()
    assert data["status"] == "closed"


def test_unauthenticated_user_cannot_open_poste():
    """Test qu'un utilisateur non authentifié ne peut pas ouvrir un poste."""
    client = TestClient(app)
    response = client.post(f"{_V1}/reception/postes/open")
    assert response.status_code == 403  # require_role_strict retourne 403 quand pas d'Authorization header
