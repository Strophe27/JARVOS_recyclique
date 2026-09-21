#!/usr/bin/env python3
"""
Génère openapi.json local et/ou la chaîne contrats (Story 10.2).

Usage:
  python generate_openapi.py
  python generate_openapi.py --emit-contracts
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

API_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(API_DIR / "src"))

# Variables minimales pour importer l'app hors pytest (export CI / local).
os.environ.setdefault(
    "DATABASE_URL",
    os.environ.get("TEST_DATABASE_URL", "postgresql://localhost/recyclic_test"),
)
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")
os.environ.setdefault("SECRET_KEY", "openapi-export-dev-only")

from recyclic_api.main import app  # noqa: E402
from recyclic_api.openapi_chain import emit_contracts_chain, repo_root_from_api_dir  # noqa: E402


def generate_openapi_local() -> bool:
    try:
        openapi_spec = app.openapi()
        out = API_DIR / "openapi.json"
        with out.open("w", encoding="utf-8") as handle:
            json.dump(openapi_spec, handle, indent=2, ensure_ascii=False)
        info = openapi_spec.get("info", {})
        print("✅ openapi.json généré avec succès")
        print(f"📊 Titre: {info.get('title', 'N/A')}")
        print(f"📊 Version: {info.get('version', 'N/A')}")
        print(f"📊 Endpoints: {len(openapi_spec.get('paths', {}))}")
        schemas = openapi_spec.get("components", {}).get("schemas", {})
        print(f"📊 Schémas: {len(schemas)}")
        return True
    except Exception as exc:  # noqa: BLE001 — script CLI
        print(f"❌ Erreur lors de la génération: {exc}")
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Export OpenAPI Recyclique")
    parser.add_argument(
        "--emit-contracts",
        action="store_true",
        help="Écrit le snapshot sous contracts/openapi/generated/ et synchronise recyclique-api.yaml",
    )
    args = parser.parse_args()

    if args.emit_contracts:
        try:
            spec = app.openapi()
            repo_root = repo_root_from_api_dir(API_DIR)
            emit_contracts_chain(spec, repo_root, sync_yaml=True)
            print("✅ Chaîne contrats émise (snapshot + recyclique-api.yaml)")
            return 0
        except Exception as exc:  # noqa: BLE001
            print(f"❌ Erreur emit-contracts: {exc}")
            return 1

    return 0 if generate_openapi_local() else 1


if __name__ == "__main__":
    raise SystemExit(main())
