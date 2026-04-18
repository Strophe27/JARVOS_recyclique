#!/usr/bin/env bash
# Version semver du livrable : lue depuis frontend/package.json (racine du dépôt recyclique-1.4.4).
# Fonctionne quel que soit le répertoire courant d'invocation.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
exec node -p "require('./frontend/package.json').version"
