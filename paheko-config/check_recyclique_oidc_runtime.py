import argparse
import html
import json
import os
import re
from html.parser import HTMLParser
from urllib.parse import parse_qs, urlparse, urlunparse

import httpx


def _sanitize_location(url: str) -> str:
    if not url:
        return ""
    parsed = urlparse(url)
    query = parse_qs(parsed.query, keep_blank_values=True)
    redacted = []
    for key, values in query.items():
        for value in values:
            if key in {"state", "code", "session_state", "nonce"}:
                redacted.append(f"{key}=***")
            else:
                redacted.append(f"{key}={value}")
    query_part = "&".join(sorted(redacted))
    suffix = f"?{query_part}" if query_part else ""
    return f"{parsed.scheme}://{parsed.netloc}{parsed.path}{suffix}"


def _normalize_runtime_url(url: str) -> str:
    parsed = urlparse(url)
    netloc = parsed.netloc
    if netloc == "keycloak:8080":
        netloc = "localhost:8081"
    elif netloc.startswith("keycloak:"):
        netloc = netloc.replace("keycloak:", "localhost:", 1)
    elif netloc.startswith("host.docker.internal:"):
        netloc = netloc.replace("host.docker.internal:", "localhost:", 1)
    return urlunparse((parsed.scheme, netloc, parsed.path, parsed.params, parsed.query, parsed.fragment))


def _relax_localhost_secure_cookies(cookie_jar) -> None:
    for cookie in cookie_jar:
        domain = (cookie.domain or "").lower()
        if cookie.secure and ("localhost" in domain or domain in {"", "127.0.0.1"}):
            cookie.secure = False


class _KeycloakLoginParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.primary_form_action = ""
        self.fallback_form_action = ""
        self.form_inputs: dict[str, str] = {}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict = {k: v or "" for k, v in attrs}
        if tag == "form":
            action = attrs_dict.get("action", "")
            if not self.fallback_form_action and action:
                self.fallback_form_action = action
            if attrs_dict.get("id") == "kc-form-login" and action:
                self.primary_form_action = action
        if tag == "input":
            name = attrs_dict.get("name", "")
            if name:
                self.form_inputs[name] = attrs_dict.get("value", "")


def _extract_keycloak_form_data(html_text: str) -> tuple[str, dict[str, str]]:
    parser = _KeycloakLoginParser()
    parser.feed(html_text)
    action = parser.primary_form_action or parser.fallback_form_action
    return action, parser.form_inputs


def main() -> int:
    parser = argparse.ArgumentParser(description="Run runtime OIDC nominal path on RecyClique BFF.")
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--username", default="oidc.recyclique")
    parser.add_argument(
        "--password",
        default=None,
        help="OIDC password. If omitted, uses OIDC_TEST_PASSWORD env var.",
    )
    parser.add_argument("--next", dest="next_path", default="/admin")
    parser.add_argument("--request-id", required=True)
    parser.add_argument("--dummy-callback", action="store_true")
    args = parser.parse_args()
    password = args.password or os.getenv("OIDC_TEST_PASSWORD")
    if not password:
        parser.error("Missing --password (or OIDC_TEST_PASSWORD env var).")

    session = httpx.Client(follow_redirects=False, timeout=20.0)
    base = args.base_url.rstrip("/")
    request_id = args.request_id

    start = session.get(
        f"{base}/v1/auth/sso/start",
        params={"next": args.next_path},
        headers={"X-Request-Id": request_id},
        follow_redirects=False,
    )
    start_location = _normalize_runtime_url(start.headers.get("Location", ""))
    print("start_status", start.status_code)
    print("start_location", _sanitize_location(start_location))
    print("start_state_cookie", "recyclique_session_oidc_state" in session.cookies)
    _relax_localhost_secure_cookies(session.cookies.jar)
    if start.status_code != 302 or not start_location:
        return 1

    if args.dummy_callback:
        state = parse_qs(urlparse(start_location).query).get("state", [""])[0]
        callback_url = f"{base}/v1/auth/sso/callback?code=dummy&state={state}"
        print("idp_dummy_callback", True)
    else:
        login_page = session.get(start_location, follow_redirects=True)
        _relax_localhost_secure_cookies(session.cookies.jar)
        print("idp_login_status", login_page.status_code)
        print("idp_login_url", _sanitize_location(str(login_page.url)))
        form_action, hidden_inputs = _extract_keycloak_form_data(login_page.text)
        if not form_action:
            print("error", "keycloak_login_form_missing")
            return 2
        form_action = _normalize_runtime_url(html.unescape(form_action))
        print("idp_form_action", _sanitize_location(form_action))
        print("idp_form_input_count", len(hidden_inputs))
        payload = {**hidden_inputs, "username": args.username, "password": password}

        auth_post = session.post(form_action, data=payload)
        _relax_localhost_secure_cookies(session.cookies.jar)
        callback_url = _normalize_runtime_url(auth_post.headers.get("Location", ""))
        print("idp_post_status", auth_post.status_code)
        print("callback_url", _sanitize_location(callback_url))
        if auth_post.status_code not in (302, 303) or not callback_url:
            error_match = re.search(r'<span id="input-error"[^>]*>(.*?)</span>', auth_post.text, flags=re.DOTALL)
            if error_match:
                print("idp_error", re.sub(r"<[^>]+>", "", error_match.group(1)).strip())
            feedback_match = re.search(r'<span[^>]*class="[^"]*kc-feedback-text[^"]*"[^>]*>(.*?)</span>', auth_post.text, flags=re.DOTALL)
            if feedback_match:
                print("idp_feedback", re.sub(r"<[^>]+>", "", feedback_match.group(1)).strip())
            print("idp_post_body_snippet", auth_post.text[:3000].replace("\n", " "))
            return 3

    callback = session.get(
        callback_url,
        headers={"X-Request-Id": request_id},
    )
    print("callback_status", callback.status_code)
    print("callback_location", callback.headers.get("Location", ""))
    if callback.status_code >= 400:
        print("callback_body", callback.text)
    print("callback_has_bff_cookie", "recyclique_session" in session.cookies)
    if callback.status_code not in (302, 303):
        return 4

    session_resp = session.get(
        f"{base}/v1/auth/session",
        headers={"X-Request-Id": request_id},
    )
    print("session_status", session_resp.status_code)
    print("session_body", json.dumps(session_resp.json(), ensure_ascii=True))
    body = session_resp.json()
    if session_resp.status_code != 200:
        return 5
    if not body.get("authenticated"):
        return 6
    if not body.get("user", {}).get("email"):
        return 7
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
