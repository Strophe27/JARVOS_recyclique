"""Bootstrap super-admin + PIN step-up (FIRST_SUPER_ADMIN_PIN) — pas via lifespan, session de test directe."""
import uuid

from sqlalchemy import select

from recyclic_api.core.security import hash_password, verify_password
from recyclic_api.initial_data import (
    init_super_admin_and_dev_pin,
    init_super_admin_if_configured,
    maybe_backfill_bootstrap_super_admin_pin,
)
from recyclic_api.models.user import User, UserRole, UserStatus


def test_bootstrap_create_super_admin_with_pin(db_session, monkeypatch):
    u = f"sa_pin_{uuid.uuid4().hex[:8]}"
    monkeypatch.setenv("FIRST_SUPER_ADMIN_USERNAME", u)
    monkeypatch.setenv("FIRST_SUPER_ADMIN_PASSWORD", "StrongPassw0rd!")
    monkeypatch.setenv("FIRST_SUPER_ADMIN_PIN", "4242")
    init_super_admin_if_configured(db_session)
    user = db_session.execute(select(User).where(User.username == u)).scalar_one()
    assert user.hashed_pin is not None
    assert verify_password("4242", user.hashed_pin)


def test_bootstrap_invalid_pin_env_creates_user_without_pin(db_session, monkeypatch):
    u = f"sa_nopin_{uuid.uuid4().hex[:8]}"
    monkeypatch.setenv("FIRST_SUPER_ADMIN_USERNAME", u)
    monkeypatch.setenv("FIRST_SUPER_ADMIN_PASSWORD", "StrongPassw0rd!")
    monkeypatch.setenv("FIRST_SUPER_ADMIN_PIN", "12ab")
    init_super_admin_if_configured(db_session)
    user = db_session.execute(select(User).where(User.username == u)).scalar_one()
    assert user.hashed_pin is None


def test_backfill_pin_when_user_exists_without_pin_dev(db_session, monkeypatch):
    u = f"sa_bf_{uuid.uuid4().hex[:8]}"
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("FIRST_SUPER_ADMIN_USERNAME", u)
    monkeypatch.setenv("FIRST_SUPER_ADMIN_PIN", "7777")
    user = User(
        username=u,
        email=None,
        hashed_password=hash_password("x"),
        role=UserRole.SUPER_ADMIN,
        status=UserStatus.ACTIVE,
        is_active=True,
        hashed_pin=None,
    )
    db_session.add(user)
    db_session.commit()
    maybe_backfill_bootstrap_super_admin_pin(db_session)
    db_session.refresh(user)
    assert verify_password("7777", user.hashed_pin)


def test_backfill_skipped_in_production(db_session, monkeypatch):
    u = f"sa_prod_{uuid.uuid4().hex[:8]}"
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("FIRST_SUPER_ADMIN_USERNAME", u)
    monkeypatch.setenv("FIRST_SUPER_ADMIN_PIN", "1111")
    user = User(
        username=u,
        email=None,
        hashed_password=hash_password("x"),
        role=UserRole.SUPER_ADMIN,
        status=UserStatus.ACTIVE,
        is_active=True,
        hashed_pin=None,
    )
    db_session.add(user)
    db_session.commit()
    maybe_backfill_bootstrap_super_admin_pin(db_session)
    db_session.refresh(user)
    assert user.hashed_pin is None


def test_init_super_admin_and_dev_pin_sets_pin_on_create(db_session, monkeypatch):
    u = f"sa_full_{uuid.uuid4().hex[:8]}"
    monkeypatch.setenv("FIRST_SUPER_ADMIN_USERNAME", u)
    monkeypatch.setenv("FIRST_SUPER_ADMIN_PASSWORD", "StrongPassw0rd!")
    monkeypatch.setenv("FIRST_SUPER_ADMIN_PIN", "3333")
    monkeypatch.setenv("ENVIRONMENT", "development")
    init_super_admin_and_dev_pin(db_session)
    user = db_session.execute(select(User).where(User.username == u)).scalar_one()
    assert verify_password("3333", user.hashed_pin)
