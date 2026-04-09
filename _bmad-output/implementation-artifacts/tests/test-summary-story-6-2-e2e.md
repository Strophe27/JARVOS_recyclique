# Synthèse automatisation des tests — Story 6.2 (contexte caisse, blocages sécurité)

## Story

`6-2-garantir-le-contexte-caisse-et-les-blocages-de-securite-metier`

## Tests générés ou étendus

### Tests E2E (Vitest + Testing Library + jsdom)

- [x] `peintre-nano/tests/e2e/cashflow-context-gate-6-2.e2e.test.tsx`
  - `/caisse` avec enveloppe **forbidden** → `page-access-blocked`, code `FORBIDDEN` (shell `resolvePageAccess`).
  - `/caisse` avec enveloppe **degraded** → `DEGRADED_CONTEXT`, pas de `FlowRenderer` caisse.
  - `siteId: null` → `MISSING_SITE` (manifest `requires_site`).
  - `siteId` uniquement espaces → shell et nav OK (marqueur `site` présent), **garde wizard** `cashflow-context-blocked` + titre « Site actif non résolu ».
  - Enveloppe **périmée** (`issuedAt` ancien + `maxAgeMs`) → `STALE_CONTEXT`.

### Tests API (pytest — existants, non modifiés par cette passe QA)

- [x] `recyclique/api/tests/test_sale_service_story62_context.py` — exécutés, verts.
- [x] `recyclique/api/tests/caisse_sale_eligibility.py` — exécutés, verts.

### Tests unitaires front (déjà livrés DS)

- [x] `peintre-nano/tests/unit/cashflow-context-gate-6-2.test.tsx` — forbidden + permission manquante sur `CashflowNominalWizard` isolé.

## Couverture (indicatif)

- Chaîne **App** + `RuntimeDemoApp` : blocages alignés sur `resolve-page-access` et, pour le cas site blanc, sur la garde **wizard** Story 6.2.
- Backend : éligibilité vente / contexte opérateur déjà couverte par pytest 6.2.

## Preuve UI servie (`http://127.0.0.1:4444`)

- **Faite (agent)** : HTTP 200 sur la racine ; navigation DevTools vers `/caisse` ; snapshot accessibilité confirme le wizard nominal (onglets Lignes / Total / Paiement / Ticket) et le libellé nav « Caisse (v2 nominal) ».
- Les scénarios **bloqués** (forbidden, permission absente, etc.) sur stack réelle restent **vérif terrain / HITL** si l’enveloppe démo par défaut ne les expose pas sans manipulation dédiée (déjà noté dans la story DS).

## Exécution

```bash
cd peintre-nano && npm run test -- tests/e2e/cashflow-context-gate-6-2.e2e.test.tsx
cd peintre-nano && npm run test -- tests/e2e/
cd recyclique/api && python -m pytest tests/test_sale_service_story62_context.py tests/caisse_sale_eligibility.py
```

## Prochaines étapes

- Garder ces chemins dans la CI `peintre-nano` + `recyclique/api` si pas déjà agrégés.
- Playwright ou smoke navigateur réel pour CORS / session réelle si le périmètre Epic 10 l’exige.

## Checklist skill `bmad-qa-generate-e2e-tests`

- [x] Tests E2E générés (UI)
- [x] Couverture happy path implicite via 6.1 ; erreurs / blocages critiques 6.2 ajoutés
- [x] Tests exécutés avec succès
- [x] Locators sémantiques / `data-testid` alignés produit
- [x] Synthèse enregistrée sous ce fichier
