"""
ARCH-03 : POST /sales/ — SaleService.create_sale lève des exceptions domaine ;
le routeur les traduit en HTTP (404 / 400 / 422) sans changer le contrat.

404 session absente : scénario intégration réel (sans mock SaleService) dans
``test_sales_integration.TestSalesIntegration.test_create_sale_cash_session_not_found_integration``.
"""

from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.core.config import settings
from recyclic_api.core.exceptions import ConflictError, NotFoundError, ValidationError
from recyclic_api.core.security import hash_password
from recyclic_api.models.user import User, UserRole, UserStatus

_V1 = settings.API_V1_STR.rstrip("/")

_MIN_SALE_BODY = {
    "cash_session_id": str(uuid4()),
    "items": [
        {
            "category": "EEE-1",
            "quantity": 1,
            "weight": 1.0,
            "unit_price": 10.0,
            "total_price": 10.0,
        }
    ],
    "total_amount": 10.0,
    "donation": 0.0,
    "payment_method": "cash",
}


def _login_user(client: TestClient, db_session: Session, username_suffix: str) -> str:
    user = User(
        id=uuid4(),
        username=f"arch03_sale_{username_suffix}@example.com",
        hashed_password=hash_password("secret"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
    )
    db_session.add(user)
    db_session.commit()
    login = client.post(
        f"{_V1}/auth/login",
        json={"username": f"arch03_sale_{username_suffix}@example.com", "password": "secret"},
    )
    assert login.status_code == 200
    return login.json()["access_token"]


def test_post_sales_http_404_when_create_raises_not_found(client: TestClient, db_session: Session):
    token = _login_user(client, db_session, "nf")
    with patch("recyclic_api.api.api_v1.endpoints.sales.SaleService") as mock_cls:
        mock_cls.return_value.create_sale.side_effect = NotFoundError("Session de caisse non trouvée")
        response = client.post(
            f"{_V1}/sales/",
            headers={"Authorization": f"Bearer {token}"},
            json=_MIN_SALE_BODY,
        )
    assert response.status_code == 404
    assert response.json()["detail"] == "Session de caisse non trouvée"


def test_post_sales_http_400_when_create_raises_validation(client: TestClient, db_session: Session):
    token = _login_user(client, db_session, "val")
    with patch("recyclic_api.api.api_v1.endpoints.sales.SaleService") as mock_cls:
        mock_cls.return_value.create_sale.side_effect = ValidationError("La somme des paiements (0) doit être supérieure ou égale au total (10.0)")
        response = client.post(
            f"{_V1}/sales/",
            headers={"Authorization": f"Bearer {token}"},
            json=_MIN_SALE_BODY,
        )
    assert response.status_code == 400
    assert "paiements" in response.json()["detail"].lower()


def test_post_sales_http_422_when_create_raises_conflict_closed_session(client: TestClient, db_session: Session):
    token = _login_user(client, db_session, "conf")
    with patch("recyclic_api.api.api_v1.endpoints.sales.SaleService") as mock_cls:
        mock_cls.return_value.create_sale.side_effect = ConflictError(
            "Impossible de créer une vente pour une session fermée (statut: closed)"
        )
        response = client.post(
            f"{_V1}/sales/",
            headers={"Authorization": f"Bearer {token}"},
            json=_MIN_SALE_BODY,
        )
    assert response.status_code == 422
    assert "fermée" in response.json()["detail"].lower() or "closed" in response.json()["detail"].lower()
