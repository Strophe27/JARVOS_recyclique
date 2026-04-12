# Résumé QA — tests automatisés (Story 17.3)

**Story :** `17-3-consolider-les-briques-mutualisees-de-shell-liste-admin-guards-et-detail-simple`  
**Date (session) :** 2026-04-12  
**Skill :** `bmad-qa-generate-e2e-tests`

## Tests générés / étendus

### Tests API

- Non applicable (rail U, consolidation UI ; pas de nouveaux endpoints à valider en isolation).

### Tests unitaires (Vitest + Testing Library, `jsdom`)

- [x] `peintre-nano/tests/unit/admin-list-page-shell-17-3.test.tsx` — `AdminListPageShell` : `data-testid` **`admin-list-page-shell`**, racine widget, bandeau **`admin-detail-simple-demo-strip`** ; masquage du bandeau si `showDetailSimpleDemoStrip={false}` (AC 4, 8–9, 13).

### Tests E2E (Vitest + Testing Library, `jsdom`)

- [x] `peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx` — **Renfort story 17.3** : sur **`/admin/pending`**, **`/admin/cash-registers`**, **`/admin/sites`** (clic + URL profonde), assertion explicite de **`admin-list-page-shell`** sur les trois parcours ; sur pending / cash-registers / sites (parcours clic), assertion de **`admin-detail-simple-demo-strip`** là où le shell l’affiche par défaut (AC 4, 5, 13).

### Tests contrat CREOS

- [x] `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts` — bloc existant « Stories 17.1–17.3 » : slots homogènes `admin.transverse-list.*`, guards alignés sur `ADMIN_TRANSVERSE_LIST_PAGE_MANIFEST_GUARDS`, trois `page_key` / widgets démo (AC 6, 10, 11).

## Couverture (AC testables en automatisé UI / contrat)

| AC (extrait) | Couverture |
|--------------|------------|
| AC 4 — primitive shell consommée par pending, cash-registers, sites | Oui (e2e : `admin-list-page-shell` + unit shell) |
| AC 5 — routage `/admin/pending`, `/admin/cash-registers`, `/admin/sites` | Oui (e2e existants + renfort testids) |
| AC 6–7 — guards manifeste (`transverse.admin.view`, masquage nav) | Oui (e2e + contract) |
| AC 8–9 — détail simple démo sans fetch | Oui (unit + e2e `admin-detail-simple-demo-strip` sur les trois slices liste) |
| AC 10–11 — manifests / widget_types stables | Oui (contract) |
| AC 12 — matrice / cartographie | Hors périmètre exécution tests (preuve doc / artefacts ; non régressé par la suite) |
| AC 13 — tests verts + primitive ciblée | Oui |

## Gates exécutés (spawn QA)

- `npm run test` (`peintre-nano`, Vitest `run`) — **OK** — **411** tests (2026-04-12).

## Prochaines étapes

- Enchaîner **bmad-code-review** côté parent si prévu.
- Après publication OpenAPI / Epic 16, ajouter des parcours avec `data_contract` réel (hors rail U actuel).

## Checklist skill (`checklist.md`)

- [x] E2E / UI : étendus (pas d’API dédiée)
- [x] Framework standard du dépôt (Vitest)
- [x] Happy path + cas critique permission / site (déjà couverts dans le même fichier e2e)
- [x] Tous les tests passent après modification
- [x] Locateurs : `data-testid` stables documentés pour non-régression shell
- [x] Résumé présent (ce fichier)
