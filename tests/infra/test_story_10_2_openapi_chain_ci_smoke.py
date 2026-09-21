"""
Smoke doc — story 10.2 : chaîne FastAPI → snapshot → YAML → codegen dans ci-minimal.
"""

from __future__ import annotations

import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
WORKFLOW_CI = PROJECT_ROOT / ".github/workflows/ci-minimal.yml"
DOC_CI = PROJECT_ROOT / "doc/ci-minimal.md"

# AC2 — même triplet que le job `contracts-openapi` (gate git diff unique).
GIT_DIFF_CHAIN_ARTIFACTS = (
    "generated/openapi-snapshot.json",
    "recyclique-api.yaml",
    "generated/recyclique-api.ts",
)


def _read(path: Path) -> str:
    assert path.is_file(), f"Fichier attendu : {path}"
    return path.read_text(encoding="utf-8")


def test_ci_contracts_job_runs_openapi_chain_and_full_git_diff() -> None:
    body = _read(WORKFLOW_CI)
    assert "generate_openapi.py --emit-contracts" in body
    assert "npm run generate" in body
    diff_match = re.search(r"git diff --exit-code\s+(.+)", body)
    assert diff_match, "contracts-openapi doit terminer par git diff --exit-code sur la chaîne"
    diff_targets = diff_match.group(1).strip()
    for artifact in GIT_DIFF_CHAIN_ARTIFACTS:
        assert artifact in diff_targets, (
            f"Artefact gate manquant dans git diff CI : {artifact} (vu : {diff_targets})"
        )
    assert "continue-on-error: true" not in body
    assert re.search(r"^\s+paths:\s*$", body, re.MULTILINE) is None


def test_ci_minimal_doc_documents_story_10_2_chain() -> None:
    doc = _read(DOC_CI)
    assert "10.2" in doc
    assert "--emit-contracts" in doc
    doc_diff = re.search(r"git diff --exit-code\s+(.+)", doc)
    assert doc_diff, "doc/ci-minimal.md doit documenter la commande git diff de la chaîne"
    doc_targets = doc_diff.group(1).strip()
    for artifact in GIT_DIFF_CHAIN_ARTIFACTS:
        assert artifact in doc_targets, f"Artefact gate manquant dans doc git diff : {artifact}"
