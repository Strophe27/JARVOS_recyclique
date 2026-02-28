import json
import logging
import threading
import time
from uuid import uuid4

from api.config import get_settings
from api.db.session import SessionLocal
from api.services.member_sync import MemberSyncService

logger = logging.getLogger(__name__)
_shutdown_event: threading.Event | None = None


def set_member_sync_shutdown_event(event: threading.Event) -> None:
    global _shutdown_event
    _shutdown_event = event


def run_member_sync_worker() -> None:
    settings = get_settings()
    if not settings.paheko_members_sync_scheduler_enabled:
        return
    interval = max(30, settings.paheko_members_sync_interval_seconds)
    while True:
        if _shutdown_event and _shutdown_event.is_set():
            break
        db = SessionLocal()
        try:
            service = MemberSyncService(db)
            service.run_sync(request_id=f"member-sync-worker-{uuid4()}", actor_user_id=None)
        except Exception as exc:
            logger.error(
                json.dumps(
                    {
                        "event": "MEMBER_SYNC_WORKER_ERROR",
                        "error": exc.__class__.__name__,
                    },
                    ensure_ascii=True,
                )
            )
        finally:
            db.close()
        if _shutdown_event and _shutdown_event.is_set():
            break
        time.sleep(interval)

