"""
Tests unitaires pour RefreshTokenService
Story B42-P2: Backend – Refresh token & réémission glissante
"""
import pytest
import time
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy.orm import Session

from recyclic_api.services.refresh_token_service import RefreshTokenService
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.user_session import UserSession
from recyclic_api.models.setting import Setting
from recyclic_api.core.security import hash_password
from recyclic_api.services.activity_service import ActivityService


class TestRefreshTokenService:
    """Tests unitaires pour RefreshTokenService."""

    def test_generate_refresh_token(self, db_session: Session):
        """Test la génération d'un refresh token."""
        service = RefreshTokenService(db_session)
        token1 = service.generate_refresh_token()
        token2 = service.generate_refresh_token()

        # Les tokens doivent être différents
        assert token1 != token2
        # Les tokens doivent être des strings non vides
        assert isinstance(token1, str)
        assert len(token1) > 0
        assert isinstance(token2, str)
        assert len(token2) > 0

    def test_create_session(self, db_session: Session):
        """Test la création d'une session avec refresh token."""
        # Créer un utilisateur de test
        user = User(
            id=uuid4(),
            username="test_refresh_user",
            hashed_password=hash_password("testpass"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()

        service = RefreshTokenService(db_session)
        refresh_token = service.generate_refresh_token()

        session = service.create_session(
            user_id=user.id,
            refresh_token=refresh_token,
            ip_address="192.168.1.1",
            user_agent="TestAgent/1.0",
        )

        assert session is not None
        assert session.user_id == user.id
        assert session.last_ip == "192.168.1.1"
        assert session.user_agent == "TestAgent/1.0"
        assert session.revoked_at is None
        assert session.expires_at > datetime.now(timezone.utc)

    def test_validate_and_rotate_success(self, db_session: Session):
        """Test la validation et rotation réussie d'un refresh token."""
        # Créer un utilisateur de test
        user = User(
            id=uuid4(),
            username="test_rotate_user",
            hashed_password=hash_password("testpass"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()

        service = RefreshTokenService(db_session)
        refresh_token = service.generate_refresh_token()

        # Créer une session
        session = service.create_session(
            user_id=user.id,
            refresh_token=refresh_token,
        )

        # Enregistrer une activité récente
        activity_service = ActivityService(db_session)
        activity_service.record_user_activity(str(user.id))

        # Valider et faire la rotation
        new_session, new_refresh_token = service.validate_and_rotate(
            refresh_token=refresh_token,
        )

        assert new_session is not None
        assert new_session.user_id == user.id
        assert new_refresh_token != refresh_token  # Nouveau token différent

        # Vérifier que l'ancienne session est révoquée
        db_session.refresh(session)
        assert session.revoked_at is not None

    def test_validate_and_rotate_invalid_token(self, db_session: Session):
        """Test la validation avec un token invalide."""
        service = RefreshTokenService(db_session)
        invalid_token = "invalid_token_12345"

        with pytest.raises(ValueError, match="Refresh token invalide"):
            service.validate_and_rotate(refresh_token=invalid_token)

    def test_validate_and_rotate_revoked_token(self, db_session: Session):
        """Test la validation avec un token révoqué."""
        # Créer un utilisateur de test
        user = User(
            id=uuid4(),
            username="test_revoked_user",
            hashed_password=hash_password("testpass"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()

        service = RefreshTokenService(db_session)
        refresh_token = service.generate_refresh_token()

        # Créer une session
        session = service.create_session(
            user_id=user.id,
            refresh_token=refresh_token,
        )

        # Révoquer la session
        session.revoked_at = datetime.now(timezone.utc)
        db_session.commit()

        # Tenter de valider le token révoqué
        with pytest.raises(ValueError, match="Refresh token révoqué"):
            service.validate_and_rotate(refresh_token=refresh_token)

    def test_validate_and_rotate_expired_token(self, db_session: Session):
        """Test la validation avec un token expiré."""
        # Créer un utilisateur de test
        user = User(
            id=uuid4(),
            username="test_expired_user",
            hashed_password=hash_password("testpass"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()

        service = RefreshTokenService(db_session)
        refresh_token = service.generate_refresh_token()

        # Créer une session expirée
        session = service.create_session(
            user_id=user.id,
            refresh_token=refresh_token,
        )
        session.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
        db_session.commit()

        # Tenter de valider le token expiré
        with pytest.raises(ValueError, match="Refresh token expiré"):
            service.validate_and_rotate(refresh_token=refresh_token)

    def test_validate_and_rotate_inactive_user(self, db_session: Session):
        """Test la validation avec un utilisateur inactif (pas d'activité récente)."""
        # Créer un utilisateur de test
        user = User(
            id=uuid4(),
            username="test_inactive_user",
            hashed_password=hash_password("testpass"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()

        service = RefreshTokenService(db_session)
        refresh_token = service.generate_refresh_token()

        # Créer une session
        service.create_session(
            user_id=user.id,
            refresh_token=refresh_token,
        )

        # Ne pas enregistrer d'activité (ou attendre que l'activité expire)
        # ActivityService retournera None si pas d'activité

        # Tenter de valider le token sans activité récente
        with pytest.raises(ValueError, match="Session expirée - inactivité trop longue"):
            service.validate_and_rotate(refresh_token=refresh_token)

    def test_revoke_session(self, db_session: Session):
        """Test la révocation d'une session spécifique."""
        # Créer un utilisateur de test
        user = User(
            id=uuid4(),
            username="test_revoke_user",
            hashed_password=hash_password("testpass"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()

        service = RefreshTokenService(db_session)
        refresh_token = service.generate_refresh_token()

        session = service.create_session(
            user_id=user.id,
            refresh_token=refresh_token,
        )

        # Révoquer la session
        result = service.revoke_session(session.id)
        assert result is True

        db_session.refresh(session)
        assert session.revoked_at is not None

    def test_revoke_all_user_sessions(self, db_session: Session):
        """Test la révocation de toutes les sessions d'un utilisateur."""
        # Créer un utilisateur de test
        user = User(
            id=uuid4(),
            username="test_revoke_all_user",
            hashed_password=hash_password("testpass"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()

        service = RefreshTokenService(db_session)

        # Créer plusieurs sessions
        session1 = service.create_session(
            user_id=user.id,
            refresh_token=service.generate_refresh_token(),
        )
        session2 = service.create_session(
            user_id=user.id,
            refresh_token=service.generate_refresh_token(),
        )

        # Révoquer toutes les sessions
        count = service.revoke_all_user_sessions(user.id)
        assert count == 2

        db_session.refresh(session1)
        db_session.refresh(session2)
        assert session1.revoked_at is not None
        assert session2.revoked_at is not None

    def test_get_active_sessions(self, db_session: Session):
        """Test la récupération des sessions actives."""
        # Créer un utilisateur de test
        user = User(
            id=uuid4(),
            username="test_active_sessions_user",
            hashed_password=hash_password("testpass"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()

        service = RefreshTokenService(db_session)

        # Créer plusieurs sessions
        session1 = service.create_session(
            user_id=user.id,
            refresh_token=service.generate_refresh_token(),
        )
        session2 = service.create_session(
            user_id=user.id,
            refresh_token=service.generate_refresh_token(),
        )

        # Révoquer une session
        service.revoke_session(session1.id)

        # Récupérer les sessions actives
        active_sessions = service.get_active_sessions(user.id)
        assert len(active_sessions) == 1
        assert active_sessions[0].id == session2.id

    def test_get_refresh_token_max_hours_from_settings(self, db_session: Session):
        """Test la récupération de refresh_token_max_hours depuis les settings."""
        # Créer un setting
        setting = Setting(
            key="refresh_token_max_hours",
            value="48",  # 48 heures
        )
        db_session.add(setting)
        db_session.commit()

        service = RefreshTokenService(db_session)
        max_hours = service._get_refresh_token_max_hours()

        assert max_hours == 48

    def test_get_refresh_token_max_hours_default(self, db_session: Session):
        """Test la valeur par défaut de refresh_token_max_hours."""
        service = RefreshTokenService(db_session)
        max_hours = service._get_refresh_token_max_hours()

        # Valeur par défaut = 24 heures
        assert max_hours == 24

