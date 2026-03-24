"""
Tests for Story B48-P3: Sorties de Stock depuis Écran Réception

Tests unitaires et d'intégration pour :
- Création ligne avec is_exit=true/false
- Validation is_exit=true avec destination MAGASIN (doit échouer)
- Calculs weight_in et weight_out avec is_exit
- Modification is_exit sur ligne existante
"""
import os
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, text

from recyclic_api.models.ticket_depot import TicketDepot, TicketDepotStatus
from recyclic_api.models.ligne_depot import LigneDepot, Destination
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.poste_reception import PosteReception, PosteReceptionStatus
from recyclic_api.models.category import Category
from recyclic_api.services.reception_service import ReceptionService
from recyclic_api.services.reception_stats_service import ReceptionLiveStatsService
from recyclic_api.core.security import hash_password

os.environ["TESTING"] = "true"


class TestReceptionExitCreation:
    """Tests pour la création de lignes avec is_exit"""

    def test_create_ligne_with_is_exit_false(self, admin_client):
        """Test création ligne avec is_exit=false (comportement par défaut)"""
        # Setup poste + ticket
        r = admin_client.post("/api/v1/reception/postes/open")
        assert r.status_code == 200
        poste_id = r.json()["id"]
        r = admin_client.post("/api/v1/reception/tickets", json={"poste_id": poste_id})
        assert r.status_code == 200
        ticket_id = r.json()["id"]

        # Récupérer une catégorie
        db_url = os.getenv(
            "TEST_DATABASE_URL",
            os.getenv("DATABASE_URL", "postgresql://recyclic:postgres@localhost:5432/recyclic"),
        )
        engine = create_engine(db_url)
        with engine.begin() as conn:
            category_id = conn.execute(text("SELECT id FROM categories WHERE is_active = true ORDER BY name LIMIT 1")).scalar()
        assert category_id

        # Créer ligne avec is_exit=false (explicite)
        r = admin_client.post(
            "/api/v1/reception/lignes",
            json={
                "ticket_id": ticket_id,
                "category_id": str(category_id),
                "poids_kg": "5.500",
                "destination": "MAGASIN",
                "is_exit": False,
            },
        )
        assert r.status_code == 200
        data = r.json()
        assert data["is_exit"] is False
        assert data["destination"] == "MAGASIN"

    def test_create_ligne_with_is_exit_true_recyclage(self, admin_client):
        """Test création ligne sortie avec destination RECYCLAGE"""
        # Setup poste + ticket
        r = admin_client.post("/api/v1/reception/postes/open")
        assert r.status_code == 200
        poste_id = r.json()["id"]
        r = admin_client.post("/api/v1/reception/tickets", json={"poste_id": poste_id})
        assert r.status_code == 200
        ticket_id = r.json()["id"]

        # Récupérer une catégorie
        db_url = os.getenv(
            "TEST_DATABASE_URL",
            os.getenv("DATABASE_URL", "postgresql://recyclic:postgres@localhost:5432/recyclic"),
        )
        engine = create_engine(db_url)
        with engine.begin() as conn:
            category_id = conn.execute(text("SELECT id FROM categories WHERE is_active = true ORDER BY name LIMIT 1")).scalar()
        assert category_id

        # Créer ligne sortie avec RECYCLAGE
        r = admin_client.post(
            "/api/v1/reception/lignes",
            json={
                "ticket_id": ticket_id,
                "category_id": str(category_id),
                "poids_kg": "3.250",
                "destination": "RECYCLAGE",
                "is_exit": True,
            },
        )
        assert r.status_code == 200
        data = r.json()
        assert data["is_exit"] is True
        assert data["destination"] == "RECYCLAGE"

    def test_create_ligne_with_is_exit_true_dechetterie(self, admin_client):
        """Test création ligne sortie avec destination DECHETERIE"""
        # Setup poste + ticket
        r = admin_client.post("/api/v1/reception/postes/open")
        assert r.status_code == 200
        poste_id = r.json()["id"]
        r = admin_client.post("/api/v1/reception/tickets", json={"poste_id": poste_id})
        assert r.status_code == 200
        ticket_id = r.json()["id"]

        # Récupérer une catégorie
        db_url = os.getenv(
            "TEST_DATABASE_URL",
            os.getenv("DATABASE_URL", "postgresql://recyclic:postgres@localhost:5432/recyclic"),
        )
        engine = create_engine(db_url)
        with engine.begin() as conn:
            category_id = conn.execute(text("SELECT id FROM categories WHERE is_active = true ORDER BY name LIMIT 1")).scalar()
        assert category_id

        # Créer ligne sortie avec DECHETERIE
        r = admin_client.post(
            "/api/v1/reception/lignes",
            json={
                "ticket_id": ticket_id,
                "category_id": str(category_id),
                "poids_kg": "7.750",
                "destination": "DECHETERIE",
                "is_exit": True,
            },
        )
        assert r.status_code == 200
        data = r.json()
        assert data["is_exit"] is True
        assert data["destination"] == "DECHETERIE"

    def test_create_ligne_is_exit_true_with_magasin_fails(self, admin_client):
        """Test que is_exit=true avec destination MAGASIN échoue"""
        # Setup poste + ticket
        r = admin_client.post("/api/v1/reception/postes/open")
        assert r.status_code == 200
        poste_id = r.json()["id"]
        r = admin_client.post("/api/v1/reception/tickets", json={"poste_id": poste_id})
        assert r.status_code == 200
        ticket_id = r.json()["id"]

        # Récupérer une catégorie
        db_url = os.getenv(
            "TEST_DATABASE_URL",
            os.getenv("DATABASE_URL", "postgresql://recyclic:postgres@localhost:5432/recyclic"),
        )
        engine = create_engine(db_url)
        with engine.begin() as conn:
            category_id = conn.execute(text("SELECT id FROM categories WHERE is_active = true ORDER BY name LIMIT 1")).scalar()
        assert category_id

        # Tentative création ligne sortie avec MAGASIN → doit échouer
        r = admin_client.post(
            "/api/v1/reception/lignes",
            json={
                "ticket_id": ticket_id,
                "category_id": str(category_id),
                "poids_kg": "2.000",
                "destination": "MAGASIN",
                "is_exit": True,
            },
        )
        assert r.status_code == 422
        assert "sortie de stock" in str(r.json()).lower() or "recyclage" in str(r.json()).lower() or "dechetterie" in str(r.json()).lower()

    def test_create_ligne_is_exit_default_false(self, admin_client):
        """Test que is_exit par défaut est False si non fourni"""
        # Setup poste + ticket
        r = admin_client.post("/api/v1/reception/postes/open")
        assert r.status_code == 200
        poste_id = r.json()["id"]
        r = admin_client.post("/api/v1/reception/tickets", json={"poste_id": poste_id})
        assert r.status_code == 200
        ticket_id = r.json()["id"]

        # Récupérer une catégorie
        db_url = os.getenv(
            "TEST_DATABASE_URL",
            os.getenv("DATABASE_URL", "postgresql://recyclic:postgres@localhost:5432/recyclic"),
        )
        engine = create_engine(db_url)
        with engine.begin() as conn:
            category_id = conn.execute(text("SELECT id FROM categories WHERE is_active = true ORDER BY name LIMIT 1")).scalar()
        assert category_id

        # Créer ligne sans is_exit → doit être False par défaut
        r = admin_client.post(
            "/api/v1/reception/lignes",
            json={
                "ticket_id": ticket_id,
                "category_id": str(category_id),
                "poids_kg": "1.000",
                "destination": "MAGASIN",
            },
        )
        assert r.status_code == 200
        data = r.json()
        assert data["is_exit"] is False


class TestReceptionExitUpdate:
    """Tests pour la modification de is_exit sur lignes existantes"""

    def test_update_ligne_set_is_exit_true(self, admin_client):
        """Test modification ligne pour passer is_exit à True"""
        # Setup poste + ticket
        r = admin_client.post("/api/v1/reception/postes/open")
        assert r.status_code == 200
        poste_id = r.json()["id"]
        r = admin_client.post("/api/v1/reception/tickets", json={"poste_id": poste_id})
        assert r.status_code == 200
        ticket_id = r.json()["id"]

        # Récupérer une catégorie
        db_url = os.getenv(
            "TEST_DATABASE_URL",
            os.getenv("DATABASE_URL", "postgresql://recyclic:postgres@localhost:5432/recyclic"),
        )
        engine = create_engine(db_url)
        with engine.begin() as conn:
            category_id = conn.execute(text("SELECT id FROM categories WHERE is_active = true ORDER BY name LIMIT 1")).scalar()
        assert category_id

        # Créer ligne normale (is_exit=false)
        r = admin_client.post(
            "/api/v1/reception/lignes",
            json={
                "ticket_id": ticket_id,
                "category_id": str(category_id),
                "poids_kg": "4.500",
                "destination": "MAGASIN",
                "is_exit": False,
            },
        )
        assert r.status_code == 200
        ligne_id = r.json()["id"]

        # Modifier pour passer à is_exit=true avec destination RECYCLAGE
        r = admin_client.put(
            f"/api/v1/reception/lignes/{ligne_id}",
            json={
                "is_exit": True,
                "destination": "RECYCLAGE",
            },
        )
        assert r.status_code == 200
        data = r.json()
        assert data["is_exit"] is True
        assert data["destination"] == "RECYCLAGE"

    def test_update_ligne_is_exit_true_with_magasin_fails(self, admin_client):
        """Test que modifier is_exit à True avec MAGASIN échoue"""
        # Setup poste + ticket
        r = admin_client.post("/api/v1/reception/postes/open")
        assert r.status_code == 200
        poste_id = r.json()["id"]
        r = admin_client.post("/api/v1/reception/tickets", json={"poste_id": poste_id})
        assert r.status_code == 200
        ticket_id = r.json()["id"]

        # Récupérer une catégorie
        db_url = os.getenv(
            "TEST_DATABASE_URL",
            os.getenv("DATABASE_URL", "postgresql://recyclic:postgres@localhost:5432/recyclic"),
        )
        engine = create_engine(db_url)
        with engine.begin() as conn:
            category_id = conn.execute(text("SELECT id FROM categories WHERE is_active = true ORDER BY name LIMIT 1")).scalar()
        assert category_id

        # Créer ligne normale
        r = admin_client.post(
            "/api/v1/reception/lignes",
            json={
                "ticket_id": ticket_id,
                "category_id": str(category_id),
                "poids_kg": "2.500",
                "destination": "MAGASIN",
            },
        )
        assert r.status_code == 200
        ligne_id = r.json()["id"]

        # Tentative modification is_exit à True avec MAGASIN → doit échouer
        r = admin_client.put(
            f"/api/v1/reception/lignes/{ligne_id}",
            json={
                "is_exit": True,
                "destination": "MAGASIN",  # Incohérent
            },
        )
        assert r.status_code == 422
        assert "sortie de stock" in str(r.json()).lower() or "recyclage" in str(r.json()).lower() or "dechetterie" in str(r.json()).lower()


class TestReceptionExitStats:
    """Tests pour les calculs weight_in et weight_out avec is_exit"""

    @pytest.mark.asyncio
    async def test_weight_in_excludes_exit_lines(self, db_session: Session):
        """Test que weight_in exclut les lignes avec is_exit=true"""
        # Créer utilisateur
        user = User(
            id=uuid.uuid4(),
            username="test@example.com",
            hashed_password=hash_password("testpass"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
        )
        db_session.add(user)
        db_session.commit()

        # Créer catégorie
        category = Category(
            id=uuid.uuid4(),
            name="Test Category",
            is_active=True
        )
        db_session.add(category)
        db_session.commit()

        # Créer poste (aujourd'hui)
        now = datetime.now(timezone.utc)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        poste = PosteReception(
            id=uuid.uuid4(),
            opened_by_user_id=user.id,
            opened_at=start_of_today + timedelta(hours=1),
            status=PosteReceptionStatus.OPENED.value,
        )
        db_session.add(poste)
        db_session.commit()

        # Créer ticket ouvert
        ticket = TicketDepot(
            id=uuid.uuid4(),
            poste_id=poste.id,
            benevole_user_id=user.id,
            status=TicketDepotStatus.OPENED.value,
        )
        db_session.add(ticket)
        db_session.commit()

        # Créer ligne entrée (is_exit=false)
        ligne_entry = LigneDepot(
            id=uuid.uuid4(),
            ticket_id=ticket.id,
            category_id=category.id,
            poids_kg=Decimal("10.000"),
            destination=Destination.MAGASIN,
            is_exit=False,
        )

        # Créer ligne sortie (is_exit=true)
        ligne_exit = LigneDepot(
            id=uuid.uuid4(),
            ticket_id=ticket.id,
            category_id=category.id,
            poids_kg=Decimal("5.000"),
            destination=Destination.RECYCLAGE,
            is_exit=True,
        )

        db_session.add_all([ligne_entry, ligne_exit])
        db_session.commit()

        # Calculer weight_in
        service = ReceptionLiveStatsService(db_session)
        threshold = now - timedelta(hours=24)
        weight_in = service._calculate_weight_in(None, threshold, start_of_today)

        # weight_in doit inclure uniquement la ligne entrée (10kg), pas la sortie (5kg)
        assert weight_in == Decimal("10.000"), f"weight_in devrait être 10.000, obtenu {weight_in}"

    @pytest.mark.asyncio
    async def test_weight_out_includes_exit_lines(self, db_session: Session):
        """Test que weight_out inclut les lignes avec is_exit=true"""
        # Créer utilisateur
        user = User(
            id=uuid.uuid4(),
            username="test@example.com",
            hashed_password=hash_password("testpass"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
        )
        db_session.add(user)
        db_session.commit()

        # Créer catégorie
        category = Category(
            id=uuid.uuid4(),
            name="Test Category",
            is_active=True
        )
        db_session.add(category)
        db_session.commit()

        # Créer poste (aujourd'hui)
        now = datetime.now(timezone.utc)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        poste = PosteReception(
            id=uuid.uuid4(),
            opened_by_user_id=user.id,
            opened_at=start_of_today + timedelta(hours=1),
            status=PosteReceptionStatus.OPENED.value,
        )
        db_session.add(poste)
        db_session.commit()

        # Créer ticket ouvert
        ticket = TicketDepot(
            id=uuid.uuid4(),
            poste_id=poste.id,
            benevole_user_id=user.id,
            status=TicketDepotStatus.OPENED.value,
        )
        db_session.add(ticket)
        db_session.commit()

        # Créer ligne sortie (is_exit=true)
        ligne_exit = LigneDepot(
            id=uuid.uuid4(),
            ticket_id=ticket.id,
            category_id=category.id,
            poids_kg=Decimal("7.500"),
            destination=Destination.DECHETERIE,
            is_exit=True,
        )

        db_session.add(ligne_exit)
        db_session.commit()

        # Calculer weight_out
        service = ReceptionLiveStatsService(db_session)
        threshold = now - timedelta(hours=24)
        weight_out = service._calculate_weight_out(None, threshold, start_of_today)

        # weight_out doit inclure la ligne sortie (7.5kg)
        # Note: weight_out inclut aussi les ventes, mais ici on n'en a pas
        assert weight_out == Decimal("7.500"), f"weight_out devrait être 7.500, obtenu {weight_out}"

    @pytest.mark.asyncio
    async def test_weight_in_weight_out_with_mixed_lines(self, db_session: Session):
        """Test calculs avec mélange de lignes entrée et sortie"""
        # Créer utilisateur
        user = User(
            id=uuid.uuid4(),
            username="test@example.com",
            hashed_password=hash_password("testpass"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
        )
        db_session.add(user)
        db_session.commit()

        # Créer catégorie
        category = Category(
            id=uuid.uuid4(),
            name="Test Category",
            is_active=True
        )
        db_session.add(category)
        db_session.commit()

        # Créer poste (aujourd'hui)
        now = datetime.now(timezone.utc)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        poste = PosteReception(
            id=uuid.uuid4(),
            opened_by_user_id=user.id,
            opened_at=start_of_today + timedelta(hours=1),
            status=PosteReceptionStatus.OPENED.value,
        )
        db_session.add(poste)
        db_session.commit()

        # Créer ticket ouvert
        ticket = TicketDepot(
            id=uuid.uuid4(),
            poste_id=poste.id,
            benevole_user_id=user.id,
            status=TicketDepotStatus.OPENED.value,
        )
        db_session.add(ticket)
        db_session.commit()

        # Créer 2 lignes entrée
        ligne_entry1 = LigneDepot(
            id=uuid.uuid4(),
            ticket_id=ticket.id,
            category_id=category.id,
            poids_kg=Decimal("12.000"),
            destination=Destination.MAGASIN,
            is_exit=False,
        )
        ligne_entry2 = LigneDepot(
            id=uuid.uuid4(),
            ticket_id=ticket.id,
            category_id=category.id,
            poids_kg=Decimal("8.000"),
            destination=Destination.MAGASIN,
            is_exit=False,
        )

        # Créer 2 lignes sortie
        ligne_exit1 = LigneDepot(
            id=uuid.uuid4(),
            ticket_id=ticket.id,
            category_id=category.id,
            poids_kg=Decimal("3.000"),
            destination=Destination.RECYCLAGE,
            is_exit=True,
        )
        ligne_exit2 = LigneDepot(
            id=uuid.uuid4(),
            ticket_id=ticket.id,
            category_id=category.id,
            poids_kg=Decimal("2.500"),
            destination=Destination.DECHETERIE,
            is_exit=True,
        )

        db_session.add_all([ligne_entry1, ligne_entry2, ligne_exit1, ligne_exit2])
        db_session.commit()

        # Calculer weight_in et weight_out
        service = ReceptionLiveStatsService(db_session)
        threshold = now - timedelta(hours=24)
        weight_in = service._calculate_weight_in(None, threshold, start_of_today)
        weight_out = service._calculate_weight_out(None, threshold, start_of_today)

        # weight_in = 12 + 8 = 20kg (uniquement entrées)
        assert weight_in == Decimal("20.000"), f"weight_in devrait être 20.000, obtenu {weight_in}"

        # weight_out = 3 + 2.5 = 5.5kg (uniquement sorties, pas de ventes)
        assert weight_out == Decimal("5.500"), f"weight_out devrait être 5.500, obtenu {weight_out}"

