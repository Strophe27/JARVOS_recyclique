#!/usr/bin/env bash
# Story 10.4 — exécute uniquement les sélecteurs pytest listés dans doc/critical-core-peloton.yaml
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${API_DIR}/../.." && pwd)"
MANIFEST="${REPO_ROOT}/doc/critical-core-peloton.yaml"

if [[ ! -f "${MANIFEST}" ]]; then
  echo "Manifeste introuvable : ${MANIFEST}" >&2
  exit 1
fi

cd "${API_DIR}"

mapfile -t SELECTORS < <(
  python3 - "${MANIFEST}" <<'PY'
import sys
from pathlib import Path

import yaml

manifest = Path(sys.argv[1])
data = yaml.safe_load(manifest.read_text(encoding="utf-8"))
targets = data.get("targets") or {}
for key in ("module_chain", "caisse_nominal", "reception_nominal", "sync_sensitive"):
    entry = targets.get(key) or {}
    for sel in entry.get("api") or []:
        print(sel)
PY
)

if [[ "${#SELECTORS[@]}" -eq 0 ]]; then
  echo "Aucun sélecteur API dans le manifeste." >&2
  exit 1
fi

python3 -m pytest "${SELECTORS[@]}" --tb=short
