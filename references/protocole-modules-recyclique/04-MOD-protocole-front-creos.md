# 04 — Protocole front CREOS (Peintre_nano)

**Statut :** brouillon normatif du pack `references/protocole-modules-recyclique/`  
**Date :** 2026-05-20  
**Audience :** dev front, agents Cursor, architecte — après lecture du [dossier architecte ch. 05](../dossier-architecte-externe-v2/05-ARCH-frontend-peintre-creos-contrats.md)  
**Objectif :** checklist opérationnelle pour brancher un **module optionnel** côté UI : manifests CREOS, slots, flows / étapes de parcours, registre widgets, `data_contract.operation_id`, activation par site, fallbacks observables.

**Template de référence :** chaîne Epic 4 (pilote **#1 bandeau live**, stories `4-1` … `4-6b`) + socle Epic 3 (`3-3`, `3-6`).

**Prérequis pack (lecture croisée, pas recopiés ici) :**

| Doc | Rôle |
|-----|------|
| [`01-MOD-matrice-choix-modularite.md`](01-MOD-matrice-choix-modularite.md) | v0.1 ↔ v2 (CREOS remplace TOML pour l’UI) |
| [`02-MOD-taxonomie-types-de-modules.md`](02-MOD-taxonomie-types-de-modules.md) | Brouillon normatif livré — slice vs workflow step vs domaine Peintre |
| [`05-MOD-registre-module-key.md`](05-MOD-registre-module-key.md) | Brouillon normatif livré — liste blanche `module_key` |
| [`03-MOD-protocole-backend.md`](03-MOD-protocole-backend.md) | Brouillon normatif livré — OpenAPI, toggle, snapshot — **lecture obligatoire** avant branchement `data_contract` |

---

## 1. Abstract et périmètre

Un module « modulaire » côté front n’est pas un composant React isolé : c’est une **chaîne reviewable** qui va du contrat HTTP jusqu’au rendu dans un slot, avec **échecs visibles** et **activation gouvernée** (backend ou fusion manifeste, pas préférence locale métier).

| Inclus dans ce protocole | Hors scope (autres docs / epics) |
|--------------------------|----------------------------------|
| Manifests `NavigationManifest` / `PageManifest` / catalogue widget sous `contracts/creos/manifests/` | Réécriture dashboard Epic 5, admin transverse Epic 14 |
| Registre `registerWidget` + allowlist synchronisée (3.3) | Marketplace modules tiers (post-v2) |
| `data_contract.operation_id` ↔ `operationId` OpenAPI | Implémentation complète Story 9.6 (matrice admin) — seulement **raccordement** transitoire type 4.5 |
| Flows Peintre (`FlowRenderer`, wizards) **dans** un widget / domaine | CI Epic 10 (règles posées, outillage différé) |
| Fallbacks `reportRuntimeFallback`, sévérités 3.6 | PWA / kiosque offline (gate readiness non prête) |

**Règle `refs_first` :** les stories BMAD et le PRD §4.2 font foi pour le « pourquoi » ; ce document dit **quoi vérifier** et **où toucher** — sans copier les AC.

---

## 2. Principes non négociables

### 2.1 Hiérarchie de vérité (AR39)

Ordre d’interprétation (du plus autoritaire au moins normatif pour la sémantique métier) :

1. **OpenAPI** — `contracts/openapi/recyclique-api.yaml`
2. **ContextEnvelope** — projection serveur (`GET /v1/users/me/context` et évolutions)
3. **NavigationManifest** — structure navigable
4. **PageManifest** — composition slots / widgets
5. **UserRuntimePrefs** — préférences UI **non métier** uniquement

Le front **filtre et affiche** ; il ne **recalcule pas** une permission métier ni un schéma backend.

Source normative : [`references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`](../artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md).

### 2.2 Deux zones de fichiers (ne pas confondre)

| Zone | Chemin | Rôle |
|------|--------|------|
| **Reviewable / commanditaire** | `contracts/creos/manifests/`, `contracts/creos/schemas/` | Vérité v2 versionnée, PR contrats, promotion post-HITL |
| **Démo / dev / tests** | `peintre-nano/public/manifests/`, `peintre-nano/src/fixtures/manifests/` | Epic 3, Vitest, bac à sable — **non normatif** tant que non promu (§1 bis gouvernance) |
| **Runtime consommateur** | `peintre-nano/src/` (`registry/`, `domains/`, `app/`, `flows/`) | Implémentation ; **aucun** `import` depuis `references/` dans le bundle Vite |

**Règle opérationnelle :** dès qu’un slice est **partagé** ou **officiel** (Epic 4+), publier sous `contracts/creos/manifests/` et aligner OpenAPI dans la **même** série de commits (politique B4).

### 2.3 Stack UI (ADR P1 — primauté)

- Widget = composant React + **CSS Module** + tokens `var(--pn-…)` ; pas de Tailwind / CSS-in-JS runtime dans le shell.
- **Mantine v8** : autorisé **à l’intérieur** d’un widget ; **interdit** dans les manifests CREOS (pas de props Mantine dans le JSON).
- Config admin dynamique : **PostgreSQL** (surcharges), défauts dans manifests build — [`references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md`](../peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md).

### 2.4 Chaîne produit (PRD §4.2) — vue front

```text
OpenAPI (operationId)
  → catalogue CREOS (data_contract.operation_id)
  → PageManifest (slot + widget_type + widget_props)
  → registre Peintre (registerWidget)
  → rendu + fetch client + fallbacks
  → activation (signal backend / module_key site — pas prefs locales)
```

Le pilote Epic 4 découpe cette chaîne en stories `4-1` … `4-6b` ; **ne pas sauter** une brique « parce que ça compile en démo ».

---

## 3. Cartographie des artefacts CREOS

| Artefact | Fichier type | Schéma / validation | Consommé par |
|----------|--------------|-------------------|--------------|
| **Catalogue widgets** | `widgets-catalog-<slice>.json` | `contracts/creos/schemas/widget-declaration.schema.json` | Allowlist types, doc `data_contract`, CI future |
| **Page** | `page-<page_key>.json` | Ingest TS 3.2 (`parsePageManifestJson`) | `PageRenderer`, slots |
| **Navigation** | `navigation-<slice>.json` ou lot transverse | Ingest TS 3.2 | `filterNavigation`, shell |
| **États données UI** | *(codes dans widget)* | `widget-data-states.schema.json` (`DATA_*`) | Widgets branchés API |

**Distinction critique (README schémas CREOS) :** la **déclaration** widget (catalogue) ≠ la **ligne de slot** dans un `PageManifest` (`slot_id`, `widget_type`, `widget_props`).

### 3.1 Exemple pilote bandeau live (référence fichiers)

| Fichier reviewable | Rôle |
|--------------------|------|
| [`contracts/creos/manifests/widgets-catalog-bandeau-live.json`](../../contracts/creos/manifests/widgets-catalog-bandeau-live.json) | `type`: `bandeau-live`, `data_contract.operation_id`: `recyclique_exploitation_getLiveSnapshot` |
| [`contracts/creos/manifests/page-bandeau-live-sandbox.json`](../../contracts/creos/manifests/page-bandeau-live-sandbox.json) | Slots `header` / `main` / `aside`, `widget_type` `bandeau-live` |
| [`contracts/creos/manifests/navigation-bandeau-live-slice.json`](../../contracts/creos/manifests/navigation-bandeau-live-slice.json) | Route `/bandeau-live-sandbox`, permission `recyclique.exploitation.view-live-band` |

---

## 4. Checklist maître (nouveau module / slice)

Cocher dans l’ordre recommandé ; la colonne **Story** renvoie au découpage Epic 4 réutilisable comme gabarit.

| # | Brique | Story modèle | OK |
|---|--------|--------------|-----|
| A | Contrats CREOS reviewables publiés (`contracts/creos/manifests/`) | 4-1 | ☐ |
| B | `operationId` OpenAPI + `data_contract.operation_id` identiques (B4) | 4-1, 4-3 | ☐ |
| C | Catalogue widget + cohérence `widget_type` page ↔ catalogue | 4-1, 4-2 | ☐ |
| D | `registerWidget` + allowlist = `getRegisteredWidgetTypeSet()` | 3-3, 4-2 | ☐ |
| E | Composant domaine (types OpenAPI générés, pas de schéma dupliqué) | 4-2 | ☐ |
| F | Client HTTP + `X-Correlation-ID` si `data_contract` live | 4-3 | ☐ |
| G | Fallbacks visibles + `reportRuntimeFallback` | 3-6, 4-4 | ☐ |
| H | Activation admin / site (backend autoritaire) | 4-5 → 9.6 | ☐ |
| I | App **réellement servie** charge le bundle reviewable | 4-6b | ☐ |
| J | Preuve E2E chaîne complète (nominal + échec) | 4-6 | ☐ |

---

## 5. Phase A — Manifests CREOS reviewables

**Objectif :** ancrer la composition UI avant d’écrire du code React métier.

### 5.1 NavigationManifest

- [ ] Fichier JSON sous `contracts/creos/manifests/` (pas seulement `peintre-nano/public/`).
- [ ] Champs cohérents avec l’ingest existant : `version`, `entries[]` avec `route_key`, `path`, `page_key`, `label_key` / `shortcut_id` si utilisés.
- [ ] `required_permission_keys` (ou variante documentée) **alignées** sur les clés backend — pas de permission inventée côté JSON seul.
- [ ] `page_key` de l’entrée = `page_key` du `PageManifest` associé (**même chaîne**, tests contract).
- [ ] Périmètre **borné** au slice (ex. bandeau : pas d’entrées dashboard / admin généralisé dans le même lot si hors story).

**Référence :** `_bmad-output/implementation-artifacts/4-1-publier-le-contrat-et-les-manifests-minimaux-du-module-bandeau-live.md`

### 5.2 PageManifest

- [ ] `page_key` stable (identifiant logique, pas seulement l’URL).
- [ ] `requires_site` / permissions page explicites si le slice l’exige.
- [ ] `slots[]` : chaque entrée a `slot_id`, `widget_type`, `widget_props` (objet JSON sérialisable).
- [ ] Chaque `widget_type` du page existe dans le **catalogue** reviewable ou le registre déjà enregistré (demo widgets `demo.*` réservés au socle 3.3).
- [ ] Props de démo **documentées** comme non normatives si elles simulent des données (ex. `snapshot` statique en 4.2 avant fetch 4.3).
- [ ] Pas de second `PageManifest` pour un **alias runtime** legacy : un seul `page_key` CREOS, alias documentés dans `peintre-nano/docs/03-contrats-creos-et-donnees.md` (ex. `/cash-register/sale` → `cashflow-nominal`).

**Référence :** [`page-cashflow-nominal.json`](../../contracts/creos/manifests/page-cashflow-nominal.json) (multi-slots, `widget_props` métier presentation-only).

### 5.3 Catalogue widget (widget-declaration)

- [ ] Fichier `widgets-catalog-<nom>.json` avec tableau `widgets[]`.
- [ ] `type` = clé utilisée dans `PageManifest.widget_type` (**exact match**, sensible à la casse).
- [ ] `component` : nom documentaire / placeholder ; le **vrai** lien runtime = `registerWidget('<type>', …)` Peintre.
- [ ] Bloc `data_contract` présent si le widget consomme l’API :
  - [ ] `source` aligné tag OpenAPI (ex. `exploitation`)
  - [ ] `operation_id` **identique** à un `operationId` dans `recyclique-api.yaml`
  - [ ] `endpoint_hint` pour humains (non consommé comme vérité code)
  - [ ] `refresh` : `on_mount` | `polling` | `realtime` | `manual`
  - [ ] Si `polling` : `polling_interval_s` ≥ 1 (schéma JSON)
  - [ ] `critical: true` seulement si un état stale doit bloquer des actions sensibles (doc produit)

**Schéma :** [`contracts/creos/schemas/widget-declaration.schema.json`](../../contracts/creos/schemas/widget-declaration.schema.json)

### 5.4 Promotion et gouvernance

- [ ] Nouveau lot **officiel** → sous `contracts/creos/manifests/`, pas de vérité métier **uniquement** dans Peintre_nano.
- [ ] Renommage `operationId` : même PR met à jour YAML + tous les `operation_id` CREOS + tests (B4).
- [ ] `contracts/README.md` ou CHANGELOG contrats mis à jour si nouveau sous-dossier / lot.

**Source :** [`2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`](../artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md) §0, §1 bis, §2.3

---

## 6. Phase B — Slots et rendu déclaratif

**Objectif :** le moteur place les widgets **sans** layout métier dans chaque composant.

### 6.1 Contrat slot (PageManifest)

| Champ | Règle |
|-------|--------|
| `slot_id` | Nom de zone connu du shell / layout (ex. `header`, `main`, `aside`) — pas de slot fantôme non rendu |
| `widget_type` | Clé registre ; doit passer `validateManifestBundle` / allowlist |
| `widget_props` | Objet plat / tableaux / scalaires uniquement ; **pas** de fonctions |

### 6.2 Runtime (socle 3.3)

- [ ] `PageRenderer` passe `widgetProps` au composant enregistré — **seul** pipeline de rendu page.
- [ ] `peintre-nano/src/validation/allowed-widget-types.ts` importe `getRegisteredWidgetTypeSet()` — **aucune** liste parallèle.
- [ ] Widget inconnu → fallback **`degraded`** (`WidgetResolveFallback`), pas de crash silencieux.
- [ ] Plusieurs widgets même `slot_id` : comportement **documenté** (ex. `cashflow-nominal` empile hub + wizard) ; tests si non trivial.

**Code indicatif :** `peintre-nano/src/app/PageRenderer.tsx`, `peintre-nano/src/registry/widget-registry.ts`

### 6.3 Checklist enregistrement widget (4.2)

- [ ] Fichier `register-<domaine>-widgets.ts` importé depuis `registry/index.ts` au boot (side-effect, même pattern que `register-demo-widgets.ts`).
- [ ] `registerWidget('<widget_type>', Composant)` avec `<widget_type>` = `type` du catalogue CREOS.
- [ ] Composant sous `peintre-nano/src/domains/<domaine>/` + `*.module.css`.
- [ ] Props via `RegisteredWidgetProps` ; types métier depuis `contracts/openapi/generated/recyclique-api.ts` — **pas** de duplication manuelle du schéma OpenAPI.
- [ ] README domaine : liens vers manifests reviewables, suite des stories (fetch, fallback, toggle).

**Story :** `_bmad-output/implementation-artifacts/3-3-implementer-le-registre-minimal-de-widgets-slots-et-rendu-declaratif.md`, `4-2-implementer-le-widget-bandeau-live-dans-le-registre-peintre-nano.md`

---

## 7. Phase C — `data_contract.operation_id` et branchement API

**Objectif :** une seule clé stable relie CREOS, codegen et client HTTP.

### 7.1 Alignement OpenAPI (bloquant reviewable)

- [ ] `data_contract.operation_id` **==** `operationId` dans `contracts/openapi/recyclique-api.yaml` (caractère pour caractère).
- [ ] Opération **implémentée** ou mock **balisé** non présenté comme prod (PRD §4.2).
- [ ] Après changement YAML : `npm run generate` dans `contracts/openapi/` ; commiter `generated/recyclique-api.ts` si le repo le exige.

### 7.2 Client et runtime (4.3)

- [ ] Client dédié ou partagé sous `peintre-nano/src/api/` (ex. `live-snapshot-client.ts`).
- [ ] En-tête **`X-Correlation-ID`** sur les appels live documentés (UUID par requête).
- [ ] Respect `refresh` / `polling_interval_s` du catalogue (ou override **documenté** si produit impose autre cadence).
- [ ] `params_from_props` / `params_from_context` : mapping explicite vers query/path/body — pas de paramètres « magiques ».
- [ ] Le widget **n’invente pas** de champs hors payload OpenAPI typé.

### 7.3 États données widget

| Code CREOS (schéma) | Usage attendu |
|---------------------|---------------|
| `DATA_LOADING` | Fetch en cours |
| `DATA_OK` | Payload valide affiché |
| `DATA_DEGRADED` | Payload partiel ou signal backend dégradé |
| `DATA_ERROR` | Erreur HTTP / parse / réseau |
| `DATA_STALE` | Fraîcheur insuffisante ; si `critical: true`, bloquer actions sensibles |

**Schéma :** `contracts/creos/schemas/widget-data-states.schema.json` — distinct du type TS `WidgetDataState` (PRD §10.1).

**Story :** `4-3-brancher-la-source-backend-reelle-et-les-cas-douverture-decalee.md`

---

## 8. Phase D — Flows et workflow steps (Peintre)

**Distinction taxonomique (pack [`02-MOD-taxonomie-types-de-modules.md`](02-MOD-taxonomie-types-de-modules.md)) :**

| Type | Mécanisme front | Exemple |
|------|-----------------|---------|
| **Slice transverse** | Navigation + page + widget(s) CREOS | Bandeau live Epic 4 |
| **Widget + flow interne** | `FlowRenderer` + panels dans un `widget_type` | `cashflow-nominal-wizard`, `cashflow-close` |
| **Workflow step module** | Étape dans un parcours métier (clôture, comptage) | Pilote #2 comptage pièces/billets — **fiche `08`**, pas seulement JSON config |

### 8.0 Patron slice vs workflow step — fiche + manifest CREOS (pas registre central)

> **Source normative :** [`references/artefacts/2026-05-20_04_reponse-architecte-bouclage-modules-v2.md`](../artefacts/2026-05-20_04_reponse-architecte-bouclage-modules-v2.md) §B.2 (bouclage architecte 2026-05-20). Complément : [`2026-05-20_05_notes-architecte-loup-de-mer-modules-v2.md`](../artefacts/2026-05-20_05_notes-architecte-loup-de-mer-modules-v2.md).

**Tranche : patron par fiche + manifest CREOS.** Pas de registre central des points d'entrée — chaque module se déclare par ses manifests CREOS reviewables + sa fiche cookbook. Le seul registre est [`05-MOD-registre-module-key.md`](05-MOD-registre-module-key.md) (`module_key` = whitelist/gouvernance), **pas** un catalogue de hooks. Cohérent DEC-PLAT (pas de couche plateforme) et D-01 (CREOS au centre).

| Critère | **Slice transverse** | **Workflow step** |
|---------|----------------------|-------------------|
| Déclaration UI | `PageManifest` + slot transverse (`header`/`aside`) ; entrée navigation dédiée | Panel **dans** un flow existant (`flow_id` / `workflow_id`), `widget_props` du wizard hôte — **pas** de page orpheline |
| Manifest type | `navigation-<slice>.json` + `page-<slice>.json` + `widgets-catalog-<slice>.json` | extension du `page-<flow>.json` hôte + catalogue widget du panel |
| Point d'insertion | slot nommé connu du shell | étape ordonnée du flow ; rendu conditionné `module_key` actif |
| Données | `data_contract.operation_id` ↔ OpenAPI ; souvent lecture | idem + persistance métier dédiée (tables) si état à conserver |
| Activation off | slice non rendu (skip slot) | étape sautée (skip gracieux) ou hôte inchangé |
| Référence | [`20-MOD-peintre-code-refs-bandeau-live.md`](20-MOD-peintre-code-refs-bandeau-live.md) (`kpi-live-banner`, slice) | patron générique `workflow_id` + panel ; illustration nommée : comptage ([`08-MOD-exemple-pilote-comptage-pieces-billets.md`](08-MOD-exemple-pilote-comptage-pieces-billets.md) §11) — métier **reporté** |

**Règle d'or commune :** ni slice ni step ne crée route/permission/page absente des contrats amont (AR39). Slice et step partagent les phases cookbook 0→8 ; seule la **phase 4 (front CREOS)** diffère (slot transverse vs panel de flow).

Sources : `04-MOD` §8–§9, `02-MOD` §4.5, `20-MOD`, `08-MOD` §11.

### 8.1 FlowRenderer (parcours multi-étapes **dans** un widget)

- [ ] Ne **pas** créer un second `PageManifest` pour chaque URL legacy si le produit accepte un **alias runtime** vers un `page_key` unique (doc 03-contrats).
- [ ] Flow identifié par `flowId` stable (ex. `cashflow-close`) ; panels ordonnés ; état actif testé.
- [ ] Actions sensibles (vente, clôture, remboursement) : appels via clients API + `operationId` OpenAPI — le flow **orchestre** l’UI, Recyclique **décide** métier.
- [ ] Présentation kiosque : `presentation: 'kiosk_steps'` si applicable — **hors** manifest CREOS (code widget).

**Code :** `peintre-nano/src/flows/FlowRenderer.tsx`, domaines `peintre-nano/src/domains/cashflow/`

### 8.2 Workflow step (module type « comptage »)

Checklist cible pour un **nouveau module optionnel** qui est une **étape** et non un bandeau transverse :

- [ ] Étape nommée dans le flow parent (clôture caisse, etc.) — **documenter** l’insertion (ordre, garde, sortie).
- [ ] Persistance métier : tables / API dédiées (protocole back `03`) — pas seulement `widget_props`.
- [ ] Si config par site : `module_key` + schéma sous [`references/config-modules-site-id/schemas/`](../../references/config-modules-site-id/schemas/) — ex. futur `comptage-pieces-billets`, distinct de `kpi-live-banner.v1.json`.
- [ ] Manifests CREOS : soit extension du `PageManifest` existant (slot supplémentaire), soit page dédiée **si** la navigation l’exige — éviter la duplication d’alias legacy.

**Référence métier :** [`dossier-architecte-externe-v2/07-ARCH-todos-et-questions-architecte.md`](../dossier-architecte-externe-v2/07-ARCH-todos-et-questions-architecte.md) (T-MET-1)

### 8.3 Raccourcis / navigation déclarative

- [ ] `shortcut_id` dans navigation si le slice est atteignable par raccourci — cohérence avec stories Peintre workflows (hors bandeau minimal).
- [ ] Ne pas coder de routes métier dans le shell : tout passe par manifest + résolution `path` → `page_key`.

### 8.4 Modules imbriqués et multi-hôtes (transcript `0c9a9709`)

**Pattern produit (pilote bandeau, ~2026-04-19) :** **un** `module_key` / widget (`kpi-live-banner` / `bandeau-live`), **plusieurs hôtes** CREOS (caisse, réception, sandbox) — pas un second `PageManifest` par écran legacy.

| Concept | Règle pack |
|---------|------------|
| **Slice transverse** | Même `widget_type` dans plusieurs `page_key` ; prefs d’affichage par flux via payload config (`show_on_caisse`, `show_on_reception`) |
| **Admin « Gestion des modules »** | Panneau **imbriqué** dans l’écosystème modules (cible Story **9.6**, route type `/admin/modules`) — **pas** un mini réglages généralisé hors registre |
| **Transitoire front** | `localStorage` / bundle KPI documenté dans le transcript = **dette** explicite ; vérité cible = backend + [`05-MOD-registre-module-key.md`](05-MOD-registre-module-key.md) §6 |
| **Workflow step** | Étape **dans** un flow parent (`cashflow-close`, etc.) — voir §8.2 ; ne pas confondre avec slice header |

**Index transcript :** [`12-MOD-index-transcripts-modularite.md`](12-MOD-index-transcripts-modularite.md) — UUID `0c9a9709-d1f8-406b-a9ea-26ff2c59a7fd`. Code reviewable : [`20-MOD-peintre-code-refs-bandeau-live.md`](20-MOD-peintre-code-refs-bandeau-live.md).

---

## 9. Phase E — Activation par site / module

**Objectif :** couper ou activer un module **sans** faux état réseau et **sans** `UserRuntimePrefs` comme vérité métier.

### 9.1 États transitoires vs cible (Story 9.6 + ADR-001)

| Mécanisme | Statut | Front |
|-----------|--------|-------|
| Flag dans `Site.configuration` / champ snapshot (ex. bandeau live 4.5) | **Transitoire** Epic 4 | Branche widget **avant** poll inutile ; état DOM explicite |
| JSON `site_id` + `module_key` + payload versionné | **Cible** ADR-001 | Lecture via API module-config ; schéma ex. [`kpi-live-banner.v1.json`](../config-modules-site-id/schemas/kpi-live-banner.v1.json) |
| Surcharges admin PostgreSQL (ADR P2) | **Cible** | Fusion à la lecture : manifest **primaire**, PG **surcharges** |

### 9.2 Checklist activation (modèle 4.5)

- [ ] Signal « module off » **autoritaire backend** (ou fusion serveur → manifest), pas un toggle local navigateur seul.
- [ ] UI désactivée : copy opérateur claire ; code stable `BANDEAU_LIVE_MODULE_DISABLED` ou préfixe domaine cohérent.
- [ ] `reportRuntimeFallback` avec sévérité `info` ou `degraded` — **pas de silence**.
- [ ] `data_contract.operation_id` **inchangé** : la désactivation ne remplace pas l’`operationId` du poll.
- [ ] Traçabilité : audit / log structuré côté back (qui, quand, site) — hors impl front mais **contrat** à vérifier en intégration.
- [ ] Commentaire dette : mécanisme **provisoire**, remplacement Story 9.6 — pas de « mini admin settings » généralisé.

**Stories :** `4-5-ajouter-un-toggle-admin-minimal-borne-au-module-bandeau-live.md` ; epics Story 9.6 (`_bmad-output/planning-artifacts/epics.md`)

### 9.3 Impact composition

- [ ] Option A : widget toujours monté, branche interne « disabled ».
- [ ] Option B : slot retiré / type placeholder par fusion manifeste côté serveur — **testé** et documenté.
- [ ] Pas de contournement hors `PageRenderer` + registre.

---

## 10. Phase F — Fallbacks et rejets (3.6 + 4.4)

**Objectif :** la preuve modulaire inclut l’**échec** observable, pas seulement le nominal.

### 10.1 Sévérités runtime

| Sévérité | Comportement page | Exemple slice |
|----------|-------------------|---------------|
| `info` | Reste utilisable ; signal faible | Nav vide, prefs |
| `degraded` | Widget ou zone en échec ; reste de la page intact (UX-DR10) | Widget inconnu, bandeau dégradé |
| `blocked` | Page ou shell bloqué | Manifest invalide, accès refusé |

**API :** `reportRuntimeFallback` — `peintre-nano/src/runtime/report-runtime-fallback.ts`  
**Doc :** `peintre-nano/src/runtime/README.md` (story 3.6)

### 10.2 Checklist widget domaine

- [ ] Attributs DOM stables : `data-runtime-severity`, `data-runtime-code`, attributs domaine (ex. `data-bandeau-state`).
- [ ] Codes d’erreur **préfixés** par domaine (`BANDEAU_LIVE_*`) — pas de messages opaques seuls.
- [ ] Erreur fetch : `data-correlation-id` (ou équivalent) **testable** — lien UI ↔ `X-Correlation-ID`.
- [ ] Pas de faux « tout va bien » sur surface live (vert métier simulé).
- [ ] Échec **non critique** : widgets voisins du même `PageManifest` restent rendus (test compose bac à sable).
- [ ] Variantes d’échec en **fixtures test** — ne pas casser les JSON reviewables canoniques sous `contracts/creos/manifests/`.

### 10.3 Manifest / validation

- [ ] Bundle invalide → chargement `blocked` (3.2).
- [ ] `widget_type` inconnu → `degraded` sur le slot, pas crash global.
- [ ] Tests contract Epic 4 : `peintre-nano/tests/contract/creos-bandeau-live-manifests-4-1.test.ts` **verts** après toute modif manifests pilote.

**Story :** `4-4-rendre-visibles-les-fallbacks-et-rejets-du-slice-bandeau-live.md`

---

## 11. Phase G — Intégration application servie (4.6b + 4.6)

**Objectif :** la preuve humaine utilise le **même** artefact que la CI locale.

### 11.1 Bundle chargé en prod / docker local

- [ ] `App.tsx` / shell servi charge les manifests **Epic 4** (fetch ou bundle `runtime-demo-manifest.ts` synchronisé).
- [ ] Résultat chargement **OK** hors Vitest seul.
- [ ] URL documentée (ex. `http://localhost:4444/bandeau-live-sandbox`) → `page_key` attendu.
- [ ] Cohabitation **claire** avec démo Epic 3 (pas de suppression brutale du socle démo).

### 11.2 Contexte et permissions

- [ ] Adaptateur démo / live auth fournit les `required_permission_keys` du manifest (**documenté**).
- [ ] Aucun contournement opaque (hack local non tracé).

### 11.3 Preuve réseau (4.3 + 4.6)

- [ ] Onglet réseau : `GET /v2/exploitation/live-snapshot` (ou opération du module) avec **`X-Correlation-ID`**.
- [ ] Polling conforme au catalogue si activé.

**Stories :** `4-6b-raccorder-le-slice-bandeau-live-dans-lapplication-peintre-nano-reellement-servie.md`, `4-6-valider-la-chaine-complete-backend-contrat-manifest-runtime-rendu-fallback.md`

---

## 12. Vérifications et tests (minimum)

| Niveau | Commande / fichier | Quand |
|--------|---------------------|-------|
| Contrat manifests | `peintre-nano/tests/contract/creos-*-manifests-*.test.ts` | Après toute modif `contracts/creos/manifests/` du slice |
| Unit registre / widget | `peintre-nano/tests/unit/<domaine>-*.test.tsx` | Après `registerWidget` |
| Compose / e2e jsdom | `peintre-nano/tests/e2e/*-compose.e2e.test.tsx` | Fallbacks + activation |
| OpenAPI drift | `cd contracts/openapi && npm run generate` | Après modif YAML |
| Chaîne complète | Story 4.6 test plan | Gate Convergence 2 |

**Ne pas** présenter une démo `public/manifests/` seule comme preuve du module reviewable.

---

## 13. Anti-patterns (rejeter en revue)

| Anti-pattern | Pourquoi |
|--------------|----------|
| Widget rendu uniquement via import direct dans `App.tsx` | Contourne registre + manifests |
| Deux listes de `widget_type` (validation vs registre) | Dérive garantie (régression 3.3) |
| `operation_id` CREOS sans entrée OpenAPI (lot reviewable) | Casse AR39 et CI future |
| Second manifest CREOS pour alias legacy déjà couverts par runtime | Double vérité composition |
| Toggle « off » uniquement en `localStorage` | Violation hiérarchie / Story 4.5 |
| Permissions calculées dans le widget | Sécurité — backend seul |
| Styles Mantine / Tailwind dans `widget_props` JSON | Violation ADR P1 + SDUI |
| Édition manuelle de `contracts/openapi/generated/*.ts` | Drift — regénérer depuis YAML |
| Copier des paragraphes PRD/epics dans `references/protocole-*` | Utiliser `refs_first` (liens) |

---

## 14. Traçabilité stories → sections

| Story | Fichier `_bmad-output/implementation-artifacts/` | Sections protocole |
|-------|---------------------------------------------------|-------------------|
| 3-3 | [`3-3-implementer-le-registre-minimal-de-widgets-slots-et-rendu-declaratif.md`](../../_bmad-output/implementation-artifacts/3-3-implementer-le-registre-minimal-de-widgets-slots-et-rendu-declaratif.md) | §6, §13 |
| 3-6 | [`3-6-rendre-visibles-les-fallbacks-et-rejets-de-runtime.md`](../../_bmad-output/implementation-artifacts/3-6-rendre-visibles-les-fallbacks-et-rejets-de-runtime.md) | §10 |
| 4-1 | [`4-1-publier-le-contrat-et-les-manifests-minimaux-du-module-bandeau-live.md`](../../_bmad-output/implementation-artifacts/4-1-publier-le-contrat-et-les-manifests-minimaux-du-module-bandeau-live.md) | §5, §7.1 |
| 4-2 | [`4-2-implementer-le-widget-bandeau-live-dans-le-registre-peintre-nano.md`](../../_bmad-output/implementation-artifacts/4-2-implementer-le-widget-bandeau-live-dans-le-registre-peintre-nano.md) | §6.3 |
| 4-3 | [`4-3-brancher-la-source-backend-reelle-et-les-cas-douverture-decalee.md`](../../_bmad-output/implementation-artifacts/4-3-brancher-la-source-backend-reelle-et-les-cas-douverture-decalee.md) | §7.2 |
| 4-4 | [`4-4-rendre-visibles-les-fallbacks-et-rejets-du-slice-bandeau-live.md`](../../_bmad-output/implementation-artifacts/4-4-rendre-visibles-les-fallbacks-et-rejets-du-slice-bandeau-live.md) | §10 |
| 4-5 | [`4-5-ajouter-un-toggle-admin-minimal-borne-au-module-bandeau-live.md`](../../_bmad-output/implementation-artifacts/4-5-ajouter-un-toggle-admin-minimal-borne-au-module-bandeau-live.md) | §9 |
| 4-6 | [`4-6-valider-la-chaine-complete-backend-contrat-manifest-runtime-rendu-fallback.md`](../../_bmad-output/implementation-artifacts/4-6-valider-la-chaine-complete-backend-contrat-manifest-runtime-rendu-fallback.md) | §11, §12 |
| 4-6b | [`4-6b-raccorder-le-slice-bandeau-live-dans-lapplication-peintre-nano-reellement-servie.md`](../../_bmad-output/implementation-artifacts/4-6b-raccorder-le-slice-bandeau-live-dans-lapplication-peintre-nano-reellement-servie.md) | §11 |
| 1-4 | [`1-4-fermer-la-gouvernance-contractuelle-openapi-creos-contextenvelope.md`](../../_bmad-output/implementation-artifacts/1-4-fermer-la-gouvernance-contractuelle-openapi-creos-contextenvelope.md) | §2.1, §5.4 |

**Planning (ne pas recopier) :** `_bmad-output/planning-artifacts/prd.md` §4.2, §12.2 ; `_bmad-output/planning-artifacts/epics.md` Epic 3, Epic 4, Story 9.6.

---

## 15. Références `refs_first` (hors pack)

| Sujet | Chemin |
|-------|--------|
| Frontend synthèse architecte | [`references/dossier-architecte-externe-v2/05-ARCH-frontend-peintre-creos-contrats.md`](../dossier-architecte-externe-v2/05-ARCH-frontend-peintre-creos-contrats.md) |
| Gouvernance contrats (pivot) | [`references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`](../artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md) |
| Gouvernance contrats (pack modules, L-11) | [`21-MOD-gouvernance-contrats-modules.md`](21-MOD-gouvernance-contrats-modules.md) |
| ADR stack + config admin | [`references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md`](../peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md) |
| Signaux bandeau live | [`references/artefacts/2026-04-02_07_signaux-exploitation-bandeau-live-premiers-slices.md`](../artefacts/2026-04-02_07_signaux-exploitation-bandeau-live-premiers-slices.md) |
| Config modules site | [`references/config-modules-site-id/index.md`](../config-modules-site-id/index.md), ADR-001 |
| Peintre — périmètre | [`peintre-nano/docs/01-perimetre-et-positionnement.md`](../../peintre-nano/docs/01-perimetre-et-positionnement.md) |
| Peintre — runtime | [`peintre-nano/docs/02-architecture-runtime.md`](../../peintre-nano/docs/02-architecture-runtime.md) |
| Peintre — CREOS & données | [`peintre-nano/docs/03-contrats-creos-et-donnees.md`](../../peintre-nano/docs/03-contrats-creos-et-donnees.md) |
| Peintre — guide dev | [`peintre-nano/docs/04-guide-developpeur.md`](../../peintre-nano/docs/04-guide-developpeur.md) |
| Peintre — monorepo | [`peintre-nano/docs/05-monorepo-et-extraction.md`](../../peintre-nano/docs/05-monorepo-et-extraction.md) |
| Peintre — index docs | [`peintre-nano/docs/README.md`](../../peintre-nano/docs/README.md) |
| Peintre — domaine bandeau (code) | [`peintre-nano/src/domains/bandeau-live/README.md`](../../peintre-nano/src/domains/bandeau-live/README.md) |
| Peintre — runtime fallbacks | [`peintre-nano/src/runtime/README.md`](../../peintre-nano/src/runtime/README.md) |
| Contrats racine | [`contracts/README.md`](../../contracts/README.md), [`contracts/creos/schemas/README.md`](../../contracts/creos/schemas/README.md) |
| Tests contract Peintre | [`peintre-nano/tests/contract/README.md`](../../peintre-nano/tests/contract/README.md) |
| Cookbook unifié (suite pack) | [`06-MOD-cookbook-nouveau-module-optionnel.md`](06-MOD-cookbook-nouveau-module-optionnel.md) |
| Code reviewable pilote #1 | [`20-MOD-peintre-code-refs-bandeau-live.md`](20-MOD-peintre-code-refs-bandeau-live.md) |

### 15.1 CI Epic 10 et merge manifests (lacune **L-11**)

**Aujourd’hui (hors pipeline GitHub Epic 10) :** les règles AR39 / B4 sont **opérationnelles** via discipline PR + Vitest local — voir checklist **G1–G13** dans [`21-MOD-gouvernance-contrats-modules.md`](21-MOD-gouvernance-contrats-modules.md) §7.

| Story Epic 10 | Apport pour modules CREOS |
|---------------|---------------------------|
| **10.1** | CI minimale `recyclique` + `peintre-nano` + zone `contracts/` |
| **10.2** | Chaîne OpenAPI → `generated/` → consommation front |
| **10.3** | **Bloquer merge** sur dérive `operation_id` reviewables vs YAML ; validation schémas manifests |

**Exigence pack avant CI automatisée :** sur toute PR touchant `contracts/creos/manifests/` d’un slice officiel, exécuter `npm run test` dans `peintre-nano/` (incl. `tests/contract/creos-*-manifests-*.test.ts`) et traiter l’échec comme **bloquant** — même sans workflow Epic 10.

**Planning :** [`_bmad-output/planning-artifacts/epics.md`](../../_bmad-output/planning-artifacts/epics.md) Epic 10 · story **1.4** done = règles ; Epic 10 = **outillage**.

---

## 16. Critère « module front prêt »

Un slice / module optionnel côté front est considéré **prêt pour revue architecte** lorsque :

1. Les manifests **reviewables** sont sous `contracts/creos/manifests/` et passent les tests contract du slice.
2. Chaque `data_contract.operation_id` reviewable résout vers un `operationId` OpenAPI existant.
3. Le widget est enregistré, stylé ADR P1, branché API si prévu, avec fallbacks et codes stables testés.
4. L’activation est **backend-gouvernée** (ou fusion documentée), avec état désactivé explicite.
5. L’application **servie** (docker / Vite prod locale) montre le parcours documenté sans harness jsdom seul.
6. La checklist §4 est **entièrement cochée** ou les écarts sont listés dans [`09-MOD-lacunes-et-questions-ouvertes.md`](09-MOD-lacunes-et-questions-ouvertes.md) avec HITL Strophe.

---

## 17. Gardien du seuil — conscience d'affichage (L-16, T-PEINT-1)

**Décision (2026-05-20) :** toute modification d'affichage initiée par un **module** (manifeste, widget, étape de flow) ou un **agent** passe par un **réceptacle** « gardien du seuil » dans Peintre_nano. Un agent IA peut **simuler l'utilisateur** (attentes, ergonomie, cohérence parcours) et **valider** ou **repenser** la proposition avant rendu effectif.

| Phase v2 | Comportement attendu |
|----------|----------------------|
| **Cadrage** | Définir les **points d'accroche** : après résolution `PageManifest`, avant `registerWidget` render, entrée/sortie `FlowRenderer`, post-merge activation `module_key`. |
| **Impl. minimale** | Branchements + **bypass** documenté (chemin direct inchangé pour Epic 4 / modules actuels) ; feature flag ex. `display_guardian_enabled`. |
| **Actif** | Gardien **bloque ou réécrit** via outils (TBD) : patch props/slot, réordonnancement étape, fallback `reportRuntimeFallback`, proposition patch `contracts/creos/manifests/`. |

**Ne pas confondre avec :** `reportRuntimeFallback` (erreur technique) — le gardien porte le **jugement UX** ; les deux peuvent se combiner.

**Suivi :** idée Kanban [`references/idees-kanban/a-creuser/2026-05-20_peintre-gardeien-seuil-conscience-affichage.md`](../idees-kanban/a-creuser/2026-05-20_peintre-gardeien-seuil-conscience-affichage.md) · dossier architecte [`05-ARCH-frontend-peintre-creos-contrats.md`](../dossier-architecte-externe-v2/05-ARCH-frontend-peintre-creos-contrats.md) §7.4 · lacune [`09`](09-MOD-lacunes-et-questions-ouvertes.md) **L-16** · pont [`22`](22-MOD-dossier-architecte-pont-t-mod.md) **T-PEINT-1**.

---

_Protocole front CREOS — pack protocole modules Recyclique. Template Epic 4 ; ne pas confondre avec les livrables BMAD ni la promotion post-HITL dans `contracts/`._
