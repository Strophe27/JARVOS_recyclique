"""
ARCH-04 — réception : export CSV lignes de dépôt (présentation hors routeur).
"""

from __future__ import annotations

import pytest

from datetime import date, datetime, timezone
from decimal import Decimal
from enum import Enum
from types import SimpleNamespace
from uuid import uuid4

from recyclic_api.application.reception_lignes_export_presentation import (
    build_lignes_depot_export_filename,
    render_lignes_depot_export_csv,
)

pytestmark = pytest.mark.no_db


class _Dest(Enum):
    ENTREE = "entree"


def test_build_lignes_depot_export_filename_filters():
    fixed = datetime(2026, 3, 24, 15, 7, 0, tzinfo=timezone.utc)
    assert (
        build_lignes_depot_export_filename(utc_now=fixed)
        == "rapport_reception_20260324_1507.csv"
    )
    assert (
        build_lignes_depot_export_filename(
            utc_now=fixed,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31),
            category_filename_token="dechet-sec",
        )
        == "rapport_reception_20260324_1507_depuis_2024-01-01_jusqu_2024-01-31_categorie_dechet-sec.csv"
    )


def test_build_lignes_depot_export_filename_category_only():
    fixed = datetime(2025, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    cid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    assert (
        build_lignes_depot_export_filename(utc_now=fixed, category_filename_token=cid)
        == f"rapport_reception_20250101_0000_categorie_{cid}.csv"
    )


def test_render_lignes_depot_export_csv_contract():
    lid = uuid4()
    tid = uuid4()
    pid = uuid4()
    created = datetime(2024, 6, 1, 12, 0, 0)
    benevole = SimpleNamespace(username="volontaire@test.com")
    ticket = SimpleNamespace(poste_id=pid, benevole=benevole, created_at=created)
    cat = SimpleNamespace(name="Papier")
    ligne = SimpleNamespace(
        id=lid,
        ticket_id=tid,
        ticket=ticket,
        category=cat,
        poids_kg=Decimal("1.5"),
        destination=_Dest.ENTREE,
        notes="note suite",
    )
    text = render_lignes_depot_export_csv([ligne])
    lines = text.strip().splitlines()
    assert lines[0].split(",") == [
        "ID Ligne",
        "ID Ticket",
        "ID Poste",
        "Bénévole",
        "Catégorie",
        "Poids (kg)",
        "Destination",
        "Notes",
        "Date de création",
    ]
    assert str(lid) in lines[1]
    assert "volontaire@test.com" in lines[1]
    assert "Papier" in lines[1]
    assert "1.5" in lines[1]
    assert "entree" in lines[1]
    assert "note" in lines[1]
    assert "2024-06-01 12:00:00" in lines[1]


def test_render_lignes_depot_export_csv_unknown_category_and_destination():
    ticket = SimpleNamespace(
        poste_id=uuid4(),
        benevole=SimpleNamespace(username=None),
        created_at=datetime(2024, 1, 1, 0, 0, 0),
    )
    ligne = SimpleNamespace(
        id=uuid4(),
        ticket_id=uuid4(),
        ticket=ticket,
        category=None,
        poids_kg=Decimal("0"),
        destination=None,
        notes=None,
    )
    text = render_lignes_depot_export_csv([ligne])
    assert "Catégorie inconnue" in text
    assert "Utilisateur inconnu" in text
