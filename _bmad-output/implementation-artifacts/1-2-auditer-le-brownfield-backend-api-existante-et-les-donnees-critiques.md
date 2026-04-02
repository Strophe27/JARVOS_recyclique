# Story 1.2 : Auditer le brownfield backend, l'API existante et les données critiques

**Clé fichier (obligatoire) :** `1-2-auditer-le-brownfield-backend-api-existante-et-les-donnees-critiques`  
**Epic :** epic-1 — prérequis Piste B (backend, contrats, analyses, Paheko) — **pas** epic-3 Peintre_nano  
**Statut :** review

<!-- Validation optionnelle : exécuter validate-create-story avant dev-story. -->

## Story

En tant que **responsable technique** (Piste B),  
je veux un **audit brownfield ciblé** du backend, de l'API existante et des structures de données critiques,  
afin que la v2 **réutilise ce qui est stable**, **isole ce qui doit être refactoré** avant une implémentation pilotée par les contrats, et **réduise le risque** pour les epics suivants.

## Acceptance Criteria

**Étant donné** que **`recyclique-1.4.4`** reste la baseline brownfield pour la logique métier critique  
**Quand** l'audit est terminé  
**Alors** il identifie les **points d'entrée**, **domaines**, **structures de données** et **flux** pertinents pour : **cashflow**, **réception**, **auth**, **permissions**, **contexte**, et **sync**  
**Et** il distingue **actifs réutilisables**, **zones fragiles** et **inconnues bloquantes**.

**Étant donné** que le travail frontend et contractuel futur ne doit pas reposer sur des internes instables  
**Quand** les constats sont rédigés  
**Alors** ils mettent en avant les **surfaces backend existantes sûres** à exposer ou à adapter **en premier**  
**Et** ils listent les zones où des **DTO** ou **contrats** doivent être **stabilisés** avant une **large migration UI**.

**Étant donné** que l'Epic 1 doit **réduire le risque d'implémentation** plutôt que redire tout le codebase  
**Quand** le rapport d'audit est finalisé  
**Alors** il contient une **liste priorisée de problèmes / opportunités** avec des **conséquences concrètes** pour les **Epics 2, 3, 6, 7 et 8**  
**Et** il évite un **inventaire technique large** sans **valeur décisionnelle**.

### Validation humaine (HITL) — critères de relecture

Le rapport est considéré comme **acceptable** si un pair confirme qu'il couvre bien : entrées, domaines, structures et flux (cashflow, réception, auth, permissions, contexte, sync) ; la distinction réutilisable / fragile / bloquant ; les surfaces sûres en premier ; les DTO/contrats à stabiliser ; la liste priorisée avec lien aux Epics 2, 3, 6, 7, 8 — **sans** inventaire vain.

## Tasks / Subtasks

- [x] Cartographier la baseline **`recyclique-1.4.4`** : où vit le code (clone local `references/ancien-repo/repo/`, consolidation, etc.) et quels documents existants déjà dans le dépôt **évitent de tout ré-inventorier**.
- [x] Produire le **rapport d'audit** (livrable canonique ci-dessous) avec les trois blocs Given/When/Then ci-dessus **explicitement** adressés (sections dédiées ou tableau de traçabilité AC → section).
- [x] Pour chaque grand thème (**cashflow**, **réception**, **auth**, **permissions**, **contexte**, **sync**), documenter au minimum : **points d'entrée** (routes, contrôleurs, services, jobs), **modèle de données / tables** concernées, **flux** nominaux et **dépendances** (Paheko, fichiers, sessions).
- [x] Classer chaque zone ou finding en **réutilisable** / **fragile** / **bloquant (inconnu ou risque majeur)** avec justification courte.
- [x] Section **« Surfaces sûres en premier »** + section **« Contrats / DTO à stabiliser avant grosse migration UI »** — **sans** réécrire ici `contracts/openapi/recyclique-api.yaml` (Story **1.4** ; l'audit **informe** les futurs `operationId` et périmètres).
- [x] Section **« Backlog décisionnel »** : liste **priorisée** (P0/P1/P2 ou équivalent) avec colonne **« Conséquences Epics 2 / 3 / 6 / 7 / 8 »** (une ligne peut citer plusieurs epics).
- [x] Croiser **`contracts/README.md`**, **`contracts/creos/`**, intention **`contracts/openapi/recyclique-api.yaml`** : indiquer **où** l'audit suggère de stabiliser la surface **sans** dupliquer la gouvernance AR19 / hiérarchie OpenAPI → CREOS (rappel : **OpenAPI > ContextEnvelope > NavigationManifest > PageManifest > UserRuntimePrefs** — Story 1.4 pour le formalisme).
- [x] Mettre à jour **`references/artefacts/index.md`** (obligatoire à chaque nouvel artefact daté sous `references/artefacts/`).
- [x] Vérifier **aucune donnée sensible** en clair : `references/dumps/` et secrets — respect **`.gitignore`** ; pas de credentials dans le dépôt.

## Dev Notes

### Périmètre et anti-confusion

- **Livrable principal** : document d'analyse / audit (**pas** de code applicatif v2, **pas** de modifications dans `peintre-nano/` pour cette story).
- **Ne pas** absorber la Story **1.4** : pas de fermeture de gouvernance contractuelle ni rédaction complète de l'OpenAPI draft ici ; l'audit **alimente** les décisions de 1.4 et d'Epic 2.
- **Epic 3** est la Piste A : l'audit doit aider à **Convergence 1** (types / hooks réels) en identifiant les **surfaces API** et **sémantiques de contexte** côté backend — **sans** implémenter le runtime Peintre.

### Intelligence story précédente (1.1)

- Référence Paheko **par défaut** pour le quotidien : **Paheko sous Docker** (service vivant) ; variantes classées optionnel / transitoire / analyse seulement — voir `references/artefacts/2026-04-02_01_surface-travail-v2-mode-reference-paheko.md`.
- L'audit 1.2 peut s'appuyer sur la stack transitoire **1.4.4 + compose** pour comparaisons **sans** en faire la cible v2.
- Pattern livrable 1.1 : artefact daté sous `references/artefacts/` + entrée dans `references/artefacts/index.md`.

### Livrable canonique

- **Fichier principal** : `references/artefacts/YYYY-MM-DD_NN_audit-brownfield-backend-api-donnees-critiques.md`  
  - `NN` = prochain numéro disponible pour la date de livraison (01, 02, …), convention projet.
- **Index** : `references/artefacts/index.md` mis à jour.
- **Matériel de travail / sources** (à citer dans le rapport, pas tout recopier) :
  - `references/ancien-repo/` — clone et analyse brownfield Recyclique 1.4.4 (`repo/` souvent gitignore).
  - `references/consolidation-1.4.5/` — audits, journaux, assainissement baseline 1.4.x.
  - `references/migration-paeco/` — interop, audits caisse / poids, guides (voir `audits/index.md`).
  - `references/paheko/` — frontières API Paheko, analyse brownfield Paheko, endpoints.
  - `_bmad-output/planning-artifacts/epics.md` — Epics 2, 6, 7, 8 pour formulation des conséquences.
  - `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` — Piste B, OpenAPI, Convergences.

### Exigences d'architecture à respecter (guardrails)

- Backend métier principal nommé **`recyclique`** : API, contextes, permissions, sync, historique, audit — aligner le vocabulaire du rapport.
- **Piste B** : audit API 1.4.4, stabilisation données, **préparation** OpenAPI avec `operationId` stables — le rapport doit être **actionnable** pour ces chantiers sans les réaliser dans 1.2.
- **Liaison future manifestes ↔ OpenAPI** : les widgets pourront référencer `data_contract.operation_id` ; signaler les **endpoints** ou **regroupements** qui méritent des **`operationId` stables** en priorité.

### Structure attendue du rapport (suggestion minimale)

1. **Résumé exécutif** (demi-page) : risques top, recommandations top.
2. **Baseline et sources** : où a été lu le code / la doc (chemins).
3. **Cartographie par domaine** : cashflow, réception, auth, permissions, contexte, sync — pour chacun : entrées, données, flux.
4. **Matrice réutilisable / fragile / bloquant**.
5. **Surfaces sûres en premier** vs **DTO/contrats à stabiliser**.
6. **Liste priorisée + conséquences Epics 2, 3, 6, 7, 8**.
7. **Annexes** : liens vers fichiers existants (pas de dump sensible).

### Tests

- **Pas de tests automatisés obligatoires** pour cette story documentaire.
- **Critère de qualité** : relecture HITL selon la section ci-dessus ; traçabilité AC → sections du rapport.

### Project Structure Notes

- Rester aligné avec `guide-pilotage-v2.md` : emplacements canoniques (artefacts, consolidation) ; éviter l'analyse infinie — **livrer un rapport reviewable** à une date donnée.
- Si le code 1.4.4 n'est pas présent localement (`repo/` absent), le rapport doit le **signaler** et s'appuyer sur la **documentation versionnée** (consolidation, migration-paeco, ancien-repo index) + **plan d'accès** au code pour compléter hors dépôt.

## References

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 1, Story 1.2 (~l.514–535)]
- [Source : `_bmad-output/planning-artifacts/guide-pilotage-v2.md` — Pistes A/B, cartographie documentaire, jalons]
- [Source : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` — Piste B, OpenAPI, Convergences 1–3]
- [Source : `contracts/README.md` — OpenAPI / CREOS, `recyclique-api.yaml`]
- [Source : `_bmad-output/implementation-artifacts/1-1-cadrer-la-surface-de-travail-v2-et-le-mode-de-reference-paheko.md` — enchaînement Epic 1]
- [Source : `references/ancien-repo/README.md`, `references/ancien-repo/index.md` — brownfield 1.4.4]
- [Source : `references/consolidation-1.4.5/index.md` — audits / journaux 1.4.x]
- [Source : `references/migration-paeco/index.md`, `references/migration-paeco/audits/index.md`]
- [Source : `references/paheko/index.md` — API et analyse Paheko]
- [Source : `references/INSTRUCTIONS-PROJET.md` — conventions artefacts]

## Dev Agent Record

### Agent Model Used

Sous-agent Task — exécution **bmad-dev-story** (DS), story documentaire ; gates tests ignorés sur instruction parent (`gates_skipped_with_hitl: true`).

### Debug Log References

- Aucun incident bloquant ; clone `references/ancien-repo/repo/` absent dans l’environnement — signalé explicitement dans le rapport (plan d’accès via README ancien-repo).

### Completion Notes List

- Livrable canonique : `references/artefacts/2026-04-02_02_audit-brownfield-backend-api-donnees-critiques.md` (traçabilité AC, six domaines, matrice, surfaces sûres, DTO, backlog P0–P2 × Epics 2/3/6/7/8, § contrats).
- Index artefacts mis à jour ; aucune donnée sensible ajoutée ; pas de changement sous `peintre-nano/`.
- Sprint : `1-2-…` passé à `review` dans `sprint-status.yaml`.

### File List

- `references/artefacts/2026-04-02_02_audit-brownfield-backend-api-donnees-critiques.md` (nouveau)
- `references/artefacts/index.md` (entrée ajoutée)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (statut story 1-2 → review, commentaire last_updated)
- `_bmad-output/implementation-artifacts/1-2-auditer-le-brownfield-backend-api-existante-et-les-donnees-critiques.md` (coche tâches, record, statut)

## Change Log

- 2026-04-02 : Story créée (workflow bmad-create-story / CS) — contexte dev pour audit brownfield 1.2, statut `ready-for-dev`.
- 2026-04-02 : Implémentation DS — rapport d’audit livré, index artefacts, sprint `review`, story `review`.
