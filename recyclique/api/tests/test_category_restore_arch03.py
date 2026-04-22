"""ARCH-03 : CategoryService.restore_category sans HTTPException ; mapping HTTP route POST .../restore."""

from __future__ import annotations

from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from recyclic_api.core.config import settings
from recyclic_api.core.exceptions import ValidationError
from recyclic_api.schemas.category import CategoryRead
from recyclic_api.services.category_service import CategoryService

_V1 = settings.API_V1_STR.rstrip("/")


def test_restore_already_active_raises_validation_error():
    db = MagicMock()
    chain = MagicMock()
    db.query.return_value = chain
    category = MagicMock()
    category.deleted_at = None
    chain.filter.return_value.first.return_value = category
    service = CategoryService(db)
    cid = str(uuid4())
    with pytest.raises(ValidationError, match="Category is already active"):
        service.restore_category(cid)


def test_restore_archived_sets_deleted_at_none_and_commits():
    db = MagicMock()
    chain = MagicMock()
    db.query.return_value = chain
    category = MagicMock()
    category.deleted_at = object()  # truthy = archived
    chain.filter.return_value.first.return_value = category
    service = CategoryService(db)
    cid = str(uuid4())
    fake_read = MagicMock(spec=CategoryRead)
    with patch.object(CategoryRead, "model_validate", return_value=fake_read) as mv:
        result = service.restore_category(cid)
    assert category.deleted_at is None
    db.commit.assert_called_once()
    db.refresh.assert_called_once_with(category)
    mv.assert_called_once_with(category)
    assert result is fake_read


def test_post_restore_route_maps_validation_error(admin_client):
    detail = "Category is already active (not deleted)"
    with patch(
        "recyclic_api.api.api_v1.endpoints.categories.CategoryService"
    ) as mock_cls:
        mock_cls.return_value.restore_category = MagicMock(
            side_effect=ValidationError(detail)
        )
        response = admin_client.post(f"{_V1}/categories/{uuid4()}/restore")
    assert response.status_code == 400
    assert response.json()["detail"] == detail


def test_post_restore_route_not_found_when_service_returns_none(admin_client):
    with patch(
        "recyclic_api.api.api_v1.endpoints.categories.CategoryService"
    ) as mock_cls:
        mock_cls.return_value.restore_category = MagicMock(return_value=None)
        response = admin_client.post(f"{_V1}/categories/{uuid4()}/restore")
    assert response.status_code == 404
    assert response.json()["detail"] == "Category not found"
