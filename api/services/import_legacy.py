# Service import legacy CSV — Story 17.5.
# Pipeline analyze / preview / validate / execute (categories).

import csv
import io
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from api.models import Category
from api.schemas.category import CategoryImportAnalyzeRow
from api.services.csv_categories import CSV_HEADERS, parse_csv_row


def _decode_content(content: bytes) -> str:
    try:
        return content.decode("utf-8-sig")
    except UnicodeDecodeError:
        return content.decode("latin-1")


def _parse_csv_content(content: bytes) -> list[CategoryImportAnalyzeRow]:
    """Parse le contenu CSV et retourne les lignes parsees."""
    text = _decode_content(content)
    buf = io.StringIO(text)
    reader = csv.reader(buf)
    next(reader, None)  # skip header
    rows: list[CategoryImportAnalyzeRow] = []
    for i, row in enumerate(reader):
        if not any(c.strip() for c in row):
            continue
        parsed = parse_csv_row(row, i + 2)
        rows.append(parsed)
    return rows


def analyze_csv(content: bytes) -> dict[str, Any]:
    """
    Analyse le CSV et retourne columns, row_count, errors, warnings, rows.
    """
    rows = _parse_csv_content(content)
    errors = [f"Ligne {r.row_index}: {r.error}" for r in rows if not r.valid and r.error]
    warnings: list[str] = []
    return {
        "columns": CSV_HEADERS,
        "row_count": len(rows),
        "errors": errors,
        "warnings": warnings,
        "rows": [r.model_dump(mode="json") for r in rows],
    }


def preview_csv(content: bytes, limit: int = 10) -> dict[str, Any]:
    """Aperçu des N premieres lignes valides."""
    rows = _parse_csv_content(content)
    valid_rows = [r for r in rows if r.valid]
    preview = valid_rows[:limit]
    return {
        "rows": [r.model_dump(mode="json") for r in preview],
        "total": len(rows),
    }


def validate_csv(db: Session, content: bytes) -> dict[str, Any]:
    """
    Valide le CSV : parent_id doit reference une categorie existante ou etre vide.
    Retourne valid, errors, warnings.
    """
    rows = _parse_csv_content(content)
    errors: list[str] = []
    for r in rows:
        if not r.valid and r.error:
            errors.append(f"Ligne {r.row_index}: {r.error}")
            continue
        if r.parent_id is not None:
            parent = db.execute(select(Category).where(Category.id == r.parent_id)).scalars().one_or_none()
            if parent is None:
                errors.append(f"Ligne {r.row_index}: parent_id {r.parent_id} introuvable en BDD")
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": [],
    }


def _get_category_or_none(db: Session, category_id) -> Category | None:
    return db.execute(select(Category).where(Category.id == category_id)).scalars().one_or_none()


def execute_csv(db: Session, content: bytes) -> dict[str, Any]:
    """
    Execute l'import : insere les lignes valides.
    Ordre topologique : racines d'abord (parent_id vide), puis enfants.
    parent_id doit reference une categorie deja en BDD.
    """
    rows = _parse_csv_content(content)
    valid_rows = [r for r in rows if r.valid and r.name]
    if not valid_rows:
        return {
            "imported_count": 0,
            "errors": ["Aucune ligne valide a importer"],
            "message": "Aucune ligne importee",
        }

    # Trier par ordre topologique : racines puis enfants (plusieurs passes si necessaire)
    created = 0
    errors: list[str] = []
    inserted_ids: set = set()
    remaining = list(valid_rows)

    max_passes = len(remaining) + 1
    for _ in range(max_passes):
        if not remaining:
            break
        inserted_this_pass = 0
        still_remaining: list[CategoryImportAnalyzeRow] = []
        for r in remaining:
            if r.parent_id is None:
                cat = Category(
                    name=r.name,
                    parent_id=None,
                    official_name=r.official_name,
                    is_visible_sale=r.is_visible_sale,
                    is_visible_reception=r.is_visible_reception,
                    display_order=r.display_order,
                    display_order_entry=r.display_order_entry,
                )
                db.add(cat)
                db.flush()
                inserted_ids.add(cat.id)
                created += 1
                inserted_this_pass += 1
            elif r.parent_id in inserted_ids:
                cat = Category(
                    name=r.name,
                    parent_id=r.parent_id,
                    official_name=r.official_name,
                    is_visible_sale=r.is_visible_sale,
                    is_visible_reception=r.is_visible_reception,
                    display_order=r.display_order,
                    display_order_entry=r.display_order_entry,
                )
                db.add(cat)
                db.flush()
                inserted_ids.add(cat.id)
                created += 1
                inserted_this_pass += 1
            else:
                parent = _get_category_or_none(db, r.parent_id)
                if parent is not None:
                    cat = Category(
                        name=r.name,
                        parent_id=r.parent_id,
                        official_name=r.official_name,
                        is_visible_sale=r.is_visible_sale,
                        is_visible_reception=r.is_visible_reception,
                        display_order=r.display_order,
                        display_order_entry=r.display_order_entry,
                    )
                    db.add(cat)
                    db.flush()
                    inserted_ids.add(cat.id)
                    created += 1
                    inserted_this_pass += 1
                else:
                    errors.append(f"Ligne {r.row_index}: parent_id {r.parent_id} introuvable")
                    still_remaining.append(r)

        if inserted_this_pass == 0:
            for r in remaining:
                errors.append(f"Ligne {r.row_index}: parent_id {r.parent_id} introuvable")
            break
        remaining = still_remaining

    db.commit()
    return {
        "imported_count": created,
        "errors": errors,
        "message": f"{created} categorie(s) importee(s)" if created > 0 else "Aucune categorie importee",
    }
