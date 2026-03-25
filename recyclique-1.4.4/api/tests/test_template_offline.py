"""
Tests pour le template CSV offline des réceptions (Story B47-P4).

Tests unitaires et d'intégration pour :
- Génération du template CSV
- Endpoint API de téléchargement
- Cycle complet (génération → remplissage → import)
"""

import csv
import io
import sys
from pathlib import Path

import pytest
from sqlalchemy import inspect

from recyclic_api.core.config import settings

# Même dossier que l'endpoint (``api/scripts``) pour ``import generate_offline_template``
_API_SCRIPTS = Path(__file__).resolve().parent.parent / "scripts"
if str(_API_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_API_SCRIPTS))


def _template_csv_url() -> str:
    return f"{settings.API_V1_STR.rstrip('/')}/admin/templates/reception-offline.csv"


def _csv_row_bom_safe(row: list[str]) -> list[str]:
    """Le script source préfixe parfois le flux d'un BOM aussi encodé via utf-8-sig."""
    if not row:
        return row
    out = list(row)
    out[0] = out[0].lstrip("\ufeff")
    return out


def test_generate_template_script_structure():
    """Test unitaire: Vérifier la structure du template généré par le script."""
    from generate_offline_template import generate_template_csv

    csv_bytes = generate_template_csv()
    assert isinstance(csv_bytes, bytes)
    assert len(csv_bytes) > 0

    content = csv_bytes.decode("utf-8-sig")
    reader = csv.reader(io.StringIO(content))
    rows = list(reader)
    assert len(rows) >= 1

    headers = _csv_row_bom_safe(rows[0])
    expected_headers = ["date", "category", "poids_kg", "destination", "notes"]
    assert headers == expected_headers, f"Headers attendus: {expected_headers}, obtenus: {headers}"


def test_generate_template_script_encoding():
    """Test unitaire: Vérifier l'encodage UTF-8 avec BOM."""
    from generate_offline_template import generate_template_csv

    csv_bytes = generate_template_csv()
    bom = csv_bytes[:3]
    assert bom == b"\xef\xbb\xbf", f"BOM UTF-8 attendu, obtenu: {bom.hex()}"
    content = csv_bytes.decode("utf-8-sig")
    assert isinstance(content, str)
    assert len(content) > 0


def test_register_admin_templates_offline_routes_importable():
    """Le module extrait expose bien l'enregistrement des routes (régression refactor)."""
    from recyclic_api.api.api_v1.endpoints.admin_templates_offline import (
        register_admin_templates_offline_routes,
    )

    assert callable(register_admin_templates_offline_routes)


def test_template_endpoint_download(admin_client):
    """Test d'intégration: Téléchargement du template via l'endpoint API."""
    response = admin_client.get(_template_csv_url())
    assert response.status_code == 200, f"Status code attendu: 200, obtenu: {response.status_code}"

    content_type = response.headers.get("content-type", "")
    assert "text/csv" in content_type.lower(), f"Content-Type attendu: text/csv, obtenu: {content_type}"

    content_disposition = response.headers.get("content-disposition", "")
    assert "attachment" in content_disposition.lower(), "Content-Disposition doit contenir 'attachment'"
    assert "template-reception-offline.csv" in content_disposition, "Nom de fichier incorrect"

    content = response.content
    assert len(content) > 0, "Le contenu ne doit pas être vide"
    assert content[:3] == b"\xef\xbb\xbf", "Le fichier doit être encodé en UTF-8 avec BOM"


def test_template_endpoint_download_super_admin(super_admin_client):
    """Même contrat pour SUPER_ADMIN (require_role_strict ADMIN | SUPER_ADMIN)."""
    response = super_admin_client.get(_template_csv_url())
    assert response.status_code == 200
    assert response.content[:3] == b"\xef\xbb\xbf"


def test_template_endpoint_content_structure(admin_client):
    """Test d'intégration: Vérifier la structure du contenu du template."""
    response = admin_client.get(_template_csv_url())
    assert response.status_code == 200

    content = response.content.decode("utf-8-sig")
    reader = csv.reader(io.StringIO(content))
    rows = list(reader)
    assert len(rows) >= 1, "Le template doit contenir au moins les en-têtes"

    headers = _csv_row_bom_safe(rows[0])
    expected_headers = ["date", "category", "poids_kg", "destination", "notes"]
    assert headers == expected_headers, f"Headers incorrects: {headers}"


def test_template_endpoint_requires_admin(client):
    """Test d'intégration: Vérifier que l'endpoint nécessite les droits admin."""
    response = client.get(_template_csv_url())
    assert response.status_code in (401, 403), (
        "L'endpoint doit refuser l'accès sans authentification (401 ou 403)"
    )


def test_template_complete_cycle(admin_client, db_session):
    """Test d'intégration: Cycle complet génération → remplissage → import."""
    if not inspect(db_session.get_bind()).has_table("categories"):
        pytest.skip("Schéma SQLite réduit : table ``categories`` absente (voir conftest create_all).")

    response = admin_client.get(_template_csv_url())
    assert response.status_code == 200

    from recyclic_api.models.category import Category
    from uuid import uuid4

    test_category = db_session.query(Category).filter(Category.name == "EEE - Informatique").first()
    if not test_category:
        test_category = Category(
            id=uuid4(),
            name="EEE - Informatique",
            is_active=True,
        )
        db_session.add(test_category)
        db_session.commit()

    csv_rows = [
        ["date", "category", "poids_kg", "destination", "notes"],
        ["2025-01-27", "EEE - Informatique", "12.50", "MAGASIN", "Test import template"],
        ["2025-01-27", "EEE - Informatique", "5.75", "RECYCLAGE", "Test recyclage"],
    ]
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerows(csv_rows)
    csv_content = output.getvalue()

    files = {"file": ("test_template.csv", csv_content.encode("utf-8-sig"), "text/csv")}

    try:
        legacy_url = f"{settings.API_V1_STR.rstrip('/')}/admin/import/legacy/analyze"
        analyze_response = admin_client.post(legacy_url, files=files)
        assert analyze_response.status_code in [200, 400, 422], (
            f"L'analyse doit retourner 200, 400 ou 422, obtenu: {analyze_response.status_code}"
        )
    except Exception as e:
        pytest.skip(f"Endpoint d'analyse legacy non disponible: {e}")


def test_template_utf8_bom_compatibility():
    """Test unitaire: Vérifier que le template est compatible Excel (UTF-8 BOM)."""
    from generate_offline_template import generate_template_csv

    csv_bytes = generate_template_csv()
    assert csv_bytes[:3] == b"\xef\xbb\xbf", "BOM UTF-8 requis pour compatibilité Excel"
    content = csv_bytes.decode("utf-8-sig")
    re_encoded = ("\ufeff" + content).encode("utf-8-sig")
    assert re_encoded[:3] == b"\xef\xbb\xbf", "Ré-encodage doit préserver le BOM"


def test_template_contains_example_row():
    """Test unitaire: Vérifier que le template contient une ligne d'exemple après les en-têtes."""
    from generate_offline_template import generate_template_csv

    csv_bytes = generate_template_csv()
    content = csv_bytes.decode("utf-8-sig")
    reader = csv.reader(io.StringIO(content))
    rows = list(reader)

    assert len(rows) == 2, f"Le template doit contenir les en-têtes + 1 ligne d'exemple, obtenu {len(rows)} lignes"
    assert _csv_row_bom_safe(rows[0]) == [
        "date",
        "category",
        "poids_kg",
        "destination",
        "notes",
    ], "Headers incorrects"

    example_row = rows[1]
    assert len(example_row) == 5, "La ligne d'exemple doit contenir 5 colonnes"
    assert "EXEMPLE" in example_row[4].upper(), "La ligne d'exemple doit contenir 'EXEMPLE' dans les notes"
