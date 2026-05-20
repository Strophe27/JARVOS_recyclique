---
name: jarvos-session-memory
description: >-
  Mémoire de session agentique JARVOS : porte d'entrée normative, triage conversation,
  registre de patterns, posture Ombre/Archi/Arbitre. Charge references/jarvos-agentique/
  selon le type de session, corrèle log/cursor-agent/ et transcripts JSONL (index uniquement).
  Use when the user mentions mémoire session, triage conversation, registre patterns,
  jarvos-agentique, Ombre contexte, reprise après grosse session, ou clôture chantier mémoire.
---

# Mémoire session JARVOS

**Objectif :** démarrer ou clôturer une session avec le **minimum de contexte** (matrice normative), corréler les logs hooks et les transcripts Cursor **sans** coller de JSONL dans `references/`.

**Hub doc :** [`references/jarvos-agentique/index.md`](../../../references/jarvos-agentique/index.md)  
**Handoff chantier :** [`references/artefacts/2026-05-21_07_contexte-chantier-memoire-jarvos.md`](../../../references/artefacts/2026-05-21_07_contexte-chantier-memoire-jarvos.md)

---

## Quand appliquer ce skill

- **Mémoire session** — reprise après interruption, nouvelle session sur un chantier en cours.
- **Triage conversation** — classer une session terminée (décisions, UUID, patterns observés).
- **Registre patterns** — consulter ou **proposer** une entrée dans [`registre-patterns.md`](../../../references/jarvos-agentique/registre-patterns.md).
- **jarvos-agentique** — chargement pack Phase 0.B+ (porte d'entrée, plans-index, sessions).
- **Ombre contexte** — discovery / cartographie sans prescrire (posture dominante **Ombre**).

---

## Workflow (ordre obligatoire)

### 1. Date et type de session

1. Noter la **date système** (fraîcheur des fichiers datés).
2. Déclarer ou inférer le type parmi : `bmad-dev-story` | `jarvos-discovery` | `orchestration-graph` | `mixte`.
3. Indiquer la posture dominante si `mixte` : **Ombre** / **Archi** / **Arbitre** ([`roles-ombre-archi-arbitre.md`](../../../references/jarvos-agentique/roles-ombre-archi-arbitre.md)).

### 2. Porte d'entrée normative

Lire **entièrement** puis appliquer la **matrice §4** :

→ [`references/jarvos-agentique/00-porte-entree-contexte.md`](../../../references/jarvos-agentique/00-porte-entree-contexte.md)

Ensuite, dans l'ordre :

1. [`references/index.md`](../../../references/index.md) (abstract uniquement)
2. [`references/ou-on-en-est.md`](../../../references/ou-on-en-est.md)
3. Sous-dossier / story / plan ciblé — **pas** de crawl opportuniste de `references/`

**Interdit :** archiver un transcript JSONL intégral dans `references/` ou `jarvos-agentique/sessions/`.

### 3. Corrélation disque (hooks + sandbox)

| Source | Chemin | Usage |
|--------|--------|--------|
| Hooks orchestrateur | `log/cursor-agent/` (`prompts.jsonl`, `responses.jsonl`, `sessions_manifest.jsonl`) | Repères session locale ; alimente triage |
| Sandbox mémoire | [`jarvos-memoire-sessions/`](../../../jarvos-memoire-sessions/README.md) | Fixtures / scripts dev (Phase 0.C+) |

Les hooks `.cursor/hooks.json` (`beforeSubmitPrompt`, `afterAgentResponse` → `log_after_agent_orchestrator.py`) **ne remplacent pas** la porte d'entrée : ils journalisent ; ce skill **interprète** et **trie**.

### 4. Index transcripts parents (JSONL hors dépôt)

Pour retrouver l'**UUID** et un extrait du premier message utilisateur :

→ skill **`explorer-transcripts-cursor`** (`.cursor/skills/explorer-transcripts-cursor/`)

Exécuter `index_transcripts.py` sur `%USERPROFILE%\.cursor\projects\<slug-workspace>\agent-transcripts` — **ne pas** charger les `.jsonl` entiers dans le chat.

### 5. Clôture session (fiche courte)

Si la session a produit des décisions stables :

1. Rédiger une fiche **≤ 1 page** sous [`references/jarvos-agentique/sessions/`](../../../references/jarvos-agentique/sessions/README.md) (date, type, UUID optionnel, liens artefacts).
2. Si un pattern est réutilisable : voir **HITL registre** (§ ci-dessous) — pas de promotion skill sans `min_hits`.

---

## Commandes (depuis la racine du dépôt)

**Prérequis :** Python 3, racine = `JARVOS_recyclique/`.

### Triage session (manifest + prompts hooks)

```powershell
python jarvos-memoire-sessions/dev/triage_session.py
```

Options typiques (quand le script les expose) : `--log-dir log/cursor-agent`, `--since-hours 24`, `--output references/jarvos-agentique/sessions/`.

### Export transcript → Markdown local (hors `references/`)

```powershell
python jarvos-memoire-sessions/dev/export_transcript_md.py --uuid <UUID>
```

Sortie attendue : fichier **hors dépôt** ou sous `jarvos-memoire-sessions/dev/out/` — jamais commit d'un JSONL brut.

> **Phase 0.C+ :** si les scripts sont absents de `dev/`, appliquer le workflow §1–5 manuellement et signaler l'écart ; ne pas bloquer la session sur l'absence du script.

---

## HITL — `registre-patterns.md`

Toute **modification** du registre ([`references/jarvos-agentique/registre-patterns.md`](../../../references/jarvos-agentique/registre-patterns.md)) exige validation humaine (**HITL**) :

| Action agent | HITL requis |
|--------------|-------------|
| Lire / citer un pattern `valide` | Non |
| Proposer un nouveau `P-*` en `brouillon` | **Oui** — présenter ID, intention, `min_hits`, `must_not`, preuve (artefact ou UUID) |
| Passer `brouillon` → `valide` | **Oui** — `min_hits` atteint + QA2 ou gate documenté |
| Marquer `deprecated` | **Oui** — lien vers remplaçant |
| Promouvoir vers `%USERPROFILE%\.cursor\skills\` | **Oui** — voir [`jarvos-agentique/index.md`](../../../references/jarvos-agentique/index.md) § promotion |

**Ne pas** créer de skill dédié pour un pattern tant que `min_hits` n'est pas atteint (règle du registre § « Ajouter un pattern »).

---

## Renvois rapides

| Besoin | Aller vers |
|--------|------------|
| Plans actifs ↔ UUID | [`plans-index.md`](../../../references/jarvos-agentique/plans-index.md) |
| Timeline méthodo | [`evolutions-methodologie.md`](../../../references/jarvos-agentique/evolutions-methodologie.md) |
| Outillage Cursor / BMAD | [`2026-05-20_01_recommandations-outillage-cursor-bmad-jarvos.md`](../../../references/artefacts/2026-05-20_01_recommandations-outillage-cursor-bmad-jarvos.md) |
| Epic / story BMAD | `@bmad-epic-runner`, `@bmad-story-runner` |
| QA2 livrable lourd | `@qa2-orchestrator` |
| Long run multi-vagues | skill `long-run-orchestrator` |

---

## Prompt court (reprise)

```
Workspace : JARVOS_recyclique.
Skill : jarvos-session-memory.
Type de session : <bmad-dev-story | jarvos-discovery | orchestration-graph | mixte>.
Charge : references/jarvos-agentique/00-porte-entree-contexte.md (matrice §4).
Puis references/index.md + references/ou-on-en-est.md.
Index transcript : explorer-transcripts-cursor (UUID seulement).
Pas de JSONL dans references/.
```
