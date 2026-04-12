# Synthèse automatisation des tests — Story 13.6 (certification équivalence caisse, chrome démo)

**Périmètre** : Peintre_nano — chemin certifié `cashflow-nominal` (hub `/caisse`, adjacents, kiosque `/cash-register/sale`, etc.) : masquage du bruit technique démo (bac à sable, bandeau versions manifests, toolbar prefs) hors `VITE_LIVE_AUTH`, aligné `guide-pilotage-v2.md` / AC5.

**Date (gate QA)** : 2026-04-12

## Couverture vs AC story 13.6

| AC | Automatisable | Couverture |
|----|---------------|------------|
| 1 Cadre epics / checklist | Doc story | HITL / spec |
| 2 Certification transversale | MCP + relecture | Preuves déposées (artefact) — pas remplacé par tests |
| 3 Shell vente dédié | Partiel | `tests/e2e/cash-register-hub-open-to-sale-13-6.e2e.test.tsx` (parcours + **reload** `/cash-register/sale`), `cash-register-hub-to-sale-rcn-02-13-5.e2e.test.tsx`, unit 11.3 / 13.5 |
| 4 Densité / vide trompeur | Faible | Matrice + MCP |
| 5 Bruit technique | **Oui** | **Unit** `runtime-demo-cashflow-certification-chrome-13-6.test.tsx` (`/caisse`, session open, **`/cash-register/sale`**) ; e2e hub 13.4 sur `/caisse` (fonctionnel, pas les trois assert bruit) |
| 6 Preuve comparative | MCP | `user-chrome-devtools` / HITL si indispo |
| 7 Matrice | Doc | HITL |
| 8 Hiérarchie contrats | Revue + tests existants CREOS | Pas de fichier e2e dédié 13.6 |
| 9 Gates | CI / local | `npm run lint`, `build`, `test` |

**Écarts comblés** : (1) unit **13.6** — AC5 kiosque (`manifest-bundle-ok`, `runtime-prefs-toolbar`, bac à sable). (2) e2e **13.6** — tronçon hub → ouverture → vente + **reload** sur `/cash-register/sale` sans chrome hub parasite (aligné commentaire `RuntimeDemoApp` / `sale_kiosk_minimal_dashboard`).

## Tests générés / mis à jour

### Tests unitaires d'intégration (`peintre-nano/tests/unit/`)

- [x] `runtime-demo-cashflow-certification-chrome-13-6.test.tsx` — `/caisse` ; `/cash-register/session/open` (assert toolbar alignée) ; **`/cash-register/sale`** (masquage bruit + kiosque).

### E2E (`peintre-nano/tests/e2e/`)

- [x] `cash-register-hub-open-to-sale-13-6.e2e.test.tsx` — hub `/caisse` → **Ouvrir** → fond → `/cash-register/session/open` → POST → `/cash-register/sale` ; puis **simulation reload** (`cleanup` + second `render` sur URL inchangée, GET `/v1/cash-sessions/current` = session ouverte) : kiosque, pas de `shell-zone-nav`, pas de titre hub « Sélection du Poste », pas de ligne postes legacy, pas de formulaire d'ouverture, wizard nominal présent.
- [x] Socle 13.x inchangé : RCN-01 (`cash-register-hub-rcn-01-13-4.e2e.test.tsx`), RCN-02, variants 13.2, session 13.1/13.3.

## Exécution

```bash
cd peintre-nano
npx vitest run tests/unit/runtime-demo-cashflow-certification-chrome-13-6.test.tsx tests/e2e/cash-register-hub-open-to-sale-13-6.e2e.test.tsx
```

## Checklist (`bmad-qa-generate-e2e-tests` / `checklist.md`)

- [ ] Tests API (N/A — slice UI certification chrome)
- [x] E2E UI : socle caisse déjà couvert ; pas de doublon massif pour 13.6
- [x] Happy path + invariant critique (AC5) sur routes clés
- [x] `data-testid` cohérent avec le runtime existant
- [x] Synthèse enregistrée (ce fichier)

## Fichiers modifiés (cette passe QA)

- `peintre-nano/tests/e2e/cash-register-hub-open-to-sale-13-6.e2e.test.tsx` — GET courant bascule après POST ; bloc reload F5 simulé.
- `_bmad-output/implementation-artifacts/tests/test-summary-story-13-6-e2e.md` (ce fichier)
