# 20 — Références code reviewables — pilote #1 bandeau live (Peintre)

**Statut :** brouillon normatif du pack `references/protocole-modules-recyclique/`  
**Date :** 2026-05-20  
**Owner :** liens **code** et **manifests reviewables** du slice `bandeau-live` / `module_key` **`kpi-live-banner`** — **pas** la norme OpenAPI ni les checklists front  
**Audience :** revue de code, agents BMAD, dev front — après lecture du registre (`05`) et du protocole front (`04`)

**Ne pas dupliquer :**

| Doc | Rôle |
|-----|------|
| [`04-MOD-protocole-front-creos.md`](04-MOD-protocole-front-creos.md) | **Quoi vérifier** — phases A→G (manifests §5, `operation_id` §7, fallbacks §10, activation §9, traçabilité stories §14, refs §15) |
| [`03-MOD-protocole-backend.md`](03-MOD-protocole-backend.md) §12 | Chemins API / service / tests pytest pilote #1 |
| [`18-MOD-config-modules-crosswalk.md`](18-MOD-config-modules-crosswalk.md) | Écarts `module-config` ADR-001 vs toggle transitoire **4-5** |
| [`21-MOD-gouvernance-contrats-modules.md`](21-MOD-gouvernance-contrats-modules.md) | Promotion manifests / OpenAPI (Story **1.4**) |

**Source terrain consolidée :** [`peintre-nano/src/domains/bandeau-live/README.md`](../../peintre-nano/src/domains/bandeau-live/README.md) (détail runtime, tableaux `data-*`, recette Docker).

**Pilote #2 (contraste) :** [`08-MOD-exemple-pilote-comptage-pieces-billets.md`](08-MOD-exemple-pilote-comptage-pieces-billets.md) — workflow step, tables SQL, Paheko ; **pas** de dossier `domains/bandeau-live` équivalent dans ce pack.

---

## 1. Objet

Ce fichier est l’**index de revue** pour le pilote **#1** (Epic 4, slice CREOS transverse) : chemins **cliquables** vers le dépôt, regroupés par story **`4-x`**, sans recopier les AC BMAD.

**Usage typique :** ouvrir la story → parcourir la colonne « Fichiers » ci-dessous → valider la chaîne `contrats/creos` → `peintre-nano/src` → tests listés en §6.

---

## 2. Pilote #1 vs pilote #2 (où chercher le code)

| Dimension | **#1 `kpi-live-banner` / `bandeau-live`** (ce doc) | **#2 `comptage-pieces-billets`** ([`08`](08-MOD-exemple-pilote-comptage-pieces-billets.md)) |
|-----------|---------------------------------------------------|----------------------------------------------------------------------------------------|
| Type | Slice CREOS + widget `bandeau-live` | Workflow step dans flow caisse |
| UI Peintre | `peintre-nano/src/domains/bandeau-live/` | `peintre-nano/src/domains/cashflow/` (+ flow) |
| Manifests reviewables | `widgets-catalog-bandeau-live.json`, `page-bandeau-live-sandbox.json`, … | `page-cashflow-close.json` (hôte clôture) — **sans impl** pack |
| Backend | `GET /v2/exploitation/live-snapshot` (lecture) | Tables comptage + `closeSession` / outbox |
| Preuve sprint | Epic **4** **done** | Epic **6** — fiche normative seulement |

**Règle :** un module **workflow step** ne se déduit **pas** du seul patron bandeau — lire **`08`** avant de généraliser.

---

## 3. Stories Epic 4 → fichiers (matrice de revue)

Stories : `_bmad-output/implementation-artifacts/4-*.md` — statut sprint **done** (recouper [`sprint-status.yaml`](../../_bmad-output/implementation-artifacts/sprint-status.yaml)).

| Story | Fichier story | Fichiers code / contrats à ouvrir en priorité |
|-------|---------------|-----------------------------------------------|
| **4-1** | [`4-1-publier-le-contrat-et-les-manifests-minimaux-du-module-bandeau-live.md`](../../_bmad-output/implementation-artifacts/4-1-publier-le-contrat-et-les-manifests-minimaux-du-module-bandeau-live.md) | §4 manifests ; §6 test [`peintre-nano/tests/contract/creos-bandeau-live-manifests-4-1.test.ts`](../../peintre-nano/tests/contract/creos-bandeau-live-manifests-4-1.test.ts) |
| **4-2** | [`4-2-implementer-le-widget-bandeau-live-dans-le-registre-peintre-nano.md`](../../_bmad-output/implementation-artifacts/4-2-implementer-le-widget-bandeau-live-dans-le-registre-peintre-nano.md) | [`register-bandeau-live-widgets.ts`](../../peintre-nano/src/registry/register-bandeau-live-widgets.ts), [`BandeauLive.tsx`](../../peintre-nano/src/domains/bandeau-live/BandeauLive.tsx), [`registry/index.ts`](../../peintre-nano/src/registry/index.ts) |
| **4-3** | [`4-3-brancher-la-source-backend-reelle-et-les-cas-douverture-decalee.md`](../../_bmad-output/implementation-artifacts/4-3-brancher-la-source-backend-reelle-et-les-cas-douverture-decalee.md) | [`live-snapshot-client.ts`](../../peintre-nano/src/api/live-snapshot-client.ts), [`live-snapshot-normalize.ts`](../../peintre-nano/src/domains/bandeau-live/live-snapshot-normalize.ts) ; back : [`03-MOD-protocole-backend.md`](03-MOD-protocole-backend.md) §12 |
| **4-4** | [`4-4-rendre-visibles-les-fallbacks-et-rejets-du-slice-bandeau-live.md`](../../_bmad-output/implementation-artifacts/4-4-rendre-visibles-les-fallbacks-et-rejets-du-slice-bandeau-live.md) | [`BandeauLive.tsx`](../../peintre-nano/src/domains/bandeau-live/BandeauLive.tsx) (`BANDEAU_LIVE_RUNTIME_CODES`), [`runtime/README.md`](../../peintre-nano/src/runtime/README.md), [`report-runtime-fallback.ts`](../../peintre-nano/src/runtime/report-runtime-fallback.ts) |
| **4-5** | [`4-5-ajouter-un-toggle-admin-minimal-borne-au-module-bandeau-live.md`](../../_bmad-output/implementation-artifacts/4-5-ajouter-un-toggle-admin-minimal-borne-au-module-bandeau-live.md) | Champ `bandeau_live_slice_enabled` : lecture dans [`BandeauLive.tsx`](../../peintre-nano/src/domains/bandeau-live/BandeauLive.tsx) / snapshot ; **écriture** côté API — [`recyclique/api/.../exploitation.py`](../../recyclique/api/src/recyclic_api/api/api_v2/endpoints/exploitation.py) ; crosswalk dette → [`18-MOD-config-modules-crosswalk.md`](18-MOD-config-modules-crosswalk.md) §2.2 |
| **4-6** | [`4-6-valider-la-chaine-complete-backend-contrat-manifest-runtime-rendu-fallback.md`](../../_bmad-output/implementation-artifacts/4-6-valider-la-chaine-complete-backend-contrat-manifest-runtime-rendu-fallback.md) | Enchaînement §3 + §6 tests ; OpenAPI [`recyclique-api.yaml`](../../contracts/openapi/recyclique-api.yaml) (`recyclique_exploitation_getLiveSnapshot`) |
| **4-6b** | [`4-6b-raccorder-le-slice-bandeau-live-dans-lapplication-peintre-nano-reellement-servie.md`](../../_bmad-output/implementation-artifacts/4-6b-raccorder-le-slice-bandeau-live-dans-lapplication-peintre-nano-reellement-servie.md) | [`runtime-demo-manifest.ts`](../../peintre-nano/src/app/demo/runtime-demo-manifest.ts), [`default-demo-auth-adapter.ts`](../../peintre-nano/src/app/auth/default-demo-auth-adapter.ts), route `/bandeau-live-sandbox` |

**Socle Epic 3 (prérequis registre, pas story 4-x) :** [`3-3-implementer-le-registre-minimal-de-widgets-slots-et-rendu-declaratif.md`](../../_bmad-output/implementation-artifacts/3-3-implementer-le-registre-minimal-de-widgets-slots-et-rendu-declaratif.md) — [`widget-registry.ts`](../../peintre-nano/src/registry/widget-registry.ts), [`PageRenderer.tsx`](../../peintre-nano/src/app/PageRenderer.tsx).

---

## 4. Manifests CREOS reviewables (`contracts/creos/manifests/`)

Fichiers **grep** `bandeau` sous `contracts/creos/manifests/` (2026-05-20) :

| Fichier | Rôle |
|---------|------|
| [`widgets-catalog-bandeau-live.json`](../../contracts/creos/manifests/widgets-catalog-bandeau-live.json) | `type`: `bandeau-live` ; `data_contract.operation_id`: `recyclique_exploitation_getLiveSnapshot` ; `polling_interval_s`: 30 |
| [`page-bandeau-live-sandbox.json`](../../contracts/creos/manifests/page-bandeau-live-sandbox.json) | `page_key`: `bandeau-live-sandbox` ; slot `widget_type` `bandeau-live` |
| [`navigation-bandeau-live-slice.json`](../../contracts/creos/manifests/navigation-bandeau-live-slice.json) | Route `/bandeau-live-sandbox`, permission `recyclique.exploitation.view-live-band` |
| [`navigation-transverse-served.json`](../../contracts/creos/manifests/navigation-transverse-served.json) | Entrée **dupliquée** sandbox (lot servi transverse) — vérifier cohérence avec le slice dédié |

**Schéma CREOS :** [`contracts/creos/schemas/widget-declaration.schema.json`](../../contracts/creos/schemas/widget-declaration.schema.json).

**Miroir bundler (non substitut reviewable) :** [`peintre-nano/src/fixtures/contracts-creos/`](../../peintre-nano/src/fixtures/contracts-creos/) — copies alignées pour Vitest / démo ; la **vérité PR** reste `contracts/` (cf. [`04-MOD-protocole-front-creos.md`](04-MOD-protocole-front-creos.md) §2.2).

---

## 5. Peintre_nano — arbre du slice

### 5.1 Domaine `bandeau-live`

| Fichier | Rôle |
|---------|------|
| [`README.md`](../../peintre-nano/src/domains/bandeau-live/README.md) | Carte du slice, stories 4.2–4.6b, tableaux `data-bandeau-state` / `data-runtime-*` |
| [`BandeauLive.tsx`](../../peintre-nano/src/domains/bandeau-live/BandeauLive.tsx) | Widget enregistré ; live vs snapshot statique ; codes runtime |
| [`BandeauLive.module.css`](../../peintre-nano/src/domains/bandeau-live/BandeauLive.module.css) | Styles slice (tokens `var(--pn-…)`) |
| [`live-snapshot-normalize.ts`](../../peintre-nano/src/domains/bandeau-live/live-snapshot-normalize.ts) | Normalisation `ExploitationLiveSnapshot` (types OpenAPI générés) |
| [`use-unified-live-kpi-poll.ts`](../../peintre-nano/src/domains/bandeau-live/use-unified-live-kpi-poll.ts) | Polling KPI unifié (réutilisation caisse / réception) |
| [`unified-live-kpi-map.ts`](../../peintre-nano/src/domains/bandeau-live/unified-live-kpi-map.ts) | Mapping agrégats → libellés UI |
| [`KpiLiveStrip.tsx`](../../peintre-nano/src/domains/bandeau-live/KpiLiveStrip.tsx) | Bandeau compact (kiosque caisse — **hors** slot CREOS sandbox, même famille KPI) |
| [`kpi-live-banner-settings.ts`](../../peintre-nano/src/domains/bandeau-live/kpi-live-banner-settings.ts) | Préférences UI **localStorage** (affichage caisse/réception) — **≠** toggle site **4-5** |
| [`kpi-live-banner-settings-provider.tsx`](../../peintre-nano/src/domains/bandeau-live/kpi-live-banner-settings-provider.tsx) | Provider React settings |

**Types générés :** [`contracts/openapi/generated/recyclique-api.ts`](../../contracts/openapi/generated/recyclique-api.ts) — importés par le domaine, pas de schéma dupliqué à la main.

### 5.2 Registre, runtime, app

| Fichier | Rôle |
|---------|------|
| [`register-bandeau-live-widgets.ts`](../../peintre-nano/src/registry/register-bandeau-live-widgets.ts) | `registerWidget('bandeau-live', …)` |
| [`registry/index.ts`](../../peintre-nano/src/registry/index.ts) | Bootstrap `registerBandeauLiveWidgets()` |
| [`live-snapshot-client.ts`](../../peintre-nano/src/api/live-snapshot-client.ts) | `GET` live-snapshot, `X-Correlation-ID`, préfixe `VITE_RECYCLIQUE_API_PREFIX` |
| [`runtime-demo-manifest.ts`](../../peintre-nano/src/app/demo/runtime-demo-manifest.ts) | Fusion fixtures + manifests Epic 4 (**4-6b**) |
| [`default-demo-auth-adapter.ts`](../../peintre-nano/src/app/auth/default-demo-auth-adapter.ts) | Permission démo `recyclique.exploitation.view-live-band` |

**Consommateurs secondaires du client live** (hors slice sandbox, même préfixe API) : `peintre-nano/src/api/admin-*-client.ts` (grep `getLiveSnapshotBasePrefix`), [`AdminSystemHealthWidget.tsx`](../../peintre-nano/src/domains/admin-config/AdminSystemHealthWidget.tsx).

**Réutilisation KPI (pas le widget CREOS `bandeau-live`) :** [`CashflowNominalWizard.tsx`](../../peintre-nano/src/domains/cashflow/CashflowNominalWizard.tsx) importe `KpiLiveStrip` / `useUnifiedLiveKpiPoll` — ne pas confondre avec le pilote #2 clôture.

### 5.3 Admin / settings (périmètre connexe)

| Fichier | Rôle |
|---------|------|
| [`AdminKpiLiveBannerSettingsWidget.tsx`](../../peintre-nano/src/domains/admin-config/AdminKpiLiveBannerSettingsWidget.tsx) | Réglages **présentation** bandeau unifié (super-admin) |
| [`AdminSystemHealthWidget.tsx`](../../peintre-nano/src/domains/admin-config/AdminSystemHealthWidget.tsx) | Affiche `bandeau_live_slice_enabled` depuis live-snapshot |

Toggle **site** **4-5** : pas de client PATCH dédié documenté dans le README domaine — vérité via **GET** snapshot + API back (§12 de [`03-MOD-protocole-backend.md`](03-MOD-protocole-backend.md)).

---

## 6. Tests automatisés (revue rapide)

| Test | Story / gate |
|------|----------------|
| [`creos-bandeau-live-manifests-4-1.test.ts`](../../peintre-nano/tests/contract/creos-bandeau-live-manifests-4-1.test.ts) | **4-1** — manifests reviewables |
| [`signaux-exploitation-bandeau-1-7-artefact.test.ts`](../../peintre-nano/tests/contract/signaux-exploitation-bandeau-1-7-artefact.test.ts) | Alignement artefact signaux métier |
| [`bandeau-live-widget.test.tsx`](../../peintre-nano/tests/unit/bandeau-live-widget.test.tsx) | **4-2** / rendu widget |
| [`bandeau-live-live-source.test.tsx`](../../peintre-nano/tests/unit/bandeau-live-live-source.test.tsx) | **4-3** — `use_live_source`, polling |
| [`unified-live-kpi-map.test.ts`](../../peintre-nano/tests/unit/unified-live-kpi-map.test.ts) | Mapping KPI |
| [`bandeau-live-sandbox-compose.e2e.test.tsx`](../../peintre-nano/tests/e2e/bandeau-live-sandbox-compose.e2e.test.tsx) | **4-6** / **4-6b** — chaîne compose + Network |

**Backend (hors Peintre, même gate 4-6) :** [`recyclique/api/tests/test_exploitation_live_snapshot.py`](../../recyclique/api/tests/test_exploitation_live_snapshot.py).

---

## 7. OpenAPI et config (pointeurs, pas checklists)

| Artefact | Chemin |
|----------|--------|
| OpenAPI canon | [`contracts/openapi/recyclique-api.yaml`](../../contracts/openapi/recyclique-api.yaml) — `recyclique_exploitation_getLiveSnapshot`, `recyclique_exploitation_patchBandeauLiveSlice` |
| Schéma config cible | [`references/config-modules-site-id/schemas/kpi-live-banner.v1.json`](../config-modules-site-id/schemas/kpi-live-banner.v1.json) |
| Signaux métier | [`references/artefacts/2026-04-02_07_signaux-exploitation-bandeau-live-premiers-slices.md`](../artefacts/2026-04-02_07_signaux-exploitation-bandeau-live-premiers-slices.md) |

**Recette manuelle :** `docker compose up` + front dev — URL bac à sable `http://localhost:4444/bandeau-live-sandbox` (détail dans README domaine).

---

## 8. Ordre de revue suggéré (PR slice bandeau)

1. Manifests §4 + test **4-1**  
2. OpenAPI `operationId` ↔ `data_contract.operation_id` (gouvernance **21**, pas ce doc)  
3. Registre + `BandeauLive` (**4-2**)  
4. Client HTTP + normalisation (**4-3**)  
5. Attributs `data-*` + `reportRuntimeFallback` (**4-4**) — checklist [`04`](04-MOD-protocole-front-creos.md) **§10** (Phase F — fallbacks)  
6. Champ `bandeau_live_slice_enabled` + tests pytest (**4-5**, [`03`](03-MOD-protocole-backend.md) **§12**)  
7. E2E sandbox + app servie (**4-6**, **4-6b**) — traçabilité story ↔ section : [`04`](04-MOD-protocole-front-creos.md) **§14**  

**Docs Peintre runtime (chemins relatifs alignés `04` §15) :** `peintre-nano/docs/01-perimetre-et-positionnement.md`, `02-architecture-runtime.md`, `03-contrats-creos-et-donnees.md` (depuis la racine repo).

Pour un **nouveau** slice CREOS : repartir du cookbook [`06-MOD-cookbook-nouveau-module-optionnel.md`](06-MOD-cookbook-nouveau-module-optionnel.md) §14 (gabarit pilote #1), utiliser **ce fichier** comme **liste de fichiers** à comparer.

---

## 9. Liens pack

| Doc | Lien |
|-----|------|
| Registre `module_key` | [`05-MOD-registre-module-key.md`](05-MOD-registre-module-key.md) §5.1 |
| Cookbook gabarit | [`06-MOD-cookbook-nouveau-module-optionnel.md`](06-MOD-cookbook-nouveau-module-optionnel.md) §14 |
| Cartographie sources | [`10-MOD-cartographie-sources-modules.md`](10-MOD-cartographie-sources-modules.md) |
| Pilote #2 | [`08-MOD-exemple-pilote-comptage-pieces-billets.md`](08-MOD-exemple-pilote-comptage-pieces-billets.md) |

---

_Fiche owner **20** — index code reviewable pilote #1 bandeau live. Checklists front : [`04-MOD-protocole-front-creos.md`](04-MOD-protocole-front-creos.md). Dernière révision : 2026-05-20._
