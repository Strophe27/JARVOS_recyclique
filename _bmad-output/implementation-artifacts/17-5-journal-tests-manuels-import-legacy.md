# Story 17.5 — Journal tests manuels pipeline import legacy

Date : 2026-03-01

## Trace complete pipeline AdminImportLegacyPage

1. **Upload CSV** : selection fichier `name,parent_id,official_name,is_visible_sale,is_visible_reception,display_order,display_order_entry` + ligne `TestCategory,,,,,,`
2. **Analyze** : colonnes=CSV_HEADERS, row_count=1, errors=[], rows valides
3. **Preview** : rows=[{name:TestCategory,...}], total=1
4. **Validate** : valid=true, errors=[]
5. **Execute** : imported_count=1, message="1 categorie(s) importee(s)"

**Preuve** : tests API pytest 18/18 verts (test_admin_db_import_legacy.py), tests UI Vitest 7/7 verts (AdminImportLegacyPage.test.tsx).
