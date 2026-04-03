"""ARCH-03 : CategoryService.create_category sans HTTPException ; mapping POST /categories/."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from sqlalchemy.exc import IntegrityError

from recyclic_api.core.config import settings
from recyclic_api.core.exceptions import ValidationError
from recyclic_api.schemas.category import CategoryCreate
from recyclic_api.services.category_service import CategoryService

_V1 = settings.API_V1_STR.rstrip("/")


@pytest.mark.asyncio
async def test_create_duplicate_name_raises_validation_error():
    db = MagicMock()
    chain = MagicMock()
    db.query.return_value = chain
    chain.filter.return_value.first.return_value = MagicMock()  # nom déjà pris
    service = CategoryService(db)
    with pytest.raises(ValidationError, match="already exists"):
        await service.create_category(CategoryCreate(name="Dup"))
    db.add.assert_not_called()


@pytest.mark.asyncio
async def test_create_invalid_parent_id_format_raises_validation_error():
    db = MagicMock()
    chain = MagicMock()
    fmock = MagicMock()
    db.query.return_value = chain
    chain.filter.return_value = fmock
    fmock.first.return_value = None
    service = CategoryService(db)
    with pytest.raises(ValidationError, match="Invalid parent_id format"):
        await service.create_category(
            CategoryCreate(name="Child", parent_id="not-a-uuid")
        )


@pytest.mark.asyncio
async def test_create_parent_missing_raises_validation_error():
    db = MagicMock()
    chain = MagicMock()
    fmock = MagicMock()
    db.query.return_value = chain
    chain.filter.return_value = fmock
    fmock.first.side_effect = [None, None]
    service = CategoryService(db)
    with pytest.raises(ValidationError, match="not found or inactive"):
        await service.create_category(
            CategoryCreate(
                name="Orphan",
                parent_id="00000000-0000-0000-0000-000000000000",
            )
        )


@pytest.mark.asyncio
@patch.object(CategoryService, "_get_hierarchy_depth", return_value=CategoryService.MAX_HIERARCHY_DEPTH)
async def test_create_exceeds_max_depth_raises_validation_error(_mock_depth):
    db = MagicMock()
    chain = MagicMock()
    fmock = MagicMock()
    db.query.return_value = chain
    chain.filter.return_value = fmock
    parent = MagicMock()
    parent.price = None
    parent.max_price = None
    fmock.first.side_effect = [None, parent]
    service = CategoryService(db)
    with pytest.raises(ValidationError, match="maximum hierarchy depth"):
        await service.create_category(
            CategoryCreate(name="Too deep", parent_id=str(uuid4()))
        )


@pytest.mark.asyncio
@patch("recyclic_api.services.category_service.CategoryRead")
@patch.object(CategoryService, "_get_hierarchy_depth", return_value=1)
async def test_create_under_priced_parent_clears_parent_prices(mock_read_cls, _mock_depth):
    """Vérifie la règle métier : parent tarifé → prix effacés avant création de l'enfant."""
    mock_read_cls.model_validate.return_value = MagicMock()
    db = MagicMock()
    chain = MagicMock()
    fmock = MagicMock()
    db.query.return_value = chain
    chain.filter.return_value = fmock
    parent = MagicMock()
    parent.price = 10.0
    parent.max_price = 20.0
    fmock.first.side_effect = [None, parent]
    service = CategoryService(db)
    await service.create_category(
        CategoryCreate(name="Child", parent_id=str(uuid4()), price=1.0)
    )
    assert parent.price is None
    assert parent.max_price is None
    assert db.commit.call_count >= 1
    db.add.assert_called_once()


@pytest.mark.asyncio
async def test_create_integrity_error_raises_validation_error():
    db = MagicMock()
    chain = MagicMock()
    db.query.return_value = chain
    chain.filter.return_value.first.return_value = None
    db.commit.side_effect = IntegrityError("stmt", {}, object())
    db.rollback = MagicMock()
    service = CategoryService(db)
    with pytest.raises(ValidationError, match="already exists"):
        await service.create_category(CategoryCreate(name="Unique"))
    db.rollback.assert_called_once()


def test_create_category_route_maps_validation_error(admin_client):
    with patch(
        "recyclic_api.api.api_v1.endpoints.categories.CategoryService"
    ) as mock_cls:
        mock_cls.return_value.create_category = AsyncMock(
            side_effect=ValidationError("create rejected")
        )
        response = admin_client.post(
            f"{_V1}/categories/",
            json={"name": "X"},
        )
    assert response.status_code == 400
    assert response.json()["detail"] == "create rejected"
