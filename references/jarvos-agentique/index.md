# Index — references/jarvos-agentique/

**Pack memoire agentique JARVOS** (plan memoire v2.3, **Phase 0.B** — 2026-05-21).  
Objectif : donner aux agents une **porte d'entree normative** pour les sessions Cursor sur Recyclique, sans dupliquer tout `references/` ni les transcripts integraux.

> **Source normative de chargement :** [`00-porte-entree-contexte.md`](00-porte-entree-contexte.md) (matrice type de session | charger | ne pas charger).  
> Ce fichier = **hub** (inventaire, privacy, promotion outillage).

---

## Fichiers du pack

| Fichier | Role |
|---------|------|
| [`00-porte-entree-contexte.md`](00-porte-entree-contexte.md) | **Normatif** — vision Ombre / Archi / Arbitre, 4 types de session, graphe meta-planner → plan → workers, **matrice portes d'entree** |
| [`roles-ombre-archi-arbitre.md`](roles-ombre-archi-arbitre.md) | Definition operationnelle des trois postures agent |
| [`evolutions-methodologie.md`](evolutions-methodologie.md) | Timeline BMAD vs graphe d'orchestration ; pertes recuperees |
| [`registre-patterns.md`](registre-patterns.md) | Patterns reutilisables (min_hits, must_not, deprecated) ; calibration transcript `c8a645ab` |
| [`plans-index.md`](plans-index.md) | Correspondance `.cursor/plans/*.plan.md` ↔ UUID / chantier |
| [`sessions/README.md`](sessions/README.md) | Notes de session **courtes** (pas d'archive JSONL) |

**Handoff chantier :** [`../artefacts/2026-05-21_07_contexte-chantier-memoire-jarvos.md`](../artefacts/2026-05-21_07_contexte-chantier-memoire-jarvos.md)

---

## Inventaire workspaces (multi-depot)

| Workspace | Chemin type | Role dans la memoire agentique |
|-----------|-------------|--------------------------------|
| **JARVOS_recyclique** | `…/La Clique Qui Recycle/JARVOS_recyclique` | **Canon** produit Recyclique : `references/`, `_bmad-output/`, `recyclique/`, `contracts/`, `.cursor/` projet |
| **Transcripts Cursor** | `%USERPROFILE%\.cursor\projects\<slug-projet>\agent-transcripts\` | Repères UUID ; index via skill `explorer-transcripts-cursor` — **hors depot** |
| **Skills / agents globaux** | `%USERPROFILE%\.cursor\skills\`, `%USERPROFILE%\.cursor\skills-cursor\` | QA2, long-run, tier-advisor, normalize-typographic-chars, etc. |
| **Ecosysteme JARVOS** | `references/ecosysteme/` (gitignore, liens) | Fondations / nano-mini — **referencer**, ne pas copier |
| **Vault Aethermind** | skill `vault-memory-ops` (hors ce repo) | Memoire longue duree utilisateur — pas source normative Recyclique |

**Regle :** une session Recyclique **part** de `references/index.md` + [`00-porte-entree-contexte.md`](00-porte-entree-contexte.md) ; les autres workspaces ne sont charges que si le type de session l'exige (discovery transverse, ecosysteme explicite).

---

## Privacy et retention

| Donnee | Ou | Retention | Interdit |
|--------|-----|-----------|----------|
| Transcripts Cursor (JSONL) | Disque local Cursor | Illimite cote IDE ; **non versionne** | Coller un transcript integral dans `references/` ou `sessions/` |
| Notes de session | `references/jarvos-agentique/sessions/` | Fiches **≤ 1 page** ; date + UUID optionnel + decisions | Secrets, tokens, credentials, PII |
| Artefacts handoff | `references/artefacts/` | Convention `YYYY-MM-DD_NN_*` ; index a jour | Doublonner un artefact deja ailleurs sans lien |
| Patterns / plans | Ce pack + `.cursor/plans/` | MAJ quand un pattern est **valide** (min_hits atteint) | Promouvoir un brouillon non passe QA / HITL |

**Principe :** l'index transcript ([`protocole-modules-recyclique/12-MOD-index-transcripts-modularite.md`](../protocole-modules-recyclique/12-MOD-index-transcripts-modularite.md)) montre la methode : **repères**, pas archive legale.

**Hooks `prompts.jsonl` :** par défaut `user_excerpt_sha256` + `user_excerpt_len` (pas de texte utilisateur en clair) ; audit ponctuel via `JARVOS_LOG_FULL_PROMPT=1`.

---

## Promotion vers `~/.cursor` (outillage personnel)

Promotion **apres validation** (session reussie, QA2 ou HITL, pattern `min_hits` atteint) :

| Cible | Quand promouvoir | Exemples deja en place |
|-------|------------------|-------------------------|
| `%USERPROFILE%\.cursor\skills\` | Skill **transverse** multi-projets (QA2, long-run, transcripts) | `qa2-agent`, `long-run-orchestrator`, `explorer-transcripts-cursor` |
| `.cursor/skills/` (projet) | Workflow **BMAD** ou overlay Recyclique | `bmad-*`, `idees-kanban`, `traiter-depot` |
| `.cursor/agents/` | Orchestrateur avec contrat stable | `bmad-epic-runner`, `qa2-orchestrator`, `@depot-specialist` |
| `.cursor/rules/*.mdc` | Regle **toujours active** legere | `projet-jarvos-contexte`, `git-workflow` |

**Ne pas promouvoir :** brouillons de plans, matrices de chargement non validees, extraits de chats non epures. Voir aussi [`../artefacts/2026-05-20_01_recommandations-outillage-cursor-bmad-jarvos.md`](../artefacts/2026-05-20_01_recommandations-outillage-cursor-bmad-jarvos.md).

---

## Liens projet voisins

| Besoin | Aller vers |
|--------|------------|
| Etat courant | [`../ou-on-en-est.md`](../ou-on-en-est.md) |
| BMAD / sprint | [`../automatisation-bmad/index.md`](../automatisation-bmad/index.md), `_bmad-output/implementation-artifacts/sprint-status.yaml` |
| Agent BMAD vierge (legacy) | [`../artefacts/2026-03-31_06_porte-entree-agent-bmad-vierge.md`](../artefacts/2026-03-31_06_porte-entree-agent-bmad-vierge.md) — **remplace progressivement** par `00-porte-entree-contexte.md` pour les types session listes |
| Modules optionnels | [`../protocole-modules-recyclique/index.md`](../protocole-modules-recyclique/index.md) |
| Outillage Cursor | [`../artefacts/2026-05-20_01_recommandations-outillage-cursor-bmad-jarvos.md`](../artefacts/2026-05-20_01_recommandations-outillage-cursor-bmad-jarvos.md) |

---

_(Charger si : session agent Recyclique, choix du corpus minimal, ou mise a jour du pack memoire Phase 0.B+.)_
