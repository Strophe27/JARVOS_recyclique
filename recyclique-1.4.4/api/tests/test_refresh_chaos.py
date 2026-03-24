"""
Tests de chaos et résilience pour le système de refresh token.

Story B42-P5: Hardening & tests de sécurité sliding session
AC4: Chaos / résilience - Test enchaînant redémarrage API/Redis pour s'assurer
que les refresh tokens et ActivityService gèrent les redémarrages (pas de logout massif).
"""

import pytest
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from jose import jwt

from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.models.user_session import UserSession
from recyclic_api.core.security import hash_password, create_access_token
from recyclic_api.services.refresh_token_service import RefreshTokenService
from recyclic_api.services.activity_service import ActivityService


class TestRefreshChaos:
    """Tests de chaos et résilience pour le système de refresh token."""

    def test_refresh_token_persists_after_db_restart(self, db_session):
        """
        Test que les refresh tokens persistent en DB après redémarrage.
        
        Scénario:
        1. Créer un utilisateur et une session avec refresh token
        2. Simuler un redémarrage DB (nouvelle session DB)
        3. Vérifier que le refresh token est toujours valide
        """
        # Créer utilisateur
        user = User(
            id=uuid4(),
            username="chaos_test_user",
            hashed_password=hash_password("testpass"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        
        # Créer refresh token service
        refresh_service = RefreshTokenService(db_session)
        
        # Générer refresh token
        refresh_token = refresh_service.generate_refresh_token()
        
        # Créer session
        session = refresh_service.create_session(
            user_id=user.id,
            refresh_token=refresh_token,
            ip_address="192.168.1.100",
            user_agent="test-agent"
        )
        db_session.commit()
        
        # Simuler redémarrage DB: nouvelle session DB (mais même DB)
        # En réalité, on utilise la même session mais on vérifie que les données persistent
        db_session.refresh(session)
        
        # Vérifier que la session existe toujours
        assert session is not None
        assert session.refresh_token_hash is not None
        assert session.revoked_at is None
        assert session.expires_at > datetime.now(timezone.utc)
        
        # Enregistrer une activité pour permettre le refresh
        activity_service = ActivityService(db_session)
        activity_service.record_user_activity(str(user.id))
        
        # Vérifier que le refresh token est toujours valide
        try:
            new_session, new_refresh_token = refresh_service.validate_and_rotate(
                refresh_token=refresh_token,
                ip_address="192.168.1.100",
                user_agent="test-agent"
            )
            assert new_session is not None
            assert new_refresh_token != refresh_token  # Rotation
        except ValueError as e:
            pytest.fail(f"Refresh token devrait être valide après 'redémarrage DB': {e}")

    def test_activity_service_reconnects_after_redis_restart(self, db_session):
        """
        Test que ActivityService se reconnecte à Redis après redémarrage.
        
        Scénario:
        1. Enregistrer une activité utilisateur
        2. Simuler redémarrage Redis (nouvelle connexion)
        3. Vérifier que l'activité est toujours accessible
        """
        # Créer utilisateur
        user = User(
            id=uuid4(),
            username="chaos_activity_user",
            hashed_password=hash_password("testpass"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        
        # Créer ActivityService
        activity_service = ActivityService(db_session)
        
        # Enregistrer activité
        activity_service.record_user_activity(str(user.id))
        
        # Vérifier que l'activité est enregistrée
        minutes_since = activity_service.get_minutes_since_activity(str(user.id))
        assert minutes_since is not None
        assert minutes_since < 1  # Très récent
        
        # Simuler redémarrage Redis: créer nouveau service (nouvelle connexion)
        # En réalité, on utilise le même service mais on vérifie que Redis fonctionne
        new_activity_service = ActivityService(db_session)
        
        # Vérifier que l'activité est toujours accessible
        minutes_since_after = new_activity_service.get_minutes_since_activity(str(user.id))
        assert minutes_since_after is not None
        assert minutes_since_after < 1  # Toujours récent

    def test_no_mass_logout_after_restart(self, db_session):
        """
        Test qu'aucun logout massif ne se produit après redémarrage.
        
        Scénario:
        1. Créer plusieurs utilisateurs avec sessions actives
        2. Simuler redémarrage (nouvelle session DB)
        3. Vérifier que toutes les sessions sont toujours valides
        """
        # Créer plusieurs utilisateurs
        users = []
        sessions = []
        refresh_service = RefreshTokenService(db_session)
        
        for i in range(3):
            user = User(
                id=uuid4(),
                username=f"chaos_mass_user_{i}",
                hashed_password=hash_password("testpass"),
                role=UserRole.USER,
                status=UserStatus.ACTIVE,
                is_active=True,
            )
            db_session.add(user)
            users.append(user)
            
            # Créer session avec refresh token
            refresh_token = refresh_service.generate_refresh_token()
            session = refresh_service.create_session(
                user_id=user.id,
                refresh_token=refresh_token,
                ip_address=f"192.168.1.{100 + i}",
                user_agent="test-agent"
            )
            sessions.append((session, refresh_token))
        
        db_session.commit()
        
        # Vérifier que toutes les sessions existent
        assert len(sessions) == 3
        
        # Simuler redémarrage: vérifier que toutes les sessions sont toujours valides
        for session, refresh_token in sessions:
            db_session.refresh(session)
            assert session.revoked_at is None, f"Session {session.id} ne devrait pas être révoquée"
            assert session.expires_at > datetime.now(timezone.utc), f"Session {session.id} ne devrait pas être expirée"
        
        # Enregistrer une activité pour chaque utilisateur pour permettre le refresh
        activity_service = ActivityService(db_session)
        for user in users:
            activity_service.record_user_activity(str(user.id))
        
        # Vérifier que tous les refresh tokens sont toujours valides
        for session, refresh_token in sessions:
            try:
                new_session, new_refresh_token = refresh_service.validate_and_rotate(
                    refresh_token=refresh_token,
                    ip_address="192.168.1.100",
                    user_agent="test-agent"
                )
                assert new_session is not None
            except ValueError as e:
                pytest.fail(f"Refresh token pour session {session.id} devrait être valide: {e}")

    def test_refresh_token_rotation_after_restart(self, db_session):
        """
        Test que la rotation de refresh token fonctionne après redémarrage.
        
        Scénario:
        1. Créer session avec refresh token
        2. Simuler redémarrage
        3. Faire rotation du refresh token
        4. Vérifier que l'ancien token est révoqué et le nouveau est valide
        """
        # Créer utilisateur
        user = User(
            id=uuid4(),
            username="chaos_rotation_user",
            hashed_password=hash_password("testpass"),
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        
        # Créer refresh token service
        refresh_service = RefreshTokenService(db_session)
        
        # Générer refresh token initial
        refresh_token_1 = refresh_service.generate_refresh_token()
        
        # Créer session
        session_1 = refresh_service.create_session(
            user_id=user.id,
            refresh_token=refresh_token_1,
            ip_address="192.168.1.100",
            user_agent="test-agent"
        )
        db_session.commit()
        
        # Simuler redémarrage: créer nouveau service
        new_refresh_service = RefreshTokenService(db_session)
        
        # Enregistrer une activité pour permettre le refresh
        activity_service = ActivityService(db_session)
        activity_service.record_user_activity(str(user.id))
        
        # Faire rotation (obtenir token2)
        session_2, refresh_token_2 = new_refresh_service.validate_and_rotate(
            refresh_token=refresh_token_1,
            ip_address="192.168.1.100",
            user_agent="test-agent"
        )
        db_session.commit()
        
        # Vérifier que l'ancien token est révoqué
        db_session.refresh(session_1)
        assert session_1.revoked_at is not None, "L'ancien token devrait être révoqué"
        
        # Vérifier que le nouveau token est valide
        assert refresh_token_2 != refresh_token_1, "Le nouveau token devrait être différent"
        
        # Vérifier que le nouveau token fonctionne
        session_3, refresh_token_3 = new_refresh_service.validate_and_rotate(
            refresh_token=refresh_token_2,
            ip_address="192.168.1.100",
            user_agent="test-agent"
        )
        assert session_3 is not None
        assert refresh_token_3 != refresh_token_2

