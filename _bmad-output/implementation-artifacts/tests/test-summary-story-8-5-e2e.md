# Synthèse automatisation des tests — Story 8.5 (corrélation inter-systèmes Paheko)

**Périmètre** : backend API uniquement (slice e2e = pytest FastAPI + DB + mock HTTP Paheko pour le processeur outbox). Aucun navigateur ni login Paheko réel — **pas de NEEDS_HITL** pour cette story.

**Date (gate QA)** : 2026-04-10

## Tests existants validés et complétés

### Tests API (`recyclique/api/tests/test_story_8_5_paheko_correlation.py`)

- [x] **Filtre `correlation_id`** sur `GET .../admin/paheko-outbox/items` : lignes retournées cohérentes avec le `correlation_id` passé à la clôture.
- [x] **`GET .../admin/paheko-outbox/by-correlation/{correlation_id}`** (`operationId` `recyclique_pahekoOutbox_getCorrelationTimeline`) : après traitement outbox (mock 200), timeline avec items + `sync_transitions` filtrés sur le même `correlation_id`.
- [x] **404** si aucune ligne outbox pour le `correlation_id` demandé.
- [x] **Permissions** : rôle USER → **403** sur liste filtrée et sur timeline (renfort QA, aligné story 8.4).
- [x] **Réponse clôture** (`POST .../cash-sessions/{id}/close`) : `paheko_sync_correlation_id` (aligné `X-Request-Id`) et `paheko_outbox_item_id` présents ; cohérence DB `PahekoOutboxItem`.

## E2E UI

- [ ] Non applicable (story : corrélation / admin API + champs réponse clôture).

## Exécution

**Fichier story 8.5 seul :**

```bash
cd recyclique/api
python -m pytest -q tests/test_story_8_5_paheko_correlation.py
```

**Registre Epic 8 (slice Paheko outbox / clôture / quarantaine, non-régression 8.1–8.5) :**

```bash
cd recyclique/api
python -m pytest -q tests/test_story_8_1_paheko_outbox_slice.py tests/test_story_8_2_paheko_outbox_retry_idempotence.py tests/test_story_8_3_paheko_mapping.py tests/test_story_8_4_paheko_quarantine_resolution.py tests/test_story_8_5_paheko_correlation.py
```

- **Résultat (gate)** : **PASS** — 5 tests sur le fichier 8.5 (après ajout du cas 403 USER).

## Checklist (`bmad-qa-generate-e2e-tests` / `checklist.md`)

- [x] Tests API (slice e2e backend)
- [ ] E2E UI (N/A)
- [x] Happy path + cas d’erreur critiques (404, 403)
- [x] Tous les tests du fichier passent
- [x] Tests indépendants
- [x] Synthèse enregistrée (`test-summary-story-8-5-e2e.md`)

## Fichiers modifiés / ajoutés

- `recyclique/api/tests/test_story_8_5_paheko_correlation.py` (ajout : `test_user_forbidden_correlation_admin_reads`)
- `_bmad-output/implementation-artifacts/tests/test-summary-story-8-5-e2e.md` (ce fichier)
