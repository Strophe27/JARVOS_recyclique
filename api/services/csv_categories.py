# Extraction CSV categories — Story 17.5.
# CSV_HEADERS et _parse_csv_row reutilisables par import legacy et categories.

from uuid import UUID

from api.schemas.category import CategoryImportAnalyzeRow

CSV_HEADERS = [
    "name",
    "parent_id",
    "official_name",
    "is_visible_sale",
    "is_visible_reception",
    "display_order",
    "display_order_entry",
]


def parse_csv_row(row: list[str], row_index: int) -> CategoryImportAnalyzeRow:
    """Parse une ligne CSV en CategoryImportAnalyzeRow. Erreurs -> valid=False."""
    if len(row) < 1 or not row[0].strip():
        return CategoryImportAnalyzeRow(row_index=row_index, valid=False, error="name manquant")
    name = row[0].strip()
    parent_id: UUID | None = None
    if len(row) > 1 and row[1].strip():
        try:
            parent_id = UUID(row[1].strip())
        except ValueError:
            return CategoryImportAnalyzeRow(row_index=row_index, name=name, valid=False, error="parent_id invalide")
    official_name = row[2].strip() if len(row) > 2 else None
    official_name = official_name or None
    is_visible_sale = row[3].strip().lower() in ("1", "true", "oui", "yes") if len(row) > 3 else True
    is_visible_reception = row[4].strip().lower() in ("1", "true", "oui", "yes") if len(row) > 4 else True
    try:
        display_order = int(row[5].strip()) if len(row) > 5 and row[5].strip() else 0
    except ValueError:
        return CategoryImportAnalyzeRow(row_index=row_index, name=name, valid=False, error="display_order invalide")
    try:
        display_order_entry = int(row[6].strip()) if len(row) > 6 and row[6].strip() else 0
    except ValueError:
        return CategoryImportAnalyzeRow(
            row_index=row_index, name=name, valid=False, error="display_order_entry invalide"
        )
    return CategoryImportAnalyzeRow(
        row_index=row_index,
        name=name,
        parent_id=parent_id,
        official_name=official_name,
        is_visible_sale=is_visible_sale,
        is_visible_reception=is_visible_reception,
        display_order=display_order,
        display_order_entry=display_order_entry,
        valid=True,
    )
