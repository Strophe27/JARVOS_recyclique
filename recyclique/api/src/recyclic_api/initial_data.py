import os
import re
import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from recyclic_api.core.security import hash_password
from recyclic_api.models.user import User, UserRole, UserStatus


logger = logging.getLogger(__name__)

# Environnements où un backfill PIN (FIRST_SUPER_ADMIN_PIN) est autorisé — jamais en production nominale.
_DEV_ENV_NAMES = frozenset({"development", "dev", "local", "test"})


def _dev_pin_backfill_allowed() -> bool:
    env = (os.getenv("ENVIRONMENT") or "development").strip().lower()
    return env in _DEV_ENV_NAMES


def _optional_pin_hash_from_env() -> Optional[str]:
    """Lit FIRST_SUPER_ADMIN_PIN ; retourne un hash bcrypt si le format est 4 chiffres, sinon None + log."""
    pin_plain = _get_env("FIRST_SUPER_ADMIN_PIN")
    if not pin_plain:
        return None
    if not re.match(r"^\d{4}$", pin_plain):
        logger.warning(
            "FIRST_SUPER_ADMIN_PIN invalide (attendu exactement 4 chiffres) ; ignoré."
        )
        return None
    return hash_password(pin_plain)


def _get_env(var_name: str) -> Optional[str]:
    """Read an environment variable and return None if empty."""
    value = os.getenv(var_name)
    if value is None:
        return None
    value = value.strip()
    return value if value else None


def init_super_admin_if_configured(db: Session) -> None:
    """
    Create the first Super Admin user if environment variables are set and the user does not exist yet.

    Idempotent: If user already exists or variables are not set, does nothing.
    """
    username_env = _get_env("FIRST_SUPER_ADMIN_USERNAME")
    password = _get_env("FIRST_SUPER_ADMIN_PASSWORD")

    # Determine username (username is mandatory; no email fallback)
    username = username_env

    if not username or not password:
        # Not configured; nothing to do
        logger.info("Super-admin bootstrap not configured (missing env vars). Skipping.")
        return

    # Check if a user with this username already exists
    existing = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if existing is not None:
        logger.info("Super-admin already exists. Skipping creation.")
        return

    # Create the super admin user (PIN step-up optionnel : Story 2.4 / 6.7 — même format que PUT /users/me/pin)
    pin_hash = _optional_pin_hash_from_env()
    new_user = User(
        username=username,
        email=None,
        hashed_password=hash_password(password),
        hashed_pin=pin_hash,
        role=UserRole.SUPER_ADMIN,
        status=UserStatus.ACTIVE,
        is_active=True,
    )

    db.add(new_user)
    db.commit()
    logger.info("Super-admin user created from environment configuration: %s", username)


def maybe_backfill_bootstrap_super_admin_pin(db: Session) -> None:
    """
    En dev/test uniquement : si l'utilisateur FIRST_SUPER_ADMIN_USERNAME existe sans PIN et
    FIRST_SUPER_ADMIN_PIN est valide (4 chiffres), définit hashed_pin.

    Permet de débloquer clôture / corrections sensibles sur une base locale déjà initialisée,
    sans reset SQL ni appel API (idempotent si PIN déjà défini).
    """
    if not _dev_pin_backfill_allowed():
        return
    pin_hash = _optional_pin_hash_from_env()
    if pin_hash is None:
        return
    username = _get_env("FIRST_SUPER_ADMIN_USERNAME")
    if not username:
        return
    user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
    if user is None or user.hashed_pin is not None:
        return
    user.hashed_pin = pin_hash
    db.commit()
    db.refresh(user)
    logger.info(
        "DEV: PIN step-up défini pour l'utilisateur bootstrap %s (FIRST_SUPER_ADMIN_PIN).",
        username,
    )


def init_super_admin_and_dev_pin(db: Session) -> None:
    """Point d'entrée startup : création super-admin puis backfill PIN dev si pertinent."""
    init_super_admin_if_configured(db)
    maybe_backfill_bootstrap_super_admin_pin(db)

