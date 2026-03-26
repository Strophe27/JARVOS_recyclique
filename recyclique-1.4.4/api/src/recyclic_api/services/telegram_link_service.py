"""Service historique pour la liaison Telegram — flux désactivé côté API (410 Gone).

Seul l'helper d'authentification local subsiste ; ``link_telegram_account`` reste
neutralisé sans modifier le schéma DB.
"""
from typing import NoReturn, Optional
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

    def link_telegram_account(self, username: str, password: str, telegram_id: str) -> NoReturn:
        """Ancienne liaison Telegram — désactivée (lever ``TelegramLinkDisabledError``).

        Conservé pour tout appelant hors HTTP ; la route ``POST .../link-telegram`` renvoie 410.
        """
        raise TelegramLinkDisabledError(TELEGRAM_LINK_DISABLED_DETAIL)
