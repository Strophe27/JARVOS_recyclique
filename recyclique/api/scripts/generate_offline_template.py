"""
Shim d'import : le script source est ``recyclique-1.4.4/scripts/generate-offline-template.py``
(fichier avec tirets, non importable comme module Python).
"""

from __future__ import annotations

import importlib.util
from pathlib import Path

_SRC = (
    Path(__file__).resolve().parents[2] / "scripts" / "generate-offline-template.py"
)
_spec = importlib.util.spec_from_file_location("generate_offline_template_impl", _SRC)
if _spec is None or _spec.loader is None:  # pragma: no cover
    raise ImportError(f"Impossible de charger le script offline: {_SRC}")
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
generate_template_csv = _mod.generate_template_csv
