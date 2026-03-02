#! /usr/bin/env python3
"""Bootstrap super_admin — Story 17-HF-4.
Script CLI idempotent : crée ou promeut un utilisateur en super_admin.
Usage : python api/scripts/bootstrap_superadmin.py USERNAME
Exécutable dans Docker : docker compose exec recyclic python api/scripts/bootstrap_superadmin.py USERNAME
"""

import argparse
import secrets
import sys

from sqlalchemy import select
from sqlalchemy.orm import Session

from api.db import SessionLocal
from api.models import User
from api.services.auth import AuthService


def _generate_password(length: int = 24) -> str:
    """Génère un mot de passe aléatoire cryptographiquement sûr."""
    return secrets.token_urlsafe(length)


def bootstrap_superadmin(username: str, db: Session | None = None) -> tuple[str, str | None]:
    """Bootstrap ou promeut un super_admin.
    Args:
        username: nom d'utilisateur cible.
        db: session DB optionnelle (pour tests). Si None, utilise SessionLocal.
    Returns:
        (message, password_or_none) — password_or_none vaut le nouveau mot de passe
        uniquement si un nouvel utilisateur a été créé ; sinon None.
    """
    own_session = db is None
    if own_session:
        db = SessionLocal()

    try:
        user = db.execute(select(User).where(User.username == username)).scalars().one_or_none()

        if user is None:
            # Cas 1 : créer un nouvel utilisateur super_admin
            password = _generate_password()
            auth = AuthService(db)
            new_user = User(
                username=username,
                email=f"{username}@bootstrap.local",
                password_hash=auth.hash_password(password),
                role="super_admin",
                status="active",
            )
            db.add(new_user)
            db.commit()
            return f"super_admin créé : {username} (email={username}@bootstrap.local)", password

        if user.role == "super_admin":
            return f"super_admin déjà existant : {username}", None

        # Cas 2 : promouvoir l'utilisateur existant
        user.role = "super_admin"
        if user.status != "active":
            user.status = "active"
        db.commit()
        return f"utilisateur promu super_admin : {username}", None

    finally:
        if own_session and db:
            db.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Bootstrap ou promouvoir un super_admin")
    parser.add_argument("username", help="Nom d'utilisateur à créer ou à promouvoir")
    args = parser.parse_args()
    username = (args.username or "").strip()
    if not username:
        print("Erreur : username requis.", file=sys.stderr)
        return 1

    message, password = bootstrap_superadmin(username)
    print(message)
    if password:
        print(f"\nMot de passe généré (à changer dès le premier login) :\n{password}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
