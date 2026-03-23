# Extraction CSV categories — Story 17.5, corrigé Story 19.1.
# CSV_HEADERS et parse_csv_row réutilisables par import legacy et categories.

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


def detect_csv_format(header: list[str] | None, first_rows: list[list[str]]) -> str:
    """Détecte le format CSV : 'recyclique' (notre export) ou 'legacy' (export 1.4.4).

    Format legacy 1.4.4 : col 0 = catégorie (parent), col 1 = sous-catégorie (enfant).
    Quand col 1 est vide, c'est une racine. Quand col 1 est remplie, col 0 est le parent.

    Format recyclique (notre export) : col 0 = name, col 1 = parent_id (UUID ou vide).
    """
    if header:
        h0 = header[0].strip().lower()
        if h0 == "name":
            return "recyclique"
        if h0 in ("catégorie", "categorie", "category"):
            return "legacy"

    # Heuristique : si col 1 contient un UUID, c'est notre format
    for row in first_rows[:5]:
        if len(row) > 1 and row[1].strip():
            try:
                UUID(row[1].strip())
                return "recyclique"
            except ValueError:
                pass

    # Heuristique : si des lignes ont col 0 remplie et col 1 vide (racines),
    # et d'autres ont col 0 = même valeur qu'une racine + col 1 remplie → format legacy
    col0_only = set()
    col0_with_col1 = set()
    for row in first_rows:
        c0 = row[0].strip() if len(row) > 0 else ""
        c1 = row[1].strip() if len(row) > 1 else ""
        if c0 and not c1:
            col0_only.add(c0)
        elif c0 and c1:
            col0_with_col1.add(c0)

    if col0_only & col0_with_col1:
        return "legacy"

    return "recyclique"


def parse_csv_row_legacy(row: list[str], row_index: int) -> CategoryImportAnalyzeRow:
    """Parse une ligne CSV au format legacy 1.4.4.

    col 0 = catégorie (parent pour les sous-cats, ou nom de la racine si col 1 vide)
    col 1 = sous-catégorie (vide si c'est une racine)
    col 2+ = official_name, visibilité, display_order...
    """
    col0 = row[0].strip() if len(row) > 0 else ""
    col1 = row[1].strip() if len(row) > 1 else ""

    if not col0:
        return CategoryImportAnalyzeRow(row_index=row_index, valid=False, error="catégorie manquante")

    if col1:
        # Sous-catégorie : name = col 1, parent = col 0
        name = col1
        parent_ref = col0
    else:
        # Racine : name = col 0, pas de parent
        name = col0
        parent_ref = None

    official_name = row[2].strip() if len(row) > 2 and row[2].strip() else None
    is_visible_sale = row[3].strip().lower() in ("1", "true", "oui", "yes") if len(row) > 3 and row[3].strip() else True
    is_visible_reception = row[4].strip().lower() in ("1", "true", "oui", "yes") if len(row) > 4 and row[4].strip() else True
    try:
        display_order = int(row[5].strip()) if len(row) > 5 and row[5].strip() else 0
    except ValueError:
        return CategoryImportAnalyzeRow(row_index=row_index, name=name, valid=False, error="display_order invalide")
    try:
        display_order_entry = int(row[6].strip()) if len(row) > 6 and row[6].strip() else 0
    except ValueError:
        return CategoryImportAnalyzeRow(row_index=row_index, name=name, valid=False, error="display_order_entry invalide")

    return CategoryImportAnalyzeRow(
        row_index=row_index,
        name=name,
        parent_id=None,
        parent_ref=parent_ref,
        official_name=official_name,
        is_visible_sale=is_visible_sale,
        is_visible_reception=is_visible_reception,
        display_order=display_order,
        display_order_entry=display_order_entry,
        valid=True,
    )


def parse_csv_row(row: list[str], row_index: int) -> CategoryImportAnalyzeRow:
    """Parse une ligne CSV au format recyclique (notre export).

    col 0 = name, col 1 = parent_id (UUID ou nom textuel), col 2+ = metadata.
    """
    if len(row) < 1 or not row[0].strip():
        return CategoryImportAnalyzeRow(row_index=row_index, valid=False, error="name manquant")
    name = row[0].strip()
    parent_id: UUID | None = None
    parent_ref: str | None = None
    if len(row) > 1 and row[1].strip():
        raw_parent = row[1].strip()
        try:
            parent_id = UUID(raw_parent)
        except ValueError:
            parent_ref = raw_parent
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
        parent_ref=parent_ref,
        official_name=official_name,
        is_visible_sale=is_visible_sale,
        is_visible_reception=is_visible_reception,
        display_order=display_order,
        display_order_entry=display_order_entry,
        valid=True,
    )
