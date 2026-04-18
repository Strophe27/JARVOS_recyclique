"""Tests pour les schémas d'administration"""
import pytest
from datetime import datetime
from recyclic_api.schemas.admin import AdminUser, PendingUserResponse, UserRoleUpdate, PaginationInfo, AdminResponse
from recyclic_api.models.user import UserRole, UserStatus

def test_admin_user_schema():
    """Test du schéma AdminUser"""
    user_data = {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "username": "testuser",
        "first_name": "Test",
        "last_name": "User",
        "full_name": "Test User",
        "email": "test@example.com",
        "role": UserRole.USER,
        "status": UserStatus.APPROVED,
        "is_active": True,
        "site_id": "456e7890-e89b-12d3-a456-426614174001",
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    
    admin_user = AdminUser(**user_data)
    assert admin_user.id == "123e4567-e89b-12d3-a456-426614174000"
    assert admin_user.role == UserRole.USER
    assert admin_user.status == UserStatus.APPROVED
    assert set(admin_user.model_dump().keys()) <= set(AdminUser.model_fields)


def test_pending_user_response_schema_keys_match_model():
    row = PendingUserResponse(
        id="123e4567-e89b-12d3-a456-426614174000",
        username="pending_u",
        first_name="Pat",
        last_name="Pending",
        full_name="Pat Pending",
        role=UserRole.USER,
        status=UserStatus.PENDING,
        created_at=datetime.now(),
    )
    assert set(row.model_dump().keys()) <= set(PendingUserResponse.model_fields)

def test_user_role_update_schema():
    """Test du schéma UserRoleUpdate"""
    role_update = UserRoleUpdate(role=UserRole.ADMIN)
    assert role_update.role == UserRole.ADMIN

def test_pagination_info_schema():
    """Test du schéma PaginationInfo"""
    pagination = PaginationInfo(
        page=1,
        limit=20,
        total=100,
        pages=5,
        has_next=True,
        has_prev=False
    )
    assert pagination.page == 1
    assert pagination.limit == 20
    assert pagination.total == 100
    assert pagination.has_next is True
    assert pagination.has_prev is False

def test_admin_response_schema():
    """Test du schéma AdminResponse"""
    response = AdminResponse(
        data={"user_id": "123"},
        message="Opération réussie",
        success=True
    )
    assert response.message == "Opération réussie"
    assert response.success is True
    assert response.data == {"user_id": "123"}
