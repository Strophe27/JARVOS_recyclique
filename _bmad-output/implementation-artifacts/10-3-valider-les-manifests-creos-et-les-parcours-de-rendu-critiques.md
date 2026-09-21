# Story 10.3 : Valider les manifests CREOS et les parcours de rendu critiques

Status: ready-for-dev

**Story ID :** 10.3  
**Story key :** `10-3-valider-les-manifests-creos-et-les-parcours-de-rendu-critiques`  
**Epic :** epic-10 — Industrialiser, valider et rendre la v2 deployable  

<!-- Ultimate context engine analysis completed — BMAD create-story (CS) 2026-09-21. -->

## Story

En tant que **plateforme UI modulaire**,  
je veux que les **artefacts CREOS** et les **parcours de rendu critiques** soient **vérifiés automatiquement**,  
afin que des manifests **valides en apparence** ne **cassent pas silencieusement** le runtime.

## Décisions Ombre / pilotage (2026-09-21)

- **Séquence L0** : **10.1** (CI minimale, statut YAML **`review`** — CR+QA3 OK, **ne pas** forcer **`done`** depuis cette story) → **10.2** (chaîne OpenAPI, statut YAML **`review`** — CR+QA3 **97**, **ne pas** forcer **`done`** si le YAML dit encore **`review`**) → **10.3** (cette story) avant module métier **D** (**D2/D7**).
- **Prérequis** : baseline **`.github/workflows/ci-minimal.yml`** + chaîne OpenAPI **10.2** (`generate_openapi.py --emit-contracts`, snapshot `contracts/openapi/generated/openapi-snapshot.json`, YAML reviewable aligné).
- **Bandeau-live Peintre** : échecs Vitest **bandeau-live** hors smoke dédiés **préexistants** (defer **10.1/10.2**) — la suite **smoke 10.3** ne doit **pas** être conditionnée au vert de **toute** la suite `npm run test` sur ces tests legacy ; documenter le périmètre dans les gates.
- **C2b / `v2.0.0`** : hors scope.
- **D10** : Epic **12** gelé — pas de jobs « parité legacy » dans les gates CREOS.
- **Jalon `source` ↔ tags OpenAPI** (`implementation-patterns-consistency-rules.md`) : **optionnel** en 10.3 — n’implémenter que si le script gate reste maintenable ; **bloquant** en 10.3 : **`operation_id` ↔ `operationId`** sur manifests reviewables.

## Acceptance Criteria

Source normative : `_bmad-output/planning-artifacts/epics.md` — **Story 10.3** (traduction exécutable ci-dessous). Couverture **AR18** (validation CREOS + smoke rendu) et **NFR28** (manifest schéma-valide ne casse pas le rendu React).

1. **Validation structurelle industrialisée** — Étant donné que la composition modulaire est centrale à la v2, quand la validation des manifests est industrialisée, alors le dépôt exécute **automatiquement** (local **et** CI, sans filtre `paths:` sur le workflow Epic 10) des contrôles sur **tous les JSON sous `contracts/creos/manifests/`** du **périmètre reviewable** (voir § Périmètre manifests) : (a) **parse JSON** + conventions minimales (`version` sur catalogues widgets quand présent) ; (b) **catalogues widgets** (`widgets-catalog-*.json`) validés contre **`contracts/creos/schemas/widget-declaration.schema.json`** pour chaque entrée `widgets[]` ; (c) **cohérence bundle** pour le lot servi produit (`navigation-transverse-served.json` + pages référencées) via les règles existantes `validateManifestBundle` / `loadManifestBundle` (pas de duplication de logique métier — **réutiliser** `peintre-nano/src/validation/validate-bundle-rules.ts`) ; les échecs sont **bloquants** en CI (pas `continue-on-error`).

2. **Gate `operation_id` ↔ OpenAPI (même snapshot)** — Étant donné que les widgets peuvent déclarer `data_contract.operation_id` et que l’OpenAPI reviewable contient des opérations, quand un manifest **reviewable** référence un `operation_id` (y compris `secondary_sources[].operation_id` si présent), alors un test ou script unique parcourt **récursivement** le JSON et vérifie que chaque id existe comme **`operationId`** dans **`contracts/openapi/recyclique-api.yaml`** (même snapshot que la chaîne **10.2** — pas `recyclique/api/openapi.json` diagnostic) ; l’échec **bloque** le merge (job Peintre ou job frère dans `ci-minimal.yml`, **sans** `paths:`) — **politique gate Epic 10 L0** : tranche « bloque ou avertit » de `epics.md` Story 10.3 par **échec CI bloquant** sur PR (pas de mode warn-only en baseline). **Exception périmètre** : fichiers sandbox démo listés dans `contracts/creos/manifests/README.md` — crosswalk **ignoré** tant qu’aucun nœud `data_contract` (avec `operation_id` ou `secondary_sources`) n’est présent ; dès qu’un `data_contract` existe, appliquer AC2 comme pour les autres manifests.

3. **Consolidation des garde-fous épars** — Étant donné que des tests contractuels **par story** recouvrent déjà le crosswalk **`operation_id` ↔ OpenAPI** (`creos-reception-nominal-manifests-7-1.test.ts` — `collectOperationIdsFromOpenApi` local + `secondary_sources` ; `creos-bandeau-live-manifests-4-1.test.ts` — assertions **ad hoc** sur l’`operationId` bandeau live, **sans** helper `collectOperationIdsFromOpenApi` aujourd’hui), quand **10.3** est livrée, alors la logique de **collecte YAML + parcours JSON** est **centralisée** (module sous `peintre-nano/tests/contract/lib/`, ex. `creos-openapi-operation-ids.ts`) et **4.1 / 7.1** s’appuient sur l’utilitaire pour le crosswalk **sans perte d’assertions** (4.1 conserve ses checks de chemins/slots spécifiques 4.1) ; les autres tests contractuels du périmètre (**ex.** `page-login-public-creos-11-1.test.ts` — parse/registre uniquement, **pas** de crosswalk) **restent verts** sans refactor crosswalk obligatoire.

4. **Smoke rendu runtime (NFR28 / AR18)** — Étant donné qu’un artefact **schéma-valide** peut encore casser le rendu React, quand les parcours critiques sont testés, alors une suite **smoke** Vitest (jsdom, **sans** navigateur réel) monte le runtime (`loadManifestBundle`, `buildPageManifestRegions` / `PageRenderer`, registre widgets importé) pour un **noyau explicite** de modules **déjà reviewables** (les libellés caisse / réception désignent ici des **pages CREOS reviewables** et la **non-crashe** du rendu — **pas** les parcours métier pytest/e2e de **Story 10.4**) : **connexion publique** (`page-login-public.json`), **dashboard transverse** (`page-transverse-dashboard.json` ou équivalent servi), **bandeau live** (lot `navigation-bandeau-live-slice.json` + `page-bandeau-live-sandbox.json` + `widgets-catalog-bandeau-live.json` — réutiliser le setup de `peintre-nano/tests/e2e/bandeau-live-sandbox-compose.e2e.test.tsx` en **smoke** plus court si pertinent), **caisse nominale** (`page-cashflow-nominal.json` + `widgets-catalog-cashflow-nominal.json`), **réception nominale** (`page-reception-nominal.json` + `widgets-catalog-reception-nominal.json`) ; **chaque cas sauf login public** passe par **`loadManifestBundle` réussi** avec le **navigation JSON reviewable** du parcours (`navigation-transverse-served.json` pour dashboard / caisse / réception — sous-lot de pages cohérent avec les `page_key` du manifest ; `navigation-bandeau-live-slice.json` pour bandeau) et **`allowedWidgetTypes` = défaut `defaultAllowedWidgetTypeSet()`** (interdit de réduire l’allowlist en smoke sans le documenter — évite faux verts NFR28) ; **login public** (hors nav servie) : montage **page seule** via parse ingest + `PageRenderer` / harness équivalent **sans** contourner les parse errors, avec le même registre widgets importé ; chaque fichier smoke déclare **`// @vitest-environment jsdom`** en tête (convention `tests/e2e/`, défaut Vitest = `node` dans `vitest.config.ts`) ; chaque cas **assert** au minimum : pas d’exception React non capturée, présence d’un **marqueur DOM** stable déjà utilisé dans les tests existants (éviter nouveaux sélecteurs fragiles) ; les mocks HTTP restent **autorisés** (pas d’exigence backend réel en CI smoke) — **résidu FMEA accepté** : formes de réponse API réelles non exercées tant que le smoke reste rendu-only.

5. **Industrialisation sur 10.1–10.2** — Étant donné qu’**Epic 10** industrialise sans refaire le métier, quand **10.3** est fermée, alors les commandes sont documentées dans **`doc/ci-minimal.md`** (section dédiée **10.3**) et exécutées dans le job **`peintre-nano-minimal`** **ou** un quatrième job **`creos-manifests`** dans le **même** workflow `ci-minimal.yml` (**préférence** : étendre `peintre-nano-minimal` si durée acceptable ; job séparé seulement si isolation claire) ; **interdit** : nouveau workflow parallèle avec `paths:` qui contourne la baseline PR.

6. **Hors scope explicite** — Étant donné les frontières Epic 10, quand cette story est revue, alors **ne pas** livrer : suite **Spectral** OpenAPI complète (**hors scope Epic 10**, y compris **10.2** — pas de Spectral partiel implicite) ; gate **`data_contract.source` ↔ tags OpenAPI** (jalon futur — seuil 3 manifests + tags stabilisés, voir architecture) sauf si trivial après AC2 ; correction globale des tests **bandeau-live** legacy hors smoke ; **e2e Puppeteer** / navigateur réel nouveaux ; validation des seuls manifests **démo** sous `peintre-nano/public/manifests/` ou `src/fixtures/` (hors promotion `contracts/`) ; **Story 10.4** (*Poser la couverture de tests ciblée sur un premier noyau de parcours critiques* — `epics.md`) : lot **Story Preparation Gate** (1× module chain, 1× caisse nominale, 1× réception nominale, 1× sync-sensitive) à la profondeur adaptée au risque (**backend**, bornes **contrat**, **intégration**, smoke **e2e** métier — **pas** les smokes **rendu React** jsdom AC4) ; extension baseline à **`recyclique-1.4.4/`**.

## Matrice de traçabilité (C12)

| AC | Tâches | Fichiers / artefacts | Gate Story Runner |
|----|--------|----------------------|-------------------|
| **1** Structure CREOS | Périmètre ; Validation schéma + bundle | `contracts/creos/manifests/**` ; `contracts/creos/schemas/widget-declaration.schema.json` ; `peintre-nano/src/runtime/load-manifest-bundle.ts` ; `peintre-nano/src/validation/validate-bundle-rules.ts` | Vitest gate CREOS **verts** |
| **2** `operation_id` | Utilitaire crosswalk ; Intégration CI | `recyclique-api.yaml` ; nouveau test `test_story_10_3_*` ou `creos-manifests-governance-10-3.test.ts` | `npm run test` inclut gate ; échec si id fantôme |
| **3** Consolidation | Refactor crosswalk **4.1 / 7.1** → utilitaire | `peintre-nano/tests/contract/lib/creos-openapi-operation-ids.ts` ; `creos-bandeau-live-manifests-4-1.test.ts` ; `creos-reception-nominal-manifests-7-1.test.ts` | 4.1 / 7.1 + gate 10.3 **verts** ; 11.1 inchangé (hors crosswalk) |
| **4** Smoke rendu | Suite smoke parcours critiques | `peintre-nano/tests/smoke/creos-critical-render-paths-10-3.test.tsx` ; manifests listés AC4 ; pattern `bandeau-live-sandbox-compose.e2e.test.tsx` | Vitest smoke **verts** (jsdom) |
| **5** CI + doc | `ci-minimal.yml` ; **DS** §10.3 `doc/ci-minimal.md` ; **DS** `vitest.config.ts` smoke ; smoke infra optionnel | `.github/workflows/ci-minimal.yml` ; `doc/ci-minimal.md` ; `peintre-nano/vitest.config.ts` (`tests/smoke/**`) ; `tests/infra/test_story_10_3_*` (verrou YAML) | Parité local = CI |
| **6** Hors scope | Revue périmètre | Dev Notes § Hors scope | Pas de Spectral / legacy 1.4.4 |

## Tasks / Subtasks

- [ ] **Périmètre manifests reviewables** — Documenter dans **`contracts/creos/manifests/README.md`** (créer si absent) : tout `*.json` sous ce dossier est **reviewable** sauf fichiers listés **sandbox démo** (`page-demo-home.json`, `page-demo-guarded-page.json`, `page-demo-unknown-widget.json`) pour lesquels seuls les contrôles **structurels** s’appliquent et **`operation_id` ↔ OpenAPI** est **ignoré** s’il n’y a pas de `data_contract` ; les autres fichiers **doivent** passer AC2. (AC : 1, 2, 6)

- [ ] **Aligner dette `operation_id` connue (pré-gate)** — Avant ou avec la gate globale AC2 : corriger les `operation_id` reviewables **absents** du YAML aligné **10.2** (dette documentée : `widgets-catalog-cashflow-nominal.json` → `legacy_list_categories` **non** présent dans `contracts/openapi/recyclique-api.yaml` au snapshot courant — **remplacement attendu** côté manifest vers un `operationId` existant, ex. `recyclique_categories_listCategories` sur `GET /v1/categories/`, **sans** réintroduire un alias `legacy_*` dans le YAML reviewable) ; sinon la gate 10.3 **échoue** à tort sur un écart déjà connu. (AC : 2)

- [ ] **Utilitaire crosswalk OpenAPI** — Créer `peintre-nano/tests/contract/lib/creos-openapi-operation-ids.ts` (ou équivalent) : `collectOperationIdsFromOpenApi(yaml)` + `collectOperationIdsFromJsonTree(manifest)` en ne collectant que les **propriétés JSON** nommées `operation_id` (pas les mentions textuelles dans `widget_props.body` / blocs `demo.text.block`) ; messages d’erreur avec **chemin fichier + widget.type / page_key**. (AC : 2, 3)

- [ ] **Gate globale manifests** — Ajouter `peintre-nano/tests/contract/creos-manifests-governance-10-3.test.ts` : pour chaque JSON du périmètre reviewable, (a) parse + conventions AC1(a) ; (b) pour chaque `widgets-catalog-*.json`, valider chaque widget contre le schéma (ajouter **`ajv`** en `devDependency` **ou** réutiliser une validation JSON Schema déjà présente — **choix documenté** dans Dev Agent Record) ; (c) **une fois** par livraison, `validateManifestBundle` / `loadManifestBundle` sur le **lot servi produit** (`navigation-transverse-served.json` + pages référencées — AC1(c), réutiliser règles existantes) ; (d) crosswalk AC2 sur l’arborescence **sauf** manifests sandbox démo sans nœud `data_contract` (règle README / AC2). (AC : 1, 2)

- [ ] **Refactor tests épars (crosswalk)** — Faire appeler **7.1** l’utilitaire central (supprimer `collectOperationIdsFromOpenApi` local + boucle `secondary_sources`) et **4.1** l’utilitaire pour la partie **operation_id** bandeau (garder les assertions slots/navigation 4.1) ; **ne pas** exiger de refactor crosswalk sur **11.1** (hors périmètre `operation_id`). (AC : 3)

- [ ] **Suite smoke rendu** — Créer `peintre-nano/tests/smoke/creos-critical-render-paths-10-3.test.tsx` (ou nom aligné conventions) : 5 parcours AC4 ; en-tête **`// @vitest-environment jsdom`** ; factoriser setup Mantine/registry/mocks depuis `peintre-nano/tests/e2e/bandeau-live-sandbox-compose.e2e.test.tsx` ; **ne pas** dupliquer toute la suite e2e bandeau — smoke = rendu slot/page **minimal** + pas de crash ; **imposer** le harness `loadManifestBundle` + nav JSON par parcours (AC4) et `defaultAllowedWidgetTypeSet()` sauf login page-seule. (AC : 4)

- [ ] **DS — Doc `ci-minimal.md` §10.3** — Rédiger la section dédiée **10.3** (commandes locales gates CREOS + smoke, parité job `peintre-nano-minimal` / `creos-manifests`) ; **obligatoire au DS / DoD AC5**, **pas** prérequis **CS/VS** (`doc/ci-minimal.md` ne cite encore 10.3 qu’en hors périmètre). (AC : 5)

- [ ] **DS — Vitest `tests/smoke/`** — Étendre `peintre-nano/vitest.config.ts` → `test.include` avec `tests/smoke/**/*.{test.ts,test.tsx}` (glob **absent** au CS) pour que `npm run test` exécute la suite smoke AC4 ; **obligatoire au DS / DoD** (FM9), **pas** blocage story `ready-for-dev`. (AC : 4, 5)

- [ ] **CI workflow (DS)** — Si besoin, expliciter dans `.github/workflows/ci-minimal.yml` que `npm run test` couvre contract + smoke (souvent déjà vrai après include smoke) ; optionnel : `tests/infra/test_story_10_3_ci_minimal_creos_smoke.py` vérifiant que `ci-minimal.yml` référence la suite (pattern 10.1/10.2). (AC : 5)

- [ ] **Sprint / story** — Après DS : Dev Agent Record, File List, `sprint-status.yaml` → **review** via Story Runner. (process BMAD)

## Dev Notes

### Frontières avec 10.1, 10.2 et 10.4

| Sujet | **10.1 (`review`)** | **10.2 (`review`)** | **10.3 (cette story)** | **10.4** |
|--------|---------------------|---------------------|-------------------------|----------|
| CI `ci-minimal.yml` | 3 jobs baseline (API + Peintre + contrats OpenAPI) | Chaîne FastAPI → snapshot → YAML → TS | **Même workflow** sans `paths:` : gates CREOS + smoke dans **`peintre-nano-minimal`** (préféré) **ou** 4ᵉ job **`creos-manifests`** (AC5) | Ajoute couverture **métier** ciblée (pytest / intégration), pas un 2ᵉ workflow |
| OpenAPI drift | Diff TS ; tests gouvernance YAML | FastAPI ↔ YAML ↔ snapshot | Consomme YAML **aligné** (prérequis) | — |
| CREOS | Vitest schéma widget (1.4) partiel | Hors scope (AC6) | **Tous manifests reviewables** + crosswalk `operation_id` | Pas de re-validation schéma CREOS globale |
| Rendu / « e2e » | Table 10.1 : pas d’e2e navigateur en baseline | — | **Smoke rendu** Vitest **jsdom** AC4 (montage React, marqueurs DOM) — **pas** Puppeteer ; factorise setup depuis `tests/e2e/*.tsx` sans reprendre la suite métier | **10.4** : couverture ciblée *premier noyau de parcours critiques* — 4 cibles `epics.md` (module chain, caisse nominale, réception nominale, sync-sensitive) ; profondeur **backend / contrat / intégration / e2e** métier — **ne remplace pas** AC4 |
| Spectral OpenAPI | Hors scope | Hors scope (suite complète) | Hors scope (AC6 — ne pas réintroduire via CREOS) | Hors scope |
| Peintre `npm run test` | Tout Vitest | Hors fix bandeau-live | Inclut contract + **`tests/smoke/`** (glob Vitest = **tâche DS**) ; dette **bandeau-live** hors smoke 10.3 documentée en CR | Extension couverture au-delà du noyau **10.4** |

**Note frontière 10.3 ↔ 10.4 (`epics.md`)** : **10.3** industrialise **validation CREOS** + **smokes rendu runtime** (NFR28 / AR18 couche UI) ; **10.4** pose la **couverture automatisée ciblée** sur le *premier noyau* de parcours produit (4 cibles minimales du **Story Preparation Gate** 10.4) avec tests **backend, intégration et e2e** au bon niveau de risque — les libellés « caisse / réception » en AC4 désignent des **pages CREOS reviewables** et la non-crashe du rendu, **pas** les parcours métier pytest/e2e de **10.4**.

### Périmètre manifests (`contracts/creos/manifests/`)

- **49 fichiers JSON** au snapshot courant (**2** `navigation-*.json`, **3** `widgets-catalog-*.json`, **44** `page-*.json` — dont **3** `page-demo-*` sandbox) — source reviewable unique pour slices produit partagés (gouvernance **§1 bis** pivot 1.4) ; **recompter** (`find contracts/creos/manifests -name '*.json' | wc -l`) avant merge si des manifests sont ajoutés en cours d’epic.
- **Dette crosswalk connue (AC2)** : `legacy_list_categories` dans `widgets-catalog-cashflow-nominal.json` n’existe pas dans `recyclique-api.yaml` reviewable — à résoudre dans la tâche « Aligner dette » (manifest → `operationId` reviewable existant, v. ex. `recyclique_categories_listCategories`) avant merge gate globale.
- **Lot servi transverse** : `navigation-transverse-served.json` + pages importées dans `runtime-demo-manifest.ts` — test **5.1** déjà valide le bundle ; **10.3** généralise la règle **`operation_id`** à **tous** les catalogues/pages qui déclarent `data_contract`.
- **Sandbox démo** : fichiers `page-demo-*` — ne pas exiger d’`operation_id` OpenAPI s’ils n’en déclarent pas ; s’ils en déclarent un jour, appliquer AC2.

### Chaîne OpenAPI (prérequis 10.2)

- Entrée gate : **`contracts/openapi/recyclique-api.yaml`** (aligné sur `generated/openapi-snapshot.json`).
- **Ne pas** comparer aux `operationId` de `app.openapi()` seul sans YAML — la CI Peintre lit le **fichier reviewable** versionné (cohérent codegen Peintre).

### Intelligence stories 10.1 et 10.2

- **`ci-minimal.yml`** : Postgres **17**, jobs sans `paths:` ; `contracts-openapi` gère la chaîne OpenAPI.
- **Tests existants à préserver** : `recyclique-openapi-governance.test.ts` (structure YAML + schéma CREOS) ; tests par epic sous `tests/contract/`.
- **Runtime** : `loadManifestBundle` + `validateManifestBundle` — point d’ancrage pour AC1(c).

### Smoke rendu — parcours critiques (AR18 / tableau opérationnel 10.3)

Référence : `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md` ligne **10.3** — valider **runtime et manifests**, pas le métier.

| Parcours | Manifests / ancres tests existants |
|---------|-------------------------------------|
| Login public | `page-login-public.json` — `page-login-public-creos-11-1.test.ts` |
| Dashboard | `page-transverse-dashboard.json` — runtime servi 5.1 |
| Bandeau live | `peintre-nano/tests/e2e/bandeau-live-sandbox-compose.e2e.test.tsx` (réduire pour smoke) |
| Caisse nominale | `page-cashflow-nominal.json`, `widgets-catalog-cashflow-nominal.json` — tests runtime-demo caisse |
| Réception nominale | `page-reception-nominal.json`, `widgets-catalog-reception-nominal.json` — 7.1 |

### Outils (ne pas upgrader sans nécessité)

- **Vitest 3** + Testing Library (déjà en place).
- **yaml** parse (déjà utilisé dans tests contract).
- **JSON Schema** : si `ajv` ajouté, version compatible draft du schéma `widget-declaration.schema.json` ; sinon validation ciblée comme `recyclique-openapi-governance.test.ts`.

### Fichiers cibles probables

| Fichier | Action attendue |
|---------|-----------------|
| `peintre-nano/tests/contract/lib/creos-openapi-operation-ids.ts` | Créer — crosswalk |
| `peintre-nano/tests/contract/creos-manifests-governance-10-3.test.ts` | Créer — gate globale |
| `peintre-nano/tests/smoke/creos-critical-render-paths-10-3.test.tsx` | Créer — NFR28 |
| `peintre-nano/tests/contract/creos-*-manifests-*.test.ts` | Refactor → utilitaire |
| `contracts/creos/manifests/README.md` | Périmètre reviewable / sandbox |
| `doc/ci-minimal.md` | Section 10.3 |
| `.github/workflows/ci-minimal.yml` | Si besoin expliciter smoke (souvent déjà couvert par `npm run test`) |
| `tests/infra/test_story_10_3_ci_minimal_creos_smoke.py` | Optionnel — verrou YAML |
| `peintre-nano/tests/contract/README.md` | Pointer gate 10.3 |

**Hors scope :** Spectral, `source`↔tags (sauf trivial), Puppeteer, `recyclique-1.4.4/**`, fix complet bandeau-live debt, promotion nouveaux manifests hors story.

### Modes de défaillance ciblés (FMEA)

**Exigences NFR28 / AR18 (périmètre story)** : NFR28 = schéma-valide ne casse pas le rendu React (smoke AC4 + gates structure) ; AR18 = couverture CI minimale **dont** validation manifests CREOS + smoke modules critiques — **10.3** porte la couche CREOS + smoke rendu ; lint OpenAPI diff / jobs API restent **10.1–10.2** (ne pas diluer AC6).

| ID | Mode | Effet | S / D | Mitigation (10.3) |
|----|------|-------|-------|-------------------|
| FM1 | `operation_id` dans manifest sans `operationId` YAML | Runtime / codegen cassé en prod | H / M | AC2 gate globale |
| FM2 | Catalogue widget invalide schéma mais mergé | Crash rendu (NFR28) | H / M | AC1(b) + smoke AC4 |
| FM3 | Nav → page_key orpheline | 404 runtime | H / M | AC1(c) sur lot servi ; smoke AC4 avec `loadManifestBundle` + nav du parcours |
| FM4 | Job CI CREOS avec `paths:` | Merge casse manifests | H / H | AC5 — même workflow sans filtre |
| FM5 | Scope creep Spectral + 10.4 e2e métier | Surcharge | M / H | AC6 |
| FM6 | Dupliquer logique métier dans tests | Dette | L / M | Réutiliser `validateManifestBundle` |
| FM7 | Crosswalk naïf : faux `operation_id` (prose `demo.text.block`) | CI rouge ou id fantôme manqué | M / L | Utilitaire : clés JSON `operation_id` uniquement (tâche crosswalk) |
| FM8 | Smoke monte page seule avec nav servie requise | FM3 non détecté sur caisse / réception / dashboard | H / M | AC4 : `navigation-transverse-served.json` + `loadManifestBundle` |
| FM9 | `tests/smoke/` absent de `vitest.config.ts` `include` | NFR28 / AR18 faux sentiment de couverture | H / H | Tâche CI + DoD ; test infra optionnel 10.3 |
| FM10 | Allowlist widgets réduite en smoke | NFR28 faux vert (`UNKNOWN_WIDGET_TYPE` prod) | M / M | AC4 : `defaultAllowedWidgetTypeSet()` par défaut |
| FM11 | Gate AC2 avant résolution `legacy_list_categories` | PR bloquées sur dette connue | M / H | Tâche « Aligner dette » avant merge gate globale |

### Definition of Done (Story 10.3)

- [ ] Les **6 AC** sont couverts par des gates automatisés (Vitest contract + smoke, CI `ci-minimal.yml` sans `paths:` / `continue-on-error` sur les jobs CREOS).
- [ ] `contracts/creos/manifests/README.md` documente reviewable vs sandbox ; gate globale respecte les exceptions AC2.
- [ ] Utilitaire `creos-openapi-operation-ids.ts` partagé ; tests crosswalk **4.1 / 7.1** refactorés sans perte d’assertions ; dette `legacy_list_categories` résolue ou documentée comme bloquante.
- [ ] `doc/ci-minimal.md` section **10.3** + `vitest.config.ts` inclut `tests/smoke/`.
- [ ] Story Runner (commandes ci-dessous) **verts** sur la branche de livraison ; dette bandeau-live **hors** smoke/contract 10.3 documentée en CR si `npm run test` global reste partiellement rouge.
- [ ] `sprint-status.yaml` → **review** (pas **done** sans DS) ; **ne pas** forcer **10.1 / 10.2** à **done** depuis cette story.

### Gates Story Runner (référence DS)

```bash
# 1) Gate CREOS + crosswalk (après implémentation)
cd peintre-nano && npm ci
npx vitest run tests/contract/creos-manifests-governance-10-3.test.ts
npx vitest run tests/contract/   # non-régression dont 4.1 / 7.1 / 11.1 / 5.1
npx vitest run tests/smoke/creos-critical-render-paths-10-3.test.tsx

# 2) Parité CI complète Epic 10 (inchangé 10.1–10.2)
cd ../.. && # racine dépôt — voir doc/ci-minimal.md

# 3) Smoke infra optionnel
python -m pytest tests/infra/test_story_10_3_ci_minimal_creos_smoke.py -q
```

**Note bandeau-live :** si `npm run test` global reste rouge sur tests **hors** smoke/contract 10.3, le noter en CR comme dette **10.1 defer** — ne pas élargir AC4 pour tout réparer.

### Project context

- `_bmad-output/project-context.md` — chemins canoniques ; manifests CREOS inclus via `tsconfig.app.json`.
- Checklist PR Peintre : `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` (promotion `contracts/creos/manifests/`).

## References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 10, Story 10.3, AR18, NFR28]
- [Source: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md` — Jalons CI CREOS / `operation_id`]
- [Source: `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md` — §2.3 reviewable vs démo]
- [Source: `contracts/README.md`, `contracts/creos/schemas/README.md`]
- [Source: `_bmad-output/implementation-artifacts/10-1-outiller-la-ci-minimale-pour-recyclique-peintre-nano-et-les-contrats.md` — Frontières 10.3]
- [Source: `_bmad-output/implementation-artifacts/10-2-verifier-la-chaine-openapi-artefacts-generes-consommation-frontend.md` — Prérequis OpenAPI]
- [Source: `_bmad-output/implementation-artifacts/1-4-fermer-la-gouvernance-contractuelle-openapi-creos-contextenvelope.md`]
- [Source: `doc/ci-minimal.md`, `peintre-nano/tests/contract/README.md`]
- [Source: `peintre-nano/src/validation/validate-bundle-rules.ts`, `peintre-nano/src/runtime/load-manifest-bundle.ts`]
- [Source: `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md` — ligne 10.3]
- [Source: `references/peintre/2026-04-01_pipeline-presentation-workflow-invariants.md`, `references/peintre/2026-04-01_instruction-cursor-contrats-donnees.md`]

## Dev Agent Record

### Agent Model Used

_(vide — à remplir au DS)_

### Debug Log References

### Completion Notes List

### Risques résiduels et notes VS (QA3 · clôture intégrale Info)

Dettes **Info** post-fusion QA3 — fermées par documentation (0 P0/P1). Le **DS** exécute les tâches **DS —** ci-dessus ; elles ne rouvrent pas le périmètre **CS/VS** sauf décision PO.

| ID / sujet | Statut | Note |
|------------|--------|------|
| C12 chemin `load-manifest-bundle` | **Fermé** | Matrice AC1 + References : `peintre-nano/src/runtime/load-manifest-bundle.ts` |
| Wording frontière **10.4** vs `epics.md` | **Fermé** | AC6 + Dev Notes (table + note frontière 10.3↔10.4) |
| `vitest.config.ts` smoke + `doc/ci-minimal.md` §10.3 | **Fermé** (doc → **DS**) | Tâches **DS —** explicites ; absent au repo au CS — **pas** blocage story `ready-for-dev` |

### File List
