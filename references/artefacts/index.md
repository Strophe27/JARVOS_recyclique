# Index — references/artefacts/

Artefacts temporaires de handoff entre agents. Convention : `YYYY-MM-DD_NN_titre-court.md` (NN = ordre d'execution 01, 02, …).

> Charger uniquement l'artefact dont la session a besoin (souvent indique dans `ou-on-en-est.md`).

---

## Archive (artefacts historiques)

Les artefacts du **plan Git** (tests, procedure, subagent) sont dans `artefacts/archive/`. Procedure et regle en vigueur : [references/procedure-git-cursor.md](../procedure-git-cursor.md), [.cursor/rules/git-workflow.mdc](../../.cursor/rules/git-workflow.mdc).

| Fichier | Role |
|---------|------|
| `archive/2026-02-24_01_mission-agent-test-git-cursor.md` | Mission pour agent test (session Cursor vide) : init repo, tests, remplir rapport |
| `archive/2026-02-24_02_rapport-tests-git-cursor.md` | Rapport a remplir pendant les tests ; synthese credentials et recommandations |
| `archive/2026-02-24_03_mission-rediger-procedure-git.md` | Mission : rediger `references/procedure-git-cursor.md` a partir du rapport |
| `archive/2026-02-24_04_brief-create-subagent-git.md` | Brief pour Strophe : /create-subagent avec prompt Git |
| `archive/2026-02-24_05_mission-creer-regle-git-workflow.md` | Mission : creer `.cursor/rules/git-workflow.mdc` et mettre a jour l'index principal |

---

## Autres artefacts

| Fichier | Role |
|---------|------|
| `2026-03-31_06_porte-entree-agent-bmad-vierge.md` | Liste ordonnee des fichiers a charger pour un agent BMAD vierge (brainstorm, analyse) : etat, audit references, idees, recherches, pieges ancien PRD. |
| `2026-03-31_05_qa-pass-bmad-references-indexes.md` | QA post-reset BMAD + audit references : checks disque, liens, correctifs appliques (liens audit, besoins-terrains, raccourci archive BMAD, note README). |
| `2026-03-31_04_audit-references-02-ancien-vision-paheko-tri-racine.md` | Audit references (p.3/3) : ancien-repo, vision-projet, paheko, temporaire-pour-tri, racine, depot, vrac, ecosysteme, idees-kanban (index Kanban : resync skill). |
| `2026-03-31_03_audit-references-01-zones-principales.md` | Audit references (p.2/3) : artefacts, recherche, consolidation-1.4.5, migration-paeco. |
| `2026-03-31_02_audit-references-00-synthese-globale.md` | Audit references (p.1/3) : synthese orchestrateur, carte des zones, tensions narratives, index modifies, prochaines etapes. |
| `2026-03-31_01_handoff-nettoyage-stabilisation-recyclique-1.4.4.md` | Handoff chantier nettoyage / qualite / stabilisation sur `recyclique-1.4.4` : OpenAPI & tests, facades frontend, code mort, etude DB/migrations locale ; commits listes ; limites et suites logiques. |
| `2026-03-26_07_paquet-7-frontend-suppression-page-auth-publique.md` | Paquet 7 (frontend) : retrait page d'auth publique historique + test unitaire ; `App.jsx` sans entrée `publicRoutes` pour ce chemin, redirection vers `/inscription` (query conservée) ; intégration `public-routes` réalignée ; pas de commit. |
| `2026-03-26_06_paquet-6-notifications-sortantes-canal-retire.md` | Paquet 6 : retrait service de notifications sortantes tiers, variables d'env associées dans `config` + exemples, sync/anomalies en logs seuls, `rollback.sh` aligné, docs/scripts alignés ; tests cibles OK ; pas de commit. |
| `2026-03-26_05_paquet-4-put-deposits-sans-bot-auth.md` | Paquet 4 : retrait `get_bot_token_dependency` / `X-Bot-Token` sur `PUT /v1/deposits/{id}` ; suppression `bot_auth.py` et `test_bot_auth_simple.py` ; OpenAPI + tests workflow dépôts réalignés ; pas de commit. |
| `2026-03-26_04_paquet-3-suppression-routes-api-bot-historique.md` | Paquet 3 : retrait des routes HTTP bot / liaison tiers (`link-*`, `from-bot`, `classify`) et alignement OpenAPI / tests / docs ; `PUT /deposits/{id}` laisse en place l'auth bot jusqu'au paquet 4 (desormais traite). |
| `2026-03-26_03_qa-handoff-paquet-final-consolidation.md` | Bilan fin de paquet QA consolidation 1.4.5 : worktree propre, lots faible risque clos, reliquats a risque moyen+, bloc decisionnel auth bot `PUT /deposits/{id}`, openapi statique bloque par env ; pas d'identifiant « TL-02 » dans le repo (assimile a cette dette). |
| `2026-03-26_02_handoff-long-run-backend-cleanup-reliquats.md` | Handoff long run pour agent frais : etat acquis du nettoyage backend (canal tiers + routes historiques), derniers lots fermes, worktree a surveiller, prochains chantiers prudents (`bot_auth`, champs identité tiers restants, fallbacks, migrations a eviter trop tot). Resume neutre ; detail des lots dans le journal consolidation. |
| `2026-03-26_01_blueprint-layout-workflow-ecrans.md` | Blueprint : workflow explicite, config d'ecran, layout avec handles + pilotage API/CLI/agent, branchements JARVOS Nano / Peintre (FR26), emplacement BMAD et ordre de migration. |
| `2026-03-24_01_exploration-references-synthese/` | Exploration multi-agents de `references/` (idees, **TODO** Paheko/Recyclique, decisions) ; rapports par zone dans sous-dossiers `00-` … `04-`, synthese dans `99-synthese-orchestrateur/`. |
| `2026-03-23_01_recyclique-1.4.4-nested-git-backup/` | **Local uniquement** (ignore Git) : copie du `.git` de l'ancien clone imbrique avant detachement ; voir journal `references/consolidation-1.4.5/2026-03-23_journal-assainissement-1.4.5.md`. |
| `2026-02-24_06_brainstorm-migration-paheko.md` | Brainstorm migration Paheko : contexte, themes, analyse critique, 10 idees Kanban, 7 todos, decisions posees. Point d'entree pour sessions suivantes. |
| `2026-02-24_07_design-systeme-modules.md` | Design systeme de modules : decisions arbitrees, contrat ModuleBase, module.toml, loader, slots React, zones d'ombre residuelles. |
| `2026-02-24_08_decision-architecture-max-paheko.md` | Decision architecture « max Paheko » : caisse native, saisie au poids, module correspondance, tensions, agenda recherche. **Partiellement supersede** par 09 (cartographie), 04 (plugins/decisions push), 05 (grille) — voir ces artefacts pour l'etat actuel. |
| `2026-02-24_09_cartographie-integration-paheko-core.md` | Cartographie 1re passe integration Paheko core : guides (archi, Docker, extensions), decisions 1re passe (version 1.3.19.x, un Compose), catalogue ; suite 2e passe. |
| `2026-02-24_10_doc-officielle-paheko-integration-core.md` | Complement doc officielle Paheko (Extensions + API) ; inconnues et renvoi vers les 5 prompts Perplexity (API caisse, Saisie au poids, version, auth/SSO, catalogue). |
| `2026-02-24_11_capacites-paheko-calendrier-fichiers-communication.md` | Synthese capacites natives Paheko : fichiers (oui), calendrier collaboratif (non — extension Agenda = individuel), communication (oui). Impact pour Recyclic. |
| `2026-02-25_01_decision-agenda-recyclic-externe.md` | Decision agenda dans Recyclic + services externes ; utilisateur = ref Paheko ; multi-agendas ; v0.1.0 = placeholders. |
| `2026-02-25_02_chantier-fichiers-politique-documentaire.md` | Chantier fichiers / politique documentaire : exploration, matrice vivante, backends, scan factures, upload, frontiere plugin/Recyclic ; scope versions futures. |
| `2026-02-25_03_closure-1re-passe-spirale.md` | Cloture 1re passe spirale : synthese sujets traites, URL repo renseignee, suite 2e passe et Brief. |
| `2026-02-25_04_analyse-plugins-caisse-decisions-push.md` | Analyse plugins Paheko (caisse + Saisie au poids), decisions push, vision RecyClique (offline, decla eco-organismes), confrontation a venir avec l'analyste. |
| `2026-02-25_05_grille-confrontation-recyclic-paheko.md` | Grille confrontation RecyClique vs Paheko (agent-usable) : axes caisse, categories, poids, decla eco-organismes, offline, roles, securite, calendrier/fichiers ; a mettre a jour au fil des decisions. |
| `2026-02-25_06_point-global-avant-prd.md` | Point global avant PRD : etat des lieux, ce qu'on sait de l'architecture, zones d'ombre, menage artefacts. |
| `2026-02-25_07_decisions-push-redis-source-eee.md` | Decisions confrontation : push par ticket, Redis Streams, source EEE RecyClique, reception/poids, interfaces compta ; questions encore a trancher (mise a jour suite session 08). |
| `2026-02-25_08_session-confrontation-recyclic-paheko.md` | Session de confrontation RecyClique vs Paheko : decisions prises (montants, categories, poids, decla, auth, securite), points laisses ouverts, mises a jour grille 05 ; livrable pour PRD. |
| `2026-02-26_01_analyse-separation-frontend-backend-recyclic.md` | Analyse : 1 container RecyClique (front + middleware), Paheko = backend ; impact surcouche cognitive. **Preconisations migration v1** : SPA + API REST, contrat API, EventBus cote serveur, a eviter (GraphQL, SSR en v1). |
| `2026-02-26_02_track-enterprise-multi-utilisateur.md` | Decision track BMAD Enterprise : securite, conformite, DevOps ; multi-utilisateur ; une instance par ressourcerie (pas de multi-tenant). Livrables Enterprise rappeles. |
| `2026-02-26_03_checklist-v0.1-architecture.md` | Checklist v0.1 : loader modules + slots, convention tests frontend, versions Dockerfile/README, detail FR13b. A charger en contexte pour les premieres stories / socle. |
| `2026-02-26_04_analyse-vision-automatisation-dev-bmad-cursor.md` | Analyse critique vision « BMAD Autopilot » (Cursor 2.5) : faisabilité, corrections (subagentStop vs stop, statut machine-readable), améliorations (checkpoints, état run-epic), plan d’action. |
