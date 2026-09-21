# QA3 — routage modèles par plateforme et par rôle

**SoT** pour `qa3-agent` et `orchestrateur-qa-95`.
**Mis à jour :** 2026-09-16 · recon modèles (Deep Recon léger + IDP Leaderboard doc 2026).

---

## Principe

| Niveau | Rôles | Pourquoi |
|--------|-------|----------|
| **Léger** | Chat wrapper, parent qa3 (routeur) | Ne lit pas le livrable — spawn + fusion |
| **Moyen+** | **Planner** (YAML `passes`) | Découpe multi-axes, R9/R10/R11 — un cran au-dessus |
| **Léger** | Workers, clôture intégrale | Rubriques + scores — volume élevé, modèle économique (≠ parent routeur, même libellé « léger ») |

**Nuances plateforme (+1 cran planner)** :

| Plateforme | Planner vs workers |
|------------|-------------------|
| **Cursor** | Grok 4.6 planner **>** C2.5 workers (écart réel) |
| **Codex** | Même slug LUNA max partout — volontaire (rapport qualité/prix en mode max) |
| **Claude** | Même Sonnet planner/workers par défaut ; Opus seulement si planner échoue 2× |

**Alias rôles → slugs Task** (référencés dans `chat-delegation.md`, `planner-prompt.md`, `worker-qa.md` ; `workflow-loop.md` cite uniquement l'alias **`cloture`**) :

| Alias doc | Rôle (matrice § ci-dessous) | Cursor | Codex | Claude |
|-----------|----------------------------|--------|-------|--------|
| *(chat orchestrateur)* | 1. Chat wrapper — **pas** un Task ; spawn avec alias `parent` ci-dessous | — | — | — |
| `parent` | 2. Parent qa3 (Task lancé par chat / orchestrateur / strophe-review phase 2) | `composer-2.5` | `gpt-5.6-luna-max` | `claude-sonnet-5-thinking-medium` |
| `planner` | 3. Planner | `cursor-grok-4.6-xhigh` | `gpt-5.6-luna-max` | `claude-sonnet-5-thinking-medium` |
| `workers` | 4. Workers | `composer-2.5` | `gpt-5.6-luna-max` | `claude-sonnet-5-thinking-medium` |
| `cloture` | 5. Clôture intégrale | `composer-2.5` | `gpt-5.6-luna-max` | `claude-sonnet-5-thinking-medium` |

**Règle parent :** fixer `model:` **explicitement** sur chaque Task — ne jamais hériter du chat.

**Override utilisateur :** si la demande nomme un modèle (ex. KExpress), il prime sur ce tableau.

---

## Matrice (slugs agents)

| Rôle | Cursor | Codex | Claude |
|------|--------|-------|--------|
| **1. Chat wrapper** (`orchestrateur-qa-95`) | `composer-2.5` | `gpt-5.6-luna-max` | `claude-sonnet-5-thinking-medium` |
| **2. Parent qa3** (routeur, fusion) | `composer-2.5` | `gpt-5.6-luna-max` | `claude-sonnet-5-thinking-medium` |
| **3. Planner** (YAML passes) | `cursor-grok-4.6-xhigh` | `gpt-5.6-luna-max` | `claude-sonnet-5-thinking-medium` |
| **4. Workers** (grilles, findings) | `composer-2.5` | `gpt-5.6-luna-max` | `claude-sonnet-5-thinking-medium` |
| **4b. Worker light** (`pipeline: light`) | `composer-2.5-fast` | `gpt-5.6-luna-max` | Haiku (si dispo) — optionnel |
| **5. Clôture intégrale** | `composer-2.5` | `gpt-5.6-luna-max` | `claude-sonnet-5-thinking-medium` |

### Comment détecter la plateforme

| Plateforme | Indice |
|------------|--------|
| **Cursor** | Task tool, slugs `composer-*`, `cursor-grok-*` |
| **Codex** | `.agents/skills/`, slugs `gpt-5.6-*`, opérateur Yo |
| **Claude** | slugs `claude-*` (API, Claude Code, etc.) |

---

## Sonnet vs Haiku (Claude)

**Sonnet** = palier du milieu (entre Haiku et Opus). C’est le **défaut** pour planner, workers et clôture QA structurée.

| Modèle | Quand |
|--------|-------|
| **Sonnet** | Rubriques multi-couches, JSON scores, passes `contradiction` / `traceability`, docs SEO |
| **Haiku** | Uniquement `pipeline: light`, mono-fichier court, check rapide |
| **Opus** | Pas en défaut — seulement si Sonnet échoue 2× sur planner (gros doc multi-axes) |

**Preuve externe (doc structurée) :** benchmarks IDP 2026 — Sonnet ~81 % vs Haiku ~70 % sur extraction / compréhension document (voir [IDP Leaderboard](https://www.idp-leaderboard.org/)). Pour du QA markdown/SEO, Sonnet vaut le surcoût vs Haiku.

**Haiku « max » :** peut suffire pour du routage ou de la classification — **pas** pour produire un YAML `passes` fiable ni des findings `[LOC]` denses.

---

## Cursor — détail

| Rôle | Slug | Note |
|------|------|------|
| Wrapper + parent | `composer-2.5` | Prouvé en prod QA3 (télémétrie) |
| Planner | `cursor-grok-4.6-xhigh` | +1 cran : découpe passes, shards R11 |
| Workers | `composer-2.5` | Défaut skill historique |
| Audit readonly léger | `composer-2.5-fast` | Voir `collab-orchestration-agents.mdc` |

---

## Codex (Yo) — détail

**Tout en `gpt-5.6-luna-max`** — mode max recommandé par l’opérateur (bon rapport qualité/coût en boucle).

Guide Yo : [`docs/collab/ops/GUIDE_YO_QA_BOUCLE.md`](../../../../docs/collab/ops/GUIDE_YO_QA_BOUCLE.md).

---

## Risques si mauvais tier

| Problème | Symptôme | Remède |
|----------|----------|--------|
| Planner trop léger | YAML hors spec, `pass_count` > 6, R11 fail | Monter planner (Grok / Sonnet) |
| Workers trop faibles | Score gonflé, P1 latents, `audit_confidence` bas | C2.5 / Sonnet workers |
| Tout en gros modèle | Coût ×3–5 sans gain gate 95 | Respecter la matrice |

---

## Télémétrie

Champ `model` des events = slug **réellement** utilisé sur le Task (pas toujours `composer-2.5` si override plateforme).

## Slug drift (slug indisponible)

Si un slug listé ici n'est plus proposé par la plateforme au moment du spawn Task :

1. **Stop** — ne pas hériter du modèle chat.
2. Consulter la liste des slugs disponibles sur la plateforme (Cursor : modèles Task ; Codex/Claude : slugs agents).
3. Choisir le slug **le plus proche** du rôle (planner = tier supérieur workers sur Cursor ; même tier ailleurs).
4. Documenter l'override dans `routing_decision` ou le rapport parent.
5. Override utilisateur explicite (ex. KExpress) **prime** sur ce fichier.

---

## Références

- Orchestration Numastria : `.cursor/rules/collab-orchestration-agents.mdc`
- Planner prompt : `planner-prompt.md`
- Worker : `worker-qa.md`
- Review 2 temps : `.cursor/skills/strophe-review/SKILL.md` (phase 2 → ce routage)
- Guide Yo : [`docs/collab/ops/GUIDE_YO_QA_BOUCLE.md`](../../../../docs/collab/ops/GUIDE_YO_QA_BOUCLE.md)
