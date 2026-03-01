# Story 17.6 — parametres admin persistés (singleton).

from sqlalchemy import Column, Float, Integer, JSON

from api.models.base import Base

SINGLETON_ID = 1


class AdminSetting(Base):
    """Singleton : une seule ligne (id=1) pour les parametres admin."""

    __tablename__ = "admin_settings"

    id = Column(Integer, primary_key=True, default=SINGLETON_ID, autoincrement=False)
    alert_thresholds = Column(JSON, nullable=True, default=dict)
    session = Column(JSON, nullable=True, default=dict)
    email = Column(JSON, nullable=True, default=dict)
    activity_threshold = Column(Float, nullable=True)
