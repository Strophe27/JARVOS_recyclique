"""ARCH-03 : CategoryService.hard_delete_category sans HTTPException ; mapping HTTP route DELETE .../hard."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from recyclic_api.core.config import settings
from recyclic_api.core.exceptions import ConflictError, NotFoundError, ValidationError
from recyclic_api.services.category_service import CategoryService

_V1 = settings.API_V1_STR.rstrip("/")


@pytest.mark.asyncio
async def test_hard_delete_invalid_uuid_raises_validation_error():
    db = MagicMock()
    service = CategoryService(db)
    with pytest.raises(ValidationError, match="Invalid category id"):
        await service.hard_delete_category("not-a-uuid")
    db.query.assert_not_called()


@pytest.mark.asyncio
async def test_hard_delete_not_found_raises_not_found():
    db = MagicMock()
    chain = MagicMock()
    db.query.return_value = chain
    chain.filter.return_value.first.return_value = None
    service = CategoryService(db)
    cid = str(uuid4())
    with pytest.raises(NotFoundError, match="Category not found"):
        await service.hard_delete_category(cid)


@pytest.mark.asyncio
async def test_hard_delete_with_children_raises_conflict():
    db = MagicMock()
    chain = MagicMock()
    db.query.return_value = chain
    category = MagicMock()
    child = MagicMock()
    chain.filter.return_value.first.side_effect = [category, child]
    service = CategoryService(db)
    cid = str(uuid4())
    with pytest.raises(
        ConflictError, match="Impossible de supprimer: la catégorie possède des sous-catégories"
    ):
        await service.hard_delete_category(cid)


@pytest.mark.asyncio
async def test_hard_delete_success_deletes_and_commits():
    db = MagicMock()
    chain = MagicMock()
    db.query.return_value = chain
    category = MagicMock()
    chain.filter.return_value.first.side_effect = [category, None]
    service = CategoryService(db)
    cid = str(uuid4())
    await service.hard_delete_category(cid)
    db.delete.assert_called_once_with(category)
    db.commit.assert_called_once()


def test_hard_delete_route_maps_validation_error(admin_client):
    with patch(
        "recyclic_api.api.api_v1.endpoints.categories.CategoryService"
    ) as mock_cls:
        mock_cls.return_value.hard_delete_category = AsyncMock(
            side_effect=ValidationError("Invalid category id")
        )
        response = admin_client.delete(f"{_V1}/categories/not-uuid/hard")
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid category id"


def test_hard_delete_route_maps_not_found(admin_client):
    with patch(
        "recyclic_api.api.api_v1.endpoints.categories.CategoryService"
    ) as mock_cls:
        mock_cls.return_value.hard_delete_category = AsyncMock(
            side_effect=NotFoundError("Category not found")
        )
        response = admin_client.delete(f"{_V1}/categories/{uuid4()}/hard")
    assert response.status_code == 404
    assert response.json()["detail"] == "Category not found"


def test_hard_delete_route_maps_conflict_to_422(admin_client):
    detail = "Impossible de supprimer: la catégorie possède des sous-catégories"
    with patch(
        "recyclic_api.api.api_v1.endpoints.categories.CategoryService"
    ) as mock_cls:
        mock_cls.return_value.hard_delete_category = AsyncMock(
            side_effect=ConflictError(detail)
        )
        response = admin_client.delete(f"{_V1}/categories/{uuid4()}/hard")
    assert response.status_code == 422
    assert response.json()["detail"] == detail


def test_hard_delete_route_success_returns_204(admin_client):
    with patch(
        "recyclic_api.api.api_v1.endpoints.categories.CategoryService"
    ) as mock_cls:
        mock_cls.return_value.hard_delete_category = AsyncMock(return_value=None)
        response = admin_client.delete(f"{_V1}/categories/{uuid4()}/hard")
    assert response.status_code == 204
