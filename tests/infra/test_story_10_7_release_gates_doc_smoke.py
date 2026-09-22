"""
Smoke doc — story 10.7 : manifeste gates release + guide humain + cohérence preuves Epic 10.
"""

from __future__ import annotations

from pathlib import Path

import yaml

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MANIFEST = PROJECT_ROOT / "doc/release-gates-official.yaml"
GUIDE = PROJECT_ROOT / "doc/release-gates-beta-et-vendable.md"
CRITERION_IDS = PROJECT_ROOT / "doc/release-gates-criterion-ids.yaml"

REQUIRED_GATE_KEYS = ("g_plancher", "beta_interne", "g_vendable")
EXPECTED_NON_CONFUSABLE: dict[str, frozenset[str]] = {
    "g_plancher": frozenset({"g_vendable", "beta_interne"}),
    "beta_interne": frozenset({"g_plancher", "g_vendable"}),
    "g_vendable": frozenset({"g_plancher", "beta_interne"}),
}
REQUIRED_PILLARS = (
    "g_plancher",
    "beta_interne",
    "g_vendable",
    "mandatory_module_map",
    "evidence_index",
    "c2b_hitl_boundary",
)
REQUIRED_MODULES = (
    "cashflow",
    "reception_flow",
    "bandeau_live",
    "eco_organismes",
    "adherents",
    "sync_paheko",
    "helloasso",
    "config_admin_simple",
)
MODULES_WITH_STORY_KEYS = ("eco_organismes", "adherents", "helloasso")
EVIDENCE_STORIES = ("10.1", "10.2", "10.3", "10.4", "10.5", "10.6")
SUB_10_6 = ("10.6b", "10.6c", "10.6d", "10.6e")

GUIDE_REQUIRED_LINKS = (
    "doc/critical-core-peloton.md",
    "doc/observability-support-runbook.md",
    "doc/observability-critical-flows.yaml",
    "doc/installation-stack-officielle.md",
    "doc/ci-minimal.md",
)


def _read(path: Path) -> str:
    assert path.is_file(), f"Fichier attendu : {path}"
    return path.read_text(encoding="utf-8")


def _load_manifest() -> dict:
    data = yaml.safe_load(_read(MANIFEST))
    assert isinstance(data, dict)
    return data


def _load_expected_criterion_ids() -> dict[str, list[str]]:
    data = yaml.safe_load(_read(CRITERION_IDS))
    assert isinstance(data, dict)
    return {k: list(v) for k, v in data.items() if k in REQUIRED_GATE_KEYS}


def _collect_criterion_ids(manifest: dict) -> set[str]:
    found: set[str] = set()
    criteria = manifest.get("criteria") or {}
    for gate in REQUIRED_GATE_KEYS:
        entries = criteria.get(gate) or []
        for entry in entries:
            if isinstance(entry, dict) and entry.get("criterion_id"):
                found.add(str(entry["criterion_id"]))
    return found


def test_story_10_7_artifacts_exist() -> None:
    assert MANIFEST.is_file()
    assert GUIDE.is_file()
    assert CRITERION_IDS.is_file()


def test_manifest_story_gates_pillars_c2b() -> None:
    data = _load_manifest()
    assert data.get("story") == "10.7"
    assert "version" in data

    gates = data.get("gates")
    assert isinstance(gates, dict)
    assert set(gates.keys()) == set(REQUIRED_GATE_KEYS)
    for key in REQUIRED_GATE_KEYS:
        gate = gates[key]
        assert gate.get("prd_section")
        assert gate.get("summary")
        ncu = gate.get("non_confusable_with")
        assert isinstance(ncu, list)
        assert frozenset(ncu) == EXPECTED_NON_CONFUSABLE[key]

    pillars = data.get("release_gate_pillars")
    assert isinstance(pillars, dict)
    assert set(pillars.keys()) == set(REQUIRED_PILLARS)

    c2b = data.get("c2b_hitl")
    assert isinstance(c2b, dict)
    assert c2b.get("status") == "not_signed"
    assert c2b.get("blocking_tag") == "v2.0.0"

    assert data.get("sprint_status_resync") is True


def test_manifest_mandatory_modules_and_story_keys() -> None:
    data = _load_manifest()
    modules = data.get("mandatory_modules")
    assert isinstance(modules, dict)
    assert set(modules.keys()) == set(REQUIRED_MODULES)
    for key in REQUIRED_MODULES:
        entry = modules[key]
        assert entry.get("prd_label")
        gr = entry.get("gate_readiness")
        assert isinstance(gr, dict)
        assert set(gr.keys()) == set(REQUIRED_GATE_KEYS)
        for val in gr.values():
            assert val in ("ready", "partial", "blocking", "out_of_scope")
    for key in MODULES_WITH_STORY_KEYS:
        sk = modules[key].get("story_keys")
        assert isinstance(sk, list) and len(sk) >= 1


def test_manifest_criteria_ids_match_cs_list() -> None:
    manifest = _load_manifest()
    expected = _load_expected_criterion_ids()
    found = _collect_criterion_ids(manifest)
    for gate, ids in expected.items():
        for cid in ids:
            assert cid in found, f"criterion_id manquant : {cid} (gate {gate})"


def test_evidence_anchors_stories_and_paths_exist() -> None:
    data = _load_manifest()
    anchors = data.get("evidence_anchors")
    assert isinstance(anchors, dict)
    for story in EVIDENCE_STORIES:
        assert story in anchors
        entry = anchors[story]
        paths = entry.get("artifact_paths") or []
        assert isinstance(paths, list) and len(paths) >= 1
        for rel in paths:
            full = PROJECT_ROOT / rel
            assert full.is_file(), f"[{story}] artefact manquant : {rel}"
    sub = anchors["10.6"].get("sub_stories") or {}
    for sub_key in SUB_10_6:
        assert sub_key in sub
        for rel in sub[sub_key].get("artifact_paths") or []:
            assert (PROJECT_ROOT / rel).is_file(), f"[10.6/{sub_key}] manquant : {rel}"


def test_epic_24_pending_po() -> None:
    data = _load_manifest()
    scope = data.get("epic_24_beta_scope")
    assert isinstance(scope, dict)
    assert scope.get("decision") == "pending_po"


def test_guide_keywords_and_c2b_tag_interdit() -> None:
    body = _read(GUIDE)
    assert "G-plancher" in body
    assert "G-vendable" in body
    assert "beta interne" in body.lower() or "Beta interne" in body
    lower = body.lower()
    assert "not_signed" in lower or "non signé" in lower
    assert "interdit" in lower and "v2.0.0" in body
    assert "sans c2b" in lower or "sans C2b" in body


def test_guide_relative_links_resolve() -> None:
    body = _read(GUIDE)
    for token in GUIDE_REQUIRED_LINKS:
        assert token in body
        assert (PROJECT_ROOT / token).is_file()


def test_guide_criterion_id_columns() -> None:
    body = _read(GUIDE)
    assert "`criterion_id`" in body or "criterion_id" in body
    assert "bi_terrain_fiable" in body
    assert "gv_installation_oss" in body


def test_manifest_doc_anchor_paths_exist() -> None:
    data = _load_manifest()
    for rel in data.get("doc_anchors") or []:
        assert (PROJECT_ROOT / rel).is_file(), rel
