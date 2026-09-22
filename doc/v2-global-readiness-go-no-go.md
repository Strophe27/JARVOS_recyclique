# Readiness globale v2 — déclaration go/no-go (Story 10.8)

Synthèse humaine pour pilotage PO : agrégation des preuves **10.1–10.7** et verdicts release **Option C** (trois gates distincts). Manifeste machine-readable : [`v2-global-readiness-official.yaml`](./v2-global-readiness-official.yaml). Gates définis en **10.7** : [`release-gates-official.yaml`](./release-gates-official.yaml), [`release-gates-beta-et-vendable.md`](./release-gates-beta-et-vendable.md).

**Date snapshot sprint :** 2026-09-22 · **Hash court :** `74d5b02`

## Trois gates — trois verdicts

| Gate | Objectif (rappel) | Verdict DS | Facteurs bloquants principaux | Distinct des autres gates |
|------|-------------------|------------|-------------------------------|---------------------------|
| **G-plancher** | Socle L0 + C2b avant tag plancher | **conditional** | C2b non signé ; session terrain C2b en attente | Ne couvre pas beta terrain ni modules D vendables |
| **Beta interne** | Ressourcerie test, compta acceptable, modularité partielle | **conditional** | **10.1** en `review` ; checklist §13.1 partielle ; Epic 24 PO pending | Ne valide pas commercialisation ni tag plancher |
| **G-vendable** | V2 commercialisable (§13.2) | **no_go** | Modules **9.1**, **9.3**, **HelloAsso**, bandeau live **blocking** (manifeste 10.7) | Exige couches D complètes — au-delà du socle Epic 10 |

Les trois verdicts sont **indépendants** : un socle documenté (**conditional** plancher) n'implique ni beta **go** ni **G-vendable** **go**.

## Synthèse des 7 dimensions

1. **`critical_flows`** — Peloton critical core (**10.4** **done**) : preuves [`critical-core-peloton.md`](./critical-core-peloton.md) et manifeste YAML ; epics 6–8 couverts au niveau index, pas re-test métier intégral en 10.8.

2. **`contracts_creos`** — Chaîne OpenAPI (**10.2**) et CREOS / rendu (**10.3**) **done** : [`contracts/openapi/recyclique-api.yaml`](../contracts/openapi/recyclique-api.yaml), gouvernance manifests CREOS.

3. **`observability_support`** — **10.5** **done** : [`observability-support-runbook.md`](./observability-support-runbook.md), [`observability-critical-flows.yaml`](./observability-critical-flows.yaml).

4. **`installation_stack`** — **10.6** (+ **10.6b–10.6e**) **done** : [`installation-stack-officielle.md`](./installation-stack-officielle.md), [`supported-stack-official.yaml`](./supported-stack-official.yaml).

5. **`release_gates`** — **10.7** **done** : définition des trois gates, matrice `mandatory_modules`, C2b documenté — consommé pour les verdicts ci-dessus sans recopier les runbooks.

6. **`ci_industrialization`** — **10.1** **`review`** : CI minimale opérationnelle ([`ci-minimal.md`](./ci-minimal.md), workflow) avec dette **bandeau-live** explicite ; **pas** de promotion **10.1** à `done` dans cette story.

7. **`go_no_go_verdicts`** — Verdicts séparés dans le YAML ; C2b **non signé** ; **interdit tag `v2.0.0` sans C2b** validé Coordinateur + PO.

## État Epic 10 (stories 10.1–10.7)

| Story | Statut sprint | Ancres preuve |
|-------|---------------|---------------|
| **10.1** | `review` | [`ci-minimal.md`](./ci-minimal.md), `.github/workflows/ci-minimal.yml` |
| **10.2** | `done` | OpenAPI reviewable |
| **10.3** | `done` | CREOS manifests + smokes rendu |
| **10.4** | `done` | Peloton critical core |
| **10.5** | `done` | Observabilité + runbook support |
| **10.6** | `done` | Stack supportée + guide install |
| **10.7** | `done` | Gates release (manifeste + guide) |

Fichiers story : `_bmad-output/implementation-artifacts/10-*-*.md` · Sprint : `_bmad-output/implementation-artifacts/sprint-status.yaml`

## C2b et tag plancher

- **C2b : non signé** (aligné manifeste 10.7 — pas de feu verte HITL simulée).
- **Tag Git `v2.0.0` : interdit** tant que C2b n'est pas validé ; le DS 10.8 ne crée aucun tag.
- Renvoi : plan post-9.6 § C2b, [`sprint-change-proposal-2026-09-21-recadrage-plancher-option-c.md`](../_bmad-output/planning-artifacts/sprint-change-proposal-2026-09-21-recadrage-plancher-option-c.md).

## Risques résiduels (reprise YAML)

| ID | Sévérité | Résumé |
|----|----------|--------|
| RR_10_1_bandeau_ci | P1 | 10.1 review — dette bandeau / CI Peintre |
| RR_C2B_unsigned | P0 | C2b non signé — bloque G-plancher **go** et tag |
| RR_MODULES_D_BACKLOG | P1 | 9.1 / 9.3 / HelloAsso blocking **G-vendable** |
| RR_PWA_NOT_READY | P2 | Baseline planification 2026-04-19 — PWA NOT READY |

## Baseline planification (lecture seule)

Le rapport [`implementation-readiness-report-2026-04-19.md`](../_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-19.md) reste la gate **BMAD phase 3→4** ; **10.8** ne le remplace pas (`not_superseded_by_10_8: true` dans le YAML).

## Prochaine phase

Selon [`guide-pilotage-v2.md`](../_bmad-output/planning-artifacts/guide-pilotage-v2.md) §5 :

- **L0** — maintenance socle, clôture dettes **10.1**, signature **C2b** quand terrain prêt.
- **L1** — modules **D** après arbitrages **D2/D7** (9.1, 9.3, HelloAsso…).
- **L2** — spikes et ouverture communautaire alignés **G-vendable**.

État projet : [`references/ou-on-en-est.md`](../references/ou-on-en-est.md).

## Décision PO (template — à compléter HITL)

| Champ | Valeur |
|-------|--------|
| Date | _à compléter_ |
| Gate visée | _G-plancher / beta interne / G-vendable_ |
| Verdict retenu | _à compléter après revue terrain_ |
| Signataires | Coordinateur · PO · _autres_ |

_Ce document DS laisse la décision PO vide — complément HITL hors automatisation 10.8._

## Liens canoniques (chemins `doc/`)

- [`doc/release-gates-official.yaml`](./release-gates-official.yaml) · [`doc/release-gates-beta-et-vendable.md`](./release-gates-beta-et-vendable.md)
- [`doc/critical-core-peloton.md`](./critical-core-peloton.md) · [`doc/observability-support-runbook.md`](./observability-support-runbook.md)
- [`doc/installation-stack-officielle.md`](./installation-stack-officielle.md) · [`doc/ci-minimal.md`](./ci-minimal.md)
