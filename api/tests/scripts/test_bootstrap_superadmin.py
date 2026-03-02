"""Story 17-HF-4 — tests bootstrap super_admin (création + idempotence)."""

import pytest
from sqlalchemy import select

from api.models import User
from api.scripts.bootstrap_superadmin import bootstrap_superadmin


def test_bootstrap_creates_super_admin(script_db_session) -> None:
    """Given aucun super_admin, When script exécuté avec username, Then user créé avec role super_admin."""
    db = script_db_session
    msg, password = bootstrap_superadmin("first_admin", db=db)
    assert "créé" in msg
    assert password is not None
    assert len(password) >= 16

    user = db.execute(select(User).where(User.username == "first_admin")).scalars().one()
    assert user.role == "super_admin"
    assert user.email == "first_admin@bootstrap.local"
    assert user.status == "active"


def test_bootstrap_idempotent_when_already_super_admin(script_db_session) -> None:
    """Given super_admin existant, When script ré-exécuté, Then message informatif sans erreur."""
    db = script_db_session
    msg1, pwd1 = bootstrap_superadmin("sa_user", db=db)
    assert "créé" in msg1
    assert pwd1 is not None

    msg2, pwd2 = bootstrap_superadmin("sa_user", db=db)
    assert "déjà existant" in msg2
    assert pwd2 is None


def test_bootstrap_promotes_existing_user(script_db_session) -> None:
    """Given user existant (role admin), When script exécuté, Then user promu super_admin."""
    db = script_db_session
    from api.services.auth import AuthService
    auth = AuthService(db)
    existing = User(
        username="admin_to_promote",
        email="admin@test.local",
        password_hash=auth.hash_password("test123"),
        role="admin",
        status="active",
    )
    db.add(existing)
    db.commit()

    msg, password = bootstrap_superadmin("admin_to_promote", db=db)
    assert "promu" in msg
    assert password is None

    user = db.execute(select(User).where(User.username == "admin_to_promote")).scalars().one()
    assert user.role == "super_admin"
