---
name: cadrage-v2-global
overview: Cadrer une cible JARVOS Recyclique v2.0 en brownfield à partir de `recyclique-1.4.4`, avec Recyclique comme source métier terrain et Paheko comme source comptable officielle via approche API-first. Le plan doit transformer la matière existante en ligne directrice claire, architecture cible et backlog de chantiers prioritaires.
todos:
  - id: decision-v2
    content: Formaliser la décision directrice v2.0 et fixer les rôles Recyclique vs Paheko
    status: pending
  - id: matrice-paheko
    content: Construire la matrice d’intégration Paheko API-first et identifier les trous d’API réels
    status: pending
  - id: spec-multicaisse
    content: Spécifier l’isolation multi-sites / multi-caisses / sessions comme fondation transverse
    status: pending
  - id: archi-modules-ui
    content: Définir l’architecture modulaire et le framework UI/UX Recyclique
    status: pending
  - id: rebase-bmad
    content: Relancer les artefacts BMAD actifs à partir de ce nouveau cadrage global
    status: pending
isProject: false
---

# Cadrage global v2.0

## Point de départ

- La ligne active est bien une évolution incrémentale depuis `[references/index.md](references/index.md)` et `[references/ou-on-en-est.md](references/ou-on-en-est.md)`, pas une refonte from scratch.
- Le code `recyclique-1.4.4` a été stabilisé mais pas refondu ; il constitue une base brownfield exploitable, avec dette encore présente mais terrain assaini (`[references/artefacts/2026-03-31_01_handoff-nettoyage-stabilisation-recyclique-1.4.4.md](references/artefacts/2026-03-31_01_handoff-nettoyage-stabilisation-recyclique-1.4.4.md)`).
- La doc existante couvre déjà des morceaux de la cible, mais elle contient un conflit majeur à absorber : plusieurs artefacts historiques penchent encore vers `Paheko = backend / vérité principale`, alors que l’arbitrage retenu ici est `Recyclique = source métier terrain` et `Paheko = source comptable officielle`.

## Objectif du cadrage

Produire un nouveau cadre v2.0 qui unifie quatre axes sans réécrire l’historique :

- intégration Paheko API-first pour la comptabilité et les référentiels associés
- architecture modulaire activable/désactivable par domaine métier
- socle multi-sites / multi-caisses réellement isolé
- unification UI/UX et préparation d’un affichage dynamique pilotable

## Plan de travail

### 1. Écrire la décision directrice v2.0

- Créer un document pivot qui remplace les ambiguïtés actuelles et fixe les rôles système.
- Base documentaire à réconcilier : `[references/paheko/analyse-brownfield-paheko.md](references/paheko/analyse-brownfield-paheko.md)`, `[references/paheko/liste-endpoints-api-paheko.md](references/paheko/liste-endpoints-api-paheko.md)`, `[references/artefacts/2026-02-25_04_analyse-plugins-caisse-decisions-push.md](references/artefacts/2026-02-25_04_analyse-plugins-caisse-decisions-push.md)`, `[references/artefacts/2026-02-24_08_decision-architecture-max-paheko.md](references/artefacts/2026-02-24_08_decision-architecture-max-paheko.md)`.
- Sortie attendue : une formulation claire du modèle cible :
  - Recyclique porte les workflows terrain, la caisse, la réception, les modules métier et l’UX.
  - Paheko reste l’autorité comptable officielle et le point d’ancrage compta/adhérents/utilisateurs selon périmètre validé.
  - Intégration prioritaire par API ; plugin Paheko autorisé uniquement comme extension minimale si un besoin métier n’est pas exposé.

### 2. Construire la matrice d’intégration Paheko v2.0

- Établir une matrice `opération métier -> endpoint API Paheko existant / lecture SQL tolérée / plugin minimal requis / hors scope`.
- Sources prioritaires : `[references/migration-paeco/audits/matrice-correspondance-caisse-poids.md](references/migration-paeco/audits/matrice-correspondance-caisse-poids.md)`, `[references/artefacts/2026-02-25_05_grille-confrontation-recyclic-paheko.md](references/artefacts/2026-02-25_05_grille-confrontation-recyclic-paheko.md)`, `[references/artefacts/2026-02-25_08_session-confrontation-recyclic-paheko.md](references/artefacts/2026-02-25_08_session-confrontation-recyclic-paheko.md)`, `[references/recherche/index.md](references/recherche/index.md)`.
- Cette matrice doit couvrir au minimum : sessions de caisse, clôture, écritures, factures émises, factures reçues, justificatifs, bons, adhérents/utilisateurs si concernés, et politique de réconciliation en cas d’échec de sync.
- Livrable clé : une liste des manques API réels avant toute décision plugin.

### 3. Reposer l’architecture modulaire sur l’objectif métier réel

- Reprendre le contrat modulaire existant comme base et le réinterpréter pour la v2.0 brownfield.
- Références : `[references/artefacts/2026-02-24_07_design-systeme-modules.md](references/artefacts/2026-02-24_07_design-systeme-modules.md)`, `[references/vision-projet/vision-module-decla-eco-organismes.md](references/vision-projet/vision-module-decla-eco-organismes.md)`, `[references/recherche/2026-02-25_affichage-dynamique-peintre-extension-points_bmad_recherche.md](references/recherche/2026-02-25_affichage-dynamique-peintre-extension-points_bmad_recherche.md)`.
- Définir explicitement les trois premiers niveaux de modularité :
  - modules métier installables/désactivables (`éco-organismes`, futur `hors-ligne`, etc.)
  - points d’extension back (hooks, jobs, sync, exports)
  - points d’extension front (slots, layouts, vues configurables)
- Premier module cible recommandé pour valider l’architecture : `déclaration éco-organismes`.

### 4. Spécifier le socle multi-sites / multi-caisses

- Produire une spec transverse d’isolation métier et technique avant tout gros refactor UI.
- Sources : `[references/ancien-repo/fonctionnalites-actuelles.md](references/ancien-repo/fonctionnalites-actuelles.md)`, `[references/ancien-repo/v1.4.4-liste-endpoints-api.md](references/ancien-repo/v1.4.4-liste-endpoints-api.md)`, `[references/artefacts/2026-02-26_02_track-enterprise-multi-utilisateur.md](references/artefacts/2026-02-26_02_track-enterprise-multi-utilisateur.md)`, PRD archivé `[_bmad-output/archive/2026-03-31_pivot-brownfield-recyclique-1.4.4/planning-artifacts/prd.md](_bmad-output/archive/2026-03-31_pivot-brownfield-recyclique-1.4.4/planning-artifacts/prd.md)`.
- À verrouiller :
  - granularité `ressourcerie -> site -> caisse -> session`
  - règles d’isolation des sessions et tickets
  - habilitations par site/caisse
  - comportement si plusieurs caisses vivent en parallèle sur plusieurs sites
  - impact sur la sync comptable Paheko

### 5. Définir le framework UI/UX Recyclique

- Transformer le constat de dette UI actuel en cible produit claire plutôt qu’en simple audit.
- Base : `[references/consolidation-1.4.5/2026-03-23_audit-frontend-architecture-1.4.4.md](references/consolidation-1.4.5/2026-03-23_audit-frontend-architecture-1.4.4.md)`, `[references/consolidation-1.4.5/2026-03-23_synthese-audit-consolidation-1.4.5.md](references/consolidation-1.4.5/2026-03-23_synthese-audit-consolidation-1.4.5.md)`, `[references/artefacts/2026-03-26_01_blueprint-layout-workflow-ecrans.md](references/artefacts/2026-03-26_01_blueprint-layout-workflow-ecrans.md)`.
- Le cadrage doit définir :
  - types d’écrans standards (liste, ticket, détail, workflow, tableau de bord)
  - politique commune d’actions, exports, filtres et feedback utilisateur
  - couche d’accès HTTP/API unifiée
  - convergence progressive des écrans existants vers un framework Recyclique unique
- Le sujet `Peintre` doit rester dans le plan comme capacité future encadrée, pas comme dépendance bloquante immédiate.

### 6. Rebaser BMAD sur cette nouvelle ligne

- Les sorties actives ayant été réinitialisées, la suite logique est de régénérer le triptyque BMAD à partir de cette nouvelle décision v2.0 :
  - brief/vision v2.0
  - PRD actif
  - architecture active
- Référence de statut : `[_bmad-output/README.md](_bmad-output/README.md)`.
- Les archives restent des matériaux à citer et non des sources obligatoires d’exécution.

## Ordre recommandé

1. Décision directrice v2.0.
2. Matrice d’intégration Paheko.
3. Spec multi-sites/multi-caisses.
4. Architecture modulaire cible.
5. Framework UI/UX Recyclique.
6. Réécriture des artefacts BMAD actifs sur cette base.
7. Découpage en grands chantiers d’exécution.

## Premiers chantiers qui devraient sortir de ce cadrage

- Chantier A : socle d’intégration Paheko API-first et règles de sync/réconciliation.
- Chantier B : socle multi-sites/multi-caisses et isolation des sessions.
- Chantier C : framework UI Recyclique et convergence des écrans existants.
- Chantier D : module `déclaration éco-organismes` comme premier module métier complet.

## Risque principal à traiter explicitement

Le dépôt contient encore plusieurs textes qui racontent une stratégie différente de celle retenue ici. Le premier objectif n’est donc pas de produire des stories, mais de créer un document de décision v2.0 qui absorbe ces contradictions et redonne une source de vérité unique avant de relancer BMAD.