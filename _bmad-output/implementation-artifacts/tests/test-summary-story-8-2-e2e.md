# Synthèse automatisation des tests — Story 8.2 (Paheko outbox : idempotence, retries, statuts)

**Périmètre** : backend API uniquement (slice e2e = pytest FastAPI + DB + HTTP mock Paheko), extension 8.1. Pas de navigateur / Peintre.

**Date (gate QA)** : 2026-04-10

## Tests existants validés

### Tests API (`recyclique/api/tests/`)

- [x] `test_story_8_1_paheko_outbox_slice.py` — création outbox à la clôture, `a_reessayer`, processor 200/500, admin list/get, snapshot, OpenAPI list/get.
- [x] `test_story_8_2_paheko_outbox_retry_idempotence.py` — backoff puis succès, 409 → `resolu`, en-tête `Idempotency-Key`, plafond tentatives → `en_quarantaine`, reject admin → `rejete`, lignes `rejete` non sélectionnées.

## Compléments ajoutés (couverture checklist)

- [x] **Respect `next_retry_at`** : `test_immediate_second_process_respects_next_retry_at` — pas de 2e appel HTTP tant que le backoff n'est pas écoulé.
- [x] **Erreurs API reject** : `test_admin_reject_unknown_returns_404`, `test_admin_reject_forbidden_for_user_role` (403).
- [x] **Contrat OpenAPI** : `test_openapi_includes_reject_operation_id` (`recyclique_pahekoOutbox_rejectItem`).

## Exécution

- Commande recommandée :

```bash
cd recyclique/api
python -m pytest tests/test_story_8_1_paheko_outbox_slice.py tests/test_story_8_2_paheko_outbox_retry_idempotence.py -q
```

- **Résultat** : **PASS** — 20 tests (11 + 9 fichiers au départ ; +4 dans le fichier 8.2).

## Checklist (`bmad-qa-generate-e2e-tests` / `checklist.md`)

- [x] Tests API (slice e2e backend)
- [ ] E2E UI (N/A story)
- [x] Happy path + cas d'erreur critiques (403 reject, 404 reject, backoff)
- [x] Tous les tests ciblés passent
- [x] Tests indépendants
- [x] Synthèse enregistrée

## Fichiers modifiés

- `recyclique/api/tests/test_story_8_2_paheko_outbox_retry_idempotence.py` (compléments)
- `_bmad-output/implementation-artifacts/tests/test-summary-story-8-2-e2e.md` (ce fichier)
