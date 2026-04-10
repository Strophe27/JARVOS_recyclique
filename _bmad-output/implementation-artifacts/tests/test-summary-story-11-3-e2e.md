# Synthèse automatisation des tests — Story 11.3 (alias `/cash-register/sale`, kiosque vente observable)

**Périmètre** : Peintre_nano — alias runtime vers `page_key` `cashflow-nominal`, présentation kiosque (nav masquée, marqueur shell), sans second manifeste CREOS ni duplication du parcours métier caisse.

**Date (gate QA)** : 2026-04-10

## Décision : pas de nouveaux fichiers dans `tests/e2e/`

Le slice 11.3 est volontairement **UI observable / shell + résolution de page** : les assertions requises (marqueur `cash-register-sale-kiosk`, absence zone nav, absence bandeau bac à sable sur l’alias, rendu `flow-renderer-cashflow-nominal`, contraste avec `/caisse`) sont déjà couvertes par des tests **d’intégration RTL** ciblés. Ajouter un fichier `*.e2e.test.tsx` dupliquerait le même montage (`RuntimeDemoApp` / `RootProviders`) que le test unitaire dédié, sans parcours utilisateur supplémentaire (clics, vente, API) — ceux-ci restent sur le hub `/caisse` (`cashflow-nominal-6-1.e2e.test.tsx`, etc.), conformément au périmètre story.

## Tests existants validés (couverture slice 11.3)

### Intégration UI (`peintre-nano/tests/unit/`)

- [x] `runtime-demo-cash-register-sale-kiosk-11-3.test.tsx` — `/cash-register/sale` → kiosque + `cashflow-nominal` ; `/caisse` → nav présente, pas de kiosque.
- [x] `root-shell.test.tsx` — `hideNav` / marqueur `cash-register-sale-kiosk` sur le shell.

### E2E caisse nominal (référence parité métier, autre route)

- [x] `tests/e2e/cashflow-nominal-6-1.e2e.test.tsx` — parcours vente sur `/caisse` (hors scope dupliquer sur l’alias 11.3).

## Exécution

```bash
cd peintre-nano
npx vitest run tests/unit/runtime-demo-cash-register-sale-kiosk-11-3.test.tsx tests/unit/root-shell.test.tsx
```

## Checklist (`bmad-qa-generate-e2e-tests` / `checklist.md`)

- [ ] Tests API (N/A — slice front shell / routage)
- [x] E2E UI : parcours caisse complet déjà couvert sur `/caisse` ; slice 11.3 couvert par tests d’intégration dédiés — pas de doublon `e2e/` requis
- [x] Happy path observable (alias → même CREOS + kiosque) + contraste `/caisse`
- [x] `data-testid` / structure shell cohérente avec les tests existants
- [x] Synthèse enregistrée

## Revérification Task Story Runner (2026-04-10)

- **Décision maintenue** : pas de fichier `tests/e2e/` dédié à l’alias 11.3 ; le domaine cashflow ne branche pas sur `pathname === '/caisse'`, et `App` délègue à `RuntimeDemoApp` (même pile que les tests d’intégration).
- **`npm run test` (suite complète peintre-nano)** : échec sur **5 tests** (timeouts 5000 ms) dans `cashflow-nominal-6-1`, `cashflow-held-6-3`, `cashflow-defensive-6-9`, `reception-context-gate-7-2` — **hors périmètre story 11.3** ; les tests 11.3 ont bien passé au sein de cette même exécution.
- **Cible périmètre 11.3** (vert) :

```bash
cd peintre-nano
npx vitest run tests/unit/runtime-demo-cash-register-sale-kiosk-11-3.test.tsx tests/unit/root-shell.test.tsx
```

## Fichiers modifiés (cette passe QA)

- `_bmad-output/implementation-artifacts/tests/test-summary-story-11-3-e2e.md` (ce fichier)

## Suite Story Runner (post-QA)

- Normalisation `pathname` : `/cash-register/sale/` (slash final) traité comme l’alias kiosque (`RuntimeDemoApp` + test unitaire dédié).
