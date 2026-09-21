"""
Smoke doc — story 10.6 : manifeste stack officielle + guide installation.

Sans Docker : YAML structuré, guide Markdown, liens relatifs, frontières legacy / Paheko / observabilité 10.5.
"""

from __future__ import annotations

from pathlib import Path

import yaml

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MANIFEST = PROJECT_ROOT / "doc/supported-stack-official.yaml"
GUIDE = PROJECT_ROOT / "doc/installation-stack-officielle.md"
README = PROJECT_ROOT / "README.md"
RUNBOOK_PG = (
    PROJECT_ROOT
    / "_bmad-output/planning-artifacts/operations/runbook-spike-postgresql-15-vers-17.md"
)
OBS_RUNBOOK = PROJECT_ROOT / "doc/observability-support-runbook.md"

REQUIRED_SERVICES = (
    "recyclique_api",
    "peintre_nano",
    "paheko",
    "postgresql",
    "redis",
)

REQUIRED_PILLARS = (
    "stack_services",
    "debian_reference",
    "docker_entrypoint",
    "postgresql_17",
    "browser_matrix",
    "nominal_install_complete",
)


def _read(path: Path) -> str:
    assert path.is_file(), f"Fichier attendu : {path}"
    return path.read_text(encoding="utf-8")


def _load_manifest() -> dict:
    data = yaml.safe_load(_read(MANIFEST))
    assert isinstance(data, dict)
    return data


def test_story_10_6_artifacts_exist() -> None:
    assert MANIFEST.is_file()
    assert GUIDE.is_file()
    assert README.is_file()
    assert RUNBOOK_PG.is_file()
    assert OBS_RUNBOOK.is_file()


def test_manifest_story_services_and_pillars() -> None:
    data = _load_manifest()
    assert data.get("story") == "10.6"
    assert "version" in data
    official_os = data.get("official_os")
    assert isinstance(official_os, dict)
    assert official_os.get("family") == "debian"

    services = data.get("services")
    assert isinstance(services, dict)
    assert set(services.keys()) == set(REQUIRED_SERVICES)

    pillars = data.get("installability_pillars")
    assert isinstance(pillars, dict)
    assert set(pillars.keys()) == set(REQUIRED_PILLARS)
    for key in REQUIRED_PILLARS:
        entry = pillars[key]
        assert isinstance(entry, dict)
        assert entry.get("summary")
        assert entry.get("ac_refs")

    aux = data.get("compose_auxiliary_services")
    assert isinstance(aux, dict)
    assert "frontend-legacy" in aux
    assert aux["frontend-legacy"].get("excluded_from_minimal_up") is True

    index = data.get("sub_stories_index")
    assert isinstance(index, dict)
    for sub in ("10.6b", "10.6c", "10.6d", "10.6e"):
        assert sub in index


def test_manifest_service_ports_and_compose_names() -> None:
    data = _load_manifest()
    services = data["services"]
    assert services["recyclique_api"]["compose_service"] == "api"
    assert services["recyclique_api"]["default_local_port"] == 8000
    assert services["peintre_nano"]["default_local_port"] == 4444
    assert services["paheko"]["default_local_port"] == 8080
    assert services["postgresql"]["default_local_port"] == 5432
    assert services["redis"]["default_local_port"] == 6379


def test_guide_debian_support_matrix_and_ports() -> None:
    body = _read(GUIDE)
    assert "Debian" in body
    assert "Matrice Support" in body or "matrice" in body.lower()
    for port in ("8000", "4444", "8080", "5432", "6379"):
        assert port in body
    assert "4445" in body
    lower = body.lower()
    assert "frontend-legacy" in lower or "legacy" in lower
    assert "hors" in lower or "exclu" in lower


def test_guide_minimal_up_without_legacy_and_migrations_happy_path() -> None:
    body = _read(GUIDE)
    assert "docker compose up --build postgres redis api-migrations api paheko frontend" in body
    assert "frontend-legacy" in body
    assert "depends_on" in body or "service_completed_successfully" in body
    assert "run --rm api-migrations" in body
    assert "reprise" in body.lower() or "Reprise" in body


def test_guide_health_ui_and_nominal_install() -> None:
    body = _read(GUIDE)
    assert "/health" in body
    assert "localhost:8000" in body or ":8000" in body
    assert "4444" in body
    assert "FIRST_SUPER_ADMIN" in body
    lower = body.lower()
    assert "shell" in lower or "authentifi" in lower
    assert "contexte" in lower or "exploitable" in lower


def test_guide_paheko_posture_and_observability_link() -> None:
    body = _read(GUIDE)
    assert "8080" in body
    assert "paheko" in body.lower()
    assert "observability-support-runbook.md" in body
    assert "Après installation" in body or "support" in body


def test_guide_links_runbook_pg17_and_readme_without_duplicating_runbook_body() -> None:
    body = _read(GUIDE)
    assert "runbook-spike-postgresql-15-vers-17.md" in body
    readme = _read(README)
    assert "installation-stack-officielle.md" in readme
    # Pas de copie massive du runbook (seulement références)
    assert len(body) < len(_read(RUNBOOK_PG)) * 3


def test_guide_does_not_present_legacy_stack_as_official() -> None:
    body = _read(GUIDE)
    assert "recyclique-1.4.4" in body
    assert "HelloAsso" in body or "helloasso" in body.lower()
