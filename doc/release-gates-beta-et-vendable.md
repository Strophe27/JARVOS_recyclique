# Gates release — beta interne, G-plancher et v2 vendable (story 10.7)

Manifeste machine-readable : [`release-gates-official.yaml`](./release-gates-official.yaml) · critères figés : [`release-gates-criterion-ids.yaml`](./release-gates-criterion-ids.yaml).

**Séquence jalons (D1 — ne pas inverser)** : **beta interne** (terrain ressourcerie test, sans tag vendable) → **G-plancher** (socle L0 + C2b validé terrain **avant** le **premier tag plancher** **`v2.0.0`** — voir [`references/versioning.md`](../references/versioning.md) / `gp_tag_v200`) → **G-vendable** (critères PRD §13.2 + modules **D** ; jalon commercial **distinct** du tag plancher post-C2b).

Renvois : [`_bmad-output/planning-artifacts/guide-pilotage-v2.md`](../_bmad-output/planning-artifacts/guide-pilotage-v2.md) §5.3 · [`references/versioning.md`](../references/versioning.md) · sprint-change **2026-09-21** [`_bmad-output/planning-artifacts/sprint-change-proposal-2026-09-21-recadrage-plancher-option-c.md`](../_bmad-output/planning-artifacts/sprint-change-proposal-2026-09-21-recadrage-plancher-option-c.md) §4.

## Les trois gates (ne pas confondre)

| Gate | Objectif | Tag ou jalon | Prérequis C2b (état) | Modules D |
|------|----------|--------------|----------------------|-----------|
| **Beta interne** | Valider terrain ressourcerie test (PRD §13.1) : cashflow/réception, sync, bandeau, contexte | Pas de tag **`v2.0.0`** ; jalon terrain | **`not_signed`** — validation HITL terrain **non signée** au CS (colonne = état, pas une signature formelle) | Hors scope modules **D** backlog (9.1, 9.3, HelloAsso) |
| **G-plancher** | Socle L0 + parité gestes 1.4.4 + **C2b** avant premier tag plancher | **`v2.0.0`** **interdit** tant que C2b non validé | **`not_signed`** — tag bloqué jusqu'à HITL Coordinateur + PO | **Ne satisfait pas** §13.2 (pas vendable) |
| **G-vendable** | V2 commercialisable (PRD §13.2) : D complet, HelloAsso min., install OS | Jalon **vendable** (tag **`v2.0.1+`** / critères §13.2) **après** plancher **`v2.0.0`** — ne pas confondre avec le tag plancher seul | **`not_signed`** au CS — **interdit tag plancher `v2.0.0` sans C2b** validé terrain | **eco-organismes**, **adhérents**, **HelloAsso (D3)** requis |

## C2b et tag `v2.0.0`

Le tag **`v2.0.0`** est **interdit** tant que la session **C2b** (plan post-9.6) n'est **pas validée terrain** (HITL Coordinateur + PO).

**État courant au CS / DS story 10.7 :** **`not_signed`** dans [`release-gates-official.yaml`](./release-gates-official.yaml) (`c2b_hitl.status`). Aucune preuve inventée ; pas de simulation `signed` / `done` dans cette story.

## Beta interne — checklist exécutable

| `criterion_id` | Contrôle | Preuve / lien |
|----------------|----------|---------------|
| `bi_terrain_fiable` | Cashflow + réception nominaux/dégradation sans perte de contexte | Peloton **10.4** : [`critical-core-peloton.md`](./critical-core-peloton.md), [`critical-core-peloton.yaml`](./critical-core-peloton.yaml) |
| `bi_compta_acceptable` | Sync / réconciliation parcours prioritaires | Observabilité **10.5** : [`observability-support-runbook.md`](./observability-support-runbook.md), [`observability-critical-flows.yaml`](./observability-critical-flows.yaml) |
| `bi_modularite_partielle` | Bandeau live : CREOS → rendu | Gates **10.3** + dette **10.1** `review` (bandeau **partial**) |
| `bi_zero_fuite_contexte` | Site / caisse / session / poste | Peloton + runbook observabilité (liens ci-dessus) |
| `bi_preuve_scenarios_liste` | Scénarios critiques documentés | Index YAML `evidence_anchors` — pas de copie runbook ici |
| `bi_preuve_fallback_quarantaine` | Fallback / blocage / quarantaine | [`observability-critical-flows.yaml`](./observability-critical-flows.yaml) |
| `bi_constats_terrain_ressourcerie` | Retour terrain ressourcerie test | Hors scope 10.7 — template décision ci-dessous |
| `bi_preuve_caisse_compta_mixte` | Paiements mixtes, don, remboursements, snapshot session | PRD §13.1 — preuves à documenter au go beta |
| `bi_epic_24_preuves` | Epic 24 si dans scope | `epic_24_beta_scope.decision: pending_po` dans le manifeste |
| `bi_decision_epic_24_scope` | Inclusion / exclusion Epic 24 | Note PO **pending** — pas de go beta silencieux |
| `bi_preuve_bandeau_module_manifest` | ModuleManifest + slots + rendu | CREOS **10.3** ; risque **10.1** `review` |

## G-vendable — checklist (PRD §13.2)

| `criterion_id` | Contrôle | Preuve / lien |
|----------------|----------|---------------|
| `gv_terrain_fiable` | Cashflow, réception, clôture sur stack supportée | Peloton **10.4** |
| `gv_compta_propre` | Réconciliation + écarts sync | **10.5** runbook |
| `gv_modularite_front_e2e` | Bandeau + **eco-organismes** + **adhérents** | Modules **9.1** / **9.3** **backlog** → **blocking** dans le manifeste |
| `gv_zero_fuite_contexte` | Contextes sensibles | Peloton + observabilité |
| `gv_config_admin_minimale` | Changement config tracé sans redeploiement | Story **9.6** **done** |
| `gv_installation_oss` | Install nominale OS officiel | **10.6** : [`installation-stack-officielle.md`](./installation-stack-officielle.md), [`supported-stack-official.yaml`](./supported-stack-official.yaml) |
| `gv_ouverture_communautaire` | Contrats + doc install + contribution | [`contracts/README.md`](../contracts/README.md), [`ci-minimal.md`](./ci-minimal.md) |
| `gv_preuve_scenarios_caisse_reception` | Scénarios documentés | À compléter au go vendable |
| `gv_preuve_modularite_bandeau_eco_adherents` | Modularité bout en bout | **D** + **HelloAsso (D3)** |
| `gv_publication_matrice_env` | Matrice environnements | **10.6** manifeste stack |
| `gv_publication_navigateurs_a11y` | Navigateurs + a11y cible | Guide install § navigateurs |
| `gv_absence_defaut_critique` | Pas de fuite / blocage compta | Gates **10.4** / **10.5** |
| `gv_preuve_paheko_lot_session` | Lot session + reprise Paheko | Epic 8 / **9.10** |
| `gv_preuve_config_admin_change` | Preuve changement config | **9.6** |

**Modules D et HelloAsso (D3)** : obligatoires pour **G-vendable** ; **out of scope** pour beta et G-plancher tant que stories **9.x** en backlog (voir matrice).

## Matrice modules obligatoires (PRD §7.1)

Reprise lisible du manifeste — aligner `gate_readiness` si `sprint-status.yaml` fait évoluer une story **9.x** (`sprint_status_resync: true`).

| Module | `module_key` | `story_keys` | G-plancher | Beta interne | G-vendable |
|--------|--------------|--------------|------------|--------------|------------|
| Cashflow | `cashflow` | — | ready | ready | partial |
| Reception flow | `reception` | — | ready | ready | partial |
| Bandeau live | `kpi-live-banner` | `10.1` | partial | partial | blocking |
| Éco-organismes | `eco-organismes` | `9.1` | out_of_scope | out_of_scope | blocking |
| Adhérents | `adherents` | `9.3` | out_of_scope | out_of_scope | blocking |
| Sync Paheko | — | `9.10` | ready | partial | partial |
| HelloAsso | `helloasso` | `9.4`, `9.5` | out_of_scope | out_of_scope | blocking |
| Config admin simple | — | `9.6` | ready | partial | partial |

## Décision release (template)

```
Gate visée : [ beta_interne | g_plancher | g_vendable ]
Date :
Verdict : [ go | no-go ]
C2b (état manifeste) : not_signed  ← ne pas marquer signé sans HITL réel
Risques ouverts :
  - 10.1 review / bandeau partial (autorisé pour beta, pas fermeture 10.1)
  - Epic 24 scope : pending_po
  - Modules D backlog (9.1, 9.3, 9.4–9.5)
Tag Git : aucun automatique — interdit v2.0.0 sans C2b validé
```

## Index preuves Epic 10 (liens — pas de duplication)

| Story | Statut sprint | Artefacts (voir YAML `evidence_anchors`) |
|-------|---------------|---------------------------------------------|
| **10.1** | `review` | CI [`ci-minimal.md`](./ci-minimal.md), workflow |
| **10.2** | `done` | OpenAPI [`contracts/openapi/recyclique-api.yaml`](../contracts/openapi/recyclique-api.yaml) |
| **10.3** | `done` | CREOS manifests |
| **10.4** | `done` | [`critical-core-peloton.md`](./critical-core-peloton.md) |
| **10.5** | `done` | [`observability-support-runbook.md`](./observability-support-runbook.md) |
| **10.6** | `done` | [`installation-stack-officielle.md`](./installation-stack-officielle.md) (+ **10.6b–10.6e**) |

## Liens canoniques (preuves Epic 10 — chemins `doc/`)

- [`doc/critical-core-peloton.md`](./critical-core-peloton.md) · [`doc/observability-support-runbook.md`](./observability-support-runbook.md)
- [`doc/observability-critical-flows.yaml`](./observability-critical-flows.yaml) · [`doc/installation-stack-officielle.md`](./installation-stack-officielle.md)
- [`doc/ci-minimal.md`](./ci-minimal.md)

## Hors périmètre story 10.7

Exécution **C2b** terrain ; création de tag **`v2.0.0`** ; essai prod Recycliq ; story **10.8** ; implémentation HelloAsso ; correction globale bandeau (**10.1**) — seulement risque documenté.
