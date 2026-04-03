"""
Contrat d'auth des routes sales mutantes (régression après factorisation routeur).

- Bearer optionnel + JWT : POST /sales/, PUT /sales/{id}, PATCH .../items/{id}
  partagent ``_jwt_sub_from_optional_bearer`` (401 sans en-tête, messages inchangés).
- PUT note vs PATCH item : absence d'utilisateur en base → 403 vs 401 (comportement
  historique volontairement distinct).

Nécessite un schéma complet (sites, cash_sessions, sales) : comme ``test_b52_p4``,
exécuter avec ``TEST_DATABASE_URL`` PostgreSQL.
"""

import os
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.core.config import settings
from recyclic_api.core.security import create_access_token, hash_password
from recyclic_api.models.cash_register import CashRegister
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.sale import Sale
from recyclic_api.models.sale_item import SaleItem
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus

_V1 = settings.API_V1_STR.rstrip("/")
_TEST_DB_URL = os.getenv("TEST_DATABASE_URL", "")

pytestmark = pytest.mark.skipif(
    not _TEST_DB_URL.startswith("postgresql"),
    reason="Schéma complet (sites, ventes) requis — TEST_DATABASE_URL PostgreSQL.",
)


@pytest.fixture
def _sale_auth_contract_user():
    return {
        "id": uuid.uuid4(),
        "username": "sale_auth_contract_user",
        "hashed_password": hash_password("testpass"),
        "role": UserRole.USER,
        "status": UserStatus.ACTIVE,
        "is_active": True,
    }


@pytest.fixture
def _sale_auth_contract_site():
    return {
        "id": uuid.uuid4(),
        "name": "Test Site",
        "address": "123 Test Street",
        "city": "Test City",
        "postal_code": "12345",
        "country": "France",
    }


@pytest.fixture
def _sale_auth_contract_register(_sale_auth_contract_site):
    return {
        "id": uuid.uuid4(),
        "name": "Test Register",
        "location": "Test Location",
        "site_id": _sale_auth_contract_site["id"],
        "is_active": True,
    }


@pytest.fixture
def _sale_auth_contract_session(_sale_auth_contract_user, _sale_auth_contract_site, _sale_auth_contract_register):
    return {
        "id": uuid.uuid4(),
        "operator_id": _sale_auth_contract_user["id"],
        "site_id": _sale_auth_contract_site["id"],
        "register_id": _sale_auth_contract_register["id"],
        "initial_amount": 100.0,
        "current_amount": 100.0,
        "status": CashSessionStatus.OPEN,
    }


@pytest.fixture
def _sale_auth_contract_sale(_sale_auth_contract_session, _sale_auth_contract_user):
    return {
        "id": uuid.uuid4(),
        "cash_session_id": _sale_auth_contract_session["id"],
        "operator_id": _sale_auth_contract_user["id"],
        "total_amount": 50.0,
        "donation": 0.0,
    }


@pytest.fixture
def _sale_auth_contract_sale_item(_sale_auth_contract_sale):
    return {
        "id": uuid.uuid4(),
        "sale_id": _sale_auth_contract_sale["id"],
        "category": "EEE-1",
        "quantity": 2,
        "weight": 1.5,
        "unit_price": 10.0,
        "total_price": 10.0,
        "preset_id": None,
        "notes": None,
    }


@pytest.fixture
def minimal_sale_setup(
    db_session: Session,
    _sale_auth_contract_user,
    _sale_auth_contract_site,
    _sale_auth_contract_register,
    _sale_auth_contract_session,
    _sale_auth_contract_sale,
    _sale_auth_contract_sale_item,
):
    user = User(**_sale_auth_contract_user)
    site = Site(**_sale_auth_contract_site)
    cash_register = CashRegister(**_sale_auth_contract_register)
    cash_session = CashSession(**_sale_auth_contract_session)
    sale = Sale(**_sale_auth_contract_sale)
    sale_item = SaleItem(**_sale_auth_contract_sale_item)
    db_session.add_all([user, site, cash_register, cash_session, sale, sale_item])
    db_session.commit()
    return sale, sale_item


def test_put_sale_note_orphan_jwt_returns_403_not_401(
    client: TestClient,
    db_session: Session,
    minimal_sale_setup,
):
    """JWT valide mais sub absent en base : PUT note → 403 (pas 401 User not found)."""
    sale, _ = minimal_sale_setup
    orphan_id = uuid.uuid4()
    token = create_access_token(data={"sub": str(orphan_id)})
    response = client.put(
        f"{_V1}/sales/{sale.id}",
        json={"note": "x"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Insufficient permissions. Admin access required."


def test_patch_sale_item_orphan_jwt_returns_401_user_not_found(
    client: TestClient,
    db_session: Session,
    minimal_sale_setup,
):
    """JWT valide mais sub absent en base : PATCH item → 401 User not found."""
    sale, sale_item = minimal_sale_setup
    orphan_id = uuid.uuid4()
    token = create_access_token(data={"sub": str(orphan_id)})
    response = client.patch(
        f"{_V1}/sales/{sale.id}/items/{sale_item.id}",
        json={"quantity": 3},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "User not found"
