"""Clés techniques stables (kebab-case) pour groupes — distinctes des libellés affichés."""

from __future__ import annotations

import re


def slugify_label_to_key(label: str) -> str:
    """Transforme un libellé humain en identifiant machine stable (kebab-case)."""
    s = re.sub(r"[^a-z0-9]+", "-", (label or "").lower().strip())
    s = re.sub(r"-+", "-", s).strip("-")
    return s or "group"
