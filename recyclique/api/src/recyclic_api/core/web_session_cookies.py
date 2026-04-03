"""
Transport session web v2 (Epic 2.1) : cookies httpOnly pour access / refresh.
Legacy : Authorization Bearer + JSON inchangés si use_web_session_cookies=false.
"""

from __future__ import annotations

from fastapi.responses import Response

from recyclic_api.core.config import settings


def _cookie_secure() -> bool:
    """Secure=true hors environnements dev/test locaux (TestClient HTTP)."""
    env = (settings.ENVIRONMENT or "").lower()
    if env in ("development", "dev", "local", "test"):
        return False
    return True


def _samesite() -> str:
    v = (settings.WEB_SESSION_COOKIE_SAMESITE or "lax").lower()
    return v if v in ("lax", "strict", "none") else "lax"


def attach_web_session_cookies(
    response: Response,
    *,
    access_token: str,
    refresh_token: str | None,
    access_max_age_seconds: int,
    refresh_max_age_seconds: int,
) -> None:
    response.set_cookie(
        key=settings.WEB_SESSION_ACCESS_COOKIE_NAME,
        value=access_token,
        max_age=access_max_age_seconds,
        httponly=True,
        secure=_cookie_secure(),
        samesite=_samesite(),
        path=settings.WEB_SESSION_COOKIE_PATH,
    )
    if refresh_token:
        response.set_cookie(
            key=settings.WEB_SESSION_REFRESH_COOKIE_NAME,
            value=refresh_token,
            max_age=refresh_max_age_seconds,
            httponly=True,
            secure=_cookie_secure(),
            samesite=_samesite(),
            path=settings.WEB_SESSION_COOKIE_PATH,
        )


def clear_web_session_cookies(response: Response) -> None:
    path = settings.WEB_SESSION_COOKIE_PATH
    response.delete_cookie(key=settings.WEB_SESSION_ACCESS_COOKIE_NAME, path=path)
    response.delete_cookie(key=settings.WEB_SESSION_REFRESH_COOKIE_NAME, path=path)
