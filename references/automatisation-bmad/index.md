# Index — Orchestration BMAD (Cursor)

Même dossier **`automatisation-bmad/`** : matière pour **orchestrer** le cycle BMAD dans Cursor (skills, `sprint-status`, gates, HITL). **Pas d'exécution automatique headless** : tout reste guidé par l'humain et le LLM dans l'IDE (voir recueil §15).

| Fichier | Rôle |
|--------|------|
| [2026-04-02_recueil-technique-orchestration-bmad.md](2026-04-02_recueil-technique-orchestration-bmad.md) | Recueil technique **(v5)** : chemins, phase 4 / anytime, carte **CSV → skill**, `sprint-status`, QA, HITL, graphe v0, **§15** cadre Cursor ; **§16** inclut livrables orchestrateurs (historique v5). |
| [epic-story-runner-spec.md](epic-story-runner-spec.md) | Spec **Epic Runner / Story Runner** : briefs YAML, graphe, plafonds / compteurs, **§5.4** YAML↔graphe, **§7.1** rapport final, **§11** critères d'acceptation, gates Windows, plan B Task (recueil §4–§15). |
| `../../.cursor/agents/bmad-epic-runner.md` | Agent **Epic Runner** (choix story, délégation Task, résumé léger). |
| `../../.cursor/agents/bmad-story-runner.md` | Agent **Story Runner** (cycle story, compteurs, sorties PASS/FAIL/NEEDS_HITL). |
| `../../.cursor/skills/bmad-epic-runner/SKILL.md` | Skill d'entrée : renvoie agent + spec. |

**Charger si :** conception d'agents ou skills **coordinateurs**, enchaînement **assisté** story par story, contrat YAML ou fichiers d'état **documentaires** — pas un runner CI autonome.
