# Résumé QA — tests automatisés story 22.3

## Générés / complétés (session BMAD bmad-qa-generate-e2e-tests)

### API (pytest)

- `recyclique/api/tests/test_story_22_3_expert_accounting.py` — complété avec :
  - modification moyen de paiement (PATCH + step-up)
  - activation explicite (`active=true`)
  - lecture révision par `GET /revisions/{revision_id}`
  - **AC4** : session ouverte conserve `accounting_config_revision_id` après `POST /revisions/publish`

### UI (Vitest)

- `peintre-nano/tests/unit/admin-accounting-hub-widget.test.tsx` — rail expert absent + pas d’appel révision API sans permissions super-admin complètes ; avec super-admin mocké : **un seul** appel à `getAccountingExpertLatestRevision`, affichage **Révision #42**, mention **PIN step-up** (mutations côté API uniquement).

## Couverture des AC critiques (synthèse)

| AC | Preuve test |
|----|-------------|
| Auth super-admin, step-up mutations | Fichier existant + nouveaux cas PATCH / activate |
| Révision figée session / non relecture mutable à la volée | `test_open_session_keeps_frozen_revision_after_new_publish` |
| Pas d’UI « autorité » sans garde | Vitest permissions |

## Commandes de vérification (session 2026-04-16 — après correctifs CR1 story 22.3)

```text
# Depuis recyclique/api
pytest tests/test_story_22_3_expert_accounting.py -v --tb=short
# Résultat : 24 passed, 5 warnings in ~356 s (~5 min 57 s) — exit 0

# Depuis peintre-nano
npx vitest run tests/unit/admin-accounting-hub-widget.test.tsx
# Résultat : 2 tests passed, 1 fichier — exit 0 (~6.5 s total Vitest)
```
