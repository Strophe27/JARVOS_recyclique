"""
Smoke doc — story 10.8 : readiness globale v2 (manifeste + déclaration MD + cohérence gates 10.7).
"""

from __future__ import annotations

import re
from pathlib import Path

import yaml

PROJECT_ROOT = Path(__file__).resolve().parents[2]
READINESS_YAML = PROJECT_ROOT / "doc/v2-global-readiness-official.yaml"
READINESS_MD = PROJECT_ROOT / "doc/v2-global-readiness-go-no-go.md"
UPSTREAM_MANIFEST = PROJECT_ROOT / "doc/release-gates-official.yaml"
SPRINT_STATUS = PROJECT_ROOT / "_bmad-output/implementation-artifacts/sprint-status.yaml"

REQUIRED_DIMENSIONS = (
    "critical_flows",
    "contracts_creos",
    "observability_support",
    "installation_stack",
    "release_gates",
    "ci_industrialization",
    "go_no_go_verdicts",
)
REQUIRED_GATE_VERDICTS = ("g_plancher", "beta_interne", "g_vendable")
SNAPSHOT_STORY_KEYS = tuple(f"10-{i}" for i in range(1, 8))
ALLOWED_VERDICTS = frozenset({"go", "no_go", "conditional"})
CHECKLIST_STATUSES = frozenset({"fully_filled", "partial", "not_documented"})

MD_REQUIRED_LINKS = (
    "doc/release-gates-official.yaml",
    "doc/release-gates-beta-et-vendable.md",
    "doc/critical-core-peloton.md",
    "doc/observability-support-runbook.md",
    "doc/installation-stack-officielle.md",
    "doc/ci-minimal.md",
)


def _read(path: Path) -> str:
    assert path.is_file(), f"Fichier attendu : {path}"
    return path.read_text(encoding="utf-8")


def _load_readiness() -> dict:
    data = yaml.safe_load(_read(READINESS_YAML))
    assert isinstance(data, dict)
    return data


def _load_upstream() -> dict:
    data = yaml.safe_load(_read(UPSTREAM_MANIFEST))
    assert isinstance(data, dict)
    return data


def _sprint_status_for_story_short_keys() -> dict[str, str]:
    raw = yaml.safe_load(_read(SPRINT_STATUS))
    dev = raw.get("development_status") or {}
    assert isinstance(dev, dict)
    out: dict[str, str] = {}
    for short in SNAPSHOT_STORY_KEYS:
        prefix = f"{short}-"
        matches = [k for k in dev if k == short or k.startswith(prefix)]
        assert len(matches) == 1, f"Clé sprint ambiguë pour {short}: {matches}"
        out[short] = str(dev[matches[0]])
    return out


def _upstream_has_g_vendable_blocking() -> bool:
    modules = _load_upstream().get("mandatory_modules") or {}
    for entry in modules.values():
        if not isinstance(entry, dict):
            continue
        gr = entry.get("gate_readiness") or {}
        if gr.get("g_vendable") == "blocking":
            return True
    return False


def test_story_10_8_artifacts_exist() -> None:
    assert READINESS_YAML.is_file()
    assert READINESS_MD.is_file()


def test_readiness_yaml_structure_and_upstream() -> None:
    data = _load_readiness()
    assert data.get("story") == "10.8"
    assert "version" in data

    upstream = data.get("upstream_manifest")
    assert isinstance(upstream, dict)
    assert upstream.get("path") == "doc/release-gates-official.yaml"
    assert upstream.get("story") == "10.7"
    assert UPSTREAM_MANIFEST.is_file()

    dims = data.get("assessment_dimensions")
    assert isinstance(dims, dict)
    assert set(dims.keys()) == set(REQUIRED_DIMENSIONS)
    for key in REQUIRED_DIMENSIONS:
        dim = dims[key]
        assert isinstance(dim.get("ac_refs"), list) and dim["ac_refs"]
        assert isinstance(dim.get("evidence_story_keys"), list) and dim["evidence_story_keys"]


def test_c2b_not_signed_and_gate_verdicts() -> None:
    data = _load_readiness()
    c2b = data.get("c2b_hitl")
    assert isinstance(c2b, dict)
    assert c2b.get("status") == "not_signed"
    assert c2b.get("blocking_tag") == "v2.0.0"

    gates = data.get("gate_verdicts")
    assert isinstance(gates, dict)
    assert set(gates.keys()) == set(REQUIRED_GATE_VERDICTS)
    for gkey in REQUIRED_GATE_VERDICTS:
        entry = gates[gkey]
        assert entry.get("verdict") in ALLOWED_VERDICTS
        assert isinstance(entry.get("rationale"), str) and entry["rationale"].strip()
        assert isinstance(entry.get("blocking_factors"), list) and entry["blocking_factors"]
        assert isinstance(entry.get("evidence_refs"), list) and entry["evidence_refs"]

    if c2b.get("status") == "not_signed":
        assert gates["g_plancher"]["verdict"] != "go"

    if _upstream_has_g_vendable_blocking():
        assert gates["g_vendable"]["verdict"] != "go"

    snapshot = data.get("sprint_status_snapshot") or {}
    stories = snapshot.get("stories") or {}
    if stories.get("10-1") == "review":
        assert gates["beta_interne"]["verdict"] != "go"

    checklist = data.get("beta_interne_checklist_13_1") or {}
    assert checklist.get("status") in CHECKLIST_STATUSES
    if checklist.get("status") != "fully_filled":
        assert gates["beta_interne"]["verdict"] != "go"


def test_blocking_factors_discriminate_gates() -> None:
    data = _load_readiness()
    gates = data["gate_verdicts"]
    pairs = [
        ("g_plancher", "beta_interne"),
        ("g_plancher", "g_vendable"),
        ("beta_interne", "g_vendable"),
    ]
    for a, b in pairs:
        fa = frozenset(gates[a]["blocking_factors"])
        fb = frozenset(gates[b]["blocking_factors"])
        assert fa != fb, f"blocking_factors identiques entre {a} et {b}"


def test_sprint_snapshot_aligned_with_sprint_yaml() -> None:
    data = _load_readiness()
    snapshot = data.get("sprint_status_snapshot") or {}
    stories = snapshot.get("stories") or {}
    assert set(stories.keys()) == set(SNAPSHOT_STORY_KEYS)

    expected = _sprint_status_for_story_short_keys()
    notes = (snapshot.get("snapshot_notes") or "").strip()
    divergences = {k: (stories[k], expected[k]) for k in SNAPSHOT_STORY_KEYS if stories[k] != expected[k]}
    if divergences:
        assert notes, f"Divergence snapshot sans snapshot_notes : {divergences}"
    else:
        for k in SNAPSHOT_STORY_KEYS:
            assert stories[k] == expected[k]


def test_residual_risks_and_epic_closure() -> None:
    data = _load_readiness()
    risks = data.get("residual_risks")
    assert isinstance(risks, list) and len(risks) >= 1
    closure = data.get("epic_10_closure")
    assert isinstance(closure, dict)
    assert closure.get("ready_for_retrospective") is False
    assert closure.get("final_statement_one_liner")

    baseline = data.get("planning_readiness_baseline")
    assert baseline.get("not_superseded_by_10_8") is True
    report = PROJECT_ROOT / baseline["report_path"]
    assert report.is_file()


def test_readiness_md_keywords_links_c2b() -> None:
    body = _read(READINESS_MD)
    assert "G-plancher" in body
    assert "G-vendable" in body
    assert "beta interne" in body.lower()
    assert "go/no-go" in body.lower() or "go-no-go" in body.lower()
    lower = body.lower()
    assert "interdit" in lower and "v2.0.0" in body
    assert "sans c2b" in lower or "non signé" in lower
    assert "non signé" in lower or "non signe" in lower.replace("é", "e")

    # Anti-FM12 : pas de formulation C2b validé/signé (hors « non signé »)
    assert "c2b signé" not in lower
    assert "c2b signed" not in lower
    assert not re.search(r"c2b[^.\n]{0,24}(?<!non )signé", lower)

    for token in MD_REQUIRED_LINKS:
        assert token in body
        assert (PROJECT_ROOT / token).is_file()


def test_aggregation_references_stories_10_x() -> None:
    data = _load_readiness()
    dims = data["assessment_dimensions"]
    all_keys: set[str] = set()
    for dim in dims.values():
        for sk in dim.get("evidence_story_keys") or []:
            all_keys.add(str(sk))
    for required in ("10.2", "10.3", "10.4", "10.5", "10.6", "10.7"):
        assert any(k == required or k.startswith(required) for k in all_keys), required
    assert "10.1" in all_keys or any("10.1" in k for k in all_keys)
