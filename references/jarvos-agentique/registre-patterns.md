# Registre des patterns agentiques

**Date :** 2026-05-21  
**Calibration :** transcript Cursor `c8a645ab-a1ff-4d86-a559-4362f9c8c30b` (cartographie modules, 2026-05-20) — voir aussi [`../protocole-modules-recyclique/12-MOD-index-transcripts-modularite.md`](../protocole-modules-recyclique/12-MOD-index-transcripts-modularite.md).

**Legende statut :** `valide` = reutilisable sans hesitation ; `brouillon` = en observation ; `deprecated` = ne plus appliquer.

| Champ | Signification |
|-------|---------------|
| **min_hits** | Nombre minimum de sessions reussies avant promotion `~/.cursor` ou skill dedie |
| **must_not** | Anti-patterns interdits |
| **deprecated** | Remplacement ou fin de vie |

---

## Tableau des patterns

| ID | Intention | min_hits | must_not | Statut | Preuve / lien |
|----|-----------|----------|----------|--------|---------------|
| **P-QCM-RECO** | Cloturer un bouclage par QCM explicite (N questions, reponses A/B/C) puis artefact reco daté | 2 | Improviser les decisions sans fichier `2026-*_06_*` ou equivalent | **valide** | [`2026-05-20_06_reco-hitl-post-bouclage-modules-v2.md`](../artefacts/2026-05-20_06_reco-hitl-post-bouclage-modules-v2.md) |
| **P-CARTO-WORKERS** | Discovery : N workers lecture paralleles (BMAD, references, recherche, transcripts) puis fusion index | 2 | Workers sans chemins autorises ; coller JSONL integral | **valide** | Transcript `c8a645ab` ; pack [`protocole-modules-recyclique/`](../protocole-modules-recyclique/index.md) |
| **P-ARCH-EXTERN** | Phase 0 dossier architecte : workers `bmad-document-project` bloquants, merge index, prompts 08/09 | 1 | Promotion BMAD architecture avant HITL GO | **valide** | [`dossier-architecte-externe-v2/`](../dossier-architecte-externe-v2/index.md) ; artefacts `2026-05-20_03`–`04` |
| **P-HITL-ADR** | ADR Proposed → QCM → **Accepted** → puis T-MOD / OpenAPI / stories | 2 | Coder `module-config` public avant story 9.6 si F1 = interne | **valide** | ADR-007 ; [`07-MOD-adr-reconciliation-v01-v02.md`](../protocole-modules-recyclique/07-MOD-adr-reconciliation-v01-v02.md) |
| **P-QA2-GATE** | QA2 delegue (`@qa2-orchestrator`) ; gate >= 95 % avant dev-story lourd | 3 | Parent qui pre-lit tout le corpus a la place des workers | **valide** | Plan [`qa2_global_modules_737cba4e`](../plans-index.md) ; skill `qa2-agent` |
| **P-LANG-PLANCHER** | Parent en francais ; identifiants techniques anglais ; apostrophes ASCII dans `references/` | 1 | Apostrophes typo qui cassent `search_replace` — utiliser `normalize-typographic-chars` | **valide** | Rule `apostrophes-typographiques.mdc` |
| **P-DELEG-EPIC** | Epic backlog : `@bmad-epic-runner` choisit story → Task `@bmad-story-runner` | 2 | Enchainement automatique sans humain sur merge/push | **valide** | [`automatisation-bmad/`](../automatisation-bmad/index.md) |
| **P-ESCALADE-HUMAIN** | NEEDS_HITL, score QA insuffisant, ou conflit produit → stop + checklist | 1 | Contourner HITL par « demo suffisante » sur parite legacy | **valide** | Artefacts `*needs-hitl*` ; matrice parite UI |
| **P-GRAPH-META-PLAN** | Parent = meta-planner ; produit `.cursor/plans/*.plan.md` ; declare vagues | 2 | Parent redige seul des livrables > 1 fichier sans worker | **valide** | `long-run-orchestrator` ; plans-index |
| **P-GRAPH-WORKERS-PLAN** | Workers Task avec `scope_paths` stricts ; sync `00_SYNC_STATUS.md` entre vagues | 2 | Worker qui charge `references/index.md` puis tout ouvre | **brouillon** | Plans chantier modules / QA2 |
| **P-SANS-BMAD** | Chantier doc ou audit **hors** story BMAD : discovery + QA2, pas de `sprint-status` | 2 | Creer des stories fantomes pour du pur documentation | **valide** | Chantier protocole modules Phase 0–1 |

---

## Calibration `c8a645ab` (2026-05-20)

Session de reference pour **P-CARTO-WORKERS** + **P-QCM-RECO** + **P-HITL-ADR** :

| Element | Valeur retenue |
|---------|----------------|
| Workers initiaux | 4 (BMAD, `references/`, recherche, transcripts) — fusion documentaire, pas de code produit |
| QCM | 8 questions, **8× reponse A** |
| ADR-007 | **Accepted** |
| API `module-config` | **Interne** jusqu'a story **9.6** |
| Ordre P0 | T-MOD-2 (ADR) → T-MOD-3 (fusion OpenAPI) → T-MOD-1 → seed 9.6 |
| Chargement agents | `05` loup de mer → `04` bouclage → `06-MOD` cookbook |

**must_not global (tire de cette session) :** ne pas archiver le transcript dans `references/` ; tenir les decisions dans artefacts + index UUID.

---

## Promotion pattern → outillage

| Condition | Action |
|-----------|--------|
| `min_hits` atteint + 1 QA2 ou HITL OK | Documenter dans [`evolutions-methodologie.md`](evolutions-methodologie.md) |
| Pattern transverse multi-projets | Copier procedure vers `%USERPROFILE%\.cursor\skills\` (voir [`index.md`](index.md) § promotion) |
| Pattern obsolete | Marquer `deprecated` + lien vers remplacant |

---

## Ajouter un pattern

1. Identifier ID `P-<VERBE>-<CIBLE>` unique.  
2. Renseigner min_hits (1 = cout faible, 3 = gate critique).  
3. Lister must_not testables.  
4. Lier preuve (artefact date, UUID transcript, plan).  
5. Ne pas promouvoir en skill tant que min_hits non atteint.
