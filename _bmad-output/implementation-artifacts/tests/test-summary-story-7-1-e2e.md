# Synthèse automatisation des tests — Story 7.1 (parcours réception nominal v2)

**Baseline UI** : `/reception` dans `Peintre_nano` — `FlowRenderer` (`flow-renderer-reception-nominal`), wizard `data-testid="reception-nominal-wizard"`, enchaînement explicite en onglets (poste → ticket → ligne → fermeture ticket → fermeture poste).

**Date (gate QA e2e)** : 2026-04-09

## Tests générés / complétés

### Tests E2E (Vitest + Testing Library + jsdom)

- [x] `peintre-nano/tests/e2e/reception-nominal-7-1.e2e.test.tsx`
  - **Parcours nominal (AC 1)** : navigation `/reception` ; ouverture poste (`POST /v1/reception/postes/open`) ; création ticket (`POST /v1/reception/tickets`) ; étape ligne avec **catégorie** (`GET /v1/reception/categories`), **poids kg**, **destination**, **notes** (saisie `reception-input-notes` + corps POST vérifié) ; `POST /v1/reception/lignes` ; rafraîchissement ticket (`GET` détail) ; fermeture ticket (`POST .../tickets/{id}/close`) ; fermeture poste (`POST .../postes/{id}/close`). Les réponses sont **mockées** : le test vérifie la cohérence de la chaîne d'appels et des corps utiles, pas un backend réel.
  - **Assertions réseau mock** : au moins un appel chacun pour open poste, création ligne, fermeture ticket, fermeture poste.
  - **Cas critique (checklist Quinn)** : `POST` ouverture poste en **403** → `reception-api-error` + statut **403** visible (`cashflow-error-http-status`).

### Tests API dédiés

- Non générés dans ce run : les endpoints réception sont couverts côté backend par la suite `recyclique/api/tests/` (hors périmètre skill e2e UI) ; la story 7.1 demande surtout la chaîne UI + preuves terrain séparées.

## Alignement critères d'acceptation (aperçu)

| AC | Couverture automatisée jsdom | Limite |
|----|------------------------------|--------|
| 1 — Séquence nominal + mutations Recyclique | Oui (parcours + mocks `fetch`) | Pas de TLS/CORS/cookies réels |
| 2 — Lisibilité terrain | Partiel (onglets, libellés d'étapes via FlowRenderer) | Pas de jugement UX subjectif automatisé |
| 3 — Baseline pour la suite | Implicite (pivot nominal sans 7.2–7.5) | — |
| 4 — Registre + preuves `localhost:4444` | **Non** — voir ci-dessous | Obligation terrain hors Vitest |
| 5 — `data_contract.operation_id` | Non testé en e2e | Contrat / registre §5 |

## Exécution

- Commande : `npx vitest run tests/e2e/reception-nominal-7-1.e2e.test.tsx` (répertoire `peintre-nano/`)
- **Résultat :** **PASS** — 1 fichier, **2** tests.

## Ce qui manque pour des preuves réseau réelles (`http://localhost:4444`)

- Servir l'UI v2 sur **4444** (stack projet) avec **Recyclique** joignable selon la config live snapshot / base URL utilisée par `getLiveSnapshotBasePrefix()`.
- En **DevTools** (ou équivalent) : enchaîner le parcours opérateur et **capturer** pour chaque mutation critique : méthode, chemin, **statut HTTP**, éventuellement `correlation_id` / extrait de corps — sur **`http://localhost:4444`** (ne pas utiliser `127.0.0.1` pour ces preuves, convention story).
- Recopier ces preuves dans le **registre terrain** `references/artefacts/2026-04-09_01_reception-v2-exploitabilite-terrain-epic7-squelette.md` (AC 4 story 7.1).
- Option ultérieure : couche **Playwright** (ou similaire) contre l'URL servie pour rejouer le nominal avec backend réel — non requis pour le vert Vitest actuel.

## Checklist (workflow `bmad-qa-generate-e2e-tests` / `checklist.md`)

- [x] E2E générés / étendus (UI)
- [ ] Tests API dédiés story 7.1 dans ce dépôt (N/A focus QA = UI jsdom)
- [x] Happy path
- [x] Au moins un cas d'erreur API critique (403 ouverture poste)
- [x] Tous les tests ciblés exécutés avec succès
- [x] Locateurs : `role`, `data-testid`
- [x] Pas de `sleep` arbitraire
- [x] Tests indépendants (`afterEach`)
- [x] Synthèse enregistrée (`test-summary-story-7-1-e2e.md`)
