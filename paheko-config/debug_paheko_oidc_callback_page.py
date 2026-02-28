import argparse
import os
import re
from pathlib import Path

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
    parser.add_argument("--out", default="_bmad-output/implementation-artifacts/14-4-paheko-callback-page.html")
    parser.add_argument("--base-url", default="http://localhost:8080")
    args = parser.parse_args()
    if not args.password:
        raise SystemExit("Missing --password (or PAHEKO_TEST_PASSWORD env).")

    s = requests.Session()
    base = args.base_url.rstrip("/")
    r1 = s.get(f"{base}/admin/login.php?oidc", allow_redirects=False, timeout=20)
    relax_localhost_secure_cookies(s.cookies)
    auth_url = normalize_runtime_url(r1.headers.get("Location", ""))
    r2 = s.get(auth_url, allow_redirects=True, timeout=20)
    relax_localhost_secure_cookies(s.cookies)
    action = re.search(r"<form[^>]*action=['\"]([^'\"]+)['\"]", r2.text)
    if not action:
        print("no_form")
        return 2
    form_action = normalize_runtime_url(action.group(1))
    fields = dict(re.findall(r"<input[^>]*name=['\"]([^'\"]+)['\"][^>]*value=['\"]([^'\"]*)['\"][^>]*>", r2.text))
    payload = {**fields, "username": args.username, "password": args.password}
    r3 = s.post(form_action, data=payload, allow_redirects=False, timeout=20)
    relax_localhost_secure_cookies(s.cookies)
    cb = normalize_runtime_url(r3.headers.get("Location", ""))
    r4 = s.get(cb, allow_redirects=False, timeout=20)
    relax_localhost_secure_cookies(s.cookies)

    Path(args.out).write_text(r4.text, encoding="utf-8")
    print("step1", r1.status_code)
    print("step2", r2.status_code)
    print("step3", r3.status_code)
    print("step4", r4.status_code)
    print("saved", args.out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
