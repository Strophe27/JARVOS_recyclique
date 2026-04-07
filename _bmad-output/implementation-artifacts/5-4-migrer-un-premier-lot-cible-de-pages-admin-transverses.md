# Story 5.4 : Migrer un premier lot cible de pages admin transverses

Status: done

<!-- Create-story BMAD 2026-04-07 — contexte dev ; gate obligatoire Epic 5 / story 5.4 : 3 PageManifest admin exacts nommés ci-dessous (plage epic 2–3). -->

## Story

En tant qu'**administratrice responsable**,  
je veux qu'un **premier lot borné** de **pages admin transverses** soit **atteignable** dans le runtime composé `Peintre_nano`,  
afin que le **shell v2** gagne une **valeur admin réelle** sans transformer une story en **programme complet** de migration admin — **sans** recoder la logique métier `Recyclique` côté front, **sans** matrice ACL / config généralisée réservée à l'**Epic 9**, et **sans** parcours caisse (**Epic 6**), réception (**Epic 7**) ou sync (**Epic 8**).

## Gate de préparation (obligatoire) — lot admin exact pour cette itération

**Ensemble retenu : 3 `PageManifest` admin (plafond epic : 2 à 3).** Toute évolution de ce périmètre = arbitrage produit / correct-course, pas élargissement implicite en dev.

| # | `route_key` | `path` | `page_key` | Fichier `PageManifest` (sous `contracts/creos/manifests/`) |
|---|-------------|--------|------------|-------------------------------------------------------------|
| 1 | `transverse-admin` | `/admin` | `transverse-admin-placeholder` | `page-transverse-admin-placeholder.json` |
| 2 | `transverse-admin-access` | `/admin/access` | `transverse-admin-access-overview` | `page-transverse-admin-access-overview.json` |
| 3 | `transverse-admin-site` | `/admin/site` | `transverse-admin-site-overview` | `page-transverse-admin-site-overview.json` |

**Sémantique produit (admin transverse, pas Epic 9 ni flows terrain) :**

- **Hub `/admin`** : point d'entrée admin transverse **sous contrat** — **enrichir** le manifest existant (aujourd'hui texte « livré en 5.4 ») en **slots structurés** (même esprit que le dashboard 5.2 : en-tête, rappels hors workflows lourds, liens honnêtes vers les sous-pages **du lot** et vers le reste de la nav déjà contractuelle).
- **`/admin/access`** : vue admin transverse **« accès et visibilité »** — **composition déclarative** et textes de cadrage ; **pas** implémentation d'une matrice de permissions, **pas** gestion fine des rôles métier (réserver à l'autorité backend + futurs contrats Epic **9**).
- **`/admin/site`** : vue admin transverse **« site et périmètre »** — hub léger **transverse** ; **pas** sync `Paheko`, **pas** configuration modules complémentaires détaillée.

**Permissions pour ce lot (itération courante) :** les trois pages utilisent **`transverse.admin.view`** sur le `PageManifest` (`required_permission_keys`) et la **visibilité nav** alignée sur l'entrée admin existante (`permission_any`: `transverse.admin.view`, `contexts_any`: `site`) — **cohérent** avec `default-demo-auth-adapter.ts` et `navigation-transverse-served.json` aujourd'hui. Si le produit exige une **granularité** plus fine plus tard, elle doit passer par **clés stables dans le contrat** + enveloppe backend, **pas** par un recalcul front.

## Acceptance Criteria

1. **Lot nommé et branché sur la chaîne contract-driven** — Étant donné **5.1**–**5.3**, quand ce lot est livré, alors les **trois** entrées du tableau ci-dessus existent comme **`NavigationManifest` + `PageManifest` reviewables** sous `contracts/creos/manifests/` ; elles sont **référencées** dans `navigation-transverse-served.json` (l'entrée `transverse-admin` existante **reste** sur `/admin` et `transverse-admin-placeholder` **sauf** évolution de `page_key` explicitement traçable et mise à jour synchrone nav + bundle) et **chargées** dans le bundle servi (`runtime-demo-manifest.ts` ou équivalent) ; **aucune** route ou `page_key` de ce lot n'existe **uniquement** dans le code React. [Source : `epics.md` — Story 5.4 ; `2026-04-07_03_checklist-pr-peintre-sans-metier.md` — points 1–2]

2. **Permissions et contexte backend (pas de vérité UI)** — Étant donné que les pages admin doivent rester alignées sur le **périmètre actif** et les **droits backend**, quand une page du lot s'affiche, alors l'**accès** est cohérent avec **`ContextEnvelope`** et les **permissions** consommées (même mécanisme que dashboard / listings : `required_permission_keys`, `visibility` CREOS, `resolvePageAccess`, `filterNavigation`) ; **interdiction** de recalculer des droits effectifs côté `peintre-nano`. [Source : `epics.md` — Story 5.4 ; `navigation-structure-contract.md`]

3. **Cohérence avec l'admin transverse existant (pas de pile parallèle)** — Étant donné que ces pages **pilotent souvent l'accès** à d'autres zones, quand elles sont rendues, alors elles restent **cohérentes** avec les règles de permissions et de contexte **backend** ; elles **ne créent pas** une pile admin **parallèle** hors runtime partagé (pas de second chargeur de manifests, pas de routes orphelines). [Source : `epics.md` — Story 5.4]

4. **Hors scope rappelé (caisse / réception / sync / Epic 9 large)** — Étant donné que l'Epic **5** ne doit pas absorber les workflows métier ni la config généralisée, quand les frontières sont définies, alors les **détails caisse** restent Epic **6**, **réception** Epic **7**, **sync** Epic **8** ; la **config admin simple, ACL, feature matrix** large restent **Epic 9** — cette story **ne livre** que des **hubs de composition** sous contrat, avec mentions explicites des limites si l'UI cite des sujets futurs. [Source : `epics.md` — Story 5.4 ; Story 4.5 (4.x) rappel admin transitionnel]

5. **Runtime partagé, erreurs, fallbacks** — Étant donné la continuité **5.2** / **5.3**, quand le lot est livré, alors le rendu **réutilise** `resolvePageAccess`, `reportRuntimeFallback`, registre de widgets et layout shell existants ; tout widget **data** officiel doit avoir un `data_contract.operation_id` résolu dans `contracts/openapi/recyclique-api.yaml` — **si les données admin détaillées ne sont pas encore branchées**, rester sur widgets de **présentation** allowlistés (ex. `demo.text.block`) et **documenter le gap** dans un slot dédié (principe `dashboard.data-gap` en **5.2**). [Source : `epics.md` — Story 5.4 ; story `5-3-...md`]

6. **Artefacts contractuels nommés** — Étant donné la checklist PR, quand la PR est rédigée, elle **cite** explicitement les fichiers `contracts/creos/manifests/` touchés (navigation + les **trois** `PageManifest` du tableau) et toute évolution OpenAPI si des `data_contract` sont ajoutés. [Source : `2026-04-07_03_checklist-pr-peintre-sans-metier.md` — points 3, 11]

## Tasks / Subtasks

- [x] **Promouvoir le lot sous contrat** (AC: 1, 4, 6)
  - [x] **Enrichir** `page-transverse-admin-placeholder.json` : slots bornés (structure type dashboard 5.2), retirer le message auto-référent « story 5.4 » ; contenu honnête sur le périmètre (liens vers `/admin/access`, `/admin/site` uniquement comme **chemins contractuels** une fois les entrées nav ajoutées — pas de `href` inventés hors manifest).
  - [x] Créer **`page-transverse-admin-access-overview.json`** et **`page-transverse-admin-site-overview.json`** avec `page_key` exacts du gate, `requires_site`: true, `required_permission_keys`: `["transverse.admin.view"]`, slots `demo.text.block` (ou équivalent allowlisté) + texte de cadrage Epic 6–9 hors scope.
  - [x] Étendre `navigation-transverse-served.json` : **deux** nouvelles entrées (`transverse-admin-access`, `transverse-admin-site`) avec `path` / `page_key` alignés sur le tableau ; `visibility` identique à `transverse-admin` (`permission_any` + `contexts_any`: `site`) ; respecter `navigation-structure-contract.md` (unicité `route_key` / `path` / `page_key`).
  - [x] Mettre à jour `runtime-demo-manifest.ts` : imports JSON + inclusion dans `pageManifestsJson` / `sourceLabels` du bundle servi.

- [x] **Permissions démo et cohérence enveloppe** (AC: 2, 3)
  - [x] Vérifier que `transverse.admin.view` couvre les trois pages dans l'enveloppe démo (`createDefaultDemoEnvelope` / `default-demo-auth-adapter.ts`) — **ajuster** seulement si de **nouvelles** clés stables sont introduites dans le **contrat** (éviter les permissions fantômes).
  - [x] Vérifier `filterNavigation` + `resolvePageAccess` sur au moins une entrée nouvelle et sur le hub `/admin` sans permission admin.

- [x] **Tests et non-régression** (AC: 1, 2, 5)
  - [x] Étendre les tests **contract** du bundle servi (`navigation-transverse-served-5-1.test.ts` ou fichier dédié) : présence des **trois** `page_key`, chemins `/admin`, `/admin/access`, `/admin/site`, et cohérence avec la nav.
  - [x] Étendre **e2e** : parcours hub admin + au moins une sous-page avec enveloppe autorisée ; scénario masquage si permission absente (aligné **5.3**).
  - [x] `npm run lint` et `npm test` dans `peintre-nano/` ; pas d'édition manuelle des fichiers **générés** pour corriger un contrat.

## Dev Notes

### Garde-fous architecture et checklist PR Peintre

Relire intégralement `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` et la note agents Epic 5 dans `epics.md`.

**Alignement `epics.md` Story 5.4 :** le Story Preparation Gate (« 2 à 3 » pages / `PageManifest` admin nommés avant exécution) est couvert par le tableau du § Gate de préparation (3 entrées figées).

**Alignement `guide-pilotage-v2.md` §3 (jalons Epic 5–9) :** ce livrable avance le jalon **Epic 5** (shell, dashboard, **admin transverses** dans Peintre) ; il ne remplace ni ne pré-réalise les jalons **Epic 6** (caisse), **7** (réception), **8** (Paheko), **9** (modules / config admin large) — cohérent avec la colonne « Articulation par epic » de la checklist PR.

Points critiques pour **5.4** :

- **Pas** de logique métier admin (ACL, rôles, règles de visibilité métier) **inventée** dans `peintre-nano` : composition déclarative + futurs `data_contract` lorsque l'API existe.
- Hiérarchie de vérité : `OpenAPI` > `ContextEnvelope` > `NavigationManifest` > `PageManifest` > `UserRuntimePrefs`.
- Manifests **reviewables** sous `contracts/creos/manifests/` ; pas de second chargeur parallèle.

### Structure projet et fichiers typiques

| Zone | Rôle |
|------|------|
| `contracts/creos/manifests/navigation-transverse-served.json` | Entrées admin + deux sous-routes du lot |
| `contracts/creos/manifests/page-transverse-admin-placeholder.json` | Hub `/admin` — évolution contenu |
| `contracts/creos/manifests/page-transverse-admin-access-overview.json` | Nouveau |
| `contracts/creos/manifests/page-transverse-admin-site-overview.json` | Nouveau |
| `peintre-nano/src/app/demo/runtime-demo-manifest.ts` | Bundle servi |
| `peintre-nano/src/app/auth/default-demo-auth-adapter.ts` | Permissions démo |
| `peintre-nano/src/runtime/resolve-page-access.ts`, `filter-navigation-for-context.ts` | Garde et filtrage |
| `peintre-nano/tests/contract/`, `peintre-nano/tests/e2e/` | Preuves |

[Source : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` ; `navigation-structure-contract.md`]

### Intelligence story 5.3 (continuité directe)

- **5.3** : gate tableau `PageManifest` + nav + bundle + permissions stables + tests contract / e2e ; même discipline pour **5.4**.
- Fichier de référence : `_bmad-output/implementation-artifacts/5-3-migrer-un-premier-lot-cible-de-listings-et-vues-de-consultation-transverses.md`.
- Tests de référence : `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`, `peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx` (parcours admin placeholder déjà couvert — à étendre aux nouvelles routes).

### Stories ultérieures (ne pas faire dans 5.4)

- **5.5**–**5.8** : libellés personnalisés, templates layouts, états vides/chargement/erreurs, validation cohérence shell.
- **Epic 9** : config admin généralisée, ACL sensibles, modules — **hors périmètre** sauf mentions honnêtes dans l'UI.

### Conformité layout

- **CSS Grid** (AR2) ; Mantine en adaptation **ADR P1**, pas socle de composition du runtime.

### Stack technique (sans upgrade implicite)

- `peintre-nano` : React 18, Vite 6, TypeScript ~5.7, Vitest 3 — **ne pas** monter de versions majeures dans cette story sauf nécessité documentée.

### Références

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 5, Story 5.4]
- [Source : `_bmad-output/planning-artifacts/guide-pilotage-v2.md`]
- [Source : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`]
- [Source : `_bmad-output/planning-artifacts/architecture/navigation-structure-contract.md`]
- [Source : `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`]
- [Source : `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`]
- [Source : `_bmad-output/planning-artifacts/architecture/post-v2-hypothesis-peintre-autonome-applications-contributrices.md`]
- [Source : `_bmad-output/implementation-artifacts/5-1-recomposer-la-navigation-transverse-commanditaire-dans-peintre-nano.md`]
- [Source : `_bmad-output/implementation-artifacts/5-2-recomposer-le-dashboard-transverse-dans-la-nouvelle-chaine-ui.md`]
- [Source : `_bmad-output/implementation-artifacts/5-3-migrer-un-premier-lot-cible-de-listings-et-vues-de-consultation-transverses.md`]

## Dev Agent Record

### Agent Model Used

Composer (agent dev-story BMAD), session 2026-04-07.

### Debug Log References

_(Aucun blocage.)_

### Completion Notes List

- Lot 5.4 : 2 `PageManifest` nouveaux + hub admin enrichi (5 slots `demo.text.block`), nav servie étendue, bundle `runtimeServedManifestLoadResult` aligné.
- Permissions inchangées : `transverse.admin.view` déjà dans `createDefaultDemoEnvelope` ; filtrage nav + `resolvePageAccess` couverts par tests contract et e2e.
- `npm run lint` (`tsc -b`) et `npm test` : 167 tests OK.

### File List

- `contracts/creos/manifests/page-transverse-admin-placeholder.json`
- `contracts/creos/manifests/page-transverse-admin-access-overview.json`
- `contracts/creos/manifests/page-transverse-admin-site-overview.json`
- `contracts/creos/manifests/navigation-transverse-served.json`
- `peintre-nano/src/app/demo/runtime-demo-manifest.ts`
- `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`
- `peintre-nano/tests/e2e/navigation-transverse-5-1.e2e.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- **2026-04-07** : Create-story (CS) — fichier story créé, gate 3 `PageManifest` admin explicites ; statut sprint cible `ready-for-dev`.
- **2026-04-07** : Validation story (VS) — traceabilité explicite `epics.md` Story 5.4 + `guide-pilotage-v2.md` §3 ; gates bloquants confirmés.
- **2026-04-07** : Implémentation dev-story — manifests CREOS + bundle + tests contract/e2e ; story et sprint → `review`.

---

**Note create-story :** analyse contexte exhaustive — Ultimate context engine analysis completed ; guide développeur prêt pour `dev-story`.
