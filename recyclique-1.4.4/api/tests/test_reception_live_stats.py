"""
Tests for ReceptionLiveStatsService and live stats endpoint.
"""
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from recyclic_api.models.ticket_depot import TicketDepot, TicketDepotStatus
from recyclic_api.models.ligne_depot import LigneDepot
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.sale import Sale
from recyclic_api.models.sale_item import SaleItem
from recyclic_api.models.category import Category
from recyclic_api.models.poste_reception import PosteReception, PosteReceptionStatus
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.services.reception_stats_service import ReceptionLiveStatsService
from recyclic_api.core.config import settings
from recyclic_api.core.security import hash_password


class TestReceptionLiveStatsService:
    """Unit tests for ReceptionLiveStatsService."""

    def test_count_open_tickets_no_tickets(self, db_session: Session):
        """Test counting open tickets when none exist."""
        service = ReceptionLiveStatsService(db_session)
        now = datetime.now(timezone.utc)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        count = service._count_open_tickets(None, start_of_today)
        assert count == 0

    def test_count_open_tickets_with_open_and_closed(self, db_session: Session):
        """Test counting open tickets with mix of open and closed."""
        # Create test data
        user = User(
            id=uuid.uuid4(),
            username="test@example.com",
            hashed_password="hash",
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        
        # Create poste with opened_at today
        now = datetime.now(timezone.utc)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        poste = PosteReception(
            id=uuid.uuid4(),
            opened_by_user_id=user.id,
            opened_at=start_of_today + timedelta(hours=1),  # Today
            status=PosteReceptionStatus.OPENED.value
        )
        db_session.add(poste)
        db_session.commit()

        # Create open ticket
        open_ticket = TicketDepot(
            poste_id=poste.id,
            benevole_user_id=user.id,
            status=TicketDepotStatus.OPENED.value
        )

        # Create closed ticket
        closed_ticket = TicketDepot(
            poste_id=poste.id,
            benevole_user_id=user.id,
            status=TicketDepotStatus.CLOSED.value,
            closed_at=datetime.now(timezone.utc) - timedelta(hours=1)
        )

        db_session.add_all([open_ticket, closed_ticket])
        db_session.commit()

        service = ReceptionLiveStatsService(db_session)
        now = datetime.now(timezone.utc)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        count = service._count_open_tickets(None, start_of_today)
        assert count == 1

    def test_count_closed_tickets_24h_no_recent_closures(self, db_session: Session):
        """Test counting closed tickets when none closed in last 24h."""
        service = ReceptionLiveStatsService(db_session)
        now = datetime.now(timezone.utc)
        threshold = now - timedelta(hours=24)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        count = service._count_closed_tickets_24h(None, threshold, start_of_today)
        assert count == 0

    def test_count_closed_tickets_24h_with_recent_and_old(self, db_session: Session):
        """Test counting closed tickets with mix of recent and old closures."""
        # Create test data
        poste = PosteReception(
            id=uuid.uuid4(),
            opened_by_user_id=user.id,
            opened_at=datetime.now(timezone.utc),
            status=PosteReceptionStatus.OPENED.value
        )
        user = User(
            id=uuid.uuid4(),
            username="test@example.com",
            hashed_password="hash",
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        db_session.add_all([poste, user])
        db_session.commit()

        # Create recently closed ticket (2 hours ago)
        recent_ticket = TicketDepot(
            poste_id=poste.id,
            benevole_user_id=user.id,
            status=TicketDepotStatus.CLOSED.value,
            closed_at=datetime.now(timezone.utc) - timedelta(hours=2)
        )

        # Create old closed ticket (48 hours ago)
        old_ticket = TicketDepot(
            poste_id=poste.id,
            benevole_user_id=user.id,
            status=TicketDepotStatus.CLOSED.value,
            closed_at=datetime.now(timezone.utc) - timedelta(hours=48)
        )

        db_session.add_all([recent_ticket, old_ticket])
        db_session.commit()

        service = ReceptionLiveStatsService(db_session)
        now = datetime.now(timezone.utc)
        threshold = now - timedelta(hours=24)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        count = service._count_closed_tickets_24h(None, threshold, start_of_today)
        assert count == 1

    def test_calculate_turnover_24h_no_sales(self, db_session: Session):
        """Test calculating turnover when no sales exist."""
        service = ReceptionLiveStatsService(db_session)
        now = datetime.now(timezone.utc)
        threshold = now - timedelta(hours=24)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        turnover = service._calculate_turnover_24h(None, threshold, start_of_today)
        assert turnover == Decimal('0')

    def test_calculate_turnover_24h_with_sales(self, db_session: Session):
        """Test calculating turnover with recent sales."""
        # Create test data
        user = User(
            id=uuid.uuid4(),
            username="test@example.com",
            hashed_password=hash_password("testpass"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        
        # Create real cash session (opened today)
        now = datetime.now(timezone.utc)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        session = CashSession(
            id=uuid.uuid4(),
            operator_id=user.id,
            site_id=uuid.uuid4(),
            initial_amount=50.0,
            current_amount=50.0,
            status=CashSessionStatus.CLOSED,
            opened_at=start_of_today + timedelta(hours=1),  # Today
            closed_at=start_of_today + timedelta(hours=3),
        )
        db_session.add(session)
        db_session.commit()

        # Create recent sale (2 hours ago)
        recent_sale = Sale(
            id=uuid.uuid4(),
            cash_session_id=session.id,
            operator_id=user.id,
            total_amount=100.50,
            created_at=datetime.now(timezone.utc) - timedelta(hours=2)
        )

        # Create old sale (48 hours ago)
        old_sale = Sale(
            id=uuid.uuid4(),
            cash_session_id=session.id,
            operator_id=user.id,
            total_amount=50.25,
            created_at=datetime.now(timezone.utc) - timedelta(hours=48)
        )

        db_session.add_all([user, recent_sale, old_sale])
        db_session.commit()

        service = ReceptionLiveStatsService(db_session)
        now = datetime.now(timezone.utc)
        threshold = now - timedelta(hours=24)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        turnover = service._calculate_turnover_24h(None, threshold, start_of_today)
        assert turnover == Decimal('100.50')

    def test_calculate_donations_24h_no_donations(self, db_session: Session):
        """Test calculating donations when none exist."""
        service = ReceptionLiveStatsService(db_session)
        now = datetime.now(timezone.utc)
        threshold = now - timedelta(hours=24)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        donations = service._calculate_donations_24h(None, threshold, start_of_today)
        assert donations == Decimal('0')

    def test_calculate_donations_24h_with_donations(self, db_session: Session):
        """Test calculating donations with recent donations."""
        # Create test data
        user = User(
            id=uuid.uuid4(),
            username="test@example.com",
            hashed_password=hash_password("testpass"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        
        # Create real cash session (opened today)
        now = datetime.now(timezone.utc)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        session = CashSession(
            id=uuid.uuid4(),
            operator_id=user.id,
            site_id=uuid.uuid4(),
            initial_amount=50.0,
            current_amount=50.0,
            status=CashSessionStatus.CLOSED,
            opened_at=start_of_today + timedelta(hours=1),  # Today
            closed_at=start_of_today + timedelta(hours=3),
        )
        db_session.add(session)
        db_session.commit()

        # Create sale with donation (2 hours ago)
        sale_with_donation = Sale(
            id=uuid.uuid4(),
            cash_session_id=session.id,
            operator_id=user.id,
            total_amount=50.00,
            donation=5.50,
            created_at=datetime.now(timezone.utc) - timedelta(hours=2)
        )

        # Create sale without donation
        sale_no_donation = Sale(
            id=uuid.uuid4(),
            cash_session_id=session.id,
            operator_id=user.id,
            total_amount=25.00,
            donation=0.00,
            created_at=datetime.now(timezone.utc) - timedelta(hours=2)
        )

        # Create old donation (48 hours ago)
        old_sale = Sale(
            id=uuid.uuid4(),
            cash_session_id=session.id,
            operator_id=user.id,
            total_amount=30.00,
            donation=3.00,
            created_at=datetime.now(timezone.utc) - timedelta(hours=48)
        )

        db_session.add_all([user, sale_with_donation, sale_no_donation, old_sale])
        db_session.commit()

        service = ReceptionLiveStatsService(db_session)
        now = datetime.now(timezone.utc)
        threshold = now - timedelta(hours=24)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        donations = service._calculate_donations_24h(None, threshold, start_of_today)
        assert donations == Decimal('5.50')

    def test_calculate_weight_in_open_and_recent_closed(self, db_session: Session):
        """Test calculating weight received from open tickets and recently closed."""
        # Create test data
        poste = PosteReception(
            id=uuid.uuid4(),
            opened_by_user_id=user.id,
            opened_at=datetime.now(timezone.utc),
            status=PosteReceptionStatus.OPENED.value
        )
        user = User(
            id=uuid.uuid4(),
            username="test@example.com",
            hashed_password="hash",
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        category = Category(id=uuid.uuid4(), name="Test Category", is_active=True)

        db_session.add_all([poste, user, category])
        db_session.commit()

        # Create open ticket with weight
        open_ticket = TicketDepot(
            poste_id=poste.id,
            benevole_user_id=user.id,
            status=TicketDepotStatus.OPENED.value
        )
        open_line = LigneDepot(
            ticket=open_ticket,
            category_id=category.id,
            poids_kg=10.5
        )

        # Create recently closed ticket with weight (2 hours ago)
        recent_closed_ticket = TicketDepot(
            poste_id=poste.id,
            benevole_user_id=user.id,
            status=TicketDepotStatus.CLOSED.value,
            closed_at=datetime.now(timezone.utc) - timedelta(hours=2)
        )
        recent_line = LigneDepot(
            ticket=recent_closed_ticket,
            category_id=category.id,
            poids_kg=5.25
        )

        # Create old closed ticket with weight (48 hours ago)
        old_closed_ticket = TicketDepot(
            poste_id=poste.id,
            benevole_user_id=user.id,
            status=TicketDepotStatus.CLOSED.value,
            closed_at=datetime.now(timezone.utc) - timedelta(hours=48)
        )
        old_line = LigneDepot(
            ticket=old_closed_ticket,
            category_id=category.id,
            poids_kg=15.75
        )

        db_session.add_all([open_ticket, open_line, recent_closed_ticket, recent_line, old_closed_ticket, old_line])
        db_session.commit()

        service = ReceptionLiveStatsService(db_session)
        now = datetime.now(timezone.utc)
        threshold = now - timedelta(hours=24)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        weight_in = service._calculate_weight_in(None, threshold, start_of_today)
        assert weight_in == Decimal('15.75')  # 10.5 + 5.25, old weight excluded

    def test_calculate_weight_out_recent_sales(self, db_session: Session):
        """Test calculating weight sold from recent sales."""
        # Create test data
        user = User(
            id=uuid.uuid4(),
            username="test@example.com",
            hashed_password=hash_password("testpass"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        
        # Create real cash session (opened today)
        now = datetime.now(timezone.utc)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        session = CashSession(
            id=uuid.uuid4(),
            operator_id=user.id,
            site_id=uuid.uuid4(),
            initial_amount=50.0,
            current_amount=50.0,
            status=CashSessionStatus.CLOSED,
            opened_at=start_of_today + timedelta(hours=1),  # Today
            closed_at=start_of_today + timedelta(hours=3),
        )
        db_session.add(session)
        db_session.commit()

        # Create recent sale with items (2 hours ago)
        recent_sale = Sale(
            id=uuid.uuid4(),
            cash_session_id=session.id,
            operator_id=user.id,
            total_amount=50.00,
            created_at=datetime.now(timezone.utc) - timedelta(hours=2)
        )
        recent_item1 = SaleItem(
            id=uuid.uuid4(),
            sale_id=recent_sale.id,
            weight=2.5
        )
        recent_item2 = SaleItem(
            id=uuid.uuid.uuid4(),
            sale_id=recent_sale.id,
            weight=3.75
        )

        # Create old sale with items (48 hours ago)
        old_sale = Sale(
            id=uuid.uuid4(),
            cash_session_id=session.id,
            operator_id=user.id,
            total_amount=30.00,
            created_at=datetime.now(timezone.utc) - timedelta(hours=48)
        )
        old_item = SaleItem(
            id=uuid.uuid4(),
            sale_id=old_sale.id,
            weight=5.0
        )

        db_session.add_all([user, recent_sale, recent_item1, recent_item2, old_sale, old_item])
        db_session.commit()

        service = ReceptionLiveStatsService(db_session)
        now = datetime.now(timezone.utc)
        threshold = now - timedelta(hours=24)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        weight_out = service._calculate_weight_out(None, threshold, start_of_today)
        assert weight_out == Decimal('6.25')  # 2.5 + 3.75, old weight excluded

    @pytest.mark.asyncio
    async def test_get_live_stats_full_scenario(self, db_session: Session):
        """Test complete live stats calculation with realistic data."""
        # Create comprehensive test data
        user = User(
            id=uuid.uuid4(),
            username="test@example.com",
            hashed_password=hash_password("testpass"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        category = Category(id=uuid.uuid4(), name="Test Category", is_active=True)
        
        db_session.add_all([user, category])
        db_session.commit()
        
        # Create poste with opened_at today
        now = datetime.now(timezone.utc)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        poste = PosteReception(
            id=uuid.uuid4(),
            opened_by_user_id=user.id,
            opened_at=start_of_today + timedelta(hours=1),  # Today
            status=PosteReceptionStatus.OPENED.value
        )
        
        # Create real cash session (opened today)
        session = CashSession(
            id=uuid.uuid4(),
            operator_id=user.id,
            site_id=uuid.uuid4(),
            initial_amount=50.0,
            current_amount=50.0,
            status=CashSessionStatus.CLOSED,
            opened_at=start_of_today + timedelta(hours=1),  # Today
            closed_at=start_of_today + timedelta(hours=3),
        )

        db_session.add_all([poste, session])
        db_session.commit()

        # Create 2 open tickets with total 15kg
        for i in range(2):
            ticket = TicketDepot(
                poste_id=poste.id,
                benevole_user_id=user.id,
                status=TicketDepotStatus.OPENED.value
            )
            line = LigneDepot(
                ticket=ticket,
                category_id=category.id,
                poids_kg=7.5
            )
            db_session.add_all([ticket, line])

        # Create 3 recently closed tickets with total 22.5kg
        for i in range(3):
            ticket = TicketDepot(
                poste_id=poste.id,
                benevole_user_id=user.id,
                status=TicketDepotStatus.CLOSED.value,
                closed_at=datetime.now(timezone.utc) - timedelta(hours=2)
            )
            line = LigneDepot(
                ticket=ticket,
                category_id=category.id,
                poids_kg=7.5
            )
            db_session.add_all([ticket, line])

        # Create recent sales: 2 sales, €150 total, €12 donations, 18kg weight
        for i in range(2):
            sale = Sale(
                id=uuid.uuid4(),
                cash_session_id=session.id,
                operator_id=user.id,
                total_amount=75.0,
                donation=6.0,
                created_at=datetime.now(timezone.utc) - timedelta(hours=3)
            )
            item = SaleItem(
                id=uuid.uuid4(),
                sale_id=sale.id,
                weight=9.0
            )
            db_session.add_all([sale, item])

        db_session.commit()

        service = ReceptionLiveStatsService(db_session)
        stats = await service.get_live_stats()

        assert stats["tickets_open"] == 2
        assert stats["tickets_closed_24h"] == 3
        assert stats["turnover_eur"] == 150.0
        assert stats["donations_eur"] == 12.0
        assert stats["weight_in"] == 37.5  # 15 + 22.5
        assert stats["weight_out"] == 18.0


class TestReceptionLiveStatsEndpoint:
    """API tests for the live stats endpoint."""

    def test_endpoint_requires_admin_auth(self, client):
        """Test that endpoint requires admin authentication."""
        response = client.get("/v1/reception/stats/live")
        assert response.status_code == 401

    def test_endpoint_requires_admin_role(self, db_session: Session):
        """Test that endpoint requires admin role."""
        # Create regular user (not admin)
        user = User(
            id=uuid.uuid4(),
            username="regular@example.com",
            hashed_password="hash",
            role=UserRole.USER,  # Not admin
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()

        from recyclic_api.core.auth import create_access_token
        token = create_access_token(data={"sub": str(user.id)})

        # Test with regular user
        response = client.get(
            "/v1/reception/stats/live",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403

    def test_endpoint_success_with_admin_role(self, admin_client):
        """Test successful response with admin role."""
        response = admin_client.get("/v1/reception/stats/live")
        assert response.status_code == 200

        data = response.json()
        assert "tickets_open" in data
        assert "tickets_closed_24h" in data
        assert "turnover_eur" in data
        assert "donations_eur" in data
        assert "weight_in" in data
        assert "weight_out" in data

        # All values should be numbers
        assert isinstance(data["tickets_open"], int)
        assert isinstance(data["tickets_closed_24h"], int)
        assert isinstance(data["turnover_eur"], float)
        assert isinstance(data["donations_eur"], float)
        assert isinstance(data["weight_in"], float)
        assert isinstance(data["weight_out"], float)

    def test_endpoint_with_feature_flag_disabled(self, admin_client, monkeypatch):
        """Test endpoint behavior when feature flag is disabled."""
        # Disable feature flag
        monkeypatch.setattr(settings, 'LIVE_RECEPTION_STATS_ENABLED', False)

        response = admin_client.get("/v1/reception/stats/live")
        assert response.status_code == 200

        data = response.json()
        # Should return all zeros
        assert data["tickets_open"] == 0
        assert data["tickets_closed_24h"] == 0
        assert data["turnover_eur"] == 0.0
        assert data["donations_eur"] == 0.0
        assert data["weight_in"] == 0.0
        assert data["weight_out"] == 0.0

    @pytest.mark.performance
    def test_endpoint_performance_under_load(self, admin_client, db_session: Session):
        """Performance test to ensure endpoint responds within 500ms."""
        import time

        # Create some test data to simulate load
        poste = PosteReception(
            id=uuid.uuid4(),
            opened_by_user_id=user.id,
            opened_at=datetime.now(timezone.utc),
            status=PosteReceptionStatus.OPENED.value
        )
        user = User(
            id=uuid.uuid4(),
            username="test@example.com",
            hashed_password="hash",
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        category = Category(id=uuid.uuid4(), name="Test Category", is_active=True)

        db_session.add_all([poste, user, category])
        db_session.commit()

        # Create 50 tickets with lines to simulate realistic load
        for i in range(50):
            ticket = TicketDepot(
                poste_id=poste.id,
                benevole_user_id=user.id,
                status=TicketDepotStatus.OPENED.value if i < 25 else TicketDepotStatus.CLOSED.value,
                closed_at=datetime.now(timezone.utc) - timedelta(hours=1) if i >= 25 else None
            )
            line = LigneDepot(
                ticket=ticket,
                category_id=category.id,
                poids_kg=2.0
            )
            db_session.add_all([ticket, line])

        db_session.commit()

        # Measure response time
        start_time = time.time()
        response = admin_client.get("/v1/reception/stats/live")
        end_time = time.time()

        response_time_ms = (end_time - start_time) * 1000

        assert response.status_code == 200
        assert response_time_ms < 500  # Should respond within 500ms


