import argparse
import re

import requests


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    args = parser.parse_args()
    r = requests.get(args.url, timeout=20)
    print("status", r.status_code)
    print("url", r.url)
    forms = re.findall(r"<form[^>]*>", r.text, flags=re.IGNORECASE)
    print("forms_count", len(forms))
    for idx, form in enumerate(forms, start=1):
        form_clean = " ".join(form.split())
        print(f"form_{idx}", form_clean[:300])
    err = re.findall(r"<[^>]*class=['\"][^'\"]*alert[^'\"]*['\"][^>]*>(.*?)</[^>]+>", r.text, flags=re.IGNORECASE | re.DOTALL)
    for idx, e in enumerate(err, start=1):
        print(f"alert_{idx}", re.sub(r"<[^>]+>", " ", e).strip())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
