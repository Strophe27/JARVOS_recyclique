# QA2 refactor qa2-agent (SKILL / workflow) — 2026-05-21

## Boucle

| Cycle | Score | Gate ≥ 95 % | Action |
|-------|-------|-------------|--------|
| 1 — QA2 complet (4 passes) | **92 / 100** | Non | 8 P1 prioritaires identifiés |
| 2 — Correctifs Lot 1 + re-QA2 ciblé | **96 / 100** | **Oui** | Clôture refactor |

## Verdict

**GO** — progressive disclosure SKILL.md (trigger) + `workflow.md` (parent) validée pour usage production.

## Lot 1 appliqué (8 P1)

1. `SKILL.md` — routage Task explicite + renvoi point 5 *Exécution Task*
2. `qabrief-template.md` — format passe unique (`pass_id` = planner `id`)
3. `planner-prompt.md` — `id` ↔ `pass_id` + phrase workers isolée
4. `orchestrator-agent.md` — checklist alignée gabarit
5. `references/index.md` — `@qa2-orchestrator` dans « Charger si » + lien complément skill
6. `qa2-orchestrator.md` — chemin `workflow.md` dans chemins typiques
7. Tables `SKILL` / `workflow` — `alignment-create-skill`, `nested-task-smoke`
8. `worker-qa.md` + `workflow.md` point 6 — mapping P0/P1 et score fusionné / gate

## Lot 2 (fermé 2026-05-21)

- `nested-task-smoke.md` : `last_verified: 2026-05-21`
- `references/index.md` : lien Markdown [`.cursor/agents/qa2-orchestrator.md`](../.cursor/agents/qa2-orchestrator.md)

## QA loop (`workflow-loop.md`) — boucle exécutée sur les ajouts

| Itération | Score | Gate 95 % | Action |
|-----------|-------|-----------|--------|
| 1 | 93 | Non | P0 HITL iter3 + P1 (8+) |
| 2 | **96** | **Oui** | Lot correctifs + re-QA2 ciblé |
| 3 P1 polish | — | — | triggers SKILL, `gate_score` dans briefs orchestrator |

**Verdict** : **GO** — boucle qa / qa loop documentée et validée.

## Orchestration

- Cycle 1 : parent qa2 → planner → 4 workers (parallèle) → fusion
- Cycle 2 : 1 worker `recheck-lot1` post-correctifs
