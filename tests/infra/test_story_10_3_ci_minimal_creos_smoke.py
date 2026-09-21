"""
Smoke doc — story 10.3 : gate CREOS + smoke rendu couverts par peintre-nano-minimal (npm run test).

Sans exécution GitHub Actions : assertions sur le YAML, vitest.config et doc contributeur.
"""

from __future__ import annotations

import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
WORKFLOW_CI = PROJECT_ROOT / ".github/workflows/ci-minimal.yml"
DOC_CI = PROJECT_ROOT / "doc/ci-minimal.md"
VITEST_CONFIG = PROJECT_ROOT / "peintre-nano/vitest.config.ts"
GOVERNANCE_TEST = (
    PROJECT_ROOT / "peintre-nano/tests/contract/creos-manifests-governance-10-3.test.ts"
)
SMOKE_TEST = PROJECT_ROOT / "peintre-nano/tests/smoke/creos-critical-render-paths-10-3.test.tsx"
MANIFESTS_README = PROJECT_ROOT / "contracts/creos/manifests/README.md"


def _read(path: Path) -> str:
    assert path.is_file(), f"Fichier attendu : {path}"
    return path.read_text(encoding="utf-8")


def test_story_10_3_artifacts_present() -> None:
    assert GOVERNANCE_TEST.is_file()
    assert SMOKE_TEST.is_file()
    assert MANIFESTS_README.is_file()


def test_vitest_includes_smoke_glob() -> None:
    body = _read(VITEST_CONFIG)
    assert "tests/smoke/**/*.{test.ts,test.tsx}" in body


def test_ci_minimal_peintre_job_10_3_gates_and_critical_core() -> None:
    body = _read(WORKFLOW_CI)
    assert "peintre-nano-minimal:" in body
    assert "creos-manifests-governance-10-3.test.ts" in body
    assert "creos-critical-render-paths-10-3.test.tsx" in body
    assert "npm run test:critical-core" in body
    assert "npm run test" in body
    assert re.search(r"^\s+paths:\s*$", body, re.MULTILINE) is None


def test_ci_minimal_doc_section_10_3() -> None:
    doc = _read(DOC_CI)
    assert "Story 10.3" in doc
    assert "creos-manifests-governance-10-3.test.ts" in doc
    assert "creos-critical-render-paths-10-3.test.tsx" in doc
