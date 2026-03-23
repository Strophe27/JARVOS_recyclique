"""Tests API CRUD + hierarchy, sale-tickets, entry-tickets, visibility, display-order, soft delete — Story 2.3. Routes protégées RBAC (Story 3.2) : caisse.access | reception.access | admin."""

import pytest
from fastapi.testclient import TestClient


def _create_category(
    client: TestClient,
    auth_headers: dict,
    name: str = "Cat Test",
    parent_id: str | None = None,
    official_name: str | None = None,
    is_visible_sale: bool = True,
    is_visible_reception: bool = True,
    display_order: int = 0,
    display_order_entry: int = 0,
) -> str:
    body = {
        "name": name,
        "is_visible_sale": is_visible_sale,
        "is_visible_reception": is_visible_reception,
        "display_order": display_order,
        "display_order_entry": display_order_entry,
    }
    if parent_id is not None:
        body["parent_id"] = parent_id
    if official_name is not None:
        body["official_name"] = official_name
    resp = client.post("/v1/categories", json=body, headers=auth_headers)
    assert resp.status_code == 201
    return resp.json()["id"]


def test_list_categories_empty(client: TestClient, auth_headers: dict):
    """GET /v1/categories retourne 200 et liste vide quand aucune categorie."""
    resp = client.get("/v1/categories", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_categories_returns_created(client: TestClient, auth_headers: dict):
    """GET /v1/categories retourne les categories creees (sans supprimees)."""
    _create_category(client, auth_headers, name="Cat A")
    _create_category(client, auth_headers, name="Cat B")
    resp = client.get("/v1/categories", headers=auth_headers)
    assert resp.status_code == 200
    names = [c["name"] for c in resp.json()]
    assert "Cat A" in names
    assert "Cat B" in names


def test_list_categories_filter_parent_id(client: TestClient, auth_headers: dict):
    """GET /v1/categories?parent_id=... filtre par parent."""
    root_id = _create_category(client, auth_headers, name="Root")
    _create_category(client, auth_headers, name="Child", parent_id=root_id)
    resp = client.get("/v1/categories", params={"parent_id": root_id}, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["name"] == "Child"
    assert data[0]["parent_id"] == root_id


def test_get_categories_hierarchy_empty(client: TestClient, auth_headers: dict):
    """GET /v1/categories/hierarchy retourne 200 et liste vide quand aucune racine."""
    resp = client.get("/v1/categories/hierarchy", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


def test_get_categories_hierarchy_with_children(client: TestClient, auth_headers: dict):
    """GET /v1/categories/hierarchy retourne arborescence racines + children."""
    root_id = _create_category(client, auth_headers, name="Root", display_order=1)
    _create_category(client, auth_headers, name="Child", parent_id=root_id)
    resp = client.get("/v1/categories/hierarchy", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["name"] == "Root"
    assert len(data[0]["children"]) == 1
    assert data[0]["children"][0]["name"] == "Child"


def test_get_categories_sale_tickets_filtered(client: TestClient, auth_headers: dict):
    """GET /v1/categories/sale-tickets retourne seulement is_visible_sale=true et non supprimees."""
    _create_category(client, auth_headers, name="Visible", is_visible_sale=True)
    _create_category(client, auth_headers, name="Hidden", is_visible_sale=False)
    resp = client.get("/v1/categories/sale-tickets", headers=auth_headers)
    assert resp.status_code == 200
    names = [c["name"] for c in resp.json()]
    assert "Visible" in names
    assert "Hidden" not in names


def test_get_categories_entry_tickets_filtered(client: TestClient, auth_headers: dict):
    """GET /v1/categories/entry-tickets retourne seulement is_visible_reception=true et non supprimees."""
    _create_category(client, auth_headers, name="Visible", is_visible_reception=True)
    _create_category(client, auth_headers, name="Hidden", is_visible_reception=False)
    resp = client.get("/v1/categories/entry-tickets", headers=auth_headers)
    assert resp.status_code == 200
    names = [c["name"] for c in resp.json()]
    assert "Visible" in names
    assert "Hidden" not in names


def test_get_category_not_found(client: TestClient, auth_headers: dict):
    """GET /v1/categories/{id} inexistant retourne 404 et detail."""
    resp = client.get("/v1/categories/00000000-0000-0000-0000-000000000000", headers=auth_headers)
    assert resp.status_code == 404
    assert "detail" in resp.json()
    assert resp.json()["detail"] == "Category not found"


def test_get_category_after_create(client: TestClient, auth_headers: dict):
    """GET /v1/categories/{id} retourne la categorie creee."""
    cat_id = _create_category(client, auth_headers, name="Detail Cat", official_name="Official")
    resp = client.get(f"/v1/categories/{cat_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Detail Cat"
    assert resp.json()["official_name"] == "Official"
    assert resp.json()["deleted_at"] is None


def test_create_category_201(client: TestClient, auth_headers: dict):
    """POST /v1/categories cree une categorie et retourne 201 avec corps snake_case."""
    resp = client.post(
        "/v1/categories",
        json={
            "name": "New Cat",
            "official_name": "Official New",
            "is_visible_sale": True,
            "is_visible_reception": False,
            "display_order": 10,
            "display_order_entry": 20,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "id" in data
    assert data["name"] == "New Cat"
    assert data["official_name"] == "Official New"
    assert data["is_visible_sale"] is True
    assert data["is_visible_reception"] is False
    assert data["display_order"] == 10
    assert data["display_order_entry"] == 20
    assert "created_at" in data
    assert "updated_at" in data
    assert "T" in data["created_at"]


def test_create_category_parent_not_found_404(client: TestClient, auth_headers: dict):
    """POST /v1/categories avec parent_id inexistant retourne 404."""
    resp = client.post(
        "/v1/categories",
        json={
            "name": "Child",
            "parent_id": "00000000-0000-0000-0000-000000000000",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Parent category not found"


def test_put_category(client: TestClient, auth_headers: dict):
    """PUT /v1/categories/{id} met a jour."""
    cat_id = _create_category(client, auth_headers, name="Original")
    resp = client.put(
        f"/v1/categories/{cat_id}",
        json={
            "name": "Updated",
            "official_name": "Off",
            "is_visible_sale": False,
            "display_order": 5,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated"
    assert resp.json()["official_name"] == "Off"
    assert resp.json()["is_visible_sale"] is False
    assert resp.json()["display_order"] == 5


def test_put_category_not_found(client: TestClient, auth_headers: dict):
    """PUT /v1/categories/{id} inexistant retourne 404."""
    resp = client.put(
        "/v1/categories/00000000-0000-0000-0000-000000000000",
        json={"name": "X"},
        headers=auth_headers,
    )
    assert resp.status_code == 404


def test_put_category_parent_self_rejected(client: TestClient, auth_headers: dict):
    """PUT /v1/categories/{id} avec parent_id=self retourne 400."""
    cat_id = _create_category(client, auth_headers, name="Self")
    resp = client.put(
        f"/v1/categories/{cat_id}",
        json={"parent_id": cat_id},
        headers=auth_headers,
    )
    assert resp.status_code == 400
    assert "detail" in resp.json()
    assert "self" in resp.json()["detail"].lower() or "cycle" in resp.json()["detail"].lower()


def test_put_category_parent_cycle_rejected(client: TestClient, auth_headers: dict):
    """PUT /v1/categories/{id} avec parent_id=descendant (cycle) retourne 400."""
    root_id = _create_category(client, auth_headers, name="Root")
    child_id = _create_category(client, auth_headers, name="Child", parent_id=root_id)
    resp = client.put(
        f"/v1/categories/{root_id}",
        json={"parent_id": child_id},
        headers=auth_headers,
    )
    assert resp.status_code == 400
    assert "detail" in resp.json()
    assert "cycle" in resp.json()["detail"].lower()


def test_delete_category_soft_204(client: TestClient, auth_headers: dict):
    """DELETE /v1/categories/{id} soft delete (204), categorie absente de liste."""
    cat_id = _create_category(client, auth_headers, name="To delete")
    resp = client.delete(f"/v1/categories/{cat_id}", headers=auth_headers)
    assert resp.status_code == 204
    list_resp = client.get("/v1/categories", headers=auth_headers)
    names = [c["name"] for c in list_resp.json()]
    assert "To delete" not in names
    get_resp = client.get(f"/v1/categories/{cat_id}", headers=auth_headers)
    assert get_resp.status_code == 404


def test_delete_category_not_found(client: TestClient, auth_headers: dict):
    """DELETE /v1/categories/{id} inexistant retourne 404."""
    resp = client.delete("/v1/categories/00000000-0000-0000-0000-000000000000", headers=auth_headers)
    assert resp.status_code == 404


def test_restore_category(client: TestClient, auth_headers: dict):
    """POST /v1/categories/{id}/restore remet deleted_at a null."""
    cat_id = _create_category(client, auth_headers, name="To restore")
    client.delete(f"/v1/categories/{cat_id}", headers=auth_headers)
    resp = client.post(f"/v1/categories/{cat_id}/restore", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["deleted_at"] is None
    assert resp.json()["name"] == "To restore"
    list_resp = client.get("/v1/categories", headers=auth_headers)
    names = [c["name"] for c in list_resp.json()]
    assert "To restore" in names


def test_restore_category_not_found(client: TestClient, auth_headers: dict):
    """POST /v1/categories/{id}/restore avec id inexistant retourne 404."""
    resp = client.post("/v1/categories/00000000-0000-0000-0000-000000000000/restore", headers=auth_headers)
    assert resp.status_code == 404


def test_put_visibility(client: TestClient, auth_headers: dict):
    """PUT /v1/categories/{id}/visibility met a jour is_visible_sale et/ou is_visible_reception."""
    cat_id = _create_category(client, auth_headers, name="V", is_visible_sale=True, is_visible_reception=True)
    resp = client.put(
        f"/v1/categories/{cat_id}/visibility",
        json={"is_visible_sale": False, "is_visible_reception": False},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["is_visible_sale"] is False
    assert resp.json()["is_visible_reception"] is False


def test_put_visibility_not_found(client: TestClient, auth_headers: dict):
    """PUT /v1/categories/{id}/visibility avec id inexistant retourne 404."""
    resp = client.put(
        "/v1/categories/00000000-0000-0000-0000-000000000000/visibility",
        json={"is_visible_sale": False},
        headers=auth_headers,
    )
    assert resp.status_code == 404


def test_put_display_order(client: TestClient, auth_headers: dict):
    """PUT /v1/categories/{id}/display-order met a jour display_order et/ou display_order_entry."""
    cat_id = _create_category(client, auth_headers, name="Ord", display_order=0, display_order_entry=0)
    resp = client.put(
        f"/v1/categories/{cat_id}/display-order",
        json={"display_order": 100, "display_order_entry": 200},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["display_order"] == 100
    assert resp.json()["display_order_entry"] == 200


def test_put_display_order_not_found(client: TestClient, auth_headers: dict):
    """PUT /v1/categories/{id}/display-order avec id inexistant retourne 404."""
    resp = client.put(
        "/v1/categories/00000000-0000-0000-0000-000000000000/display-order",
        json={"display_order": 1},
        headers=auth_headers,
    )
    assert resp.status_code == 404


def test_error_format_has_detail(client: TestClient, auth_headers: dict):
    """Erreurs au format { \"detail\": \"...\" }."""
    resp = client.get("/v1/categories/00000000-0000-0000-0000-000000000000", headers=auth_headers)
    assert resp.status_code == 404
    data = resp.json()
    assert "detail" in data
    assert isinstance(data["detail"], str)


# ——— Tests import CSV (Story 19.1) ———

def _csv_bytes(rows: list[list[str]]) -> bytes:
    """Construit un CSV UTF-8 à partir d'une liste de lignes (list[str])."""
    import csv, io
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["name", "parent_id", "official_name", "is_visible_sale", "is_visible_reception", "display_order", "display_order_entry"])
    for row in rows:
        w.writerow(row)
    return buf.getvalue().encode("utf-8")


def _analyze(client: TestClient, auth_headers: dict, csv_bytes: bytes) -> list[dict]:
    """POST /import/analyze et retourne les rows."""
    resp = client.post(
        "/v1/categories/import/analyze",
        headers=auth_headers,
        files={"file": ("categories.csv", csv_bytes, "text/csv")},
    )
    assert resp.status_code == 200, resp.json()
    return resp.json()["rows"]


def test_import_execute_racines_et_sous_categories(client: TestClient, auth_headers: dict):
    """T5.1 — Import 3 racines + 5 sous-catégories (parent_ref non-UUID) → 8 créées, 0 erreur."""
    csv_data = _csv_bytes([
        ["Electronique", "", "", "true", "true", "1", "1"],
        ["Vetements", "", "", "true", "true", "2", "2"],
        ["Mobilier", "", "", "true", "true", "3", "3"],
        ["Telephone", "Electronique", "", "true", "true", "1", "1"],
        ["Ordinateur", "Electronique", "", "true", "true", "2", "2"],
        ["T-shirt", "Vetements", "", "true", "true", "1", "1"],
        ["Pantalon", "Vetements", "", "true", "true", "2", "2"],
        ["Chaise", "Mobilier", "", "true", "true", "1", "1"],
    ])
    rows = _analyze(client, auth_headers, csv_data)
    assert len(rows) == 8
    assert all(r["valid"] for r in rows), f"Lignes invalides : {[r for r in rows if not r['valid']]}"

    resp = client.post(
        "/v1/categories/import/execute",
        json={"rows": rows},
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.json()
    data = resp.json()
    assert data["created"] == 8
    assert data["errors"] == []

    # Vérification BDD : catégories et sous-catégories présentes
    list_resp = client.get("/v1/categories", headers=auth_headers)
    names = [c["name"] for c in list_resp.json()]
    for expected in ["Electronique", "Vetements", "Mobilier", "Telephone", "Ordinateur", "T-shirt", "Pantalon", "Chaise"]:
        assert expected in names, f"Catégorie manquante : {expected}"


def test_import_execute_non_regression_racines_seules(client: TestClient, auth_headers: dict):
    """T5.2 — Import CSV sans sous-catégories : comportement inchangé."""
    csv_data = _csv_bytes([
        ["CatA", "", "Officiel A", "true", "true", "1", "0"],
        ["CatB", "", "", "false", "true", "2", "0"],
        ["CatC", "", "", "true", "false", "3", "0"],
    ])
    rows = _analyze(client, auth_headers, csv_data)
    assert len(rows) == 3
    assert all(r["valid"] for r in rows)

    resp = client.post(
        "/v1/categories/import/execute",
        json={"rows": rows},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["created"] == 3
    assert data["errors"] == []

    list_resp = client.get("/v1/categories", headers=auth_headers)
    names = [c["name"] for c in list_resp.json()]
    assert "CatA" in names
    assert "CatB" in names
    assert "CatC" in names


def test_import_execute_parent_orphelin_dans_errors(client: TestClient, auth_headers: dict):
    """T5.3 — Sous-catégorie avec parent introuvable → dans errors, autres lignes importées."""
    csv_data = _csv_bytes([
        ["RacineOK", "", "", "true", "true", "1", "0"],
        ["EnfantOK", "RacineOK", "", "true", "true", "1", "0"],
        ["EnfantOrphelin", "ParentInexistant", "", "true", "true", "2", "0"],
    ])
    rows = _analyze(client, auth_headers, csv_data)
    assert len(rows) == 3
    # Toutes les lignes sont valides après analyze (le parent n'est pas vérifié à l'analyze)
    assert all(r["valid"] for r in rows)

    resp = client.post(
        "/v1/categories/import/execute",
        json={"rows": rows},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    # RacineOK + EnfantOK insérés ; EnfantOrphelin en erreur
    assert data["created"] == 2
    assert len(data["errors"]) == 1
    assert "ParentInexistant" in data["errors"][0] or "introuvable" in data["errors"][0]

    list_resp = client.get("/v1/categories", headers=auth_headers)
    names = [c["name"] for c in list_resp.json()]
    assert "RacineOK" in names
    assert "EnfantOK" in names
    assert "EnfantOrphelin" not in names
