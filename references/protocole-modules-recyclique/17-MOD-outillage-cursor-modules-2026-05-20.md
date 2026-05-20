# 17 — Outillage Cursor / BMAD pour le chantier modules

**Statut :** brouillon normatif (enrichissement pack)  
**Date :** 2026-05-20  
**Audience :** Strophe, agents Cursor, développeurs  
**Objectif :** choisir le **bon outil** pour le pack protocole modules (rédaction, implémentation module, gates) — sans réinventer une routine par session.

**Sources :** [`references/artefacts/2026-05-20_01_recommandations-outillage-cursor-bmad-jarvos.md`](../artefacts/2026-05-20_01_recommandations-outillage-cursor-bmad-jarvos.md) (inventaire tiers A/B/C, ≥ 85 % utilité) ; [`prompt-agent-chantier-modules.md`](prompt-agent-chantier-modules.md) (phases A→D, interdits, `refs_first`).

**Complète :** [`00-MOD-cadrage-chantier.md`](00-MOD-cadrage-chantier.md) (chantier parent) ; [`15-MOD-matrice-gaps-bmad-story-9-6.md`](15-MOD-matrice-gaps-bmad-story-9-6.md) (lacunes L-03…L-15 × sprint) ; plan Cursor [`.cursor/plans/chantier_protocole_modules_fe3bc68e.plan.md`](../../.cursor/plans/chantier_protocole_modules_fe3bc68e.plan.md).

---

## 1. Porte d'entrée agent (modules)

| Élément | Usage chantier modules | Limite |
|---------|------------------------|--------|
| **[`prompt-agent-chantier-modules.md`](prompt-agent-chantier-modules.md)** | Coller en tête de session **implémentation** d'un module (phases A→D) ou **maintenance pack** (variante rédaction) | Ne remplace pas la lecture du pack `01`…`09` ; **pas** de promotion BMAD ni marketplace dans le périmètre |
| **Pack `01`…`09` + `06` cookbook** | Norme v2 : taxonomie, registre `module_key`, protocoles back/front, pilotes | Hors-scope : framework TOML, EventBus générique, marketplace post-v2 |
| **Plan `chantier_protocole_modules`** | Reprise enrichissement documentaire (fichiers `10`…`22`) | Ne pas relancer les plans archivés (`paheko_outbox`, `qa-compta`, etc. — statut DONE) |

**Règle d'or :** finir le protocole / HITL architecte **avant** `bmad-create-story` massif Epic **9** (aligné artefact `01` §4.2 action #5).

---

## 2. Tableau principal — outil | usage modules | limite

Synthèse **orientée chantier modules** (implémentation optionnelle v2, contrats CREOS/OpenAPI, Story **9.6**, enrichissement pack). Score d'utilité projet : artefact `01` (≥ 85 % = retenu).

### 2.1 Exécution module et pilotage BMAD

| Outil | Usage modules | Limite |
|-------|---------------|--------|
| **`bmad-epic-runner`** (skill + agent) | Enchaîner la **prochaine story** d'un epic backlog (**9**, **10**, **12**, **20**, **21**) sans diluer le chat parent | **Pas headless** ; exiger `epic-id` ; ne pas lancer avant clôture HITL pack si story dépend de **L-03** / **L-04** |
| **`bmad-story-runner`** (agent) | Une story : CS → VS → DS → gates → QA → CR (ex. **9-6**, futures stories comptage post-HITL) | Une story à la fois ; merge Git = humain |
| **`bmad-create-story`** | Promouvoir story depuis epics (config admin **9.6**, modules complémentaires) | Ne pas créer d'epic/story dans `_bmad-output/` **sans demande explicite** (interdit prompt § `refs_first`) |
| **`bmad-dev-story`** | Implémentation FastAPI / Peintre / contrats selon cookbook `06` et phases B→D du prompt | **Ne pas** contourner par `bmad-quick-dev` (72 % — improvisation, hors gates) |
| **`bmad-qa-generate-e2e-tests`** | Gates pytest / trace `test-summary.md` après back/front module | Complète, ne remplace pas QA2 sur **doc/contrats** |
| **`bmad-code-review`** | Avant merge branche `epic/NN` ou PR module | Contexte frais ; pas substitut à [`21-MOD-gouvernance-contrats-modules.md`](21-MOD-gouvernance-contrats-modules.md) |
| **`bmad-sprint-status`** | Vérifier `last_updated` + statut **9-6**, Epic **4** (template **done**) avant reprise | Instantané pack = 2026-04-23 — **recouper** le YAML à chaque session |
| **`bmad-correct-course`** | Écart PRD §4.2 / archi / sprint (gel epic, addendum) si pivot modularité | Pas pour routine quotidienne |
| **`bmad-help`** | « Que faire ensuite ? » entre deux epics modules | Ne remplace pas `09-lacunes` pour questions HITL |

### 2.2 Qualité, contrats et pack documentaire

| Outil | Usage modules | Limite |
|-------|---------------|--------|
| **`qa2-agent` + `@qa2-orchestrator`** | QA multi-passes : pack `03`/`04`/`05`, diff OpenAPI, manifests CREOS, handoff `references/artefacts/`, matrice **L-03…L-15** | Parent n'a pas à précharger tout le livrable ; cible ≥ 90 % sur chantiers sensibles |
| **`qa-agent`** | QA une passe sur **petit** diff (story file, extrait protocole) | Insuffisant seul pour fusion `contracts/` ou promotion post-HITL |
| **`bmad-review-edge-case-hunter`** | OpenAPI `operationId`, authz `site_id`, outbox Paheko, widgets CREOS (pilote #2 workflow step) | Périmètre **ciblé** — pas revue prose pack |
| **`bmad-review-adversarial-general`** | Specs pack, PRD §4.2 cité, gouvernance contrats | Attitude cynique — compléter par edge-case hunter sur code |
| **`revision`** (command) | Cohérence chemins/refs après livrable agent (fichiers `10`…`22`, MAJ index) | Post-livrable, pas pendant implémentation code |
| **`revisions-et-rapport`** (command) | Clôture plan enrichissement / vague long-run : rapport copiable | Pas pour chaque micro-commit |
| **`bmad-index-docs`** | MAJ `references/protocole-modules-recyclique/index.md`, `references/index.md` après nouveau fichier pack | **Ne pas** éditer `idees-kanban/index.md` à la main |
| **`normalize-typographic-chars`** | Après édition `references/protocole-modules-recyclique/` si apostrophe typo casse `search_replace` | Cibler le **dossier** du fichier, pas la racine repo |
| **`bmad-document-project`** | Brownfield / condensés (dossier architecte v2, cartographie `10`) | Pas copie PRD dans le pack |

### 2.3 Runtime, navigateur et exécution technique

| Outil | Usage modules | Limite |
|-------|---------------|--------|
| **`cursor-ide-browser`** (MCP) | Smoke UI `peintre-nano/` après phase D (activation, fallbacks, gate **4-6**) | Pas preuve contractuelle ; privilégier vs `user-chrome-devtools` (doublon) |
| **Subagent `shell`** (skill managed) | `pytest` API, `npm run generate` sous `contracts/openapi`, tests contract CREOS, build Peintre | Windows / chemins repo — pas pour décisions produit |
| **`long-run-orchestrator`** | Plan [`.cursor/plans/chantier_protocole_modules_fe3bc68e.plan.md`](../../.cursor/plans/chantier_protocole_modules_fe3bc68e.plan.md) : vagues enrichissement `10`…`22` + QA2 par vague | Une session longue ; pas pour une story isolée |
| **`user-llm-tier-advisor`** | Choisir tier/modèle **avant** chaque Task (explore vs impl vs review) | Advisory only — pas de routage auto |

### 2.4 Support projet (secondaire modules)

| Outil | Usage modules | Limite |
|-------|---------------|--------|
| **`explorer-transcripts-cursor`** | Reprise sessions BMAD / chantier modules (index `12`) | Pas mémoire inter-sessions native Cursor |
| **`idees-kanban`** | Capturer idée modularité ; pont [`13-MOD-idees-kanban-modules-liens.md`](13-MOD-idees-kanban-modules-liens.md) | Pas norme v2 ; pas MAJ index kanban à la main |
| **`traiter-depot` + `@depot-specialist`** | Ventiler recherche / artefacts déposés dans `_depot` | Contexte isolé — rare pendant impl module |
| **`@git-specialist`** | Commit Conventional Commits après gates | **Pas de push** sans validation Strophe |
| **`bmad-distillator`** | Compression audits / handoffs massifs (ex. synthèse `11`) | Perte de nuance si mal paramétré |
| **`bmad-check-implementation-readiness`** | Nouveau pivot produit modularité (reprise planning lourde) | Surcharge si v2 déjà figée |
| **`bmad-retrospective`** | Fin d'epic backlog **9** / **10** / **12** | 83 % score mais process utile |
| **`split-to-prs`** | Avant merge branche `epic/NN` volumineuse (plusieurs `module_key`) | Avant merge seulement |

### 2.5 Explicitement hors chantier modules (ne pas investir)

| Outil | Pourquoi écarté | Alternative modules |
|-------|-----------------|---------------------|
| **`bmad-quick-dev`** | Contourne create-story / gates / QA2 | `bmad-dev-story` + prompt phases A→D |
| **`bmad-create-prd`**, **`create-epics`**, **`create-architecture`**, **`create-ux`**, **`validate-prd`** | Chaîne v2 figée ; `refs_first` | Citer `_bmad-output/` ; lacunes dans `09` |
| **`bmad-party-mode`**, personas analyst/PM/UX seuls | Solo → bruit | `bmad-help` ou HITL `09` |
| **Skill `sdk` Cursor** | Headless vs cadre `references/automatisation-bmad/` | Humain + epic/story runners |
| **`vault-memory-ops`**, **`canvas`**, **`cursor-blame`** | Pas de vault / livrables = markdown+code / Enterprise | Repo + pack |
| **Marketplace Cursor / plugins tiers** | Hors-scope v2 — [`14-MOD-marketplace-post-v2-fiche-citation.md`](14-MOD-marketplace-post-v2-fiche-citation.md) *(planifié)* | Activation `module_key` serveur, build-time CREOS |
| **Command `session-migration-paheko`** | Périmètre migration, pas modularité | `references/migration-paheko/index.md` |
| **MCP `user-astrology`**, **`cursor-app-control`** | Sans lien modules | — |

---

## 3. Cartographie phases prompt A→D ↔ outils

Aligné [`prompt-agent-chantier-modules.md`](prompt-agent-chantier-modules.md) § Phases A→D (exécution module).

| Phase | Objectif modules | Outils recommandés | Gate / limite |
|-------|------------------|-------------------|---------------|
| **A — Cadrage** | Tables « existe / manque », taxonomie, `module_key` | Lecture pack ; handoff `references/artefacts/` ; **`bmad-review-adversarial-general`** si ambigu | Stop si **E.1–E.7** non cochés ; questions → `09-lacunes`, pas supposition |
| **B — Contrats** | OpenAPI, schémas config, manifests CREOS | **`shell`** (`npm run generate`) ; **`bmad-review-edge-case-hunter`** ; **QA2** ; [`21-gouvernance`](21-MOD-gouvernance-contrats-modules.md) avant merge `contracts/` | **B.3** `operationId` == `data_contract.operation_id` ; pas fusion canonique sans HITL (**L-04**) |
| **C — Backend** | FastAPI, persistance, outbox Paheko | **`bmad-dev-story`** ; **`shell`** pytest ; edge-case hunter (IDOR, 503) | Pas bus Redis générique ; compta = chaîne outbox |
| **D — Front CREOS** | Registre widgets, activation serveur, e2e | **`bmad-dev-story`** ; **`cursor-ide-browser`** ; **`bmad-qa-generate-e2e-tests`** | Pas `localStorage` comme vérité ; manifests sous `contracts/creos/manifests/` |
| **Clôture** | Story / PR / pack | **`bmad-code-review`** ; **QA2** ; **`@git-specialist`** ; **`bmad-index-docs`** + **`normalize-typographic-chars`** si pack touché | Pas promotion BMAD (**S.7** checklist prompt) |

**Variante rédaction pack** (fichiers `10`…`22`, MAJ `index`) : **`long-run-orchestrator`** ou session dédiée + **QA2** par livrable + **`revision`** — mêmes **interdits** que l'implémentation (§ Interdits du prompt).

---

## 4. Routine session type (modules)

Ordre suggéré (fusion artefact `01` §4.1 + contraintes prompt) :

1. **`references/ou-on-en-est.md`** + **`bmad-sprint-status`** (`last_updated`).
2. Mission : **impl module** → coller **`prompt-agent-chantier-modules`** + lecture `index` → `06` ; **enrichissement pack** → plan `chantier_protocole_modules`.
3. **`@user-llm-tier-advisor`** (ou tier dans brief Task) avant sous-agents.
4. Epic backlog : **`@bmad-epic-runner`** → **`@bmad-story-runner`** (**une** story).
5. Gates : **`shell`** (tests) ; **QA2** sur contrats/doc ; **`cursor-ide-browser`** si front.
6. **`@git-specialist`** (commit) ; merge = Strophe.
7. **`bmad-index-docs`** / **`normalize-typographic-chars`** si fichiers pack ; **`explorer-transcripts-cursor`** après grosse session.

**Formaliser comme gate :** QA2 entre **DS** et **CR** sur OpenAPI diff, manifests CREOS, fichiers pack sensibles (**L-11**).

---

## 5. Liens rapides

| Sujet | Chemin |
|-------|--------|
| Prompt agent modules | [`prompt-agent-chantier-modules.md`](prompt-agent-chantier-modules.md) |
| Cookbook exécution | [`06-MOD-cookbook-nouveau-module-optionnel.md`](06-MOD-cookbook-nouveau-module-optionnel.md) |
| Lacunes / HITL | [`09-MOD-lacunes-et-questions-ouvertes.md`](09-MOD-lacunes-et-questions-ouvertes.md) |
| Gaps × Story 9.6 | [`15-MOD-matrice-gaps-bmad-story-9-6.md`](15-MOD-matrice-gaps-bmad-story-9-6.md) |
| Recommandations outillage (détail scores) | [`../artefacts/2026-05-20_01_recommandations-outillage-cursor-bmad-jarvos.md`](../artefacts/2026-05-20_01_recommandations-outillage-cursor-bmad-jarvos.md) |
| Marketplace (hors v2) | [`../artefacts/2026-05-20_02_marketplace-cursor-com-evaluation-jarvos.md`](../artefacts/2026-05-20_02_marketplace-cursor-com-evaluation-jarvos.md) |
| Orchestration BMAD | [`../automatisation-bmad/index.md`](../automatisation-bmad/index.md) |

---

_Synthèse outillage — chantier protocole modules Recyclique. Ne remplace pas l'artefact `2026-05-20_01` (scores et inventaire complet) ; filtre et mappe au prompt agent et aux phases A→D._
