#!/usr/bin/env python3
"""Gate executable QA visuelle 13.3.2.

Usage (depuis la racine du repo):
  python _bmad-output/implementation-artifacts/tools/qa_visuelle_enforcement_gate.py \
    --manifest <manifest.json> --stage review
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

EXCLUSIONS = ("pin login", "users pending", "permissions")
SEVERITES_BLOQUANTES = {"critique", "majeur"}
CORRECTIF_OK = {"done", "accepted"}


def _norm(path_value: str) -> str:
    return path_value.replace("\\", "/")


def _load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def _require_path(
    errors: list[str],
    repo_root: Path,
    value: Any,
    expected_prefix: str,
    label: str,
) -> None:
    if not isinstance(value, str) or not value.strip():
        errors.append(f"{label}: chemin manquant")
        return
    normalized = _norm(value)
    if not normalized.startswith(expected_prefix):
        errors.append(
            f"{label}: prefixe non canonique (attendu '{expected_prefix}', recu '{normalized}')"
        )
    if not (repo_root / normalized).exists():
        errors.append(f"{label}: chemin introuvable '{normalized}'")


def evaluate_gate(manifest: dict[str, Any], repo_root: Path, stage: str) -> dict[str, Any]:
    errors: list[str] = []
    blocking_reasons: list[str] = []

    story_key = manifest.get("story")
    if not isinstance(story_key, str) or not story_key:
        errors.append("story: valeur manquante")
        story_key = "<story_key_missing>"

    # Preconditions techniques minimales
    preconditions = manifest.get("preconditions_gate", {})
    build_result = (
        preconditions.get("build", {}).get("resultat")
        if isinstance(preconditions, dict)
        else None
    )
    tests_result = (
        preconditions.get("tests_ui_colocalises", {}).get("resultat")
        if isinstance(preconditions, dict)
        else None
    )
    preuves_completes = preconditions.get("preuves_completes") if isinstance(preconditions, dict) else None

    if build_result != "OK":
        blocking_reasons.append("Precondition KO: build != OK")
    if tests_result != "OK":
        blocking_reasons.append("Precondition KO: tests UI colocalises != OK")
    if preuves_completes != "OK":
        blocking_reasons.append("Precondition KO: preuves_completes != OK")

    # Exclusions Epic 11
    verif_exclusions = manifest.get("verification_exclusions", {})
    if not isinstance(verif_exclusions, dict):
        errors.append("verification_exclusions: structure invalide")
        verif_exclusions = {}
    for exclusion in EXCLUSIONS:
        if verif_exclusions.get(exclusion) != "ok":
            blocking_reasons.append(f"Exclusion non validee: '{exclusion}'")

    preuves = manifest.get("preuves")
    if not isinstance(preuves, list) or not preuves:
        errors.append("preuves: liste vide ou invalide")
        preuves = []

    before_prefix = "_bmad-output/implementation-artifacts/screenshots/11-0/"
    after_prefix = f"_bmad-output/implementation-artifacts/screenshots/{story_key}/"

    for index, preuve in enumerate(preuves, start=1):
        if not isinstance(preuve, dict):
            errors.append(f"preuves[{index}]: item invalide")
            continue

        captures = preuve.get("captures", {})
        if not isinstance(captures, dict):
            errors.append(f"preuves[{index}].captures: structure invalide")
            continue

        _require_path(errors, repo_root, captures.get("avant"), before_prefix, f"preuves[{index}].captures.avant")
        _require_path(errors, repo_root, captures.get("apres"), after_prefix, f"preuves[{index}].captures.apres")

        ecarts = preuve.get("ecarts", [])
        if not isinstance(ecarts, list):
            errors.append(f"preuves[{index}].ecarts: structure invalide")
            continue

        for ecart_index, ecart in enumerate(ecarts, start=1):
            if not isinstance(ecart, dict):
                errors.append(f"preuves[{index}].ecarts[{ecart_index}]: structure invalide")
                continue
            severite = ecart.get("severite")
            accepte = bool(ecart.get("accepte", False))
            correctif = ecart.get("correctif", {})
            correctif_statut = (
                correctif.get("statut") if isinstance(correctif, dict) else None
            )

            if not isinstance(correctif, dict):
                errors.append(f"preuves[{index}].ecarts[{ecart_index}].correctif: structure invalide")
                continue
            for key in ("owner", "action", "statut", "preuve_cible"):
                if not correctif.get(key):
                    errors.append(
                        f"preuves[{index}].ecarts[{ecart_index}].correctif.{key}: valeur manquante"
                    )

            # Refus automatique: review/done
            if severite in SEVERITES_BLOQUANTES and not accepte and correctif_statut not in CORRECTIF_OK:
                blocking_reasons.append(
                    f"Ecart {severite} ouvert: preuves[{index}].ecarts[{ecart_index}]"
                )
            if stage == "done" and correctif_statut not in CORRECTIF_OK:
                blocking_reasons.append(
                    f"Action corrective non cloturee en stage done: preuves[{index}].ecarts[{ecart_index}]"
                )

    # Coherence decision finale declaree
    declared_status = manifest.get("decision", {}).get("statut")
    if declared_status not in {"go-review", "blocked"}:
        errors.append("decision.statut invalide (attendu go-review|blocked)")

    computed_status = "blocked" if errors or blocking_reasons else "go-review"
    if declared_status and declared_status != computed_status:
        errors.append(
            f"Incoherence decision.statut: declare '{declared_status}', calcule '{computed_status}'"
        )

    return {
        "story": story_key,
        "stage": stage,
        "decision": computed_status,
        "blocking_reasons": blocking_reasons,
        "errors": errors,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Gate executable QA visuelle 13.3.2 (refus automatique review/done)"
    )
    parser.add_argument("--manifest", required=True, help="Chemin du manifest enforcement JSON")
    parser.add_argument(
        "--stage",
        choices=("review", "done"),
        default="review",
        help="Etape du gate a valider",
    )
    parser.add_argument(
        "--repo-root",
        default=".",
        help="Racine du repository pour resoudre les chemins du manifest",
    )
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    manifest_path = Path(args.manifest)
    if not manifest_path.is_absolute():
        manifest_path = (repo_root / manifest_path).resolve()

    manifest = _load_json(manifest_path)
    result = evaluate_gate(manifest, repo_root=repo_root, stage=args.stage)
    print(json.dumps(result, ensure_ascii=True, indent=2))

    if result["errors"]:
        return 1
    if result["decision"] == "blocked":
        # Refus automatique: non-zero pour bloquer passage review/done.
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
