from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from recyclic_api.core.config import settings
from recyclic_api.core.security import hash_password, create_access_token
from recyclic_api.models.cash_session import CashSession, CashSessionStatus
from recyclic_api.models.site import Site
from recyclic_api.models.user import User, UserRole, UserStatus
from recyclic_api.utils.report_tokens import verify_download_token
def _auth_headers(user: User) -> dict[str, str]:
    token = create_access_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


def _create_user(db: Session, role: UserRole, username: str, site_id) -> User:
    user = User(
        username=username,
        email=f"{username}@example.com",
        hashed_password=hash_password('StrongPass!23'),
        role=role,
        status=UserStatus.APPROVED,
        is_active=True,
        site_id=site_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_dashboard_stats_endpoint(admin_client: TestClient, db_session: Session):
    """Teste la récupération réussie des statistiques du tableau de bord."""
    from recyclic_api.core.auth import get_current_user
    from recyclic_api.models.user import User, UserRole, UserStatus
    from recyclic_api.main import app
    
    # Créer un utilisateur admin mock
    admin_user = User(
        id=uuid4(),
        username="test_admin",
        role=UserRole.ADMIN,
        status=UserStatus.APPROVED,
        is_active=True
    )
    
    # Créer un site de test
    site = Site(id=uuid4(), name="Site Test Stats", is_active=True)
    db_session.add(site)
    db_session.commit()

    # Override de l'authentification
    app.dependency_overrides[get_current_user] = lambda: admin_user
    
    try:
        response = admin_client.get(
            f"{settings.API_V1_STR}/admin/dashboard/stats?site_id={site.id}"
        )
        
        assert response.status_code == 200
        data = response.json()
        # Vérifier que la réponse contient les champs attendus du dashboard
        assert "metrics" in data or "recent_sessions" in data or "recent_reports" in data
    finally:
        # Nettoyer l'override
        app.dependency_overrides.pop(get_current_user, None)


def test_dashboard_recent_reports_download_urls_include_token(
    monkeypatch, client: TestClient, db_session: Session
):
    reports_dir = Path(str(Path.cwd() / "tmp_dashboard_reports_test"))
    reports_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(settings, "CASH_SESSION_REPORT_DIR", str(reports_dir))

    site = Site(id=uuid4(), name="Site Dashboard Reports", is_active=True)
    db_session.add(site)
    db_session.commit()

    admin = _create_user(db_session, UserRole.ADMIN, "admin_dashboard_reports", site.id)

    session = CashSession(
        id=uuid4(),
        operator_id=admin.id,
        site_id=site.id,
        initial_amount=20.0,
        current_amount=20.0,
        status=CashSessionStatus.CLOSED,
        opened_at=datetime.now(timezone.utc),
        closed_at=datetime.now(timezone.utc),
        total_sales=5.0,
        total_items=1,
    )
    db_session.add(session)
    db_session.commit()

    filename = f"cash_session_{session.id}_20250101010101.csv"
    (reports_dir / filename).write_text("header\n", encoding="utf-8")

    response = client.get(
        f"{settings.API_V1_STR}/admin/dashboard/stats?site_id={site.id}",
        headers=_auth_headers(admin),
    )

    assert response.status_code == 200
    payload = response.json()
    recent_reports = payload.get("recentReports") or payload.get("recent_reports") or []
    assert recent_reports

    entry = next(report for report in recent_reports if report["filename"] == filename)
    download_url = entry.get("downloadUrl") or entry.get("download_url")
    parsed = urlparse(download_url)
    assert parsed.path.endswith(filename)
    token = parse_qs(parsed.query).get("token", [None])[0]
    assert token
    assert verify_download_token(token, filename)

