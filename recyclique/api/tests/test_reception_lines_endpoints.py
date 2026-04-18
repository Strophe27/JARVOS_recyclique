import os
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.core.auth import create_access_token
from recyclic_api.core.config import settings
from recyclic_api.core.security import hash_password
from recyclic_api.main import app
from recyclic_api.models.category import Category
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus
from tests.reception_story72_eligibility import grant_user_reception_eligibility

os.environ["TESTING"] = "true"
_V1 = settings.API_V1_STR.rstrip("/")


@pytest.fixture
def active_category_id(db_session: Session) -> str:
    """Catégorie active dans la même DB que le TestClient (pas de second engine)."""
    cat = Category(name=f"recv_line_cat_{uuid.uuid4().hex[:10]}", is_active=True)
    db_session.add(cat)
    db_session.commit()
    db_session.refresh(cat)
    return str(cat.id)


@pytest.fixture
def two_active_category_ids(db_session: Session) -> tuple[str, str]:
    """Deux catégories pour tests de changement de category_id."""
    c1 = Category(name=f"recv_line_c1_{uuid.uuid4().hex[:8]}", is_active=True)
    c2 = Category(name=f"recv_line_c2_{uuid.uuid4().hex[:8]}", is_active=True)
    db_session.add_all([c1, c2])
    db_session.commit()
    db_session.refresh(c1)
    db_session.refresh(c2)
    return (str(c1.id), str(c2.id))


@pytest.fixture
def reception_user_client(db_session: Session) -> TestClient:
    """USER avec site + permission réception (Story 7.2) — pas ADMIN."""
    site = Site(id=uuid.uuid4(), name="reception lines user site", is_active=True)
    db_session.add(site)
    db_session.commit()
    db_session.refresh(site)
    user = User(
        username=f"recv_lines_user_{uuid.uuid4().hex[:10]}",
        email="recv_lines_user@test.com",
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
    token = create_access_token(data={"sub": str(user.id)})
    client = TestClient(app)
    client.headers["Authorization"] = f"Bearer {token}"
    return client


def test_lines_crud_and_rules(admin_client, active_category_id: str):
    category_id = active_category_id
    # 1) Ouvrir un poste
    r = admin_client.post(f"{_V1}/reception/postes/open")
    assert r.status_code == 200
    poste_id = r.json()["id"]

    # 2) Créer un ticket
    r = admin_client.post(f"{_V1}/reception/tickets", json={"poste_id": poste_id})
    assert r.status_code == 200
    ticket_id = r.json()["id"]

    # 3) Ajouter une ligne valide
    r = admin_client.post(
        f"{_V1}/reception/lignes",
        json={
            "ticket_id": ticket_id,
            "category_id": str(category_id),
            "poids_kg": "1.250",
            "destination": "RECYCLAGE",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["ticket_id"] == ticket_id
    ligne_id = data["id"]

    # 5) Règle métier: poids_kg > 0
    r = admin_client.post(
        f"{_V1}/reception/lignes",
        json={
            "ticket_id": ticket_id,
            "category_id": str(category_id),
            "poids_kg": "0",
            "destination": "MAGASIN",
        },
    )
    assert r.status_code == 422

    # 6) Update ligne: changer poids et destination
    r = admin_client.put(
        f"{_V1}/reception/lignes/{ligne_id}",
        json={"poids_kg": "2.000", "destination": "MAGASIN"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["poids_kg"] == "2.000"
    assert data["destination"] == "MAGASIN"

    # 7) Fermer le ticket
    r = admin_client.post(f"{_V1}/reception/tickets/{ticket_id}/close")
    assert r.status_code == 200

    # 8) Règle: impossible d'ajouter/modifier/supprimer si ticket fermé → 409
    r = admin_client.post(
        f"{_V1}/reception/lignes",
        json={
            "ticket_id": ticket_id,
            "category_id": str(category_id),
            "poids_kg": "1.000",
            "destination": "RECYCLAGE",
        },
    )
    assert r.status_code == 409

    r = admin_client.put(
        f"{_V1}/reception/lignes/{ligne_id}",
        json={"poids_kg": "1.500"},
    )
    assert r.status_code == 409

    r = admin_client.delete(f"{_V1}/reception/lignes/{ligne_id}")
    assert r.status_code == 409


def test_delete_line_when_ticket_open(admin_client, active_category_id: str):
    category_id = active_category_id
    # Setup poste + ticket + catégorie + ligne
    r = admin_client.post(f"{_V1}/reception/postes/open")
    assert r.status_code == 200
    poste_id = r.json()["id"]
    r = admin_client.post(f"{_V1}/reception/tickets", json={"poste_id": poste_id})
    assert r.status_code == 200
    ticket_id = r.json()["id"]

    r = admin_client.post(
        f"{_V1}/reception/lignes",
        json={
            "ticket_id": ticket_id,
            "category_id": str(category_id),
            "poids_kg": "3.333",
            "destination": "MAGASIN",
        },
    )
    assert r.status_code == 200
    ligne_id = r.json()["id"]

    # Delete OK
    r = admin_client.delete(f"{_V1}/reception/lignes/{ligne_id}")
    assert r.status_code == 200
    assert r.json()["status"] == "deleted"


def test_404_invalid_category_id(admin_client, active_category_id: str):
    """Test 404 pour category_id invalide (POST/PUT)."""
    category_id = active_category_id
    # Setup poste + ticket
    r = admin_client.post(f"{_V1}/reception/postes/open")
    assert r.status_code == 200
    poste_id = r.json()["id"]
    r = admin_client.post(f"{_V1}/reception/tickets", json={"poste_id": poste_id})
    assert r.status_code == 200
    ticket_id = r.json()["id"]

    # POST avec category_id invalide → 404
    invalid_category_id = "00000000-0000-0000-0000-000000000000"
    r = admin_client.post(
        f"{_V1}/reception/lignes",
        json={
            "ticket_id": ticket_id,
            "category_id": invalid_category_id,
            "poids_kg": "1.000",
            "destination": "DECHETERIE",
        },
    )
    assert r.status_code == 404

    # Créer une ligne valide d'abord
    r = admin_client.post(
        f"{_V1}/reception/lignes",
        json={
            "ticket_id": ticket_id,
            "category_id": str(category_id),
            "poids_kg": "1.000",
            "destination": "DECHETERIE",
        },
    )
    assert r.status_code == 200
    ligne_id = r.json()["id"]

    # PUT avec category_id invalide → 404
    r = admin_client.put(
        f"{_V1}/reception/lignes/{ligne_id}",
        json={"category_id": invalid_category_id},
    )
    assert r.status_code == 404


def test_update_notes_and_category_id_happy_path(admin_client, two_active_category_ids: tuple[str, str]):
    """Test update notes et category_id (chemin heureux)."""
    category1_id, category2_id = two_active_category_ids
    # Setup poste + ticket
    r = admin_client.post(f"{_V1}/reception/postes/open")
    assert r.status_code == 200
    poste_id = r.json()["id"]
    r = admin_client.post(f"{_V1}/reception/tickets", json={"poste_id": poste_id})
    assert r.status_code == 200
    ticket_id = r.json()["id"]

    # Créer une ligne
    r = admin_client.post(
        f"{_V1}/reception/lignes",
        json={
            "ticket_id": ticket_id,
            "category_id": category1_id,
            "poids_kg": "1.000",
            "destination": "DECHETERIE",
            "notes": "Note initiale",
        },
    )
    assert r.status_code == 200
    ligne_id = r.json()["id"]

    # Update notes et category_id
    r = admin_client.put(
        f"{_V1}/reception/lignes/{ligne_id}",
        json={
            "category_id": category2_id,
            "notes": "Note mise à jour",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["category_id"] == category2_id
    assert data["notes"] == "Note mise à jour"
    assert data["poids_kg"] == "1.000"  # Inchangé
    assert data["destination"] == "DECHETERIE"  # Inchangé


def test_invalid_destination_enum_values(admin_client, active_category_id: str):
    """Test validation des valeurs ENUM destination invalides."""
    category_id = active_category_id
    # Setup poste + ticket
    r = admin_client.post(f"{_V1}/reception/postes/open")
    assert r.status_code == 200
    poste_id = r.json()["id"]
    r = admin_client.post(f"{_V1}/reception/tickets", json={"poste_id": poste_id})
    assert r.status_code == 200
    ticket_id = r.json()["id"]

    # Test valeur ENUM invalide → 422
    r = admin_client.post(
        f"{_V1}/reception/lignes",
        json={
            "ticket_id": ticket_id,
            "category_id": str(category_id),
            "poids_kg": "1.000",
            "destination": "INVALID_DESTINATION",
        },
    )
    assert r.status_code == 422
    assert "destination" in str(r.json())


def test_patch_ligne_weight_admin_after_ticket_closed(admin_client, active_category_id: str):
    """Story 7.3 — PATCH poids autorisé pour ADMIN même si ticket fermé."""
    category_id = active_category_id
    r = admin_client.post(f"{_V1}/reception/postes/open")
    assert r.status_code == 200
    poste_id = r.json()["id"]
    r = admin_client.post(f"{_V1}/reception/tickets", json={"poste_id": poste_id})
    assert r.status_code == 200
    ticket_id = r.json()["id"]

    r = admin_client.post(
        f"{_V1}/reception/lignes",
        json={
            "ticket_id": ticket_id,
            "category_id": str(category_id),
            "poids_kg": "1.000",
            "destination": "MAGASIN",
        },
    )
    assert r.status_code == 200
    ligne_id = r.json()["id"]

    r = admin_client.post(f"{_V1}/reception/tickets/{ticket_id}/close")
    assert r.status_code == 200

    r = admin_client.patch(
        f"{_V1}/reception/tickets/{ticket_id}/lignes/{ligne_id}/weight",
        json={"poids_kg": "4.500"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["poids_kg"] == "4.500"
    assert data["id"] == ligne_id


def test_patch_ligne_weight_forbidden_for_plain_user(reception_user_client, active_category_id: str):
    """Story 7.3 — USER authentifié et éligible réception ne peut pas PATCH poids admin."""
    category_id = active_category_id
    r = reception_user_client.post(f"{_V1}/reception/postes/open")
    assert r.status_code == 200
    poste_id = r.json()["id"]
    r = reception_user_client.post(f"{_V1}/reception/tickets", json={"poste_id": poste_id})
    assert r.status_code == 200
    ticket_id = r.json()["id"]

    r = reception_user_client.post(
        f"{_V1}/reception/lignes",
        json={
            "ticket_id": ticket_id,
            "category_id": str(category_id),
            "poids_kg": "2.000",
            "destination": "RECYCLAGE",
        },
    )
    assert r.status_code == 200
    ligne_id = r.json()["id"]

    r = reception_user_client.patch(
        f"{_V1}/reception/tickets/{ticket_id}/lignes/{ligne_id}/weight",
        json={"poids_kg": "3.000"},
    )
    assert r.status_code == 403


