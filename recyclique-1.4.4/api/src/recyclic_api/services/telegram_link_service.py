"""Service historique pour la liaison Telegram — flux désactivé côté API (410 Gone).

Les helpers d'authentification / conflit restent pour cohérence avec le modèle User
sans modifier le schéma DB ; seul ``link_telegram_account`` est neutralisé.
"""
from typing import Optional, Tuple
from sqlalchemy.orm import Session

from recyclic_api.core.exceptions import TelegramLinkDisabledError
from recyclic_api.core.security import verify_password
from recyclic_api.models.user import User

TELEGRAM_LINK_DISABLED_DETAIL = (
    "La liaison de compte Telegram n'est plus disponible. Cette fonctionnalité a été retirée."
)


class TelegramLinkService:
    """Service pour la liaison Telegram (désactivée — utiliser la route HTTP documentée)."""

    def __init__(self, db: Session):
        self.db = db

    def authenticate_user(self, username: str, password: str) -> Optional[User]:
        """Authentifie un utilisateur avec username et password."""
        user = self.db.query(User).filter(User.username == username).first()
        if not user or not user.hashed_password:
            return None

        if not verify_password(password, user.hashed_password):
            return None

        return user if user.is_active else None

    def check_telegram_id_conflict(self, telegram_id: str, exclude_user_id: Optional[str] = None) -> bool:
        """Vérifie si le telegram_id est déjà utilisé par un autre utilisateur."""
        query = self.db.query(User).filter(User.telegram_id == telegram_id)
        if exclude_user_id:
            query = query.filter(User.id != exclude_user_id)

        # Convertir exclude_user_id en UUID si nécessaire
        if exclude_user_id:
            from uuid import UUID
            try:
                exclude_uuid = UUID(exclude_user_id)
                return query.filter(User.id != exclude_uuid).first() is not None
            except ValueError:
                pass

        return query.first() is not None

    def link_telegram_account(self, username: str, password: str, telegram_id: str) -> Tuple[bool, str]:
        """Ancienne liaison Telegram — désactivée (lever ``TelegramLinkDisabledError``).

        Conservé pour tout appelant hors HTTP ; la route ``POST .../link-telegram`` renvoie 410.
        """
        raise TelegramLinkDisabledError(TELEGRAM_LINK_DISABLED_DETAIL)
