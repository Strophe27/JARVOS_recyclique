#!/usr/bin/env python3

"""Execute the 3-phase story cleanup plan."""

from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple

REPORT_PATH = Path("docs/story-audit-report.json")
TODAY = datetime.now(timezone.utc).strftime("%Y-%m-%d")

DESTINATIONS = {
    "completed": Path("docs/archive/v1.2-and-earlier"),
    "future": Path("docs/archive/future-versions"),
    "debt": Path("docs/pending-tech-debt"),
    "review": Path("docs/stories/to-review"),
}

PHASE_ACTIONS: List[Tuple[str, str, str]] = []


def ensure_dir(path: Path) -> None:
    """Ensure directory exists."""
    path.mkdir(parents=True, exist_ok=True)


def add_frontmatter(content: str, metadata: Dict[str, str]) -> str:
    """Add YAML frontmatter to content if not present."""
    if content.strip().startswith("---"):
        return content
    frontmatter_lines = ["---"]
    for key, value in metadata.items():
        frontmatter_lines.append(f"{key}: {value}")
    frontmatter_lines.append("---")
    frontmatter_lines.append("")
    return "\n".join(frontmatter_lines) + "\n" + content


def move_file(
    source: Path, dest_dir: Path, classification: str, rationale: List[str]
) -> bool:
    """Move file to destination, adding frontmatter."""
    if not source.exists():
        return False

    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_file = dest_dir / source.name

    if dest_file.exists() and dest_file.samefile(source):
        return False

    content = source.read_text(encoding="utf-8", errors="ignore")
    metadata = {
        "categorized_by": "story-audit-and-sort",
        "categorized_date": TODAY,
        "category": classification,
        "original_path": str(source).replace("\\", "/"),
        "rationale": "; ".join(rationale),
    }
    content_with_meta = add_frontmatter(content, metadata)
    dest_file.write_text(content_with_meta, encoding="utf-8")
    source.unlink()
    return True


def phase1_clean_archives(report: Dict[str, List[Dict]]) -> Dict[str, int]:
    """Phase 1: Clean existing archives."""
    print("\n=== PHASE 1: Nettoyage des archives existantes ===")
    stats = {"moved": 0, "skipped": 0}

    archive_v1_2 = report.get("archive_v1_2", [])
    for entry in archive_v1_2:
        path = Path(entry["path"])
        classification = entry["classification"]
        rationale = entry["rationale"]

        if classification == "debt":
            if move_file(path, DESTINATIONS["debt"], "debt", rationale):
                stats["moved"] += 1
                PHASE_ACTIONS.append(("phase1", str(path), "debt"))
            else:
                stats["skipped"] += 1
        elif classification == "future":
            if move_file(path, DESTINATIONS["future"], "future", rationale):
                stats["moved"] += 1
                PHASE_ACTIONS.append(("phase1", str(path), "future"))
            else:
                stats["skipped"] += 1

    archive_future = report.get("archive_future", [])
    for entry in archive_future:
        path = Path(entry["path"])
        classification = entry["classification"]
        rationale = entry["rationale"]

        if classification == "debt":
            if move_file(path, DESTINATIONS["debt"], "debt", rationale):
                stats["moved"] += 1
                PHASE_ACTIONS.append(("phase1", str(path), "debt"))
            else:
                stats["skipped"] += 1

    to_review = report.get("to_review", [])
    for entry in to_review:
        path = Path(entry["path"])
        classification = entry["classification"]
        rationale = entry["rationale"]

        if classification == "completed":
            if move_file(path, DESTINATIONS["completed"], "completed", rationale):
                stats["moved"] += 1
                PHASE_ACTIONS.append(("phase1", str(path), "completed"))
            else:
                stats["skipped"] += 1

    print(f"Phase 1 terminée: {stats['moved']} fichiers déplacés, {stats['skipped']} ignorés")
    return stats


def phase2_consolidate_debt(report: Dict[str, List[Dict]]) -> Dict[str, int]:
    """Phase 2: Consolidate all tech debt."""
    print("\n=== PHASE 2: Consolidation des dettes techniques ===")
    stats = {"moved": 0, "skipped": 0}

    buckets_to_scan = ["stories_root", "archive_v1_2", "backup", "to_review"]
    for bucket in buckets_to_scan:
        entries = report.get(bucket, [])
        for entry in entries:
            path = Path(entry["path"])
            classification = entry["classification"]
            rationale = entry["rationale"]

            if classification == "debt":
                if move_file(path, DESTINATIONS["debt"], "debt", rationale):
                    stats["moved"] += 1
                    PHASE_ACTIONS.append(("phase2", str(path), "debt"))
                else:
                    stats["skipped"] += 1

    print(f"Phase 2 terminée: {stats['moved']} fichiers déplacés, {stats['skipped']} ignorés")
    return stats


def phase3_clean_stories_root(report: Dict[str, List[Dict]]) -> Dict[str, int]:
    """Phase 3: Clean stories root, keep only active."""
    print("\n=== PHASE 3: Nettoyage de docs/stories/ ===")
    stats = {"moved": 0, "skipped": 0}

    stories_root = report.get("stories_root", [])
    for entry in stories_root:
        path = Path(entry["path"])
        if "to-review" in str(path):
            continue

        classification = entry["classification"]
        rationale = entry["rationale"]

        if classification == "completed":
            if move_file(path, DESTINATIONS["completed"], "completed", rationale):
                stats["moved"] += 1
                PHASE_ACTIONS.append(("phase3", str(path), "completed"))
            else:
                stats["skipped"] += 1
        elif classification == "future":
            if move_file(path, DESTINATIONS["future"], "future", rationale):
                stats["moved"] += 1
                PHASE_ACTIONS.append(("phase3", str(path), "future"))
            else:
                stats["skipped"] += 1
        elif classification == "debt":
            if move_file(path, DESTINATIONS["debt"], "debt", rationale):
                stats["moved"] += 1
                PHASE_ACTIONS.append(("phase3", str(path), "debt"))
            else:
                stats["skipped"] += 1

    print(f"Phase 3 terminée: {stats['moved']} fichiers déplacés, {stats['skipped']} ignorés")
    return stats


def generate_report() -> None:
    """Generate final cleanup report."""
    report_path = Path("docs/story-cleanup-execution-report.md")
    lines = [
        "# Rapport d'Exécution du Nettoyage des Stories",
        "",
        f"**Date:** {TODAY}",
        f"**Total d'actions:** {len(PHASE_ACTIONS)}",
        "",
        "## Résumé par Phase",
        "",
    ]

    for phase_num in [1, 2, 3]:
        phase_actions = [a for a in PHASE_ACTIONS if a[0] == f"phase{phase_num}"]
        lines.append(f"### Phase {phase_num}")
        lines.append(f"- Fichiers traités: {len(phase_actions)}")
        lines.append("")

    lines.append("## Détails des Actions")
    lines.append("")
    for phase, source, dest_type in PHASE_ACTIONS:
        lines.append(f"- `{source}` → `{DESTINATIONS[dest_type]}` ({phase})")

    report_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"\nRapport d'exécution sauvegardé: {report_path}")


def main() -> None:
    """Execute all cleanup phases."""
    if not REPORT_PATH.exists():
        print(f"ERREUR: Rapport d'audit introuvable: {REPORT_PATH}")
        print("Exécutez d'abord: python3 scripts/story_audit_scan.py")
        return

    report = json.loads(REPORT_PATH.read_text(encoding="utf-8"))

    for dest in DESTINATIONS.values():
        ensure_dir(dest)

    print("Démarrage du nettoyage complet (3 phases)...")
    print("⚠️  Aucun fichier ne sera supprimé, seulement déplacé avec métadonnées.")

    stats1 = phase1_clean_archives(report)
    stats2 = phase2_consolidate_debt(report)
    stats3 = phase3_clean_stories_root(report)

    generate_report()

    total_moved = stats1["moved"] + stats2["moved"] + stats3["moved"]
    total_skipped = stats1["skipped"] + stats2["skipped"] + stats3["skipped"]

    print(f"\n✅ Nettoyage terminé!")
    print(f"   Total déplacé: {total_moved}")
    print(f"   Total ignoré: {total_skipped}")


if __name__ == "__main__":
    main()

