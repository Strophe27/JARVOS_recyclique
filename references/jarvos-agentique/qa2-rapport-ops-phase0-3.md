# QA2 — Jarvos mémoire sessions Phase 0–3 (ops + spec)

**Date** : 2026-05-21  
**Méta** : pipeline `light`, 2 passes (`pass-1-doc-v23-privacy`, `pass-2-ops-hooks-scripts`), `readonly: true`, orchestration `@qa2-orchestrator` / qa2-agent.

**Correctif P0 appliqué 2026-05-21** : `log_before_submit_prompt.py` — `user_excerpt_sha256` + `user_excerpt_len` par défaut ; `user_excerpt` clair uniquement si `JARVOS_LOG_FULL_PROMPT=1`.

## Résumé exécutif

Post-implémentation Phase 0.B (doc `references/jarvos-agentique/` + skill) et Phase 1–2 (hooks `.cursor/hooks/` + scripts `jarvos-memoire-sessions/dev/`) : le **cœur** est en place (porte d’entrée, matrice session, wiring hooks, `LOG_DIR` via `workspace_roots[0]`, append runtime, hash des **réponses** assistant).

**Blocage ops** : le brief et l’intention QA exigent un **prompt hashé (pas en clair)** ; l’implémentation écrit encore `user_excerpt` (jusqu’à 800 car.) **en clair** dans `prompts.jsonl` (`log_before_submit_prompt.py`). Tant que ce P0 n’est pas corrigé ou tranché explicitement dans la spec v2.3, le gate ops **≥ 90 %** n’est pas atteint.

Doc Phase 0.B : conforme en grande partie, avec écarts documentaires (calibration 4 UUID, hub privacy/hooks, conventions `sessions/`). Dette logs legacy (`user_email`, `text` intégral) et script legacy hors wiring signalés en P1.

**Verdict** : **NO-GO-OPS** (score fusionné **80**, gate **90 %** non atteint).

## Score / gate / verdict

| Indicateur | Valeur |
|------------|--------|
| Score confiance fusionné | **80** / 100 (moyenne passes : 82 + 78) |
| Gate ops | **90 %** |
| Gate atteint | **non** |
| Verdict | **NO-GO-OPS** |

## Issues

### P0 (critiques)

| [LOC] | Synthèse | Recommandation |
|-------|----------|----------------|
| `.cursor/hooks/log_before_submit_prompt.py` L39–48 | `user_excerpt` écrit **en clair** dans `prompts.jsonl` ; seules les réponses passent par `redact_assistant_text()` (`text_sha256`). | Hasher l’excerpt prompt (`user_excerpt_sha256` + len) ou opt-in explicite `JARVOS_LOG_FULL_TEXT` + mise à jour spec/doc § Privacy. |

### P1 (warnings)

| [LOC] | Synthèse | Recommandation |
|-------|----------|----------------|
| `log/cursor-agent/responses.jsonl` (historique) | Lignes legacy avec `user_email` et `text` intégral ; nouvelles lignes (~L1591+) conformes. | Purge/rotation des lignes antérieures au déploiement orchestrateur ; doc « ne pas committer ». |
| `.cursor/hooks/log_after_agent_response.py` | Legacy : `user_email`, `text` clair, `LOG_DIR` relatif cwd ; **non branché** dans `hooks.json`. | Supprimer ou `*.legacy.py` + bannière ; éviter réactivation accidentelle. |
| `.cursor/hooks/cursor_hooks_diagnostic.py` L19–37 | `sessionStart` : `log/cursor-agent` fixe, sans `resolve_log_dir(workspace_roots[0])`. | Aligner sur `hook_common.resolve_log_dir`. |
| `log_before_submit_prompt.py` L47 | `git_excerpt` en clair (chemins/état repo). | Tronquer, hasher ou opt-in. |
| `jarvos-memoire-sessions/dev/consolidate_manifest.py` L87–90 | Réécriture destructive du manifest (`open("w")`). | Documenter « maintenance offline uniquement » ; hors pipeline capture/CI. |
| `references/jarvos-agentique/registre-patterns.md` | Table calibration **4 UUID** (plan v2.3) incomplète. | Ajouter § calibration gate batch (4 rôles). |
| `references/jarvos-agentique/index.md` § Privacy | Pas de contrat ops hooks (no `user_email`, hash prompt/réponses, `LOG_DIR`, append-only, rétention). | Enrichir le hub ; trancher excerpt prompt vs hash réponses. |
| `references/jarvos-agentique/sessions/README.md` vs `sessions/*.md` | Convention `YYYY-MM-DD_<slug>` vs fichiers `c8a645ab_mixte.md`, etc. | Harmoniser ou documenter exception `triage_session`. |
| `00-porte-entree-contexte.md` matrice §4 | Pas de ligne `log/cursor-agent/` / hooks. | Ajouter entrée optionnelle corrélation session. |
| Fixtures `jarvos-memoire-sessions/tests/fixtures/` | Schéma (`schema_version`, `line_kind`) ≠ lignes manifest hook. | Harmoniser spec Phase 0.C ou validateur. |

## Conformité jarvos_capture_patterns v2.3 (checklist privacy/ops)

| Critère | Statut | Note |
|---------|--------|------|
| Pas de `user_email` dans les **nouveaux** enregistrements hooks actifs | Partiel | Hook orchestrateur OK ; historique `responses.jsonl` non conforme (P1). |
| Texte prompt **hashé** (pas en clair) | **Non** | P0 `user_excerpt` en clair ; plan Cursor cite excerpt 800 car. — ambiguïté doc/code (P1 hub). |
| `LOG_DIR` dérivé de `workspace_roots[0]` | Partiel | Hooks actifs OK ; diagnostic `sessionStart` en écart (P1). |
| Manifest / JSONL runtime **append-only** | Partiel | Hooks OK ; `consolidate_manifest.py` destructif offline (P1). |
| `beforeSubmitPrompt` → `prompts.jsonl` | Oui | Wiring `hooks.json` conforme. |
| Réponses assistant hashées par défaut | Oui | `redact_assistant_text`, opt-in `JARVOS_LOG_FULL_TEXT`. |
| Doc Phase 0.B (porte d’entrée, matrice, privacy références) | Oui | Écarts calibration / hub / naming sessions (P1). |
| Scripts dev Phase 2 (index, triage, export) | Oui | Couplés à `user_excerpt` ; pas de tests pytest automatisés (info). |

**Référence plan** : `jarvos_capture_patterns v2.3` nommé ainsi **introuvable** dans `references/jarvos-agentique/` ; workers ont utilisé `.cursor/plans/jarvos_capture_patterns_2b525dda.plan.md` et `user_intent` QABrief.

## Axes délégués

- **pass-1-doc-v23-privacy** (doc, validation) : score **82** — Phase 0.B largement livrée ; pas de P0 doc seul.
- **pass-2-ops-hooks-scripts** (code, validation) : score **78** — NO-GO-OPS sur cette passe ; P0 hash prompt.

## Limites de la passe

- Pas de lecture intégrale des `agent-transcripts` JSONL (conforme brief).
- Plan v2.3 sur disque sous nom exact non trouvé dans `references/jarvos-agentique/`.
- Validation runtime post-reload Cursor non rejouée ; échantillon `log/cursor-agent/*.jsonl` partiel.
- Pas de tests pytest privacy automatisés sous `jarvos-memoire-sessions/`.

## Piste corrective (gate ~92–94 %)

1. Corriger P0 : hasher `user_excerpt` ou trancher spec + doc.
2. Purger logs legacy + aligner `cursor_hooks_diagnostic`.
3. Compléter hub `index.md` § Privacy et calibration registre.

---

## Re-QA2 post-fix (2026-05-21)

**Passe** : `reqa2-post-fix-p0` — pipeline `light`, 1 worker, périmètre 3 fichiers (`log_before_submit_prompt.py`, `hook_common.py`, `index.md` § Privacy).

| Indicateur | Valeur |
|------------|--------|
| Score confiance | **93** / 100 |
| Gate ops | **90 %** |
| Gate atteint | **oui** (score ≥ 90 et **0 P0** sur le périmètre) |
| Verdict | **GO-OPS** |

**P0 ouverts (scope)** : aucun — le correctif `redact_user_excerpt` / `user_excerpt_sha256` + `user_excerpt_len` par défaut et opt-in `JARVOS_LOG_FULL_PROMPT=1` est conforme ; le hub `index.md` § Privacy est aligné.

**P1 résiduels (scope)** : `git_excerpt` encore en clair dans `log_before_submit_prompt.py` (L49) ; hub § Privacy sans mention de `git_excerpt` ni symétrie réponses (`JARVOS_LOG_FULL_TEXT`). Info : legacy possible dans `log/cursor-agent/prompts.jsonl` (hors fichiers scope).

**Synthèse** : Le P0 initial (excerpt utilisateur en clair par défaut) est levé dans le code et la doc du périmètre audité. Gate ops 90 % atteint ; exploitation ops possible sous réserve des P1 privacy secondaires (`git_excerpt`, enrichissement hub). Recommandation non bloquante : documenter ou hasher `git_excerpt` ; rotation des lignes JSONL legacy si politique zéro clair stricte.

---

*Rapport fusionné qa2-agent — parent léger, 2 workers readonly (QA initial) ; re-QA2 post-fix : 1 worker readonly.*
