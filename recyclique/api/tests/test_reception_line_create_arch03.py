from __future__ import annotations

from uuid import uuid4

from recyclic_api.core.config import settings
from recyclic_api.models.category import Category

_V1 = settings.API_V1_STR.rstrip("/")


def _create_open_ticket(admin_client):
    response = admin_client.post(f"{_V1}/reception/postes/open")
    assert response.status_code == 200
    poste_id = response.json()["id"]

    response = admin_client.post(f"{_V1}/reception/tickets", json={"poste_id": poste_id})
    assert response.status_code == 200
    return poste_id, response.json()["id"]


def _ensure_active_category(db_session):
    category = db_session.query(Category).filter(Category.is_active.is_(True)).first()
    if category is not None:
        return category

    category = Category(name=f"arch03-category-{uuid4().hex[:8]}", is_active=True, is_visible=True)
    db_session.add(category)
    db_session.commit()
    db_session.refresh(category)
    return category


def test_create_ligne_returns_404_for_unknown_ticket(admin_client, db_session):
    category = _ensure_active_category(db_session)

    response = admin_client.post(
        f"{_V1}/reception/lignes",
        json={
            "ticket_id": str(uuid4()),
            "category_id": str(category.id),
            "poids_kg": "1.250",
            "destination": "MAGASIN",
        },
    )

    assert response.status_code == 404
    assert "Ticket introuvable" in response.json()["detail"]


def test_create_ligne_returns_409_for_closed_ticket(admin_client, db_session):
    category = _ensure_active_category(db_session)
    _poste_id, ticket_id = _create_open_ticket(admin_client)

    response = admin_client.post(f"{_V1}/reception/tickets/{ticket_id}/close")
    assert response.status_code == 200

    response = admin_client.post(
        f"{_V1}/reception/lignes",
        json={
            "ticket_id": ticket_id,
            "category_id": str(category.id),
            "poids_kg": "1.250",
            "destination": "MAGASIN",
        },
    )

    assert response.status_code == 409
    assert "Ticket fermé" in response.json()["detail"]


def test_create_ligne_returns_404_for_unknown_category(admin_client, db_session):
    _ensure_active_category(db_session)
    _poste_id, ticket_id = _create_open_ticket(admin_client)

    response = admin_client.post(
        f"{_V1}/reception/lignes",
        json={
            "ticket_id": ticket_id,
            "category_id": str(uuid4()),
            "poids_kg": "1.250",
            "destination": "MAGASIN",
        },
    )

    assert response.status_code == 404
    assert "Catégorie introuvable" in response.json()["detail"]


def test_create_ligne_returns_422_for_invalid_exit_destination(admin_client, db_session):
    category = _ensure_active_category(db_session)
    _poste_id, ticket_id = _create_open_ticket(admin_client)

    response = admin_client.post(
        f"{_V1}/reception/lignes",
        json={
            "ticket_id": ticket_id,
            "category_id": str(category.id),
            "poids_kg": "1.250",
            "destination": "MAGASIN",
            "is_exit": True,
        },
    )

    assert response.status_code == 422
    assert "sortie de stock" in response.json()["detail"].lower()
