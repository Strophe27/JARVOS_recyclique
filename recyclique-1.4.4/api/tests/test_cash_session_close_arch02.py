from __future__ import annotations

from pathlib import Path

import pytest
from sqlalchemy.orm import Session

from recyclic_api.core.auth import create_access_token
from recyclic_api.core.config import settings
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus

_V1 = settings.API_V1_STR.rstrip("/")


@pytest.fixture
def close_test_user(db_session: Session) -> User:
    from recyclic_api.core.security import hash_password

    user = User(
        telegram_id="arch02_close_user",
        username="arch02_close_user",
        email="arch02-close@example.com",
        hashed_password=hash_password("testpassword123"),
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def close_test_site(db_session: Session) -> Site:
    site = Site(
        name="ARCH-02 Close Site",
        address="123 Test Street",
        city="Test City",
        postal_code="12345",
        country="Test Country",
        is_active=True,
    )
    db_session.add(site)
    db_session.commit()
    db_session.refresh(site)
    return site


@pytest.fixture
def close_test_session(db_session: Session, close_test_user: User, close_test_site: Site) -> CashSession:
    session = CashSession(
        operator_id=close_test_user.id,
        site_id=close_test_site.id,
        initial_amount=50.0,
        current_amount=50.0,
        status=CashSessionStatus.OPEN,
        total_sales=25.0,
        total_items=3,
    )
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    return session


@pytest.fixture
def close_report_environment(monkeypatch, tmp_path):
    report_dir = tmp_path / "reports"
    monkeypatch.setattr(settings, "CASH_SESSION_REPORT_DIR", str(report_dir))
    monkeypatch.setattr(settings, "CASH_SESSION_REPORT_RECIPIENT", "reports@example.com")
    report_dir.mkdir(parents=True, exist_ok=True)

    def _fake_generate(db_session, cash_session, reports_dir=None):
        target_dir = Path(reports_dir) if reports_dir else report_dir
        target_dir.mkdir(parents=True, exist_ok=True)
        file_path = target_dir / f"{cash_session.id}.csv"
        file_path.write_text("session_id\n", encoding="utf-8")
        return file_path

    class _FakeEmailService:
        def send_email(self, **kwargs):
            return True

    monkeypatch.setattr(
        "recyclic_api.api.api_v1.endpoints.cash_sessions.generate_cash_session_report",
        _fake_generate,
    )
    monkeypatch.setattr(
        "recyclic_api.api.api_v1.endpoints.cash_sessions.get_email_service",
        lambda: _FakeEmailService(),
    )


def test_close_cash_session_success_arch02(client, close_test_session: CashSession, close_test_user: User, close_report_environment):
    response = client.post(
        f"{_V1}/cash-sessions/{close_test_session.id}/close",
        json={"actual_amount": 75.0, "variance_comment": None},
        headers={"Authorization": f"Bearer {create_access_token(data={'sub': str(close_test_user.id)})}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "closed"
    assert data["closing_amount"] == 75.0
    assert data["actual_amount"] == 75.0
    assert data["variance"] == 0.0


def test_close_cash_session_requires_comment_when_variance_exceeds_tolerance_arch02(client, close_test_session: CashSession, close_test_user: User):
    response = client.post(
        f"{_V1}/cash-sessions/{close_test_session.id}/close",
        json={"actual_amount": 80.0, "variance_comment": None},
        headers={"Authorization": f"Bearer {create_access_token(data={'sub': str(close_test_user.id)})}"},
    )

    assert response.status_code == 400
    assert "commentaire est obligatoire" in response.json()["detail"]
