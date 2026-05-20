# Evolutions methodologie — BMAD vs graphe d'orchestration

**Date :** 2026-05-21  
**Role :** timeline des pivots agentiques JARVOS Recyclique ; ce qui a ete **perdu** puis **recupere** dans le pack memoire.

---

## Chronologie (resume)

| Periode | Mode dominant | Constats |
|---------|---------------|----------|
| **2026-03-16** | BMAD lineaire, epics marques done sans terrain | Ecart modules v0.1 (TOML) vs stack livree ; Correct Course → Epic 19 |
| **2026-03-31** | Pivot brownfield `recyclique-1.4.4` ; porte entree BMAD vierge | Artefact `2026-03-31_06_porte-entree-agent-bmad-vierge.md` |
| **2026-04-02+** | Spec orchestration BMAD (`automatisation-bmad/`) | Epic/Story Runner, **pas headless** |
| **2026-04-18+** | Plans `.cursor/plans/*.plan.md` + QA compta, Paheko outbox | Multi-livrables en une session ; commande `revisions-et-rapport` |
| **2026-05-20** | Chantier protocole modules : workers + QCM HITL | Transcript `c8a645ab` : cartographie → ADR-007 ; pack `protocole-modules-recyclique/` |
| **2026-05-21** | **Phase 0.B** pack `jarvos-agentique/` + sandbox `jarvos-memoire-sessions/` | Porte d'entree normative 4 types session ; registre patterns |

---

## Deux familles d'orchestration (coexistent)

### 1. Pipeline BMAD story (graphe interne)

```text
CS → VS → DS → GATE → QA → CR
```

- **Source :** [`../automatisation-bmad/epic-story-runner-spec.md`](../automatisation-bmad/epic-story-runner-spec.md)
- **Entree :** `@bmad-epic-runner` / `@bmad-story-runner`
- **Etat fin :** `sprint-status.yaml` + fichiers story `_bmad-output/implementation-artifacts/`

### 2. Graphe plan multi-vagues (meta-planner)

```text
Parent → Plan (.cursor/plans) → Workers Task → SYNC → QA2 gate
```

- **Source :** skill `long-run-orchestrator`, [`00-porte-entree-contexte.md`](00-porte-entree-contexte.md) §3
- **Etat fin :** fichiers sur disque + `00_SYNC_STATUS.md` (chantier) ; **pas** de remplacement de `sprint-status`

**Regle :** ne pas melanger les deux graphes dans un meme prompt sans declarer `mixte` et la phase courante.

---

## Pertes recuperees (anti-regression)

| Risque observe | Recuperation dans le pack |
|----------------|---------------------------|
| Charger tout `references/` | Matrice §4 dans `00-porte-entree-contexte.md` |
| Transcripts JSONL dans le depot | Privacy dans `index.md` ; index UUID seulement (`12-MOD`, `registre-patterns`) |
| Enchainement epic sans validation terrain | Arbitre + `bmad-sprint-status` ; retro epic |
| Workers sans livrables fichiers | Pattern `P-CARTO-WORKERS` + sync disque obligatoire |
| QCM implicite non trace | Pattern `P-QCM-RECO` → artefact `2026-*_06_reco-hitl-*` |
| Plans orphelins | [`plans-index.md`](plans-index.md) |
| Porte entree BMAD seule | `00-porte-entree` remplace progressivement l'artefact 06 pour les 4 types session |

---

## Suite (Phase 0.C+)

- Valider schema lignes manifest/prompt (`jarvos-memoire-sessions/`)
- Brancher hooks `log/cursor-agent/` si correlation session ↔ transcript UUID
- Promouvoir patterns `min_hits` atteints vers `~/.cursor/skills/` (voir `index.md` § promotion)
