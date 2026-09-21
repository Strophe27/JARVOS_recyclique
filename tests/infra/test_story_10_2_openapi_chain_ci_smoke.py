"""
Smoke doc — story 10.2 : chaîne FastAPI → snapshot → YAML → codegen dans ci-minimal.
"""

from __future__ import annotations

import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
WORKFLOW_CI = PROJECT_ROOT / ".github/workflows/ci-minimal.yml"
DOC_CI = PROJECT_ROOT / "doc/ci-minimal.md"


def _read(path: Path) -> str:
    assert path.is_file(), f"Fichier attendu : {path}"
    return path.read_text(encoding="utf-8")


def test_ci_contracts_job_runs_openapi_chain_and_full_git_diff() -> None:
    body = _read(WORKFLOW_CI)
    assert "generate_openapi.py --emit-contracts" in body
    assert "npm run generate" in body
    assert "git diff --exit-code" in body
    assert "openapi-snapshot.json" in body or "generated/" in body
    assert "recyclique-api.yaml" in body
    assert "generated/recyclique-api.ts" in body
    assert "continue-on-error: true" not in body
    assert re.search(r"^\s+paths:\s*$", body, re.MULTILINE) is None


def test_ci_minimal_doc_documents_story_10_2_chain() -> None:
    doc = _read(DOC_CI)
    assert "10.2" in doc
    assert "--emit-contracts" in doc
    assert "openapi-snapshot.json" in doc
    assert "recyclique-api.yaml" in doc
    assert "generated/recyclique-api.ts" in doc
