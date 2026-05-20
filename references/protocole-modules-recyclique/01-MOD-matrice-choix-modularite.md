# 01 — Matrice de choix — modularité v0.1 ↔ v2

**Statut :** brouillon normatif du pack `references/protocole-modules-recyclique/`  
**Date :** 2026-05-20  
**Audience :** architecte, agents BMAD, dev — lecture autonome  
**Objectif :** arbitrer, par **dimension technique**, ce qui est **conservé**, **remplacé**, **abandonné** ou **reporté post-v2**, avec la **décision retenue** pour Recyclique v2.

**Prérequis pack :** [`00-MOD-plan-redaction-modules.md`](00-MOD-plan-redaction-modules.md) (§4.1 double récit).

---

## 1. Comment lire ce document

### 1.1 Colonnes de statut

| Statut | Signification |
|--------|----------------|
| **Conservé** | Principe ou mécanisme v0.1 **retrouvé** sous une autre forme v2 (nom, couche ou artefact différent). |
| **Remplacé** | L’option v0.1 n’est plus la source de vérité ; la v2 impose un autre mécanisme **documenté** comme nominal. |
| **Abandonné** | Exclu du périmètre v2 (dette assumée ou sur-ingénierie pour le contexte actuel). |
| **Post-v2** | Piste valide **après** preuve de la chaîne modulaire v2 ; pas prérequis sprint. |

### 1.2 Règle `refs_first`

Les décisions produit et la chaîne « 7 briques » restent dans le PRD et les stories d’implémentation — **cité, non recopié** :

- `_bmad-output/planning-artifacts/prd.md` — §4.2 (modularité de bout en bout), §5 (double flux), §14 (versionnement contrats)
- `_bmad-output/planning-artifacts/epics.md` — Epic 3 (Peintre), Epic 4 (preuve bandeau live), Story 9.6 (config admin)
- Stories pilote : `_bmad-output/implementation-artifacts/4-1-*.md` … `4-6b-*.md`

Ce fichier **réconcilie** le design modules de février 2026 avec la ligne v2 (mars–mai 2026).

### 1.3 Recherches externes — distillat (ne pas dupliquer)

Les prompts/réponses Perplexity et BMAD (fév.–mars 2026) sont dans [`references/recherche/`](../recherche/) — **ne pas** recopier les réponses intégrales dans ce fichier.

| Besoin | Document pack |
|--------|----------------|
| Synthèse readonly (Pluggy, Stevedore, Peintre_nano, Redis, SDUI) | [`11-MOD-synthese-recherches-modularite.md`](11-MOD-synthese-recherches-modularite.md) |
| Décisions normatives par dimension | **Ce fichier** §3 + [`07-MOD-adr-reconciliation-v01-v02.md`](07-MOD-adr-reconciliation-v01-v02.md) |
| Crosswalk checklist v0.1 | [`19-MOD-checklist-v0-1-vs-pack.md`](19-MOD-checklist-v0-1-vs-pack.md) |

**Règle :** en cas d’écart entre une **recommandation brute** de recherche et la matrice `01` / l’ADR-007, priorité au **pack** après HITL — la recherche informe, elle ne promouvoie pas.

### 1.4 Pilotes de validation

| Pilote | Rôle | Référence |
|--------|------|-----------|
| **#1 Bandeau live** | Preuve de la **chaîne complète** (contrat → manifest CREOS → runtime → fallback → activation) | `references/artefacts/2026-04-02_07_signaux-exploitation-bandeau-live-premiers-slices.md` ; `references/config-modules-site-id/schemas/kpi-live-banner.v1.json` |
| **#2 Comptage pièces/billets** | Validation **workflow step** + données métier + Paheko (hors seul JSON config) | `references/dossier-architecte-externe-v2/07-ARCH-todos-et-questions-architecte.md` (T-MET-1) ; Epic 6 (`epics.md`) |

---

## 2. Synthèse exécutive

| Dimension | v0.1 (fév. 2026) | Décision v2 retenue | Statut global |
|-----------|------------------|---------------------|---------------|
| **Manifeste** | `module.toml` (TOML) par module Python | Manifests **CREOS** (JSON) + contrats **OpenAPI** ; catalogue widgets / pages | **Remplacé** (UI) ; TOML **abandonné** comme manifeste unique |
| **Activation** | `config.toml` `[modules] enabled` | Registre serveur + **JSON par `site_id` / `module_key`** (ADR-001) ; toggles admin (Story 9.6) | **Remplacé** |
| **Hooks / événements** | **Redis Streams** / `EventBus` générique | Événements métier + **outbox** sync Paheko ; pas de bus documenté v2 | **Remplacé** (nom et périmètre) ; principe async multi-workers **conservé** |
| **UI** | Monorepo React, `ModuleSlot`, lazy routes | **Peintre_nano** + CREOS + `data_contract.operation_id` | **Remplacé** (stack) ; slots **conservés** (concept) |
| **Persistance config module** | Fichiers instance (`config.toml`) | API REST JSON versionnée, **JSONB** indexé `site_id` + `module_key` | **Remplacé** |
| **Contrat code backend** | `ModuleBase` + loader TOML | Packages FastAPI + feature flags / registre ; pas de loader TOML documenté v2 | **Remplacé** |
| **Modules tiers** | Entry points setuptools (porte ouverte) | First-party v2 ; marketplace **post-v2** | **Post-v2** |

**Ligne directrice stable :** un module n’est modulaire que si la **chaîne complète** existe (PRD §4.2) — pas parce qu’un écran ou un fichier TOML existe.

Sources pivot : [`references/vision-projet/2026-03-31_decision-directrice-v2.md`](../vision-projet/2026-03-31_decision-directrice-v2.md), [`references/artefacts/2026-02-24_07_design-systeme-modules.md`](../artefacts/2026-02-24_07_design-systeme-modules.md).

---

## 3. Matrice par dimension

### 3.1 Manifeste et découverte

| Option / brique | v0.1 | v2 | Post-v2 | Statut | Décision retenue |
|-----------------|------|-----|---------|--------|------------------|
| **`module.toml` (TOML)** — nom, version, `permissions`, `ui.routes`, `ui.slots`, `dependencies` | Proposé comme manifeste **unique** par module backend | Non retenu comme contrat UI ; pas de loader TOML documenté dans la chaîne v2 | Réutilisation possible **métadonnées backend-only** si un package Python l’exige — **à trancher HITL** (**Q-HITL-07**) | **Abandonné** (manifeste transverse UI) | **CREOS** + OpenAPI portent le contrat reviewable ; TOML **backend-only** / infra : voir [`07-adr`](07-MOD-adr-reconciliation-v01-v02.md) **annexe E** · [`19-MOD-checklist-v0-1-vs-pack.md`](19-MOD-checklist-v0-1-vs-pack.md) **DS-01** |
| **Manifest JSON « module » générique** (recherche Peintre, §6.2) | — | Aligné sur **CREOS** : `NavigationManifest`, `PageManifest`, `widget-declaration` | Extension catalogue + chargement contrôlé tiers | **Conservé** (esprit) / **Remplacé** (schéma) | Schémas dans `contracts/creos/schemas/` ; promotion `contracts/creos/` post-revue |
| **Découverte monorepo** (`importlib`, répertoires `recyclic.modules.*`) | Modules internes en répertoires, pas de pip par module | Packages / apps dans monorepo brownfield `recyclique-1.4.4` | Entry points pour modules **distribués** | **Conservé** | Chargement **interne** au déploiement ; pas de packaging pip par module métier en v2 |
| **Entry points setuptools** (`recyclic.modules`) | Porte ouverte modules tiers | **Hors scope v2** (first-party) | Marketplace : installation packages signés | **Post-v2** | Ne pas implémenter la découverte tiers avant gouvernance sécurité (cf. hypothèse marketplace) |
| **Stevedore / Pluggy** (recherche Perplexity 2026-02-24) | Évalués pour hooks / drivers | Non retenus comme socle v2 | Pluggy si hooks multi-auteurs deviennent nécessaires | **Abandonné** (v2) | Lifecycle FastAPI + registre maison ; **outbox** / jobs pour async inter-modules |
| **Scan répertoire non conventionné** | Écarté (fragile) | Écarté | — | **Abandonné** | — |

**Références :** [`2026-02-24_07_design-systeme-modules.md`](../artefacts/2026-02-24_07_design-systeme-modules.md) ; [`2026-02-24_frameworks-modules-python_perplexity_reponse-1.md`](../recherche/2026-02-24_frameworks-modules-python_perplexity_reponse-1.md), [`reponse-2.md`](../recherche/2026-02-24_frameworks-modules-python_perplexity_reponse-2.md) ; [`2026-03-31_brique-nano-peintre-modularite-json-ui_perplexity_reponse.md`](../recherche/2026-03-31_brique-nano-peintre-modularite-json-ui_perplexity_reponse.md) ; [`05-ARCH-frontend-peintre-creos-contrats.md`](../dossier-architecte-externe-v2/05-ARCH-frontend-peintre-creos-contrats.md).

---

### 3.2 Contrat code backend et lifecycle

| Option / brique | v0.1 | v2 | Post-v2 | Statut | Décision retenue |
|-----------------|------|-----|---------|--------|------------------|
| **`ModuleBase`** — `startup`, `shutdown`, `register_routes`, `register_signals`, `register_ui_extensions` | Contrat ABC unique pour tous les modules | Chaîne PRD §4.2 : contrat métier, récepteur backend, contrat UI, runtime, permissions, fallback | Interface plugin marketplace | **Remplacé** | Patterns **FastAPI** (routers, lifespan, services) + **registre** fonctionnel ; pas de classe `ModuleBase` normative documentée v2 |
| **Loader `config.toml` → `ModuleRegistry`** | Activation + instanciation au boot | Remplacé par config **site** + feature flags + enregistrement explicite des routes OpenAPI | — | **Abandonné** | Pas de loader TOML central documenté |
| **Dépendances inter-modules** (`depends` dans manifeste, validation au boot) | Déclaration + erreur explicite si manquant | Dépendances **métier** (ex. caisse avant Paheko) via spec + tests ; `module_key` / epics | Graphe install marketplace | **Conservé** (principe) | Validation **explicite** au démarrage ou à l’activation admin ; pas de topological sort magique |
| **Modules tiers / sécurité** | Hors scope first-party | Inchangé v2 | Signing, sandbox, kill-switch | **Post-v2** | First-party uniquement jusqu’à hypothèse marketplace |

**Références :** PRD §4.2 ; [`2026-02-24_07_design-systeme-modules.md`](../artefacts/2026-02-24_07_design-systeme-modules.md) (contrat `ModuleBase`).

---

### 3.3 Activation et gouvernance par instance / site

| Option / brique | v0.1 | v2 | Post-v2 | Statut | Décision retenue |
|-----------------|------|-----|---------|--------|------------------|
| **`config.toml` `[modules] enabled = [...]`** | Source de vérité boot instance | Abandonné comme modèle nominal | — | **Abandonné** | — |
| **`bandeau_live_slice_enabled`** (toggle transitoire) | — | Utilisé pendant Epic 4 ; **pas** cible long terme | — | **Remplacé** (transitoire) | Migrer vers modèle **`module_key`** générique (Story 9.6) |
| **Config admin simple** (activation, ordre blocs, variantes) | — | Story 9.6 + panneau SuperAdmin « Gestion des modules » | Éditeur riche / agentique | **Conservé** (objectif) | Pilotage **minimal** shell + modules ; mappings sensibles super-admin |
| **Matrice rôle × `module_key` × site** | Permissions section/level dans `module.toml` | Policy **serveur** + `ContextEnvelope` ; liste blanche `module_key` | Licence commerciale (`licensed`) | **Remplacé** | ADR-001 : reject-early, pas d’IDOR sur `site_id` seul |
| **États d’activation multiples** | Booléen implicite (enabled) | `enabled_by_admin` + registre CREOS ; hypothèse post-v2 : `listed` / `installed` / `licensed` / `visible_in_ui` | Marketplace | **Conservé** (enrichissement) | v2 : au minimum **registre serveur** + toggle admin ; post-v2 : hiérarchie complète |
| **`localStorage` comme source de vérité** | — | **Exclu** (QA2, ADR-001) | Préférences UI non métier locales possibles | **Abandonné** (config module) | **Serveur** = vérité pour config module ; prefs locales = non métier uniquement |

**Références :** [`ADR-001-configuration-modules-json-par-site.md`](../config-modules-site-id/ADR-001-configuration-modules-json-par-site.md) ; [`2026-03-31_decision-directrice-v2.md`](../vision-projet/2026-03-31_decision-directrice-v2.md) (§ Configuration et super-admin) ; `_bmad-output/planning-artifacts/architecture/post-v2-hypothesis-marketplace-modules.md` (§5 états).

**Décision retenue — une source de vérité par type :**

| Type de réglage | Autorité v2 |
|-----------------|-------------|
| Module actif / visible pour un **site** | API config JSON (`site_id` + `module_key`) + policy serveur |
| Structure UI (menu, pages, widgets) | Manifests **CREOS** (build-time, reviewables) |
| Permissions effectives | `ContextEnvelope` + backend Recyclique |
| Préférences d’affichage non métier | `UserRuntimePrefs` (local ou serveur selon spec — hors ADR-001) |

---

### 3.4 Hooks, événements et intégration inter-modules

| Option / brique | v0.1 | v2 | Post-v2 | Statut | Décision retenue |
|-----------------|------|-----|---------|--------|------------------|
| **`EventBus` + Redis Streams** (`events:{name}`, consumer groups, ack) | **Décision finale** v0.1 — multi-workers Gunicorn | Non documenté comme bus **générique** v2 ; PRD : outbox SQL nominal, Redis « file » = ADR sync | Bus événements distribué si charge l’exige | **Remplacé** (périmètre) | **Conserver** : async, durabilité, multi-worker ; **remplacer** : canaux nommés **métier** (outbox Paheko, jobs) plutôt qu’API `bus.emit` universelle |
| **Redis Pub/Sub** | Exclu (pas de persistance) | Exclu | — | **Abandonné** | — |
| **`async-signals`** (in-process) | Exclu (multi-workers) | Exclu | — | **Abandonné** | — |
| **Pluggy** (`@hookspec` / `@hookimpl`) | Écarté v0.1 (sync, overkill) | Écarté v2 | Si hooks tiers multi-auteurs | **Abandonné** (v2) | — |
| **File push Paheko** (stream dédié `push:paheko:*`) | Même stack Redis Streams | Aligné conceptuellement sur **outbox** + workers (brownfield) | — | **Conservé** (principe) / **Remplacé** (implémentation) | Traiter comme **pipeline de sync**, pas comme hook générique ; trancher SQL vs Redis en ADR sync (PRD §5 note) |
| **Signaux métier documentés** (ex. clôture caisse) | `sale_closed`, `member_created` dans exemples | Contrats sync + slices ; signaux bandeau live | Catalogue d’événements versionnés | **Conservé** | Nommer les **événements** dans spec métier / OpenAPI / doc sync, pas dans un bus générique non spécifié |

**Références :** [`2026-02-24_07_design-systeme-modules.md`](../artefacts/2026-02-24_07_design-systeme-modules.md) (§ Hooks) ; PRD §5.1 (politique sync, outbox) ; `references/migration-paheko/` (chaîne outbox).

---

### 3.5 UI, frontend et composition

| Option / brique | v0.1 | v2 | Post-v2 | Statut | Décision retenue |
|-----------------|------|-----|---------|--------|------------------|
| **Monorepo React, un seul build, lazy `import()`** | Retenu (anti builds séparés) | **Peintre_nano** dans monorepo extractible | Module Federation / Piral si écosystème massif | **Conservé** (principe) | Un build reviewable v2 ; lazy via registre widgets |
| **`ModuleSlot` React** (`useModuleExtensions`) | Slots nommés inspirés Paheko snippets | **Slots CREOS** dans `PageManifest` + registre widgets | — | **Conservé** (concept) / **Remplacé** (implémentation) | Slots = `slot_id` dans manifest ; rendu via `PageRenderer` |
| **`register_ui_extensions()` → dict slots** | Côté Python | Côté **manifest CREOS** + catalogue widgets | — | **Remplacé** | UI extensions = artefacts **reviewables**, pas retour Python ad hoc |
| **Piral / pilets / feed dynamique** | Recherche : surdimensionné phase nano | Refus chargement dynamique manifests **tiers hors build** (PRD / AR38) | Mode chargement **contrôlé** extensions | **Post-v2** | **Peintre_nano** maison (option C recherche mars 2026) |
| **Open edX FPF (`PluginSlot` + config)** | Inspiration | Implémenté comme **Peintre_nano** + CREOS | — | **Conservé** (patron) | — |
| **Module Federation (Webpack/Vite)** | Plomberie bas niveau, pas registre | Non requis v2 | Si split multi-apps | **Abandonné** (v2) | — |
| **DivKit / SDUI pur** | Phase ultérieure | **Toute l’UI v2** passe par Peintre, profil **minimal** | Peintre-agent, JSON externe | **Post-v2** (SDUI agent) / **Conservé** (trajectoire) | Stabiliser **CREOS** d’abord ; `data_contract.operation_id` obligatoire |
| **`data_contract` / `operation_id`** | — | Obligatoire pour widgets branchés API | — | **Conservé** | CI : chaque `operation_id` existe dans OpenAPI canonique |
| **Flows / workflow steps** | — | CREOS flows + étapes terrain (clôture, réception) | Éditeur convivial flows | **Conservé** | Pilote #2 = **étape de flow**, pas slice seul |

**Références :** [`2026-03-31_brique-nano-peintre-modularite-json-ui_perplexity_reponse.md`](../recherche/2026-03-31_brique-nano-peintre-modularite-json-ui_perplexity_reponse.md) ; [`2026-03-31_decision-directrice-v2.md`](../vision-projet/2026-03-31_decision-directrice-v2.md) ; [`05-ARCH-frontend-peintre-creos-contrats.md`](../dossier-architecte-externe-v2/05-ARCH-frontend-peintre-creos-contrats.md).

**Risque v0.1 toujours valide :** une frontière monorepo / builds séparés mal tenue au **premier** module UI posait une mauvaise fondation — la v2 répond en imposant **Peintre_nano + CREOS** dès le pilote bandeau live.

---

### 3.6 Persistance et configuration des valeurs

| Option / brique | v0.1 | v2 | Post-v2 | Statut | Décision retenue |
|-----------------|------|-----|---------|--------|------------------|
| **Fichiers `config.toml` / instance** | Activation modules + paramètres boot | Config **déploiement** seulement (infra) ; pas config UI module par utilisateur | — | **Remplacé** | Séparer **infra instance** vs **config module par site** |
| **Tables DDL dédiées par réglage UI** | — | Évité pour préférences module (ADR-001) | — | **Abandonné** (par défaut) | **JSONB** + `schema_version` + `payload` |
| **API REST générique `site_id` + `module_key`** | — | **ADR-001** (proposée) ; brouillon `openapi-module-config.yaml` | Fusion `contracts/openapi/recyclique-api.yaml` post-HITL | **Conservé** | Liste blanche `module_key` alignée CREOS ; **ETag** / **409** ; audit |
| **CREOS = adressage seul** | — | Manifests = **structure** ; valeurs = couche serveur distincte | — | **Conservé** | Ne pas mélanger manifest build-time et valeurs runtime dans le même fichier sans versionning |
| **Merge avec `sites.configuration` / `admin_settings`** | — | **À trancher** (précédence) | — | **Ouvert** (HITL) | Documenter tableau de précédence dans `07-adr` / `09-lacunes` |
| **Données métier module** (ex. comptage clôture) | Tables métier implicites | **Tables métier** + éventuellement JSON config pour **préférences** | — | **Conservé** | **Distinction obligatoire** : config UI (JSON ADR-001) ≠ état métier (SQL) |

**Références :** [`ADR-001-configuration-modules-json-par-site.md`](../config-modules-site-id/ADR-001-configuration-modules-json-par-site.md) ; [`references/config-modules-site-id/livrable-normatif-architecture.md`](../config-modules-site-id/livrable-normatif-architecture.md).

---

## 4. Chaîne modulaire v2 — mapping des 7 briques (PRD §4.2)

Le PRD exige six briques explicites (+ la chaîne dans son ensemble). Tableau de correspondance **v0.1 → v2** :

| # | Brique PRD §4.2 | Équivalent v0.1 | Artefact / mécanisme v2 retenu | Statut transition |
|---|-----------------|-----------------|--------------------------------|-------------------|
| 1 | Contrat métier | Logique dans module Python + `module.toml` permissions | OpenAPI + schémas métier + spec domaine (ex. caisse/compta) | **Remplacé** |
| 2 | Récepteur backend | `register_routes`, `register_signals` | Routers FastAPI, services, **outbox** / jobs | **Remplacé** |
| 3 | Contrat UI | `module.toml` `[ui]`, `register_ui_extensions` | **CREOS** (`NavigationManifest`, `PageManifest`, `widget-declaration`) | **Remplacé** |
| 4 | Runtime frontend | `ModuleSlot`, lazy routes React | **Peintre_nano** (registre, `PageRenderer`, fallbacks) | **Remplacé** |
| 5 | Permissions et contexte | `permissions` TOML | **`ContextEnvelope`** + policy serveur + matrice `module_key` | **Remplacé** |
| 6 | Fallback, audit, feedback | Non formalisé v0.1 | Codes `DATA_*`, fallbacks Epic 4, journalisation | **Conservé** (exigence renforcée) |
| — | **Chaîne complète** | Parfois supposée si module.toml présent | Prouvée par **pilote #1** avant grands modules (eco-organismes) | **Conservé** (règle) |

**Mock explicite :** acceptable en construction (PRD §4.2) ; **interdit** comme état final d’un module v2 livré.

---

## 5. Tableau transversal — options écartées et pourquoi

| Option | Statut | Motif principal |
|--------|--------|-----------------|
| TOML `module.toml` comme manifeste **unique** transverse | **Abandonné** | Remplacé par **CREOS** (UI) + **OpenAPI** (API) ; TOML reste possible en config infra |
| Loader central `ModuleBase` + `config.toml` | **Abandonné** | Brownfield FastAPI ; activation par **site** et registre |
| `EventBus` Redis générique documenté comme API module | **Abandonné** (v2) | Canaux **métier** + outbox ; éviter bus fourre-tout non spécifié |
| Redis Pub/Sub, `async-signals` | **Abandonné** | Persistance / multi-workers |
| Stevedore, packaging pip par module interne | **Abandonné** (v2) | Monorepo solo ; coût packaging |
| Pluggy systématique | **Abandonné** (v2) | Complexité hooks sans besoin multi-auteurs |
| Module Federation, Piral dès v2 | **Post-v2** / **Abandonné** v2 | Profil minimal ; AR38 |
| DivKit / SDUI comme **seul** moteur v2 | **Post-v2** | CREOS d’abord ; SDUI agent ensuite |
| `localStorage` vérité config module | **Abandonné** | Multi-poste, `site_id`, QA2 |
| Marketplace / modules tiers installables | **Post-v2** | `_bmad-output/planning-artifacts/architecture/post-v2-hypothesis-marketplace-modules.md` |
| Hot reload module en dev | **Conservé** (acceptation) | Redémarrage FastAPI acceptable (Docker) |

---

## 6. Décisions retenues par rôle système (v2)

Alignement avec la décision directrice du 2026-03-31 :

| Rôle | Modularité — décision retenue |
|------|-------------------------------|
| **Recyclique** | Contrats backend, permissions, contexte, sync, **vérité flux matière** ; récepteurs et outbox |
| **Paheko** | **Vérité comptable** flux financier ; Recyclique = terrain + tampon |
| **Peintre_nano** | **Toute l’UI v2** : shell, slots, registre widgets, rendu manifests, fallbacks |
| **CREOS** | Grammaire manifests, actions, widgets, flows **minimaux** |
| **Config modules (`site_id`)** | Valeurs et activation **serveur** (ADR-001), pas manifest seul |

**Séquence de preuve (inchangée) :** bandeau live → flows critiques (`cashflow`, `reception`) → premier grand module métier (`eco-organismes`). Si le bandeau live ne prouve pas la chaîne, **corriger la chaîne** avant d’étendre.

---

## 7. Post-v2 — pistes sans engagement v2

À documenter uniquement comme **horizon** (pas de procédure dans ce pack) :

| Piste | Condition d’ouverture | Référence |
|-------|----------------------|-----------|
| **Marketplace** modules complémentaires | v2 stabilisée ; besoin commercial ; gouvernance sécurité | `post-v2-hypothesis-marketplace-modules.md` |
| **Entry points** + packages tiers signés | Après first-party et kill-switch | Idem + recherche Perplexity 2026-02-24 |
| **Chargement dynamique** manifests / extensions | Mode **contrôlé**, pas hors build v2 | PRD / AR38 |
| **Peintre-agent / SDUI externe** | CREOS + vocabulaire widgets stables | Recherche 2026-03-31 §6.5–7 |
| **Piral / Module Federation** | Écosystème modules >> équipe solo | Recherche 2026-03-31 §5.2 option A |

---

## 8. Lacunes et arbitrages encore ouverts (entrée `09-lacunes`)

| Sujet | Impact | Prochain livrable pack |
|-------|--------|------------------------|
| Précédence `sites.configuration` vs JSON `module_key` | Comportements divergents | `07-MOD-adr-reconciliation-v01-v02.md`, `09-lacunes` |
| ADR sync : outbox SQL vs couche Redis (PRD note) | Nominal transport Paheko | Hors pack — migration-paheko / ADR archi |
| Schémas CREOS formels CI (Epic 10) | Validation manifests | `04-MOD-protocole-front-creos.md` |
| Tests interactions inter-modules | Qualité long terme | `03-MOD-protocole-backend.md` |
| Réutilisation TOML **backend-only** | Cohérence nommage | [`07-adr`](07-MOD-adr-reconciliation-v01-v02.md) **annexe E** · [`19`](19-MOD-checklist-v0-1-vs-pack.md) **DS-01** · **Q-HITL-07** |

---

## 9. Index des sources citées

| Chemin | Usage dans ce document |
|--------|-------------------------|
| [`references/artefacts/2026-02-24_07_design-systeme-modules.md`](../artefacts/2026-02-24_07_design-systeme-modules.md) | Design v0.1 intégral (TOML, ModuleBase, Redis Streams, slots React) |
| [`references/recherche/2026-02-24_frameworks-modules-python_perplexity_reponse-1.md`](../recherche/2026-02-24_frameworks-modules-python_perplexity_reponse-1.md) | Comparatif Pluggy / Stevedore / entry points |
| [`references/recherche/2026-02-24_frameworks-modules-python_perplexity_reponse-2.md`](../recherche/2026-02-24_frameworks-modules-python_perplexity_reponse-2.md) | Recommandation hybride manifeste + entry points |
| [`references/recherche/2026-03-31_brique-nano-peintre-modularite-json-ui_perplexity_reponse.md`](../recherche/2026-03-31_brique-nano-peintre-modularite-json-ui_perplexity_reponse.md) | Trajectoire Peintre_nano, CREOS, post-v2 SDUI |
| [`references/vision-projet/2026-03-31_decision-directrice-v2.md`](../vision-projet/2026-03-31_decision-directrice-v2.md) | Ligne directrice v2, rôles, séquence |
| [`references/config-modules-site-id/ADR-001-configuration-modules-json-par-site.md`](../config-modules-site-id/ADR-001-configuration-modules-json-par-site.md) | Persistance JSON par site |
| [`11-MOD-synthese-recherches-modularite.md`](11-MOD-synthese-recherches-modularite.md) | Distillat recherches 2026-02/03 (readonly) |
| [`19-MOD-checklist-v0-1-vs-pack.md`](19-MOD-checklist-v0-1-vs-pack.md) | Crosswalk v0.1 — TOML backend-only **DS-01** |
| [`references/protocole-modules-recyclique/00-MOD-plan-redaction-modules.md`](00-MOD-plan-redaction-modules.md) | §4.1 double récit, pilotes, hors-scope |
| `_bmad-output/planning-artifacts/prd.md` | §4.2, §5, §14 — **source produit**, non dupliquée |
| `_bmad-output/planning-artifacts/architecture/post-v2-hypothesis-marketplace-modules.md` | Horizon marketplace |
| [`references/dossier-architecte-externe-v2/05-ARCH-frontend-peintre-creos-contrats.md`](../dossier-architecte-externe-v2/05-ARCH-frontend-peintre-creos-contrats.md) | Runtime Peintre, hiérarchie de vérité |

---

## 10. Prochaine étape du pack

Ce document alimente directement :

- [`07-MOD-adr-reconciliation-v01-v02.md`](07-MOD-adr-reconciliation-v01-v02.md) — formalisation ADR de réconciliation ;
- [`02-MOD-taxonomie-types-de-modules.md`](02-MOD-taxonomie-types-de-modules.md) — types (slice, domaine, workflow step, config-only).

**Critère de complétude de cette matrice :** chaque ligne des §3.1–3.6 possède un **statut explicite** et une **décision retenue** ; aucune option v0.1 listée dans le design février 2026 n’est laissée sans statut.

---

_Document du pack protocole modules — brouillon 2026-05-20. Promotion BMAD (`prd`, epics, ADR architecture canonique) **après validation HITL** uniquement._
