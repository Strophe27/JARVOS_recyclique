"""
Service de gestion des refresh tokens avec rotation et révocation.
Story B42-P2: Backend – Refresh token & réémission glissante
"""
import hashlib
import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from uuid import UUID

from sqlalchemy.orm import Session

from recyclic_api.core.security import get_token_expiration_minutes
from recyclic_api.models.setting import Setting
from recyclic_api.models.user_session import UserSession
from recyclic_api.services.activity_service import ActivityService

logger = logging.getLogger(__name__)

# Valeurs par défaut
DEFAULT_REFRESH_TOKEN_MAX_HOURS = 24
DEFAULT_ACTIVITY_THRESHOLD_MINUTES = 15


class RefreshTokenService:
    """Service pour la gestion des refresh tokens avec rotation et révocation."""

    def __init__(self, db: Session):
        self.db = db
        self.activity_service = ActivityService(db)

    def _get_refresh_token_max_hours(self) -> int:
        """Récupère la durée max du refresh token depuis les settings (en heures)."""
        try:
            setting = (
                self.db.query(Setting)
                .filter(Setting.key == "refresh_token_max_hours")
                .first()
            )
            if setting is not None:
                value = int(str(setting.value))
                if 1 <= value <= 168:  # Entre 1h et 7 jours
                    return value
                else:
                    logger.warning(
                        f"Valeur refresh_token_max_hours {value} hors limites (1-168), utilisation de la valeur par défaut {DEFAULT_REFRESH_TOKEN_MAX_HOURS}"
                    )
        except (ValueError, TypeError) as e:
            logger.warning(
                f"Valeur invalide pour refresh_token_max_hours: {e}, utilisation de la valeur par défaut"
            )
        except Exception as e:
            logger.error(f"Erreur lors de la récupération de refresh_token_max_hours: {e}")

        return DEFAULT_REFRESH_TOKEN_MAX_HOURS

    def _hash_refresh_token(self, token: str) -> str:
        """Hash un refresh token avec SHA-256 pour stockage sécurisé."""
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    def generate_refresh_token(self) -> str:
        """Génère un refresh token opaque (random 32 bytes, URL-safe)."""
        return secrets.token_urlsafe(32)

    def create_session(
        self,
        user_id: UUID,
        refresh_token: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> UserSession:
        """
        Crée une nouvelle session utilisateur avec un refresh token.

        Args:
            user_id: ID de l'utilisateur
            refresh_token: Token opaque généré
            ip_address: Adresse IP du client (optionnel)
            user_agent: User-Agent du client (optionnel)

        Returns:
            UserSession créée
        """
        token_hash = self._hash_refresh_token(refresh_token)
        now = datetime.now(timezone.utc)
        max_hours = self._get_refresh_token_max_hours()
        expires_at = now + timedelta(hours=max_hours)

        session = UserSession(
            id=uuid.uuid4(),
            user_id=user_id,
            refresh_token_hash=token_hash,
            issued_at=now,
            expires_at=expires_at,
            last_used_at=now,
            last_ip=ip_address,
            user_agent=user_agent,
        )

        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)

        logger.info(f"Session créée pour user_id={user_id}, expires_at={expires_at}")
        return session

    def validate_and_rotate(
        self,
        refresh_token: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Tuple[UserSession, str]:
        """
        Valide un refresh token et effectue la rotation (crée un nouveau token).

        Args:
            refresh_token: Token à valider
            ip_address: Adresse IP du client (optionnel)
            user_agent: User-Agent du client (optionnel)

        Returns:
            Tuple (UserSession, nouveau_refresh_token)

        Raises:
            ValueError: Si le token est invalide, expiré, révoqué ou utilisateur inactif
        """
        token_hash = self._hash_refresh_token(refresh_token)

        # Rechercher la session
        session = (
            self.db.query(UserSession)
            .filter(UserSession.refresh_token_hash == token_hash)
            .first()
        )

        if not session:
            logger.warning("Tentative de refresh avec token invalide (hash non trouvé)")
            raise ValueError("Refresh token invalide")

        # Vérifier si révoqué
        if session.revoked_at is not None:
            logger.warning(f"Tentative de refresh avec token révoqué (session_id={session.id})")
            raise ValueError("Refresh token révoqué")

        # Vérifier expiration
        now = datetime.now(timezone.utc)
        if session.expires_at <= now:
            logger.warning(f"Tentative de refresh avec token expiré (session_id={session.id})")
            raise ValueError("Refresh token expiré")

        # Vérifier activité récente via ActivityService
        token_expiration_minutes = get_token_expiration_minutes()
        minutes_since_activity = self.activity_service.get_minutes_since_activity(
            str(session.user_id)
        )

        if minutes_since_activity is None:
            # Pas d'activité enregistrée = utilisateur inactif trop longtemps
            logger.warning(
                f"Tentative de refresh pour user_id={session.user_id} sans activité récente"
            )
            raise ValueError("Session expirée - inactivité trop longue")

        if minutes_since_activity > token_expiration_minutes:
            logger.warning(
                f"Tentative de refresh pour user_id={session.user_id} avec inactivité de {minutes_since_activity:.1f} min (seuil: {token_expiration_minutes} min)"
            )
            raise ValueError("Session expirée - inactivité trop longue")

        # Rotation: invalider l'ancien token
        session.revoked_at = now
        session.updated_at = now

        # Créer un nouveau refresh token
        new_refresh_token = self.generate_refresh_token()
        new_token_hash = self._hash_refresh_token(new_refresh_token)

        # Créer une nouvelle session
        new_session = UserSession(
            id=uuid.uuid4(),
            user_id=session.user_id,
            refresh_token_hash=new_token_hash,
            issued_at=now,
            expires_at=session.expires_at,  # Conserver la même expiration max
            last_used_at=now,
            last_ip=ip_address or session.last_ip,
            user_agent=user_agent or session.user_agent,
        )

        self.db.add(new_session)
        self.db.commit()
        self.db.refresh(new_session)

        logger.info(
            f"Refresh token roté pour user_id={session.user_id}, "
            f"ancienne_session={session.id}, nouvelle_session={new_session.id}"
        )

        return new_session, new_refresh_token

    def revoke_session(self, session_id: UUID) -> bool:
        """
        Révoque une session spécifique.

        Args:
            session_id: ID de la session à révoquer

        Returns:
            True si la session a été révoquée, False si elle n'existe pas
        """
        session = self.db.query(UserSession).filter(UserSession.id == session_id).first()

        if not session:
            return False

        if session.revoked_at is None:
            session.revoked_at = datetime.now(timezone.utc)
            session.updated_at = datetime.now(timezone.utc)
            self.db.commit()
            logger.info(f"Session révoquée: session_id={session_id}, user_id={session.user_id}")
            return True

        return False

    def revoke_all_user_sessions(self, user_id: UUID) -> int:
        """
        Révoque toutes les sessions actives d'un utilisateur.

        Args:
            user_id: ID de l'utilisateur

        Returns:
            Nombre de sessions révoquées
        """
        now = datetime.now(timezone.utc)
        sessions = (
            self.db.query(UserSession)
            .filter(
                UserSession.user_id == user_id,
                UserSession.revoked_at.is_(None),
                UserSession.expires_at > now,
            )
            .all()
        )

        count = 0
        for session in sessions:
            session.revoked_at = now
            session.updated_at = now
            count += 1

        if count > 0:
            self.db.commit()
            logger.info(f"Révoqué {count} session(s) pour user_id={user_id}")

        return count

    def get_active_sessions(self, user_id: UUID) -> list[UserSession]:
        """
        Récupère toutes les sessions actives d'un utilisateur.

        Args:
            user_id: ID de l'utilisateur

        Returns:
            Liste des sessions actives
        """
        now = datetime.now(timezone.utc)
        return (
            self.db.query(UserSession)
            .filter(
                UserSession.user_id == user_id,
                UserSession.revoked_at.is_(None),
                UserSession.expires_at > now,
            )
            .order_by(UserSession.last_used_at.desc())
            .all()
        )

