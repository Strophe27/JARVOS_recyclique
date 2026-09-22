# Story 10.7 : Définir et vérifier les gates de beta interne et de v2 vendable

Status: ready-for-dev

**Story ID :** 10.7  
**Story key :** `10-7-definir-et-verifier-les-gates-de-beta-interne-et-de-v2-vendable`  
**Epic :** epic-10 — Industrialiser, valider et rendre la v2 deployable  

<!-- Ultimate context engine analysis completed — BMAD create-story (CS) 2026-09-21. PRD §13.0 G-plancher / §13.1 beta / §13.2 G-vendable ; D1 Option C ; AR37. -->

## Story

En tant que **product owner et équipe de livraison**,  
je veux des **gates de release explicites et vérifiables**,  
afin que **« beta interne »**, **G-plancher** (`v2.0.0` + C2b) et **« v2 vendable »** (PRD §13.2) aient un **sens concret**, **traçable dans le backlog**, et **ne soient pas confondus**.

## Story Preparation Gate (énumération obligatoire — figée au CS)

Les **six piliers** du lot gates release (alignés `epics.md` Story 10.7 + PRD §13 + sprint-change **2026-09-21** §4) :

| # | Pilier | Intention | Ancres existantes (ne pas réinventer) |
|---|--------|-----------|----------------------------------------|
| **1** | **`g_plancher`** | Gate **G-plancher** : socle **L0** + **C2b** terrain **avant** tag **`v2.0.0`** — **distinct** de vendable | PRD §13.0 ; `guide-pilotage-v2.md` §5.3 ; `references/versioning.md` ; plan post-9.6 § C2b |
| **2** | **`beta_interne`** | Gate **beta interne ressourcerie test** (PRD §13.1) : terrain, compta, modularité partielle, zéro fuite contexte | PRD §13.1 ; peloton **10.4** ; observabilité **10.5** ; install **10.6** |
| **3** | **`g_vendable`** | Gate **G-vendable** / commercialisable (PRD §13.2) : couches **D** complètes, HelloAsso minimum, install OS, ouverture communautaire | PRD §13.2, §7.1 ; **D3** parking HelloAsso |
| **4** | **`mandatory_module_map`** | Carte **modules obligatoires** PRD §7.1 avec statut **ready / partial / blocking** **par gate** (pas un seul booléen flou) | `references/protocole-modules-recyclique/05-MOD-registre-module-key.md` ; `sprint-status.yaml` (9.x backlog vs done) |
| **5** | **`evidence_index`** | Index des **preuves** déjà industrialisées Epic **10.1–10.6** (liens, pas copie) | `doc/ci-minimal.md` ; `doc/critical-core-peloton.yaml` ; `doc/observability-critical-flows.yaml` ; `doc/supported-stack-official.yaml` |
| **6** | **`c2b_hitl_boundary`** | Frontière **C2b** : session HITL Strophe + bénévole — **non signée** au CS ; **interdit** de la marquer `done` ou de simuler un tag | sprint-change **2026-09-21** §4 ; `references/ou-on-en-est.md` |

**Séquence jalons (D1 — ne pas inverser)** : **beta interne** (terrain ressourcerie test, sans tag vendable) → **G-plancher** (socle L0 + C2b validé terrain **avant** tag **`v2.0.0`**) → **G-vendable** / tag **`v2.0.0`** seulement si critères §13.2 + modules **D** ; le guide et le YAML **nomment** cette progression sans fusionner beta et plancher.

**Hors périmètre des piliers ci-dessus en 10.7 :** readiness **globale** agrégée (**10.8**) ; exécution réelle **C2b** terrain ; **tag Git** **`v2.0.0`** ; **push** ; **essai prod** Recycliq ; promotion **`10-1`** à `done` ; livraison modules **D** (**9.1–9.3**, **9.7+**) ; dev HelloAsso (**D3**).

## Décisions Ombre / pilotage (2026-09-21)

- **D1 Option C** : trois niveaux de gate documentés — **G-plancher** ≠ **beta interne** ≠ **G-vendable** ; le YAML et le guide **doivent** avoir trois sections nommées explicitement.
- **Séquence L0** : **10.1** reste **`review`** (ne pas `done`) ; **10.2**–**10.6** (+ **10.6b–10.6e**) **`done`** ; **10.7** (cette story) **avant** **10.8** ; **`epic-10`** **`in-progress`**.
- **C2b réel** : statut HITL **`not_signed`** dans le manifeste jusqu'à validation Coordinateur + PO — **aucune** preuve inventée, **aucun** champ `c2b_status: done`.
- **Tag / prod** : documenter les **conditions** du tag **`v2.0.0`** ; **interdit** en DS de créer un tag, pousser, ou lancer un essai prod.
- **10.1 dette bandeau-live** : peut apparaître comme **risque résiduel** ou **partial** sur gate beta (CI `continue-on-error` documenté) — **sans** forcer fermeture 10.1.

## Acceptance Criteria

Source normative : `_bmad-output/planning-artifacts/epics.md` — **Story 10.7** (traduction exécutable). Traçabilité : **PRD §13.0–13.2**, **§7.1**, **AR37**, sprint-change **2026-09-21** §4.

1. **Manifeste machine-readable des gates** — Étant donné que les décisions release doivent être **auditables**, quand les gates sont définies, alors le dépôt contient **`doc/release-gates-official.yaml`** avec : `version`, `story: "10.7"` ; section **`gates`** avec **exactement** trois clés **`g_plancher`**, **`beta_interne`**, **`g_vendable`** — chacune avec `prd_section` (`13.0` / `13.1` / `13.2`), `summary` (1 ligne), `non_confusable_with[]` (**obligatoire pour les trois gates** : `g_plancher` → au minimum `[g_vendable, beta_interne]` ; `beta_interne` → `[g_plancher, g_vendable]` ; `g_vendable` → `[g_plancher, beta_interne]`) ; section **`release_gate_pillars`** reprenant les **six** clés du Story Preparation Gate (`g_plancher`, `beta_interne`, `g_vendable`, `mandatory_module_map`, `evidence_index`, `c2b_hitl_boundary`) avec `ac_refs` ; section **`c2b_hitl`** avec `status: not_signed` (valeur **autorisée** au DS : `not_signed` uniquement — **interdit** `signed` / `done` sans HITL réel hors scope 10.7) et `blocking_tag: v2.0.0` (**barrière tag uniquement** — ne remplace pas la colonne guide « prérequis C2b » sur beta/plancher, qui décrit l’**état** `not_signed`, pas une signature formelle au CS) ; section **`criteria`** : pour chaque gate, liste de **`criterion_id`** + `text` (reprise **fidèle** des lignes PRD §13.0 tableau, §13.1 tableau + puces preuves, §13.2 tableau + puces — **pas** de paraphrase qui affaiblit) — le smoke **AC3** vérifie au minimum la **présence** de chaque `criterion_id` attendu (liste figée CS en commentaire du smoke ou fichier `doc/release-gates-criterion-ids.yaml` référencé par le smoke) ; section **`mandatory_modules`** : une entrée par ligne PRD §7.1 (cashflow, reception_flow, bandeau_live, eco_organismes, adherents, sync_paheko, helloasso, config_admin_simple) avec pour chacune : `prd_label`, `module_key` si connu (sinon `null`), `story_keys[]` (**obligatoire** quand le module dépend du backlog 9.x), `gate_readiness` objet avec clés **`g_plancher`**, **`beta_interne`**, **`g_vendable`** et valeurs **`ready` | `partial` | `blocking` | `out_of_scope`** — avec règles figées CS : **config_admin_simple** et socle **6–8** / **9.10** → au minimum **`partial`** ou **`ready`** sur **g_plancher** selon preuves indexées ; **eco_organismes** → `story_keys: ["9.1"]`, **`blocking`** sur **g_vendable** tant que **9.1** **`backlog`** ; **adherents** → `story_keys: ["9.3"]`, **`blocking`** sur **g_vendable** ; **helloasso** → `story_keys: ["9.4", "9.5"]`, **`blocking`** sur **g_vendable**, **`out_of_scope`** sur **g_plancher** et **beta_interne** si **D3** parking ; section **`evidence_anchors`** listant chemins vers livrables **10.1–10.6** (fichiers `doc/*`, workflows, stories) **sans** dupliquer leur contenu ; section **`epic_24_beta_scope`** avec `decision: pending_po` et rappel PRD §13.1 (inclusion/exclusion Epic 24 **documentée** avant beta — pas tranchée en 10.7 sauf note « pending ») ; champ **`sprint_status_resync`** (bool, défaut `true` au DS) : si **`sprint-status.yaml`** change le statut d’une story **9.x** référencée, le DS **réaligne** `gate_readiness` avant revue (pas de figement aveugle au CS).

2. **Guide humain des gates et décisions** — Étant donné qu'un PO ou mainteneur doit pouvoir **déclarer** ou **refuser** une release sans intuition, quand **`doc/release-gates-beta-et-vendable.md`** est rédigé, alors il contient : tableau **« Les trois gates (ne pas confondre) »** (G-plancher / beta interne / G-vendable) avec colonnes objectif, tag ou jalon, prérequis C2b (**état** : au CS **`not_signed`** — validation humaine terrain **non signée** ; colonne **ne signifie pas** que beta exige le tag `v2.0.0`), modules D ; section **C2b** expliquant que le tag **`v2.0.0`** est **interdit** tant que C2b n’est **pas validé terrain** (HITL) — **état courant au CS : non signé** (`not_signed` dans le YAML) ; section **Beta interne** : checklist exécutable (scénarios cashflow/réception, sync, bandeau, contexte) avec colonnes **`criterion_id`** (alignées § `criteria` / PRD §13.1) et **« preuve / lien »** vers `evidence_anchors` ; section **G-vendable** : checklist §13.2 + mention explicite **modules D** et **HelloAsso** (**D3**) ; section **Matrice modules obligatoires** (reprise lisible du YAML, incluant `story_keys`) ; section **Décision release** (template court : gate visée, date, verdict go/no-go, risques ouverts — **10.1 `review`** et bandeau **partial** autorisés pour **beta** sans fermer 10.1 ; **pas de tag automatique**) ; renvois **`guide-pilotage-v2.md` §5.3**, **`references/versioning.md`**, sprint-change **2026-09-21**.

3. **Vérification automatisée (doc + cohérence)** — Étant donné que « vérifier » en 10.7 signifie **verrouiller la définition** et **détecter les régressions documentaires**, quand la story est livrée, alors **`tests/infra/test_story_10_7_release_gates_doc_smoke.py`** vérifie : existence YAML + MD ; les **3** clés `gates` ; **`non_confusable_with`** présent pour **`beta_interne`** (et les trois paires minimales plancher↔vendable↔beta) ; les **6** clés `release_gate_pillars` ; `c2b_hitl.status == not_signed` ; présence des **8** modules `mandatory_modules` avec **`story_keys`** sur eco/adherents/helloasso ; **critères** : chaque `criterion_id` attendu (liste CS) présent dans `criteria` ; **index AC5** : au moins une entrée `evidence_anchors` pour **10.1**, **10.2**, **10.3**, **10.4**, **10.5**, **10.6** (+ sous-clés **10.6b–10.6e** sous **10.6**) ; mots-clés **G-plancher**, **G-vendable**, **beta interne** dans le MD ; mention **interdit tag v2.0.0 sans C2b** ; liens relatifs valides vers au moins : `doc/critical-core-peloton.md`, `doc/observability-support-runbook.md`, `doc/observability-critical-flows.yaml`, `doc/installation-stack-officielle.md`, `doc/ci-minimal.md` ; **`tests/infra/test_story_10_7_release_gates_ci_minimal_smoke.py`** vérifie **`doc/ci-minimal.md` §10.7** (commandes pytest des deux smokes ci-dessus).

4. **Industrialisation CI / doc** — Étant donné le workflow **`ci-minimal.yml`** existant, quand **10.7** est livrée, alors **`doc/ci-minimal.md`** contient une section **§10.7** listant les commandes des smokes gates ; **recommandé** (DoD si peloton infra suit le pattern 10.5/10.6) : job ou step **non bloquant** optionnel en première livraison — **préférence projet** : step **bloquant** nommé `release gates doc smoke` dans le job infra/doc **si** un job équivalent existe déjà pour 10.5/10.6 — sinon §10.7 + smokes verts localement suffisent pour **review** (documenter le choix au Dev Agent Record) ; **`README.md` racine** ou **`doc/installation-stack-officielle.md`** contient un lien **« Gates release (10.7) »** vers le guide.

5. **Index preuves Epic 10 sans duplication** — Étant donné que **10.1–10.6** ont déjà produit des artefact, quand le manifeste **`evidence_anchors`** est rempli, alors chaque story **10.1**, **10.2**, **10.3**, **10.4**, **10.5**, **10.6** (et sous-clés **10.6b–10.6e** en sous-liste de **10.6**) a **au moins une** entrée `story_key` + `artifact_paths[]` ; le guide **ne recopie pas** les runbooks — **liens** uniquement ; **10.1** référencé avec statut sprint **`review`** explicite dans le YAML (`evidence_anchors` note ou `mandatory_modules` risque).

6. **Hors scope explicite** — Étant donné les frontières Epic 10, quand cette story est revue, alors **ne pas** livrer : exécution **C2b** ; tag **`v2.0.0`** ou autre ; **essai prod** ; **10.8** (readiness globale) ; nouveaux parcours métier ; implémentation **HelloAsso** ; correction globale **bandeau-live** (**10.1**) sauf mention risque ; **push** distant non demandé par PO.

## Matrice de traçabilité (C12)

| Pilier (gate) | AC principaux |
|---------------|---------------|
| `g_plancher` | **1**, **2** |
| `beta_interne` | **1**, **2**, **5** |
| `g_vendable` | **1**, **2** |
| `mandatory_module_map` | **1**, **2** |
| `evidence_index` | **1**, **5** |
| `c2b_hitl_boundary` | **1**, **2**, **6** |

| AC | Tâches (Tasks / Subtasks) | Fichiers / artefacts | Gate Story Runner |
|----|---------------------------|----------------------|-------------------|
| **1** Manifeste YAML | Créer `release-gates-official.yaml` | `doc/release-gates-official.yaml` | 3 gates + 8 modules + C2b `not_signed` |
| **2** Guide humain | Rédiger checklists + anti-confusion | `doc/release-gates-beta-et-vendable.md` | Tableau 3 gates + template décision |
| **3** Smokes doc | Pytest infra | `tests/infra/test_story_10_7_release_gates_*.py` | Smokes **verts** |
| **4** CI §10.7 | Doc + lien README/install | `doc/ci-minimal.md`, `README.md` ou guide install | §10.7 présent |
| **5** Index 10.x | `evidence_anchors` | YAML + guide | 10.1–10.6 référencés |
| **6** Hors scope | Revue périmètre | Dev Notes | Pas tag / C2b / 10.8 |

## Tasks / Subtasks

- [ ] **`doc/release-gates-official.yaml`** — Structure gate §1 : `gates` (3 clés), `release_gate_pillars` (6 clés), `c2b_hitl`, `criteria`, `mandatory_modules` (8 entrées + `story_keys`), `evidence_anchors`, `epic_24_beta_scope` (**note PO pending** + lien PRD §13.1), `sprint_status_resync`. (AC : 1, 5, 6)

- [ ] **`doc/release-gates-beta-et-vendable.md`** — Guide humain ; checklists ; matrice modules ; template décision ; C2b **non signé**. (AC : 2, 6)

- [ ] **Smokes infra** — `test_story_10_7_release_gates_doc_smoke.py` + `test_story_10_7_release_gates_ci_minimal_smoke.py`. (AC : 3)

- [ ] **`doc/ci-minimal.md` §10.7** — Commandes pytest ; lien vers guide. (AC : 4)

- [ ] **Lien découverte** — `README.md` ou `doc/installation-stack-officielle.md` → guide 10.7. (AC : 4)

- [ ] **Revue hors scope (AC6)** — Checklist : pas C2b réel ; pas tag ; pas 10.8 ; pas HelloAsso dev ; `c2b_hitl.status` reste `not_signed`. (AC : 6)

- [ ] **Sprint / story** — Après DS : Dev Agent Record, File List, `sprint-status.yaml` → **review** via Story Runner. (process BMAD)

## Dev Notes

### Frontières avec 10.1–10.6 et 10.8

| Sujet | **10.1–10.6 (`done` sauf 10.1 `review`)** | **10.7 (cette story)** | **10.8** |
|--------|-------------------------------------------|-------------------------|----------|
| CI / contrats / CREOS / tests / obs / install | **Produisent** les preuves | **Indexe + critères** de gate | **Agrège** go/no-go global |
| C2b / tag `v2.0.0` | Hors scope | **Documente** conditions ; **C2b non signé** | Peut **citer** l'état C2b |
| Modules métier **D** | Stories **9.x** backlog | **Matrice** readiness par gate | Validation transversale |

### Carte modules PRD §7.1 (état YAML au CS — le DS **aligne** le manifeste, ne **invente** pas des `done`)

| Module PRD | Stories / repère | Lecture **g_plancher** / **beta_interne** | Lecture **g_vendable** |
|------------|------------------|-------------------------------------------|-------------------------|
| Cashflow | Epic 6 **done** | `ready` ou `partial` (preuves peloton **10.4**) | `partial` jusqu'à preuves §13.2 complètes |
| Reception flow | Epic 7 **done** | idem | idem |
| Sync Paheko | Epic 8 **done**, **9.10** **done** | `partial`/`ready` (clôture v1 livrée) | `partial` (réconciliation §13.2) |
| Bandeau live | Epic 4 + dette **10.1** | `partial` si CI bandeau non bloquant | `blocking` tant que chaîne modulaire §13.2 non prouvée bout en bout |
| Config admin simple | **9.6** **done** | `ready` | `partial` (preuve changement config §13.2) |
| Éco-organismes | **9.1** **backlog** | `out_of_scope` plancher L0 | `blocking` |
| Adhérents | **9.3** **backlog** | `out_of_scope` | `blocking` |
| HelloAsso | **9.4–9.5** **backlog**, **D3** | `out_of_scope` | `blocking` (vendable §13.2) |

### Hypothèses explicites (DS)

| ID | Hypothèse | Validation |
|----|-----------|------------|
| **B1** | Les livrables **10.2–10.6** aux chemins `doc/*` cités en **10.5/10.6** existent | Smokes 10.7 : liens + **existence** de chaque path listé dans `evidence_anchors` (échec si renommage sans mise à jour manifeste) |
| **B2** | **C2b** non exécuté dans cette story | YAML `c2b_hitl.status: not_signed` + AC6 |
| **B3** | **Epic 24** scope beta = **pending PO** | `epic_24_beta_scope.decision: pending_po` ; pas de déclaration beta « go » sans note PO |
| **B4** | Pas de second fichier « gates » concurrent | Un seul couple YAML + MD canonique sous `doc/` |
| **B5** | **`gate_readiness`** peut diverger si **9.x** bouge avant DS | `sprint_status_resync: true` + réalignement manifeste avant revue |
| **B6** | **10.1** reste **`review`** ; beta peut lister bandeau **partial** | Template décision AC2 ; pas de `done` forcé sur 10.1 |

### Modes de défaillance ciblés (FMEA)

| ID | Mode | Effet | Mitigation (10.7) | AC |
|----|------|-------|-------------------|-----|
| FM1 | Confondre G-plancher et G-vendable | Fausse annonce commerciale | `non_confusable_with` + tableau guide | **1**, **2** |
| FM1b | Confondre **beta interne** et **G-plancher** | Beta déclarée au mauvais jalon | `non_confusable_with` triplet + séquence jalons CS | **1**, **2** |
| FM2 | Marquer C2b `done` sans HITL | Tag prématuré | `not_signed` seul ; smoke | **1**, **6** |
| FM3 | Créer tag `v2.0.0` en DS | Violation process | Hors scope AC6 | **6** |
| FM4 | Dupliquer runbooks 10.5/10.6 | Dette doc | `evidence_anchors` liens seuls | **5** |
| FM5 | Scope creep 10.8 | Fourre-tout | Hors scope AC6 | **6** |
| FM6 | Oublier modules §7.1 | Gate optimiste | 8 entrées `mandatory_modules` | **1** |
| FM7 | HelloAsso requis pour beta L0 | Contredit D3 | `out_of_scope` beta/plancher | **1** |
| FM8 | Essai prod dans la story | Risque prod | Interdit AC6 | **6** |
| FM9 | Déclarer beta avec **Epic 24** non tranché | Périmètre flou | `epic_24_beta_scope.pending_po` + template décision | **1**, **2** |
| FM10 | **`gate_readiness`** figé alors que **9.x** passe en `done` | Fausse gate vendable | `sprint_status_resync` + smoke `story_keys` | **1**, **3** |

### Definition of Done (Story 10.7)

- [ ] Les **6 AC** sont couverts : manifeste, guide, smokes, §10.7 CI, index 10.x, hors scope revu.
- [ ] Les **six piliers** du Story Preparation Gate sont nommés dans le YAML et le guide.
- [ ] Smokes infra **10.7** verts localement (`python3 -m pytest tests/infra/test_story_10_7_release_gates_doc_smoke.py -q` et `test_story_10_7_release_gates_ci_minimal_smoke.py -q`).
- [ ] **`c2b_hitl.status`** reste **`not_signed`** ; **aucun** tag Git créé.
- [ ] **Ne pas** forcer **10.1** à `done` ; **ne pas** rouvrir **10.2–10.6** sauf lien cassé.
- [ ] Story Runner : `sprint-status.yaml` → **review** après DS.

### Gates Story Runner (référence DS)

```bash
# Racine dépôt — smokes gates 10.7
python3 -m pytest tests/infra/test_story_10_7_release_gates_doc_smoke.py -q
python3 -m pytest tests/infra/test_story_10_7_release_gates_ci_minimal_smoke.py -q

# Régression L0 (ne pas casser)
python3 -m pytest tests/infra/test_story_10_6_installation_doc_smoke.py -q
python3 -m pytest tests/infra/test_story_10_5_observability_manifest_guard.py -q
cd recyclique/api && bash scripts/run_critical_core_peloton.sh
cd ../../peintre-nano && npm run test:critical-core
```

### Intelligence story précédente (10.6)

- **Pattern à réutiliser** : couple **`doc/*.yaml`** + **`doc/*.md`** + smokes **`tests/infra/test_story_10_*`** + **`doc/ci-minimal.md` §NN**.
- **10.6** a exclu **10.7** du scope install — inversement **10.7** **indexe** `doc/supported-stack-official.yaml` et `doc/installation-stack-officielle.md` comme preuve **G-vendable** §13.2 (installation OS).
- **FM5/FM11 10.6** : éviter scope creep — **10.7** ne refait pas l'install.

### Intelligence stories Epic 10 (10.1–10.5)

| Story | Artefact gate à référencer |
|-------|----------------------------|
| **10.1** `review` | `.github/workflows/ci-minimal.yml`, `doc/ci-minimal.md` |
| **10.2** `done` | Chaîne OpenAPI `contracts/openapi/recyclique-api.yaml` |
| **10.3** `done` | Gates CREOS, smokes `test_story_10_3_*` |
| **10.4** `done` | `doc/critical-core-peloton.yaml`, `.md` |
| **10.5** `done` | `doc/observability-critical-flows.yaml`, runbook support |

### Architecture / AR

- **AR37** : critères PRD §13 **traçables** dans le backlog — satisfait par manifeste + story.
- **AR35** : les smokes 10.7 sont **doc/infra**, pas un nouveau peloton métier.
- `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md` ligne **10.7** : gates traçables, pas déclaration floue.

### References

- [Source: `_bmad-output/planning-artifacts/prd.md` §13.0–13.2, §7.1]
- [Source: `_bmad-output/planning-artifacts/epics.md` Story 10.7, AR37]
- [Source: `_bmad-output/planning-artifacts/guide-pilotage-v2.md` §5.3]
- [Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-09-21-recadrage-plancher-option-c.md` §4]
- [Source: `references/versioning.md`]
- [Source: `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md`]

## Story completion status

- **CS :** fichier story **ready-for-dev** (2026-09-21) — six piliers gates release (Option C / D1) ; séquence beta → G-plancher → G-vendable ; C2b **`not_signed`** ; hors scope tag **`v2.0.0`**, essai prod, **10.8**.
- **QA3 :** boucle gate 95+ (2026-09-21, run `20260921_235100_jarvos_recyclique`) — score **96** ; couverture **100** ; 0 P0/P1 ; correctifs cycle 1 préservés (commits worktree `qa3-story-10-7` : `86ac96e`, `c97a331` — **pas de push** / pas de tag).
- **VS :** validate-create-story (Bob SM) — **PASS** (2026-09-21) ; checklist `bmad-create-story` ; QA3 **96** non contredit ; Gates Story Runner vérifiés (régression L0 depuis racine + `cd ../../peintre-nano` après peloton) ; rapport projet `internal/validate-story-10-7.md`.
- **Prochaine étape BMAD :** **DS** (`bmad-dev-story`) — `doc/release-gates-official.yaml`, guide humain, smokes infra §10.7, lien README/install ; **10.1** inchangé **`review`** ; **10.2**–**10.6** / **10.6b**–**10.6e** **`done`**.

## Dev Agent Record

### Agent Model Used

_(à remplir au DS)_

### Debug Log References

### Completion Notes List

### File List
