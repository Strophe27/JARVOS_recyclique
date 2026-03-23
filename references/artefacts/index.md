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

| `2026-02-26_04_analyse-vision-automatisation-dev-bmad-cursor.md` | Analyse critique vision « BMAD Autopilot » (Cursor 2.5) : **vision consolidée** (commande slash, cascade Create→Validate→Dev→**Revision**→CR en subagents, découpage stories complexes, parallélisation, **HITL**), **décisions** (état reprise `{story_key}.agent-state.json`, review `{story_key}.review.json`, **Revision par autre agent** après Dev Story, validation réponse par orchestrateur, reprise via nouveau subagent, hooks PowerShell), faisabilité, risques, plan d'action. Réf. branche `experiment/bmad-autopilot`. |

| `2026-02-26_05_regle-deploiement-effectif-stories-docker.md` | Regle : a quel moment le Docker doit etre deploye par les agents. Constat (1.3 done mais stack jamais lancee), obligation bmad-dev pour stories deploiement (executer + verifier ou documenter verification manuelle), action immediate et option checkpoint orchestrateur. |

| `2026-02-26_07_audit-decisions-v01-completude-derives.md` | Audit decisions v0.1 : completude (4 decisions + trous identifies) et risque de derive. Recommandations : trancher outil test frontend (Vitest + RTL), cadrer styling ; avec qui (Strophe, PM, Architect, IR, Correct Course) et quoi faire. |

| `2026-02-26_08_catalogue-qui-stocke-quoi-recyclic-paheko.md` | **Catalogue « Qui stocke quoi »** : entites metier (users, sites, cash_registers, sessions, ventes, reception, categories, presets, parametres, etc.) avec pour chacune stockage RecyClique / Paheko / les deux et regle source de verite. Base pour conception API et ecrans. |

| `2026-02-26_09_perimetre-api-recyclique-v1.md` | **Perimetre API RecyClique v1** : liste des endpoints a exposer en v1 par domaine (auth, pos, reception, admin, etc.), source des donnees (RecyClique / push Paheko / hors scope), et tracabilite « RecyClique appelle Paheko » (ouverture session, ventes, cloture). Derive de la liste 1.4.4 et du catalogue 08. |

| `2026-02-26_10_tracabilite-ecran-donnees-appels-api.md` | **Tracabilite ecran → donnees + appels API + logique** : pour chaque ecran/flux 1.4.4 (Auth, Caisse, Reception, Admin, Categories), donnees affichees, appels API au chargement, et pour chaque action utilisateur l'endpoint appele et le type de payload. Plan du livrable + contenu rempli (29 ecrans). Base pour refactor et conception avant de coder. |

| `2026-02-26_11_brief-revision-ordre-construction.md` | **Brief de revision — Ordre de construction** : analyse en couches de dependances (referentiels, auth, push Paheko, caisse, reception, correspondance, admin, decla, extension points) ; confrontation avec l'ordre des epics ; table de ce qu'il fallait remanier. A l'origine de la refonte complete de epics.md (Correct Course 2026-02-26). |

| `2026-02-27_01_sso-recyclique-paheko-spec.md` | **Spec SSO RecyClique–Paheko (phase ulterieure)** : objectif SSO (cas d'usage, benefices, perimetre), options techniques (IdP OIDC, auth separee, LDAP, JWT/proxy), contraintes Paheko (API HTTP Basic, OIDC consommateur uniquement), recommandations v1 et phase ulterieure. Livrable story 3.6 — pas d'implementation en v1. |

| `2026-03-16_rapport-llm-tiers-bmad.md` | **Rapport BMAD — Puissance LLM par agent et workflow** : 4 tiers LLM (Blazing Fast → Frontier), cartographie agents BMAD + agents Cursor, workflows par phase, distribution chiffree, config `model` appliquee (depot/git = fast). Source pour Notebook LM (visuels, syntheses). |

| `2026-03-16_01_guide-strategique-bmad-tiers-llm.md` | **Guide strategique BMAD / Plan Ultra** : texte source complet (4 tiers, 39 workflows, agents BMM + Cursor, frontmatter, analyse economique Max Mode). Reference humaine pour revision ou enrichissement de `_bmad-output/implementation-artifacts/bmad-llm-tiers.json`. _(Charger si : session sur agents/rules/choix model/tiers LLM et besoin du recit complet ou mise a jour du JSON.)_ |

