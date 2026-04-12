# Story 1.1 : Cadrer la surface de travail v2 et le mode de référence Paheko

**Clé fichier (obligatoire) :** `1-1-cadrer-la-surface-de-travail-v2-et-le-mode-de-reference-paheko`  
**Epic :** epic-1 — prérequis Piste B (backend, contrats, Paheko) — **pas** epic-3 Peintre_nano  
**Statut :** done

<!-- Validation optionnelle : exécuter validate-create-story avant dev-story. -->

## Story

En tant que développeuse ou développeur cœur (Piste B),
je veux une surface de travail documentée et validée pour le développement local et les tests,
afin que l'équipe implémente la v2 contre une référence stable, sans ambiguïté entre un runtime Paheko vivant, des services Docker et des artefacts SQLite extraits.

## Acceptance Criteria

**Étant donné** que le projet a besoin d'une base pratique pour le dev, les tests et la validation d'architecture  
**Quand** l'équipe examine les options d'exécution locale autour de Paheko  
**Alors** la story produit une **note de décision** qui indique quel mode est la **référence par défaut** pour le travail quotidien parmi : service Paheko vivant sous Docker, instance locale autonome, ou référence SQLite uniquement récupérée  
**Et** la note explique l'usage prévu de chaque option pour : développement, tests d'intégration, rétro-ingénierie et dépannage.

**Étant donné** un mode de référence Paheko choisi  
**Quand** la surface de travail est documentée  
**Alors** les **services requis**, la **séquence minimale de démarrage**, les **sources de données attendues** et la **propriété des données de test** sont listés explicitement  
**Et** le document précise ce qui est **dans le périmètre** pour l'implémentation locale **avant** une sync e2e complète avec Paheko.

**Étant donné** que le projet nécessite des sessions de programmation et des tests reproductibles  
**Quand** la surface de travail est approuvée  
**Alors** elle définit un **chemin par défaut** sur lequel les stories suivantes peuvent s'appuyer **sans rouvrir** la décision d'environnement  
**Et** toute variante restante est marquée **optionnelle**, **transitoire** ou **analyse seulement**.

## Tasks / Subtasks

- [x] Rédiger la **note de décision** (voir section Livrable canonique) en intégrant les trois blocs Given/When/Then ci-dessus.
- [x] Croiser les sources listées en **Références obligatoires** ; citer chemins et sections pertinentes dans la note.
- [x] Verrouiller explicitement le **mode par défaut** et classifier chaque alternative (optionnel / transitoire / analyse seulement).
- [x] Lister **services**, **ordre de démarrage minimal**, **sources de données**, **propriété des données de test**, **hors périmètre** (dont absence de sync e2e complète à ce stade si applicable).
- [x] Ajouter l'entrée dans `references/artefacts/index.md` (convention projet : obligatoire à chaque nouvel artefact).
- [x] Vérifier qu'aucun secret ni dump sensible n'est commité (`references/dumps/` souvent gitignore ; pas de credentials dans le dépôt).

## Dev Notes

### Périmètre et anti-confusion

- **Piste B — Epic 1** : prérequis backend, contrats, analyses, intégration Paheko — **pas** la Piste A **Peintre_nano** (Epic 3). Ne pas livrer de code UI ni de stories Peintre dans cette story.
- **Hors scope explicite pour 1.1** : livraison ou figement de `contracts/openapi/recyclique-api.yaml` (Story **1.4**), schémas CREOS détaillés, implémentation sync réelle (Epic 8). La note peut **mentionner** la gouvernance future sans la réaliser.
- **Jalons contractuels (rappel pour stories ultérieures)** : hiérarchie de vérité **OpenAPI > ContextEnvelope > NavigationManifest > PageManifest > UserRuntimePrefs** ; writer canonique OpenAPI = **Recyclique** ; CREOS sous `contracts/creos/` — pas de seconde source de vérité côté frontend généré. [Source : brief Epic 1 / epics.md Story 1.4]

### Livrable canonique

- **Fichier principal** : `references/artefacts/2026-04-02_NN_surface-travail-v2-mode-reference-paheko.md`  
  - Remplacer `NN` par le prochain numéro disponible dans `references/artefacts/` (01, 02, …) pour ce jour, ou ajuster la date si la livraison est un autre jour calendaire.
- **Index** : mettre à jour `references/artefacts/index.md` avec titre, date et lien relatif vers le nouveau fichier.

Contenu minimal attendu dans la note :

1. **Décision** : un seul mode **par défaut** pour le travail quotidien (Docker Paheko / instance locale standalone / SQLite récupéré).
2. **Tableau ou liste** : chaque mode → usage (dev, intégration, retro-ingénierie, troubleshooting) + statut (défaut / optionnel / transitoire / analyse seulement).
3. **Opérationnel** : prérequis machine, services, ordre de démarrage, où vivent les données, qui crée / possède les jeux de test, ce qui est volontairement hors scope avant sync e2e complète.
4. **Verrou** : phrase explicite du type « Les stories Epic 1 suivantes présument [mode X] sauf mention contraire documentée. »

### Structure repo et frontières

- Stack cible inclut Paheko ; intégration Paheko **côté backend** ; `references/paheko/repo/` peut rester hors cœur versionné (gitignore) — la doc doit indiquer comment l'équipe obtient le code / l'image sans supposer un chemin magique non documenté. [Source : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`]
- **Tampon local** : `references/paheko/index.md` mentionne une procédure Docker sous `dev-tampon/paheko/` (dossier souvent gitignore). Si ce chemin n'existe pas sur une machine, la note doit le signaler et proposer la voie par défaut retenue (ex. Docker officiel, autre).

### Données et sécurité

- `references/dumps/` : usage **analyse** ; ne pas committer de secrets ; respecter `.gitignore` du dépôt.
- Schéma BDD de référence possible : `references/dumps/schema-paheko-dev.md` (mentionné dans `references/paheko/index.md`) — à citer si pertinent pour la rétro-ingénierie, pas comme obligation de livrer un nouveau dump dans 1.1.

### Tests

- **Pas de tests automatisés obligatoires** pour cette story documentaire.
- **Critère de relecture** : un pair peut reproduire le **chemin par défaut** à partir de la seule note + liens vers les procédures existantes.

### Project Structure Notes

- Alignement avec `contracts/README.md` pour ne pas contredire l'emplacement des contrats ; pas de duplication de la gouvernance OpenAPI/CREOS ici (renvoi vers Story 1.4).
- Pilotage multi-pistes : `guide-pilotage-v2.md` — rappel que le parallèle A/B reste sain si la Piste B produit des artefacts qui ancrent le contrat.

## References

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 1, Story 1.1 (lignes ~491–512)]
- [Source : `_bmad-output/planning-artifacts/guide-pilotage-v2.md` — Pistes A/B, jalons, cartographie documentaire]
- [Source : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` — Piste B, Convergences, docker-compose, `contracts/openapi/recyclique-api.yaml`]
- [Source : `contracts/README.md` — rôles OpenAPI / CREOS]
- [Source : `references/paheko/index.md` — analyse brownfield, endpoints, schéma, `dev-tampon/paheko/`]
- [Source : `references/migration-paheko/` — index du dossier si contexte brownfield nécessaire]
- [Source : `references/vision-projet/` — décision directrice v2 si besoin de cadrage produit]
- [Source : `references/consolidation-1.4.5/` — baseline 1.4.x si lien avec brownfield]
- [Source : `references/INSTRUCTIONS-PROJET.md` — conventions `references/artefacts/` et index]

## Dev Agent Record

### Agent Model Used

Composer (agent Task BMAD / dev-story).

### Debug Log References

Aucun — story documentaire, pas d'exécution de tests npm.

### Completion Notes List

- Note de décision livrée : `references/artefacts/2026-04-02_01_surface-travail-v2-mode-reference-paheko.md` (NN=01 pour 2026-04-02).
- Mode par défaut verrouillé : **Paheko sous Docker** (service vivant) ; alternatives classées optionnel / transitoire / analyse seulement.
- Aucun secret ni nouveau dump ajouté ; vérification par absence de modification de `references/dumps/`.

### File List

- `references/artefacts/2026-04-02_01_surface-travail-v2-mode-reference-paheko.md` (créé)
- `references/artefacts/index.md` (modifié)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modifié : story 1-1 → `done`)
- `_bmad-output/implementation-artifacts/1-1-cadrer-la-surface-de-travail-v2-et-le-mode-de-reference-paheko.md` (modifié : tâches, statut, Dev Agent Record, Change Log)

## Change Log

- 2026-04-02 : Implémentation story 1.1 — artefact surface Paheko + index artefacts + sprint-status `review`.
- 2026-04-02 : Story Runner — CR PASS ; sprint-status `done` ; typo « déclarées » dans l'artefact (§3.2 tableau).

---

**Note de complétion (create-story)** : analyse contexte Epic 1 — story 1.1 documentaire ; garde-fous Piste B / hors Peintre_nano ; livrable artefact daté sous `references/artefacts/` avec index à jour.
