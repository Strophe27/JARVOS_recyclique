"""
Smoke doc — story 10.7 : section §10.7 dans doc/ci-minimal.md et cohérence smokes gates.
"""

from __future__ import annotations

import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DOC_CI = PROJECT_ROOT / "doc/ci-minimal.md"
DOC_SMOKE = PROJECT_ROOT / "tests/infra/test_story_10_7_release_gates_doc_smoke.py"
CI_SMOKE = Path(__file__)
MANIFEST = PROJECT_ROOT / "doc/release-gates-official.yaml"
GUIDE = PROJECT_ROOT / "doc/release-gates-beta-et-vendable.md"
PELOTON = PROJECT_ROOT / "doc/critical-core-peloton.yaml"


def _read(path: Path) -> str:
    assert path.is_file(), f"Fichier attendu : {path}"
    return path.read_text(encoding="utf-8")


def test_story_10_7_release_gates_artifacts_present() -> None:
    assert MANIFEST.is_file()
    assert GUIDE.is_file()
    assert DOC_SMOKE.is_file()
    assert CI_SMOKE.is_file()


def test_ci_minimal_doc_section_10_7_lists_both_smokes() -> None:
    doc = _read(DOC_CI)
    assert re.search(r"Story 10\.7|10\.7 —", doc)
    assert "test_story_10_7_release_gates_doc_smoke.py" in doc
    assert "test_story_10_7_release_gates_ci_minimal_smoke.py" in doc
    assert "release-gates-official.yaml" in doc
    assert "release-gates-beta-et-vendable.md" in doc


def test_story_10_7_smokes_not_in_critical_core_peloton() -> None:
    body = _read(PELOTON)
    assert "test_story_10_7_release_gates_doc_smoke" not in body
    assert "test_story_10_7_release_gates_ci_minimal_smoke" not in body
