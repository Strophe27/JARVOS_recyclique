# Story 6.6 — synthèse tests (preuve sprint)

## Automatisés

- **API** : `recyclique/api/tests/test_social_encaissement_story66_integration.py` — happy path **pour chaque valeur** `SocialActionKind` (lot 1), variante `DON_LIBRE` + note ; refus montant ≤ 0, items non vides, permission manquante, exclusivité `special_encaissement_kind` / `social_action_kind`.
- **Peintre-nano** :
  - `peintre-nano/tests/unit/cashflow-social-gate-6-6.test.tsx` — garde enveloppe `caisse.social_encaissement`.
  - `peintre-nano/tests/e2e/cashflow-social-6-6.e2e.test.tsx` — navigation « Don » → `/caisse/don`, masquage sans permission, corps POST avec `social_action_kind`.
  - `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts` — entrée nav + `resolvePageAccess` page `cashflow-social-don`.

## Manuel (URL locale)

1. Démarrer l'app servie avec enveloppe contenant `caisse.access` et **`caisse.social_encaissement`**.
2. Ouvrir **Don** dans la nav → `/caisse/don`.
3. Choisir un type dans la liste figée (lot 1), montant **> 0**, enregistrer → vente créée avec `social_action_kind` renvoyé par l'API.
4. Vérifier que sans `caisse.social_encaissement`, l'entrée **Don** (social) n'apparaît pas et la page est refusée si accédée directement.

## Captures (optionnel)

Convention projet : `_bmad-output/implementation-artifacts/screenshots/caisse/` avec préfixe `11-0__` si campagne capture dédiée.
