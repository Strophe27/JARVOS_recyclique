# Ou on en est — JARVOS Recyclique

Mis a jour : 2026-04-21

**Perimetre par version** : voir [references/versioning.md](versioning.md) (v0.1.0 → v1.0.0).

## Bascule BMAD (2026-03-31)

Les sorties BMAD **actives** (`_bmad-output/planning-artifacts/`, `_bmad-output/implementation-artifacts/`) ont été **réinitialisées** pour repartir sur une nouvelle ligne (évolution incrémentale depuis `recyclique-1.4.4` stabilisé, sans le récit « refonte complète » comme plan directeur).

**Archive complète** de l’ancienne chaîne (brief, PRD, architecture, epics, sprint-status, recherche, sous-dossiers) : `_bmad-output/archive/2026-03-31_pivot-brownfield-recyclique-1.4.4/`. Explications : [_bmad-output/README.md](../_bmad-output/README.md).

Dans les sections historiques **datées d’avant le 2026-03-31**, lorsqu’un journal cite `_bmad-output/planning-artifacts/...` ou `implementation-artifacts/...` **sans** préfixe d’archive, entendre la copie sous `_bmad-output/archive/2026-03-31_pivot-brownfield-recyclique-1.4.4/` (même arborescence relative).

**Raccourci pour ouvrir les fichiers :** préfixe d’archive  
`_bmad-output/archive/2026-03-31_pivot-brownfield-recyclique-1.4.4/`  
(ex. le PRD archivé : `.../planning-artifacts/prd.md`). Les dossiers **actifs** `planning-artifacts/` et `implementation-artifacts/` sous `_bmad-output/` portent la chaîne courante (ex. `epics.md`, `sprint-status.yaml`) ; l’archive ci-dessus conserve l’ancienne ligne 1.4.4.

**Pilotage d’exécution v2** — Abstract canonique : voir l’entrée **guide-pilotage-v2** dans [references/index.md](index.md). Fichier : [_bmad-output/planning-artifacts/guide-pilotage-v2.md](../_bmad-output/planning-artifacts/guide-pilotage-v2.md). Le journal **daté** ci-dessous reste la trace des sessions ; les **cases jalons** se maintiennent dans le guide aux grands événements (convergences, fin d’epic majeur).

## Etat actuel

Projet JARVOS Recyclique v0.1.0 initialise. **Analyse brownfield 1.4.4 disponible** dans `references/ancien-repo/`. **Analyse brownfield Paheko faite** : extensions (plugins/modules), API HTTP, gestion des fichiers et upload, WebDAV — voir [references/paheko/analyse-brownfield-paheko.md](paheko/analyse-brownfield-paheko.md) (index : [references/paheko/index.md](paheko/index.md)). Workflow Git en place. **Code et contrats dans le mono-repo** : notamment `recyclique/`, `peintre-nano/`, reference d'import `recyclique-1.4.4/`, contrats `contracts/` ; le grain fin des stories = `_bmad-output/implementation-artifacts/sprint-status.yaml`.

**Repere BMAD Epics 6 a 10** : pour toute reprise ou create-story / dev-story sur la suite `6.x` a `10.x`, utiliser comme point d'entree documentaire [references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md](artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md) puis [references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md](artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md). Le pack `02` donne la vue de lecture par epic et le corpus de captures ; le tableau `03` donne la navigation **story par story**. Pour l'etat **story par story** (y compris cloture des Epics 6, 7, 8), se fier a `sprint-status.yaml` ; le pack et le tableau restent la lecture operationnelle des captures et de la matrice.

**Framework de modules : design complet et arbitré.** Artefact : `references/artefacts/2026-02-24_07_design-systeme-modules.md`. Décisions finales posées : TOML, ModuleBase, EventBus Redis Streams (multi-workers), slots React, monorepo. **Product Brief v0.1.0 complété** (2026-02-25) : `_bmad-output/planning-artifacts/product-brief-JARVOS_recyclique-2026-02-25.md`. **PRD complété** (2026-02-26) : `_bmad-output/planning-artifacts/prd.md` — exigences fonctionnelles (caisse, réception, compta, correspondance, auth, déploiement, vie asso, éco-organismes, extension points), NFR, scope v1 et hors scope (dont réception hors ligne = module complémentaire post-v1). **UX v1.0** : mêmes écrans que 1.4.4, copie du code des mises en page (copy+consolidate+security), pas de refonte écrans pour la v1.0.

**Strategie de recherche : spirale.** 1re passe = decouverte / cartographie sur tous les sujets (Kanban + todo) ; 2e passe = recherches detaillees (API Paheko caisse, extension saisie au poids, analyse dumps, etc.). **1re passe spirale clôturée** (2026-02-25) : tous les sujets Kanban et todo ont eu au moins une passe decouverte ; URL repo 1.4.4 renseignee.

**Donnees production :** dumps BDD dans `references/dumps/` (gitignore) — Paheko deja present ; Recyclic a deposer si besoin. **Schéma BDD Recyclic dev documenté** : [references/dumps/schema-recyclic-dev.md](dumps/schema-recyclic-dev.md) (tables et colonnes, correspondances Paheko à préciser). **Schéma BDD Paheko dev documenté** : [references/dumps/schema-paheko-dev.md](dumps/schema-paheko-dev.md) — tables core + **tables réelles** du plugin Caisse (plugin_pos_*) et du module Saisie au poids (module_data_saisie_poids), extraites de l'instance avec plugins installés ; pour correspondances avec RecyClique. **2e passe réalisée** : instance Paheko + accès BDD Recyclic en local, schémas et confrontation (artefact 08).

**Decisions 2026-02-25** : push par ticket, Redis Streams pour file push Paheko, source officielle EEE dans RecyClique, reception/poids RecyClique sans sync manuelle, objectif interfaces compta dans RecyClique. Voir [artefact 2026-02-25_07](artefacts/2026-02-25_07_decisions-push-redis-source-eee.md).

BMAD 6.0.3 installe. Cursor rules actives. Dossier `references/` operationnel.

**Track BMAD : Enterprise** (securite, conformite, DevOps ; multi-utilisateur ; une instance par ressourcerie). Detail : [artefact 2026-02-26_02](artefacts/2026-02-26_02_track-enterprise-multi-utilisateur.md).

**Architecture complétée** (2026-02-26) : `_bmad-output/planning-artifacts/architecture.md` — décisions techniques, patterns, structure projet, validation ; statut READY FOR IMPLEMENTATION. Points à trancher en v0.1 : [checklist 2026-02-26_03](artefacts/2026-02-26_03_checklist-v0.1-architecture.md).

## Derniere session

2026-04-21 — **Epic 24 — merge dans `master`** : la branche **`epic/24-operations-speciales-orchestration`** est **fusionnée** dans `master` (validation Strophe). Le journal du **2026-04-19** ci-dessous reste la trace d’état *avant* merge ; la suite = recette continue sur `master` si besoin, sans carte Kanban « à faire » pour l’Epic 24.

2026-04-21 — **Workflow événements caisse → Paheko (idée Kanban)** : **archivée** — l’objectif est **assumé** par le socle Paheko livré (clôture avec ventilation moyens / montants, admin compta, cockpit). Réouverture possible si le métier redemande une granularité **hors** clôture de session. Fiche : `references/idees-kanban/archive/2026-03-01_workflow-evenements-caisse-recyclique-paheko.md`.

2026-04-20 — **QA paramétrage comptable SuperAdmin (merge GitHub)** : la branche `feat/qa-compta-superadmin-20260418` a été fusionnée dans `master` (PR **#1**, commit de fusion **`1809c6b`**). Bilan des livrables et distinction « spec / tableau des priorités » vs « table SQL » : artefact **[references/artefacts/2026-04-20_bilan-fin-ecarts-qa-parametrage-comptable-superadmin.md](artefacts/2026-04-20_bilan-fin-ecarts-qa-parametrage-comptable-superadmin.md)**. Fiche Kanban **[references/idees-kanban/a-faire/2026-04-18_finir-ecarts-qa-parametrage-comptable-superadmin.md](idees-kanban/a-faire/2026-04-18_finir-ecarts-qa-parametrage-comptable-superadmin.md)** allégée : lien vers ce bilan pour l’historique « déjà fait », checklist du **reliquat** (relecture grille B/M/I dans la spec).

2026-04-19 — **Epic 24 — Opérations spéciales caisse (branche `epic/24-operations-speciales-orchestration`)** : chantier BMAD exécuté story par story (Story Runner) ; toutes les clés `24-1` … `24-10` sont **done** dans `_bmad-output/implementation-artifacts/sprint-status.yaml` ; `epic-24` → **done**. Périmètre livré côté produit : hub opérations spéciales depuis la caisse (session ouverte), remboursement standard / expert N−1 / exceptionnel, échange matière + delta, décaissement sous-types, mouvement interne, tags métier ticket/ligne (24.9), preuves P3 (seuils, audit). Suivis correctifs **Story 6.8** hors périmètre strict Epic 24 : correction vente multi-moyens, lignes article, picker catégories, libellés **don** sans vocabulaire « surplus » côté métier, correction sensible autorisée **même si session caisse déjà clôturée** (super-admin, audit `correction_on_closed_session`) — commits récents sur la même branche (ex. `7e799bc`). *Au 2026-04-19 le merge dans `master` n’était pas encore fait — **effectué le 2026-04-21** (voir entrée du même jour).* Sources produit : pack `references/operations-speciales-recyclique/` + PRD v1.1 ; fiche Kanban associée **archivée** (voir `references/idees-kanban/archive/2026-04-18_chantier-operations-speciales-caisse-prd-v1-1.md`).

2026-04-18 — **Paheko outbox hardening v2 (implémentation + QA)** : plan `.cursor/plans/paheko_outbox_hardening_v2_121f6d80.plan.md` exécuté sur la branche `cursor/paheko-outbox-hardening-v2-9abb` (PR vers `master`). REL/AGR/SNAP/DEL sur live-snapshot, DELETE outbox gardé, OpenAPI + Peintre + doc mode d’emploi super-admin. Trace livrable : [artefacts/2026-04-18_03_livraison-paheko-outbox-hardening-v2-plan-cloud.md](artefacts/2026-04-18_03_livraison-paheko-outbox-hardening-v2-plan-cloud.md). Idée Kanban « durcissement sync Paheko outbox » → **archive** (voir `references/idees-kanban/archive/2026-04-18_durcissement-sync-paheko-outbox-post-audit.md`).

2026-04-13 — **Cloture documentaire (agent)** : correction de la section **Etat actuel** (le depot contient bien le code v2 et le brownfield ; l'ancienne phrase « aucun code source » etait obsolete). Renvoi explicite au grain fin dans `sprint-status.yaml`. Alignement des cases **Epics 1 a 8** dans `_bmad-output/planning-artifacts/guide-pilotage-v2.md` sur ce YAML ; **pas** de modification de `sprint-status.yaml` ni des fichiers story.

2026-04-02 — **Piste B / Epic 1 — Stories 1.3 et 1.4 (documentation contrats & authz)** : spec canonique **multi-contextes / invariants d’autorisation** → [artefacts/2026-04-02_03_spec-multi-contextes-invariants-autorisation-v2.md](artefacts/2026-04-02_03_spec-multi-contextes-invariants-autorisation-v2.md) (story [_bmad-output/implementation-artifacts/1-3-specifier-le-modele-multi-contextes-et-les-invariants-dautorisation-v2.md](../_bmad-output/implementation-artifacts/1-3-specifier-le-modele-multi-contextes-et-les-invariants-dautorisation-v2.md)) ; **gouvernance OpenAPI / CREOS / ContextEnvelope** → [artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md](artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md) (story [_bmad-output/implementation-artifacts/1-4-fermer-la-gouvernance-contractuelle-openapi-creos-contextenvelope.md](../_bmad-output/implementation-artifacts/1-4-fermer-la-gouvernance-contractuelle-openapi-creos-contextenvelope.md)). Pointeurs regroupés dans [references/index.md](index.md) (section **artefacts/**). **Ordre de lecture pour un agent :** **1.3** d’abord (sémantique métier, PIN, step-up, AR39/AR19 côté « quoi »), puis **1.4** (emplacements reviewables, `operationId`, drift, manifests). Entrée pratique côté repo : [contracts/README.md](../contracts/README.md). Suite logique Epic 1 : story **1.5** (sync / réconciliation Paheko).

2026-04-02 — **Epic 3 / Story 3.0 clôturée** : socle `peintre-nano/` (Vite, React, TS strict, Mantine P1), quatre artefacts typés + `conceptual-artifacts.stub.ts`, tests Vitest, script `npm run lint` (`tsc -b`) ; passage QA2 (5 passes) et correctifs P1 (layout CSS Modules, tokens, smoke). `sprint-status.yaml` : clé `3-0-initialiser-peintre-nano-et-ses-quatre-artefacts-minimaux` → **done** ; epic-3 → **in-progress** (suite 3.1+). Story et check-list de clôture : [_bmad-output/implementation-artifacts/3-0-initialiser-peintre-nano-et-ses-quatre-artefacts-minimaux.md](../_bmad-output/implementation-artifacts/3-0-initialiser-peintre-nano-et-ses-quatre-artefacts-minimaux.md). **Rien d’autre n’est attendu sur 3.0** avant d’ouvrir la story 3.1.

2026-04-01 — **Correctifs post-QA** (guide pilotage) : note chemins dans [_bmad-output/README.md](../_bmad-output/README.md) (actif vs archive) ; renvoi [`guide-pilotage-v2`](../_bmad-output/planning-artifacts/guide-pilotage-v2.md) en tête d’[Epic 3](../_bmad-output/planning-artifacts/epics.md) ; harmonisation français / accents dans le guide et le bloc « Voir aussi » des *Epic Sequencing Notes*.

2026-04-01 — **Guide de pilotage v2** : ajout de [_bmad-output/planning-artifacts/guide-pilotage-v2.md](../_bmad-output/planning-artifacts/guide-pilotage-v2.md) (deux récits, jalons, carte documentaire, frictions, prompt superviseur) ; entrée dans [references/index.md](index.md), pointeur dans ce fichier, [_bmad-output/README.md](../_bmad-output/README.md), [architecture/index.md](../_bmad-output/planning-artifacts/architecture/index.md), renvois dans [epics.md](../_bmad-output/planning-artifacts/epics.md) et [prd.md](../_bmad-output/planning-artifacts/prd.md) §12.

2026-04-01 — Sprint Planning (BMAD) relancé sur `epics.md` v2.

Réalisé :
- **Sprint Status** : `_bmad-output/implementation-artifacts/sprint-status.yaml` régénéré. Inventaire : **10 epics**, **75 stories**, **10** rétrospectives ; statuts par défaut `backlog` / `optional` (aucun fichier story `{story-key}.md` à la racine de `implementation-artifacts` pour l’instant). Deux clés corrigées à la main après génération automatique : `1-2-…-api-existante-…` (éviter `lapi` pour *l’API*) et `5-5-…-ui-transverse` (éviter `lui` pour *l’UI*). Prochaine étape : Create Story → Dev Story → Code Review.

**Correct Course (même jour, post-approbation)** — alignement **P1/P2** ADR Peintre ↔ BMAD ; puis **correctifs QA** (PRD §7.1 / P2, **AR45**, Story 9.6, addendum readiness, note « Prochaine étape ») :
- **PRD** : section « Stack Peintre_nano (figée) » + liens ADR / instruction ; frontmatter enrichi.
- **Architecture active** : `core-architectural-decisions.md`, `starter-template-evaluation.md`, `implementation-patterns-consistency-rules.md`, `project-structure-boundaries.md` ; bannière **P1/P2** sur `archive/architecture.md`.
- **Epics** : AR3, AR15 et lignes de traçabilité epic mises à jour.
- **Sprint Change Proposal** : `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-01.md` — implémentation documentaire marquée faite ; **à faire** : re-run `check implementation readiness` quand tu veux rafraîchir le rapport.

---

2026-02-26 — Sprint Planning complété (workflow BMAD).

Réalisé :
- **Sprint Status** (ancienne chaîne, désormais obsolète pour le pilotage v2) : voir archive ; l’inventaire d’alors était 8 epics, 22 stories.

---

2026-02-26 — Create Architecture complété (workflow BMAD).

Réalisé :
- **Architecture** : `_bmad-output/planning-artifacts/architecture.md` complété (steps 1 à 8). Décisions : Paheko SQLite / RecyClique PostgreSQL, un container (front + middleware), JWT + PIN + RBAC, EventBus Redis Streams + file push, audit log, patterns (nommage, structure, formats), arborescence cible, mapping FR → structure. Validation : READY FOR IMPLEMENTATION. Checklist v0.1 extraite dans [artefact 2026-02-26_03](artefacts/2026-02-26_03_checklist-v0.1-architecture.md). Prochaine étape : Create Epics and Stories.

---

2026-02-26 — PRD complété et clarifications (session domaine).

Réalisé :
- **PRD** rédigé et mis à jour : `_bmad-output/planning-artifacts/prd.md`. Clarifications intégrées : **FR11** — « session » = session de **caisse**, une session RecyClique = une session Paheko **par caisse** (en multi-caisses, chaque caisse a sa propre session). **Réception hors ligne** : module complémentaire à développer après v1 (hors scope initial). **Module correspondance (FR13b)** : phrase ajoutée — détail des champs et règles à affiner après confrontation BDD + instance dev + analyste. **Presets / boutons rapides** (Don, Recyclage, Déchèterie, etc.) : note ajoutée — étude à faire (correspondances éco vs non-éco ou conservation RecyClique), à documenter (matrice ou spec dédiée).

---

2026-02-25 — Product Brief JARVOS Recyclique complété (workflow Create Product Brief).

Brief disponible : `_bmad-output/planning-artifacts/product-brief-JARVOS_recyclique-2026-02-25.md`. Sections : Executive Summary, Core Vision (problem, solution, differentiators), Target Users (terrain, compta/admin, bénévoles, journey), Success Metrics (v1.0 livrée en prod, adoption 2e ressourcerie), MVP Scope (v0.1→v1.0, hors scope, future vision). Prochaine étape logique : PRD.

---

2026-02-25 — Décisions matrice caisse/poids (session=session, manques v0.2+, compatibilité Paheko).

Matrice [references/migration-paheko/audits/matrice-correspondance-caisse-poids.md](migration-paheko/audits/matrice-correspondance-caisse-poids.md) mise à jour : 1 session RecyClique = 1 session Paheko (ouverture → clôture) ; clôture RecyClique déclenche clôture Paheko (contrôle totaux + syncAccounting) ; section 2.5 unité de poids (kg ↔ g, convention PRD) ; section 4 fonctionnalités Paheko absentes (v0.1 ignorer, v0.2+ à développer) ; section 5 principe de compatibilité Paheko (config Paheko = référence). Grille 05 axe 6 (module correspondance) → statut décidé.

---

2026-02-25 — Schéma Paheko dev : plugins Caisse et Saisie au poids (tables réelles).

Plugins Caisse (POS) et Saisie au poids installés sur l'instance dev. Ré-extraction du schéma : [references/dumps/schema-paheko-dev.md](dumps/schema-paheko-dev.md) mis à jour avec les tables réelles plugin_pos_* et module_data_saisie_poids.

---

2026-02-25 — Schéma BDD Paheko dev (exploration instance Docker, documentation correspondances).

Realise :
- **Exploration** de la BDD SQLite Paheko (instance dev-tampon/paheko/, fichier data/association.sqlite) : listage des tables, extraction des schémas (CREATE TABLE) pour les tables pertinentes.
- **Document** [references/dumps/schema-paheko-dev.md](dumps/schema-paheko-dev.md) : tables api_credentials, users, users_categories, acc_charts, acc_years, acc_accounts, acc_transactions, acc_transactions_lines, acc_transactions_files, files, config, plugins, modules, module_data_* (exemple expenses_claims) ; sections pour les tables attendues avec plugin Caisse (plugin_caisse_*) et module Saisie au poids (module_data_saisie_poids) ; tableau correspondances RecyClique ↔ Paheko.
- Mise a jour [references/paheko/index.md](paheko/index.md) et present fichier.

---

2026-02-25 — Connexion BDD Recyclic dev, extraction schéma, documentation.

Realise :
- Script `dev-tampon/scripts/schema_recyclic_to_md.py` : charge `dev-tampon/.env.recyclic-db` (python-dotenv), se connecte à PostgreSQL et génère le schéma.
- **Schéma BDD Recyclic dev** : [references/dumps/schema-recyclic-dev.md](dumps/schema-recyclic-dev.md) — toutes les tables (users, sites, cash_sessions, sales, sale_items, payment_transactions, poste_reception, ticket_depot, ligne_depot, categories, etc.) avec colonnes et clés primaires ; section correspondances Paheko (caisse, réception, utilisateurs).
- Mise a jour `references/dumps/README.md` et present fichier.

---

2026-02-25 — Decisions confrontation (push, Redis, source EEE, reception, interfaces compta).

Realise :
- Creation de `artefacts/archive/` et deplacement du plan Git (01–05) vers archive.
- Artefact [2026-02-25_07_decisions-push-redis-source-eee.md](artefacts/2026-02-25_07_decisions-push-redis-source-eee.md) : decisions + questions encore a trancher.
- Mise a jour grille [2026-02-25_05](artefacts/2026-02-25_05_grille-confrontation-recyclic-paheko.md) et point global [2026-02-25_06](artefacts/2026-02-25_06_point-global-avant-prd.md).
- Questions restantes listees dans artefact 07.

---

2026-02-25 — Execution plan 2e passe sans BDD (checklist, dev-tampon Paheko, grille confrontation, vision module decla, perimetre).

Realise :
- **Checklist** import 1.4.4 : [references/ancien-repo/checklist-import-1.4.4.md](ancien-repo/checklist-import-1.4.4.md) (copy, consolidate, security — a appliquer a chaque pioche dans le code 1.4.4).
- **Dossier tampon** `dev-tampon/` (gitignore) : procedure Paheko dev dans `dev-tampon/paheko/` (README, Dockerfile, docker-compose) ; Windows / Docker Desktop. Voir [references/paheko/index.md](paheko/index.md).
- **Grille confrontation** RecyClique vs Paheko : [references/artefacts/2026-02-25_05_grille-confrontation-recyclic-paheko.md](artefacts/2026-02-25_05_grille-confrontation-recyclic-paheko.md) (agent-usable, 8 axes).
- **Vision module decla eco-organismes** : [references/vision-projet/vision-module-decla-eco-organismes.md](vision-projet/vision-module-decla-eco-organismes.md) (agnostique, categories boutique libres → mapping par eco-organisme).
- **Perimetre** : ancrage dans [references/versioning.md](versioning.md) ; todo correspondants coches.

---

2026-02-25 — 2e passe spirale (recherches, analyse plugins, decisions push).

Realise :
- **Ventilation** des 3 reponses Perplexity (API caisse, extension saisie au poids, auth/SSO) dans references/recherche/ ; todo mis a jour.
- **Analyse code** plugin caisse (paheko-plugins) : schema tables plugin_caisse_*, syncAccounting (ecritures compta pas a la fermeture).
- **Decisions** : RecyClique pilote la caisse ; push a la fermeture vers Paheko via **plugin PHP custom** (public/api.php) ; Brindille inadapte ; Odoo vs Paheko = rester sur Paheko. Source de verite caisse = Paheko seul.
- **Saisie au poids** : module Brindille (repo/modules/saisie_poids/) ; sync manuelle depuis caisse possible ; repo Paheko remplace par archive officielle (plugins/modules inclus).
- **Artefact** [references/artefacts/2026-02-25_04_analyse-plugins-caisse-decisions-push.md](artefacts/2026-02-25_04_analyse-plugins-caisse-decisions-push.md) : vision RecyClique (offline, decla eco-organismes), doc plugins, confrontation a venir avec l'analyste.

---

2026-02-25 — Cloture 1re passe spirale.

Realise :
- **URL repo** : https://github.com/La-Clique-qui-Recycle/RecyClique renseignee dans [references/ancien-repo/README.md](ancien-repo/README.md). Todo coché.
- **Notes 1re passe** sur 5 idees Kanban : README international, README contexte projet, module store, Le Fil placeholder, JARVOS Ports. Index idees-kanban mis a jour.
- **Artefact** [references/artefacts/2026-02-25_03_closure-1re-passe-spirale.md](artefacts/2026-02-25_03_closure-1re-passe-spirale.md) : synthese cloture 1re passe, suite 2e passe et Brief.

---

2026-02-25 — Decisions 1re passe spirale (integration Paheko core, catalogue, IA/LLM).

Realise :
- **Integration Paheko core** : decisions actees — version 1.3.19.x, un seul Compose monorepo ; artefact 09 mis a jour (section « Decisions 1re passe », « Catalogue 1re passe »). Reponses Perplexity version + catalogue enregistrees et indexees.
- **Catalogue modules Paheko** : fait (reponse Perplexity + croisement artefact 09).
- **IA/LLM** : inventaire 1.4.4 = import Excel / categories LLM ; decision = placeholder + report apres brief ; idee ia-llm-modules-intelligents mise a jour.
- **Dumps BDD** : nouveau dossier `references/dumps/` (gitignore) pour sauvegardes Paheko / Recyclic prod. Depot direct dans `references/dumps/` ou depot dans _depot puis ventilation (skill traiter-depot). Objectif 2e passe = monter les bases et cartographier correspondances.
- Mises a jour : todo (catalogue, version, inventaire LLM, strategie LLM reportee), index recherche, idees integration-paheko-core et ia-llm.

---

2026-02-25 — Decisions calendrier, fichiers, RAG (tour de discussion).

Realise :
- **Decision agenda** : Recyclic + services externes ; utilisateur = ref Paheko ; multi-agendas ; v0.1.0 = placeholders. Artefact [references/artefacts/2026-02-25_01_decision-agenda-recyclic-externe.md](artefacts/2026-02-25_01_decision-agenda-recyclic-externe.md). Idee calendar-espace-fichiers-paheko mise a jour.
- **Chantier fichiers** : ouverture chantier (versions futures). Idee Kanban [references/idees-kanban/a-creuser/2026-02-25_chantier-fichiers-politique-documentaire.md](idees-kanban/a-creuser/2026-02-25_chantier-fichiers-politique-documentaire.md) + artefact [references/artefacts/2026-02-25_02_chantier-fichiers-politique-documentaire.md](artefacts/2026-02-25_02_chantier-fichiers-politique-documentaire.md). Todo ajoute.
- **RAG** : Recyclic donne acces a la base documentaire (Paheko + services tiers) a JARVOS Nano/Mini pour indexation.
- Mises a jour : index artefacts, index idees-kanban, todo, vision-projet (note RAG).

---

2026-02-25 — Analyse brownfield Paheko (document-project deep-dive).

Realise :
- **Document** `references/paheko/analyse-brownfield-paheko.md` : analyse complete du repo Paheko (extensions plugins/modules, API REST, gestion fichiers, WebDAV, routes upload/reference) ; synthese pour integration RecyClique.
- Mise a jour `references/paheko/index.md` avec lien vers l'analyse.
- Mise a jour du present fichier (ou-on-en-est.md).

---

2026-02-24 — Analyst : doc officielle Paheko + prompts recherche.

Realise :
- **Artefact** `references/artefacts/2026-02-24_10_doc-officielle-paheko-integration-core.md` : synthese doc officielle Paheko (Extensions + API 1.3.17.1), inconnues et renvoi vers les 5 prompts Perplexity.
- **Cinq prompts Perplexity** crees (a executer) : API caisse, Saisie au poids, version Paheko stable, auth/SSO app externe, catalogue plugins/modules. Fichiers dans `references/recherche/` (suffixe `_perplexity_prompt.md`) ; reponses a enregistrer apres execution.
- Mises a jour : index artefacts, index recherche, idee integration-paheko-core.
- **Conversation** : Analyst - Integration Paheko core doc et recherches.

---

## Ordre de priorite 1re passe (spirale) — historique

Ordre qui a ete suivi ; 1re passe cloturee (2026-02-25).

1. **Integration Paheko core** — perimetre, Docker, modules optionnels, ce qu'on branche.
2. **Calendrier / espace fichiers Paheko** — verifier capacites natives (eviter double conception).
3. **Catalogue modules Paheko** — croiser avec integration core, ce qui est installable.
4. **IA/LLM** — inventaire usages 1.4.4 + strategie (placeholder vs Nano/Mini).
5. **Restant Kanban** — nouvelles UI, module store, Le Fil, module correspondance, README, etc.

## Prochaine etape

> **Note (2026-04-01)** : la ligne directrice **v2 brownfield** vit dans `_bmad-output/planning-artifacts/` (PRD, `epics.md`, `sprint-status.yaml`). Les étapes 1–3 ci-dessous sont l’historique **février 2026** ; l’état courant est dans **Dernière session** (sprint planning v2, Correct Course, alignement ADR P1/P2). Enchaînement logique aujourd’hui : **Create Story** (fichiers `.md` par clé) → **Dev Story** → **Code Review** ; optionnel : re-run **check implementation readiness** pour régénérer le rapport (un addendum 2026-04-01 documente déjà l’alignement ADR dans `implementation-readiness-report-2026-04-01.md`).

1. **Create Epics and Stories** (`/bmad-bmm-create-epics-and-stories`, agent PM John) : découper le PRD et l'architecture en épics et stories (fichier `epics.md`). Workflow en 4 étapes avec tours de réflexion et validation.
2. **Check Implementation Readiness** (`/bmad-bmm-check-implementation-readiness`, agent Architect Winston) : valider la cohérence PRD / UX / Architecture / Épics & Stories avant le sprint.
3. **Sprint Planning** (`/bmad-bmm-sprint-planning`, agent SM Bob) : produire `sprint-status.yaml` puis enchaîner le cycle Create Story → Dev Story → Code Review. **Fait (2026-02-26)** : `_bmad-output/implementation-artifacts/sprint-status.yaml` généré ; suite = créer des stories (fichiers .md) et lancer Dev Story / Code Review.

**Points de vigilance v0.1** : loader modules (TOML, ModuleBase), slots, convention tests frontend, versions Dockerfile/README — voir [checklist 2026-02-26_03](artefacts/2026-02-26_03_checklist-v0.1-architecture.md) et architecture.md (Gap Analysis).

**En cas de dérive** : si en cours de route une décision d'architecture ou de périmètre doit être revue (mauvaise architecture sur un point, changement de scope), utiliser le workflow **Correct Course** (`/bmad-bmm-correct-course`, agent SM Bob). Il analyse la situation et peut recommander : mise à jour du PRD, révision de l'architecture, mise à jour des épics/stories (`epics.md`), ou replanification du sprint (`sprint-status.yaml`). Les changements remontent depuis la base (décision) puis se propagent aux documents ; on peut ainsi remodifier et faire remonter même si une partie des stories est déjà réalisée.
