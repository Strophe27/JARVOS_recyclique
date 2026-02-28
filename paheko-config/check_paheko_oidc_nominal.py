import argparse
import os
import re
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import requests


def relax_localhost_secure_cookies(cookie_jar) -> None:
    for cookie in cookie_jar:
        domain = (cookie.domain or "").lower()
        if cookie.secure and ("localhost" in domain or domain in {"", "127.0.0.1"}):
            cookie.secure = False


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


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Paheko OIDC flow checks.")
    parser.add_argument("--base-url", default="http://localhost:8080")
    parser.add_argument("--username", default="oidc.test")
    parser.add_argument(
        "--password",
        default=None,
        help="OIDC password. If omitted, uses OIDC_TEST_PASSWORD env var.",
    )
    parser.add_argument(
        "--expect",
        choices=("nominal", "reject"),
        default="nominal",
        help="Expected result for this run.",
    )
    args = parser.parse_args()
    password = args.password or os.getenv("OIDC_TEST_PASSWORD")
    if not password:
        parser.error("Missing --password (or OIDC_TEST_PASSWORD env var).")

    session = requests.Session()
    base = args.base_url.rstrip("/")

    step1 = session.get(f"{base}/admin/login.php?oidc", allow_redirects=False, timeout=20)
    relax_localhost_secure_cookies(session.cookies)
    auth_url = normalize_runtime_url(step1.headers.get("Location", ""))
    print("step1", step1.status_code)
    print("auth_url", sanitize_url(auth_url))
    if step1.status_code != 302 or not auth_url:
        return 1

    step2 = session.get(auth_url, allow_redirects=True, timeout=20)
    relax_localhost_secure_cookies(session.cookies)
    print("step2", step2.status_code, sanitize_url(step2.url))

    action_match = re.search(r"<form[^>]*id=['\"]kc-form-login['\"][^>]*action=['\"]([^'\"]+)['\"]", step2.text)
    if not action_match:
        action_match = re.search(r"<form[^>]*action=['\"]([^'\"]+)['\"]", step2.text)
    if not action_match:
        print("error", "no_keycloak_login_form")
        feedback_match = re.search(r'<span[^>]*class="[^"]*kc-feedback-text[^"]*"[^>]*>(.*?)</span>', step2.text, flags=re.DOTALL)
        if feedback_match:
            print("step2_feedback", re.sub(r"<[^>]+>", "", feedback_match.group(1)).strip())
        print("step2_body_snippet", step2.text[:3000].replace("\n", " "))
        return 2

    action = normalize_runtime_url(action_match.group(1))
    form_inputs = dict(
        re.findall(
            r"<input[^>]*name=['\"]([^'\"]+)['\"][^>]*value=['\"]([^'\"]*)['\"][^>]*>",
            step2.text,
        )
    )
    payload = {**form_inputs, "username": args.username, "password": password}

    step3 = session.post(action, data=payload, allow_redirects=False, timeout=20)
    relax_localhost_secure_cookies(session.cookies)
    callback_url = normalize_runtime_url(step3.headers.get("Location", ""))
    print("step3", step3.status_code)
    print("callback_url", sanitize_url(callback_url))
    if step3.status_code not in (302, 303) or not callback_url:
        return 3

    step4 = session.get(callback_url, allow_redirects=False, timeout=20)
    relax_localhost_secure_cookies(session.cookies)
    step4_location = step4.headers.get("Location", "")
    set_cookie = step4.headers.get("Set-Cookie", "")
    print("step4", step4.status_code, step4_location)
    print("step4_set_cookie", sanitize_cookie(set_cookie))
    print("step4_login_page", "connexion" in step4.text.lower())
    print("step4_contains_aucun_membre", "aucun membre" in step4.text.lower())
    print("step4_contains_erreur", "erreur" in step4.text.lower())
    print("cookies", sorted(session.cookies.keys()))

    pko_value = session.cookies.get("pko", "")
    probe_headers = {"Cookie": f"pko={pko_value}"} if pko_value else {}
    step5 = session.get(f"{base}/admin/", headers=probe_headers, allow_redirects=True, timeout=20)
    print("step5", step5.status_code, step5.url)
    print("step5_title_login", "connexion" in step5.text.lower())
    print("step5_manual_cookie_applied", bool(pko_value))
    print("step5_request_cookie", step5.request.headers.get("Cookie", ""))

    lowered = step5.text.lower()
    found_markers = []
    for marker in ["aucun membre", "adresse e-mail", "erreur", "openid", "oidc", "email"]:
        if marker in lowered:
            found_markers.append(marker)
            idx = lowered.find(marker)
            start = max(0, idx - 120)
            end = min(len(step5.text), idx + 200)
            snippet = step5.text[start:end].replace("\n", " ")
            print("marker", marker)
            print("snippet", snippet.encode("ascii", "ignore").decode("ascii"))

    step5_url_is_login = "login.php" in step5.url.lower()
    step5_login_form_present = bool(
        re.search(r"<form[^>]*action=['\"][^'\"]*login\.php", step5.text, flags=re.IGNORECASE)
    )
    step5_has_pko_cookie = bool(pko_value) and ("pko=" in step5.request.headers.get("Cookie", ""))
    step5_contains_logout = "deconnexion" in lowered or "logout" in lowered
    step5_protected_page_ok = (
        step5.status_code == 200
        and not step5_url_is_login
        and not step5_login_form_present
        and step5_has_pko_cookie
    )
    print("step5_url_is_login", step5_url_is_login)
    print("step5_login_form_present", step5_login_form_present)
    print("step5_has_pko_cookie", step5_has_pko_cookie)
    print("step5_contains_logout", step5_contains_logout)
    print("step5_protected_page_ok", step5_protected_page_ok)

    nominal_like_success = (
        step4.status_code in (302, 303)
        and "/admin/" in step4_location
        and set_cookie.startswith("pko=")
        and ("pko" in session.cookies)
        and step5_protected_page_ok
    )
    rejection_like = (
        (not nominal_like_success)
        and (
            set_cookie.startswith("__c=")
            or "login-actions/required-action" in callback_url
            or "login.php" in step5.url
            or ("aucun membre" in lowered)
            or ("erreur" in lowered)
        )
    )

    print("result_nominal_like_success", nominal_like_success)
    print("result_rejection_like", rejection_like)
    print("result_markers", ",".join(sorted(set(found_markers))))

    if args.expect == "nominal":
        return 0 if nominal_like_success else 10
    return 0 if rejection_like else 11


def sanitize_url(url: str) -> str:
    parsed = urlparse(url)
    params = []
    for key, value in parse_qsl(parsed.query, keep_blank_values=True):
        if key in {"state", "session_state", "code"}:
            params.append((key, "***"))
        else:
            params.append((key, value))
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, urlencode(params), parsed.fragment))


def sanitize_cookie(cookie_header: str) -> str:
    if not cookie_header:
        return ""
    parts = cookie_header.split(";", 1)
    if "=" not in parts[0]:
        return cookie_header
    key = parts[0].split("=", 1)[0]
    suffix = ";" + parts[1] if len(parts) > 1 else ""
    return f"{key}=***{suffix}"


if __name__ == "__main__":
    raise SystemExit(main())
