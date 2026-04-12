# Synthèse automatisation des tests — Story 11.2 (dashboard standard observable, `/dashboard` CREOS, bandeau sandbox en live auth)

**Périmètre** : Peintre-nano — alignement route canon `/dashboard` (CREOS transverse-dashboard) vs accueil legacy `/`, bandeau « bac à sable » masqué lorsque `VITE_LIVE_AUTH` est actif.

**Date (gate QA)** : 2026-04-10

## Décision : pas de nouveaux fichiers e2e

Les parcours utilisateur « bout en bout » au sens du dépôt (Vitest + Testing Library + `App` / shell, dossier `peintre-nano/tests/e2e/`) couvrent déjà le dashboard transverse et l'URL `/dashboard`. Les comportements spécifiques 11.2 dépendant d'auth live ou de variables d'environnement Vite sont correctement vérifiés au niveau **unitaire** (mocks réseau, `vi.stubEnv`).

## Tests existants validés (couverture slice 11.2)

### E2E / intégration UI (`peintre-nano/tests/e2e/`)

- [x] `navigation-transverse-5-1.e2e.test.tsx` — clic nav → `/dashboard`, titre « Dashboard transverse — synthèse », synchro `aria-current` depuis URL profonde `/dashboard`, allers-retours accueil `/` ↔ dashboard (legacy vs CREOS).

### Tests unitaires (`peintre-nano/tests/unit/`)

- [x] `live-auth-shell-11-2.test.tsx` — après login simulé, `window.location.pathname` est `/dashboard` (canon CREOS).
- [x] `runtime-demo-live-auth-11-2.test.tsx` — avec `VITE_LIVE_AUTH`, absence du texte « Démonstration runtime (bac à sable) » et présence du h2 dashboard.

## Exécution

```bash
cd peintre-nano
npm run test
```

## Checklist (`bmad-qa-generate-e2e-tests` / `checklist.md`)

- [ ] Tests API (N/A — slice front)
- [x] E2E / intégration UI : slice dashboard + URL déjà couverts ; pas de doublon requis pour 11.2
- [x] Happy path + comportements critiques (redirection login, masquage bandeau) couverts
- [x] Locators sémantiques / rôles dans les tests existants
- [x] Synthèse enregistrée

## Fichiers modifiés (cette passe QA)

- `_bmad-output/implementation-artifacts/tests/test-summary-story-11-2-e2e.md` (ce fichier)
