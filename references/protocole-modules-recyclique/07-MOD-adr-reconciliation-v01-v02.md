# ADR-007 — Réconciliation modularité v0.1 (TOML / `ModuleBase`) ↔ v2 (CREOS + JSON serveur + build-time)

**Statut :** Accepted (HITL 2026-05-20 — voir [`2026-05-20_06_reco-hitl-post-bouclage-modules-v2.md`](../artefacts/2026-05-20_06_reco-hitl-post-bouclage-modules-v2.md))  
**Date :** 2026-05-20  
**Portée :** JARVOS Recyclique — protocole de modules (pack `references/protocole-modules-recyclique/`)  
**Nature :** ADR de réconciliation pack **Accepted** ; copie BMAD sous `_bmad-output/planning-artifacts/architecture/2026-05-20-adr-007-reconciliation-modularite-v01-v2.md`.

**Sources de réconciliation :**

- `references/artefacts/2026-02-24_07_design-systeme-modules.md` (design v0.1, février 2026)
- `references/config-modules-site-id/ADR-001-configuration-modules-json-par-site.md` et livrable normatif associé
- `_bmad-output/planning-artifacts/prd.md` §4.2 (chaîne modulaire), §12.2 (jalon bandeau live)
- `_bmad-output/planning-artifacts/architecture/post-v2-hypothesis-marketplace-modules.md` §4 (alignement v2)
- `references/vision-projet/2026-03-31_decision-directrice-v2.md`
- [`references/protocole-modules-recyclique/01-MOD-matrice-choix-modularite.md`](01-MOD-matrice-choix-modularite.md) §3.1–3.6 (matrice canonique v0.1 ↔ v2)

---

## Résumé exécutif

Entre **février 2026** et **mars–avril 2026**, le projet a porté **deux récits** de modularité :

1. **v0.1** — monorepo Python/React, manifeste **`module.toml`**, contrat **`ModuleBase`**, activation **`config.toml`**, hooks **Redis Streams** / `EventBus`, slots React lazy dans le front.
2. **v2** — brownfield `recyclique-1.4.4`, séparation **Recyclique / Paheko / Peintre_nano / CREOS**, modularité prouvée par une **chaîne contractuelle** (OpenAPI → manifests CREOS → registre widgets → runtime), activation et préférences par **`site_id` + `module_key`** (ADR-001), manifests **build-time** (pas de loader TOML documenté).

**Décision de réconciliation (retenue — Accepted HITL 2026-05-20) :**

| Famille | v0.1 | v2 retenu | Verdict |
|---------|------|-----------|---------|
| Manifeste UI | `module.toml` | Manifests **CREOS** (JSON), `contracts/creos/manifests/` | **Remplacé** (UI) |
| Contrat code module | `ModuleBase` + loader TOML | Domaines FastAPI + registre + feature flags ; pas de classe unique documentée | **Remplacé** (pattern, pas la classe) |
| Activation par instance | `config.toml` `[modules] enabled` | Transitoire : flags / slice ; cible : **JSON serveur** ADR-001 + Story **9.6** | **Remplacé** |
| Hooks inter-modules | Redis Streams `EventBus` | Outbox Paheko, jobs, events métier nommés ; pas de bus générique documenté v2 | **Principe conservé**, **implémentation remplacée** |
| Frontend modules | `ModuleSlot` + lazy routes monorepo | Peintre_nano : registre, slots CREOS, `data_contract.operation_id` | **Remplacé** (mécanisme), **intention conservée** (extension par points nommés) |
| Modules tiers / marketplace | Entry points setuptools (latent) | **Hors scope v2** ; hypothèse post-v2 documentée | **Reporté post-v2** |

Le fil conducteur v2 n’est **pas** « un plugin framework TOML », mais **« une brique modulaire = une chaîne complète »** (PRD §4.2). Le design v0.1 reste une **mine d’intentions** utiles (lifecycle, async multi-workers, slots) ; ses **artefacts concrets** (TOML, `ModuleBase`, loader) ne sont **pas** la norme d’implémentation v2 sans décision explicite ultérieure.

---

## Contexte

### Double récit et risque de confusion

L’artefact `2026-02-24_07_design-systeme-modules.md` formalise un **système de modules** cohérent pour un monorepo solo : TOML, registry Python, EventBus Redis, slots React. Il répond à des contraintes réelles (Gunicorn multi-workers, sync Paheko durable, pas de packaging pip par module interne).

La **décision directrice v2** (mars 2026) et le **PRD** réorientent le projet :

- **Recyclique** = noyau métier, contrats backend, sync, permissions terrain.
- **Peintre_nano** = **toute** l’UI v2 (shell, registre, manifests, flows).
- **CREOS** = grammaire déclarative commune (navigation, pages, widgets, actions).
- Modularité = **preuve de bout en bout** sur au moins un pilote (**bandeau live**, Epic 4), pas un loader générique au boot.

Sans ADR de réconciliation, un agent ou un dev peut :

- implémenter un **loader `module.toml`** absent du backlog v2 ;
- mélanger **manifest CREOS** et **fichier TOML** comme deux vérités parallèles ;
- placer des **données métier** (ex. comptage clôture) dans le JSON générique ADR-001 ;
- croire que **Redis Streams EventBus** est le canal nominal v2 alors que l’architecture documentée privilégie l’**outbox** Paheko.

Ce document **arbitre** ces ambiguïtés pour le pack protocole-modules. Il **cite** le BMAD (`_bmad-output/`) sans le promouvoir (stratégie `refs_first` du plan de rédaction).

### Périmètre de cet ADR

**Inclus :**

- Statut de chaque brique du design v0.1 : conservée telle quelle, conservée en principe seulement, remplacée, abandonnée, reportée post-v2.
- Alignement avec ADR-001 (config JSON par site) et avec l’hypothèse marketplace post-v2.
- Règles de **non-régression** : ce que v2 doit préserver pour ne pas fermer l’avenir.

**Exclus (traités ailleurs dans le pack) :**

- Taxonomie détaillée des types de modules (`02-MOD-taxonomie-types-de-modules.md`).
- Registre `module_key` et checklists d’implémentation (`05-registre`, `03-protocole`, `04-protocole`, `06-cookbook`).
- Procédure marketplace ou installation de modules tiers.
- Promotion BMAD (fusion `contracts/`, ADR archi canonique) — **après HITL**.

### Matrice de réconciliation (canonique)

Le détail ligne à ligne par dimension est dans [`01-MOD-matrice-choix-modularite.md`](01-MOD-matrice-choix-modularite.md) **§3.1–3.6** (manifeste, contrat code, activation, hooks, UI, persistance). Ce ADR-007 fixe les **décisions structurantes** et le résumé exécutif ci-dessus ; ne pas maintenir une seconde matrice ici.

---

## Décision

### 1. Norme v2 : la chaîne modulaire remplace le framework `ModuleBase`

Un « module » v2 n’est pas un package Python dérivant de `ModuleBase` avec un `module.toml` adjacent. C’est un **ensemble aligné** :

1. **Contrat métier** — schémas OpenAPI, règles domaine Recyclique.
2. **Récepteur backend** — handlers, services, persistance (tables **ou** JSON config selon la nature des données).
3. **Contrat UI** — manifests CREOS reviewables sous `contracts/creos/manifests/`.
4. **Runtime frontend** — Peintre_nano : chargement bundle, validation, registre, rendu slot/widget.
5. **Permissions et contexte** — `ContextEnvelope`, politique serveur par `site_id`.
6. **Fallback, audit, feedback** — `reportRuntimeFallback`, logs, UX explicite, tests d’acceptation.

Tant qu’une brique manque, le module n’est **pas** modulaire au sens PRD — même si un fichier TOML ou une classe Python existe.

**Conséquence :** ne pas réintroduire `core/module_loader.py` + `module.toml` comme chemin nominal pour les modules UI v2. Toute réutilisation du vocabulaire « module » dans le code doit se mapper à **`module_key`** (registre + CREOS + ADR-001), pas au nom de dossier `recyclic.modules.*` du design v0.1.

### 2. Manifestes : CREOS + build-time remplacent `module.toml` pour l’UI

**Abandon normatif (v2) :** `module.toml` comme manifeste **UI** (sections `[ui] routes`, `[ui] slots`, permissions d’affichage).

**Remplacement :**

| Rôle v0.1 (`module.toml`) | Porteur v2 |
|---------------------------|------------|
| Identité (`name`, `version`, `description`) | `module_key` + métadonnées CREOS / registre serveur |
| Routes UI | `NavigationManifest` / entrées de navigation |
| Slots | `PageManifest` → `slot_id`, `widget_type`, `widget_props` |
| Permissions affichage | `ContextEnvelope` + matrice rôle × `module_key` × site (ADR-001, livrable normatif) |
| Dépendances Python | `pyproject`/deps projet ; pas par module TOML |
| Dépendances modules | Documentation registre + ordre d’implémentation ; validation CI |

**Build-time :** les manifests consommés en production passent par la **promotion** `contracts/creos/` (gouvernance Epic 1.4). `peintre-nano/public/manifests/` et fixtures restent **démo / test**, pas source de vérité.

**Post-v2 (ouverture, pas dette v2) :** un mode de chargement contrôlé d’extensions hors dépôt principal est **envisageable** (`post-v2-hypothesis-marketplace-modules.md` §4) ; il **ne remplace pas** la discipline build-time actuelle — il l’étend sous gouvernance (signature, compatibilité versionnée, kill-switch).

### 3. `ModuleBase` : abandon comme contrat unique ; conservation des responsabilités

La classe proposée en v0.1 :

```python
class ModuleBase(ABC):
    async def startup(self, app: FastAPI, config: dict): ...
    async def shutdown(self): ...
    def register_routes(self, app: FastAPI): ...
    def register_signals(self, bus: "EventBus"): ...
    def register_ui_extensions(self) -> dict[str, list[str]]: ...
```

**Verdict :**

| Méthode v0.1 | v2 |
|--------------|-----|
| `startup` / `shutdown` | Lifespan FastAPI, hooks d’init domaine (DB, consumers outbox) — **pas** une ABC obligatoire par module |
| `register_routes` | Routers FastAPI par domaine (`APIRouter`), inclusion explicite dans l’app |
| `register_signals` | Handlers sur **événements métier nommés** ou consumers outbox — **pas** `EventBus.on` générique documenté |
| `register_ui_extensions` | **Supprimé côté Python** — extensions UI **uniquement** via CREOS + registre TS |

**Conservé :** séparation claire **boot** / **teardown** et isolation des erreurs entre handlers async.

**Abandonné :** l’idée qu’un module UI enregistre des extensions React depuis le backend Python.

### 4. Activation : de `config.toml` à JSON serveur + registre

**v0.1 :** liste statique `enabled` dans `config.toml`, versionnable, sans DB au boot.

**v2 :**

| Phase | Mécanisme | Statut |
|-------|-----------|--------|
| Transitoire (pilote bandeau) | Feature flag / slice (`bandeau_live_slice_enabled`, toggle admin Epic 4.5) | Acceptable pour **preuve** Epic 4 |
| Cible | ADR-001 : REST par `site_id` + `module_key`, ETag/409, liste blanche serveur alignée CREOS | **Source de vérité** pour préférences et activation **UI** |
| Complément | ADR P2 : surcharges PostgreSQL clé/valeur pour config admin dynamique (fusion manifest + PG) | Coexiste avec ADR-001 — **précédence à formaliser** (dette connue ADR-001) |

**Décision :** `config.toml` `[modules] enabled` est **abandonné** comme modèle d’activation documenté v2. Les fichiers de config déployés par instance (env, settings Recyclique) peuvent encore porter des **feature flags techniques** globaux, mais pas la liste des modules UI par ressourcerie.

**Alignement post-v2 :** la même famille de leviers (`enabled_by_admin`, registre) prépare une future couche `licensed` sans refonte du cœur métier (`post-v2-hypothesis-marketplace-modules.md` §4–5).

### 5. Hooks et async : principe oui, `EventBus` Redis Streams non normé v2

Le design v0.1 justifie Redis Streams par Gunicorn multi-workers et la durabilité (replay, ack). Ces besoins restent **valides**.

**v2 documente plutôt :**

- **Outbox transactionnelle** pour Paheko (atomicité avec le métier).
- **Events métier** explicites dans le domaine (ex. clôture session), consommés par workers dédiés.
- Pas de **bus générique** `events:{nom}` imposé à tous les modules.

**Décision :**

- **Conserver** : communication **asynchrone**, **résiliente**, compatible multi-workers, isolation d’erreur entre handlers.
- **Remplacer** : le wrapper `EventBus` + convention `register_signals(bus)` comme **API obligatoire** des modules.
- **Ne pas bloquer** : une future ADR infra peut réintroduire Redis Streams pour un sous-ensemble d’événements si l’outbox seule est insuffisante — ce n’est **pas** le chemin nominal documenté aujourd’hui.

Le stream Paheko « push » du design v0.1 est **subsumé** par la discussion outbox vs Redis du PRD / architecture ; cet ADR **ne tranche pas** le support physique, seulement le **rôle** : pas de second framework parallèle au protocole CREOS.

### 6. Frontend : Peintre_nano remplace `ModuleRegistry.tsx` / `ModuleSlot`

**v0.1 :**

```tsx
const modules = { 'paheko': lazy(() => import('@/modules/paheko/PahekoApp')), ... }
<ModuleSlot name="sale_details" />
```

**v2 :**

- Registre **widgets** et résolution `widget_type` → composant (`03-implementer-le-registre-minimal`, Epic 3).
- Slots déclarés dans **PageManifest** CREOS, pas par callback Python.
- Données widget via `data_contract.operation_id` → OpenAPI (gouvernance `operationId`).

**Conservé :** lazy loading, un seul build, points d’extension **nommés**, pas de Module Federation.

**Abandonné :** registry React alimenté par `register_ui_extensions()` Python.

### 7. Classification config JSON (ADR-001) vs données métier

Pour éviter la dérive « god-namespace JSON » (ADR-001, livrable normatif §2.3) :

| Nature | Stockage v2 | Exemple |
|--------|-------------|---------|
| Préférences / activation **UI** transverses | JSON `site_id` + `module_key` (ADR-001) | Rafraîchissement bandeau, visibilité widget |
| Données **métier** avec contraintes, audit légal, jointures | Tables SQL dédiées | Comptage pièces/billets en clôture (pilote #2) |
| Défauts structurels UI | Manifests CREOS build-time | Layout, catalogue widgets |
| Surcharges admin dynamiques | PostgreSQL (ADR P2) | Ordre modules, toggles simples |

**Décision :** le design v0.1 ne distinguait pas config et métier dans le TOML. La v2 **impose** cette distinction. Un module « workflow step » (pilote comptage) **ne se réduit pas** à un document ADR-001.

### 8. Hors scope v2 explicitement relié à v0.1

| Sujet v0.1 / kanban | Traitement |
|---------------------|------------|
| Entry points setuptools / modules tiers | **Post-v2** — hypothèse marketplace ; invariants confiance §6 du doc post-v2 |
| Packaging pip par module interne | **Abandonné** — monorepo conservé (décision v0.1 toujours valide) |
| Hot reload module en dev | **Conservé** comme contrainte acceptée (redémarrage) |
| Tests interactions modules via bus | **À reprendre** dans protocoles `03`/`04` sur pilotes réels |
| Framework plugins Paheko+Recyclique (idée kanban) | **Hors pack** — lien dans `09-lacunes` seulement |

---

## Conséquences

### Positives

- **Un seul récit** pour agents et développeurs : CREOS + OpenAPI + registre + ADR-001, documenté dans le pack protocole-modules.
- **Réduction du risque** de réimplémenter un loader TOML incompatible avec Epic 4 et le jalon PRD §12.2.
- **Traçabilité** des intentions v0.1 (slots, async, lifecycle) sans les artefacts obsolètes.
- **Compatibilité post-v2** : contrats stables et hiérarchie d’états (`listed` → `visible_in_ui`) préparés sans marketplace en v2.

### Négatives / dette assumée

- **Migration cognitive** : le code ou les docs qui mentionnent encore `module.toml` / `ModuleBase` doivent être lus à travers cet ADR ou mis à jour progressivement.
- **Double couche config** (ADR-001 JSON + ADR P2 PostgreSQL + magasins historiques `sites.configuration`, etc.) : précédence **non entièrement arbitrée** ici — suivi ADR complémentaire ou section registre.
- **Écart PRD vision / doc architecture** sur Redis vs outbox Paheko : non résolu par cet ADR ; évite de figer `EventBus` Streams comme norme par effet de bord.
- **Matrice canonique** : [`01-MOD-matrice-choix-modularite.md`](01-MOD-matrice-choix-modularite.md) §3.1–3.6 — cet ADR ne duplique pas le tableau ; en cas d'écart, priorité à `01` après HITL.

### Impact sur les chantiers en cours

| Chantier | Action attendue |
|----------|-----------------|
| Epic 4 (bandeau live) | Continuer comme **template** chaîne complète ; ne pas ajouter TOML |
| Story 9.6 | Implémenter ADR-001 ; remplacer progressivement toggles transitoires |
| `recyclique-1.4.4` / legacy | Pas de réécriture loader TOML sans promotion explicite post-HITL |
| Pack protocole-modules | Livrables `02`–`06`, `08`, `09` — promotion BMAD post-HITL |
| Promotion BMAD | Après HITL : copier ou fusionner cet ADR vers `planning-artifacts/architecture/` |

### Critères de revue (passage Proposed → Accepted)

1. Strophe valide la matrice **abandonné / remplacé / conservé / post-v2** sans objection métier.
2. Alignement confirmé avec équipe sur **outbox vs Redis** (au moins pour le libellé des protocoles `03`).
3. `01-MOD-matrice-choix-modularite.md` **cohérent** avec ce document (§3.1–3.6).
4. Aucune story v2 ne dépend encore d’un livrable « loader module.toml » comme critère d’acceptation.

---

## Annexe A — Cartographie détaillée `module.toml` → CREOS

| Section / champ TOML v0.1 | Équivalent v2 | Remarque |
|---------------------------|---------------|----------|
| `name` | `module_key` (registre) | Casse et normalisation serveur (NFKC) |
| `version` | SemVer manifest CREOS / package | Alignement CI non-régression |
| `description` | Métadonnées registre / doc module | — |
| `[permissions] section/level` | `ContextEnvelope` + policy serveur | Pas recalculé dans Peintre |
| `[ui] routes` | `NavigationManifest` | — |
| `[ui] slots` | `PageManifest.slots[]` | — |
| `[dependencies] modules` | Registre + doc dépendances | Validation manuelle / CI |
| `[dependencies] python` | Dépendances projet globales | — |

---

## Annexe B — Ce qui reste exploitable du design v0.1 (checklist « conservé »)

- Monorepo, **pas** de package pip par module interne.
- **Un build** frontend, lazy où pertinent.
- **Points d’extension nommés** (slots), équivalent sémantique CREOS.
- **Activation explicite** par instance (aujourd’hui par site via serveur).
- **Dépendances déclarées** avec échec explicite si manquant.
- **Async résilient** multi-workers pour side-effects (sync, notifications).
- **First-party** en v2 ; tiers = post-v2 avec gouvernance.
- **Redémarrage** acceptable en dev si module modifié.

---

## Annexe C — Ce qui est remplacé ou abandonné (checklist « ne pas réimplémenter »)

- Fichier **`module.toml`** par module UI.
- Classe **`ModuleBase`** comme contrat d’intégration obligatoire.
- **`ModuleRegistry.load_from_config`** lisant TOML au démarrage.
- **`register_ui_extensions()`** côté Python.
- **`EventBus`** générique Redis Streams comme API standard des modules v2.
- **`config.toml` `[modules] enabled`** comme vérité d’activation UI par ressourcerie.
- Registry React **`ModuleSlot`** alimenté depuis Python (remplacé par pipeline Peintre).

---

## Annexe D — Alignement hypothèse post-v2 (marketplace)

Sans engager le marketplace, la v2 **prépare** :

| Exigence post-v2 | Préparation v2 (cet ADR) |
|------------------|-------------------------|
| Contrats stables OpenAPI + CREOS | Chaîne Epic 4, gouvernance `operationId` |
| « Capacité activée » extensible vers `licensed` | `module_key` + activation serveur (ADR-001) |
| Pas de chargement dynamique tiers v2 (AR38) | Build-time ; ouverture future **sous gouvernance** |
| Séparation cœur métier / plateforme extensions | Recyclique autorité métier ; Peintre rend ; config JSON ≠ métier |
| Hiérarchie d’états module | Ne pas réduire à un booléen ; distinguer admin / licence / visible |

Référence complète : `_bmad-output/planning-artifacts/architecture/post-v2-hypothesis-marketplace-modules.md`.

---

## Références

| Document | Chemin |
|----------|--------|
| Design système modules v0.1 | `references/artefacts/2026-02-24_07_design-systeme-modules.md` |
| ADR config JSON par site | `references/config-modules-site-id/ADR-001-configuration-modules-json-par-site.md` |
| Livrable normatif config modules | `references/config-modules-site-id/livrable-normatif-architecture.md` |
| Plan rédaction pack (§4.1) | `references/protocole-modules-recyclique/00-MOD-plan-redaction-modules.md` |
| PRD modularité §4.2 | `_bmad-output/planning-artifacts/prd.md` |
| Hypothèse marketplace post-v2 | `_bmad-output/planning-artifacts/architecture/post-v2-hypothesis-marketplace-modules.md` |
| Décision directrice v2 | `references/vision-projet/2026-03-31_decision-directrice-v2.md` |
| Frontend Peintre / CREOS (dossier architecte) | `references/dossier-architecte-externe-v2/05-ARCH-frontend-peintre-creos-contrats.md` |
| Gouvernance contrats | `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md` |
| Pilote bandeau (signaux) | `references/artefacts/2026-04-02_07_signaux-exploitation-bandeau-live-premiers-slices.md` |

---

## Promotion `_bmad-output/` — stratégie `refs_first`

Ce document et le pack `references/protocole-modules-recyclique/` **citent** la norme produit exécutable sous `_bmad-output/` **sans la promouvoir** tant qu’une validation HITL (Strophe) n’a pas tranché les questions de [`09-MOD-lacunes-et-questions-ouvertes.md`](09-MOD-lacunes-et-questions-ouvertes.md).

| Règle | Application |
|-------|-------------|
| **Lecture** | Chemins relatifs vers `_bmad-output/planning-artifacts/prd.md`, `epics.md`, `architecture/`, `implementation-artifacts/` — alignement des protocoles, **pas** recopie intégrale |
| **Miroir BMAD** | Copie faite : `_bmad-output/planning-artifacts/architecture/2026-05-20-adr-007-reconciliation-modularite-v01-v2.md` (pack = source de verite) |
| **Interdit sans HITL** | Addendum PRD §4.2 recopie depuis le pack ; reecriture `epics.md` / stories sans decision Strophe |
| **Ordre post-acceptation** (aligné [`00-MOD-cadrage-chantier.md`](00-MOD-cadrage-chantier.md) §7, [`22-MOD-dossier-architecte-pont-t-mod.md`](22-MOD-dossier-architecte-pont-t-mod.md)) | (1) ADR-007 **Accepted** dans `_bmad-output/planning-artifacts/architecture/` · (2) addendum ou correct-course PRD §4.2 si besoin · (3) Story **9.6** / epic config · (4) fusion `contracts/openapi/recyclique-api.yaml` + schémas CREOS |
| **Pont exécutable** | Tableau T-MOD / T-MET → actions : [`22-MOD-dossier-architecte-pont-t-mod.md`](22-MOD-dossier-architecte-pont-t-mod.md) |
| **Crosswalk v0.1** | Checklist arbitrée : [`19-MOD-checklist-v0-1-vs-pack.md`](19-MOD-checklist-v0-1-vs-pack.md) — clôture documentaire **L-03** en attendant **Accepted** |

**Critère de promotion :** statut **Proposed → Accepted** (§ ci-dessous) + cohérence confirmée avec [`01-MOD-matrice-choix-modularite.md`](01-MOD-matrice-choix-modularite.md) §3.1–3.6 + aucune story v2 ne dépend d’un loader `module.toml` comme AC nominal.

---

## Annexe E — TOML **backend-only** (Q-HITL-07)

**Contexte :** le design v0.1 utilisait `module.toml` comme manifeste **unique** (UI + permissions + routes). L’ADR-007 **abandonne** ce rôle pour l’UI (CREOS + OpenAPI). Une **réutilisation partielle** du format TOML pour des **métadonnées package Python** (version, deps, description infra) reste **ouverte** — c’est l’objet de **Q-HITL-07**.

| Cas | Verdict brouillon | Règle agent / dev |
|-----|-------------------|-------------------|
| `module.toml` avec sections **`[ui]`**, slots, routes d’affichage | **Interdit** (norme v2) | Manifests **CREOS** + registre widgets ; annexe A |
| `module.toml` / `pyproject.toml` **sans** contrat UI — version, deps, tags déploiement | **Autorisé sous réserve HITL** | Ne pas confondre avec `module_key` ni ADR-001 ; pas de loader central `ModuleRegistry.load_from_config` |
| `config.toml` `[modules] enabled` | **Interdit** (activation UI) | ADR-001 + Story 9.6 |
| Fichiers TOML **infra instance** (env, settings déploiement) | **Hors** périmètre ADR-007 | Distinct de la config module par `site_id` |

**Alignement crosswalk :** [`19-MOD-checklist-v0-1-vs-pack.md`](19-MOD-checklist-v0-1-vs-pack.md) **DS-01** (statut **Post-v2** pour TOML backend-only éventuel) · **PT-02** (structure `module.toml` UI abandonnée).

**Décision attendue HITL :** (A) **interdire** tout nouveau `module.toml` dans le monorepo v2, ou (B) **autoriser** un profil **backend-only** documenté (emplacement, champs autorisés, interdiction `[ui]`) — puis mettre à jour **DS-01** dans `19` et passer **Q-HITL-07** à tranché dans `09`.

---

## Statut et suite

| Champ | Valeur |
|-------|--------|
| **Statut** | **Accepted** (HITL Strophe 2026-05-20 — reco [`2026-05-20_06_reco-hitl-post-bouclage-modules-v2.md`](../artefacts/2026-05-20_06_reco-hitl-post-bouclage-modules-v2.md)) |
| **Prochaine étape** | Trancher **Q-HITL-07** (annexe E) si besoin ; alignement `01-matrice` §3.1–3.6 |
| **Promotion** | Copie BMAD : `_bmad-output/planning-artifacts/architecture/2026-05-20-adr-007-reconciliation-modularite-v01-v2.md` |

---

_ADR Accepted — pack `references/protocole-modules-recyclique/` ; source de vérité pack, miroir BMAD._
