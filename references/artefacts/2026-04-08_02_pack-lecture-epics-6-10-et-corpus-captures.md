# Pack de lecture operationnel — Epics 6 a 10 et corpus de captures

Date : 2026-04-08

## Objectif

Fournir un point d'entree compact pour :

- reprendre le developpement des epics `6` a `10` ;
- pointer vers le tableau ultra operationnel **story par story** quand il faut passer de l'epic a l'execution ;
- relier la documentation normative v2 aux preuves visuelles legacy retrouvees ;
- eviter de traiter les captures comme des maquettes de reference alors qu'elles servent surtout de preuves historiques et de cadrage brownfield.

## Synthese courte

- Le corpus restaure sous `_bmad-output/implementation-artifacts/screenshots/` est **utile**.
- Un **corpus canonique** par domaine a ete cree dans ce meme dossier (`auth/`, `caisse/`, `reception/`, `admin/`) avec seulement les vraies images.
- Cote administration, la reference finale repose sur la serie `11-0` ventilee sous `screenshots/admin/` (`governance`, `platform`, `catalog`) ; les anciens PNG `11-0/admin-*` ne sont plus la source de verite.
- Le corpus comprend `43` captures finales : `22` admin, `9` auth, `6` caisse, `5` reception.
- Il aide surtout a **comprendre le legacy fonctionnel** et a **retrouver des preuves historiques**.
- La source de verite pour la v2 reste : `guide-pilotage-v2.md`, `epics.md`, le PRD, `contracts/openapi/`, `contracts/creos/` et les artefacts de gouvernance / checklist Peintre.
- Pour la caisse (`epic-6`) et la reception (`epic-7`), les captures `11-0/` sont les plus utiles.
- Pour la sync Paheko (`epic-8`), les modules complementaires (`epic-9`) et l'industrialisation (`epic-10`), les captures ne suffisent pas : il faut surtout lire les dossiers `migration-paheko/`, `paheko/`, `consolidation-1.4.5/` et les artefacts d'avril.
- Le document jumeau `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md` sert de raccourci **story par story** pour BMAD et les reprises rapides.

## Cartographie rapide du corpus restaure

### Emplacement canonique

- `_bmad-output/implementation-artifacts/screenshots/README.md`
- `_bmad-output/implementation-artifacts/screenshots/admin/`
- `_bmad-output/implementation-artifacts/screenshots/auth/`
- `_bmad-output/implementation-artifacts/screenshots/caisse/`
- `_bmad-output/implementation-artifacts/screenshots/reception/`

### Role par domaine

- `auth/` : parcours connexion, profil, reset password, PIN ; utile pour le contexte session, step-up et ergonomie d'entree.
- `caisse/` : meilleur appui visuel legacy pour `epic-6`.
- `reception/` : meilleur appui visuel legacy pour `epic-7`.
- `admin/governance/` : gouvernance utilisateurs, sites, postes, sessions ; utile en support des epics `6`, `9` et `10`.
- `admin/platform/` : health, audit log, logs transactionnels, settings, email logs ; surtout utile pour `epic-10`.
- `admin/catalog/` : groupes, permissions, BDD, import legacy, categories ; utile pour `epic-8`, `epic-9` et `epic-10`.

## Ordre de lecture minimal

### Epic 6 — Caisse v2

1. `_bmad-output/planning-artifacts/guide-pilotage-v2.md`
2. `_bmad-output/planning-artifacts/epics.md`
3. `_bmad-output/implementation-artifacts/sprint-status.yaml`
4. `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`
5. `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`
6. `references/artefacts/2026-04-08_01_transverse-shell-coherence-gaps-epic5.md`
7. `references/peintre/2026-04-01_pipeline-presentation-workflow-invariants.md`
8. `references/peintre/2026-04-01_instruction-cursor-contrats-donnees.md`
9. `references/vision-projet/2026-03-31_peintre-nano-concept-architectural.md`
10. `references/consolidation-1.4.5/index.md`
11. `references/ancien-repo/fonctionnalites-actuelles.md`
12. `references/ancien-repo/v1.4.4-liste-endpoints-api.md`

Captures les plus utiles :

- `_bmad-output/implementation-artifacts/screenshots/caisse/11-0__caisse-01-dashboard.png`
- `_bmad-output/implementation-artifacts/screenshots/caisse/11-0__caisse-02-ouverture-session.png`
- `_bmad-output/implementation-artifacts/screenshots/caisse/11-0__caisse-04-saisie-vente.png`
- `_bmad-output/implementation-artifacts/screenshots/caisse/11-0__caisse-05-fermeture-session-sans-transaction.png`
- `_bmad-output/implementation-artifacts/screenshots/caisse/11-0__caisse-06-detail-session-admin.png`

### Epic 7 — Reception v2

1. `epics.md` section Epic 7
2. `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`
3. `references/consolidation-1.4.5/index.md`
4. `references/ancien-repo/fonctionnalites-actuelles.md`
5. `references/migration-paheko/audits/matrice-correspondance-caisse-poids.md`

Captures les plus utiles :

- `_bmad-output/implementation-artifacts/screenshots/reception/11-0__reception-01-accueil-module.png`
- `_bmad-output/implementation-artifacts/screenshots/reception/11-0__reception-02-ouverture-poste-saisie-differee.png`
- `_bmad-output/implementation-artifacts/screenshots/reception/11-0__reception-03-liste-tickets-export-stats.png`
- `_bmad-output/implementation-artifacts/screenshots/reception/11-0__reception-04-detail-ticket-lignes.png`
- `_bmad-output/implementation-artifacts/screenshots/reception/11-0__reception-05-detail-ticket-admin-csv.png`

### Epic 8 — Sync et reconciliation Paheko

1. `epics.md` section Epic 8
2. `references/migration-paheko/index.md`
3. `references/paheko/index.md`
4. `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md`
5. `references/artefacts/2026-04-02_06_matrice-integration-paheko-gaps-api.md`
6. `references/dumps/` si besoin de verification schema locale

Note :

Les captures servent ici surtout de **memoire de contexte brownfield**, pas de preuve de sync.

Captures d'appui utiles :

- `_bmad-output/implementation-artifacts/screenshots/admin/catalog/11-0__admin3-05-import-legacy.png`
- `_bmad-output/implementation-artifacts/screenshots/admin/catalog/11-0__admin3-06-categories.png`
- `_bmad-output/implementation-artifacts/screenshots/admin/governance/11-0__admin1-08-session-manager.png`

### Epic 9 — Modules complementaires

1. `epics.md` section Epic 9
2. `references/vision-projet/vision-module-decla-eco-organismes.md`
3. `references/migration-paheko/categories-decla-eco-organismes.md`
4. `references/paheko/analyse-brownfield-paheko.md`
5. `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`

Captures d'appui utiles :

- `_bmad-output/implementation-artifacts/screenshots/admin/catalog/11-0__admin3-01-groupes.png`
- `_bmad-output/implementation-artifacts/screenshots/admin/catalog/11-0__admin3-06-categories.png`
- `_bmad-output/implementation-artifacts/screenshots/admin/governance/11-0__admin1-02-users-liste.png`
- `_bmad-output/implementation-artifacts/screenshots/auth/11-0__auth-02-profil-page.png`

### Epic 10 — Industrialisation et readiness

1. `epics.md` section Epic 10
2. `guide-pilotage-v2.md`
3. `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`
4. `references/automatisation-bmad/index.md`
5. `references/consolidation-1.4.5/2026-03-23_audit-backend-tests-1.4.4.md`
6. `references/artefacts/2026-04-07_01_validation-stack-locale-peintre-nano.md`

Captures d'appui utiles :

- `_bmad-output/implementation-artifacts/screenshots/admin/platform/11-0__admin2-02-health.png`
- `_bmad-output/implementation-artifacts/screenshots/admin/platform/11-0__admin2-03-audit-log.png`
- `_bmad-output/implementation-artifacts/screenshots/admin/platform/11-0__admin2-04-logs-transactionnels.png`
- `_bmad-output/implementation-artifacts/screenshots/admin/platform/11-0__admin2-06-email-logs.png`

## Place du corpus de captures

### Ce que les captures apportent encore

- Une vision concrete des ecrans legacy utiles aux epics `6` et `7`.
- Une reserve de preuves fonctionnelles pour les zones admin et auth souvent transverses aux epics `8` a `10`.
- Des preuves historiques de comportement corrige ou remedié.
- Un support de comparaison quand un flux v2 doit conserver une information critique visible.

### Ce qu'elles ne doivent pas devenir

- Une source de verite UX pour `Peintre_nano`.
- Une spec de contrat backend.
- Un substitut aux stories BMAD, au PRD ou aux manifests CREOS.

## Cas particulier B52-P3

Le document `recyclique-1.4.4/docs/rapport-validation-b52-p3-captures.md` a ete recontextualise apres confrontation avec le corpus restaure et reclasse.

Conclusion utile pour les epics a venir :

- `sale_date` reste un precedent legacy important pour tout ce qui touche le **journal des ventes**, les **tickets**, les **sessions differees** et la distinction entre **date reelle** et **date d'enregistrement** ;
- la capture la plus utile retrouvee est :
  `_bmad-output/implementation-artifacts/screenshots/caisse/11-0__caisse-06-detail-session-admin.png`
- le rapport historique allait plus loin que les preuves image aujourd'hui rattachees a des fichiers identifies ; il faut donc le lire comme **rapport technique historique recontextualise**.

## Livrables documentaires recommandes

### A conserver

- `_bmad-output/implementation-artifacts/screenshots/README.md`
- `recyclique-1.4.4/docs/rapport-validation-b52-p3-captures.md`
- le present artefact
- `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md`

### A faire plus tard si utile

- un artefact de synthese "captures legacy utiles aux flows critiques";
- un tri plus fin des captures quasi-doublons par campagne `11-0`, `13-2-1`, `15-1`, `15-2`.
