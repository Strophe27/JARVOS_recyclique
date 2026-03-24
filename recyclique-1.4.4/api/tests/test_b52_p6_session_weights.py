"""B52-P6: Tests pour le poids par session de caisse et par panier (ticket)."""

from datetime import datetime, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.sale import Sale
from recyclic_api.models.sale_item import SaleItem
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.core.security import hash_password


def _create_operator(db_session: Session) -> User:
  """Crée un utilisateur opérateur simple pour les tests."""
  user = User(
      telegram_id="b52-p6-operator",
      username="b52p6_operator",
      email="b52p6@example.com",
      hashed_password=hash_password("testpassword123"),
      first_name="B52",
      last_name="Operator",
      role=UserRole.USER,
      status=UserStatus.APPROVED,
      is_active=True,
  )
  db_session.add(user)
  db_session.commit()
  db_session.refresh(user)
  return user


def _create_site(db_session: Session) -> Site:
  """Crée un site simple pour les tests."""
  site = Site(
      name="B52-P6 Test Site",
      address="123 Test Street",
      city="Test City",
      postal_code="12345",
      country="Test Country",
      is_active=True,
  )
  db_session.add(site)
  db_session.commit()
  db_session.refresh(site)
  return site


def test_cash_session_detail_includes_weight_fields(
  admin_client: TestClient, db_session: Session
) -> None:
  """B52-P6: l'endpoint de détail de session expose bien total_weight_out et total_weight par vente."""
  operator = _create_operator(db_session)
  site = _create_site(db_session)

  # Créer une session de caisse fermée avec deux ventes
  session = CashSession(
      operator_id=operator.id,
      site_id=site.id,
      initial_amount=50.0,
      current_amount=100.0,
      status=CashSessionStatus.CLOSED,
      opened_at=datetime.now(timezone.utc),
      closed_at=datetime.now(timezone.utc),
  )
  db_session.add(session)
  db_session.flush()

  # Vente 1 avec 2 items (poids total 1.5 + 2.0 = 3.5)
  sale1 = Sale(
      id=uuid4(),
      cash_session_id=session.id,
      operator_id=operator.id,
      total_amount=25.0,
      donation=0.0,
      sale_date=datetime.now(timezone.utc),
      created_at=datetime.now(timezone.utc),
  )
  db_session.add(sale1)
  db_session.flush()

  item1 = SaleItem(
      id=uuid4(),
      sale_id=sale1.id,
      category="EEE-1",
      quantity=1,
      weight=1.5,
      unit_price=10.0,
      total_price=10.0,
  )
  item2 = SaleItem(
      id=uuid4(),
      sale_id=sale1.id,
      category="EEE-2",
      quantity=1,
      weight=2.0,
      unit_price=15.0,
      total_price=15.0,
  )
  db_session.add(item1)
  db_session.add(item2)

  # Vente 2 avec 1 item (poids total 4.25)
  sale2 = Sale(
      id=uuid4(),
      cash_session_id=session.id,
      operator_id=operator.id,
      total_amount=30.0,
      donation=5.0,
      sale_date=datetime.now(timezone.utc),
      created_at=datetime.now(timezone.utc),
  )
  db_session.add(sale2)
  db_session.flush()

  item3 = SaleItem(
      id=uuid4(),
      sale_id=sale2.id,
      category="EEE-3",
      quantity=1,
      weight=4.25,
      unit_price=30.0,
      total_price=30.0,
  )
  db_session.add(item3)
  db_session.commit()

  # Appeler l'endpoint de détail de session
  response = admin_client.get(f"/api/v1/cash-sessions/{session.id}")
  assert response.status_code == 200
  data = response.json()

  # total_weight_out = 1.5 + 2.0 + 4.25 = 7.75
  assert pytest.approx(data["total_weight_out"], rel=1e-5) == 7.75

  # Vérifier les poids par vente
  assert len(data["sales"]) == 2
  weights_by_sale = {sale["id"]: sale.get("total_weight") for sale in data["sales"]}

  assert pytest.approx(weights_by_sale[str(sale1.id)], rel=1e-5) == 3.5
  assert pytest.approx(weights_by_sale[str(sale2.id)], rel=1e-5) == 4.25




