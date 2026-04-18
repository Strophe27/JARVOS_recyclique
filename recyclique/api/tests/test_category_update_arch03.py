"""ARCH-03 : CategoryService.update_category sans HTTPException ; mapping PUT /categories/{id}."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from recyclic_api.core.config import settings
from recyclic_api.core.exceptions import ConflictError, ValidationError
from recyclic_api.schemas.category import CategoryUpdate
from recyclic_api.services.category_service import CategoryService

_V1 = settings.API_V1_STR.rstrip("/")


@pytest.mark.asyncio
async def test_update_duplicate_name_raises_validation_error():
    db = MagicMock()
    chain = MagicMock()
    db.query.return_value = chain
    category = MagicMock()
    category.name = "Old"
    category.parent_id = None
    dup = MagicMock()
    chain.filter.return_value.first.side_effect = [category, dup]
    chain.filter.return_value.count.return_value = 0
    service = CategoryService(db)
    cid = str(uuid4())
    with pytest.raises(ValidationError, match="already exists"):
        await service.update_category(cid, CategoryUpdate(name="NewName"))
    db.commit.assert_not_called()


@pytest.mark.asyncio
async def test_update_invalid_parent_id_format_raises_validation_error():
    db = MagicMock()
    chain = MagicMock()
    db.query.return_value = chain
    category = MagicMock()
    category.name = "X"
    category.parent_id = None
    chain.filter.return_value.first.return_value = category
    service = CategoryService(db)
    with pytest.raises(ValidationError, match="Invalid parent_id format"):
        await service.update_category(str(uuid4()), CategoryUpdate(parent_id="not-a-uuid"))


@pytest.mark.asyncio
async def test_update_price_when_has_children_raises_conflict_error():
    db = MagicMock()
    chain = MagicMock()
    db.query.return_value = chain
    category = MagicMock()
    category.name = "Parent"
    category.parent_id = None
    chain.filter.return_value.first.return_value = category
    chain.filter.return_value.count.return_value = 1
    service = CategoryService(db)
    with pytest.raises(ConflictError, match="Cannot set prices on a category that has subcategories"):
        await service.update_category(str(uuid4()), CategoryUpdate(price="10"))


@pytest.mark.asyncio
@patch("recyclic_api.services.category_service.CategoryRead")
async def test_update_under_priced_parent_clears_parent_prices(mock_read_cls):
    """Préserve la règle métier : rattacher sous un parent tarifé efface les prix du parent."""
    mock_read_cls.model_validate.return_value = MagicMock()
    db = MagicMock()
    chain = MagicMock()
    db.query.return_value = chain
    category = MagicMock()
    category.name = "Child"
    category.parent_id = None
    parent = MagicMock()
    parent.price = 5.0
    parent.max_price = 15.0
    parent.is_active = True
    pid = uuid4()
    chain.filter.return_value.first.side_effect = [category, parent]
    chain.filter.return_value.count.return_value = 0
    with patch.object(CategoryService, "_get_hierarchy_depth", return_value=1):
        service = CategoryService(db)
        await service.update_category(
            str(uuid4()),
            CategoryUpdate(parent_id=str(pid)),
        )
    assert parent.price is None
    assert parent.max_price is None
    assert db.commit.call_count >= 1


def test_put_category_route_maps_validation_error(admin_client):
    with patch(
        "recyclic_api.api.api_v1.endpoints.categories.CategoryService"
    ) as mock_cls:
        mock_cls.return_value.update_category = AsyncMock(
            side_effect=ValidationError("update rejected")
        )
        response = admin_client.put(
            f"{_V1}/categories/{uuid4()}",
            json={"name": "Y"},
        )
    assert response.status_code == 400
    assert response.json()["detail"] == "update rejected"


def test_put_category_route_maps_conflict_to_422(admin_client):
    detail = (
        "Cannot set prices on a category that has subcategories. "
        "Prices can only be set on leaf categories (without children)."
    )
    with patch(
        "recyclic_api.api.api_v1.endpoints.categories.CategoryService"
    ) as mock_cls:
        mock_cls.return_value.update_category = AsyncMock(
            side_effect=ConflictError(detail)
        )
        response = admin_client.put(
            f"{_V1}/categories/{uuid4()}",
            json={"price": "1"},
        )
    assert response.status_code == 422
    assert response.json()["detail"] == detail


def test_put_category_route_not_found_when_service_returns_none(admin_client):
    with patch(
        "recyclic_api.api.api_v1.endpoints.categories.CategoryService"
    ) as mock_cls:
        mock_cls.return_value.update_category = AsyncMock(return_value=None)
        response = admin_client.put(
            f"{_V1}/categories/00000000-0000-0000-0000-000000000000",
            json={"name": "Nope"},
        )
    assert response.status_code == 404
    assert response.json()["detail"] == "Category not found"
