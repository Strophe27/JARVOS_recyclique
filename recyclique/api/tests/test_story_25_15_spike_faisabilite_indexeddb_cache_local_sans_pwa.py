"""Story 25.15 — gate léger sur le rapport spike IndexedDB / cache local (sans PWA, sans IndexedDB navigateur en CI).

Vérifie la présence du fichier versionné et d'ancres minimales attendues par la story (citations readiness,
critères d'arrêt, décision go/no-go/later, bandes de coût, non-levée du NOT READY programme).
"""

from __future__ import annotations

from pathlib import Path

import pytest

_REPO_ROOT = Path(__file__).resolve().parents[3]
_SPIKE_REPORT = (
    _REPO_ROOT
    / "_bmad-output"
    / "implementation-artifacts"
    / "2026-04-20-spike-25-15-indexeddb-cache-local-faisabilite.md"
)

# Ancres / phrases clés (sous-chaînes) — alignées AC story 25.15 et DoD.
_REQUIRED_SUBSTRINGS = (
    "implementation-readiness-report-2026-04-19.md",
    "2026-04-20-note-readiness-cible-post-epic25-decisions.md",
    "NOT READY",
    "Critères d'arrêt",
    "go / no-go / later",
    "Bandes de coût",
    "ContextEnvelope",
    "25-11",
    "CONTEXT_STALE",
    "correct course",
    "IndexedDB",
    "ne lève pas",
)


def _normalize_anchors(text: str) -> str:
    """Apostrophes typographiques → ASCII ; comparaison ensuite en casefold."""
    return (
        text.replace("\u2019", "'")
        .replace("\u2018", "'")
        .casefold()
    )


def test_story_25_15_spike_report_exists() -> None:
    assert _SPIKE_REPORT.is_file(), f"missing spike report: {_SPIKE_REPORT}"


def test_story_25_15_spike_report_contains_required_anchors() -> None:
    text = _normalize_anchors(_SPIKE_REPORT.read_text(encoding="utf-8"))
    missing = [s for s in _REQUIRED_SUBSTRINGS if _normalize_anchors(s) not in text]
    assert not missing, f"spike report missing anchors: {missing}"


@pytest.mark.parametrize("needle", _REQUIRED_SUBSTRINGS)
def test_story_25_15_spike_report_each_anchor_param(needle: str) -> None:
    text = _normalize_anchors(_SPIKE_REPORT.read_text(encoding="utf-8"))
    assert _normalize_anchors(needle) in text, (
        f"expected substring {needle!r} (normalized) in {_SPIKE_REPORT}"
    )
