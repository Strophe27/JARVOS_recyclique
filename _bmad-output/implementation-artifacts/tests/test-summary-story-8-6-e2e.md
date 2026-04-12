# Synthèse automatisation des tests — Story 8.6 (blocage sélectif action finale A1)

**Périmètre** : backend uniquement (pytest sur `CashSessionService` + garde politique ; pas de navigateur ni Paheko réel — **pas de NEEDS_HITL** pour cette story).

**Date (gate QA)** : 2026-04-10

## Tests existants validés (`recyclique/api/tests/test_story_8_6_selective_blocking.py`)

- [x] **(a) A1 autorisée** — clôture + ligne outbox lorsque mapping 8.3 présent et pas de quarantaine bloquante sur la session (`test_a1_allowed_when_policy_satisfied`).
- [x] **(b) A1 refusée** — quarantaine outbox session (`test_a1_blocked_when_session_outbox_quarantine_row_exists`) + mapping manquant (`test_a1_mapping_missing_raises_close_mapping_reason`) ; session reste ouverte / pas d'enqueue ambigu.
- [x] **(c) Continuité terrain (FR66)** — vente sur autre session ouverte malgré quarantaine sur une session voisine (`test_local_sale_still_allowed_when_other_session_has_quarantine_outbox`) ; clôture de l'autre session permise (`test_a1_other_session_can_close_when_only_peer_has_quarantine`).

## Complément QA — couche orchestration HTTP (ARCH-04 / contrat 409)

- [x] **`run_close_cash_session`** transforme `PahekoSyncPolicyBlockedError` en **HTTP 409** avec `detail == payload` politique (`test_run_close_cash_session_409_when_paheko_a1_policy_blocks` dans `test_cash_session_close_arch04.py`).

## E2E UI (Peintre)

- [ ] Non applicable (story : politique backend + contrat API ; le client affiche les codes renvoyés).

## Exécution

**Fichier story 8.6 seul :**

```bash
cd recyclique/api
python -m pytest -q tests/test_story_8_6_selective_blocking.py
```

**Slice Epic 8 (8.1–8.6) :**

```bash
cd recyclique/api
python -m pytest -q tests/test_story_8_1_paheko_outbox_slice.py tests/test_story_8_2_paheko_outbox_retry_idempotence.py tests/test_story_8_3_paheko_mapping.py tests/test_story_8_4_paheko_quarantine_resolution.py tests/test_story_8_5_paheko_correlation.py tests/test_story_8_6_selective_blocking.py
```

**Non-régression mapping 409 clôture (ARCH-04) :**

```bash
cd recyclique/api
python -m pytest -q tests/test_cash_session_close_arch04.py
```

- **Résultat (gate)** : **PASS** (slice 8.x + `test_cash_session_close_arch04.py` exécutés localement après ajout du cas 409).

## Checklist (`bmad-qa-generate-e2e-tests` / `checklist.md`)

- [x] Tests API / slice e2e backend
- [ ] E2E UI (N/A)
- [x] Happy path + erreurs critiques (refus politique, mapping, quarantaine, 409 orchestration)
- [x] Tests indépendants
- [x] Synthèse enregistrée (`test-summary-story-8-6-e2e.md`)

## Fichiers modifiés / ajoutés

- `recyclique/api/tests/test_cash_session_close_arch04.py` — ajout `test_run_close_cash_session_409_when_paheko_a1_policy_blocks`
- `_bmad-output/implementation-artifacts/tests/test-summary-story-8-6-e2e.md` (ce fichier)
