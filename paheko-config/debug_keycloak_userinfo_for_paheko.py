import argparse
import base64
import json
import os
import re
from urllib.parse import parse_qs, urlparse

import requests


def normalize_runtime_url(url: str) -> str:
    return (
        url.replace("keycloak:8080", "localhost:8081")
        .replace("host.docker.internal:8081", "localhost:8081")
    )


def relax_localhost_secure_cookies(cookie_jar) -> None:
    for cookie in cookie_jar:
        domain = (cookie.domain or "").lower()
        if cookie.secure and ("localhost" in domain or domain in {"", "127.0.0.1"}):
            cookie.secure = False


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--username", default="oidc-test")
    parser.add_argument("--password", default=os.getenv("PAHEKO_TEST_PASSWORD", ""))
    parser.add_argument("--client-id", default="paheko-web-dev")
    parser.add_argument("--client-secret", default=os.getenv("PAHEKO_OIDC_CLIENT_SECRET", ""))
    parser.add_argument("--redirect-uri", default="http://localhost:8080/admin/login.php?oidc")
    parser.add_argument("--issuer", default="http://localhost:8081/realms/recyclique-dev")
    args = parser.parse_args()
    if not args.password:
        raise SystemExit("Missing --password (or PAHEKO_TEST_PASSWORD env).")
    if not args.client_secret:
        raise SystemExit("Missing --client-secret (or PAHEKO_OIDC_CLIENT_SECRET env).")

    s = requests.Session()
    r1 = s.get("http://localhost:8080/admin/login.php?oidc", allow_redirects=False, timeout=20)
    relax_localhost_secure_cookies(s.cookies)
    auth_url = normalize_runtime_url(r1.headers.get("Location", ""))
    r2 = s.get(auth_url, allow_redirects=True, timeout=20)
    relax_localhost_secure_cookies(s.cookies)
    form = re.search(r"<form[^>]*action=['\"]([^'\"]+)['\"]", r2.text)
    if not form:
        print("no_login_form")
        return 2
    form_action = normalize_runtime_url(form.group(1))
    fields = dict(re.findall(r"<input[^>]*name=['\"]([^'\"]+)['\"][^>]*value=['\"]([^'\"]*)['\"][^>]*>", r2.text))
    payload = {**fields, "username": args.username, "password": args.password}
    r3 = s.post(form_action, data=payload, allow_redirects=False, timeout=20)
    relax_localhost_secure_cookies(s.cookies)
    callback = normalize_runtime_url(r3.headers.get("Location", ""))
    print("step1_status", r1.status_code)
    print("step2_status", r2.status_code)
    print("step3_status", r3.status_code)
    print("step3_url", r3.url)
    print("callback", callback)
    if not callback:
        print("step3_body_snippet", r3.text[:1500].replace("\n", " "))
    code = parse_qs(urlparse(callback).query).get("code", [""])[0]
    if not code:
        print("no_code")
        return 3

    token = requests.post(
        f"{args.issuer}/protocol/openid-connect/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": args.redirect_uri,
            "client_id": args.client_id,
            "client_secret": args.client_secret,
        },
        timeout=20,
    )
    print("token_status", token.status_code)
    print("token_keys", sorted((token.json() if token.headers.get("content-type", "").startswith("application/json") else {}).keys()))
    if token.status_code != 200:
        print("token_body", token.text)
        return 4
    access_token = token.json().get("access_token", "")
    id_token = token.json().get("id_token", "")
    if id_token:
        try:
            payload = id_token.split(".")[1]
            padded = payload + "=" * (-len(payload) % 4)
            id_claims = json.loads(base64.urlsafe_b64decode(padded.encode()).decode())
            print("id_token_email", id_claims.get("email"))
            print("id_token_claims", json.dumps(id_claims, ensure_ascii=True))
        except Exception as exc:
            print("id_token_decode_error", exc.__class__.__name__)
    if not access_token:
        print("no_access_token")
        return 5
    userinfo = requests.get(
        f"{args.issuer}/protocol/openid-connect/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=20,
    )
    print("userinfo_status", userinfo.status_code)
    if userinfo.status_code != 200:
        print("userinfo_body", userinfo.text)
        return 6
    print("userinfo_json", json.dumps(userinfo.json(), ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
