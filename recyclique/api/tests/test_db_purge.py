"""
Tests pour l'endpoint de purge des données transactionnelles.
"""

import os
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session
from unittest.mock import patch

from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.sale import Sale, PaymentMethod
from recyclic_api.models.sale_item import SaleItem
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.ticket_depot import TicketDepot, TicketDepotStatus
from recyclic_api.models.ligne_depot import LigneDepot, Destination
from recyclic_api.models.site import Site
from recyclic_api.models.category import Category
from recyclic_api.models.poste_reception import PosteReception, PosteReceptionStatus
from recyclic_api.core.security import hash_password

from tests.api_v1_paths import v1

PURGE_URL = v1("/admin/db/purge-transactions")


@pytest.fixture
def super_admin_user(db_session: Session):
    """Créer un utilisateur Super-Admin pour les tests."""
    user = User(
        username="superadmin@test.com",
        hashed_password=hash_password("testpassword"),
        role=UserRole.SUPER_ADMIN,
        status=UserStatus.ACTIVE,
        first_name="Super",
        last_name="Admin",
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def regular_admin_user(db_session: Session):
    """Créer un utilisateur Admin normal pour les tests."""
    user = User(
        username="admin@test.com",
        hashed_password=hash_password("testpassword"),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        first_name="Regular",
        last_name="Admin",
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def sample_transactional_data(db_session: Session):
    """Créer des données transactionnelles de test (aligné modèles actuels)."""
    site = Site(name="Purge Test Site", address="Addr")
    db_session.add(site)
    db_session.flush()

    operator = User(
        username=f"purge_op_{uuid4().hex[:8]}",
        hashed_password=hash_password("testpassword"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
        is_active=True,
    )
    db_session.add(operator)
    db_session.flush()

    poste = PosteReception(
        opened_by_user_id=operator.id,
        status=PosteReceptionStatus.OPENED.value,
        opened_at=datetime.now(timezone.utc),
    )
    db_session.add(poste)
    db_session.flush()

    category = Category(
        id=uuid4(),
        name=f"purge_cat_{uuid4().hex[:8]}",
        is_active=True,
        price=1.0,
    )
    db_session.add(category)
    db_session.flush()

    cash_session = CashSession(
        operator_id=operator.id,
        site_id=site.id,
        initial_amount=100.0,
        current_amount=150.0,
        status=CashSessionStatus.CLOSED,
    )
    db_session.add(cash_session)
    db_session.flush()

    sale = Sale(
        cash_session_id=cash_session.id,
        total_amount=50.0,
        payment_method=PaymentMethod.CASH,
    )
    db_session.add(sale)
    db_session.flush()

    sale_item = SaleItem(
        sale_id=sale.id,
        category="EEE-3",
        quantity=1,
        unit_price=50.0,
        total_price=50.0,
        weight=1.0,
    )
    db_session.add(sale_item)

    reception_ticket = TicketDepot(
        poste_id=poste.id,
        benevole_user_id=operator.id,
        status=TicketDepotStatus.CLOSED,
        closed_at=datetime.now(timezone.utc),
    )
    db_session.add(reception_ticket)
    db_session.flush()

    reception_line = LigneDepot(
        ticket_id=reception_ticket.id,
        category_id=category.id,
        poids_kg=2.5,
        destination=Destination.RECYCLAGE,
    )
    db_session.add(reception_line)

    db_session.commit()

    return {
        "cash_session": cash_session,
        "sale": sale,
        "sale_item": sale_item,
        "reception_ticket": reception_ticket,
        "reception_line": reception_line,
    }


class TestDatabasePurge:
    """Tests pour l'endpoint de purge des données transactionnelles."""

    def test_purge_requires_super_admin_role(self, client: TestClient, db_session: Session, regular_admin_user: User):
        """Test que seuls les Super-Admins peuvent accéder à l'endpoint de purge."""
        from recyclic_api.core.auth import create_access_token

        token = create_access_token(data={"sub": str(regular_admin_user.id)})

        response = client.post(
            PURGE_URL,
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 403
        body = response.json()
        assert "super-admin" in body.get("detail", "").lower()

    def test_purge_requires_authentication(self, client: TestClient):
        """Test que l'authentification est requise."""
        response = client.post(PURGE_URL)
        assert response.status_code == 401
        assert response.json().get("code") == "UNAUTHORIZED"

    def test_purge_success_with_super_admin(
        self, client: TestClient, db_session: Session, super_admin_user: User, sample_transactional_data
    ):
        """Test que la purge fonctionne avec un Super-Admin."""
        from recyclic_api.core.auth import create_access_token

        token = create_access_token(data={"sub": str(super_admin_user.id)})

        assert db_session.query(Sale).count() > 0
        assert db_session.query(SaleItem).count() > 0
        assert db_session.query(CashSession).count() > 0
        assert db_session.query(TicketDepot).count() > 0
        assert db_session.query(LigneDepot).count() > 0

        response = client.post(
            PURGE_URL,
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()

        assert "message" in data
        assert "deleted_records" in data
        assert "timestamp" in data

        assert db_session.query(Sale).count() == 0
        assert db_session.query(SaleItem).count() == 0
        assert db_session.query(CashSession).count() == 0
        assert db_session.query(TicketDepot).count() == 0
        assert db_session.query(LigneDepot).count() == 0

        assert db_session.query(User).count() > 0

    def test_purge_preserves_configuration_tables(self, client: TestClient, db_session: Session, super_admin_user: User):
        """Test que les tables de configuration ne sont pas affectées par la purge."""
        from recyclic_api.core.auth import create_access_token

        token = create_access_token(data={"sub": str(super_admin_user.id)})

        user_count_before = db_session.query(User).count()

        response = client.post(
            PURGE_URL,
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200

        user_count_after = db_session.query(User).count()
        assert user_count_after == user_count_before

    def test_purge_handles_empty_database(self, client: TestClient, db_session: Session, super_admin_user: User):
        """Test que la purge fonctionne même avec une base de données vide."""
        from recyclic_api.core.auth import create_access_token

        token = create_access_token(data={"sub": str(super_admin_user.id)})

        # Même fichier SQLite partagé entre fonctions de test : normaliser d'abord pour que
        # ce test vérifie le comportement « déjà vide », sans dépendre du résidu d'un test précédent.
        norm = client.post(PURGE_URL, headers={"Authorization": f"Bearer {token}"})
        assert norm.status_code == 200

        response = client.post(
            PURGE_URL,
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()

        for _table, count in data["deleted_records"].items():
            assert count == 0

    def test_purge_transaction_rollback_on_error(self, client: TestClient, db_session: Session, super_admin_user: User):
        """Test que la purge fait un rollback en cas d'erreur."""
        if os.environ.get("TEST_DATABASE_URL", "").startswith("sqlite"):
            pytest.skip(
                "SQLite + session de test : après échec purge, l'état ORM/connexion ne garantit pas "
                "la ré-lecture fiable des lignes (transaction racine conftest) ; le rollback serveur reste correct sur Postgres."
            )

        from recyclic_api.core.auth import create_access_token

        token = create_access_token(data={"sub": str(super_admin_user.id)})

        site = Site(name="Rollback Site", address="X")
        db_session.add(site)
        db_session.flush()
        op = User(
            username=f"rollback_op_{uuid4().hex[:8]}",
            hashed_password=hash_password("x"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(op)
        db_session.flush()
        cash_session = CashSession(
            operator_id=op.id,
            site_id=site.id,
            initial_amount=100.0,
            current_amount=100.0,
            status=CashSessionStatus.OPEN,
        )
        db_session.add(cash_session)
        db_session.commit()

        initial_count = db_session.execute(
            text("SELECT COUNT(*) FROM cash_sessions")
        ).scalar_one()

        real_execute = db_session.execute

        def execute_fail_on_cash_sessions_delete(statement, *args, **kwargs):
            fragment = (getattr(statement, "text", None) or str(statement)).upper()
            if "DELETE FROM CASH_SESSIONS" in fragment:
                raise Exception("Database error")
            return real_execute(statement, *args, **kwargs)

        with patch.object(db_session, "execute", side_effect=execute_fail_on_cash_sessions_delete):
            response = client.post(
                PURGE_URL,
                headers={"Authorization": f"Bearer {token}"},
            )

            assert response.status_code == 500

            db_session.rollback()
            final_count = db_session.execute(
                text("SELECT COUNT(*) FROM cash_sessions")
            ).scalar_one()
            assert final_count == initial_count
