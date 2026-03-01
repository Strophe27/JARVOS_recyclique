# Story 17.11 — Couverture cas d'erreur admin technique

Lien E16-C-007 : Tests limites au contrat de stub sans verification d'effet metier reel.

## Tests ajoutes (17.11)

### 401 — Non authentifie (auth_client sans headers)

| Test | Route |
|------|-------|
| `test_db_unauthenticated_401` | POST `/v1/admin/db/export`, POST `/v1/admin/db/purge-transactions` |
| `test_db_import_unauthenticated_401` | POST `/v1/admin/db/import` |
| `test_legacy_unauthenticated_401` | GET `/v1/admin/import/legacy/llm-models` |
| `test_legacy_unauthenticated_401` | POST `/v1/admin/import/legacy/analyze`, preview, validate, execute |

**Assertion** : `status_code == 401`, `detail == "Not authenticated"`.

### 403 — Role operator/reception sans admin

| Test | Route |
|------|-------|
| `test_db_operator_forbidden_403` | POST `/v1/admin/db/export`, purge-transactions |
| `test_db_import_operator_forbidden_403` | POST `/v1/admin/db/import` |
| `test_legacy_operator_forbidden_403` | GET llm-models, POST analyze, preview, validate, execute |

**Assertion** : `status_code == 403`, `detail == "Insufficient permissions"`. Fixture `role_client` avec `permission_codes={}` ou `{"reception.access"}`.

### 400/422 — Fichiers invalides

| Test | Cas | Statut attendu |
|------|-----|----------------|
| `test_db_import_no_file_returns_422` | POST db/import sans fichier | 422 (FastAPI param manquant) |
| `test_db_import_empty_file_returns_400` | Fichier vide | 400 |
| `test_db_import_invalid_extension_returns_400` | Extension .txt au lieu de .sql/.dump | 400 |
| `test_legacy_invalid_extension_returns_400_or_422` | Extension .txt au lieu de .csv (analyze, preview, validate, execute) | 400 ou 422 |

### Assertions effet metier renforcees (2.1–2.3)

- `test_db_export_returns_200_and_sql_content` : dump contient "categories" ou "sites" (tables metier).
- `test_db_purge_transactions_deletes_data` : purge ne cible que payment_transactions, sale_items, sales, cash_sessions (documente dans le test).

## Preuve

Sortie pytest complete : `_bmad-output/implementation-artifacts/17-11-preuve-pytest-admin-technique.txt`
