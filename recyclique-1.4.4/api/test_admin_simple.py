"""Test simple pour les schémas admin sans dépendances de base de données"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from datetime import datetime
from recyclic_api.schemas.admin import AdminUser, UserRoleUpdate, PaginationInfo, AdminResponse
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
    assert "telegram_id" not in admin_user.model_dump()
    assert admin_user.role == UserRole.USER
    assert admin_user.status == UserStatus.APPROVED
    print("✅ Test AdminUser réussi")

def test_user_role_update_schema():
    """Test du schéma UserRoleUpdate"""
    role_update = UserRoleUpdate(role=UserRole.ADMIN)
    assert role_update.role == UserRole.ADMIN
    print("✅ Test UserRoleUpdate réussi")

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
    print("✅ Test PaginationInfo réussi")

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
    print("✅ Test AdminResponse réussi")

if __name__ == "__main__":
    print("🧪 Exécution des tests des schémas admin...")
    test_admin_user_schema()
    test_user_role_update_schema()
    test_pagination_info_schema()
    test_admin_response_schema()
    print("🎉 Tous les tests des schémas admin ont réussi !")
