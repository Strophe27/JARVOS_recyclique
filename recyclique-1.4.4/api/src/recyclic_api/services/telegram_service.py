"""
Service pour envoyer des notifications Telegram depuis l'API (canal sync / alertes kDrive uniquement).
"""

import httpx
import logging

from ..core.config import settings

logger = logging.getLogger(__name__)


def _telegram_notifications_active() -> bool:
    return bool(getattr(settings, "TELEGRAM_NOTIFICATIONS_ENABLED", False))


class TelegramNotificationService:
    """Notifications sortantes vers le bot : échecs de synchro kDrive (admins)."""

    def __init__(self):
        self.bot_base_url = settings.TELEGRAM_BOT_URL or "http://bot:8001"
        self.admin_ids = self._get_admin_telegram_ids()

    def _get_admin_telegram_ids(self) -> list[str]:
        """Récupérer la liste des IDs Telegram des admins."""
        if not settings.ADMIN_TELEGRAM_IDS:
            return []
        return [
            admin_id.strip()
            for admin_id in settings.ADMIN_TELEGRAM_IDS.split(",")
            if admin_id.strip()
        ]

    async def notify_sync_failure(self, file_path: str, remote_path: str, error_message: str) -> bool:
        """Envoyer une notification aux administrateurs lorsqu'une synchro kDrive échoue."""
        if not _telegram_notifications_active():
            logger.info(
                "Notification Telegram (sync/alerte) ignorée — TELEGRAM_NOTIFICATIONS_ENABLED=false "
                "(file_path=%s, remote_path=%s)",
                file_path,
                remote_path,
            )
            return True
        if not self.admin_ids:
            logger.warning("Aucun admin configuré pour recevoir les notifications de synchronisation")
            return False

        payload = {
            "admin_ids": self.admin_ids,
            "file_path": file_path,
            "remote_path": remote_path,
            "message": (
                "[ALERTE] Synchronisation kDrive échouée\n"
                f"Fichier : {file_path}\n"
                f"Destination : {remote_path}\n"
                f"Erreur : {error_message}"
            ),
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.bot_base_url}/api/notify/admin/sync-failure",
                    json=payload,
                    timeout=10.0,
                )

            if response.status_code == 200:
                logger.info("Notification de synchronisation kDrive envoyée aux admins")
                return True

            logger.error(
                "Échec de la notification de synchronisation kDrive: status=%s body=%s",
                response.status_code,
                response.text,
            )
            return False
        except Exception as exc:
            logger.error("Erreur lors de l'envoi de notification de synchronisation: %s", exc)
            return False


# Instance globale du service
telegram_service = TelegramNotificationService()
