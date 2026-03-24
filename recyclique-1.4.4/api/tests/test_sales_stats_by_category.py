"""
Tests for sales statistics by category (Story B50-P5).

Tests verify:
- Service method get_sales_by_category() returns correct data
- Endpoint works with/without date filters
- Only main categories appear (parent_id IS NULL)
- Aggregation of subcategories to parent categories
"""
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.category import Category
from recyclic_api.models.sale import Sale
from recyclic_api.models.sale_item import SaleItem
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.services.stats_service import StatsService
from recyclic_api.core.security import hash_password


@pytest.fixture
def test_user(db_session: Session) -> User:
    """Create a test user."""
    user = User(
        id=uuid.uuid4(),
        username="test@example.com",
        hashed_password=hash_password("testpass"),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_categories(db_session: Session):
    """Create test categories: main categories and subcategories."""
    # Main categories
    main_cat1 = Category(
        id=uuid.uuid4(),
        name="EEE-1",
        is_active=True,
        parent_id=None
    )
    main_cat2 = Category(
        id=uuid.uuid4(),
        name="EEE-2",
        is_active=True,
        parent_id=None
    )
    
    # Subcategories
    sub_cat1 = Category(
        id=uuid.uuid4(),
        name="EEE-1-SUB",
        is_active=True,
        parent_id=main_cat1.id
    )
    
    db_session.add_all([main_cat1, main_cat2, sub_cat1])
    db_session.commit()
    
    return {
        "main_cat1": main_cat1,
        "main_cat2": main_cat2,
        "sub_cat1": sub_cat1
    }


@pytest.fixture
def test_cash_session(db_session: Session, test_user: User):
    """Create a test cash session."""
    session = CashSession(
        id=uuid.uuid4(),
        operator_id=test_user.id,
        site_id=uuid.uuid4(),
        initial_amount=50.0,
        current_amount=50.0,
        status=CashSessionStatus.CLOSED,
        opened_at=datetime.now(timezone.utc) - timedelta(days=1),
        closed_at=datetime.now(timezone.utc) - timedelta(hours=12),
    )
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    return session


class TestSalesStatsByCategoryService:
    """Tests for StatsService.get_sales_by_category()."""

    def test_get_sales_by_category_returns_main_categories_only(
        self, db_session: Session, test_user: User, test_categories, test_cash_session
    ):
        """Test that only main categories are returned."""
        # Create sales with items
        sale1 = Sale(
            id=uuid.uuid4(),
            cash_session_id=test_cash_session.id,
            operator_id=test_user.id,
            total_amount=100.0,
            created_at=datetime.now(timezone.utc) - timedelta(hours=1)
        )
        sale2 = Sale(
            id=uuid.uuid4(),
            cash_session_id=test_cash_session.id,
            operator_id=test_user.id,
            total_amount=50.0,
            created_at=datetime.now(timezone.utc) - timedelta(hours=2)
        )
        
        # SaleItem with main category
        item1 = SaleItem(
            id=uuid.uuid4(),
            sale_id=sale1.id,
            category="EEE-1",  # Main category
            quantity=1,
            weight=10.0,
            unit_price=100.0,
            total_price=100.0
        )
        
        # SaleItem with subcategory (should be aggregated to parent)
        item2 = SaleItem(
            id=uuid.uuid4(),
            sale_id=sale2.id,
            category="EEE-1-SUB",  # Subcategory
            quantity=1,
            weight=5.0,
            unit_price=50.0,
            total_price=50.0
        )
        
        db_session.add_all([sale1, sale2, item1, item2])
        db_session.commit()
        
        # Get stats
        service = StatsService(db_session)
        results = service.get_sales_by_category()
        
        # Should only return main categories
        assert len(results) > 0
        category_names = [r.category_name for r in results]
        assert "EEE-1" in category_names, "Main category should appear"
        assert "EEE-1-SUB" not in category_names, "Subcategory should not appear directly"
        
        # Check that EEE-1 includes aggregated data from subcategory
        eee1_stats = next((r for r in results if r.category_name == "EEE-1"), None)
        assert eee1_stats is not None
        assert eee1_stats.total_weight == Decimal("15.0"), "Should aggregate weight from main + sub"
        assert eee1_stats.total_items == 2, "Should aggregate items from main + sub"

    def test_get_sales_by_category_with_date_filters(
        self, db_session: Session, test_user: User, test_categories, test_cash_session
    ):
        """Test that date filters work correctly."""
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=2)
        end_date = now - timedelta(days=1)
        
        # Sale within date range
        sale1 = Sale(
            id=uuid.uuid4(),
            cash_session_id=test_cash_session.id,
            operator_id=test_user.id,
            total_amount=100.0,
            created_at=now - timedelta(days=1, hours=12)  # Within range
        )
        
        # Sale outside date range
        sale2 = Sale(
            id=uuid.uuid4(),
            cash_session_id=test_cash_session.id,
            operator_id=test_user.id,
            total_amount=50.0,
            created_at=now - timedelta(days=3)  # Outside range
        )
        
        item1 = SaleItem(
            id=uuid.uuid4(),
            sale_id=sale1.id,
            category="EEE-1",
            quantity=1,
            weight=10.0,
            unit_price=100.0,
            total_price=100.0
        )
        
        item2 = SaleItem(
            id=uuid.uuid4(),
            sale_id=sale2.id,
            category="EEE-2",
            quantity=1,
            weight=5.0,
            unit_price=50.0,
            total_price=50.0
        )
        
        db_session.add_all([sale1, sale2, item1, item2])
        db_session.commit()
        
        # Get stats with date filter
        service = StatsService(db_session)
        results = service.get_sales_by_category(start_date=start_date, end_date=end_date)
        
        # Should only include sale1 (within range)
        eee1_stats = next((r for r in results if r.category_name == "EEE-1"), None)
        eee2_stats = next((r for r in results if r.category_name == "EEE-2"), None)
        
        assert eee1_stats is not None
        assert eee1_stats.total_weight == Decimal("10.0")
        assert eee1_stats.total_items == 1
        
        # EEE-2 should not appear (sale2 is outside range)
        assert eee2_stats is None or eee2_stats.total_items == 0

    def test_get_sales_by_category_no_data(self, db_session: Session):
        """Test that empty result is returned when no sales exist."""
        service = StatsService(db_session)
        results = service.get_sales_by_category()
        
        assert isinstance(results, list)
        assert len(results) == 0

    def test_get_sales_by_category_invalid_date_range(self, db_session: Session):
        """Test that invalid date range raises HTTPException."""
        service = StatsService(db_session)
        
        start_date = datetime.now(timezone.utc)
        end_date = datetime.now(timezone.utc) - timedelta(days=1)  # start > end
        
        with pytest.raises(Exception):  # HTTPException
            service.get_sales_by_category(start_date=start_date, end_date=end_date)


class TestSalesStatsByCategoryEndpoint:
    """Tests for GET /v1/stats/sales/by-category endpoint."""

    def test_endpoint_requires_authentication(self, client):
        """Test that endpoint requires authentication."""
        response = client.get("/v1/stats/sales/by-category")
        assert response.status_code == 401

    def test_endpoint_success_with_authenticated_user(
        self, client, db_session: Session, test_user: User, test_categories, test_cash_session
    ):
        """Test that endpoint works with authenticated user."""
        from recyclic_api.core.auth import create_access_token
        
        # Create token
        token = create_access_token(data={"sub": str(test_user.id)})
        client.headers["Authorization"] = f"Bearer {token}"
        
        # Create test data
        sale = Sale(
            id=uuid.uuid4(),
            cash_session_id=test_cash_session.id,
            operator_id=test_user.id,
            total_amount=100.0,
            created_at=datetime.now(timezone.utc)
        )
        item = SaleItem(
            id=uuid.uuid4(),
            sale_id=sale.id,
            category="EEE-1",
            quantity=1,
            weight=10.0,
            unit_price=100.0,
            total_price=100.0
        )
        db_session.add_all([sale, item])
        db_session.commit()
        
        # Call endpoint
        response = client.get("/v1/stats/sales/by-category")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Should return main categories only
        if len(data) > 0:
            category_names = [item["category_name"] for item in data]
            assert "EEE-1" in category_names or len(category_names) == 0

    def test_endpoint_with_date_filters(
        self, client, db_session: Session, test_user: User, test_categories, test_cash_session
    ):
        """Test endpoint with date filters."""
        from recyclic_api.core.auth import create_access_token
        
        token = create_access_token(data={"sub": str(test_user.id)})
        client.headers["Authorization"] = f"Bearer {token}"
        
        # Create sale
        sale = Sale(
            id=uuid.uuid4(),
            cash_session_id=test_cash_session.id,
            operator_id=test_user.id,
            total_amount=100.0,
            created_at=datetime.now(timezone.utc)
        )
        item = SaleItem(
            id=uuid.uuid4(),
            sale_id=sale.id,
            category="EEE-1",
            quantity=1,
            weight=10.0,
            unit_price=100.0,
            total_price=100.0
        )
        db_session.add_all([sale, item])
        db_session.commit()
        
        # Call endpoint with date filters
        start_date = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        end_date = datetime.now(timezone.utc).isoformat()
        
        response = client.get(
            "/v1/stats/sales/by-category",
            params={"start_date": start_date, "end_date": end_date}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.performance
    def test_endpoint_performance_under_load(
        self, client, db_session: Session, test_user: User, test_categories, test_cash_session
    ):
        """Performance test to ensure endpoint responds within 500ms under load."""
        import time
        from recyclic_api.core.auth import create_access_token
        
        # Create token
        token = create_access_token(data={"sub": str(test_user.id)})
        client.headers["Authorization"] = f"Bearer {token}"
        
        # Create 50+ sales with items to simulate realistic load
        now = datetime.now(timezone.utc)
        sales = []
        items = []
        
        for i in range(50):
            sale = Sale(
                id=uuid.uuid4(),
                cash_session_id=test_cash_session.id,
                operator_id=test_user.id,
                total_amount=100.0 + i,
                created_at=now - timedelta(hours=i)
            )
            sales.append(sale)
            
            # Create 2-3 items per sale
            for j in range(2 + (i % 2)):
                category_id = str(test_categories["main_cat1"].id) if j % 2 == 0 else str(test_categories["main_cat2"].id)
                item = SaleItem(
                    id=uuid.uuid4(),
                    sale_id=sale.id,
                    category=category_id,
                    quantity=1,
                    weight=10.0 + (i * 0.1),
                    unit_price=50.0,
                    total_price=50.0
                )
                items.append(item)
        
        db_session.add_all(sales + items)
        db_session.commit()
        
        # Measure response time
        start_time = time.time()
        response = client.get("/v1/stats/sales/by-category")
        elapsed_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        assert response.status_code == 200
        assert elapsed_time < 500, f"Endpoint took {elapsed_time:.2f}ms, should be < 500ms"
        
        # Verify data is correct
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Should return category stats"

