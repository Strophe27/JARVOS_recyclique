"""
Smoke doc — story 10.4 : peloton critical core + barrière 10.3 dans ci-minimal.yml et doc §10.4.
"""

from __future__ import annotations

import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
WORKFLOW_CI = PROJECT_ROOT / ".github/workflows/ci-minimal.yml"
DOC_CI = PROJECT_ROOT / "doc/ci-minimal.md"
MANIFEST = PROJECT_ROOT / "doc/critical-core-peloton.yaml"
PELOTON_DOC = PROJECT_ROOT / "doc/critical-core-peloton.md"
API_RUNNER = PROJECT_ROOT / "recyclique/api/scripts/run_critical_core_peloton.sh"
GOVERNANCE_10_3 = (
    PROJECT_ROOT / "peintre-nano/tests/contract/creos-manifests-governance-10-3.test.ts"
)
SMOKE_10_3 = PROJECT_ROOT / "peintre-nano/tests/smoke/creos-critical-render-paths-10-3.test.tsx"


def _read(path: Path) -> str:
    assert path.is_file(), f"Fichier attendu : {path}"
    return path.read_text(encoding="utf-8")


def test_story_10_4_artifacts_present() -> None:
    assert MANIFEST.is_file()
    assert PELOTON_DOC.is_file()
    assert API_RUNNER.is_file()
    assert GOVERNANCE_10_3.is_file()
    assert SMOKE_10_3.is_file()


def test_ci_minimal_api_critical_core_peloton_step() -> None:
    body = _read(WORKFLOW_CI)
    assert "run_critical_core_peloton.sh" in body
    assert re.search(r"pytest critical core peloton", body, re.IGNORECASE)


def test_ci_minimal_peintre_critical_core_and_10_3_gates() -> None:
    body = _read(WORKFLOW_CI)
    assert "npm run test:critical-core" in body
    assert "creos-manifests-governance-10-3.test.ts" in body
    assert "creos-critical-render-paths-10-3.test.tsx" in body
    assert re.search(r"^\s+paths:\s*$", body, re.MULTILINE) is None


def test_ci_minimal_doc_section_10_4_and_peintre_vitest_blocking() -> None:
    doc = _read(DOC_CI)
    assert "Story 10.4" in doc or "10.4" in doc
    assert "test:critical-core" in doc
    assert "npm run test" in doc
    peintre_block = doc.lower()
    assert "continue-on-error" not in peintre_block or "historique" in peintre_block
