"""
Tests B52-P2 – Édition du poids après validation.

Objectifs principaux :
- Vérifier que l'endpoint PATCH /sales/{sale_id}/items/{item_id}/weight
  permet bien de modifier le poids d'un item de vente.
- Vérifier que l'endpoint PATCH /reception/tickets/{ticket_id}/lignes/{ligne_id}/weight
  permet de modifier le poids d'une ligne de réception, y compris sur un ticket fermé.
"""

from decimal import Decimal
from uuid import uuid4
from datetime import datetime, timezone
import time

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.models.sale import Sale
from recyclic_api.models.sale_item import SaleItem
from recyclic_api.models.ticket_depot import TicketDepot, TicketDepotStatus
from recyclic_api.models.ligne_depot import LigneDepot, Destination
from recyclic_api.services.statistics_recalculation_service import (
    StatisticsRecalculationService,
)


def test_update_sale_item_weight_admin_success(admin_client: TestClient, db_session: Session) -> None:
    """
    B52-P2 – Happy path : un admin peut modifier le poids d'un item de vente.
    """
    # Arrange: créer une vente + item directement en base
    sale_id = uuid4()
    sale = Sale(
        id=sale_id,
        cash_session_id=None,
        total_amount=10.0,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(sale)
    db_session.flush()

    item_id = uuid4()
    item = SaleItem(
        id=item_id,
        sale_id=sale.id,
        category="EEE-1",
        quantity=1,
        weight=1.5,
        unit_price=10.0,
        total_price=10.0,
    )
    db_session.add(item)
    db_session.commit()

    # Act: appeler l'endpoint PATCH pour modifier le poids
    response = admin_client.patch(
        f"/api/v1/sales/{sale.id}/items/{item.id}/weight",
        json={"weight": 2.75},
    )

    # Assert: réponse OK et poids mis à jour
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(item.id)
    assert data["sale_id"] == str(sale.id)
    assert data["weight"] == 2.75

    # Vérifier également en base
    db_session.refresh(item)
    assert item.weight == 2.75


def test_update_reception_ligne_weight_closed_ticket_admin_success(
    admin_client: TestClient, db_session: Session
) -> None:
    """
    B52-P2 – Un admin peut corriger le poids d'une ligne de réception
    même si le ticket est fermé.
    """
    # Arrange: créer un ticket fermé avec une ligne
    ticket_id = uuid4()
    ticket = TicketDepot(
        id=ticket_id,
        poste_id=uuid4(),
        benevole_user_id=uuid4(),
        status=TicketDepotStatus.CLOSED.value,
        created_at=datetime.now(timezone.utc),
        closed_at=datetime.now(timezone.utc),
    )
    db_session.add(ticket)
    db_session.flush()

    ligne_id = uuid4()
    ligne = LigneDepot(
        id=ligne_id,
        ticket_id=ticket.id,
        category_id=uuid4(),
        poids_kg=Decimal("5.500"),
        destination=Destination.MAGASIN,
        notes="Test ligne",
        is_exit=False,
    )
    db_session.add(ligne)
    db_session.commit()

    # Act: appeler l'endpoint PATCH pour modifier le poids
    response = admin_client.patch(
        f"/api/v1/reception/tickets/{ticket.id}/lignes/{ligne.id}/weight",
        json={"poids_kg": "7.250"},
    )

    # Assert: réponse OK et poids mis à jour
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(ligne.id)
    assert data["ticket_id"] == str(ticket.id)
    # poids_kg est sérialisé en chaîne décimale
    assert data["poids_kg"] == "7.250"

    # Vérifier également en base
    db_session.refresh(ligne)
    assert ligne.poids_kg == Decimal("7.250")


def test_update_sale_item_weight_forbidden_for_non_admin(
    client_with_jwt_auth: TestClient, db_session: Session
) -> None:
    """
    B52-P2 – Un utilisateur non-admin ne doit PAS pouvoir modifier le poids d'un item de vente.
    """
    sale = Sale(
        id=uuid4(),
        cash_session_id=None,
        total_amount=10.0,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(sale)
    db_session.flush()

    item = SaleItem(
        id=uuid4(),
        sale_id=sale.id,
        category="EEE-1",
        quantity=1,
        weight=1.0,
        unit_price=10.0,
        total_price=10.0,
    )
    db_session.add(item)
    db_session.commit()

    response = client_with_jwt_auth.patch(
        f"/api/v1/sales/{sale.id}/items/{item.id}/weight",
        json={"weight": 2.0},
    )

    # require_role_strict renvoie 403 pour utilisateur authentifié sans rôle admin
    assert response.status_code == 403


def test_update_reception_ligne_weight_forbidden_for_non_admin(
    client_with_jwt_auth: TestClient, db_session: Session
) -> None:
    """
    B52-P2 – Un utilisateur non-admin ne doit PAS pouvoir modifier le poids d'une ligne de réception.
    """
    ticket = TicketDepot(
        id=uuid4(),
        poste_id=uuid4(),
        benevole_user_id=uuid4(),
        status=TicketDepotStatus.CLOSED.value,
        created_at=datetime.now(timezone.utc),
        closed_at=datetime.now(timezone.utc),
    )
    db_session.add(ticket)
    db_session.flush()

    ligne = LigneDepot(
        id=uuid4(),
        ticket_id=ticket.id,
        category_id=uuid4(),
        poids_kg=Decimal("3.000"),
        destination=Destination.MAGASIN,
        notes=None,
        is_exit=False,
    )
    db_session.add(ligne)
    db_session.commit()

    response = client_with_jwt_auth.patch(
        f"/api/v1/reception/tickets/{ticket.id}/lignes/{ligne.id}/weight",
        json={"poids_kg": "4.000"},
    )

    assert response.status_code == 403


@pytest.mark.performance
def test_statistics_recalculation_performance(db_session: Session) -> None:
    """
    B52-P2 – Test de performance simple du service de recalcul sur un volume réaliste.

    Objectif: vérifier que le recalcul reste sous un seuil de latence raisonnable
    pour ~500 lignes, pour détecter les régressions grossières.
    """
    # Préparer un jeu de données avec plusieurs ventes et lignes de réception
    sales = []
    for _ in range(100):
        sale = Sale(
            id=uuid4(),
            cash_session_id=None,
            total_amount=10.0,
            created_at=datetime.now(timezone.utc),
        )
        db_session.add(sale)
        db_session.flush()
        for _ in range(5):
            item = SaleItem(
                id=uuid4(),
                sale_id=sale.id,
                category="EEE-1",
                quantity=1,
                weight=1.0,
                unit_price=10.0,
                total_price=10.0,
            )
            db_session.add(item)
        sales.append(sale)

    ticket = TicketDepot(
        id=uuid4(),
        poste_id=uuid4(),
        benevole_user_id=uuid4(),
        status=TicketDepotStatus.CLOSED.value,
        created_at=datetime.now(timezone.utc),
        closed_at=datetime.now(timezone.utc),
    )
    db_session.add(ticket)
    db_session.flush()

    for _ in range(100):
        ligne = LigneDepot(
            id=uuid4(),
            ticket_id=ticket.id,
            category_id=uuid4(),
            poids_kg=Decimal("1.000"),
            destination=Destination.MAGASIN,
            notes=None,
            is_exit=False,
        )
        db_session.add(ligne)

    db_session.commit()

    service = StatisticsRecalculationService(db_session)

    start = time.perf_counter()

    # Effectuer plusieurs recalculs pour simuler un usage fréquent
    for sale in sales[:10]:
        service.recalculate_after_sale_item_weight_update(
            sale_id=sale.id,
            item_id=sale.items[0].id,
            old_weight=1.0,
            new_weight=2.0,
        )

    for ligne in (
        db_session.query(LigneDepot).filter(LigneDepot.ticket_id == ticket.id).limit(10)
    ):
        service.recalculate_after_ligne_weight_update(
            ticket_id=ticket.id,
            ligne_id=ligne.id,
            old_weight=1.0,
            new_weight=2.0,
        )

    duration = time.perf_counter() - start

    # Seuil relativement large (500ms) pour détecter surtout les régressions majeures
    assert duration < 0.5


