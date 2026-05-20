# Contexte chantier — memoire sessions JARVOS (Phase 0.B)

**Date :** 2026-05-21  
**Statut :** handoff Phase 0.B **livre** (doc) — implementation pipeline `jarvos-memoire-sessions/` en Phase 0.C+

---

## Objectif

Donner aux agents une **memoire agentique** legere : portes d'entree, patterns reutilisables, index plans et transcripts — sans dupliquer `references/` ni les JSONL Cursor.

---

## Livrables Phase 0.B (ce depot)

| Chemin | Role |
|--------|------|
| [`references/jarvos-agentique/index.md`](../jarvos-agentique/index.md) | Hub : workspaces, privacy, promotion `~/.cursor` |
| [`references/jarvos-agentique/00-porte-entree-contexte.md`](../jarvos-agentique/00-porte-entree-contexte.md) | **Normatif** — 4 types session, matrice charger / ne pas charger |
| [`references/jarvos-agentique/roles-ombre-archi-arbitre.md`](../jarvos-agentique/roles-ombre-archi-arbitre.md) | Postures operationnelles |
| [`references/jarvos-agentique/evolutions-methodologie.md`](../jarvos-agentique/evolutions-methodologie.md) | Timeline BMAD vs graphe plan |
| [`references/jarvos-agentique/registre-patterns.md`](../jarvos-agentique/registre-patterns.md) | Patterns P-* + calibration `c8a645ab` |
| [`references/jarvos-agentique/plans-index.md`](../jarvos-agentique/plans-index.md) | `.cursor/plans/*.plan.md` |
| [`references/jarvos-agentique/sessions/README.md`](../jarvos-agentique/sessions/README.md) | Fiches session courtes |
| [`jarvos-memoire-sessions/`](../../jarvos-memoire-sessions/README.md) | Sandbox Phase 0.A (fixtures JSONL) |

---

## Ordre de chargement (nouvelle session agent)

1. Date systeme + declarer **type de session** ([`00-porte-entree-contexte.md`](../jarvos-agentique/00-porte-entree-contexte.md) §2).  
2. [`references/index.md`](../index.md) (abstract).  
3. [`references/ou-on-en-est.md`](../ou-on-en-est.md).  
4. [`00-porte-entree-contexte.md`](../jarvos-agentique/00-porte-entree-contexte.md) — appliquer matrice §4.  
5. Sous-dossier cible (`protocole-modules-recyclique/`, story file, plan, etc.).

**Remplace progressivement** l'usage exclusif de [`2026-03-31_06_porte-entree-agent-bmad-vierge.md`](2026-03-31_06_porte-entree-agent-bmad-vierge.md) pour les types session listes ; conserver l'artefact 06 pour brainstorming BMAD vierge hors matrice.

---

## Decisions figees (Phase 0.B)

| Sujet | Decision |
|-------|----------|
| Transcripts | Index UUID + artefacts ; **pas** de JSONL dans `references/` |
| Types session | `bmad-dev-story`, `jarvos-discovery`, `orchestration-graph`, `mixte` |
| Postures | Ombre / Archi / Arbitre (combinables) |
| Patterns | Registre avec `min_hits` ; calibration session modules `c8a645ab` |
| Sandbox code | `jarvos-memoire-sessions/` reste isole ; validateur **Phase 0.C+** |

---

## Suite (hors ce handoff)

1. Valider schema manifest/prompt avec porte d'entree.  
2. Brancher `explorer-transcripts-cursor` + hooks `log/cursor-agent/` si pertinent.  
3. Implementer validateur sous `jarvos-memoire-sessions/tests/`.  
4. Premiere fiche dans `jarvos-agentique/sessions/` apres cloture QA2 modules ou memoire v2.4.

**Skill projet (Phase 3) :** [`.cursor/skills/jarvos-session-memory/SKILL.md`](../../.cursor/skills/jarvos-session-memory/SKILL.md) — workflow porte d'entree, commandes `jarvos-memoire-sessions/dev/`, HITL registre patterns.

---

## Cross-references

| Besoin | Fichier |
|--------|---------|
| Outillage Cursor / BMAD | [`2026-05-20_01_recommandations-outillage-cursor-bmad-jarvos.md`](2026-05-20_01_recommandations-outillage-cursor-bmad-jarvos.md) (§4.4 pont `jarvos-session-memory`) |
| Skill memoire session | [`.cursor/skills/jarvos-session-memory/SKILL.md`](../../.cursor/skills/jarvos-session-memory/SKILL.md) |
| Modules v2 post-HITL | [`2026-05-20_06_reco-hitl-post-bouclage-modules-v2.md`](2026-05-20_06_reco-hitl-post-bouclage-modules-v2.md) |
| Orchestration BMAD | [`../automatisation-bmad/index.md`](../automatisation-bmad/index.md) |
