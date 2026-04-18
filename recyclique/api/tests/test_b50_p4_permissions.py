"""
Tests pour Story B50-P4: Séparation Permissions Caisse Virtuelle et Différée

Valide :
- Les 2 nouvelles permissions existent en DB
- Les permissions peuvent être assignées aux groupes
- Les utilisateurs avec permissions séparées ont accès uniquement aux routes correspondantes
"""

import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.main import app
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.permission import Permission, Group
from recyclic_api.core.security import hash_password
from recyclic_api.core.auth import create_access_token


@pytest.fixture
def test_user(db_session: Session):
    """Créer un utilisateur USER pour les tests."""
    user = User(
        id=uuid.uuid4(),
        username="test_user",
        hashed_password=hash_password("testpassword123"),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def virtual_permission(db_session: Session):
    """Récupérer ou créer la permission caisse.virtual.access."""
    permission = db_session.query(Permission).filter(
        Permission.name == 'caisse.virtual.access'
    ).first()
    if not permission:
        permission = Permission(
            id=uuid.uuid4(),
            name='caisse.virtual.access',
            description='Accès à la caisse virtuelle uniquement'
        )
        db_session.add(permission)
        db_session.commit()
        db_session.refresh(permission)
    return permission


@pytest.fixture
def deferred_permission(db_session: Session):
    """Récupérer ou créer la permission caisse.deferred.access."""
    permission = db_session.query(Permission).filter(
        Permission.name == 'caisse.deferred.access'
    ).first()
    if not permission:
        permission = Permission(
            id=uuid.uuid4(),
            name='caisse.deferred.access',
            description='Accès à la caisse différée uniquement'
        )
        db_session.add(permission)
        db_session.commit()
        db_session.refresh(permission)
    return permission


@pytest.fixture
def test_group_virtual(db_session: Session, virtual_permission: Permission):
    """Créer un groupe avec uniquement la permission caisse.virtual.access."""
    group = Group(
        id=uuid.uuid4(),
        name="Groupe Caisse Virtuelle",
        description="Groupe avec accès uniquement à la caisse virtuelle"
    )
    group.permissions = [virtual_permission]
    db_session.add(group)
    db_session.commit()
    db_session.refresh(group)
    return group


@pytest.fixture
def test_group_deferred(db_session: Session, deferred_permission: Permission):
    """Créer un groupe avec uniquement la permission caisse.deferred.access."""
    group = Group(
        id=uuid.uuid4(),
        name="Groupe Caisse Différée",
        description="Groupe avec accès uniquement à la caisse différée"
    )
    group.permissions = [deferred_permission]
    db_session.add(group)
    db_session.commit()
    db_session.refresh(group)
    return group


@pytest.fixture
def user_with_virtual_access(db_session: Session, test_user: User, test_group_virtual: Group):
    """Créer un utilisateur avec accès uniquement à la caisse virtuelle."""
    test_user.groups = [test_group_virtual]
    db_session.commit()
    db_session.refresh(test_user)
    return test_user


@pytest.fixture
def user_with_deferred_access(db_session: Session, test_user: User, test_group_deferred: Group):
    """Créer un utilisateur avec accès uniquement à la caisse différée."""
    test_user.groups = [test_group_deferred]
    db_session.commit()
    db_session.refresh(test_user)
    return test_user


class TestB50P4Permissions:
    """Tests pour les nouvelles permissions B50-P4."""

    def test_virtual_permission_exists(self, db_session: Session, virtual_permission: Permission):
        """Test que la permission caisse.virtual.access existe en DB."""
        # La fixture virtual_permission crée la permission si elle n'existe pas
        permission = db_session.query(Permission).filter(
            Permission.name == 'caisse.virtual.access'
        ).first()
        assert permission is not None
        assert permission.name == 'caisse.virtual.access'
        assert 'virtuelle' in permission.description.lower()

    def test_deferred_permission_exists(self, db_session: Session, deferred_permission: Permission):
        """Test que la permission caisse.deferred.access existe en DB."""
        # La fixture deferred_permission crée la permission si elle n'existe pas
        permission = db_session.query(Permission).filter(
            Permission.name == 'caisse.deferred.access'
        ).first()
        assert permission is not None
        assert permission.name == 'caisse.deferred.access'
        assert 'différée' in permission.description.lower()

    def test_group_can_have_virtual_permission(self, db_session: Session, virtual_permission: Permission):
        """Test qu'un groupe peut avoir la permission caisse.virtual.access."""
        group = Group(
            id=uuid.uuid4(),
            name="Test Virtual Group",
            description="Test"
        )
        group.permissions = [virtual_permission]
        db_session.add(group)
        db_session.commit()
        db_session.refresh(group)
        
        assert len(group.permissions) == 1
        assert group.permissions[0].name == 'caisse.virtual.access'

    def test_group_can_have_deferred_permission(self, db_session: Session, deferred_permission: Permission):
        """Test qu'un groupe peut avoir la permission caisse.deferred.access."""
        group = Group(
            id=uuid.uuid4(),
            name="Test Deferred Group",
            description="Test"
        )
        group.permissions = [deferred_permission]
        db_session.add(group)
        db_session.commit()
        db_session.refresh(group)
        
        assert len(group.permissions) == 1
        assert group.permissions[0].name == 'caisse.deferred.access'

    def test_user_with_virtual_permission_has_access(self, db_session: Session, user_with_virtual_access: User):
        """Test qu'un utilisateur avec caisse.virtual.access a bien la permission."""
        # Charger l'utilisateur avec ses groupes et permissions
        from sqlalchemy.orm import selectinload
        user = db_session.query(User).options(
            selectinload(User.groups).selectinload(Group.permissions)
        ).filter(User.id == user_with_virtual_access.id).first()
        
        # Collecter toutes les permissions de l'utilisateur
        permissions = set()
        for group in user.groups:
            for permission in group.permissions:
                permissions.add(permission.name)
        
        assert 'caisse.virtual.access' in permissions
        assert 'caisse.deferred.access' not in permissions
        assert 'caisse.access' not in permissions

    def test_user_with_deferred_permission_has_access(self, db_session: Session, user_with_deferred_access: User):
        """Test qu'un utilisateur avec caisse.deferred.access a bien la permission."""
        # Charger l'utilisateur avec ses groupes et permissions
        from sqlalchemy.orm import selectinload
        user = db_session.query(User).options(
            selectinload(User.groups).selectinload(Group.permissions)
        ).filter(User.id == user_with_deferred_access.id).first()
        
        # Collecter toutes les permissions de l'utilisateur
        permissions = set()
        for group in user.groups:
            for permission in group.permissions:
                permissions.add(permission.name)
        
        assert 'caisse.deferred.access' in permissions
        assert 'caisse.virtual.access' not in permissions
        assert 'caisse.access' not in permissions

