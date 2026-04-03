"""Tests for Story B48-P5: Double Dénomination des Catégories (display_name)

Tests unitaires et d'intégration pour la fonctionnalité display_name.
"""
import pytest
from uuid import uuid4
from sqlalchemy.orm import Session

from recyclic_api.models.category import Category
from recyclic_api.services.category_service import CategoryService
from recyclic_api.schemas.category import CategoryCreate, CategoryUpdate


class TestCategoryDisplayName:
    """Tests pour la fonctionnalité display_name (Story B48-P5)"""

    def test_get_display_name_with_display_name(self, db_session: Session):
        """Test que get_display_name retourne display_name si présent"""
        # Créer une catégorie avec display_name
        category = Category(
            id=uuid4(),
            name="Articles de bricolage et jardinage thermique",
            display_name="Bricot",
            is_active=True
        )
        db_session.add(category)
        db_session.commit()

        # Vérifier que get_display_name retourne display_name
        result = CategoryService.get_display_name(category)
        assert result == "Bricot"

    def test_get_display_name_without_display_name(self, db_session: Session):
        """Test que get_display_name retourne name si display_name est NULL (fallback)"""
        # Créer une catégorie sans display_name
        category = Category(
            id=uuid4(),
            name="Équipements Électriques et Électroniques (EEE)",
            display_name=None,
            is_active=True
        )
        db_session.add(category)
        db_session.commit()

        # Vérifier que get_display_name retourne name (fallback)
        result = CategoryService.get_display_name(category)
        assert result == "Équipements Électriques et Électroniques (EEE)"

    @pytest.mark.asyncio
    async def test_create_category_with_display_name(self, db_session: Session):
        """Test création catégorie avec display_name"""
        service = CategoryService(db_session)
        category_data = CategoryCreate(
            name="Articles de bricolage et jardinage thermique",
            display_name="Bricot"
        )

        result = await service.create_category(category_data)

        assert result.name == "Articles de bricolage et jardinage thermique"
        assert result.display_name == "Bricot"

    @pytest.mark.asyncio
    async def test_create_category_without_display_name(self, db_session: Session):
        """Test création catégorie sans display_name (fallback sur name)"""
        service = CategoryService(db_session)
        category_data = CategoryCreate(
            name="Équipements Électriques et Électroniques (EEE)",
            display_name=None
        )

        result = await service.create_category(category_data)

        assert result.name == "Équipements Électriques et Électroniques (EEE)"
        assert result.display_name is None

    @pytest.mark.asyncio
    async def test_update_category_display_name(self, db_session: Session):
        """Test modification de display_name"""
        # Créer une catégorie
        category = Category(
            id=uuid4(),
            name="Textile et habillement",
            display_name=None,
            is_active=True
        )
        db_session.add(category)
        db_session.commit()

        service = CategoryService(db_session)
        update_data = CategoryUpdate(display_name="Textile")

        result = await service.update_category(str(category.id), update_data)

        assert result.name == "Textile et habillement"
        assert result.display_name == "Textile"

    @pytest.mark.asyncio
    async def test_update_category_remove_display_name(self, db_session: Session):
        """Test suppression de display_name (mettre NULL)"""
        # Créer une catégorie avec display_name
        category = Category(
            id=uuid4(),
            name="Textile et habillement",
            display_name="Textile",
            is_active=True
        )
        db_session.add(category)
        db_session.commit()

        service = CategoryService(db_session)
        update_data = CategoryUpdate(display_name=None)

        result = await service.update_category(str(category.id), update_data)

        assert result.name == "Textile et habillement"
        assert result.display_name is None


class TestCategoryDisplayNameAPI:
    """Tests API pour la fonctionnalité display_name (Story B48-P5)"""

    def test_api_get_categories_returns_display_name(self, admin_client, db_session: Session):
        """Test que GET /api/v1/categories retourne name ET display_name"""
        # Créer une catégorie avec display_name
        category = Category(
            id=uuid4(),
            name="Articles de bricolage et jardinage thermique",
            display_name="Bricot",
            is_active=True
        )
        db_session.add(category)
        db_session.commit()

        response = admin_client.get("/api/v1/categories/")
        assert response.status_code == 200
        data = response.json()
        
        # Trouver la catégorie créée
        cat_data = next((c for c in data if c["id"] == str(category.id)), None)
        assert cat_data is not None
        assert cat_data["name"] == "Articles de bricolage et jardinage thermique"
        assert cat_data["display_name"] == "Bricot"

    def test_api_get_categories_without_display_name(self, admin_client, db_session: Session):
        """Test que GET /api/v1/categories retourne display_name=None si non défini"""
        # Créer une catégorie sans display_name
        category = Category(
            id=uuid4(),
            name="Équipements Électriques et Électroniques (EEE)",
            display_name=None,
            is_active=True
        )
        db_session.add(category)
        db_session.commit()

        response = admin_client.get("/api/v1/categories/")
        assert response.status_code == 200
        data = response.json()
        
        cat_data = next((c for c in data if c["id"] == str(category.id)), None)
        assert cat_data is not None
        assert cat_data["name"] == "Équipements Électriques et Électroniques (EEE)"
        assert cat_data["display_name"] is None

    def test_api_create_category_with_display_name(self, admin_client):
        """Test que POST /api/v1/categories accepte display_name"""
        response = admin_client.post(
            "/api/v1/categories/",
            json={
                "name": "Articles de bricolage et jardinage thermique",
                "display_name": "Bricot"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Articles de bricolage et jardinage thermique"
        assert data["display_name"] == "Bricot"

    def test_api_create_category_without_display_name(self, admin_client):
        """Test que POST /api/v1/categories fonctionne sans display_name"""
        response = admin_client.post(
            "/api/v1/categories/",
            json={
                "name": "Équipements Électriques et Électroniques (EEE)"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Équipements Électriques et Électroniques (EEE)"
        assert data["display_name"] is None

    def test_api_update_category_display_name(self, admin_client, db_session: Session):
        """Test que PUT /api/v1/categories/{id} permet de modifier display_name"""
        # Créer une catégorie
        category = Category(
            id=uuid4(),
            name="Textile et habillement",
            display_name=None,
            is_active=True
        )
        db_session.add(category)
        db_session.commit()

        response = admin_client.put(
            f"/api/v1/categories/{category.id}",
            json={"display_name": "Textile"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Textile et habillement"
        assert data["display_name"] == "Textile"

    def test_api_reception_get_categories_returns_display_name(self, admin_client, db_session: Session):
        """Test que GET /api/v1/reception/categories retourne display_name (ou name si NULL)"""
        # Créer une catégorie avec display_name
        category = Category(
            id=uuid4(),
            name="Articles de bricolage et jardinage thermique",
            display_name="Bricot",
            is_active=True
        )
        db_session.add(category)
        db_session.commit()

        response = admin_client.get("/api/v1/reception/categories")
        assert response.status_code == 200
        data = response.json()
        
        # Trouver la catégorie créée
        cat_data = next((c for c in data if c["id"] == str(category.id)), None)
        assert cat_data is not None
        # Story B48-P5: L'endpoint opérationnel retourne display_name (ou name si NULL) dans le champ name
        assert cat_data["name"] == "Bricot"  # display_name utilisé

    def test_api_reception_get_categories_fallback_to_name(self, admin_client, db_session: Session):
        """Test que GET /api/v1/reception/categories utilise name si display_name est NULL"""
        # Créer une catégorie sans display_name
        category = Category(
            id=uuid4(),
            name="Équipements Électriques et Électroniques (EEE)",
            display_name=None,
            is_active=True
        )
        db_session.add(category)
        db_session.commit()

        response = admin_client.get("/api/v1/reception/categories")
        assert response.status_code == 200
        data = response.json()
        
        cat_data = next((c for c in data if c["id"] == str(category.id)), None)
        assert cat_data is not None
        # Story B48-P5: Fallback sur name si display_name est NULL
        assert cat_data["name"] == "Équipements Électriques et Électroniques (EEE)"

