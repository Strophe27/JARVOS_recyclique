# Plan de rédaction — pack `references/protocole-modules-recyclique/`

**Date :** 2026-05-20  
**Rôle :** planificateur (readonly) — ce fichier **ne remplace pas** les livrables du pack ; il ordonne leur rédaction.  
**Chantier parent :** `.cursor/plans/chantier_protocole_modules_fe3bc68e.plan.md`  
**Prérequis lecture :** Phase 0 terminée — [`references/dossier-architecte-externe-v2/`](../dossier-architecte-externe-v2/) (surtout ch. 05–07).

---

## 1. Tableau maître — fichiers à produire

| Fichier | Objectif (1 ligne) | Ordre lecture (consommateur) | Sources principales (chemins relatifs racine repo) | Dépendances (prérequis docs du pack) |
|---------|-------------------|------------------------------|-----------------------------------------------------|--------------------------------------|
| `index.md` | Porte d'entrée : abstract, glossaire minimal, ordre de lecture, liens hors pack. | **1** | Ce plan ; `references/dossier-architecte-externe-v2/index.md` ; `references/ou-on-en-est.md` | `00-MOD-plan-redaction-modules.md` (ce fichier) |
| `00-MOD-cadrage-chantier.md` | Périmètre, hors-scope, flux recherche/artefacts → pack, critères de succès, liens canoniques. | **2** | `.cursor/plans/chantier_protocole_modules_fe3bc68e.plan.md` ; `references/dossier-architecte-externe-v2/07-ARCH-todos-et-questions-architecte.md` | — |
| `01-MOD-matrice-choix-modularite.md` | Tableau v0.1 / v2 / abandonné / post-v2 + décision retenue par brique (manifeste, activation, hooks, UI). | **3** | `references/artefacts/2026-02-24_07_design-systeme-modules.md` ; `references/recherche/2026-02-24_frameworks-modules-python_perplexity_*` ; `_bmad-output/planning-artifacts/prd.md` §4.2 ; `references/vision-projet/2026-03-31_decision-directrice-v2.md` ; `references/recherche/2026-03-31_brique-nano-peintre-modularite-json-ui_perplexity_reponse.md` | `00-MOD-cadrage-chantier.md` |
| `07-MOD-adr-reconciliation-v01-v02.md` | ADR brouillon : ce qui reste du design TOML/`ModuleBase`, ce qui est remplacé par CREOS + JSON serveur + build-time. | **4** | `01-MOD-matrice-choix-modularite.md` (brouillon) ; `references/artefacts/2026-02-24_07_design-systeme-modules.md` ; `references/config-modules-site-id/ADR-001-configuration-modules-json-par-site.md` ; `_bmad-output/planning-artifacts/architecture/post-v2-hypothesis-marketplace-modules.md` (§4 alignement v2) | `01-MOD-matrice-choix-modularite.md` |
| `02-MOD-taxonomie-types-de-modules.md` | Définir les types (slice CREOS, domaine Peintre, module métier backend, config-only, workflow step, etc.) + critères optionnel/obligatoire v2. | **5** | `_bmad-output/planning-artifacts/prd.md` §4.2, §7 (matrice modules) ; `_bmad-output/planning-artifacts/epics.md` (Epic 3, 4, 9.6) ; `references/dossier-architecte-externe-v2/05-ARCH-frontend-peintre-creos-contrats.md` §6 ; `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md` | `07-MOD-adr-reconciliation-v01-v02.md` |
| `05-MOD-registre-module-key.md` | Liste blanche `module_key` : statut (pilote, obligatoire v2, optionnel, post-v2), dépendances, schéma JSON, ops OpenAPI. | **6** | `references/config-modules-site-id/` (ADR-001, `schemas/`, `openapi-module-config.yaml`) ; `references/artefacts/2026-04-02_07_signaux-exploitation-bandeau-live-premiers-slices.md` ; stories `4-1`…`4-6b` ; `_bmad-output/planning-artifacts/epics.md` Story 9.6 | `02-MOD-taxonomie-types-de-modules.md` |
| `03-MOD-protocole-backend.md` | Checklist back : routes, BDD (tables vs JSON config), events, sync Paheko, feature flags, enregistrement package. | **7** | `_bmad-output/implementation-artifacts/4-1-*.md`, `4-3-*.md`, `4-5-*.md` ; `references/config-modules-site-id/livrable-normatif-architecture.md` ; `references/migration-paheko/` (chaîne outbox) ; `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md` ; `_bmad-output/planning-artifacts/prd.md` §4.2 | `02-taxonomie`, `05-registre`, `07-adr` |
| `04-MOD-protocole-front-creos.md` | Checklist front : manifests, slots, flows/workflow steps, registre widgets, `data_contract.operation_id`, activation, fallbacks. | **8** | `_bmad-output/implementation-artifacts/3-3-*.md`, `4-1`…`4-6b` ; `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md` ; `peintre-nano/docs/` ; `references/dossier-architecte-externe-v2/05-ARCH-frontend-peintre-creos-contrats.md` ; `contracts/creos/` ; `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md` | `02-taxonomie`, `05-registre`, `03-protocole-backend` (lecture croisée) |
| `06-MOD-cookbook-nouveau-module-optionnel.md` | **Livrable principal** agents/dev : pas à pas unifié back + front + contrats + activation `site_id`. | **9** | `03-MOD-protocole-backend.md`, `04-MOD-protocole-front-creos.md` ; modèle Epic 4 (`4-1`→`4-6b`) ; `references/config-modules-site-id/index.md` ; `references/operations-speciales-recyclique/2026-04-18_prompt-ultra-operationnel-operations-speciales-recyclique_v1-1.md` (structure prompt, pas le contenu métier) | `03`, `04`, `05-registre` |
| `08-MOD-exemple-pilote-comptage-pieces-billets.md` | Fiche module #2 : flow clôture caisse → étape comptage → persistance → Paheko (sans impl). | **10** | `references/dossier-architecte-externe-v2/07-ARCH-todos-et-questions-architecte.md` (T-MET-1) ; `_bmad-output/planning-artifacts/epics.md` Epic 6 (clôture) ; `06-cookbook` ; `references/migration-paheko/` | `06-cookbook` |
| `09-MOD-lacunes-et-questions-ouvertes.md` | Lacunes résiduelles, questions HITL, TODO T-MOD-* / promotion BMAD différée. | **11** | Tous les docs du pack (brouillons) ; `references/dossier-architecte-externe-v2/07-ARCH-todos-et-questions-architecte.md` ; `references/ou-on-en-est.md` | Pack quasi-complet (`01`–`08`) |
| `prompt-agent-chantier-modules.md` | *(Optionnel)* Prompt ultra-opérationnel : phases A→D, garde-fous, chemins à toucher. | **12** (agents) | `06-cookbook` ; `00-cadrage` ; modèle `references/operations-speciales-recyclique/2026-04-18_prompt-ultra-operationnel-operations-speciales-recyclique_v1-1.md` | `06-cookbook`, `00-cadrage` |

**Meta (hors pack consommateur final) :** `00-MOD-plan-redaction-modules.md` (ce fichier) — ordre rédaction §2.

---

## 2. Ordre de **rédaction** recommandé (phases)

Aligné sur `.cursor/plans/chantier_protocole_modules_fe3bc68e.plan.md` et statuts todos du plan.

| Phase | Fichiers | Vérification |
|-------|----------|--------------|
| **0 — Amorçage** | `index.md`, `00-MOD-cadrage-chantier.md` | Liens vers toutes les sources listées §1 ; hors-scope marketplace explicite |
| **A — Réconciliation** | `01-MOD-matrice-choix-modularite.md`, `07-MOD-adr-reconciliation-v01-v02.md` | Chaque ligne v0.1 a statut : conservé / remplacé / abandonné / post-v2 |
| **B — Taxonomie & registre** | `02-MOD-taxonomie-types-de-modules.md`, `05-MOD-registre-module-key.md` | Au moins : `kpi-live-banner`, placeholders `cashflow`, `reception`, `comptage-pieces-billets`, `helloasso`, `eco-organismes` |
| **C — Protocoles** | `03-MOD-protocole-backend.md`, `04-MOD-protocole-front-creos.md` | Checklists traçables vers stories `4-1`…`4-6b` et `3-3` |
| **D — Cookbook & pilote** | `06-MOD-cookbook-nouveau-module-optionnel.md`, `08-MOD-exemple-pilote-comptage-pieces-billets.md` | Un lecteur peut dériver une checklist depuis `06` seul |
| **E — Clôture chantier** | `09-MOD-lacunes-et-questions-ouvertes.md`, `prompt-agent-chantier-modules.md` (opt.), MAJ `index.md` | HITL Strophe ; MAJ `references/index.md` (pointeur, pas promotion BMAD) |

---

## 3. Liste finale des fichiers à produire

**Structure retenue** (ajustement : fichier `09-MOD-lacunes-et-questions-ouvertes.md` ajouté — absent de la structure indicative initiale mais nécessaire pour HITL et TODO T-MOD-* ; cohérent avec `07-todos` du dossier architecte).

| # | Fichier | Statut cible |
|---|---------|--------------|
| 0 | `00-MOD-plan-redaction-modules.md` | **Livré** (ce document) |
| 1 | `index.md` | **Livré** |
| 2 | `00-MOD-cadrage-chantier.md` | **Livré** |
| 3 | `01-MOD-matrice-choix-modularite.md` | **Livré** |
| 4 | `07-MOD-adr-reconciliation-v01-v02.md` | **Livré** |
| 5 | `02-MOD-taxonomie-types-de-modules.md` | **Livré** |
| 6 | `05-MOD-registre-module-key.md` | **Livré** |
| 7 | `03-MOD-protocole-backend.md` | **Livré** |
| 8 | `04-MOD-protocole-front-creos.md` | **Livré** |
| 9 | `06-MOD-cookbook-nouveau-module-optionnel.md` | **Livré** |
| 10 | `08-MOD-exemple-pilote-comptage-pieces-billets.md` | **Livré** |
| 11 | `09-MOD-lacunes-et-questions-ouvertes.md` | **Livré** |
| 12 | `prompt-agent-chantier-modules.md` | **Livré** (optionnel) |

**Total livrables contenu :** **11** fichiers (+ 1 meta plan + 1 prompt optionnel = **12 ou 13** selon prompt).

**Dossiers voisins (ne pas fusionner dans ce pack) :**

- `references/config-modules-site-id/` — persistance JSON `site_id` + `module_key` (normatif config UI).
- `references/recherche/` — nouvelles enquêtes externes uniquement ici.
- `references/idees-kanban/` — idées immatures (citation, pas duplication).
- `contracts/` — promotion **après** HITL (OpenAPI, manifests CREOS reviewables).

---

## 4. Notes — réconciliation v0.1 vs v2, pilotes, hors-scope

### 4.1 Double récit (v0.1 ↔ v2)

| Dimension | v0.1 (fév. 2026) | v2 (fil conducteur) | Traitement attendu dans le pack |
|-----------|------------------|---------------------|----------------------------------|
| Manifeste module | `module.toml` (TOML) | Manifests **CREOS** (JSON), build-time + promotion `contracts/creos/` | `07-adr` : TOML → **abandonné** pour UI ; éventuelle réutilisation métadonnées **backend-only** si pertinent |
| Contrat code | `ModuleBase`, loader `config.toml` `[modules] enabled` | Chaîne PRD §4.2 (7 briques) ; pas de loader TOML documenté v2 | `01-matrice` : lifecycle → **patterns FastAPI + feature flag / registre** |
| Hooks inter-modules | Redis Streams / EventBus (design `07`) | Events métier + outbox Paheko ; pas de bus générique documenté v2 | Conserver **principe** async multi-workers ; nommer **canal** réel (outbox, jobs) dans `03-protocole` |
| Activation | `config.toml` par instance | `bandeau_live_slice_enabled` (transitoire) → **Story 9.6** + JSON `site_id`/`module_key` (ADR-001) | `05-registre` + `03` : règle **une** source de vérité activation par site |
| UI | Slots React monorepo, lazy | Peintre_nano + CREOS + `data_contract.operation_id` | `04-protocole` : template = Epic 4 |

**Sources de réconciliation obligatoires :** `references/artefacts/2026-02-24_07_design-systeme-modules.md`, `references/config-modules-site-id/ADR-001-*.md`, `_bmad-output/planning-artifacts/prd.md` §4.2.

### 4.2 Pilotes

| Pilote | Rôle dans le pack | Référence impl / spec |
|--------|-------------------|------------------------|
| **#1 Bandeau live** | **Template obligatoire** de la chaîne complète (Epic 4) | Stories `_bmad-output/implementation-artifacts/4-1-*.md` … `4-6b-*.md` ; `references/artefacts/2026-04-02_07_signaux-exploitation-bandeau-live-premiers-slices.md` ; `references/config-modules-site-id/schemas/kpi-live-banner.v1.json` |
| **#2 Comptage pièces/billets** | Validation du protocole sur **workflow step** (clôture caisse) + données métier + Paheko | `08-exemple-pilote-*` ; Epic 6 (epics.md) ; questions ch. `dossier-architecte-externe-v2/07` |

**Distinction à documenter dans `02-taxonomie` :** pilote #1 = slice / widget transverse ; pilote #2 = **étape de flow** + tables métier (pas seulement JSON config).

### 4.3 Hors-scope explicite (ne pas rédiger dans le pack)

- **Marketplace / modules tiers post-v2** — lire `_bmad-output/planning-artifacts/architecture/post-v2-hypothesis-marketplace-modules.md` pour **citer** en §8 post-v2 uniquement ; pas de procédure d'installation tierce.
- **Implémentation** du module comptage (fiche + checklist seulement).
- **Réécriture** `recyclique-1.4.4` ou loader TOML legacy sans décision ADR `07`.
- **Publication** dans `doc/` (communication externe).
- **Promotion BMAD** (PRD, epics, ADR archi canonique, fusion `contracts/`) — **après validation HITL** Strophe.

### 4.4 Idées kanban (lien, pas duplication)

- `references/idees-kanban/a-conceptualiser/2026-02-24_module-store-recyclic.md` — module store / marketplace interne : **hors chantier immédiat** ; pointer depuis `09-lacunes`.

---

## 5. Stratégie `refs_first` — `_bmad-output/` en source, pas en destination

| Règle | Application |
|-------|-------------|
| **Citer, ne pas promouvoir** | Les docs du pack **référencent** `_bmad-output/planning-artifacts/` et `_bmad-output/implementation-artifacts/` par chemin relatif ; aucune copie intégrale de PRD/epics/stories. |
| **Vérité produit en lecture** | PRD §4.2, epics (Epic 3, 4, **6**, Story 9.6), stories `1-4`, `3-3`, `4-1`…`4-6b` = **alignement** des protocoles, pas réécriture normative. |
| **Contrats CREOS (repo)** | Manifests et schémas reviewables : `contracts/creos/` (manifests/, schemas/) — complément des brouillons `references/config-modules-site-id/`. |
| **Après HITL seulement** | Ordre suggéré (plan chantier) : (1) ADR archi dans `_bmad-output/planning-artifacts/architecture/`, (2) correct-course / addendum PRD §4.2, (3) Story 9.6 / epic dédié, (4) fusion `contracts/openapi/recyclique-api.yaml` + schémas CREOS. |
| **État projet** | Mettre à jour `references/ou-on-en-est.md` et `references/index.md` avec **pointeur** vers ce pack — pas de déplacement des stories vers `references/`. |
| **Contrats reviewables** | Brouillons dans `references/config-modules-site-id/openapi-module-config.yaml` ; cible fusion = `contracts/` post-HITL. |

**Stories impl — inventaire minimal à charger par rédacteur :**

| Story | Fichier (pattern) | Usage pack |
|-------|-------------------|------------|
| 1-4 | `_bmad-output/implementation-artifacts/1-4-fermer-la-gouvernance-contractuelle-openapi-creos-contextenvelope.md` | Gouvernance `operationId`, promotion manifests |
| 3-3 | `_bmad-output/implementation-artifacts/3-3-implementer-le-registre-minimal-de-widgets-slots-et-rendu-declaratif.md` | Registre widgets / slots |
| 4-1 | `_bmad-output/implementation-artifacts/4-1-publier-le-contrat-et-les-manifests-minimaux-du-module-bandeau-live.md` | Contrats + manifests pilote |
| 4-2 | `_bmad-output/implementation-artifacts/4-2-implementer-le-widget-bandeau-live-dans-le-registre-peintre-nano.md` | Widget registre |
| 4-3 | `_bmad-output/implementation-artifacts/4-3-brancher-la-source-backend-reelle-et-les-cas-douverture-decalee.md` | Backend réel |
| 4-4 | `_bmad-output/implementation-artifacts/4-4-rendre-visibles-les-fallbacks-et-rejets-du-slice-bandeau-live.md` | Fallbacks |
| 4-5 | `_bmad-output/implementation-artifacts/4-5-ajouter-un-toggle-admin-minimal-borne-au-module-bandeau-live.md` | Activation admin |
| 4-6 | `_bmad-output/implementation-artifacts/4-6-valider-la-chaine-complete-backend-contrat-manifest-runtime-rendu-fallback.md` | Validation chaîne |
| 4-6b | `_bmad-output/implementation-artifacts/4-6b-raccorder-le-slice-bandeau-live-dans-lapplication-peintre-nano-reellement-servie.md` | Intégration app servie |

**BMAD planning — extraits à lire (pas recopier) :**

- `_bmad-output/planning-artifacts/prd.md` — §4.2 (chaîne 7 briques), §7 (modules obligatoires v2), glossaire `ModuleManifest`
- `_bmad-output/planning-artifacts/epics.md` — Epic 3 (socle Peintre), Epic 4 (preuve modulaire), **Epic 6** (clôture caisse / pilote #2), Story 9.6 (config admin simple), AR45/AR46
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — statut Story **9.6** et dépendances sprint
- `_bmad-output/planning-artifacts/architecture/post-v2-hypothesis-marketplace-modules.md` — §2–4 séparation domaines, §4 alignement v2

---

## 6. Sources transverses (hors tableau par fichier)

| Zone | Chemins |
|------|---------|
| Config modules site | `references/config-modules-site-id/index.md`, `ADR-001-*.md`, `livrable-normatif-architecture.md`, `openapi-module-config.yaml`, `schemas/` |
| Gouvernance contrats | `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md` |
| Peintre / ADR UI | `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md` ; `peintre-nano/docs/` (README, architecture runtime, contrats CREOS, guide dev) |
| Dossier architecte | `references/dossier-architecte-externe-v2/05-ARCH-frontend-peintre-creos-contrats.md`, `07-ARCH-todos-et-questions-architecte.md` |
| Chaîne compta Paheko | `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md` |
| Recherche Perplexity (fév. 2026) | `references/recherche/2026-02-24_frameworks-modules-python_perplexity_prompt.md`, `references/recherche/2026-02-24_frameworks-modules-python_perplexity_reponse-1.md`, `references/recherche/2026-02-24_frameworks-modules-python_perplexity_reponse-2.md`, `references/recherche/2026-02-24_frameworks-modules-python_perplexity_reponse-2-complement.md` ; `references/recherche/2026-03-31_brique-nano-peintre-modularite-json-ui_perplexity_reponse.md` |
| Sprint / Story 9.6 | `_bmad-output/implementation-artifacts/sprint-status.yaml` |
| Sessions / transcripts Cursor | `agent-transcripts/0c9a9709-d1f8-406b-a9ea-26ff2c59a7fd`, `agent-transcripts/7f711038-9b17-4fcc-a327-5a9a52e71817` (projet Cursor, hors repo) |
| Modèle pack agent | `references/operations-speciales-recyclique/index.md`, `2026-04-18_prompt-ultra-operationnel-operations-speciales-recyclique_v1-1.md` |

---

## 7. Critère de succès du chantier rédactionnel

Un agent ou un dev ouvre `references/protocole-modules-recyclique/index.md` → suit `06-MOD-cookbook-nouveau-module-optionnel.md` et sait : quels fichiers créer (back, front, contrats), comment activer par `site_id`, comment insérer une étape workflow Peintre, quand JSON config (`config-modules-site-id`) vs tables métier — **sans** parcourir 15 dossiers dispersés.

---

## 8. Workers rédaction (lots 0–5)

Découpage parallélisable pour agents / rédacteurs (aligné §2 phases) :

| Lot | Fichiers | Phase |
|-----|----------|-------|
| **0** | `index.md`, `00-MOD-cadrage-chantier.md` | Amorçage |
| **1** | `01-MOD-matrice-choix-modularite.md`, `07-MOD-adr-reconciliation-v01-v02.md` | A — Réconciliation |
| **2** | `02-MOD-taxonomie-types-de-modules.md`, `05-MOD-registre-module-key.md` | B — Taxonomie & registre |
| **3** | `03-MOD-protocole-backend.md`, `04-MOD-protocole-front-creos.md` | C — Protocoles |
| **4** | `06-MOD-cookbook-nouveau-module-optionnel.md`, `08-MOD-exemple-pilote-comptage-pieces-billets.md` | D — Cookbook & pilote |
| **5** | `09-MOD-lacunes-et-questions-ouvertes.md`, `prompt-agent-chantier-modules.md`, MAJ pointeurs `references/index.md` | E — Clôture |

**Statut chantier rédactionnel (2026-05-20) :** lots **0–5** livrés (brouillon normatif) — re-QA2 cycle 2 après sync statuts.

---

## 9. Enrichissement v2 (post-rédaction — meta)

Le chantier **rédactionnel** (§2 phases, lots 0–5) est **clos**. La **cohérence transversale** du pack (fichiers `10`–`22`, pont T-MOD, corrections P2 QA2, index transverses) est pilotée par un plan distinct :

| Document | Rôle |
|----------|------|
| [`00-MOD-plan-enrichissement-v2-2026-05-20.md`](00-MOD-plan-enrichissement-v2-2026-05-20.md) | Planificateur **v2** — audit post-QA2 **96 %**, création `22`, patches `01`–`09`, sync `index` / cartographie / dossier architecte |
| [`00-MOD-plan-enrichissement-modules.md`](00-MOD-plan-enrichissement-modules.md) | Planificateur enrichissement **v1** (clos) |
| [`qa2-rapport-final.md`](qa2-rapport-final.md) | QA2 fusionné — cycle 3 **GO** ; **cycle 4 v2** optionnel (cible **97 %**, gate G5 du plan v2) |

**Ne pas confondre :** ce fichier ordonne la **première** rédaction `00`–`09` + cookbook ; le plan v2 **ne réécrit pas** le protocole normatif, il synchronise hubs et ponts.

---

_Document planificateur — ne pas confondre avec les livrables normatifs du pack._
