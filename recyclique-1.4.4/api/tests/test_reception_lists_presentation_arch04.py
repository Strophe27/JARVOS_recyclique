"""
ARCH-04 — réception : listes JSON tickets / lignes dépôt (présentation hors routeur).
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

from recyclic_api.application.reception_lists_presentation import (
    build_ligne_depot_list_response,
    build_ticket_list_response,
    map_ligne_depot_to_report_response,
    map_ticket_to_summary_response,
    paginated_total_pages,
)
from recyclic_api.models.ligne_depot import Destination


def test_paginated_total_pages_matches_router_formula():
    assert paginated_total_pages(0, 10) == 0
    assert paginated_total_pages(1, 10) == 1
    assert paginated_total_pages(10, 10) == 1
    assert paginated_total_pages(11, 10) == 2
    assert paginated_total_pages(100, 50) == 2


def test_map_ticket_to_summary_response_fallback_benevole_and_totals():
    tid = uuid4()
    poste_id = uuid4()
    benevole = SimpleNamespace(username=None)
    ticket = SimpleNamespace(
        id=tid,
        poste_id=poste_id,
        benevole=benevole,
        created_at=datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
        closed_at=None,
        status="opened",
        lignes=[],
    )
    service = MagicMock()
    service._calculate_ticket_totals.return_value = (
        0,
        Decimal("0"),
        Decimal("0"),
        Decimal("0"),
        Decimal("0"),
    )

    row = map_ticket_to_summary_response(service, ticket)
    assert row.benevole_username == "Utilisateur inconnu"
    assert row.id == str(tid)
    assert row.total_lignes == 0
    service._calculate_ticket_totals.assert_called_once_with(ticket)


def test_build_ticket_list_response_pagination_fields():
    tid = uuid4()
    ticket = SimpleNamespace(
        id=tid,
        poste_id=uuid4(),
        benevole=SimpleNamespace(username="u1"),
        created_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
        closed_at=None,
        status="closed",
        lignes=[],
    )
    service = MagicMock()
    service._calculate_ticket_totals.return_value = (
        1,
        Decimal("2.5"),
        Decimal("1"),
        Decimal("0.5"),
        Decimal("1"),
    )

    body = build_ticket_list_response(service, [ticket], total=25, page=2, per_page=10)
    assert len(body.tickets) == 1
    assert body.total == 25
    assert body.page == 2
    assert body.per_page == 10
    assert body.total_pages == 3
    assert body.tickets[0].total_poids == Decimal("2.5")


def test_map_ligne_depot_fallback_category_label():
    lid = uuid4()
    tid = uuid4()
    pid = uuid4()
    ticket = SimpleNamespace(
        poste_id=pid,
        benevole=SimpleNamespace(username="bob"),
        created_at=datetime(2025, 3, 1, 10, 0, 0, tzinfo=timezone.utc),
    )
    ligne = SimpleNamespace(
        id=lid,
        ticket_id=tid,
        ticket=ticket,
        category=None,
        poids_kg=Decimal("3.25"),
        destination=Destination.MAGASIN,
        notes=None,
    )
    row = map_ligne_depot_to_report_response(ligne)
    assert row.category_label == "Catégorie inconnue"
    assert row.benevole_username == "bob"
    assert row.poste_id == str(pid)


def test_build_ligne_depot_list_response_total_pages():
    ligne = SimpleNamespace(
        id=uuid4(),
        ticket_id=uuid4(),
        ticket=SimpleNamespace(
            poste_id=uuid4(),
            benevole=SimpleNamespace(username="a"),
            created_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
        ),
        category=SimpleNamespace(name="Fer"),
        poids_kg=Decimal("1"),
        destination=Destination.MAGASIN,
        notes=None,
    )
    body = build_ligne_depot_list_response([ligne], total=100, page=1, per_page=50)
    assert body.total_pages == 2
    assert len(body.lignes) == 1
    assert body.lignes[0].category_label == "Fer"
