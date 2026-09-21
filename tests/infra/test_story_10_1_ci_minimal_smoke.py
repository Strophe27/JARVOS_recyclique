"""
Smoke doc — story 10.1 : workflow CI minimale sur `master`, jobs API + Peintre + contrats.

Sans exécution GitHub Actions : assertions sur le YAML et la doc contributeur.
"""

from __future__ import annotations

import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
WORKFLOW_CI = PROJECT_ROOT / ".github/workflows/ci-minimal.yml"
DOC_CI = PROJECT_ROOT / "doc/ci-minimal.md"
README = PROJECT_ROOT / "README.md"
WORKFLOW_DEPLOY = PROJECT_ROOT / ".github/workflows/deploy.yaml"


def _read(path: Path) -> str:
    assert path.is_file(), f"Fichier attendu : {path}"
    return path.read_text(encoding="utf-8")


def test_ci_minimal_workflow_exists_and_targets_master() -> None:
    body = _read(WORKFLOW_CI)
    assert "branches: [master]" in body or "branches:\n      - master" in body
    assert "pull_request:" in body
    assert re.search(
        r"pull_request:\s*\n\s*branches:\s*\[master\]",
        body,
    ), "pull_request doit cibler branches: [master] (AC4)"
    assert "image: postgres:17" in body
    assert "POSTGRES_DB: recyclic_test" in body
    assert "image: redis:7" in body
    assert "REDIS_URL: redis://localhost:6379" in body


def test_ci_minimal_three_jobs_without_path_filters() -> None:
    body = _read(WORKFLOW_CI)
    assert "api-minimal:" in body
    assert "peintre-nano-minimal:" in body
    assert "contracts-openapi:" in body
    assert "requirements-dev.txt" in body
    assert "compileall src/recyclic_api" in body
    assert 'pytest tests/ -m "not performance"' in body or '-m "not performance"' in body
    assert "ruff check src/recyclic_api" in body
    assert "npm run lint" in body
    assert "npm run test" in body
    assert "npm run generate" in body
    assert "git diff --exit-code" in body
    assert "generated/recyclique-api.ts" in body
    # Story 10.4 : continue-on-error autorisé uniquement sur Vitest intégral Peintre (dette 10.1)
    peintre_block = body.split("peintre-nano-minimal:", 1)[1].split("contracts-openapi:", 1)[0]
    assert "continue-on-error: true" in peintre_block
    assert "continue-on-error: true" not in body.split("peintre-nano-minimal:", 1)[0]
    # AC2 : pas de paths: sur ce workflow (alembic-check est séparé)
    assert re.search(r"^\s+paths:\s*$", body, re.MULTILINE) is None


def test_ci_minimal_doc_and_readme_entry() -> None:
    assert DOC_CI.is_file()
    doc = DOC_CI.read_text(encoding="utf-8")
    assert "ci-minimal.yml" in doc
    assert "story 10.1" in doc.lower() or "10.1" in doc

    readme = _read(README)
    assert "doc/ci-minimal.md" in readme


def test_deploy_yaml_unchanged_prod_scope_documented() -> None:
    """AC5 : deploy legacy inchangé ; note 10.1 pointe vers ci-minimal pour master."""
    deploy = _read(WORKFLOW_DEPLOY)
    assert "build-and-deploy:" in deploy
    assert "ci-minimal" in deploy.lower() or "CI minimale" in deploy
