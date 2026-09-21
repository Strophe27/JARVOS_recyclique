# Adaptation Grok Bot — orchestrateur QA 95+

Wrapper chat → **un** Task parent `executor` qui charge qa3-agent (boucle).

- Ne jamais QA inline dans le chat
- Gate défaut : quality ≥ 95, 0 P0, coverage ≥ 80, max 3 cycles, stagnation = HITL
- Skill root : `/home/box/agent-data/workflows/`
- Compatible tous les gros bots : passer chemins absolus du livrable + intention
