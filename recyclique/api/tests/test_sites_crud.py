from uuid import uuid4

from recyclic_api.core.config import settings
from recyclic_api.core.security import hash_password
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole

_V1 = settings.API_V1_STR.rstrip("/")


def test_create_site_success(admin_client):
    """Test successful site creation."""
    site_data = {
        "name": "Test Site",
        "address": "123 Test Street",
        "city": "Test City",
        "postal_code": "12345",
        "country": "Test Country",
        "is_active": True
    }

    response = admin_client.post(f"{_V1}/sites/", json=site_data)

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == site_data["name"]
    assert data["address"] == site_data["address"]
    assert data["city"] == site_data["city"]
    assert data["postal_code"] == site_data["postal_code"]
    assert data["country"] == site_data["country"]
    assert data["is_active"] == site_data["is_active"]
    assert "id" in data


def test_get_sites_success(admin_client, db_session):
    """Test successful sites retrieval."""
    # Create test sites
    site1 = Site(name="Site 1", address="Address 1", is_active=True)
    site2 = Site(name="Site 2", address="Address 2", is_active=False)
    db_session.add_all([site1, site2])
    db_session.commit()

    response = admin_client.get(f"{_V1}/sites/")

    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
    site_names = [site["name"] for site in data]
    assert "Site 1" in site_names
    assert "Site 2" in site_names


def test_get_site_by_id_success(admin_client, db_session):
    """Test successful site retrieval by ID."""
    site = Site(name="Test Site", address="Test Address", is_active=True)
    db_session.add(site)
    db_session.commit()
    db_session.refresh(site)

    response = admin_client.get(f"{_V1}/sites/{site.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Site"
    assert data["address"] == "Test Address"
    assert data["is_active"] == True


def test_update_site_success(admin_client, db_session):
    """Test successful site update."""
    site = Site(name="Original Name", address="Original Address", is_active=True)
    db_session.add(site)
    db_session.commit()
    db_session.refresh(site)

    update_data = {
        "name": "Updated Name",
        "address": "Updated Address",
        "is_active": False
    }

    response = admin_client.patch(f"{_V1}/sites/{site.id}", json=update_data)

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["address"] == "Updated Address"
    assert data["is_active"] == False


def test_delete_site_success(admin_client, db_session):
    """Test successful site deletion."""
    site = Site(name="To Be Deleted", address="Delete Address", is_active=True)
    db_session.add(site)
    db_session.commit()
    db_session.refresh(site)

    response = admin_client.delete(f"{_V1}/sites/{site.id}")

    assert response.status_code == 204

    # Verify site is deleted
    deleted_site = db_session.query(Site).filter(Site.id == site.id).first()
    assert deleted_site is None


def test_delete_site_fails_409_when_users_attached(admin_client, db_session):
    """Suppression refusée (409 Conflict) si au moins un utilisateur a ce site comme principal."""
    site = Site(name="Site avec rattachement", address="1 rue Test", is_active=True)
    db_session.add(site)
    db_session.commit()
    db_session.refresh(site)

    attached = User(
        username=f"rattache_{uuid4().hex}@test.com",
        hashed_password=hash_password("secret"),
        role=UserRole.USER,
        site_id=site.id,
    )
    db_session.add(attached)
    db_session.commit()

    response = admin_client.delete(f"{_V1}/sites/{site.id}")

    assert response.status_code == 409
    body = response.json()
    assert "detail" in body
    assert "utilisateur" in body["detail"].lower()


def test_create_site_requires_admin(client):
    """Sans jeton, la création est refusée (require_role_strict → 403 sans Bearer)."""
    site_data = {
        "name": "Test Site",
        "is_active": True
    }

    response = client.post(f"{_V1}/sites/", json=site_data)

    assert response.status_code == 403


def test_site_not_found(admin_client):
    """Test 404 response for non-existent site."""
    fake_id = "00000000-0000-0000-0000-000000000000"

    response = admin_client.get(f"{_V1}/sites/{fake_id}")
    assert response.status_code == 404

    response = admin_client.patch(f"{_V1}/sites/{fake_id}", json={"name": "Updated"})
    assert response.status_code == 404

    response = admin_client.delete(f"{_V1}/sites/{fake_id}")
    assert response.status_code == 404


def test_create_site_validation(admin_client):
    """Test site creation validation."""
    # Test empty name
    response = admin_client.post(f"{_V1}/sites/", json={"name": ""})
    assert response.status_code == 422

    # Test missing name
    response = admin_client.post(f"{_V1}/sites/", json={"address": "Test Address"})
    assert response.status_code == 422