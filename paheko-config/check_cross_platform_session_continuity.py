import argparse
import html
import json
import os
import re
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import requests


def relax_localhost_secure_cookies(cookie_jar) -> None:
    for cookie in cookie_jar:
        domain = (cookie.domain or "").lower()
        if cookie.secure and ("localhost" in domain or domain in {"", "127.0.0.1"}):
            cookie.secure = False


def sanitize_url(url: str) -> str:
    parsed = urlparse(url)
    params = []
    for key, value in parse_qsl(parsed.query, keep_blank_values=True):
        if key in {"state", "session_state", "code", "nonce"}:
            params.append((key, "***"))
        else:
            params.append((key, value))
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, urlencode(params), parsed.fragment))


def normalize_runtime_url(url: str) -> str:
    parsed = urlparse(url)
    netloc = parsed.netloc
    if netloc == "keycloak:8080":
        netloc = "localhost:8081"
    elif netloc.startswith("keycloak:"):
        netloc = netloc.replace("keycloak:", "localhost:", 1)
    elif netloc.startswith("host.docker.internal:"):
        netloc = netloc.replace("host.docker.internal:", "localhost:", 1)
    return urlunparse((parsed.scheme, netloc, parsed.path, parsed.params, parsed.query, parsed.fragment))


def sanitize_cookie_header(cookie_header: str) -> str:
    if not cookie_header:
        return ""
    parts = cookie_header.split(";", 1)
    if "=" not in parts[0]:
        return cookie_header
    key = parts[0].split("=", 1)[0]
    suffix = ";" + parts[1] if len(parts) > 1 else ""
    return f"{key}=***{suffix}"


def _extract_keycloak_form_action(html_text: str) -> str:
    action_match = re.search(r"<form[^>]*id=['\"]kc-form-login['\"][^>]*action=['\"]([^'\"]+)['\"]", html_text)
    if not action_match:
        action_match = re.search(r"<form[^>]*action=['\"]([^'\"]+)['\"]", html_text)
    if not action_match:
        return ""
    return html.unescape(action_match.group(1))


def _extract_hidden_inputs(html_text: str) -> dict[str, str]:
    return dict(
        re.findall(
            r"<input[^>]*name=['\"]([^'\"]+)['\"][^>]*value=['\"]([^'\"]*)['\"][^>]*>",
            html_text,
        )
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate cross-platform continuity: RecyClique OIDC then Paheko OIDC with same IdP user."
    )
    parser.add_argument("--recyclique-base-url", default="http://localhost:8000")
    parser.add_argument("--paheko-base-url", default="http://localhost:8080")
    parser.add_argument("--username", default="oidc.recyclique")
    parser.add_argument(
        "--password",
        default=None,
        help="OIDC password. If omitted, uses OIDC_TEST_PASSWORD env var.",
    )
    parser.add_argument("--expected-email", default="test@reception.local")
    parser.add_argument("--request-id", required=True)
    args = parser.parse_args()
    password = args.password or os.getenv("OIDC_TEST_PASSWORD")
    if not password:
        parser.error("Missing --password (or OIDC_TEST_PASSWORD env var).")

    session = requests.Session()
    recyclique_base = args.recyclique_base_url.rstrip("/")
    paheko_base = args.paheko_base_url.rstrip("/")

    print("scenario", "continuite_session_cross_plateforme_meme_user")
    print("request_id", args.request_id)

    # 1) RecyClique nominal login.
    start = session.get(
        f"{recyclique_base}/v1/auth/sso/start",
        params={"next": "/admin"},
        headers={"X-Request-Id": args.request_id},
        allow_redirects=False,
        timeout=20,
    )
    recyclique_auth_url = normalize_runtime_url(start.headers.get("Location", ""))
    print("recyclique_start_status", start.status_code)
    print("recyclique_auth_url", sanitize_url(recyclique_auth_url))
    print("recyclique_state_cookie_present", "recyclique_session_oidc_state" in session.cookies)
    relax_localhost_secure_cookies(session.cookies)
    if start.status_code != 302 or not recyclique_auth_url:
        return 1

    login_page = session.get(recyclique_auth_url, allow_redirects=True, timeout=20)
    relax_localhost_secure_cookies(session.cookies)
    print("idp_login_page_status", login_page.status_code)
    form_action = _extract_keycloak_form_action(login_page.text)
    print("idp_login_form_present", bool(form_action))
    if not form_action:
        return 2

    payload = {
        **_extract_hidden_inputs(login_page.text),
        "username": args.username,
        "password": password,
    }
    auth_post = session.post(normalize_runtime_url(form_action), data=payload, allow_redirects=False, timeout=20)
    relax_localhost_secure_cookies(session.cookies)
    recyclique_callback_url = normalize_runtime_url(auth_post.headers.get("Location", ""))
    print("idp_login_submit_status", auth_post.status_code)
    print("recyclique_callback_url", sanitize_url(recyclique_callback_url))
    if auth_post.status_code not in (302, 303) or not recyclique_callback_url:
        return 3

    callback = session.get(
        recyclique_callback_url,
        headers={"X-Request-Id": args.request_id},
        allow_redirects=False,
        timeout=20,
    )
    print("recyclique_callback_status", callback.status_code)
    print("recyclique_callback_location", callback.headers.get("Location", ""))
    print("recyclique_bff_cookie_present", "recyclique_session" in session.cookies)
    if callback.status_code not in (302, 303):
        return 4

    recyclique_session = session.get(
        f"{recyclique_base}/v1/auth/session",
        headers={"X-Request-Id": args.request_id},
        timeout=20,
    )
    print("recyclique_session_status", recyclique_session.status_code)
    print("recyclique_session_body", json.dumps(recyclique_session.json(), ensure_ascii=True))
    if recyclique_session.status_code != 200:
        return 5
    session_body = recyclique_session.json()
    if not session_body.get("authenticated"):
        return 6
    user_email = (session_body.get("user") or {}).get("email")
    print("recyclique_user_email", user_email or "")
    if user_email != args.expected_email:
        return 7

    # 2) Paheko login with same browser session and same IdP user.
    p_step1 = session.get(f"{paheko_base}/admin/login.php?oidc", allow_redirects=False, timeout=20)
    relax_localhost_secure_cookies(session.cookies)
    paheko_auth_url = normalize_runtime_url(p_step1.headers.get("Location", ""))
    print("paheko_step1_status", p_step1.status_code)
    print("paheko_auth_url", sanitize_url(paheko_auth_url))
    if p_step1.status_code != 302 or not paheko_auth_url:
        return 8

    p_step2 = session.get(paheko_auth_url, allow_redirects=False, timeout=20)
    relax_localhost_secure_cookies(session.cookies)
    paheko_reauth_form_present = bool(_extract_keycloak_form_action(p_step2.text))
    paheko_intermediate_location = normalize_runtime_url(p_step2.headers.get("Location", ""))
    print("paheko_step2_status", p_step2.status_code)
    print("paheko_step2_location", sanitize_url(paheko_intermediate_location))
    print("paheko_reauth_form_present", paheko_reauth_form_present)

    # Continuity expectation: no new IdP credential prompt.
    if paheko_reauth_form_present:
        return 9
    if p_step2.status_code not in (302, 303) or not paheko_intermediate_location:
        return 10

    p_step3 = session.get(paheko_intermediate_location, allow_redirects=False, timeout=20)
    relax_localhost_secure_cookies(session.cookies)
    p_step3_location = p_step3.headers.get("Location", "")
    p_step3_set_cookie = p_step3.headers.get("Set-Cookie", "")
    print("paheko_step3_status", p_step3.status_code)
    print("paheko_step3_location", p_step3_location)
    print("paheko_step3_set_cookie", sanitize_cookie_header(p_step3_set_cookie))
    print("paheko_cookie_present", "pko" in session.cookies)
    if p_step3.status_code not in (302, 303):
        return 11
    if not p_step3_set_cookie.startswith("pko="):
        return 12

    # Final continuity gate for this campaign:
    # - no IdP re-auth on second surface
    # - callback emits local Paheko session cookie (`pko`)
    # - callback redirects toward `/admin/`
    # - final protected page is reachable without landing back on login form
    if "pko" not in session.cookies:
        return 13
    if "/admin/" not in p_step3_location:
        return 14
    pko_value = session.cookies.get("pko", "")
    probe_headers = {"Cookie": f"pko={pko_value}"} if pko_value else {}
    p_step4 = session.get(f"{paheko_base}/admin/", headers=probe_headers, allow_redirects=True, timeout=20)
    p_step4_lowered = p_step4.text.lower()
    p_step4_url_is_login = "login.php" in p_step4.url.lower()
    p_step4_login_form_present = bool(
        re.search(r"<form[^>]*action=['\"][^'\"]*login\.php", p_step4.text, flags=re.IGNORECASE)
    )
    p_step4_has_pko_cookie = bool(pko_value) and ("pko=" in p_step4.request.headers.get("Cookie", ""))
    p_step4_protected_page_ok = (
        p_step4.status_code == 200
        and not p_step4_url_is_login
        and not p_step4_login_form_present
        and p_step4_has_pko_cookie
    )
    print("paheko_step4_status", p_step4.status_code)
    print("paheko_step4_url", p_step4.url)
    print("paheko_step4_manual_cookie_applied", bool(pko_value))
    print("paheko_step4_url_is_login", p_step4_url_is_login)
    print("paheko_step4_login_form_present", p_step4_login_form_present)
    print("paheko_step4_has_pko_cookie", p_step4_has_pko_cookie)
    print("paheko_step4_contains_logout", "deconnexion" in p_step4_lowered or "logout" in p_step4_lowered)
    print("paheko_step4_protected_page_ok", p_step4_protected_page_ok)
    if not p_step4_protected_page_ok:
        return 15

    print("continuity_result", "pass")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
