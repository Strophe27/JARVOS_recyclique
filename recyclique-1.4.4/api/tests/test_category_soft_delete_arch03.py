"""ARCH-03 : CategoryService.soft_delete_category sans HTTPException ; mapping HTTP route DELETE /categories/{id}."""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from recyclic_api.core.config import settings
from recyclic_api.core.exceptions import ConflictError
from recyclic_api.schemas.category import CategoryRead
from recyclic_api.services.category_service import CategoryService

_V1 = settings.API_V1_STR.rstrip("/")


@pytest.mark.asyncio
async def test_soft_delete_invalid_uuid_returns_none():
    db = MagicMock()
    service = CategoryService(db)
    result = await service.soft_delete_category("not-a-uuid")
    assert result is None
    db.query.assert_not_called()


@pytest.mark.asyncio
async def test_soft_delete_not_found_returns_none():
    db = MagicMock()
    chain_find = MagicMock()
    db.query.return_value = chain_find
    chain_find.filter.return_value.first.return_value = None
    service = CategoryService(db)
    result = await service.soft_delete_category(str(uuid4()))
    assert result is None
    db.commit.assert_not_called()


@pytest.mark.asyncio
async def test_soft_delete_with_active_children_raises_conflict():
    db = MagicMock()
    chain_find = MagicMock()
    chain_count = MagicMock()
    db.query.side_effect = [chain_find, chain_count]
    chain_find.filter.return_value.first.return_value = MagicMock()
    chain_count.filter.return_value.count.return_value = 3
    service = CategoryService(db)
    cid = str(uuid4())
    with pytest.raises(ConflictError) as exc_info:
        await service.soft_delete_category(cid)
    d = exc_info.value.detail
    assert isinstance(d, dict)
    assert d["active_children_count"] == 3
    assert d["category_id"] == cid
    assert "sous-catégories actives" in d["detail"]
    db.commit.assert_not_called()


@pytest.mark.asyncio
async def test_soft_delete_success_commits():
    db = MagicMock()
    chain_find = MagicMock()
    chain_count = MagicMock()
    db.query.side_effect = [chain_find, chain_count]
    category = MagicMock()
    chain_find.filter.return_value.first.return_value = category
    chain_count.filter.return_value.count.return_value = 0
    now = datetime.now(timezone.utc)
    read = CategoryRead(
        id=str(uuid4()),
        name="Leaf",
        is_active=True,
        display_order=0,
        display_order_entry=0,
        is_visible=True,
        created_at=now,
        updated_at=now,
        deleted_at=now,
    )
    service = CategoryService(db)
    with patch(
        "recyclic_api.services.category_service.CategoryRead.model_validate",
        return_value=read,
    ):
        result = await service.soft_delete_category(str(uuid4()))
    assert result is read
    db.commit.assert_called_once()
    db.refresh.assert_called_once_with(category)


def test_delete_category_route_maps_conflict_to_422_structured(admin_client):
    cid = str(uuid4())
    detail = {
        "detail": "Impossible de désactiver cette catégorie car elle contient des sous-catégories actives. Veuillez d'abord désactiver ou transférer les sous-catégories.",
        "category_id": cid,
        "active_children_count": 1,
    }
    with patch(
        "recyclic_api.api.api_v1.endpoints.categories.CategoryService"
    ) as mock_cls:
        mock_cls.return_value.soft_delete_category = AsyncMock(
            side_effect=ConflictError(detail)
        )
        response = admin_client.delete(f"{_V1}/categories/{cid}")
    assert response.status_code == 422
    assert response.json()["detail"] == detail


def test_delete_category_route_success_returns_200(admin_client):
    now = datetime.now(timezone.utc)
    read = CategoryRead(
        id=str(uuid4()),
        name="OK",
        is_active=True,
        display_order=0,
        display_order_entry=0,
        is_visible=True,
        created_at=now,
        updated_at=now,
        deleted_at=now,
    )
    with patch(
        "recyclic_api.api.api_v1.endpoints.categories.CategoryService"
    ) as mock_cls:
        mock_cls.return_value.soft_delete_category = AsyncMock(return_value=read)
        response = admin_client.delete(f"{_V1}/categories/{read.id}")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == read.id
    assert body["name"] == "OK"
    assert body["deleted_at"] is not None
