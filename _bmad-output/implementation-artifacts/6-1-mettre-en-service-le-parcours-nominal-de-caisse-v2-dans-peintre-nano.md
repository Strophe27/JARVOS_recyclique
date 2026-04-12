# Story 6.1 : Mettre en service le parcours nominal de caisse v2 dans Peintre_nano

Status: done

<!-- Note : validation optionnelle — `validate-create-story` avant `dev-story` si besoin. -->

## Story

En tant qu'opératrice de caisse,
je veux que le parcours nominal brownfield soit remis en service dans la caisse v2 (`Peintre_nano`),
afin que l'UI soit réellement exploitable au quotidien depuis l'entrée caisse jusqu'à la finalisation, sans que la forme « slices / pages » prime sur le workflow terrain.

## Baseline pilotage (non négociable)

- **Source de vérité statut** : `_bmad-output/implementation-artifacts/sprint-status.yaml` — story `6-1-…` : **`done`** après Story Runner (CS→VS→DS→gates→QA→CR) ; rebaseline **brownfield-first** appliquée côté UI `/caisse`.
- **Epic 6** : `in-progress` ; **ne pas** fermer **6.10** ni valider terrain avant parité brownfield (cf. correct course 2026-04-08).
- **Stories déjà `done` côté pilotage** (intégration obligatoire, pas réinvention isolée) : **6.2** (contexte / sécurité), **6.3** (ticket en attente), **6.4** (remboursement), **6.9** (défensif / fallbacks / sync différée). Le fichier story 6.1 doit **composer** avec ces garde-fous sans les casser.
- **Stories encore backlog / rewrite** (hors périmètre de livraison 6.1, mais ne pas les bloquer pour plus tard) : **6.5**, **6.6**, **6.7**, **6.8**, **6.10**. **Epic 8 / 9** : **non rouverts** — pas de logique comptable / Paheko / modules adhérents absorbée ici.

## Acceptance Criteria

1. **Entrée brownfield opératoire** — Étant donné que le flux caisse brownfield commence par un point d'entrée opératoire, quand `/caisse` est servi dans `Peintre_nano`, alors l'opératrice accède à un **dashboard caisse** lisible (poste, session, mode ; visibilité des variantes réel / virtuel / différé **à l'entrée** selon le mapping), puis à des accès **explicites** à l'ouverture de session et au **poste de vente** ; **`/caisse` n'est pas** un alias direct vers le seul wizard nominal isolé. La séquence reste fondée sur les règles métier portées par le backend. [Source : `epics.md` Story 6.1 ; `references/artefacts/2026-04-08_05_mapping-brownfield-v2-caisse-epic6.md`]

2. **Workspace de vente continu** — Étant donné que la caisse brownfield repose sur un grand écran de vente continu, quand l'opératrice travaille dans le poste caisse, alors elle retrouve dans **le même univers de travail** : en-tête session, indicateurs utiles (KPIs), saisie, ticket courant et finalisation ; pas de fragmentation en mini-pages qui casserait la lecture terrain. [Source : epics.md ; mapping § conclusion]

3. **Clavier et fluidité** — Étant donné que la caisse doit rester rapide et robuste (NFR fluidité), quand le parcours nominal est utilisé, alors l'interaction privilégie le clavier avec retour immédiat sur scan, saisie, validation et ticket courant. [Source : epics.md ; PRD §9.1]

4. **Enregistrement local honnête** — Étant donné que la nouvelle caisse ne doit pas dépendre de la fin de sync pour exister, quand le parcours nominal est complété, alors la vente peut être enregistrée localement dans `Recyclique`, et l'UI expose clairement l'issue locale **sans** prétendre que la sync comptable est déjà finalisée (cohérent avec **6.9**). [Source : epics.md Story 6.1]

5. **Mécanismes techniques subordonnés au workflow** — Étant donné que l'implémentation peut continuer à s'appuyer sur CREOS, widgets et `FlowRenderer`, quand le parcours nominal est remis en service, alors ces mécanismes restent **subordonnés** au workflow brownfield et non l'inverse ; au moins un widget **ticket courant** (ou équivalent nommé dans le manifest du slice) **expose** `data_contract.critical: true` ; le blocage UI sur **DATA_STALE** / données incohérentes **avant** paiement est démontré par test ; le backend **refuse** la mutation de paiement si le contexte ou les préconditions ne sont pas revalidés (alignement **6.2** + **6.9**). [Source : epics.md Story 6.1 ; PRD §10]

## Tasks / Subtasks

- [x] Recomposer `/caisse` comme **entrée brownfield opératoire** : dashboard (poste, session, mode ; entrées réel / virtuel / différé visibles selon permissions), accès explicites ouverture + poste de vente. (AC : 1)
- [x] Brancher et **valider** les garde-fous **6.2** sur ce parcours (contexte vérifié **avant** vente sensible) sans régression des flux **6.3 / 6.4** déjà livrés. (AC : 1, 5)
- [x] Recomposer le **workspace de vente continu** : header session, KPIs, saisie, ticket courant, finalisation dans un seul univers — `FlowRenderer` / onglets comme **implémentation**, pas comme produit cible. (AC : 2, 3)
- [x] Préserver la cohérence avec **6.9** : messages sync différée, fallbacks, états défensifs dans la nouvelle composition. (AC : 4, 5)
- [x] Reprendre / adapter les preuves automatisées et la preuve UI minimale pour la **nouvelle** baseline brownfield-first (régression interdite sur tests stale / backend revalidation). (AC : 3, 4, 5)
- [x] Ne pas traiter **6.10** comme close ; ne pas étendre le scope vers **Epic 8 / 9**. (Baseline pilotage)

## Dev Notes

### Cartographie produit vs technique (correct course)

- **Écart principal** : la v2 a surtout des slices par route / manifest ; le brownfield attend un **continuum** dashboard → ouverture → vente → finalisation. Voir tableau de mapping : `references/artefacts/2026-04-08_05_mapping-brownfield-v2-caisse-epic6.md`.
- Décision : `FlowRenderer` repasse **mécanisme** ; `/caisse` redevient **point d'entrée opératoire**, pas alias wizard seul.

### Pack contexte Epic 6 (garde-fous développeur)

- **Périmètre** : caisse v2 dans `Peintre_nano` ; **dépend des Epics 2–5** (auth, `ContextEnvelope`, shell transverse, bandeau, recomposition) — réutiliser, ne pas dupliquer.
- **Backend** : `recyclique/api` — autorité permissions, contexte, ventes, paiement, fraîcheur données sensibles.
- **Frontend** : `peintre-nano/` — runtime / rendu / flows déclaratifs uniquement ; **pas** de logique métier dupliquée côté UI.
- **Hiérarchie de vérité** : OpenAPI → `ContextEnvelope` → `NavigationManifest` → `PageManifest` → `UserRuntimePrefs`.
- **Checklist PR** : `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` ; gouvernance contrats : `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`.

### Exigences techniques (non négociables)

- Tout widget métier alimenté par des données : `data_contract.operation_id` résolu dans OpenAPI.
- Aucune mutation sensible sans revalidation backend.
- Types clients générés : corriger `contracts/` et régénérer, pas d'édition manuelle des générateurs pour « arranger » le contrat.
- Vocabulaire `DATA_STALE` / états widget : PRD §10, schémas CREOS.

### Conformité architecture

- Stack UI : React, TypeScript, Vite ; CSS Grid ; Mantine v8 via adaptation ; tokens CSS — ADR P1, `core-architectural-decisions.md`.
- Structure : `project-structure-boundaries.md` — `contracts/`, `peintre-nano/src/domains/cashflow/`, `recyclique/api/`.

### Fichiers et zones probables

- `peintre-nano/src/domains/cashflow/` — workspace caisse, widgets ticket, wizards.
- `peintre-nano/src/flows/` — `FlowRenderer`.
- `peintre-nano/src/registry/`, widgets, slots.
- `contracts/openapi/recyclique-api.yaml` + générés ; `contracts/creos/manifests/` (navigation, pages cashflow).
- `recyclique/api/...` — ventes, sessions, autorisations.

### Tests

- Patterns API existants : ex. `recyclique/api/tests/...`, tests cash session / ventes.
- Front : tests composant / intégration blocage paiement si `DATA_STALE` sur widget critique (conventions Epics 3–5).

### Continuité avec les stories 6.x (alignement sprint-status)

- **6.2, 6.3, 6.4, 6.9** sont **déjà livrées** au sens pilotage : la rewrite **6.1** doit **réintégrer** le parcours brownfield **sans** invalider ces capacités (régression = échec).
- **6.5 à 6.8, 6.10** : pas d'exigence de les « terminer » dans 6.1 ; éviter les dead-ends qui empêcheraient leur **rebranchement** ultérieur dans le même workspace (cf. mapping : variantes du poste, pas collection de pages autonomes).
- **6.10** : la validation terrain reste **ouverte** jusqu'à parité brownfield ; ne pas la traiter comme gate de clôture de cette story.

### Matière technique déjà présente en dépôt (réemploi)

Une implémentation **pré-rebaseline** (slices, manifests `page-cashflow-nominal`, wizard nominal, widget ticket `critical`, tests stale / revalidation opérateur) peut servir de **matériau** à recomposer — **ce n'est pas** la Definition of Done produit tant que le dashboard + workspace continu ne sont pas conformes au mapping brownfield.

### Recherche « dernière version »

- Confirmer les pins réels dans `peintre-nano/package.json` (Mantine, Zustand, etc.) avant d'ajouter des dépendances.

## Références

- `_bmad-output/planning-artifacts/epics.md` — Epic 6, Story 6.1
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-08-epic-6-brownfield-first-correct-course.md`
- `references/artefacts/2026-04-08_05_mapping-brownfield-v2-caisse-epic6.md`
- `_bmad-output/planning-artifacts/prd.md` — §9.1 Cashflow, §10 états widget / `DATA_STALE`
- `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`
- `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`
- `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`
- `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`
- `references/peintre/2026-04-01_instruction-cursor-contrats-donnees.md`
- `contracts/openapi/recyclique-api.yaml`
- `contracts/creos/schemas/widget-declaration.schema.json`, `widget-data-states.schema.json`

### project-context.md

- Aucun `project-context.md` à la racine du dépôt repéré ; s'appuyer sur les documents ci-dessus et les stories d'implémentation des Epics 3–5 dans `_bmad-output/implementation-artifacts/` pour les patterns concrets.

## Dev Agent Record

### Agent Model Used

Story Runner BMAD (orchestration parent + DS local + sous-agents Task CS/VS/QA/CR ; 2026-04-08).

### Debug Log References

- Gates : `npm run lint` / `npm run build` / `npm run test` dans `peintre-nano` — **PASS** (55 fichiers, 281 tests).

### Completion Notes List

- **Entrée brownfield** : widget `caisse-brownfield-dashboard` (slot `header` CREOS) — poste / session / site depuis `ContextEnvelope`, badges réel/virtuel/différé selon permissions (`caisse.access`, `caisse.virtual.access`, `caisse.deferred.access`), aide ouverture session, CTA scroll vers workspace vente.
- **Workspace continu** : `id="caisse-sale-workspace"` sur le wizard nominal ; ticket + `FlowRenderer` inchangés fonctionnellement ; strip KPI `caisse-kpi-strip`.
- Manifests : `page-cashflow-nominal.json`, `widgets-catalog-cashflow-nominal.json` ; pas de nouvelle route — `/caisse` reste l'entrée unique du slice nominal.

### File List

- `peintre-nano/src/domains/cashflow/CaisseBrownfieldDashboardWidget.tsx`
- `peintre-nano/src/domains/cashflow/CaisseBrownfieldDashboardWidget.module.css`
- `peintre-nano/src/domains/cashflow/CashflowNominalWizard.tsx`
- `peintre-nano/src/registry/register-cashflow-widgets.ts`
- `peintre-nano/tests/e2e/cashflow-nominal-6-1.e2e.test.tsx`
- `peintre-nano/tests/unit/widget-registry.test.ts`
- `contracts/creos/manifests/page-cashflow-nominal.json`
- `contracts/creos/manifests/widgets-catalog-cashflow-nominal.json`
- `_bmad-output/implementation-artifacts/tests/test-summary-story-6-1-e2e.md`

---

## Story completion status

- **create-story (2026-04-08)** : contexte consolidé depuis epics, PRD, architecture, correct course, `sprint-status.yaml`, mapping brownfield ; contradictions « ne pas anticiper 6.2–6.10 » / statuts stories **corrigées** ; statut fichier **ready-for-dev**.
- **Story Runner (2026-04-08)** : CS → VS → DS → gates → QA → CR **PASS** ; story **done** ; entrée `/caisse` alignée brownfield-first (dashboard + workspace continu).
