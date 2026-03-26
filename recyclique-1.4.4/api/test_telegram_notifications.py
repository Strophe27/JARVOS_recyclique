#!/usr/bin/env python3
"""
Script manuel : vérifie le chemin notify_sync_failure (alertes synchro kDrive).
Les notifications approbation / rejet / admin user processed ont été retirées de l'API.
"""

import asyncio
import sys

sys.path.append("src")

from recyclic_api.services.telegram_service import telegram_service


async def test_sync_failure_notification():
    print("Test notify_sync_failure (nécessite bot + TELEGRAM_NOTIFICATIONS_ENABLED + ADMIN_TELEGRAM_IDS)")
    print("=" * 50)
    try:
        success = await telegram_service.notify_sync_failure(
            file_path="/tmp/test.csv",
            remote_path="/exports/test.csv",
            error_message="Test manuel",
        )
        if success:
            print("notify_sync_failure a retourné True")
        else:
            print("notify_sync_failure a retourné False (vérif config / bot / réseau)")
    except Exception as e:
        print(f"Erreur: {e}")


if __name__ == "__main__":
    asyncio.run(test_sync_failure_notification())
