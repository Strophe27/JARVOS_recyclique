# Index — references/recherche/

Prompts et réponses de recherche externe (Perplexity, Claude.ai, GPT, etc.) et **rapports de recherche technique BMAD** (workflow `bmad-technical-research`, fichier unique lorsqu’il n’y a pas de paire prompt/réponse).

**Convention** (ordre : date → titre court → IA → type) : `YYYY-MM-DD_titre-court_[IA-name]_prompt.md` / `YYYY-MM-DD_titre-court_[IA-name]_reponse.md` ; pour un livrable BMAD seul : `YYYY-MM-DD_titre-court_bmad_recherche.md`.

**Contexte pour IA** : `contexte-pour-recherche-externe.md` — à joindre ou coller en début de recherche (Perplexity, Claude, etc.) pour aligner les réponses sur le projet. Mettre à jour quand décisions ou phase changent.

> Charger les fichiers mentionnes dans `ou-on-en-est.md` ou sur demande explicite. Prioriser les dates les plus recentes.

---

## Fichiers

| Fichier | Sujet / usage |
|---------|----------------|
| **2026-02-25_affichage-dynamique-peintre-extension-points_bmad_recherche.md** | **Recherche technique BMAD** : extension points / stubs v1 pour affichage dynamique, écrans configurables (v2+), service Peintre (JARVOS Mini). Copie canonique sous `references/recherche/` ; copie d’archive BMAD : `_bmad-output/archive/.../planning-artifacts/research/technical-affichage-dynamique-peintre-extension-points-research-2026-02-25.md`. |
| **2026-03-31_brique-nano-peintre-modularite-json-ui_perplexity_reponse.md** | **Perplexity** : brique « nano » Peintre / RecyClique — choix de framework de modularité (micro-frontends, slots, SDUI, DivKit, JSON UI) et trajectoire. |
| **2026-03-31_peintre-jarvos-grille-templates-ui-auto-optimisable_perplexity_reponse.md** | **Perplexity** : Peintre / JARVOS — grilles, templates, paramètres DSL pour une UI auto-optimisable (patterns F/Z, CSS Grid, design tokens, métriques). |
| **2026-03-31_peintre-nano-workflows-navigation-raccourcis-declaratifs_perplexity_reponse.md** | **Perplexity** : Peintre_nano — patterns déclaratifs pour workflows UI, navigation, raccourcis (FSM/statecharts, XState, routage, command palette, hotkeys). |
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

---

## Fichiers sur disque hors tableau (non « recherche externe »)

Artefacts d’outil / sauvegarde présents dans ce dossier mais **non listés** ci-dessus (à déplacer vers un dossier backup ou `_depot/` si on veut un `recherche/` strictement conventionnel) :

| Fichier / dossier | Nature |
|-------------------|--------|
| `normalize_typographic_chars_2026-03-16_23-30-07.log` | Log du script normalize-typographic-chars |
| `normalize_typographic_backup_2026-03-16_23-30-07/index.md` | Copie de sauvegarde d’un ancien index |
