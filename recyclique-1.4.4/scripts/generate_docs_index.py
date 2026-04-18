#!/usr/bin/env python3

"""Generate docs/index.md by cataloging every markdown/text document."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Dict, List, Tuple


def extract_title_and_desc(content: str) -> Tuple[str, str]:
    title = None
    desc = None
    lines = content.splitlines()

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("#"):
            title = re.sub(r"^#+\s*", "", stripped).strip()
            break

    if not title:
        title = "Untitled Document"

    found_title = False
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if not found_title and stripped.startswith("#"):
            found_title = True
            continue
        if found_title:
            desc = stripped
            break

    if not desc:
        desc = "Description a completer."

    desc = re.sub(r"\s+", " ", desc)
    if len(desc) > 280:
        desc = desc[:277] + "..."

    return title, desc


def build_index(docs_dir: Path) -> str:
    entries: Dict[str, List[Tuple[str, str, str]]] = {}

    for path in docs_dir.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() not in {".md", ".txt"}:
            continue

        rel_path = path.relative_to(docs_dir).as_posix()
        parts = path.relative_to(docs_dir).parts
        folder = parts[0] if len(parts) > 1 else "Root Documents"

        try:
            content = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            content = path.read_text(encoding="utf-8", errors="ignore")

        title, desc = extract_title_and_desc(content)
        entries.setdefault(folder, []).append((title, rel_path, desc))

    sections: List[Tuple[str, List[Tuple[str, str, str]]]] = []
    root_entries = entries.pop("Root Documents", [])
    root_entries.sort(key=lambda item: item[0].lower())
    sections.append(("Root Documents", root_entries))

    for folder in sorted(entries.keys(), key=lambda item: item.lower()):
        docs = entries[folder]
        docs.sort(key=lambda item: item[0].lower())
        sections.append((folder, docs))

    lines: List[str] = ["# Documentation Index", ""]

    for folder, docs in sections:
        heading = folder if folder == "Root Documents" else folder
        lines.append(f"## {heading}")
        lines.append("")

        if not docs:
            lines.append("_Aucun document._")
            lines.append("")
            continue

        for title, rel_path, desc in docs:
            lines.append(f"### [{title}](./{rel_path})")
            lines.append("")
            lines.append(desc)
            lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    docs_dir = Path("docs")
    if not docs_dir.is_dir():
        raise SystemExit("docs/ directory introuvable.")

    index_content = build_index(docs_dir)
    index_file = docs_dir / "index.md"
    index_file.write_text(index_content, encoding="utf-8")

    total_docs = sum(
        1
        for line in index_content.splitlines()
        if line.startswith("### [") and "](" in line
    )
    print(f"Indexed {total_docs} documents into {index_file}")


if __name__ == "__main__":
    main()

