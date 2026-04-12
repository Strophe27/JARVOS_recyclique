# Story 6.8 — synthèse tests (preuve sprint)

## Ancrage parcours admin (contrôle QA — AC2 / DoD)

Le fichier e2e **ne couvre pas** le parcours nominal caisse `/caisse/correction-ticket` : **6 / 7** scénarios partent de **`/admin/cash-sessions/:id`** (journal + bouton « Corriger » par ligne). Le **7ᵉ** scénario vérifie explicitement qu'un **deep-link** `/caisse/correction-ticket` **ne** montre **pas** le wizard (régression nav / pas d'entrée transverse correction caisse).

| # | Intitulé (Vitest) | Route initiale | Locus UX |
|---|-------------------|----------------|----------|
| 1 | Sans `caisse.sale_correct` | `/admin/cash-sessions/:id` | Détail session admin, pas de bouton Corriger |
| 2 | Deep-link legacy caisse | `/caisse/correction-ticket` | Accueil démo, **pas** de wizard |
| 3 | Happy path + PIN | `/admin/cash-sessions/:id` | Modal wizard verrouillé sur la vente |
| 4 | Refus sans PIN | `/admin/cash-sessions/:id` | Message PIN step-up |
| 5 | Vente `held` | `/admin/cash-sessions/:id` | Pas de Corriger sur la ligne |
| 6 | `finalize_fields` + `X-Step-Up-Pin` | `/admin/cash-sessions/:id` | PATCH whitelist mocké |
| 7 | Liste fermée client (delta vide) | `/admin/cash-sessions/:id` | Erreur « Au moins un champ… » |

**Couverture e2e (indicatif)** : parcours UI correction sensible **admin** = **6** scénarios ; garde-fou **non-nominal caisse** = **1** scénario.

## Automatisés

- **Peintre-nano — e2e** : `peintre-nano/tests/e2e/cashflow-sale-correction-6-8.e2e.test.tsx`
  - **Journal admin** `/admin/cash-sessions/:id` : sans `caisse.sale_correct` → détail session + tableau, **pas** de bouton « Corriger », message `admin-cash-session-no-correct-perm`.
  - **Legacy** : deep-link `/caisse/correction-ticket` → page d'accueil démo (plus d'entrée nav correction caisse), **pas** de wizard.
  - Happy path admin : GET détail session → « Corriger » → wizard (lock sale) → `sale_date` + PATCH `/v1/sales/{id}/corrections` + succès.
  - **Gate step-up** : soumission sans PIN → message explicite « PIN step-up ».
  - **Cycle de vie** : vente `held` dans le journal → pas de bouton Corriger sur la ligne.
  - **Champs autorisés** : branche `finalize_fields` → corps `kind` + `total_amount` + en-tête **`X-Step-Up-Pin`** sur le PATCH mocké.
  - **Liste fermée client** : `finalize_fields` sans aucun delta → message « Au moins un champ de finalisation ».

- **Contrats** : `navigation-transverse-served-5-1.test.ts` (pas de path `/caisse/correction-ticket`, page `admin-cash-session-detail` dans le bundle) ; `recyclique-openapi-governance.test.ts` (`recyclique_cashSessions_getSessionDetail`).

## Vérification exécution

- **2026-04-08 (worker QA bmad-qa-generate-e2e-tests)** : `npm run test -- --run tests/e2e/cashflow-sale-correction-6-8.e2e.test.tsx` dans `peintre-nano` — **PASS** (**7** tests, ~1,5 s).
- **Réf. sprint antérieure** : suite complète `npm run test` — **PASS** (56 fichiers, **284** tests Vitest), dont ce fichier (7 tests).

## Checklist skill `bmad-qa-generate-e2e-tests` (extrait)

- [x] E2E générés / présents (UI)
- [x] Happy path + erreurs critiques (PIN, permission, delta vide, `held`)
- [x] Exécution projet : tous les tests du fichier **PASS**
- [x] Synthèse mise à jour (`test-summary-story-6-8-e2e.md`)

## Preuve UI servie (`ui_proof_url`)

- **NEEDS_HITL (UI non vérifiable automatiquement ici)** : validation manuelle sur stack locale si besoin.
- **Action humaine** : avec Peintre servi, ouvrir `/admin/cash-sessions/<uuid-session>` (compte admin + enveloppe avec `caisse.sale_correct`) et valider journal + modal correction.

## Prochaine étape (Story Runner)

- **CR** : revue de code sur détail session admin + wizard + contrats.
