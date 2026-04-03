"""
Tests for reception live stats filtering - exclusion of deferred tickets and sales.

Tests verify that live stats exclude:
- Tickets from posts with opened_at in the past (deferred posts)
- Sales from sessions with opened_at in the past (deferred sessions)
"""
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.orm import Session

from recyclic_api.models.ticket_depot import TicketDepot, TicketDepotStatus
from recyclic_api.models.ligne_depot import LigneDepot
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.sale import Sale
from recyclic_api.models.sale_item import SaleItem
from recyclic_api.models.poste_reception import PosteReception, PosteReceptionStatus
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.services.reception_stats_service import ReceptionLiveStatsService
from recyclic_api.core.security import hash_password


class TestReceptionStatsDeferred:
    """Tests for reception live stats excluding deferred tickets and sales."""

    @pytest.mark.asyncio
    async def test_stats_exclude_deferred_tickets(self, db_session: Session):
        """Test that stats exclude tickets from posts opened in the past (deferred)."""
        # Create users
        benevole = User(
            id=uuid.uuid4(),
            username="benevole@test.com",
            hashed_password=hash_password("testpass"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
        )
        operator = User(
            id=uuid.uuid4(),
            username="operator@test.com",
            hashed_password=hash_password("testpass"),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
        )
        db_session.add_all([benevole, operator])
        db_session.commit()

        # Calculate dates
        now = datetime.now(timezone.utc)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday = start_of_today - timedelta(days=1)

        # Create normal post (opened today)
        normal_poste = PosteReception(
            id=uuid.uuid4(),
            opened_by_user_id=operator.id,
            opened_at=start_of_today + timedelta(hours=1),  # Today
            status=PosteReceptionStatus.OPENED.value,
        )
        
        # Create deferred post (opened yesterday)
        deferred_poste = PosteReception(
            id=uuid.uuid4(),
            opened_by_user_id=operator.id,
            opened_at=yesterday + timedelta(hours=10),  # Yesterday (deferred)
            status=PosteReceptionStatus.OPENED.value,
        )
        
        db_session.add_all([normal_poste, deferred_poste])
        db_session.commit()

        # Create tickets
        normal_ticket = TicketDepot(
            id=uuid.uuid4(),
            poste_id=normal_poste.id,
            benevole_user_id=benevole.id,
            status=TicketDepotStatus.OPENED.value,
            created_at=start_of_today + timedelta(hours=2),
        )
        
        deferred_ticket = TicketDepot(
            id=uuid.uuid4(),
            poste_id=deferred_poste.id,
            benevole_user_id=benevole.id,
            status=TicketDepotStatus.OPENED.value,
            created_at=now,  # Created today but in deferred post
        )
        
        db_session.add_all([normal_ticket, deferred_ticket])
        db_session.commit()

        # Create lignes
        normal_ligne = LigneDepot(
            id=uuid.uuid4(),
            ticket_id=normal_ticket.id,
            category="EEE-1",
            poids_kg=10.0,
        )
        
        deferred_ligne = LigneDepot(
            id=uuid.uuid4(),
            ticket_id=deferred_ticket.id,
            category="EEE-2",
            poids_kg=20.0,
        )
        
        db_session.add_all([normal_ligne, deferred_ligne])
        db_session.commit()

        # Get live stats
        service = ReceptionLiveStatsService(db_session)
        stats = await service.get_live_stats()

        # Verify that only the normal ticket is included
        assert stats["tickets_open"] == 1, "Should only count normal ticket"
        assert stats["weight_in"] == 10.0, "Should only include normal weight"

    @pytest.mark.asyncio
    async def test_stats_exclude_deferred_sales(self, db_session: Session):
        """Test that stats exclude sales from sessions opened in the past (deferred)."""
        # Create users
        operator = User(
            id=uuid.uuid4(),
            username="operator@test.com",
            hashed_password=hash_password("testpass"),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
        )
        db_session.add(operator)
        db_session.commit()

        # Calculate dates
        now = datetime.now(timezone.utc)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday = start_of_today - timedelta(days=1)
        threshold_24h = now - timedelta(hours=24)
        site_id = uuid.uuid4()

        # Create normal session (opened today)
        normal_session = CashSession(
            id=uuid.uuid4(),
            operator_id=operator.id,
            site_id=site_id,
            initial_amount=50.0,
            current_amount=50.0,
            status=CashSessionStatus.CLOSED,
            opened_at=start_of_today + timedelta(hours=1),  # Today
            closed_at=start_of_today + timedelta(hours=3),
        )
        
        # Create deferred session (opened yesterday)
        deferred_session = CashSession(
            id=uuid.uuid4(),
            operator_id=operator.id,
            site_id=site_id,
            initial_amount=100.0,
            current_amount=100.0,
            status=CashSessionStatus.CLOSED,
            opened_at=yesterday + timedelta(hours=10),  # Yesterday (deferred)
            closed_at=yesterday + timedelta(hours=12),
        )
        
        db_session.add_all([normal_session, deferred_session])
        db_session.commit()

        # Create sales
        normal_sale = Sale(
            id=uuid.uuid4(),
            cash_session_id=normal_session.id,
            operator_id=operator.id,
            total_amount=30.0,
            donation=3.0,
            created_at=threshold_24h + timedelta(hours=1),  # Within 24h
        )
        
        deferred_sale = Sale(
            id=uuid.uuid4(),
            cash_session_id=deferred_session.id,
            operator_id=operator.id,
            total_amount=60.0,
            donation=6.0,
            created_at=threshold_24h + timedelta(hours=1),  # Within 24h but from deferred session
        )
        
        db_session.add_all([normal_sale, deferred_sale])
        db_session.commit()

        # Create sale items
        normal_item = SaleItem(
            id=uuid.uuid4(),
            sale_id=normal_sale.id,
            category="EEE-1",
            quantity=1,
            weight=3.0,
            unit_price=30.0,
            total_price=30.0,
        )
        
        deferred_item = SaleItem(
            id=uuid.uuid4(),
            sale_id=deferred_sale.id,
            category="EEE-2",
            quantity=1,
            weight=6.0,
            unit_price=60.0,
            total_price=60.0,
        )
        
        db_session.add_all([normal_item, deferred_item])
        db_session.commit()

        # Get live stats
        service = ReceptionLiveStatsService(db_session)
        stats = await service.get_live_stats()

        # Verify that only the normal sale is included
        assert stats["turnover_eur"] == 30.0, "Should only include normal sale"
        assert stats["donations_eur"] == 3.0, "Should only include normal donation"
        assert stats["weight_out"] == 3.0, "Should only include normal weight"

    @pytest.mark.asyncio
    async def test_stats_include_normal_tickets_today(self, db_session: Session):
        """Test that stats include normal tickets from posts opened today."""
        # Create users
        benevole = User(
            id=uuid.uuid4(),
            username="benevole@test.com",
            hashed_password=hash_password("testpass"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
        )
        operator = User(
            id=uuid.uuid4(),
            username="operator@test.com",
            hashed_password=hash_password("testpass"),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
        )
        db_session.add_all([benevole, operator])
        db_session.commit()

        # Calculate dates
        now = datetime.now(timezone.utc)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # Create two normal posts (opened today)
        poste1 = PosteReception(
            id=uuid.uuid4(),
            opened_by_user_id=operator.id,
            opened_at=start_of_today + timedelta(hours=1),
            status=PosteReceptionStatus.OPENED.value,
        )
        
        poste2 = PosteReception(
            id=uuid.uuid4(),
            opened_by_user_id=operator.id,
            opened_at=start_of_today + timedelta(hours=2),
            status=PosteReceptionStatus.OPENED.value,
        )
        
        db_session.add_all([poste1, poste2])
        db_session.commit()

        # Create tickets
        ticket1 = TicketDepot(
            id=uuid.uuid4(),
            poste_id=poste1.id,
            benevole_user_id=benevole.id,
            status=TicketDepotStatus.OPENED.value,
            created_at=start_of_today + timedelta(hours=1, minutes=30),
        )
        
        ticket2 = TicketDepot(
            id=uuid.uuid4(),
            poste_id=poste2.id,
            benevole_user_id=benevole.id,
            status=TicketDepotStatus.OPENED.value,
            created_at=start_of_today + timedelta(hours=2, minutes=30),
        )
        
        db_session.add_all([ticket1, ticket2])
        db_session.commit()

        # Get live stats
        service = ReceptionLiveStatsService(db_session)
        stats = await service.get_live_stats()

        # Verify that both normal tickets are included
        assert stats["tickets_open"] == 2, "Should count both normal tickets"














