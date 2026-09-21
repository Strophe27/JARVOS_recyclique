"""
Smoke doc — story 10.5 : observabilité dans ci-minimal.yml et doc §10.5.
"""

from __future__ import annotations

import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
WORKFLOW_CI = PROJECT_ROOT / ".github/workflows/ci-minimal.yml"
DOC_CI = PROJECT_ROOT / "doc/ci-minimal.md"
MANIFEST = PROJECT_ROOT / "doc/observability-critical-flows.yaml"
RUNBOOK = PROJECT_ROOT / "doc/observability-support-runbook.md"
GUARD = PROJECT_ROOT / "tests/infra/test_story_10_5_observability_manifest_guard.py"
HTTP_CORR = PROJECT_ROOT / "recyclique/api/tests/test_story_10_5_http_correlation_peloton.py"
SYNC_SMOKE = PROJECT_ROOT / "recyclique/api/tests/test_story_10_5_sync_support_trail_smoke.py"


def _read(path: Path) -> str:
    assert path.is_file(), f"Fichier attendu : {path}"
    return path.read_text(encoding="utf-8")


def test_story_10_5_artifacts_present() -> None:
    assert MANIFEST.is_file()
    assert RUNBOOK.is_file()
    assert GUARD.is_file()
    assert HTTP_CORR.is_file()
    assert SYNC_SMOKE.is_file()


def test_ci_minimal_api_observability_smokes_after_peloton() -> None:
    body = _read(WORKFLOW_CI)
    peloton_idx = body.find("run_critical_core_peloton.sh")
    obs_idx = body.find("test_story_10_5_http_correlation_peloton.py")
    guard_idx = body.find("test_story_10_5_observability_manifest_guard.py")
    assert peloton_idx != -1
    assert obs_idx != -1
    assert guard_idx != -1
    assert peloton_idx < obs_idx < guard_idx
    assert "test_story_10_5_sync_support_trail_smoke.py" in body


def test_ci_minimal_doc_section_10_5_lists_smokes() -> None:
    doc = _read(DOC_CI)
    assert re.search(r"Story 10\.5|§10\.5|10\.5 —", doc)
    assert "test_story_10_5_observability_manifest_guard.py" in doc
    assert "test_story_10_5_http_correlation_peloton.py" in doc
    assert "test_story_10_5_sync_support_trail_smoke.py" in doc
    assert "observability-critical-flows.yaml" in doc
    assert "observability-support-runbook.md" in doc
    assert "critical-core-peloton" in doc.lower() or "10.4" in doc
