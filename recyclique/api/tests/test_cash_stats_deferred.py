"""
Tests for cash session stats filtering - exclusion of deferred sessions.

Tests verify that live stats exclude sessions with opened_at in the past (deferred sessions).
"""
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.orm import Session

from decimal import Decimal

from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.category import Category
from recyclic_api.models.ligne_depot import LigneDepot, Destination
from recyclic_api.models.poste_reception import PosteReception, PosteReceptionStatus
from recyclic_api.models.ticket_depot import TicketDepot, TicketDepotStatus
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.sale import Sale
from recyclic_api.models.sale_item import SaleItem
from recyclic_api.services.cash_session_service import CashSessionService
from recyclic_api.core.security import hash_password


class TestCashSessionStatsDeferred:
    """Tests for cash session stats excluding deferred sessions."""

    def test_stats_exclude_deferred_sessions(self, db_session: Session):
        """Test that stats exclude sessions with opened_at in the past (deferred)."""
        # Create operator
        operator = User(
            id=uuid.uuid4(),
            username="operator@test.com",
            hashed_password=hash_password("testpass"),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
        )
        db_session.add(operator)
        db_session.commit()

        # Dates figées (UTC) : évite toute ambiguïté « minuit » / horloge entre deux appels à now().
        now = datetime(2024, 6, 15, 18, 30, tzinfo=timezone.utc)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday = start_of_today - timedelta(days=1)
        site_id = uuid.uuid4()

        # Create normal session (opened today)
        normal_session = CashSession(
            id=uuid.uuid4(),
            operator_id=operator.id,
            site_id=site_id,
            initial_amount=50.0,
            current_amount=50.0,
            status=CashSessionStatus.OPEN,
            opened_at=start_of_today + timedelta(hours=2),  # Today
        )
        
        # Create deferred session (opened yesterday but created today)
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

        # Create sales for both sessions
        normal_sale = Sale(
            id=uuid.uuid4(),
            cash_session_id=normal_session.id,
            operator_id=operator.id,
            total_amount=25.0,
            donation=2.0,
            created_at=start_of_today + timedelta(hours=3),
        )
        
        deferred_sale = Sale(
            id=uuid.uuid4(),
            cash_session_id=deferred_session.id,
            operator_id=operator.id,
            total_amount=50.0,
            donation=5.0,
            created_at=now,  # Created today but in deferred session
        )
        
        db_session.add_all([normal_sale, deferred_sale])
        db_session.commit()

        # Create sale items
        normal_item = SaleItem(
            id=uuid.uuid4(),
            sale_id=normal_sale.id,
            category="EEE-1",
            quantity=1,
            weight=2.5,
            unit_price=25.0,
            total_price=25.0,
        )
        
        deferred_item = SaleItem(
            id=uuid.uuid4(),
            sale_id=deferred_sale.id,
            category="EEE-2",
            quantity=1,
            weight=5.0,
            unit_price=50.0,
            total_price=50.0,
        )
        
        db_session.add_all([normal_item, deferred_item])
        db_session.commit()

        # Get stats for today
        service = CashSessionService(db_session)
        stats = service.get_session_stats(
            date_from=start_of_today,
            date_to=now,
            site_id=str(site_id)
        )

        # Verify that only the normal session is included
        assert stats["total_sessions"] == 1, "Should only count normal session"
        assert stats["open_sessions"] == 1, "Should only count normal session"
        assert stats["closed_sessions"] == 0, "Deferred session should be excluded"
        # KPI total_sales = somme (total_amount - donation) sur les ventes (hors part « don » du ticket).
        assert stats["total_sales"] == 23.0, "Should only include normal sale net of donation"
        assert stats["number_of_sales"] == 1, "Should only count normal sale"
        assert stats["total_donations"] == 2.0, "Should only include normal donation"
        assert stats["total_items"] == 1, "Should only count normal item"
        assert stats["total_weight_sold"] == 2.5, "Should only include normal weight"

    def test_stats_include_normal_sessions_today(self, db_session: Session):
        """Test that stats include normal sessions opened today."""
        # Create operator
        operator = User(
            id=uuid.uuid4(),
            username="operator@test.com",
            hashed_password=hash_password("testpass"),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
        )
        db_session.add(operator)
        db_session.commit()

        now = datetime(2024, 6, 15, 16, 0, tzinfo=timezone.utc)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        site_id = uuid.uuid4()

        # Create two normal sessions (opened today)
        session1 = CashSession(
            id=uuid.uuid4(),
            operator_id=operator.id,
            site_id=site_id,
            initial_amount=50.0,
            current_amount=50.0,
            status=CashSessionStatus.OPEN,
            opened_at=start_of_today + timedelta(hours=1),
        )
        
        session2 = CashSession(
            id=uuid.uuid4(),
            operator_id=operator.id,
            site_id=site_id,
            initial_amount=100.0,
            current_amount=100.0,
            status=CashSessionStatus.CLOSED,
            opened_at=start_of_today + timedelta(hours=2),
            closed_at=start_of_today + timedelta(hours=4),
        )
        
        db_session.add_all([session1, session2])
        db_session.commit()

        # Get stats for today
        service = CashSessionService(db_session)
        stats = service.get_session_stats(
            date_from=start_of_today,
            date_to=now,
            site_id=str(site_id)
        )

        # Verify that both normal sessions are included
        assert stats["total_sessions"] == 2, "Should count both normal sessions"
        assert stats["open_sessions"] == 1, "Should count open session"
        assert stats["closed_sessions"] == 1, "Should count closed session"

    def test_stats_include_exit_reception_weight_without_date_filter(self, db_session: Session):
        """Le KPI global 'poids sorti' doit aussi refléter les sorties réception hors filtre daté."""
        operator = User(
            id=uuid.uuid4(),
            username="operator-exit@test.com",
            hashed_password=hash_password("testpass"),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
        )
        site_id = uuid.uuid4()
        session = CashSession(
            id=uuid.uuid4(),
            operator_id=operator.id,
            site_id=site_id,
            initial_amount=50.0,
            current_amount=50.0,
            status=CashSessionStatus.CLOSED,
            opened_at=datetime.now(timezone.utc) - timedelta(days=1),
            closed_at=datetime.now(timezone.utc) - timedelta(hours=20),
        )
        poste = PosteReception(
            id=uuid.uuid4(),
            opened_by_user_id=operator.id,
            status=PosteReceptionStatus.OPENED.value,
        )
        ticket = TicketDepot(
            id=uuid.uuid4(),
            poste_id=poste.id,
            benevole_user_id=operator.id,
            status=TicketDepotStatus.CLOSED.value,
            created_at=datetime.now(timezone.utc) - timedelta(hours=3),
        )
        category = Category(
            id=uuid.uuid4(),
            name="EEE-EXIT",
            is_active=True,
            parent_id=None,
        )
        exit_line = LigneDepot(
            id=uuid.uuid4(),
            ticket_id=ticket.id,
            category_id=category.id,
            poids_kg=Decimal("7.2"),
            destination=Destination.MAGASIN,
            is_exit=True,
        )
        db_session.add_all([operator, session, poste, category, ticket, exit_line])
        db_session.commit()

        service = CashSessionService(db_session)
        stats = service.get_session_stats(site_id=str(site_id))

        assert stats["total_weight_sold"] == 7.2














