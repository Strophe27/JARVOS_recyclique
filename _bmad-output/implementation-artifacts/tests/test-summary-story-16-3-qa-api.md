# Résumé QA automatisée — Story 16.3 (API / pytest)

## Périmètre

Vérification des AC tests (authz 401/403, step-up nominal / refus / lockout, idempotence) pour export/import/purge DB et cohérence avec le livrable DS existant.

## Couverture revue

- **Déjà en place (DS)** : `test_db_export_endpoint` (401, 403 rôle, PIN manquant), `test_db_import_endpoint` + `TestStory163DatabaseImportGuards` (idempotence, PIN manquant, lockout mocké), `test_db_purge` (authz, idempotence, PIN manquant), `test_session_settings` / `test_admin_activity_threshold_endpoints` pour chemins settings sans step-up (ADR).
- **Complément QA** : cas **PIN invalide** (403 `STEP_UP_PIN_INVALID`) et **lockout** (429 `STEP_UP_LOCKED`) pour **export** et **purge** ; **PIN invalide** pour **import** (symétrie avec l'AC « refus »).

## Tests ajoutés

| Fichier | Classe / cas |
|---------|----------------|
| `recyclique/api/tests/test_db_export_endpoint.py` | `TestStory163DatabaseExportStepUpGuards` |
| `recyclique/api/tests/test_db_import_endpoint.py` | `test_import_step_up_wrong_pin_returns_403` dans `TestStory163DatabaseImportGuards` |
| `recyclique/api/tests/test_db_purge.py` | `TestStory163DatabasePurgeStepUpGuards` |

## Exécution

```bash
cd recyclique/api
python -m pytest tests/test_db_export_endpoint.py tests/test_db_import_endpoint.py tests/test_db_purge.py -q --tb=short
```

Résultat : **PASS** (1 test ignoré dans la sélection, exit code 0).

## Checklist workflow (bmad-qa-generate-e2e-tests)

- [x] Tests API
- [x] Happy path + erreurs critiques (step-up)
- [x] Tests exécutés avec succès
- [x] Résumé créé (ce fichier)
