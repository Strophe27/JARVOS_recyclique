# Story 17.6 — persistance parametres admin.

from __future__ import annotations

from sqlalchemy.orm import Session

from api.models.admin_setting import AdminSetting, SINGLETON_ID


def _defaults() -> dict:
    return {
        "alert_thresholds": {},
        "session": {},
        "email": {},
        "activity_threshold": None,
    }


def get_settings(db: Session) -> dict:
    """
    Lecture des parametres admin. BDD vide : retourne valeurs par defaut sans 500.
    """
    row = db.get(AdminSetting, SINGLETON_ID)
    if row is None:
        return _defaults()
    return {
        "alert_thresholds": row.alert_thresholds if row.alert_thresholds is not None else {},
        "session": row.session if row.session is not None else {},
        "email": row.email if row.email is not None else {},
        "activity_threshold": row.activity_threshold,
    }


def put_settings(db: Session, body: dict) -> dict:
    """
    Enregistrement des parametres admin. Merge sur la ligne singleton.
    """
    row = db.get(AdminSetting, SINGLETON_ID)
    if row is None:
        row = AdminSetting(id=SINGLETON_ID)
        db.add(row)
        db.flush()

    if "alert_thresholds" in body:
        row.alert_thresholds = body["alert_thresholds"] if body["alert_thresholds"] is not None else {}
    if "session" in body:
        row.session = body["session"] if body["session"] is not None else {}
    if "email" in body:
        row.email = body["email"] if body["email"] is not None else {}
    if "activity_threshold" in body:
        row.activity_threshold = body["activity_threshold"]

    db.commit()
    db.refresh(row)
    return get_settings(db)
