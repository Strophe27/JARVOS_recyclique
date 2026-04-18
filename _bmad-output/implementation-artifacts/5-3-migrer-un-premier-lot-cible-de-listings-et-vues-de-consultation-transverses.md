# Story 5.3 : Migrer un premier lot cible de listings et vues de consultation transverses

Status: done

<!-- Create-story BMAD 2026-04-07 — contexte dev ; gate de préparation : lot 2–4 routes / PageManifest nommés ci-dessous. -->

## Story

En tant qu'**utilisatrice responsable**,  
je veux qu'un **premier lot cible** de **pages transverses** type **listings** et **vues de consultation** soit **atteignable** dans le runtime composé `Peintre_nano`,  
afin que le **shell v2** gagne en **utilisabilité pratique** sans tenter de migrer **tous** les écrans transverses en une seule story — **sans** recoder la logique métier `Recyclique` côté front ni simuler des parcours réservés aux Epics **6** (caisse), **7** (réception), **8** (sync) ou **9** (modules).

## Gate de préparation (obligatoire) — lot borné pour cette itération

**Ensemble exact retenu : 4 routes / `PageManifest` (plafond epic : 2 à 4).** Toute évolution de ce périmètre = arbitrage produit / correct-course, pas élargissement implicite en dev.

| # | `route_key` | `path` | `page_key` | Fichier `PageManifest` (sous `contracts/creos/manifests/`) |
|---|-------------|--------|------------|-------------------------------------------------------------|
| 1 | `transverse-listing-articles` | `/listings/articles` | `transverse-listing-articles` | `page-transverse-listing-articles.json` |
| 2 | `transverse-listing-dons` | `/listings/dons` | `transverse-listing-dons` | `page-transverse-listing-dons.json` |
| 3 | `transverse-consultation-article` | `/consultation/article` | `transverse-consultation-article` | `page-transverse-consultation-article.json` |
| 4 | `transverse-consultation-don` | `/consultation/don` | `transverse-consultation-don` | `page-transverse-consultation-don.json` |

**Sémantique produit (hubs transverses, pas flows terrain) :**

- **Listings** (`/listings/*`) : hubs de **consultation** de type catalogue / liste (articles en stock, dons en entrée) — **pas** parcours caisse, **pas** qualification réception, **pas** sync.
- **Consultation** (`/consultation/*`) : **vues de consultation** transverses (fiche-type article, fiche-type don) — **placeholders compositionnels** jusqu'à données OpenAPI prêtes ; **pas** de prétention que les flows riches Epic **6** / **7** / **9** sont migrés.

## Acceptance Criteria

1. **Lot nommé et branché sur la chaîne contract-driven** — Étant donné que **5.1** et **5.2** ont établi navigation + dashboard via `contracts/creos/manifests/` et `loadManifestBundle`, quand ce lot est livré, alors les **quatre** entrées du tableau ci-dessus existent comme **`NavigationManifest` + `PageManifest` reviewables** (fichiers sous `contracts/creos/manifests/`) ; elles sont **référencées** dans `navigation-transverse-served.json` et **chargées** dans le bundle servi (`runtime-demo-manifest.ts` ou équivalent) ; **aucune** route ou `page_key` de ce lot n'existe **uniquement** dans le code React. [Source : `epics.md` — Story 5.3 ; `2026-04-07_03_checklist-pr-peintre-sans-metier.md` — points 1–2]

2. **Permissions et contexte backend (pas de vérité UI)** — Étant donné que les pages transverses doivent refléter le périmètre actif, quand une page du lot s'affiche, alors l'**accès** est cohérent avec **`ContextEnvelope`** et les **permissions** consommées (même mécanisme que dashboard : `required_permission_keys` / `visibility` CREOS selon le pattern en place) ; **interdiction** de recalculer des droits effectifs côté `peintre-nano`. Pour la **démo locale**, introduire si besoin une **clé de permission stable** (ex. `transverse.listings.hub.view`) **déclarée dans le contrat** et **émise** par l'enveloppe démo (`default-demo-auth-adapter.ts`), alignée **5.1** / **5.2**. [Source : `epics.md` — Story 5.3 ; `navigation-structure-contract.md` — hiérarchie de vérité]

3. **Hubs : entrées futures sans faire semblant** — Étant donné que ces écrans servent de **hubs**, quand ils sont rendus, alors les **liens ou mentions** vers caisse, réception, sync, modules complémentaires ou admin détaillé restent **explicitement** « non migrés » ou suivent la **politique UX** (entrée masquée / action indisponible avec retour explicite — cohérent avec **5.1** AC2) ; **pas** de simulation de parcours Epic **6–9**. [Source : `epics.md` — Story 5.3 AC « entry points » ; Story 5.4 pour admin détaillé]

4. **Hors scope rappelé (caisse / réception)** — Étant donné que l'Epic **5** ne doit pas absorber les flows métier, quand les frontières de page sont définies, alors les **détails de workflow caisse** restent hors Epic **5** (Epic **6**) et les **spécificités réception** réservées à Epic **7** ; cette story **ne livre** ni ticket caisse, ni bordereau réception, ni intégration Paheko. [Source : `epics.md` — Story 5.3]

5. **Runtime partagé, erreurs, fallbacks** — Étant donné la continuité **5.2**, quand le lot est livré, alors le rendu **réutilise** `resolvePageAccess`, `reportRuntimeFallback`, registre de widgets et layout shell existants ; tout widget **data** officiel doit avoir un `data_contract.operation_id` résolu dans `contracts/openapi/recyclique-api.yaml` — **si les listes détaillées ne sont pas encore branchées**, rester sur widgets de **présentation** allowlistés (ex. `demo.text.block`) et **documenter le gap** dans le manifeste ou un slot dédié (même principe que `dashboard.data-gap` en **5.2**). [Source : `epics.md` — Story 5.3 ; story `5-2-...md`]

6. **Artefacts contractuels nommés** — Étant donné la checklist PR, quand la PR est rédigée, elle **cite** explicitement les fichiers `contracts/creos/manifests/` touchés (navigation + les quatre `PageManifest`) et toute évolution OpenAPI si des `data_contract` sont ajoutés. [Source : `2026-04-07_03_checklist-pr-peintre-sans-metier.md` — points 3, 11]

## Tasks / Subtasks

- [x] **Promouvoir le lot sous contrat** (AC: 1, 4, 6)
  - [x] Créer les **quatre** fichiers `page-transverse-listing-*.json` / `page-transverse-consultation-*.json` avec `page_key`, slots bornés (présentation + texte explicite sur indisponibilité des flows non migrés si pertinent).
  - [x] Étendre `navigation-transverse-served.json` : quatre entrées avec `route_key` / `path` / `page_key` alignés sur le tableau du gate ; respecter `navigation-structure-contract.md` (unicité, résolution vers `PageManifest`).
  - [x] Mettre à jour `runtime-demo-manifest.ts` : imports JSON + inclusion dans `pageManifestsJson` / `sourceLabels` du bundle servi.

- [x] **Permissions démo et cohérence enveloppe** (AC: 2)
  - [x] Ajouter la ou les clés permission dans le contrat et dans `createDefaultDemoEnvelope` / adaptateur auth démo (même style que `transverse.dashboard.view`).
  - [x] Vérifier `filterNavigation` + `resolvePageAccess` sur au moins une entrée du lot (masquage si permission absente).

- [x] **Hubs : chemins indisponibles explicites** (AC: 3)
  - [x] Dans les slots ou la copie manifeste, indiquer clairement que les parcours caisse / réception / sync / modules ne sont **pas** livrés ici ; liens éventuels uniquement vers **zones déjà** dans la nav contractuelle (ex. dashboard, admin placeholder) **sans** simuler l'implémentation métier.

- [x] **Tests et non-régression** (AC: 1, 2, 5)
  - [x] Étendre les tests **contract** du bundle servi (pattern `navigation-transverse-served-5-1.test.ts`) pour inclure les quatre `page_key` et chemins.
  - [x] Ajouter ou étendre **e2e** : au moins un parcours listing + un parcours consultation avec enveloppe autorisée.
  - [x] `npm run lint` et `npm test` dans `peintre-nano/` ; pas d'édition manuelle des fichiers **générés** pour « corriger » un contrat.

## Dev Notes

### Garde-fous architecture et checklist PR Peintre

Relire intégralement `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` et la note agents Epic 5 dans `epics.md` (hypothèse Peintre autonome, gouvernance OpenAPI / CREOS / `ContextEnvelope`).

Points critiques pour **5.3** :

- **Pas** de logique métier listings (tri, filtres métier, agrégats) **inventée** dans `peintre-nano` : composition déclarative + consommation future `data_contract` quand l'API existe.
- Hiérarchie de vérité : `OpenAPI` > `ContextEnvelope` > `NavigationManifest` > `PageManifest` > `UserRuntimePrefs`.
- Manifests **reviewables** sous `contracts/creos/manifests/` ; pas de second chargeur parallèle.

### Structure projet et fichiers typiques

| Zone | Rôle |
|------|------|
| `contracts/creos/manifests/navigation-transverse-served.json` | Ajout des 4 entrées navigation |
| `contracts/creos/manifests/page-transverse-listing-*.json`, `page-transverse-consultation-*.json` | PageManifest du lot |
| `peintre-nano/src/app/demo/runtime-demo-manifest.ts` | Bundle servi |
| `peintre-nano/src/app/auth/default-demo-auth-adapter.ts` | Permissions démo alignées contrat |
| `peintre-nano/src/runtime/resolve-page-access.ts`, `filter-navigation-for-context.ts` | Garde et filtrage |
| `peintre-nano/tests/contract/`, `peintre-nano/tests/e2e/` | Preuves non-régression |

[Source : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`]

### Intelligence stories 5.1 et 5.2 (continuité)

- **5.1** : navigation transverse unique `navigation-transverse-served.json` ; pas de routes fantômes ; filtrage `visibility` + contexte.
- **5.2** : dashboard avec slots `demo.text.block` et slot « gap data » ; même approche pour les listes tant qu'il n'y a pas d'`operation_id` listes dans OpenAPI.
- Tests de référence : `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`, e2e `navigation-transverse-5-1.e2e.test.tsx`.

### Stories ultérieures (ne pas faire dans 5.3)

- **5.4** : lot admin transverse (pages admin dédiées).
- **5.5** à **5.8** : libellés, templates, états vides/chargement/erreurs transverses, validation cohérence shell.
- **Epic 6–9** : flows caisse, réception, sync, modules — **hors périmètre** sauf mentions honnêtes dans l'UI.

### Conformité layout

- **CSS Grid** (AR2) ; Mantine en adaptation **ADR P1**, pas socle de composition du runtime.

### Stack technique (sans upgrade implicite)

- `peintre-nano` : React 18, Vite 6, TypeScript ~5.7, Vitest 3 — **ne pas** monter de versions majeures dans cette story sauf nécessité documentée et hors scope par défaut.

### Références

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 5, Story 5.3]
- [Source : `_bmad-output/planning-artifacts/guide-pilotage-v2.md` — pilotage v2, chemins stories]
- [Source : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`]
- [Source : `_bmad-output/planning-artifacts/architecture/navigation-structure-contract.md`]
- [Source : `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`]
- [Source : `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`]
- [Source : `_bmad-output/planning-artifacts/architecture/post-v2-hypothesis-peintre-autonome-applications-contributrices.md` — contexte extractibilité]
- [Source : `_bmad-output/implementation-artifacts/5-1-recomposer-la-navigation-transverse-commanditaire-dans-peintre-nano.md`]
- [Source : `_bmad-output/implementation-artifacts/5-2-recomposer-le-dashboard-transverse-dans-la-nouvelle-chaine-ui.md`]

## Dev Agent Record

### Agent Model Used

Composer (agent d'implémentation BMAD dev-story), 2026-04-07.

### Debug Log References

- `npm run lint` échouait sur `vite.config.ts` (`process` non typé) : ajout `@types/node` + `"types": ["node"]` dans `tsconfig.node.json` pour satisfaire la story (lint = `tsc -b`).

### Completion Notes List

- Lot 5.3 livré sous `contracts/creos/manifests/` : quatre `PageManifest` (`transverse-listing-articles`, `transverse-listing-dons`, `transverse-consultation-article`, `transverse-consultation-don`) avec slots `demo.text.block` uniquement, mentions explicites Epic 6–9 non migrés et slots « data gap ».
- Navigation : entrées ajoutées dans `navigation-transverse-served.json` avec `visibility` alignée dashboard (`permission_any` + `contexts_any: site`).
- Permissions stables : `transverse.listings.hub.view` (listings), `transverse.consultation.hub.view` (consultation), déclarées sur manifests + émises par `createDefaultDemoEnvelope`.
- Tests contract : filtrage nav sans permission listings, `resolvePageAccess` sur page listing, validation des quatre pages et chemins.
- E2E : parcours listing articles, consultation article, deep link `/listings/dons`, masquage partiel des entrées listings sans permission.
- Aucun `data_contract` / évolution OpenAPI (hors scope tant que les `operation_id` listes ne sont pas prêts).
- Preuve servie levée sur frontend réellement servi à `http://127.0.0.1:4444` : home avec les 4 entrées de navigation attendues, chargement réseau des manifests `navigation-transverse-served.json` + `page-transverse-*.json`, rendu validé sur `/listings/articles`, `/listings/dons`, `/consultation/article`, `/consultation/don`, sans erreur console bloquante.

### File List

- `contracts/creos/manifests/page-transverse-listing-articles.json` (créé)
- `contracts/creos/manifests/page-transverse-listing-dons.json` (créé)
- `contracts/creos/manifests/page-transverse-consultation-article.json` (créé)
- `contracts/creos/manifests/page-transverse-consultation-don.json` (créé)
- `contracts/creos/manifests/navigation-transverse-served.json`
- `peintre-nano/src/app/demo/runtime-demo-manifest.ts`
- `peintre-nano/src/app/auth/default-demo-auth-adapter.ts`
- `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`
- `peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx`
- `peintre-nano/tsconfig.node.json`
- `peintre-nano/package.json`
- `peintre-nano/package-lock.json`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/5-3-migrer-un-premier-lot-cible-de-listings-et-vues-de-consultation-transverses.md`

## Change Log

- **2026-04-07** : Implémentation story 5.3 (manifests, nav, bundle démo, permissions, tests) ; statut sprint → `review`.
- **2026-04-07** : Validation servie sur `http://127.0.0.1:4444` ; réserve de preuve levée ; story clôturée en `done`.

---

**Note create-story :** analyse contexte exhaustive — Ultimate context engine analysis completed ; guide développeur prêt pour `dev-story`.
