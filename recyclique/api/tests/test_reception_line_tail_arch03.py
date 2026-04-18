from __future__ import annotations

from uuid import uuid4

from recyclic_api.core.config import settings
from recyclic_api.models.category import Category

_V1 = settings.API_V1_STR.rstrip("/")


def _ensure_active_category(db_session):
    category = db_session.query(Category).filter(Category.is_active.is_(True)).first()
    if category is not None:
        return category

    category = Category(name=f"arch03-tail-category-{uuid4().hex[:8]}", is_active=True, is_visible=True)
    db_session.add(category)
    db_session.commit()
    db_session.refresh(category)
    return category


def _create_line(admin_client, db_session):
    category = _ensure_active_category(db_session)

    response = admin_client.post(f"{_V1}/reception/postes/open")
    assert response.status_code == 200
    poste_id = response.json()["id"]

    response = admin_client.post(f"{_V1}/reception/tickets", json={"poste_id": poste_id})
    assert response.status_code == 200
    ticket_id = response.json()["id"]

    response = admin_client.post(
        f"{_V1}/reception/lignes",
        json={
            "ticket_id": ticket_id,
            "category_id": str(category.id),
            "poids_kg": "1.250",
            "destination": "MAGASIN",
        },
    )
    assert response.status_code == 200
    return ticket_id, response.json()["id"]


def test_delete_ligne_returns_404_for_unknown_line(admin_client):
    response = admin_client.delete(f"{_V1}/reception/lignes/{uuid4()}")

    assert response.status_code == 404
    assert "Ligne introuvable" in response.json()["detail"]


def test_delete_ligne_returns_409_for_closed_ticket(admin_client, db_session):
    ticket_id, ligne_id = _create_line(admin_client, db_session)

    response = admin_client.post(f"{_V1}/reception/tickets/{ticket_id}/close")
    assert response.status_code == 200

    response = admin_client.delete(f"{_V1}/reception/lignes/{ligne_id}")
    assert response.status_code == 409
    assert "Ticket fermé" in response.json()["detail"]


def test_update_ligne_weight_returns_400_for_ticket_line_mismatch(admin_client, db_session):
    _ticket_id, ligne_id = _create_line(admin_client, db_session)

    response = admin_client.patch(
        f"{_V1}/reception/tickets/{uuid4()}/lignes/{ligne_id}/weight",
        json={"poids_kg": "2.000"},
    )

    assert response.status_code == 400
    assert "n'appartient pas" in response.json()["detail"]


def test_update_ligne_weight_keeps_closed_ticket_admin_behavior(admin_client, db_session):
    ticket_id, ligne_id = _create_line(admin_client, db_session)

    response = admin_client.post(f"{_V1}/reception/tickets/{ticket_id}/close")
    assert response.status_code == 200

    response = admin_client.patch(
        f"{_V1}/reception/tickets/{ticket_id}/lignes/{ligne_id}/weight",
        json={"poids_kg": "7.250"},
    )

    assert response.status_code == 200
    assert response.json()["poids_kg"] == "7.250"
