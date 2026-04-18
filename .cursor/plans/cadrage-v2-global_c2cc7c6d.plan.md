---
name: cadrage-v2-global
overview: Cadrer une cible JARVOS Recyclique v2.0 en brownfield à partir de `recyclique-1.4.4`, avec Recyclique comme source métier terrain et Paheko comme source comptable officielle via approche API-first, en rebasant désormais l’axe UI autour de la séparation `Recyclique` / `Peintre_nano` et d’un profil `CREOS` documentaire minimal. Le plan devient le parent des sous-plans structurants sur Peintre et CREOS.
todos:
  - id: decision-v2
    content: Formaliser la décision directrice v2.0, fixer les rôles Recyclique vs Paheko et neutraliser les récits contradictoires
    status: pending
  - id: separation-peintre
    content: Rebaser l’axe UI/architecture autour de la séparation stricte Recyclique / Peintre_nano, avec packaging interne initial et extraction future préparée
    status: pending
  - id: profil-creos
    content: Figer le profil CREOS documentaire minimal que Recyclique doit émettre et que Peintre_nano doit consommer
    status: pending
  - id: matrice-paheko
    content: Construire la matrice d’intégration Paheko API-first et le contrat de synchronisation/réconciliation
    status: pending
  - id: spec-multicaisse
    content: Spécifier l’isolation multi-sites / multi-caisses / sessions et le modèle de déploiement cible
    status: pending
  - id: archi-modules
    content: Définir l’architecture modulaire et les critères de découplage entre chantiers
    status: pending
  - id: framework-ui
    content: Définir le framework UI/UX Recyclique et son seuil minimal de cadrage
    status: pending
  - id: rebase-bmad
    content: Relancer les artefacts BMAD actifs et réaligner les index/documentation canoniques
    status: pending
isProject: false
---

# Cadrage global v2.0

## Point de départ

- La ligne active est bien une évolution incrémentale depuis `[references/index.md](references/index.md)` et `[references/ou-on-en-est.md](references/ou-on-en-est.md)`, pas une refonte from scratch.
- Le code `recyclique-1.4.4` a été stabilisé mais pas refondu ; il constitue une base brownfield exploitable, avec dette encore présente mais terrain assaini (`[references/artefacts/2026-03-31_01_handoff-nettoyage-stabilisation-recyclique-1.4.4.md](references/artefacts/2026-03-31_01_handoff-nettoyage-stabilisation-recyclique-1.4.4.md)`).
- La doc existante couvre déjà des morceaux de la cible, mais elle contient un conflit majeur à absorber : plusieurs artefacts historiques penchent encore vers `Paheko = backend / vérité principale`, alors que l’arbitrage retenu ici est `Recyclique = source métier terrain` et `Paheko = source comptable officielle`.
- Nouveau pivot structurant : l’axe UI n’est plus seulement un `framework UI Recyclique` interne. La direction retenue est maintenant une séparation nette entre `Recyclique` (noyau métier + contrats + modules métier) et `Peintre_nano` (moteur de composition front), avec `CREOS` comme grammaire commune des manifests et déclarations UI.

## Objectif du cadrage

Produire un nouveau cadre v2.0 qui unifie cinq axes sans réécrire l’historique :

- intégration Paheko API-first pour la comptabilité et les référentiels associés
- architecture modulaire activable/désactivable par domaine métier
- socle multi-sites / multi-caisses réellement isolé
- séparation Recyclique / Peintre_nano et profil `CREOS` documentaire minimal
- unification UI/UX et préparation d’un affichage dynamique pilotable sur cette nouvelle base

## Hiérarchie des plans

Ce plan reste le **plan parent**.

Il est désormais complété par deux sous-plans structurants :

- `[.cursor/plans/separation-peintre-recyclique_4777808d.plan.md](.cursor/plans/separation-peintre-recyclique_4777808d.plan.md)` pour la séparation d’architecture et le phasage de `Peintre_nano`.
- `[.cursor/plans/profil-creos-minimal_6cf1006d.plan.md](.cursor/plans/profil-creos-minimal_6cf1006d.plan.md)` pour le noyau `CREOS` documentaire minimal.

Règle de lecture :

1. Ce plan fixe l’ordre global et les grands chantiers.
2. Le plan `separation-peintre-recyclique` précise le pivot UI/architecture.
3. Le plan `profil-creos-minimal` précise le contrat documentaire minimal à figer avant implémentation significative du socle UI.

## Plan de travail

### 1. Écrire la décision directrice v2.0

- Créer un document pivot qui remplace les ambiguïtés actuelles et fixe les rôles système.
- Base documentaire à réconcilier : `[references/paheko/analyse-brownfield-paheko.md](references/paheko/analyse-brownfield-paheko.md)`, `[references/paheko/liste-endpoints-api-paheko.md](references/paheko/liste-endpoints-api-paheko.md)`, `[references/artefacts/2026-02-25_04_analyse-plugins-caisse-decisions-push.md](references/artefacts/2026-02-25_04_analyse-plugins-caisse-decisions-push.md)`, `[references/artefacts/2026-02-24_08_decision-architecture-max-paheko.md](references/artefacts/2026-02-24_08_decision-architecture-max-paheko.md)`.
- Sortie attendue : une formulation claire du modèle cible :
  - Recyclique porte les workflows terrain, la caisse, la réception, les modules métier et l’UX.
  - Paheko reste l’autorité comptable officielle et le point d’ancrage compta/adhérents/utilisateurs selon périmètre validé.
  - Intégration prioritaire par API ; plugin Paheko autorisé uniquement comme extension minimale si un besoin métier n’est pas exposé.
- Cette décision doit aussi fixer la hiérarchie documentaire post-pivot :
  - `[references/index.md](references/index.md)` et `[references/versioning.md](references/versioning.md)` comme repères de périmètre.
  - `[references/ou-on-en-est.md](references/ou-on-en-est.md)` comme journal de statut vivant à réaligner.
  - `[_bmad-output/archive/2026-03-31_pivot-brownfield-recyclique-1.4.4/README.md](_bmad-output/archive/2026-03-31_pivot-brownfield-recyclique-1.4.4/README.md)` comme historique non canonique.
  - les artefacts contradictoires explicitement rétrogradés en matière historique ou mis à jour.
- Cette décision doit contenir une table explicite `ancienne affirmation -> nouvelle règle -> action documentaire`, avec au minimum :
  - les documents Paheko qui parlent encore de `Paheko = backend principal` ;
  - les artefacts qui supposent encore `caisse native Paheko` comme trajectoire principale ;
  - les pages de statut ou d’index qui mélangent archive BMAD et vérité courante.
- Cette phase doit aussi restructurer `[references/ou-on-en-est.md](references/ou-on-en-est.md)` en deux zones lisibles :
  - une tête courte `vérité courante` ;
  - un bloc `historique` explicitement rétrogradé.

### 2. Trancher la séparation Recyclique / Peintre_nano

- Considérer comme **acquis de cadrage** la séparation suivante :
  - `Recyclique` porte le métier, la sync Paheko, les contrats backend, les modules métier et leurs contributions déclaratives ;
  - `Peintre_nano` porte le moteur de composition front, le registre de modules, les slots, le catalogue de widgets et la résolution d’affichage ;
  - `React` (ou adaptateur de canal) rend le shell et les widgets ;
  - l’extraction future vers un repo dédié doit rester possible, mais le packaging initial reste interne pour limiter la friction.
- Sous-plan de référence : `[.cursor/plans/separation-peintre-recyclique_4777808d.plan.md](.cursor/plans/separation-peintre-recyclique_4777808d.plan.md)`.
- Cette étape remplace l’ancienne lecture où `Peintre` n’était qu’une capacité future encadrée ; il devient un **socle UI structurel phasé**.

### 3. Figer le profil CREOS documentaire minimal

- Définir le noyau minimal de grammaire `CREOS` nécessaire à la V2 pour les manifests UI et les contrats de composition.
- Référence : `[.cursor/plans/profil-creos-minimal_6cf1006d.plan.md](.cursor/plans/profil-creos-minimal_6cf1006d.plan.md)`.
- À figer avant implémentation significative du socle UI :
  - objets minimaux (`ModuleManifest`, `SlotDefinition`, `WidgetDeclaration`, `ModuleAction`) ;
  - rules, states, events et commands minimales ;
  - source canonique des schémas JSON ;
  - gouvernance de versionnement entre `OpenAPI`, schémas `CREOS` et futurs artefacts partagés.
- Critère clé : éviter tout JSON UI ad hoc qui divergerait du reste de l’écosystème JARVOS.

### 4. Construire la matrice d’intégration Paheko v2.0 et le contrat de synchronisation

- Établir une matrice `opération métier -> API officielle / plugin minimal / SQL hors flux transactionnel / hors scope`.
- Sources prioritaires : `[references/migration-paheko/audits/matrice-correspondance-caisse-poids.md](references/migration-paheko/audits/matrice-correspondance-caisse-poids.md)`, `[references/artefacts/2026-02-25_05_grille-confrontation-recyclic-paheko.md](references/artefacts/2026-02-25_05_grille-confrontation-recyclic-paheko.md)`, `[references/artefacts/2026-02-25_08_session-confrontation-recyclic-paheko.md](references/artefacts/2026-02-25_08_session-confrontation-recyclic-paheko.md)`, `[references/recherche/index.md](references/recherche/index.md)`.
- Cette matrice doit couvrir au minimum : sessions de caisse, clôture, écritures, factures émises, factures reçues, justificatifs, bons, adhérents/utilisateurs si concernés, et politique de réconciliation en cas d’échec de sync.
- Livrables clés :
  - une liste des manques API réels avant toute décision plugin ;
  - un contrat de synchronisation et de réconciliation couvrant au minimum : granularité du push, états du flux, idempotence, retry, contrôle des totaux à la clôture, gestion des rejets, reprise après incident, et statut final d’une opération côté Recyclique et côté Paheko.
- Hiérarchie technique à figer dans ce cadrage :
  - API officielle Paheko en priorité ;
  - plugin Paheko minimal uniquement pour exposer ou exécuter ce que l’API ne permet pas proprement ;
  - pas d’écriture directe vers la base Paheko ;
  - usage de SQL limité à l’analyse, au contrôle ou à l’outillage d’administration si explicitement autorisé, jamais comme chemin transactionnel nominal.
- Le contrat doit aussi couvrir la cohérence distribuée et l’exploitation :
  - sémantique de livraison retenue ;
  - ordre des événements `ticket -> clôture -> sync comptable` ;
  - clés d’idempotence et corrélation inter-systèmes ;
  - messages en échec prolongé, stratégie de quarantaine ou équivalent ;
  - versionnement des payloads et compatibilité dans le temps ;
  - autorité de résolution en cas d’écart persistant entre Recyclique et Paheko.
- La décision v2.0 doit confirmer ou réviser explicitement le recours à Redis Streams ou à un mécanisme équivalent pour la résilience de sync.
- Ce travail se fait en deux temps assumés :
  - un contrat socle avant la spec multi-sites, pour figer les règles universelles ;
  - un affinage après la spec multi-sites, pour intégrer le mapping site/caisse/emplacement sans réouvrir les principes de base.

### 5. Reposer l’architecture modulaire sur l’objectif métier réel

- Reprendre le contrat modulaire existant comme base et le réinterpréter pour la v2.0 brownfield.
- Références : `[references/artefacts/2026-02-24_07_design-systeme-modules.md](references/artefacts/2026-02-24_07_design-systeme-modules.md)`, `[references/vision-projet/vision-module-decla-eco-organismes.md](references/vision-projet/vision-module-decla-eco-organismes.md)`, `[references/recherche/2026-02-25_affichage-dynamique-peintre-extension-points_bmad_recherche.md](references/recherche/2026-02-25_affichage-dynamique-peintre-extension-points_bmad_recherche.md)`.
- Définir explicitement les trois premiers niveaux de modularité :
  - modules métier installables/désactivables (`éco-organismes`, futur `hors-ligne`, etc.)
  - points d’extension back (hooks, jobs, sync, exports)
  - points d’extension front (slots, layouts, vues configurables)
- Premier module cible recommandé pour valider l’architecture : `déclaration éco-organismes`.

### 6. Spécifier le socle multi-sites / multi-caisses

- Produire une spec transverse d’isolation métier et technique avant tout gros refactor UI.
- Sources : `[references/ancien-repo/fonctionnalites-actuelles.md](references/ancien-repo/fonctionnalites-actuelles.md)`, `[references/ancien-repo/v1.4.4-liste-endpoints-api.md](references/ancien-repo/v1.4.4-liste-endpoints-api.md)`, `[references/artefacts/2026-02-26_02_track-enterprise-multi-utilisateur.md](references/artefacts/2026-02-26_02_track-enterprise-multi-utilisateur.md)`, PRD archivé `[_bmad-output/archive/2026-03-31_pivot-brownfield-recyclique-1.4.4/planning-artifacts/prd.md](_bmad-output/archive/2026-03-31_pivot-brownfield-recyclique-1.4.4/planning-artifacts/prd.md)`.
- À verrouiller :
  - granularité `ressourcerie -> site -> caisse -> session`
  - règles d’isolation des sessions et tickets
  - habilitations par site/caisse
  - comportement si plusieurs caisses vivent en parallèle sur plusieurs sites
  - impact sur la sync comptable Paheko
- Invariants à couvrir explicitement :
  - identifiants métiers et techniques par site/caisse/session ;
  - numérotation des tickets et horodatage ;
  - permissions opérateur et changements de contexte ;
  - événements de clôture, reprise après incident et cas offline si réintroduits plus tard ;
  - mapping `register_id` / `site_id` Recyclique vers les emplacements Paheko ;
  - risques d’intégrité déjà connus dans la base active, notamment autour de `site_id`, à traiter comme prérequis ou dette bloquante documentée.
- Cette spec doit inclure un schéma cible de déploiement et de rattachement métier :
  - une instance Paheko par ressourcerie ;
  - projection de plusieurs sites et caisses Recyclique dans le modèle Paheko ;
  - entité Paheko de rattachement pour chaque niveau métier ;
  - règle de comportement si une correspondance de site, caisse ou emplacement est absente.

### 7. Définir le framework UI/UX Recyclique sur base Peintre_nano

- Transformer le constat de dette UI actuel en cible produit claire plutôt qu’en simple audit.
- Base : `[references/consolidation-1.4.5/2026-03-23_audit-frontend-architecture-1.4.4.md](references/consolidation-1.4.5/2026-03-23_audit-frontend-architecture-1.4.4.md)`, `[references/consolidation-1.4.5/2026-03-23_synthese-audit-consolidation-1.4.5.md](references/consolidation-1.4.5/2026-03-23_synthese-audit-consolidation-1.4.5.md)`, `[references/artefacts/2026-03-26_01_blueprint-layout-workflow-ecrans.md](references/artefacts/2026-03-26_01_blueprint-layout-workflow-ecrans.md)`.
- Le cadrage doit distinguer deux sous-chantiers :
  - un socle UI transverse repose sur `Peintre_nano` ;
  - une convergence progressive des écrans métier existants.
- Le socle UI doit définir :
  - types d’écrans standards (liste, ticket, détail, workflow, tableau de bord)
  - politique commune d’actions, exports, filtres et feedback utilisateur
  - couche d’accès HTTP/API unifiée
  - règles communes d’auth, notifications, erreurs et chargement
- La convergence doit ensuite organiser la migration progressive des écrans existants vers un socle de composition porté par `Peintre_nano`, sans tenter une refonte totale immédiate.
- `Peintre_nano` n’est plus traité ici comme simple capacité future ; il est désormais un **socle structurel phasé**, dont la mise en oeuvre reste progressive.
- Critères de découplage à expliciter :
  - ce qui peut être livré dans le module `déclaration éco-organismes` sans attendre la convergence UI complète ;
  - ce qui dépend impérativement du socle UI transverse ;
  - ce qui relève du socle multi-caisses comme prérequis dur versus simple contrainte d’alignement pour les autres chantiers.

### 8. Rebaser BMAD sur cette nouvelle ligne

- Les sorties actives ayant été réinitialisées, la suite logique est de régénérer le triptyque BMAD à partir de cette nouvelle décision v2.0 :
  - brief/vision v2.0
  - PRD actif
  - architecture active
- Référence de statut : `[_bmad-output/README.md](_bmad-output/README.md)`.
- Les archives restent des matériaux à citer et non des sources obligatoires d’exécution.
- Critère d’entrée pour relancer BMAD :
  - décision directrice v2.0 validée ;
  - séparation `Recyclique` / `Peintre_nano` validée ;
  - profil `CREOS` documentaire minimal validé ;
  - hiérarchie documentaire clarifiée ;
  - contrat de synchronisation / réconciliation stabilisé ;
  - invariants multi-sites / multi-caisses suffisamment cadrés pour écrire un PRD actif sans ambiguïté majeure ;
  - niveau minimal de cadrage atteint pour la modularité et le socle UI transverse, même si la convergence détaillée des écrans reste ultérieure.
- Cette passe doit aussi mettre à jour les points d’entrée documentaires qui orientent les futurs agents :
  - `[references/index.md](references/index.md)` ;
  - `[references/ou-on-en-est.md](references/ou-on-en-est.md)` ;
  - `[references/migration-paheko/index.md](references/migration-paheko/index.md)` ;
  - `[references/paheko/index.md](references/paheko/index.md)` ;
  - et toute page portant encore un récit incompatible sans bandeau de contexte.
- Les règles de maintenance documentaire doivent rester alignées sur `[references/INSTRUCTIONS-PROJET.md](references/INSTRUCTIONS-PROJET.md)`.

## Ordre recommandé

1. Décision directrice v2.0.
2. Séparation Recyclique / Peintre_nano.
3. Profil CREOS documentaire minimal.
4. Matrice d’intégration Paheko et contrat de synchronisation socle.
5. Spec multi-sites/multi-caisses.
6. Architecture modulaire cible.
7. Affinage du contrat Paheko avec le mapping multi-sites/multi-caisses.
8. Framework UI/UX Recyclique sur base Peintre_nano.
9. Réécriture des artefacts BMAD actifs sur cette base.
10. Découpage en grands chantiers d’exécution.

## Premiers chantiers qui devraient sortir de ce cadrage

- Chantier A : socle d’intégration Paheko API-first et règles de sync/réconciliation.
- Chantier B : socle multi-sites/multi-caisses et isolation des sessions.
- Chantier C : séparation Recyclique / Peintre_nano + profil CREOS minimal.
- Chantier D : framework UI Recyclique sur base Peintre_nano et convergence des écrans existants.
- Chantier E : module `déclaration éco-organismes` comme premier module métier complet.

## Dépendances minimales entre chantiers

- `A` ne part pas sans contrat de synchronisation validé et politique claire `API / plugin / SQL`.
- `B` fixe les invariants d’isolation que `A`, `C`, `D` et `E` doivent respecter, même si son implémentation peut être progressive.
- `C` produit la séparation et le contrat documentaire minimal sur lesquels `D` et `E` devront s’appuyer.
- `D` produit d’abord le socle transverse ; la convergence écran par écran vient après.
- `E` doit pouvoir démarrer sur API et écrans existants si besoin, mais ne doit pas recréer son propre mini-framework UI.

## Risque principal à traiter explicitement

Le dépôt contient encore plusieurs textes qui racontent une stratégie différente de celle retenue ici. Le premier objectif n’est donc pas de produire des stories, mais de créer un document de décision v2.0 qui absorbe ces contradictions, rebase explicitement l’axe UI autour de `Peintre_nano` et `CREOS`, et redonne une source de vérité unique avant de relancer BMAD.