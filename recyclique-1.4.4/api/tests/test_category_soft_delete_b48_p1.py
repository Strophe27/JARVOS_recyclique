"""
Tests for Story B48-P1: Soft Delete des Catégories

Tests unitaires et d'intégration pour :
- Soft Delete avec deleted_at
- Restauration de catégories archivées
- Validation hiérarchie (empêche désactivation si enfants actifs)
- Filtrage dans APIs opérationnelles vs admin
"""

import pytest
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from uuid import uuid4

from recyclic_api.models.category import Category
from recyclic_api.services.category_service import CategoryService
from recyclic_api.services.category_management import CategoryManagementService


class TestCategorySoftDelete:
    """Tests unitaires pour le Soft Delete avec deleted_at"""

    def test_soft_delete_sets_deleted_at(self, db_session: Session):
        """Test que soft_delete_category() définit deleted_at au lieu de is_active=False"""
        service = CategoryService(db_session)
        
        # Créer une catégorie
        category = Category(
            id=uuid4(),
            name="Test Category",
            is_active=True
        )
        db_session.add(category)
        db_session.commit()
        
        # Soft delete
        result = service.soft_delete_category(str(category.id))
        
        # Vérifier que deleted_at est défini
        assert result is not None
        assert result.deleted_at is not None
        assert isinstance(result.deleted_at, datetime)
        
        # Vérifier dans la DB
        db_session.refresh(category)
        assert category.deleted_at is not None
        assert category.is_active is True  # is_active reste True

    def test_soft_delete_with_active_children_fails(self, db_session: Session):
        """Test que soft_delete_category() échoue si la catégorie a des enfants actifs"""
        service = CategoryService(db_session)
        
        # Créer catégorie parente
        parent = Category(
            id=uuid4(),
            name="Parent Category",
            is_active=True
        )
        db_session.add(parent)
        db_session.commit()
        
        # Créer catégorie enfant active
        child = Category(
            id=uuid4(),
            name="Child Category",
            is_active=True,
            parent_id=parent.id,
            deleted_at=None  # Enfant actif (non archivé)
        )
        db_session.add(child)
        db_session.commit()
        
        # Tentative de soft delete du parent (doit échouer)
        with pytest.raises(Exception) as exc_info:
            service.soft_delete_category(str(parent.id))
        
        # Vérifier le message d'erreur
        assert exc_info.value.status_code == 422
        error_detail = exc_info.value.detail
        assert isinstance(error_detail, dict)
        assert "active_children_count" in error_detail
        assert error_detail["active_children_count"] == 1

    def test_soft_delete_with_archived_children_succeeds(self, db_session: Session):
        """Test que soft_delete_category() réussit si tous les enfants sont archivés"""
        service = CategoryService(db_session)
        
        # Créer catégorie parente
        parent = Category(
            id=uuid4(),
            name="Parent Category",
            is_active=True
        )
        db_session.add(parent)
        db_session.commit()
        
        # Créer catégorie enfant archivée
        child = Category(
            id=uuid4(),
            name="Child Category",
            is_active=True,
            parent_id=parent.id,
            deleted_at=datetime.now(timezone.utc)  # Enfant archivé
        )
        db_session.add(child)
        db_session.commit()
        
        # Soft delete du parent (doit réussir)
        result = service.soft_delete_category(str(parent.id))
        
        assert result is not None
        assert result.deleted_at is not None


class TestCategoryRestore:
    """Tests pour la restauration de catégories archivées"""

    def test_restore_category_sets_deleted_at_to_none(self, db_session: Session):
        """Test que restore_category() remet deleted_at à NULL"""
        service = CategoryService(db_session)
        
        # Créer une catégorie archivée
        category = Category(
            id=uuid4(),
            name="Archived Category",
            is_active=True,
            deleted_at=datetime.now(timezone.utc)
        )
        db_session.add(category)
        db_session.commit()
        
        # Restaurer
        result = service.restore_category(str(category.id))
        
        # Vérifier que deleted_at est NULL
        assert result is not None
        assert result.deleted_at is None
        
        # Vérifier dans la DB
        db_session.refresh(category)
        assert category.deleted_at is None

    def test_restore_already_active_category_fails(self, db_session: Session):
        """Test que restore_category() échoue si la catégorie n'est pas archivée"""
        service = CategoryService(db_session)
        
        # Créer une catégorie active (non archivée)
        category = Category(
            id=uuid4(),
            name="Active Category",
            is_active=True,
            deleted_at=None
        )
        db_session.add(category)
        db_session.commit()
        
        # Tentative de restauration (doit échouer)
        with pytest.raises(Exception) as exc_info:
            service.restore_category(str(category.id))
        
        assert exc_info.value.status_code == 400
        assert "already active" in str(exc_info.value.detail).lower()


class TestCategoryFiltering:
    """Tests pour le filtrage des catégories archivées"""

    def test_get_categories_excludes_archived_by_default(self, db_session: Session):
        """Test que get_categories() exclut les catégories archivées par défaut"""
        service = CategoryService(db_session)
        
        # Créer catégories actives et archivées
        active = Category(id=uuid4(), name="Active", is_active=True, deleted_at=None)
        archived = Category(id=uuid4(), name="Archived", is_active=True, deleted_at=datetime.now(timezone.utc))
        
        db_session.add_all([active, archived])
        db_session.commit()
        
        # Récupérer sans include_archived
        categories = service.get_categories(include_archived=False)
        
        # Vérifier que seule la catégorie active est retournée
        assert len(categories) == 1
        assert categories[0].name == "Active"
        assert categories[0].deleted_at is None

    def test_get_categories_includes_archived_when_requested(self, db_session: Session):
        """Test que get_categories() inclut les catégories archivées si include_archived=True"""
        service = CategoryService(db_session)
        
        # Créer catégories actives et archivées
        active = Category(id=uuid4(), name="Active", is_active=True, deleted_at=None)
        archived = Category(id=uuid4(), name="Archived", is_active=True, deleted_at=datetime.now(timezone.utc))
        
        db_session.add_all([active, archived])
        db_session.commit()
        
        # Récupérer avec include_archived=True
        categories = service.get_categories(include_archived=True)
        
        # Vérifier que les deux catégories sont retournées
        assert len(categories) == 2
        names = {cat.name for cat in categories}
        assert "Active" in names
        assert "Archived" in names

    def test_operational_endpoints_exclude_archived(self, db_session: Session):
        """Test que les endpoints opérationnels excluent les catégories archivées"""
        management_service = CategoryManagementService(db_session)
        
        # Créer catégories actives et archivées
        active = Category(id=uuid4(), name="Active", is_active=True, deleted_at=None, is_visible=True)
        archived = Category(id=uuid4(), name="Archived", is_active=True, deleted_at=datetime.now(timezone.utc), is_visible=True)
        
        db_session.add_all([active, archived])
        db_session.commit()
        
        # Récupérer pour entry tickets (opérationnel)
        categories = management_service.get_categories_for_entry_tickets()
        
        # Vérifier que seule la catégorie active est retournée
        assert len(categories) == 1
        assert categories[0].name == "Active"
        assert categories[0].deleted_at is None

    def test_operational_endpoints_sale_tickets_exclude_archived(self, db_session: Session):
        """Test que les endpoints sale tickets excluent aussi les catégories archivées"""
        management_service = CategoryManagementService(db_session)
        
        # Créer catégories actives et archivées
        active = Category(id=uuid4(), name="Active", is_active=True, deleted_at=None)
        archived = Category(id=uuid4(), name="Archived", is_active=True, deleted_at=datetime.now(timezone.utc))
        
        db_session.add_all([active, archived])
        db_session.commit()
        
        # Récupérer pour sale tickets (opérationnel)
        categories = management_service.get_categories_for_sale_tickets()
        
        # Vérifier que seule la catégorie active est retournée
        assert len(categories) == 1
        assert categories[0].name == "Active"
        assert categories[0].deleted_at is None

