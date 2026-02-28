import argparse
import re
from urllib.parse import urljoin

import requests


def main() -> int:
    parser = argparse.ArgumentParser(description="Check Paheko local admin login form health.")
    parser.add_argument("--base-url", default="http://localhost:8080")
    parser.add_argument("--username", default="admin")
    parser.add_argument("--password", default="invalid-password")
    args = parser.parse_args()

    base = args.base_url.rstrip("/")
    session = requests.Session()

    page = session.get(f"{base}/admin/login.php", timeout=20)
    print("login_page_status", page.status_code)
    if page.status_code != 200:
        return 1

    action_match = re.search(r"<form[^>]*action=['\"]([^'\"]+)['\"]", page.text)
    if not action_match:
        print("error", "login_form_missing")
        return 2

    action_url = urljoin(f"{base}/admin/login.php", action_match.group(1))
    print("login_form_action", action_url)

    payload = {
        "login": args.username,
        "password": args.password,
    }
    post = session.post(action_url, data=payload, timeout=20)
    print("login_post_status", post.status_code)
    print("login_post_contains_form", "login.php" in post.url or "connexion" in post.text.lower())
    if post.status_code >= 500:
        return 3
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
