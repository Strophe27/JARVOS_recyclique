"""
Smoke doc — story 10.8 : section §10.8 dans doc/ci-minimal.md et cohérence smokes readiness globale.
"""

from __future__ import annotations

import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DOC_CI = PROJECT_ROOT / "doc/ci-minimal.md"
DOC_SMOKE = PROJECT_ROOT / "tests/infra/test_story_10_8_global_readiness_doc_smoke.py"
CI_SMOKE = Path(__file__)
READINESS_YAML = PROJECT_ROOT / "doc/v2-global-readiness-official.yaml"
READINESS_MD = PROJECT_ROOT / "doc/v2-global-readiness-go-no-go.md"
PELOTON = PROJECT_ROOT / "doc/critical-core-peloton.yaml"


def _read(path: Path) -> str:
    assert path.is_file(), f"Fichier attendu : {path}"
    return path.read_text(encoding="utf-8")


def test_story_10_8_readiness_artifacts_present() -> None:
    assert READINESS_YAML.is_file()
    assert READINESS_MD.is_file()
    assert DOC_SMOKE.is_file()
    assert CI_SMOKE.is_file()


def test_ci_minimal_doc_section_10_8_lists_both_smokes() -> None:
    doc = _read(DOC_CI)
    assert re.search(r"Story 10\.8|10\.8 —", doc)
    assert "test_story_10_8_global_readiness_doc_smoke.py" in doc
    assert "test_story_10_8_global_readiness_ci_minimal_smoke.py" in doc
    assert "v2-global-readiness-official.yaml" in doc
    assert "v2-global-readiness-go-no-go.md" in doc


def test_story_10_8_smokes_not_in_critical_core_peloton() -> None:
    body = _read(PELOTON)
    assert "test_story_10_8_global_readiness_doc_smoke" not in body
    assert "test_story_10_8_global_readiness_ci_minimal_smoke" not in body
