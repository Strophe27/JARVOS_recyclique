# Index — references/recherche/

Prompts et reponses de recherche externe (Perplexity, Claude.ai, GPT, etc.).

**Convention** (ordre : date → titre court → IA → type) : `YYYY-MM-DD_titre-court_[IA-name]_prompt.md` / `YYYY-MM-DD_titre-court_[IA-name]_reponse.md`.

**Contexte pour IA** : `contexte-pour-recherche-externe.md` — à joindre ou coller en début de recherche (Perplexity, Claude, etc.) pour aligner les réponses sur le projet. Mettre à jour quand décisions ou phase changent.

> Charger les fichiers mentionnes dans `ou-on-en-est.md` ou sur demande explicite. Prioriser les dates les plus recentes.

---

## Fichiers

| Fichier | Sujet / usage |
|---------|----------------|
| contexte-pour-recherche-externe.md | Contexte projet pour recherches externes (joindre en début de session) |
| 2026-02-24_frameworks-modules-python_perplexity_prompt.md | Frameworks modules/plugins Python — prompt Perplexity Pro |
| 2026-02-24_frameworks-modules-python_perplexity_reponse-1.md | Réponse 1 : Pluggy, Stevedore, entry points ; reco entry points puis Stevedore |
| 2026-02-24_frameworks-modules-python_perplexity_reponse-2.md | Réponse 2 : tableau comparatif ; reco hybride manifeste YAML + entry points, Pluggy si hooks |
| 2026-02-24_frameworks-modules-python_perplexity_reponse-2-complement.md | Réponse 2 complément : UI par module, comment Paheko fait ses plugins, pattern slots React + module.toml |
| 2026-02-24_pluggy-vs-alternatives-hooks_perplexity_prompt.md | Hooks inter-modules : Pluggy vs. Blinker vs. EventBus maison — prompt Perplexity Pro |
| 2026-02-24_pluggy-vs-alternatives-hooks_perplexity_reponse-1.md | Réponse 1 — Pluggy vs alternatives/hooks Perplexity |
| 2026-02-24_pluggy-vs-alternatives-hooks_perplexity_reponse-2-redis.md | Réponse 2 (redis) — Pluggy vs alternatives/hooks Perplexity |
| 2026-02-24_api-paheko-caisse_perplexity_prompt.md | API caisse Paheko : endpoints, modèles, où documentée — prompt Perplexity |
| 2026-02-24_extension-saisie-poids-paheko_perplexity_prompt.md | Extension Saisie au poids Paheko : fonctionnement, tables, API — prompt Perplexity |
| 2026-02-24_version-paheko-stable_perplexity_prompt.md | Version Paheko recommandée (stable, LTS, 1.3.x) — prompt Perplexity |
| 2026-02-24_version-paheko-stable_perplexity_reponse.md | Réponse Perplexity version Paheko recommandée (stable, 1.3.x) |
| 2026-02-24_auth-sso-paheko-app-externe_perplexity_prompt.md | Auth / SSO Paheko avec app externe (FastAPI) — prompt Perplexity |
| 2026-02-24_catalogue-plugins-modules-paheko_perplexity_prompt.md | Catalogue plugins et modules Paheko officiels — prompt Perplexity |
| 2026-02-24_catalogue-plugins-modules-paheko_perplexity_reponse.md | Réponse Perplexity catalogue plugins/modules Paheko officiels |
| 2026-02-24_api-paheko-caisse_perplexity_reponse.md | Réponse Perplexity API caisse Paheko (endpoints, modèles, sessions) |
| 2026-02-24_extension-saisie-poids-paheko_perplexity_reponse.md | Réponse Perplexity extension Saisie au poids Paheko |
| 2026-02-24_auth-sso-paheko-app-externe_perplexity_reponse.md | Réponse Perplexity auth/SSO Paheko avec app externe FastAPI |
| 2026-02-26_cursor-autopilot-phase0-subagents-commands-agents_perplexity_prompt.md | **Phase 0 BMAD Autopilot** : prompt Perplexity Pro — invocation subagents (tool, params), commandes slash (format, lien orchestrateur), fichiers agents (.cursor/agents/), hooks Windows. À utiliser dans une discussion Perplexity existante avec contexte prérequis Cursor. |
| 2026-02-26_cursor-autopilot-phase0-subagents-commands-agents_perplexity_reponse.md | Réponse Perplexity à coller après envoi du prompt Phase 0 ci-dessus. |
| 2026-02-26_paheko-ssl-localhost-et-sqlite-dump-docker_perplexity_prompt.md | **Paheko** : pourquoi ERR_SSL_PROTOCOL_ERROR sur localhost:8080 (et pas sur 8000) ; comment demarrer le conteneur avec un fichier SQLite existant (dump) pour eviter refaire l'onboarding. |
| 2026-03-16_agents-cursor-modele-leger-user_perplexity_prompt.md | **Cursor** : agents/rules niveau user, forcer modele le plus leger par agent, orchestrateur et choix de modele des sous-agents, monitoring et declaration d'identite. Prompt pour Perplexity Pro. |
| 2026-03-16_agents-cursor-modele-leger-user_perplexity_reponse.md | **Cursor** : synthese sur agents user-level, skills globaux, champ `model` (`fast` / `inherit` / `model-id`), limites de `Task`, verification et recommandations d'architecture globale. _(Charger si : conception d'un systeme global utilisateur pour conseiller le modele des subagents.)_ |
