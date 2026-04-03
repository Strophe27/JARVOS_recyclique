# Synthèse — tests automatisés (QA E2E)

**Story 1.1 (doc-only, Piste B) :** pas de tests packagés ; synthèse QA équivalente → [`1-1-surface-travail-v2-doc-qa-summary.md`](./1-1-surface-travail-v2-doc-qa-summary.md) (**PASS** 2026-04-02, skill `bmad-qa-generate-e2e-tests`).

**Story 1.2 (doc-only, audit brownfield) :** pas de tests API/E2E applicables ; synthèse QA documentaire → [`1-2-audit-brownfield-doc-qa-summary.md`](./1-2-audit-brownfield-doc-qa-summary.md) (**PASS** 2026-04-02, `gates_skipped_with_hitl: true` ; preuve = checklist revue + grille AC ↔ sections du rapport).

**Story 1.3 (doc-only, spec multi-contextes / autorisation v2) :** pas de tests API/E2E applicables au livrable markdown ; synthèse QA documentaire → [`1-3-spec-multi-contextes-doc-qa-summary.md`](./1-3-spec-multi-contextes-doc-qa-summary.md) (**PASS** 2026-04-02, `gates_skipped_with_hitl: true` ; preuve = grille AC ↔ §2–§8 + table de traçabilité en tête du spec).

**Story 1.4 (contrats + gouvernance OpenAPI / CREOS / ContextEnvelope) :** pas d’E2E produit ni d’API exécutable dans le périmètre ; synthèse QA + **tests contrat** (parse YAML / JSON repo) → [`1-4-gouvernance-contractuelle-doc-qa-summary.md`](./1-4-gouvernance-contractuelle-doc-qa-summary.md) (**PASS** 2026-04-02, `gates_skipped_with_hitl: true` ; preuve = grille AC ↔ artefact + 4 tests Vitest sous `peintre-nano/tests/contract/`).

**Story 1.5 (contrat minimal sync / réconciliation Paheko, doc-only) :** pas d’E2E ni d’API métier ; synthèse QA **N/A doc-only** + **checks** reproductibles → [`1-5-contrat-sync-paheko-doc-qa-summary.md`](./1-5-contrat-sync-paheko-doc-qa-summary.md) (**PASS** 2026-04-02, `gates_skipped_with_hitl: true` ; preuve = grille AC ↔ artefact + 4 tests Vitest `contrat-sync-paheko-1-5-artefact.test.ts` ; OpenAPI `correlation_id` non exigé tant que schémas d’erreur absents).

**Story 1.6 (matrice intégration Paheko + gaps API, doc-only) :** pas d’E2E ni d’API métier ; synthèse QA **N/A doc-only** + **checks** reproductibles → [`1-6-matrice-paheko-doc-qa-summary.md`](./1-6-matrice-paheko-doc-qa-summary.md) (**PASS** 2026-04-02, `gates_skipped_with_hitl: true` ; preuve = grille AC ↔ artefact + 7 tests Vitest `matrice-paheko-1-6-artefact.test.ts` ; HITL = validation métier matrice / gaps).

**Story 1.7 (signaux exploitation bandeau live / premiers slices, doc-only + brouillon OpenAPI) :** pas d’E2E produit ; synthèse QA **N/A doc-only** + **checks** reproductibles → [`1-7-signaux-exploitation-doc-qa-summary.md`](./1-7-signaux-exploitation-doc-qa-summary.md) (**PASS** 2026-04-02, `gates_skipped_with_hitl: true` ; preuve = grille AC ↔ artefact `2026-04-02_07_*.md` §1 bis v1 / **6** tests Vitest `signaux-exploitation-bandeau-1-7-artefact.test.ts` + **9** tests `recyclique-openapi-governance.test.ts` dont schémas Story 1.7, `daily_kpis_aggregate`, **503** `live-snapshot`) ; HITL = périmètre v1 KPIs globaux 1.4.4, F1–F6 enrichissements, cas limites, effectivité caisse si exposée.

**Stories documentées :** 3.1–3.3 (shell, manifests, widgets), 3.4 (auth / enveloppe), 3.5 (`UserRuntimePrefs`), **3.6** (fallbacks / rejets runtime visibles, `reportRuntimeFallback`, `data-runtime-*`), **3.7** (page démo runtime composé, `RuntimeDemoApp`, pipeline manifest + registre + enveloppe).  
**Dernier passage QA e2e / contrat :** stories **1.4**–**1.7** (contrat / artefacts doc) + **3.7** (e2e jsdom) — 2026-04-02.  
**Package :** `peintre-nano/`  
**Commande de vérification :** `npm run test` (racine du package)

## Tests générés ou étendus

### Tests API

- Non applicable (pas d’API HTTP dédiée dans le périmètre actuel).

### Tests contrat (Vitest, environnement node)

| Fichier | Rôle |
|--------|------|
| `peintre-nano/tests/contract/recyclique-openapi-governance.test.ts` | Stories **1.4** / **1.7** : `recyclique-api.yaml` (OpenAPI 3.1, `recyclique_contractGovernance_ping`, `recyclique_exploitation_getLiveSnapshot`, réponse **503** `live-snapshot`, schémas `SyncStateCore` / `ExploitationLiveSnapshot` / `ExploitationContextIds`, unicité `operationId`) ; schéma CREOS `widget-declaration` (`data_contract.operation_id`). |
| `peintre-nano/tests/contract/contrat-sync-paheko-1-5-artefact.test.ts` | Story **1.5** : artéfact pivot sync/réconciliation (traçabilité AC, cycle de vie, outbox, corrélation, FR23/FR25, AR39, renvoi 1.6, HITL). |
| `peintre-nano/tests/contract/matrice-paheko-1-6-artefact.test.ts` | Story **1.6** : matrice Paheko + gaps (traçabilité AC, §2 classifications, §4, §5 FR5/FR40/AR9, rationales plugin, références preuves). |
| `peintre-nano/tests/contract/signaux-exploitation-bandeau-1-7-artefact.test.ts` | Story **1.7** : artefact signaux F1–F6, §1 bis v1 KPIs / 1.4.4, cas limites, FR24, Epic 4 / 2.7, HITL. |

### Tests E2E (Vitest + Testing Library + jsdom)

| Fichier | Rôle |
|--------|------|
| `peintre-nano/tests/e2e/app-shell.e2e.test.tsx` | Story 3.1 : shell, zones, titre. |
| `peintre-nano/tests/e2e/manifest-bundle.e2e.test.tsx` | Stories 3.2 / **3.6** : lot valide ; rejets **blocked** (collision `route_key`, `NAV_PAGE_LINK_UNRESOLVED`, `UNKNOWN_WIDGET_TYPE` dans l’allowlist bundle) → `ManifestErrorBanner`, `data-runtime-severity="blocked"`, espion `reportRuntimeFallback` (`state: manifest_bundle_invalid`). |
| `peintre-nano/tests/e2e/widget-declarative-rendering.e2e.test.tsx` | Stories 3.3 / **3.6** : widgets démo ; slot non mappé ; **widget inconnu au rendu** → `widget-resolve-error`, `data-runtime-severity="degraded"`, espion `reportRuntimeFallback` (`state: widget_resolve_failed`). |
| `peintre-nano/tests/e2e/auth-context-envelope.e2e.test.tsx` | Stories 3.4 / **3.6** : nominal + blocages ; contexte périmé → `reportRuntimeFallback` + `data-runtime-severity` sur `page-access-blocked`. |
| `peintre-nano/tests/e2e/user-runtime-prefs.e2e.test.tsx` | Story 3.5 : densité UI sans révéler la nav admin. |
| `peintre-nano/tests/e2e/runtime-demo-compose.e2e.test.tsx` | Story **3.7** : chemin nominal (`runtime-demo-root`, widget manifest) ; fallback widget non enregistré (`widget-resolve-error`, `reportRuntimeFallback`) ; fallback garde page (`page-access-blocked`, `reportRuntimeFallback`). |

### Tests unitaires (story 3.6)

| Fichier | Rôle |
|--------|------|
| `peintre-nano/tests/unit/runtime-rejection-reporting.test.tsx` | `loadManifestBundle` rejeté, widget inconnu (`PageRenderer`), `PageAccessBlocked` → UI + `reportRuntimeFallback`. |

## Couverture (indicatif)

- **Rejets manifest (bundle) :** e2e + unitaires — visibilité UI, sévérité **blocked**, reporting structuré.
- **Widget inconnu (zone dégradée) :** e2e + unitaires — **degraded**, pas d’écran vide sans signal.
- **Accès page / enveloppe :** e2e auth + unitaires `resolve-page-access`, etc.
- **Auth / ContextEnvelope :** chemins nominal et refus (voir tableau ci-dessus).
- **Démo runtime composé (3.7) :** e2e dédié — bac à sable + deux fallbacks visibles avec espion `reportRuntimeFallback` (aligné AC story).

## Résultat d’exécution

- `npm run test` dans `peintre-nano/` : **vérification ciblée Story 1.7** — `vitest run tests/contract/signaux-exploitation-bandeau-1-7-artefact.test.ts tests/contract/recyclique-openapi-governance.test.ts` → **15** tests **PASS** (§1 bis artefact, `daily_kpis_aggregate` OpenAPI) — 2026-04-02. *(Suite complète 23 fichiers : d’autres tests contract peuvent échouer si un artefact tiers a dérivé.)*

## Suite possible

- Brancher CI sur `peintre-nano` si ce n’est pas déjà fait.
- Playwright / navigateur réel : hors périmètre actuel (jsdom + Testing Library).
