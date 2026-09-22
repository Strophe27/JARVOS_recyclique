# Story 10.8 : Valider la readiness globale de la v2

Status: review

**Story ID :** 10.8  
**Story key :** `10-8-valider-la-readiness-globale-de-la-v2`  
**Epic :** epic-10 — Industrialiser, valider et rendre la v2 deployable  

<!-- Ultimate context engine analysis completed — BMAD create-story (CS) 2026-09-22. Agrégation go/no-go Epic 10 ; repose sur gates 10.7 ; C2b not_signed ; pas tag v2.0.0. -->

## Story

En tant que **checkpoint final de livraison Epic 10**,  
je veux une **validation de readiness globale** sur l’ensemble du socle v2 déjà industrialisé,  
afin que la séquence **10.1–10.7** se clôture avec une **image go/no-go explicite** (par gate **G-plancher**, **beta interne**, **G-vendable**) **sans** optimisme ni fourre-tout fonctionnel.

## Story Preparation Gate (énumération obligatoire — figée au CS)

Les **sept dimensions** du passage readiness globale (alignées `epics.md` Story 10.8 + FR38 + livrables **10.1–10.7**) :

| # | Dimension | Intention | Ancres (réutiliser, ne pas réinventer) |
|---|-----------|-----------|----------------------------------------|
| **1** | **`critical_flows`** | Confiance **peloton** + parcours cashflow / réception / sync au niveau **preuve indexée**, pas re-test métier complet | `doc/critical-core-peloton.yaml`, `.md` ; stories **10.4** **done** ; epics **6–8** **done** au YAML |
| **2** | **`contracts_creos`** | Stabilité chaîne **OpenAPI → artefacts → CREOS → Peintre** | **10.2** / **10.3** **done** ; `contracts/openapi/recyclique-api.yaml` |
| **3** | **`observability_support`** | Exploitabilité réelle (corrélation, runbook, flux sync) | **10.5** **done** ; `doc/observability-critical-flows.yaml`, `doc/observability-support-runbook.md` |
| **4** | **`installation_stack`** | Chemin install + matrice environnement **officielle** | **10.6** (+ **10.6b–10.6e**) **done** ; `doc/supported-stack-official.yaml`, `doc/installation-stack-officielle.md` |
| **5** | **`release_gates`** | Définition **10.7** des trois gates + modules §7.1 | `doc/release-gates-official.yaml`, `doc/release-gates-beta-et-vendable.md` |
| **6** | **`ci_industrialization`** | CI minimale + dettes **10.1** **`review`** explicites | `.github/workflows/ci-minimal.yml`, `doc/ci-minimal.md` ; **ne pas** promouvoir **10.1** à `done` en 10.8 |
| **7** | **`go_no_go_verdicts`** | Verdicts **séparés** par gate avec risques résiduels ; **C2b** **`not_signed`** | PRD §13.0–13.2 ; `c2b_hitl` dans manifeste **10.7** — **interdit** `signed` / tag **`v2.0.0`** au DS |

**Distinction canonique (anti-confusion)** :

| Concept | Rôle | Fichier repère |
|---------|------|----------------|
| **Readiness planification 2026-04-19** | Gate **BMAD phase 3→4** (PWA **NOT READY**, GO conditionnel cœur) | `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md` — **baseline historique**, **ne pas** remplacer par 10.8 |
| **Readiness opérationnelle Epic 10 (10.8)** | Synthèse **preuves ship** **10.1–10.7** + verdicts release **Option C** | Livrables **10.8** ci-dessous |

**Hors périmètre des dimensions ci-dessus en 10.8 :** exécution **C2b** terrain ; **tag Git** **`v2.0.0`** ; **essai prod** Recycliq ; implémentation modules **9.1–9.3** / **HelloAsso** (**D3**) ; correction globale **bandeau-live** (**10.1**) ; nouvelles features **Epic 11+** ; **push** non demandé.

## Décisions Ombre / pilotage (2026-09-22)

- **Base YAML au CS :** **10.1** **`review`** ; **10.2**–**10.7** **`done`** ; **10.8** **`backlog`** → **`ready-for-dev`** (cette story) ; **`epic-10`** reste **`in-progress`** jusqu’à clôture **10.8** (rétrospective optionnelle ensuite — **pas** `done` epic au CS).
- **C2b :** reprendre **`c2b_hitl.status: not_signed`** depuis `doc/release-gates-official.yaml` — **aucune** simulation HITL ; **G-plancher** ne peut **pas** être verdict **`go`** tant que C2b reste **`not_signed`** (verdict **`no_go`** ou **`conditional`** avec blocage explicite C2b).
- **G-plancher vs G-vendable :** verdicts **indépendants** ; **G-vendable** **`go`** **interdit** au DS tant que **`mandatory_modules`** du manifeste **10.7** contient des **`blocking`** sur **g_vendable** (ex. **9.1**, **9.3**, **helloasso** **backlog**).
- **Beta interne :** peut être **`conditional`** si preuves **10.4–10.6** indexées mais **10.1** **`review`** et/ou **`epic_24_beta_scope.pending_po`** — **interdit** de déclarer beta **`go`** sans checklist §13.1 **remplie** (terrain HITL hors scope 10.8 sauf **citation** d’état).

## Acceptance Criteria

Source normative : `_bmad-output/planning-artifacts/epics.md` — **Story 10.8**. Traçabilité : **PRD §13**, **§7.1**, **FR38**, **AR37**, sprint-change **2026-09-21** §4, manifeste **10.7**.

1. **Manifeste machine-readable readiness globale** — Étant donné que la décision finale doit être **auditable** et **liée** aux gates **10.7**, quand le passage readiness est exécuté, alors le dépôt contient **`doc/v2-global-readiness-official.yaml`** avec : `version`, `story: "10.8"` ; champ **`upstream_manifest`**: `doc/release-gates-official.yaml` (chemin + `story: "10.7"`) ; section **`assessment_dimensions`** reprenant les **7** clés du Story Preparation Gate avec `ac_refs` et `evidence_story_keys[]` (10.1–10.7 selon dimension) ; section **`sprint_status_snapshot`** : date ISO, hash court git optionnel, entrées **`10-1`** … **`10-7`** avec statuts **lus** depuis `_bmad-output/implementation-artifacts/sprint-status.yaml` au moment du DS (**10-1** = **`review`**, **10-2–10-7** = **`done`** attendus au CS — le smoke **échoue** si divergence non documentée dans `snapshot_notes`) ; section **`c2b_hitl`**: **`status: not_signed`** (**seule** valeur autorisée au DS — copie cohérente avec manifeste 10.7, **interdit** `signed`) ; **`blocking_tag: v2.0.0`** ; section **`beta_interne_checklist_13_1`** : **`status`** ∈ **`fully_filled`** | **`partial`** | **`not_documented`** (checklist PRD **§13.1** via manifeste **10.7** / guide ; au DS attendu **`≠ fully_filled`**) ; section **`gate_verdicts`** avec **exactement** trois clés **`g_plancher`**, **`beta_interne`**, **`g_vendable`** — chacune avec `verdict` ∈ **`go` | **`no_go` | **`conditional`** , `rationale` (1–3 phrases factuelles), `blocking_factors[]` (ids ou story_keys), `evidence_refs[]` (chemins vers preuves **10.x** ou PRD) ; règles figées CS : **`g_plancher.verdict`** **≠** **`go`** si **`c2b_hitl.status`** **`not_signed`** ; **`g_vendable.verdict`** **≠** **`go`** si un module **`mandatory_modules`** du manifeste **10.7** a **`gate_readiness.g_vendable: blocking`** ; **`beta_interne.verdict`** **≠** **`go`** si **`sprint_status_snapshot`** **`10-1`** vaut **`review`** **ou** si **`beta_interne_checklist_13_1.status`** **≠** **`fully_filled`** (sinon **`conditional`** / **`no_go`** uniquement — aligné pilotage §2026-09-22) ; section **`residual_risks`**: liste `{risk_id, summary, severity (P0|P1|P2), owner_hint, linked_story_or_gate}` — **minimum** : risque **10.1** bandeau / CI ; risque **C2b** non signé ; risque modules **D** **backlog** ; risque **PWA NOT READY** (renvoi rapport 2026-04-19, **sans** prétendre lever le gate) ; section **`planning_readiness_baseline`**: `report_path`, `verdict_historical` (texte court), `not_superseded_by_10_8: true` ; section **`epic_10_closure`**: `ready_for_retrospective: false` au CS (**true** seulement après CR/QA3 **10.8** — le DS laisse **`false`** en **review**) ; `final_statement_one_liner` (phrase go/no-go **honête** pour la phase planifiée Epic 10).

2. **Déclaration humaine go/no-go** — Étant donné qu’un PO ou coordinateur doit décider **sans lire tout le dépôt**, quand **`doc/v2-global-readiness-go-no-go.md`** est rédigé, alors il contient : encart **« Trois gates — trois verdicts »** (tableau G-plancher / beta interne / G-vendable : objectif, verdict, facteurs bloquants, **≠** entre eux) ; section **Synthèse des 7 dimensions** (1 paragraphe chacune + liens `evidence_anchors` / stories) ; section **État Epic 10** (tableau stories **10.1–10.7** + statut sprint + lien fichier story ou `doc/*`) ; section **C2b** : **non signé** ; tag **`v2.0.0`** **interdit** ; renvoi plan post-9.6 § C2b ; section **Risques résiduels** (reprise lisible du YAML) ; section **Prochaine phase** (L0 maintenance, **L1** module **D** après **D2/D7**, **L2** spikes — `guide-pilotage-v2.md` §5) ; section **Décision PO** (template : date, gate visée, verdict, signataires — **vide** au DS sauf mention « à compléter HITL ») ; renvois **`doc/release-gates-beta-et-vendable.md`**, **`references/ou-on-en-est.md`**, rapport planification **2026-04-19** (lecture seule).

3. **Vérification automatisée (doc + cohérence)** — Étant donné que « valider » en 10.8 signifie **verrouiller la synthèse** et **détecter les incohérences**, quand la story est livrée, alors **`tests/infra/test_story_10_8_global_readiness_doc_smoke.py`** vérifie : existence YAML + MD ; **`upstream_manifest`** pointe vers manifeste **10.7** existant ; **7** dimensions ; **3** verdicts **`gate_verdicts`** ; **`c2b_hitl.status == not_signed`** ; **`g_plancher.verdict != go`** si C2b **`not_signed`** (règle CS) ; **`g_vendable.verdict != go`** si le manifeste **10.7** référencé par **`upstream_manifest`** contient au moins un **`mandatory_modules`** avec **`gate_readiness.g_vendable: blocking`** (règle CS alignée AC1) ; **`beta_interne.verdict != go`** si **`sprint_status_snapshot`** **`10-1`** vaut **`review`** (règle CS alignée AC1 et pilotage §2026-09-22) ; **`beta_interne.verdict != go`** si la checklist beta **§13.1** n’est **pas** documentée comme **entièrement remplie** dans le YAML readiness (champ explicite, ex. **`beta_interne_checklist_13_1.status: fully_filled`** — règle CS alignée AC1 et **FM10**) ; **`sprint_status_snapshot`** **aligné** avec `_bmad-output/implementation-artifacts/sprint-status.yaml` pour **`10-1`** … **`10-7`** (statuts lus sur les clés story courtes) **sauf** divergence **documentée** dans **`snapshot_notes`** (anti-FM7 : masquer **10.1** **`done`**) ; les **`blocking_factors[]`** des trois gates **ne sont pas** identiques **pair à pair** (anti-FM11 : verdicts non discriminants) ; le MD ne contient **pas** de formulation C2b **signé** / **`signed`** lorsque le YAML a **`not_signed`** (anti-FM12) ; présence **`residual_risks`** non vide ; **`sprint_status_snapshot`** contient clés courtes **`10-1`** … **`10-7`** (identifiants story, **pas** les clés longues `development_status` du sprint YAML) ; mots-clés **G-plancher**, **G-vendable**, **beta interne**, **go/no-go** dans le MD ; mention **interdit tag v2.0.0 sans C2b** ; liens relatifs valides vers : `doc/release-gates-official.yaml`, `doc/release-gates-beta-et-vendable.md`, `doc/critical-core-peloton.md`, `doc/observability-support-runbook.md`, `doc/installation-stack-officielle.md`, `doc/ci-minimal.md` ; **`tests/infra/test_story_10_8_global_readiness_ci_minimal_smoke.py`** vérifie **`doc/ci-minimal.md` §10.8** (commandes pytest des deux smokes).

4. **Industrialisation CI / doc** — Étant donné le pattern Epic **10.5–10.7**, quand **10.8** est livrée, alors **`doc/ci-minimal.md`** contient **§10.8** listant les commandes smokes readiness globale ; lien **« Readiness globale v2 (10.8) »** depuis **`doc/release-gates-beta-et-vendable.md`** (§ renvoi fin) **ou** **`README.md`** racine ; **recommandé** : même choix que **10.7** (smokes maintenance, pas obligatoirement nouveau step `ci-minimal.yml` — documenter au Dev Agent Record).

5. **Agrégation sans duplication** — Étant donné que **10.7** a déjà indexé les preuves, quand **`assessment_dimensions`** et le MD sont remplis, alors **chaque** story **10.2**, **10.3**, **10.4**, **10.5**, **10.6**, **10.7** est **référencée** au moins une fois avec **chemins** (pas de copie des runbooks/pelotons) ; **10.1** apparaît avec statut **`review`** et risque **explicite** ; le manifeste **10.7** **`mandatory_modules`** est **cité** pour les verdicts **G-vendable** (pas de second registre modules concurrent).

6. **Hors scope explicite** — Étant donné la frontière « clôture Epic 10 sans fourre-tout », quand cette story est revue, alors **ne pas** livrer : exécution **C2b** ; tag **`v2.0.0`** ; **essai prod** ; dev **9.x** / **HelloAsso** ; fermeture **10.1** forcée ; **`epic-10: done`** au YAML (réservé post-CR/QA3 **10.8** + décision PO) ; remplacement du rapport planification **2026-04-19** ; **push** distant non demandé.

## Matrice de traçabilité (C12)

| Dimension | AC principaux |
|-----------|---------------|
| `critical_flows` | **1**, **2**, **5** |
| `contracts_creos` | **1**, **2**, **5** |
| `observability_support` | **1**, **2**, **5** |
| `installation_stack` | **1**, **2**, **5** |
| `release_gates` | **1**, **2**, **5** |
| `ci_industrialization` | **1**, **2**, **4**, **6** |
| `go_no_go_verdicts` | **1**, **2**, **3**, **6** |

| AC | Tâches (Tasks / Subtasks) | Fichiers / artefacts | Gate Story Runner |
|----|---------------------------|----------------------|-------------------|
| **1** Manifeste YAML | Créer `v2-global-readiness-official.yaml` | `doc/v2-global-readiness-official.yaml` | 7 dimensions + 3 verdicts + C2b `not_signed` |
| **2** Déclaration MD | Rédiger synthèse PO | `doc/v2-global-readiness-go-no-go.md` | Tableau 3 verdicts + risques |
| **3** Smokes doc | Pytest infra | `tests/infra/test_story_10_8_global_readiness_*.py` | Smokes **verts** |
| **4** CI §10.8 | Doc + liens | `doc/ci-minimal.md`, guide gates ou README | §10.8 présent |
| **5** Agrégation | Références 10.x | YAML + MD | Pas duplication 10.7 |
| **6** Hors scope | Revue périmètre | Dev Notes | Pas tag / C2b / push |

## Tasks / Subtasks

- [x] **`doc/v2-global-readiness-official.yaml`** — Dimensions §1, snapshot sprint, verdicts, risques, lien manifeste **10.7**, `c2b_hitl.not_signed`. (AC : 1, 5, 6)

- [x] **`doc/v2-global-readiness-go-no-go.md`** — Déclaration humaine ; template décision PO ; anti-confusion trois gates. (AC : 2, 6)

- [x] **Smokes infra** — `test_story_10_8_global_readiness_doc_smoke.py` + `test_story_10_8_global_readiness_ci_minimal_smoke.py`. (AC : 3)

- [x] **`doc/ci-minimal.md` §10.8** — Commandes pytest ; lien vers MD readiness. (AC : 4)

- [x] **Lien découverte** — `doc/release-gates-beta-et-vendable.md` ou `README.md` → guide **10.8**. (AC : 4)

- [x] **Revue hors scope (AC6)** — Pas C2b réel ; pas tag ; pas `epic-10 done` ; pas promotion **10.1** ; `c2b_hitl.status` reste `not_signed`. (AC : 6)

- [x] **Sprint / story** — Après DS : Dev Agent Record, File List, `sprint-status.yaml` → **review** via Story Runner. (process BMAD)

## Dev Notes

### Frontières avec 10.7 et planification

| Sujet | **10.7 (`done`)** | **10.8 (cette story)** | **Rapport 2026-04-19** |
|--------|-------------------|-------------------------|-------------------------|
| Rôle | **Définir** gates + critères + matrice modules | **Agréger** preuves + **verdicts** go/no-go | Gate **planification** PWA / cœur |
| C2b / tag | Conditions documentées ; **`not_signed`** | **Reprend** état C2b ; **interdit** tag | Hors C2b terrain |
| Modules **D** | `gate_readiness` par gate | Verdict **G-vendable** driven par YAML **10.7** | Mention NOT READY PWA |

### Verdicts attendus au DS (honêteté — le CS **n’affirme pas** le go)

| Gate | Verdict **probable** au DS (à justifier dans YAML) | Facteur clé |
|------|-----------------------------------------------------|-------------|
| **G-plancher** | **`no_go`** ou **`conditional`** | **`c2b_hitl.not_signed`** |
| **Beta interne** | **`conditional`** | **10.1** **`review`** ; terrain §13.1 partiellement indexé |
| **G-vendable** | **`no_go`** | Modules **9.1**, **9.3**, **helloasso** **blocking** dans manifeste **10.7** |

Le DS **ne contredit pas** ces règles pour « faire joli » : un smoke **10.8** doit **échouer** si **`g_plancher.verdict: go`** avec C2b **`not_signed`**.

### Hypothèses explicites (DS)

| ID | Hypothèse | Validation |
|----|-----------|------------|
| **H1** | Manifeste **`doc/release-gates-official.yaml`** présent (**10.7** **done**) | Smoke : `upstream_manifest` + fichier existe |
| **H2** | Livrables **10.2–10.6** aux chemins `doc/*` cités en **10.7** `evidence_anchors` | Smoke : liens + existence paths agrégés ; **CS** : chemins manifeste **10.7** présents dans le worktree |
| **H3** | **C2b** non exécuté | YAML `c2b_hitl.status: not_signed` |
| **H4** | Un seul couple readiness globale canonique | Pas de second YAML « readiness » concurrent hors `doc/v2-global-readiness-official.yaml` |
| **H5** | **`epic-10`** reste **`in-progress`** en **review** 10.8 | Pas `done` epic au DS sans CR/QA3 |

### Modes de défaillance ciblés (FMEA)

| ID | Mode | Effet | Mitigation (10.8) | AC |
|----|------|-------|-------------------|-----|
| FM1 | Confondre **G-plancher** et **G-vendable** dans un verdict unique | Fausse communication | Trois verdicts séparés + tableau MD | **1**, **2** |
| FM2 | Déclarer **go** plancher sans C2b | Tag prématuré | Règle smoke + `blocking_tag` | **1**, **3**, **6** |
| FM3 | Créer tag **`v2.0.0`** | Violation process | Hors scope AC6 | **6** |
| FM4 | Dupliquer runbooks **10.4–10.6** | Dette doc | Liens uniquement AC5 | **5** |
| FM5 | Absorber features **9.x** / **11+** | Fourre-tout Epic 10 | Hors scope AC6 | **6** |
| FM6 | Remplacer rapport **2026-04-19** | Perte gate PWA | Section `planning_readiness_baseline` | **1**, **2** |
| FM7 | Forcer **10.1** **`done`** | Masquer dette bandeau | Snapshot + risque explicite + smoke **aligné** sprint YAML (AC3) | **1**, **3**, **6** |
| FM8 | **`epic-10: done`** prématuré | Clôture epic fausse | `epic_10_closure` + hors scope | **6** |
| FM9 | **`go`** **G-vendable** malgré modules **blocking** | Fausse promesse commerciale | Règle smoke AC3 + citation **`mandatory_modules`** 10.7 | **1**, **3**, **5** |
| FM10 | **`go`** **beta interne** avec **10.1** **`review`** ou checklist **§13.1** incomplète | Fausse feu verte beta | Règle smoke AC3 + pilotage §2026-09-22 | **1**, **3** |
| FM11 | **`blocking_factors`** / rationales **copiés-collés** entre gates (verdicts non discriminants) | Trois gates illisibles ou équivalentes | AC2 tableau **≠** + smoke AC3 discrimination | **1**, **2**, **3** |
| FM12 | Simuler C2b **`signed`** (YAML ou MD) | Feu verte plancher / tag **`v2.0.0`** | **`c2b_hitl.status == not_signed`** + MD C2b non signé (smoke AC3) | **1**, **3**, **6** |
| FM13 | **Push** / tag **`v2.0.0`** / **DS** sans smokes ou sans **VS** | Violation process BMAD / Epic 10 | AC6 hors scope + DoD smokes + CS « **VS** puis **DS** » | **4**, **6** |

### Definition of Done (Story 10.8)

- [x] Les **6 AC** couverts : manifeste, déclaration MD, smokes, §10.8 CI, agrégation, hors scope revu.
- [x] Les **7 dimensions** nommées dans YAML et MD.
- [x] Smokes infra **10.8** verts localement (`python3 -m pytest tests/infra/test_story_10_8_global_readiness_doc_smoke.py -q` et `test_story_10_8_global_readiness_ci_minimal_smoke.py -q`).
- [x] **`c2b_hitl.status`** **`not_signed`** ; **aucun** tag Git **`v2.0.0`**.
- [x] **`10-1`** reste **`review`** ; **10.2–10.7** inchangés **`done`** sauf resync documentée.
- [x] Story Runner : `sprint-status.yaml` → **review** après DS.

### Gates Story Runner (référence DS)

```bash
# Racine dépôt — smokes readiness globale 10.8
python3 -m pytest tests/infra/test_story_10_8_global_readiness_doc_smoke.py -q
python3 -m pytest tests/infra/test_story_10_8_global_readiness_ci_minimal_smoke.py -q

# Régression gates 10.7 (ne pas casser)
python3 -m pytest tests/infra/test_story_10_7_release_gates_doc_smoke.py -q
python3 -m pytest tests/infra/test_story_10_7_release_gates_ci_minimal_smoke.py -q
```

### Intelligence story précédente (10.7)

- **Pattern à réutiliser** : couple **`doc/*.yaml`** + **`doc/*.md`** + smokes **`tests/infra/test_story_10_*`** + **`doc/ci-minimal.md` §NN**.
- **10.7** a produit **`release-gates-official.yaml`** — **10.8** **importe** `mandatory_modules`, `c2b_hitl`, `evidence_anchors` par **référence**, pas en recopiant tout le fichier.
- **Six piliers 10.7** → **10.8** les **consomme** pour verdicts ; ne pas redéfinir les critères PRD §13.

### Intelligence Epic 10 (10.1–10.6)

| Story | Statut CS | Rôle dans readiness **10.8** |
|-------|-----------|------------------------------|
| **10.1** | **`review`** | Dimension **`ci_industrialization`** — risque résiduel **obligatoire** |
| **10.2** | **`done`** | **`contracts_creos`** (OpenAPI) |
| **10.3** | **`done`** | **`contracts_creos`** (CREOS) |
| **10.4** | **`done`** | **`critical_flows`** |
| **10.5** | **`done`** | **`observability_support`** |
| **10.6** | **`done`** | **`installation_stack`** |

### Architecture / AR

- **AR37** : critères release **traçables** — 10.8 **ferme la boucle** preuve → verdict sans nouveau critère PRD.
- **FR38** : modules obligatoires — verdict **G-vendable** **aligné** manifeste **10.7**, pas inventaire parallèle.
- `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md` ligne **10.8** : clore readiness **sans** fourre-tout.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` Story 10.8]
- [Source: `_bmad-output/planning-artifacts/prd.md` §13.0–13.2, §7.1]
- [Source: `_bmad-output/planning-artifacts/guide-pilotage-v2.md` §5]
- [Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-09-21-recadrage-plancher-option-c.md` §4]
- [Source: `doc/release-gates-official.yaml`, `doc/release-gates-beta-et-vendable.md` — story **10.7**]
- [Source: `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md` — baseline planification]
- [Source: `_bmad-output/implementation-artifacts/10-7-definir-et-verifier-les-gates-de-beta-interne-et-de-v2-vendable.md`]
- [Source: `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md`]

## Story completion status

- **CS :** fichier story **ready-for-dev** (2026-09-22) — sept dimensions readiness globale ; verdicts **séparés** G-plancher / beta / G-vendable ; C2b **`not_signed`** ; hors scope tag **`v2.0.0`**, C2b réel, **`epic-10 done`**, promotion **10.1**.
- **QA3 :** gate **97**, couverture **98**, confiance audit **95**, 0 P0/P1 (2026-09-22, run `20260922_003100_jarvos_recyclique`) — correctifs cycle 1 sur fichier story (worktree `qa3-story-10-8`, HEAD **`9170206`**, commits **locaux** — pas push).
- **VS :** **PASS** (2026-09-22) — checklist `bmad-create-story/checklist.md` ; prêt **DS**.
- **DS :** livrables readiness globale + smokes §10.8 (2026-09-22, worktree `dev-story-10-8`, base **`74d5b02`**) ; story **`review`** ; **pas** push / tag.
- **Prochaine étape BMAD :** **CR** story 10.8 ; puis QA3 impl si coordinateur ; **pas** tag **`v2.0.0`**, pas exécution **C2b**, pas promotion **10.1**.

## Dev Agent Record

### Agent Model Used

Composer 2.5 (Cloud Agent DS — Amelia / bmad-dev-story)

### Debug Log References

- Worktree : `/workspace/.worktrees/dev-story-10-8` · branche `cursor/dev-story-10-8` · auteur `jarvos-eu`

### Completion Notes List

- Manifeste `doc/v2-global-readiness-official.yaml` : 7 dimensions, snapshot sprint aligné, verdicts **g_plancher** `conditional`, **beta_interne** `conditional`, **g_vendable** `no_go`, C2b **`not_signed`**, `epic_10_closure.ready_for_retrospective: false`.
- MD `doc/v2-global-readiness-go-no-go.md` : tableau trois gates, risques, template PO vide, liens preuves Epic 10.
- Smokes **10.8** verts ; régression smokes **10.7** OK ; pas de step CI workflow (pattern 10.7).
- Lien découverte : section **Readiness globale v2 (10.8)** dans `doc/release-gates-beta-et-vendable.md`.

### File List

- `doc/v2-global-readiness-official.yaml` (nouveau)
- `doc/v2-global-readiness-go-no-go.md` (nouveau)
- `tests/infra/test_story_10_8_global_readiness_doc_smoke.py` (nouveau)
- `tests/infra/test_story_10_8_global_readiness_ci_minimal_smoke.py` (nouveau)
- `doc/ci-minimal.md` (§10.8)
- `doc/release-gates-beta-et-vendable.md` (lien 10.8)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (10-8 → review)
- `_bmad-output/implementation-artifacts/10-8-valider-la-readiness-globale-de-la-v2.md` (DS record)

## Change Log

- 2026-09-22 — DS story 10.8 : readiness globale YAML/MD, smokes infra, §10.8 CI, lien guide gates ; C2b `not_signed` ; pas tag v2.0.0.
