"""Tests Story B48-P5 : double dénomination (name court + official_name optionnel).

Aligné sur le modèle actuel : ``name`` = libellé opérationnel / rapide, ``official_name`` = nom complet
optionnel. Le préfixe v1 suit ``Settings.API_V1_STR`` (défaut ``/v1``, pas ``/api/v1``).
"""
import pytest
from uuid import uuid4
from sqlalchemy.orm import Session

from recyclic_api.core.config import settings
from recyclic_api.models.category import Category
from recyclic_api.services.category_service import CategoryService
from recyclic_api.schemas.category import CategoryCreate, CategoryUpdate, CategoryDisplay

_V1 = settings.API_V1_STR.rstrip("/")


class TestCategoryOfficialName:
    """Service + schéma opérationnel (nom court vs nom officiel)."""

    def test_category_display_exposes_short_and_official(self, db_session: Session):
        cat = Category(
            id=uuid4(),
            name="Bricot",
            official_name="Articles de bricolage et jardinage thermique",
            is_active=True,
        )
        db_session.add(cat)
        db_session.commit()

        disp = CategoryDisplay.from_category(cat)
        assert disp.name == "Bricot"
        assert disp.official_name == "Articles de bricolage et jardinage thermique"

    def test_category_display_without_official_name(self, db_session: Session):
        cat = Category(
            id=uuid4(),
            name="EEE",
            official_name=None,
            is_active=True,
        )
        db_session.add(cat)
        db_session.commit()

        disp = CategoryDisplay.from_category(cat)
        assert disp.name == "EEE"
        assert disp.official_name is None

    @pytest.mark.asyncio
    async def test_create_category_with_official_name(self, db_session: Session):
        service = CategoryService(db_session)
        data = CategoryCreate(
            name="Bricot",
            official_name="Articles de bricolage et jardinage thermique",
        )
        result = await service.create_category(data)
        assert result.name == "Bricot"
        assert result.official_name == "Articles de bricolage et jardinage thermique"

    @pytest.mark.asyncio
    async def test_create_category_without_official_name(self, db_session: Session):
        service = CategoryService(db_session)
        data = CategoryCreate(
            name="EEE",
            official_name=None,
        )
        result = await service.create_category(data)
        assert result.name == "EEE"
        assert result.official_name is None

    @pytest.mark.asyncio
    async def test_update_category_official_name(self, db_session: Session):
        category = Category(
            id=uuid4(),
            name="Textile",
            official_name=None,
            is_active=True,
        )
        db_session.add(category)
        db_session.commit()

        service = CategoryService(db_session)
        result = await service.update_category(
            str(category.id), CategoryUpdate(official_name="Textile et habillement (officiel)")
        )
        assert result.name == "Textile"
        assert result.official_name == "Textile et habillement (officiel)"

    @pytest.mark.asyncio
    async def test_update_category_clear_official_name(self, db_session: Session):
        category = Category(
            id=uuid4(),
            name="Textile",
            official_name="Ancien libellé long",
            is_active=True,
        )
        db_session.add(category)
        db_session.commit()

        service = CategoryService(db_session)
        result = await service.update_category(str(category.id), CategoryUpdate(official_name=None))
        assert result.name == "Textile"
        assert result.official_name is None


class TestCategoryOfficialNameAPI:
    """Endpoints admin + réception."""

    def test_api_get_categories_returns_official_name(self, admin_client, db_session: Session):
        category = Category(
            id=uuid4(),
            name="Bricot",
            official_name="Articles de bricolage et jardinage thermique",
            is_active=True,
        )
        db_session.add(category)
        db_session.commit()

        response = admin_client.get(f"{_V1}/categories/")
        assert response.status_code == 200
        data = response.json()
        cat_data = next((c for c in data if c["id"] == str(category.id)), None)
        assert cat_data is not None
        assert cat_data["name"] == "Bricot"
        assert cat_data["official_name"] == "Articles de bricolage et jardinage thermique"

    def test_api_get_categories_without_official_name(self, admin_client, db_session: Session):
        category = Category(
            id=uuid4(),
            name="EEE",
            official_name=None,
            is_active=True,
        )
        db_session.add(category)
        db_session.commit()

        response = admin_client.get(f"{_V1}/categories/")
        assert response.status_code == 200
        data = response.json()
        cat_data = next((c for c in data if c["id"] == str(category.id)), None)
        assert cat_data is not None
        assert cat_data["name"] == "EEE"
        assert cat_data["official_name"] is None

    def test_api_create_category_with_official_name(self, admin_client):
        response = admin_client.post(
            f"{_V1}/categories/",
            json={
                "name": "Bricot",
                "official_name": "Articles de bricolage et jardinage thermique",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Bricot"
        assert data["official_name"] == "Articles de bricolage et jardinage thermique"

    def test_api_create_category_without_official_name(self, admin_client):
        response = admin_client.post(
            f"{_V1}/categories/",
            json={"name": "EEE"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "EEE"
        assert data["official_name"] is None

    def test_api_update_category_official_name(self, admin_client, db_session: Session):
        category = Category(
            id=uuid4(),
            name="Textile",
            official_name=None,
            is_active=True,
        )
        db_session.add(category)
        db_session.commit()

        response = admin_client.put(
            f"{_V1}/categories/{category.id}",
            json={"official_name": "Textile et habillement (officiel)"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Textile"
        assert data["official_name"] == "Textile et habillement (officiel)"

    def test_api_reception_get_categories_uses_short_name(self, admin_client, db_session: Session):
        """Réception : payload minimal ``id`` + ``name`` (nom court, story B48-P5)."""
        category = Category(
            id=uuid4(),
            name="Bricot",
            official_name="Articles de bricolage et jardinage thermique",
            is_active=True,
        )
        db_session.add(category)
        db_session.commit()

        response = admin_client.get(f"{_V1}/reception/categories")
        assert response.status_code == 200
        data = response.json()
        cat_data = next((c for c in data if c["id"] == str(category.id)), None)
        assert cat_data is not None
        assert cat_data["name"] == "Bricot"

    def test_api_reception_get_categories_without_official_still_short_name(self, admin_client, db_session: Session):
        category = Category(
            id=uuid4(),
            name="EEE",
            official_name=None,
            is_active=True,
        )
        db_session.add(category)
        db_session.commit()

        response = admin_client.get(f"{_V1}/reception/categories")
        assert response.status_code == 200
        data = response.json()
        cat_data = next((c for c in data if c["id"] == str(category.id)), None)
        assert cat_data is not None
        assert cat_data["name"] == "EEE"

    def test_api_reception_get_categories_exposes_parent_id_and_filters_visible_active(self, admin_client, db_session: Session):
        parent = Category(
            id=uuid4(),
            name="Livres",
            official_name="Livres",
            is_active=True,
            is_visible=True,
            display_order_entry=10,
        )
        child = Category(
            id=uuid4(),
            name="BD",
            official_name="Bandes dessinées",
            is_active=True,
            is_visible=True,
            parent_id=parent.id,
            display_order_entry=20,
        )
        hidden = Category(
            id=uuid4(),
            name="Masquée",
            official_name=None,
            is_active=True,
            is_visible=False,
            display_order_entry=0,
        )
        inactive = Category(
            id=uuid4(),
            name="Inactive",
            official_name=None,
            is_active=False,
            is_visible=True,
            display_order_entry=0,
        )
        db_session.add_all([parent, child, hidden, inactive])
        db_session.commit()

        response = admin_client.get(f"{_V1}/reception/categories")
        assert response.status_code == 200
        data = response.json()

        ids = [row["id"] for row in data]
        assert str(parent.id) in ids
        assert str(child.id) in ids
        assert str(hidden.id) not in ids
        assert str(inactive.id) not in ids

        parent_row = next(row for row in data if row["id"] == str(parent.id))
        child_row = next(row for row in data if row["id"] == str(child.id))
        assert parent_row["parent_id"] is None
        assert child_row["parent_id"] == str(parent.id)
        assert ids.index(str(parent.id)) < ids.index(str(child.id))

    def test_api_reception_get_categories_hides_technical_and_non_operational_labels(self, admin_client, db_session: Session):
        root_ok = Category(
            id=uuid4(),
            name="Livres",
            official_name="Livres",
            is_active=True,
            is_visible=True,
            display_order_entry=10,
        )
        technical_root = Category(
            id=uuid4(),
            name="ZZ_MCP_IMPORT_TEST_ROOT_deadbeef",
            official_name=None,
            is_active=True,
            is_visible=True,
            display_order_entry=0,
        )
        deprecated_root = Category(
            id=uuid4(),
            name="NE PLUS UTILISER Rangement",
            official_name=None,
            is_active=True,
            is_visible=True,
            display_order_entry=0,
        )
        technical_child = Category(
            id=uuid4(),
            name="ZZ_MCP_IMPORT_TEST_CHILD_deadbeef",
            official_name=None,
            is_active=True,
            is_visible=True,
            parent_id=root_ok.id,
            display_order_entry=20,
        )
        valid_child = Category(
            id=uuid4(),
            name="BD",
            official_name="Bandes dessinées",
            is_active=True,
            is_visible=True,
            parent_id=root_ok.id,
            display_order_entry=30,
        )
        db_session.add_all([root_ok, technical_root, deprecated_root, technical_child, valid_child])
        db_session.commit()

        response = admin_client.get(f"{_V1}/reception/categories")
        assert response.status_code == 200
        data = response.json()
        names = [row["name"] for row in data]

        assert "Livres" in names
        assert "BD" in names
        assert "ZZ_MCP_IMPORT_TEST_ROOT_deadbeef" not in names
        assert "ZZ_MCP_IMPORT_TEST_CHILD_deadbeef" not in names
        assert "NE PLUS UTILISER Rangement" not in names
