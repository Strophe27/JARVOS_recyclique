import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.main import app
from recyclic_api.models.category import Category
from recyclic_api.models.preset_button import PresetButton, ButtonType

from tests.api_v1_paths import v1

client = TestClient(app)


@pytest.fixture
def test_category(db_session: Session):
    """Create a test category for preset buttons"""
    category = Category(
        name="Test Category",
        is_active=True
    )
    db_session.add(category)
    db_session.commit()
    db_session.refresh(category)
    return category


@pytest.fixture
def test_preset_button(db_session: Session, test_category):
    """Create a test preset button"""
    preset = PresetButton(
        name="Test Preset",
        category_id=test_category.id,
        preset_price=10.50,
        button_type=ButtonType.DONATION,
        sort_order=1,
        is_active=True
    )
    db_session.add(preset)
    db_session.commit()
    db_session.refresh(preset)
    return preset


def test_get_presets_empty(db_session: Session):
    """Test getting presets when none exist"""
    response = client.get(v1("/presets/"))
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 0


def test_get_presets_with_data(db_session: Session, test_preset_button):
    """Test getting presets when data exists"""
    response = client.get(v1("/presets/"))
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1

    preset = data[0]
    assert preset["id"] == str(test_preset_button.id)
    assert preset["name"] == test_preset_button.name
    assert float(preset["preset_price"]) == 10.5
    assert preset["button_type"] == "donation"
    assert preset["category_name"] == "Test Category"


def test_get_active_presets(db_session: Session, test_preset_button):
    """Test getting only active presets"""
    response = client.get(v1("/presets/active"))
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1


def test_get_preset_by_id(db_session: Session, test_preset_button):
    """Test getting a specific preset by ID"""
    response = client.get(v1(f"/presets/{test_preset_button.id}"))
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(test_preset_button.id)
    assert data["name"] == test_preset_button.name


def test_get_preset_by_invalid_id():
    """ID non-UUID : le service renvoie None → 404 (pas de validation FastAPI sur le path)."""
    response = client.get(v1("/presets/invalid-id"))
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_get_nonexistent_preset():
    """Test getting a preset that doesn't exist"""
    random_uuid = str(uuid.uuid4())
    response = client.get(v1(f"/presets/{random_uuid}"))
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_filter_presets_by_category(db_session: Session, test_category, test_preset_button):
    """Test filtering presets by category"""
    response = client.get(v1(f"/presets/?category_id={test_category.id}"))
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["category_id"] == str(test_category.id)


def test_filter_presets_by_button_type(db_session: Session, test_preset_button):
    """Test filtering presets by button type"""
    response = client.get(v1("/presets/?button_type=donation"))
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["button_type"] == "donation"

    # Test with different type
    response = client.get(v1("/presets/?button_type=recycling"))
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 0


def test_filter_presets_by_active_status(db_session: Session, test_preset_button):
    """Test filtering presets by active status"""
    # Test active only
    response = client.get(v1("/presets/?is_active=true"))
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1

    # Test inactive only
    response = client.get(v1("/presets/?is_active=false"))
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 0
