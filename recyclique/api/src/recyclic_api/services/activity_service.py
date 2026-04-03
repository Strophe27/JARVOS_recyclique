import logging
import time
from datetime import datetime, timezone
from typing import Dict, Optional

from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from recyclic_api.core.redis import get_redis
from recyclic_api.models.login_history import LoginHistory
from recyclic_api.models.setting import Setting
from recyclic_api.models.user import User
from recyclic_api.schemas.admin import UserStatusInfo, UserStatusesResponse

logger = logging.getLogger(__name__)

DEFAULT_ACTIVITY_THRESHOLD_MINUTES = 15
_SETTINGS_CACHE_TTL_SECONDS = 60


class ActivityService:
    """Service utilitaire pour la gestion de l'activité utilisateur en temps réel."""

    KEY_PREFIX = "last_activity"
    META_PREFIX = "last_activity_meta"
    LOGOUT_PREFIX = "last_logout"

    _cached_threshold_minutes = DEFAULT_ACTIVITY_THRESHOLD_MINUTES
    _cache_expiration_timestamp = 0.0

    def __init__(self, db: Optional[Session] = None):
        self.db = db
        self.redis = get_redis()

    @classmethod
    def _cache_is_valid(cls) -> bool:
        return cls._cache_expiration_timestamp > time.time()

    @classmethod
    def _update_cache(cls, value: int) -> None:
        cls._cached_threshold_minutes = value
        cls._cache_expiration_timestamp = time.time() + _SETTINGS_CACHE_TTL_SECONDS

    @classmethod
    def refresh_cache(cls, value: int) -> None:
        """Met à jour explicitement le cache du seuil d'activité."""
        cls._update_cache(value)

    def get_activity_threshold_minutes(self) -> int:
        """Récupère le seuil d'activité (en minutes), avec un cache léger."""
        cls = type(self)
        if cls._cache_is_valid():
            return cls._cached_threshold_minutes

        threshold_minutes = DEFAULT_ACTIVITY_THRESHOLD_MINUTES
        if self.db is not None:
            try:
                setting = (
                    self.db.query(Setting)
                    .filter(Setting.key == "activity_threshold_minutes")
                    .first()
                )
                if setting is not None:
                    candidate = int(str(setting.value))
                    if candidate > 0:
                        threshold_minutes = candidate
            except (ValueError, TypeError):
                logger.warning(
                    "Valeur invalide pour activity_threshold_minutes, utilisation de la valeur par défaut."
                )
            except Exception as exc:
                logger.error(
                    "Erreur lors de la récupération du seuil d'activité : %s", exc
                )

        cls._update_cache(threshold_minutes)
        return threshold_minutes

    def _activity_key(self, user_id: str) -> str:
        return f"{self.KEY_PREFIX}:{user_id}"

    def _meta_key(self, user_id: str) -> str:
        return f"{self.META_PREFIX}:{user_id}"

    def _logout_key(self, user_id: str) -> str:
        return f"{self.LOGOUT_PREFIX}:{user_id}"

    def record_user_activity(
        self,
        user_id: str,
        metadata: Optional[Dict[str, str]] = None,
        threshold_override: Optional[int] = None,
    ) -> Optional[int]:
        """Enregistre la dernière activité de l'utilisateur dans Redis."""
        if not user_id:
            return None

        timestamp = int(time.time())
        threshold_minutes = threshold_override or self.get_activity_threshold_minutes()
        expiration_seconds = max(int(threshold_minutes * 60 * 2), threshold_minutes * 60)

        try:
            activity_key = self._activity_key(user_id)
            self.redis.set(activity_key, timestamp, ex=expiration_seconds)

            # Une nouvelle activité rend obsolète un éventuel marqueur de déconnexion
            self.redis.delete(self._logout_key(user_id))

            if metadata:
                meta_key = self._meta_key(user_id)
                self.redis.hset(meta_key, mapping=metadata)
                self.redis.expire(meta_key, expiration_seconds)

            return timestamp
        except Exception as exc:
            logger.warning(
                "Impossible d'enregistrer l'activité pour l'utilisateur %s : %s",
                user_id,
                exc,
            )
            return None

    def record_logout(self, user_id: str) -> Optional[int]:
        """Enregistre la dernière déconnexion de l'utilisateur."""
        if not user_id:
            return None

        try:
            timestamp = int(time.time())
            threshold_minutes = self.get_activity_threshold_minutes()
            expiration_seconds = max(int(threshold_minutes * 60 * 2), threshold_minutes * 60)
            logout_key = self._logout_key(user_id)
            self.redis.set(logout_key, timestamp, ex=expiration_seconds)
            return timestamp
        except Exception as exc:
            logger.warning(
                "Impossible d'enregistrer la déconnexion pour l'utilisateur %s : %s",
                user_id,
                exc,
            )
            return None

    def clear_user_activity(self, user_id: str) -> None:
        """Supprime l'activité et les métadonnées dans Redis puis enregistre la déconnexion."""
        if not user_id:
            return

        try:
            activity_key = self._activity_key(user_id)
            meta_key = self._meta_key(user_id)
            self.redis.delete(activity_key, meta_key)
            self.record_logout(user_id)
        except Exception as exc:
            logger.warning(
                "Impossible de supprimer l'activité pour l'utilisateur %s : %s",
                user_id,
                exc,
            )

    def get_last_activity_timestamp(self, user_id: str) -> Optional[int]:
        """Retourne le timestamp de la dernière activité enregistrée."""
        if not user_id:
            return None

        try:
            value = self.redis.get(self._activity_key(user_id))
            if value is None:
                return None
            return int(value)
        except (TypeError, ValueError):
            logger.debug(
                "Valeur d'activité invalide détectée pour l'utilisateur %s, suppression de la clé.",
                user_id,
            )
            self.clear_user_activity(user_id)
            return None
        except Exception as exc:
            logger.warning(
                "Impossible de récupérer l'activité pour l'utilisateur %s : %s",
                user_id,
                exc,
            )
            return None

    def get_minutes_since_activity(self, user_id: str) -> Optional[float]:
        """Calcule le nombre de minutes écoulées depuis la dernière activité."""
        last_activity = self.get_last_activity_timestamp(user_id)
        if last_activity is None:
            return None

        return (time.time() - last_activity) / 60

    def get_last_logout_timestamp(self, user_id: str) -> Optional[int]:
        """Retourne le timestamp de la dernière déconnexion enregistrée."""
        if not user_id:
            return None

        try:
            value = self.redis.get(self._logout_key(user_id))
            if value is None:
                return None
            return int(value)
        except (TypeError, ValueError):
            logger.debug(
                "Valeur de déconnexion invalide détectée pour l'utilisateur %s, suppression de la clé.",
                user_id,
            )
            self.redis.delete(self._logout_key(user_id))
            return None
        except Exception as exc:
            logger.warning(
                "Impossible de récupérer la déconnexion pour l'utilisateur %s : %s",
                user_id,
                exc,
            )
            return None

    def get_user_statuses_response(self) -> UserStatusesResponse:
        """
        Construit la réponse listant le statut en ligne / hors ligne de tous les utilisateurs
        (logique métier de GET /admin/users/statuses).
        """
        if self.db is None:
            raise ValueError(
                "Une session base de données est requise pour agréger les statuts utilisateurs."
            )

        threshold_minutes = self.get_activity_threshold_minutes()
        now_utc = datetime.now(timezone.utc)

        last_logins_subquery = (
            self.db.query(
                LoginHistory.user_id,
                func.max(LoginHistory.created_at).label("last_login"),
            )
            .filter(
                and_(
                    LoginHistory.success.is_(True),
                    LoginHistory.user_id.isnot(None),
                )
            )
            .group_by(LoginHistory.user_id)
            .subquery()
        )

        users_with_logins = (
            self.db.query(
                User.id,
                User.username,
                User.first_name,
                User.last_name,
                last_logins_subquery.c.last_login,
            )
            .outerjoin(
                last_logins_subquery,
                User.id == last_logins_subquery.c.user_id,
            )
            .all()
        )

        user_statuses: list[UserStatusInfo] = []
        online_count = 0
        offline_count = 0

        for user_data in users_with_logins:
            user_id, _username, _first_name, _last_name, last_login = user_data

            minutes_since_activity = self.get_minutes_since_activity(str(user_id))
            logout_timestamp = self.get_last_logout_timestamp(str(user_id))
            last_login_utc = None
            minutes_since_login = None

            if last_login:
                if last_login.tzinfo is None:
                    last_login_utc = last_login.replace(tzinfo=timezone.utc)
                else:
                    last_login_utc = last_login.astimezone(timezone.utc)
                minutes_since_login = (now_utc - last_login_utc).total_seconds() / 60

            is_online = (
                minutes_since_activity is not None
                and minutes_since_activity <= threshold_minutes
            )

            logout_after_last_login = False
            if logout_timestamp is not None and last_login_utc is not None:
                logout_after_last_login = logout_timestamp >= int(
                    last_login_utc.timestamp()
                )

            if not is_online and minutes_since_login is not None:
                if minutes_since_login <= threshold_minutes and not logout_after_last_login:
                    is_online = True
                    minutes_since_activity = minutes_since_login
                else:
                    if minutes_since_activity is None:
                        minutes_since_activity = minutes_since_login

            if is_online and logout_after_last_login:
                is_online = False

            if minutes_since_activity is None and minutes_since_login is not None:
                minutes_since_activity = minutes_since_login

            if is_online:
                online_count += 1
            else:
                offline_count += 1

            user_statuses.append(
                UserStatusInfo(
                    user_id=str(user_id),
                    is_online=is_online,
                    last_login=last_login,
                    minutes_since_login=int(minutes_since_activity)
                    if minutes_since_activity is not None
                    else None,
                )
            )

        total_count = len(user_statuses)

        return UserStatusesResponse(
            user_statuses=user_statuses,
            total_count=total_count,
            online_count=online_count,
            offline_count=offline_count,
            timestamp=datetime.now(timezone.utc),
        )
