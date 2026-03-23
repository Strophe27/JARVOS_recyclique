# Tests API réception — tickets (Story 6.1).
# Review : scénarios métier avec client authentifié ; POST tickets/{id}/close (401 + auth).

import pytest


def test_list_tickets_sans_auth():
    """GET /v1/reception/tickets sans token — 401."""
    from fastapi.testclient import TestClient
    from api.main import app
    c = TestClient(app)
    r = c.get("/v1/reception/tickets")
    assert r.status_code == 401


def test_create_ticket_sans_auth():
    """POST /v1/reception/tickets sans token — 401."""
    from fastapi.testclient import TestClient
    from api.main import app
    c = TestClient(app)
    r = c.post("/v1/reception/tickets", json={})
    assert r.status_code == 401


def test_close_ticket_sans_auth():
    """POST /v1/reception/tickets/{id}/close sans token — 401."""
    from fastapi.testclient import TestClient
    from api.main import app
    c = TestClient(app)
    r = c.post("/v1/reception/tickets/00000000-0000-0000-0000-000000000001/close")
    assert r.status_code == 401


def test_create_ticket_authenticated(client):
    """POST /v1/reception/tickets avec auth (poste ouvert) — 201 et ticket créé."""
    client.post("/v1/reception/postes/open", json={})
    r = client.post("/v1/reception/tickets", json={})
    assert r.status_code == 201
    data = r.json()
    assert "id" in data
    assert data["status"] == "opened"
    assert "poste_id" in data


def test_list_tickets_with_pagination_and_filters(client):
    """GET /v1/reception/tickets avec pagination et filtre poste_id."""
    open_r = client.post("/v1/reception/postes/open", json={})
    assert open_r.status_code == 201
    poste_id = open_r.json()["id"]
    client.post("/v1/reception/tickets", json={})
    client.post("/v1/reception/tickets", json={})

    r = client.get(f"/v1/reception/tickets?poste_id={poste_id}&page=1&page_size=10")
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert "total" in data
    assert data["page"] == 1
    assert data["page_size"] == 10
    assert len(data["items"]) == 2
    assert data["total"] == 2
    for item in data["items"]:
        assert item["poste_id"] == poste_id


def test_list_tickets_filter_by_status(client):
    """GET /v1/reception/tickets avec filtre status."""
    client.post("/v1/reception/postes/open", json={})
    client.post("/v1/reception/tickets", json={})

    r = client.get("/v1/reception/tickets?status=opened")
    assert r.status_code == 200
    data = r.json()
    assert all(item["status"] == "opened" for item in data["items"])


def test_get_ticket_detail_authenticated(client):
    """GET /v1/reception/tickets/{id} avec auth — 200 et détail."""
    client.post("/v1/reception/postes/open", json={})
    create_r = client.post("/v1/reception/tickets", json={})
    assert create_r.status_code == 201
    ticket_id = create_r.json()["id"]

    r = client.get(f"/v1/reception/tickets/{ticket_id}")
    assert r.status_code == 200
    assert r.json()["id"] == ticket_id
    assert r.json()["status"] == "opened"


def test_list_tickets_contains_benevole_user_name(client):
    """GET /v1/reception/tickets — la reponse contient benevole_user_name resolu (Story 19.4)."""
    client.post("/v1/reception/postes/open", json={})
    client.post("/v1/reception/tickets", json={})

    r = client.get("/v1/reception/tickets")
    assert r.status_code == 200
    data = r.json()
    assert len(data["items"]) >= 1
    item = data["items"][0]
    assert "benevole_user_name" in item
    assert item["benevole_user_name"] is not None
    assert isinstance(item["benevole_user_name"], str)
    assert len(item["benevole_user_name"]) > 0


def test_get_ticket_contains_benevole_user_name(client):
    """GET /v1/reception/tickets/{id} — la reponse contient benevole_user_name resolu (Story 19.4)."""
    client.post("/v1/reception/postes/open", json={})
    create_r = client.post("/v1/reception/tickets", json={})
    assert create_r.status_code == 201
    ticket_id = create_r.json()["id"]

    r = client.get(f"/v1/reception/tickets/{ticket_id}")
    assert r.status_code == 200
    data = r.json()
    assert "benevole_user_name" in data
    assert data["benevole_user_name"] is not None
    assert isinstance(data["benevole_user_name"], str)
    assert len(data["benevole_user_name"]) > 0


def test_close_ticket_authenticated(client):
    """POST /v1/reception/tickets/{id}/close avec auth — 200 et status closed."""
    client.post("/v1/reception/postes/open", json={})
    create_r = client.post("/v1/reception/tickets", json={})
    assert create_r.status_code == 201
    ticket_id = create_r.json()["id"]

    r = client.post(f"/v1/reception/tickets/{ticket_id}/close")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "closed"
    assert data["closed_at"] is not None

    get_r = client.get(f"/v1/reception/tickets/{ticket_id}")
    assert get_r.status_code == 200
    assert get_r.json()["status"] == "closed"
