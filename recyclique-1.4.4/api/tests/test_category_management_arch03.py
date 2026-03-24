"""ARCH-03 : CategoryManagementService sans HTTPException sur les PUT visibility / display-order."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from recyclic_api.core.config import settings
from recyclic_api.core.exceptions import ConflictError, NotFoundError, ValidationError
from recyclic_api.services.category_management import CategoryManagementService

_V1 = settings.API_V1_STR.rstrip("/")


@pytest.mark.asyncio
async def test_visibility_invalid_uuid_raises_validation_error():
    db = MagicMock()
    service = CategoryManagementService(db)
    with pytest.raises(ValidationError, match="Invalid category ID format"):
        await service.update_category_visibility("not-a-uuid", True)


@pytest.mark.asyncio
async def test_visibility_not_found_raises_not_found():
    db = MagicMock()
    chain = MagicMock()
    db.query.return_value = chain
    chain.filter.return_value.first.return_value = None
    service = CategoryManagementService(db)
    cid = str(uuid4())
    with pytest.raises(NotFoundError, match=cid):
        await service.update_category_visibility(cid, True)


@pytest.mark.asyncio
async def test_visibility_hide_last_visible_raises_conflict():
    cid = uuid4()
    category = MagicMock()
    chain = MagicMock()
    db = MagicMock()
    db.query.return_value = chain
    chain.filter.return_value.first.return_value = category
    chain.filter.return_value.count.return_value = 0
    service = CategoryManagementService(db)
    with pytest.raises(ConflictError, match="at least one category must remain visible"):
        await service.update_category_visibility(str(cid), False)


@pytest.mark.asyncio
async def test_display_order_invalid_uuid_raises_validation_error():
    db = MagicMock()
    service = CategoryManagementService(db)
    with pytest.raises(ValidationError, match="Invalid category ID format"):
        await service.update_display_order("bad", 1)


@pytest.mark.asyncio
async def test_display_order_entry_not_found_raises_not_found():
    db = MagicMock()
    chain = MagicMock()
    db.query.return_value = chain
    chain.filter.return_value.first.return_value = None
    service = CategoryManagementService(db)
    cid = str(uuid4())
    with pytest.raises(NotFoundError, match=cid):
        await service.update_display_order_entry(cid, 2)


def test_put_visibility_route_maps_validation_error(admin_client):
    with patch(
        "recyclic_api.api.api_v1.endpoints.categories.CategoryManagementService"
    ) as mock_cls:
        mock_cls.return_value.update_category_visibility = AsyncMock(
            side_effect=ValidationError("Invalid category ID format: 'x'")
        )
        response = admin_client.put(
            f"{_V1}/categories/x/visibility",
            json={"is_visible": True},
        )
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid category ID format: 'x'"


def test_put_visibility_route_maps_not_found(admin_client):
    msg = f"Category with ID '{uuid4()}' not found"
    with patch(
        "recyclic_api.api.api_v1.endpoints.categories.CategoryManagementService"
    ) as mock_cls:
        mock_cls.return_value.update_category_visibility = AsyncMock(
            side_effect=NotFoundError(msg)
        )
        response = admin_client.put(
            f"{_V1}/categories/{uuid4()}/visibility",
            json={"is_visible": True},
        )
    assert response.status_code == 404
    assert response.json()["detail"] == msg


def test_put_visibility_route_maps_conflict_to_422(admin_client):
    detail = "Cannot hide category: at least one category must remain visible"
    with patch(
        "recyclic_api.api.api_v1.endpoints.categories.CategoryManagementService"
    ) as mock_cls:
        mock_cls.return_value.update_category_visibility = AsyncMock(
            side_effect=ConflictError(detail)
        )
        response = admin_client.put(
            f"{_V1}/categories/{uuid4()}/visibility",
            json={"is_visible": False},
        )
    assert response.status_code == 422
    assert response.json()["detail"] == detail


def test_put_display_order_route_maps_validation_error(admin_client):
    with patch(
        "recyclic_api.api.api_v1.endpoints.categories.CategoryManagementService"
    ) as mock_cls:
        mock_cls.return_value.update_display_order = AsyncMock(
            side_effect=ValidationError("Invalid category ID format: 'x'")
        )
        response = admin_client.put(
            f"{_V1}/categories/x/display-order",
            json={"display_order": 1},
        )
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid category ID format: 'x'"


def test_put_display_order_route_maps_not_found(admin_client):
    msg = f"Category with ID '{uuid4()}' not found"
    with patch(
        "recyclic_api.api.api_v1.endpoints.categories.CategoryManagementService"
    ) as mock_cls:
        mock_cls.return_value.update_display_order = AsyncMock(
            side_effect=NotFoundError(msg)
        )
        response = admin_client.put(
            f"{_V1}/categories/{uuid4()}/display-order",
            json={"display_order": 1},
        )
    assert response.status_code == 404
    assert response.json()["detail"] == msg


def test_put_display_order_entry_route_maps_validation_error(admin_client):
    with patch(
        "recyclic_api.api.api_v1.endpoints.categories.CategoryManagementService"
    ) as mock_cls:
        mock_cls.return_value.update_display_order_entry = AsyncMock(
            side_effect=ValidationError("Invalid category ID format: 'x'")
        )
        response = admin_client.put(
            f"{_V1}/categories/x/display-order-entry",
            json={"display_order_entry": 3},
        )
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid category ID format: 'x'"


def test_put_display_order_entry_route_maps_not_found(admin_client):
    msg = f"Category with ID '{uuid4()}' not found"
    with patch(
        "recyclic_api.api.api_v1.endpoints.categories.CategoryManagementService"
    ) as mock_cls:
        mock_cls.return_value.update_display_order_entry = AsyncMock(
            side_effect=NotFoundError(msg)
        )
        response = admin_client.put(
            f"{_V1}/categories/{uuid4()}/display-order-entry",
            json={"display_order_entry": 3},
        )
    assert response.status_code == 404
    assert response.json()["detail"] == msg
