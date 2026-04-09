# Story 6.7 — synthèse tests (preuve sprint)

## Automatisés

- **Backend** : `recyclique/api/tests/test_cash_session_close.py` — `test_close_session_blocked_when_held_sale_exists` : POST hold puis tentative de clôture → **400** enveloppe AR21, `code` **`CASH_SESSION_CLOSE_HELD_PENDING`** (PostgreSQL requis, skip SQLite comme les autres tests close).
- **OpenAPI / contrat** : `peintre-nano/tests/contract/recyclique-openapi-governance.test.ts` — présence `GET /v1/cash-sessions/current`, `operationId` **`recyclique_cashSessions_getCurrentOpenSession`**.
- **Peintre-nano** :
  - `peintre-nano/tests/unit/cashflow-close-6-7.test.tsx` — helpers théorique / tolérance ; récap (`GET …/current`) avec lignes agrégées (`totals`, poids) ; **blocage client** écart > tolérance sans commentaire (aucun `POST …/close`).
  - `peintre-nano/tests/e2e/cashflow-close-6-7.e2e.test.tsx` — wizard : onglet confirmation, PIN, `POST …/close` avec `X-Step-Up-Pin`, `Idempotency-Key`, `X-Request-Id`, écran succès + relais Epic 8 ; **refus** mock `400` + code `CASH_SESSION_CLOSE_HELD_PENDING` (pas d’écran vert) ; **session vide** mock `200` + `deleted: true` (titre explicite + relais).
  - `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts` — entrée nav `cashflow-close`.

## Manuel (URL locale)

1. Stack Recyclique + Peintre-nano (proxy `/api` ou `VITE_RECYCLIQUE_API_PREFIX`), compte avec `caisse.access`, site actif, **session caisse ouverte** sans ticket `held`.
2. Nav **Clôture de caisse** → `/caisse/cloture` (ou URL directe).
3. Vérifier le **récap** (totaux issus du `GET /v1/cash-sessions/current`), saisir le **montant compté** ; si écart > 0,05 €, **commentaire obligatoire**.
4. Onglet **Confirmer** : saisir le **PIN** step-up → **Clôturer** → message vert + **relais** « Paheko / synchronisation » sans état sync inventé.
5. Cas **refus** : avec un ticket en attente (`held`), la clôture doit afficher l’erreur **`CASH_SESSION_CLOSE_HELD_PENDING`** (ou message dérivé).
6. **Session vide** : si le backend renvoie le corps `deleted` après close, l’UI doit expliquer la suppression locale (pas de session fantôme).

## Captures (optionnel)

Convention : `_bmad-output/implementation-artifacts/screenshots/caisse/`, préfixe `11-0__` si campagne dédiée. Réutilisation possible des captures legacy fermeture (`11-0__caisse-05-*`, `11-0__caisse-06-*`) en référence contexte uniquement.

## Vérification QA (Story Runner — étape bmad-qa-generate-e2e-tests)

- **2026-04-08** : `npm run test` dans `peintre-nano` — **PASS** (49 fichiers, 259 tests Vitest), dont Story 6.7 : `tests/unit/cashflow-close-6-7.test.tsx` (4), `tests/e2e/cashflow-close-6-7.e2e.test.tsx` (3).
