"""
Smoke doc — story 10.6c : livrables runbook spike PG 15→17 + point d'entrée README.
Story 10.6d : alignement compose racine + CI sur postgres:17 (assertions texte, sans Docker).

Sans Docker : existence des fichiers, ancres Markdown vers l'ADR/recherche, séparation 10.6d/10.6e.
La non-régression `docker compose config` reste couverte par `test_docker_compose_entrypoint.py`.
"""

from __future__ import annotations

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
README = PROJECT_ROOT / "README.md"
RUNBOOK = (
    PROJECT_ROOT
    / "_bmad-output/planning-artifacts/operations/runbook-spike-postgresql-15-vers-17.md"
)
ADR = PROJECT_ROOT / "_bmad-output/planning-artifacts/architecture/adr-postgresql-17-migration.md"
RESEARCH = (
    PROJECT_ROOT
    / "_bmad-output/planning-artifacts/research"
    / "technical-migration-postgresql-15-vers-17-recyclique-research-2026-04-11.md"
)
ARCH_INDEX = PROJECT_ROOT / "_bmad-output/planning-artifacts/architecture/index.md"
ROOT_COMPOSE = PROJECT_ROOT / "docker-compose.yml"
WORKFLOW_ALEMBIC = PROJECT_ROOT / ".github/workflows/alembic-check.yml"
WORKFLOW_DEPLOY = PROJECT_ROOT / ".github/workflows/deploy.yaml"


def test_runbook_spike_postgresql_15_17_exists() -> None:
    assert RUNBOOK.is_file(), "Runbook spike 10.6c attendu sous planning-artifacts/operations."


def test_readme_links_to_runbook_relative_path() -> None:
    assert README.is_file()
    text = README.read_text(encoding="utf-8")
    assert "runbook-spike-postgresql-15-vers-17.md" in text
    assert "_bmad-output/planning-artifacts/operations/" in text


def test_runbook_links_resolve_to_existing_adr_and_research() -> None:
    body = RUNBOOK.read_text(encoding="utf-8")
    assert "../architecture/adr-postgresql-17-migration.md" in body
    assert (
        "../research/technical-migration-postgresql-15-vers-17-recyclique-research-2026-04-11.md"
        in body
    )
    assert ADR.is_file()
    assert RESEARCH.is_file()


def test_runbook_states_scope_separation_and_legacy_exclusion() -> None:
    body = RUNBOOK.read_text(encoding="utf-8")
    assert "10.6d" in body
    assert "10.6e" in body
    assert "recyclique-1.4.4" in body
    lower = body.lower()
    assert "hors" in lower
    assert "périmètre" in lower or "perimetre" in lower


def test_architecture_index_lists_runbook() -> None:
    assert ARCH_INDEX.is_file()
    idx = ARCH_INDEX.read_text(encoding="utf-8")
    assert "runbook-spike-postgresql-15-vers-17.md" in idx
    assert "10.6c" in idx or "10.6d" in idx


def test_story_10_6d_canonical_postgres_image_is_17() -> None:
    """Story 10.6d : compose racine + workflows CI non legacy sur postgres:17."""
    assert ROOT_COMPOSE.is_file()
    compose = ROOT_COMPOSE.read_text(encoding="utf-8")
    assert "image: postgres:17" in compose
    assert "image: postgres:15" not in compose

    assert WORKFLOW_ALEMBIC.is_file()
    alembic = WORKFLOW_ALEMBIC.read_text(encoding="utf-8")
    assert "image: postgres:17" in alembic
    assert "image: postgres:15" not in alembic

    assert WORKFLOW_DEPLOY.is_file()
    deploy = WORKFLOW_DEPLOY.read_text(encoding="utf-8")
    assert deploy.count("image: postgres:17") >= 2
    assert "image: postgres:15" not in deploy
