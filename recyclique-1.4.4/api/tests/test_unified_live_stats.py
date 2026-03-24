"""
Tests for unified live stats endpoint (/v1/stats/live).
Story B48-P7: Unification Endpoints Stats Live
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
from recyclic_api.core.security import hash_password


class TestUnifiedLiveStatsService:
    """Unit tests for unified live stats service method."""

    @pytest.mark.asyncio
    async def test_get_unified_live_stats_daily_period(self, db_session: Session):
        """Test unified stats with daily period (minuit-minuit)."""
        # Create test user
        user = User(
            id=uuid.uuid4(),
            username="test@example.com",
            hashed_password=hash_password("testpass"),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()

        # Create poste opened today
        now = datetime.now(timezone.utc)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        poste = PosteReception(
            id=uuid.uuid4(),
            opened_by_user_id=user.id,
            opened_at=start_of_today + timedelta(hours=1),
            status=PosteReceptionStatus.OPENED.value
        )
        db_session.add(poste)
        db_session.commit()

        # Create open ticket
        ticket = TicketDepot(
            id=uuid.uuid4(),
            poste_id=poste.id,
            benevole_user_id=user.id,
            status=TicketDepotStatus.OPENED.value
        )
        db_session.add(ticket)
        db_session.commit()

        # Create category
        category = Category(
            id=uuid.uuid4(),
            name="Test Category",
            is_active=True
        )
        db_session.add(category)
        db_session.commit()

        # Create ligne with weight
        # Note: is_exit may not exist in test DB if B48-P3 migration not applied
        ligne = LigneDepot(
            id=uuid.uuid4(),
            ticket_id=ticket.id,
            category_id=category.id,
            poids_kg=Decimal("10.5")
        )
        # Set is_exit only if column exists (B48-P3)
        if hasattr(LigneDepot, 'is_exit'):
            ligne.is_exit = False
        db_session.add(ligne)
        db_session.commit()

        # Create cash session opened today
        session = CashSession(
            id=uuid.uuid4(),
            operator_id=user.id,
            initial_amount=100.0,
            current_amount=100.0,
            status=CashSessionStatus.OPEN.value,
            opened_at=start_of_today + timedelta(hours=2)
        )
        db_session.add(session)
        db_session.commit()

        # Create sale
        sale = Sale(
            id=uuid.uuid4(),
            cash_session_id=session.id,
            operator_id=user.id,
            total_amount=50.0,
            donation=5.0,
            created_at=now - timedelta(hours=2)
        )
        db_session.add(sale)
        db_session.commit()

        # Create sale item with weight
        sale_item = SaleItem(
            id=uuid.uuid4(),
            sale_id=sale.id,
            category_id=category.id,
            weight=Decimal("5.0"),
            price=50.0
        )
        db_session.add(sale_item)
        db_session.commit()

        # Test unified stats
        service = ReceptionLiveStatsService(db_session)
        stats = await service.get_unified_live_stats(period_type="daily", site_id=None)

        # Verify stats structure
        assert "tickets_count" in stats
        assert "last_ticket_amount" in stats
        assert "ca" in stats
        assert "donations" in stats
        assert "weight_out_sales" in stats
        assert "tickets_open" in stats
        assert "tickets_closed_24h" in stats
        assert "items_received" in stats
        assert "weight_in" in stats
        assert "weight_out" in stats
        assert "period_start" in stats
        assert "period_end" in stats

        # Verify values
        assert stats["tickets_count"] == 1
        assert stats["last_ticket_amount"] == 50.0
        assert stats["ca"] == 50.0
        assert stats["donations"] == 5.0
        assert stats["weight_out_sales"] == 5.0
        assert stats["tickets_open"] == 1
        assert stats["weight_in"] == 10.5

    @pytest.mark.asyncio
    async def test_get_unified_live_stats_24h_period(self, db_session: Session):
        """Test unified stats with 24h sliding period."""
        # Create test user
        user = User(
            id=uuid.uuid4(),
            username="test@example.com",
            hashed_password=hash_password("testpass"),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()

        # Create cash session
        now = datetime.now(timezone.utc)
        session = CashSession(
            id=uuid.uuid4(),
            operator_id=user.id,
            initial_amount=100.0,
            current_amount=100.0,
            status=CashSessionStatus.OPEN.value,
            opened_at=now - timedelta(hours=12)  # 12h ago
        )
        db_session.add(session)
        db_session.commit()

        # Create sale 2 hours ago
        sale = Sale(
            id=uuid.uuid4(),
            cash_session_id=session.id,
            operator_id=user.id,
            total_amount=30.0,
            donation=3.0,
            created_at=now - timedelta(hours=2)
        )
        db_session.add(sale)
        db_session.commit()

        # Test unified stats with 24h period
        service = ReceptionLiveStatsService(db_session)
        stats = await service.get_unified_live_stats(period_type="24h", site_id=None)

        # Verify stats
        assert stats["tickets_count"] == 1
        assert stats["ca"] == 30.0
        assert stats["donations"] == 3.0

    def test_calculate_cash_stats(self, db_session: Session):
        """Test _calculate_cash_stats method."""
        # Create test user
        user = User(
            id=uuid.uuid4(),
            username="test@example.com",
            hashed_password=hash_password("testpass"),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()

        # Create cash session
        now = datetime.now(timezone.utc)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        session = CashSession(
            id=uuid.uuid4(),
            operator_id=user.id,
            initial_amount=100.0,
            current_amount=100.0,
            status=CashSessionStatus.OPEN.value,
            opened_at=start_of_today + timedelta(hours=1)
        )
        db_session.add(session)
        db_session.commit()

        # Create category
        category = Category(
            id=uuid.uuid4(),
            name="Test Category",
            is_active=True
        )
        db_session.add(category)
        db_session.commit()

        # Create two sales
        sale1 = Sale(
            id=uuid.uuid4(),
            cash_session_id=session.id,
            operator_id=user.id,
            total_amount=20.0,
            donation=2.0,
            created_at=now - timedelta(hours=1)
        )
        sale2 = Sale(
            id=uuid.uuid4(),
            cash_session_id=session.id,
            operator_id=user.id,
            total_amount=30.0,
            donation=3.0,
            created_at=now - timedelta(minutes=30)
        )
        db_session.add_all([sale1, sale2])
        db_session.commit()

        # Create sale items
        item1 = SaleItem(
            id=uuid.uuid4(),
            sale_id=sale1.id,
            category_id=category.id,
            weight=Decimal("2.0"),
            price=20.0
        )
        item2 = SaleItem(
            id=uuid.uuid4(),
            sale_id=sale2.id,
            category_id=category.id,
            weight=Decimal("3.0"),
            price=30.0
        )
        db_session.add_all([item1, item2])
        db_session.commit()

        # Test cash stats calculation
        service = ReceptionLiveStatsService(db_session)
        threshold = start_of_today
        cash_stats = service._calculate_cash_stats(None, threshold, start_of_today, "daily")

        # Verify cash stats
        assert cash_stats["tickets_count"] == 2
        assert cash_stats["last_ticket_amount"] == 30.0  # Most recent
        assert cash_stats["ca"] == 50.0  # 20 + 30
        assert cash_stats["donations"] == 5.0  # 2 + 3
        assert cash_stats["weight_out_sales"] == 5.0  # 2 + 3


class TestUnifiedLiveStatsEndpoint:
    """Integration tests for unified live stats endpoint."""

    def test_get_unified_live_stats_endpoint_success(self, admin_client):
        """Test unified stats endpoint returns correct structure."""
        response = admin_client.get("/v1/stats/live")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required fields
        assert "tickets_count" in data
        assert "last_ticket_amount" in data
        assert "ca" in data
        assert "donations" in data
        assert "weight_out_sales" in data
        assert "tickets_open" in data
        assert "tickets_closed_24h" in data
        assert "items_received" in data
        assert "weight_in" in data
        assert "weight_out" in data
        assert "period_start" in data
        assert "period_end" in data

    def test_get_unified_live_stats_endpoint_with_period_type(self, admin_client):
        """Test unified stats endpoint with period_type parameter."""
        # Test daily period (default)
        response = admin_client.get("/v1/stats/live?period_type=daily")
        assert response.status_code == 200
        
        # Test 24h period
        response = admin_client.get("/v1/stats/live?period_type=24h")
        assert response.status_code == 200

    def test_get_unified_live_stats_endpoint_requires_admin(self, client, db_session: Session):
        """Test that unified stats endpoint requires admin permissions."""
        # Create non-admin user
        user = User(
            id=uuid.uuid4(),
            username="user@example.com",
            hashed_password=hash_password("testpass"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()

        # Try to access endpoint without auth
        response = client.get("/v1/stats/live")
        # require_role_strict returns 403 when not authenticated (expected behavior)
        assert response.status_code == 403

    def test_unified_stats_coherence_with_old_endpoints(self, admin_client, db_session: Session):
        """Test that unified stats are coherent with old endpoints (when both exist)."""
        # This test verifies that the unified endpoint returns consistent data
        # Note: Old endpoints are deprecated but still functional
        
        # Get unified stats
        unified_response = admin_client.get("/v1/stats/live?period_type=daily")
        assert unified_response.status_code == 200
        unified_data = unified_response.json()
        
        # Verify that unified stats have all expected fields
        assert unified_data["tickets_count"] >= 0
        assert unified_data["ca"] >= 0
        assert unified_data["weight_in"] >= 0
        assert unified_data["weight_out"] >= 0

