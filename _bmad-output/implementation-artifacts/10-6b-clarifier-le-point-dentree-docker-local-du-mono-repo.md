# Story 10.6b : Clarifier le point d'entree Docker local du mono-repo

**Clé fichier (obligatoire) :** `10-6b-clarifier-le-point-dentree-docker-local-du-mono-repo`  
**Epic :** epic-10  
**Statut :** done

<!-- Note : validation optionnelle — exécuter validate-create-story avant dev-story. -->

## Story

En tant que **développeur ou futur déployeur**,  
je veux qu'il y ait **un seul point d'entrée clair** pour lancer la stack Docker locale du mono-repo,  
afin d'éviter la confusion entre **`recyclique/api`** (backend vivant), le **frontend v2 `peintre-nano/`**, et **`recyclique-1.4.4/docker-compose.yml`** (raccourci legacy de compatibilité).

## Acceptance Criteria

Alignement avec `epics.md` (Story 10.6b) — formulation de référence :

1. **Backend vivant vs orchestration** — Étant donné que le backend vivant est sous `recyclique/api`, quand la story est terminée, le dépôt indique clairement **où** lancer Docker en local, et ce point d'entrée est cohérent avec l'état actuel ou explicitement documenté comme transitoire / compatibilité.

2. **Une voie documentée** — Étant donné la confusion possible entre chemin canonique backend et emplacement legacy du compose, quand la clarification est faite, le projet a **un** chemin de démarrage Docker local documenté ; les anciens chemins sont supprimés, renommés ou marqués **historique / compatibilité uniquement**.

3. **Périmètre** — Étant donné que c'est une story clarté / opérabilité (pas feature métier), quand elle est implémentée, les README / docs de démarrage / références compose sont à jour, **sans** rouvrir le fond fonctionnel livré en Epic 2.

*(Critères opérationnels détaillés ci-dessous — même barème qu'Epic.)*

### AC opérationnels (BDD)

**AC 1 — Point d'entrée Docker explicite**

**Étant donné** que le backend vivant est sous **`recyclique/api`**  
**Quand** cette story est terminée  
**Alors** le dépôt indique clairement **où** lancer Docker en local  
**Et** ce point d'entrée est cohérent avec l'état actuel du projet ou explicitement documenté comme transitoire

**AC 2 — Fin de l'ambiguïté humaine**

**Étant donné** qu'un humain peut encore hésiter entre plusieurs chemins  
**Quand** la clarification est faite  
**Alors** les anciens chemins ou points d'entrée ambigus sont soit supprimés, soit renommés, soit marqués comme **historique / compatibilité**  
**Et** un nouveau venu comprend en moins d'une minute quoi lancer

**AC 3 — Mise à jour documentaire minimale**

**Étant donné** que cette story touche surtout l'ergonomie de travail et la doc technique  
**Quand** elle est implémentée  
**Alors** les README / docs de démarrage / références compose sont mis à jour  
**Et** la story ne rouvre pas le fond fonctionnel d'Epic 2

## Tasks / Subtasks

- [x] Décider où vit le point d'entrée Docker local (documenter la décision en README racine ou `infra/`) — AC : #1, #2  
  - [x] Option A : racine mono-repo (`docker-compose.yml` ou lien explicite)  
  - [ ] Option B : `infra/compose/` (ou sous-dossier `dev/`) avec doc pointant depuis la racine  
  - [ ] Option C : maintien sous `recyclique-1.4.4/` avec bannière + renommage explicite (ex. `docker-compose.local-legacy.yml`) si l'équipe choisit de **ne pas** déplacer les fichiers tout de suite  
- [x] Mettre à jour le ou les `docker-compose*.yml` et chemins relatifs (`build.context`, volumes) selon la décision — AC : #1  
- [x] Mettre à jour `README.md` racine, `recyclique/README.md`, `recyclique-1.4.4/README.md`, `recyclique/api/README.md` si touché, et `_bmad-output/planning-artifacts/guide-pilotage-v2.md` (ligne stack Docker) — AC : #2, #3  
- [x] Vérifier qu'un `docker compose up` (ou équivalent documenté) depuis le point d'entrée choisi démarre encore la stack attendue — AC : #1, #3  
- [x] Réaligner le frontend Docker **dev local** sur `peintre-nano/` tout en gardant le modèle local sûr existant (`http://localhost:4444` + proxy Vite `/api`) — AC : #1, #2  
- [x] Clarifier la frontière : **dev local = `peintre-nano`**, **staging/prod = legacy transitoire** tant qu'une story dédiée n'a pas migré les pipelines — AC : #2, #3  
- [x] Rendre la **coexistence locale explicite** : `frontend` = `peintre-nano` (`4444`), `frontend-legacy` = ancien frontend (`4445`), les deux contre la même API — AC : #2, #3  

## Dev Notes

### Contexte actuel (état dépôt)

- **Backend vivant** : `recyclique/api/` (`pyproject.toml`, `src/recyclic_api/`, tests, Alembic).  
- **Compose local actuel** : point d'entrée canonique à la racine du mono-repo ; service `frontend` réaligné sur **`peintre-nano/`** en développement local, tandis que `recyclique-1.4.4/docker-compose.yml` reste un include de compatibilité. Les variantes `*.staging.yml` / `*.prod.yml` sous `recyclique-1.4.4/` restent transitoirement legacy.  
- **Écart cible** : `project-structure-boundaries.md` montre des `docker-compose*.yml` à la **racine** du mono-repo et une arborescence `infra/compose/` — **non encore réalisée** dans le dépôt ; cette story doit trancher ou documenter explicitement l'écart.  
- **Origine** : `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-07-docker-compose-location.md` (Correct Course — Option 2 : petite story dédiée, sans rouvrir Epic 2).

### Exigences techniques (guardrails)

- Ne **pas** déplacer ni renommer le package `recyclique/api` : périmètre = orchestration + documentation + chemins compose.  
- Conserver **secrets hors dépôt** : tout changement de variables ou de noms de fichiers `.env` doit refléter `.env.example` si pertinent.  
- Si déplacement des YAML : mettre à jour les références dans scripts, CI, et docs qui citent `recyclique-1.4.4/docker-compose`.  
- Rester sur le **même moteur** Docker Compose que le dépôt utilise déjà (fichiers au format services/volumes actuels).

### Conformité architecture

- [Source : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` — « Complete Project Directory Structure », note implémentation réelle `recyclique/api/`, section `infra/`]  
- Paheko / Postgres / Redis : restent des services de stack ; toute réorganisation compose doit garder la cohérence des noms de services et réseaux avec l'existant pour limiter les régressions.

### Chemins et fichiers à traiter (non exhaustif)

- `recyclique-1.4.4/docker-compose.yml` (+ variantes staging/prod/backup)  
- Racine du mono-repo : absence actuelle de `docker-compose.yml` — à créer ou à documenter explicitement.  
- `README.md` (racine), `recyclique/README.md`, `recyclique-1.4.4/README.md`  
- `_bmad-output/planning-artifacts/guide-pilotage-v2.md` (tableau chemins tests / Docker)  
- Éventuellement `doc/` ou guides d'installation s'ils citent l'ancien chemin uniquement.

### Tests et validation

- Smoke manuel : depuis le répertoire documenté comme point d'entrée, commande documentée (ex. `docker compose up` avec profil si besoin) ; vérifier que l'API monte et que les healthchecks postgres/redis restent valides.  
- Couverture automatique minimale attendue : `docker compose config` + smoke pytest infra du point d'entrée + CI rapide frontend sur `peintre-nano` si le chemin dev officiel change.

### Intelligence story 2.2b (continuité)

- La story **2.2b** a déjà migré le code vers `recyclique/api` et a laissé le compose sous `recyclique-1.4.4` avec `context: ../recyclique/api`.  
- **Ne pas** refaire une migration backend : 10.6b complète uniquement la **clarté du point d'entrée** orchestration.  
- Gates pytest backend restent depuis `recyclique/api` (inchangé).

### Pistes Git récentes (contexte)

- Derniers commits sur la ligne livrée : fin Epic 2, révisions stories 2.x — pas de modification récente spécifique à Docker dans l'échantillon ; la story est surtout doc/infra.

### References

- `_bmad-output/planning-artifacts/epics.md` — Story 10.6b  
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-07-docker-compose-location.md`  
- `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`  
- `_bmad-output/planning-artifacts/guide-pilotage-v2.md`  
- `_bmad-output/implementation-artifacts/2-2b-migrer-le-backend-vers-recyclique-racine-mono-repo.md`  

## Dev Agent Record

### Agent Model Used

Composer (agent Task — phase DS bmad-dev-story)

### Debug Log References

- `docker compose config --quiet` : OK depuis la racine du repo et depuis `recyclique-1.4.4/` (include).

### Completion Notes List

- **Décision** : Option A — `docker-compose.yml` à la racine du mono-repo ; chemins `build` / volumes en `./recyclique/api`, `./peintre-nano`, et artefacts brownfield conservés sous `./recyclique-1.4.4/...` quand encore utiles.
- **Compatibilité** : `recyclique-1.4.4/docker-compose.yml` remplacé par un `include` vers le compose racine + bannière « historique / compatibilité ».
- **Frontend dev** : service `frontend` du compose racine réaligné sur `peintre-nano/` avec `Dockerfile.dev`, `.dockerignore`, port navigateur `http://localhost:4444` conservé et proxy Vite `/api` vers `api`.
- **Coexistence transitoire** : service `frontend-legacy` ajouté au compose racine pour `recyclique-1.4.4/frontend` sur `http://localhost:4445` ; objectif = comparaison / accès aux écrans non encore migrés, sans remettre en cause la cible v2.
- **Documentation** : README racine créé ; `recyclique/README.md`, `recyclique-1.4.4/README.md`, `recyclique/api/README.md`, `guide-pilotage-v2.md`, `epics.md` (note Epic 2), `project-structure-boundaries.md` mis à jour.
- **CI** : job rapide GitHub Actions réaligné sur `peintre-nano`; déploiement production explicitement laissé sur le frontend legacy à titre transitoire.
- **Smoke initial** : validation par `docker compose config` et tests infra.
- **Validation locale complète (2026-04-07)** : stack réellement démarrée avec un **nouveau projet Compose** / volume PostgreSQL neuf (`jarvos_recyclique_pg15fresh`) ; frontend `http://localhost:4444` OK, API + Swagger OK, healthcheck `http://localhost:8000/health` OK.
- **Convention de coexistence** : `FRONTEND_URL` reste `http://localhost:4444` pour la cible v2 ; CORS locaux élargis à `4444` et `4445` pour permettre l'usage parallèle des deux frontends.
- **Piège local identifié** : un ancien volume Docker PostgreSQL initialisé en **16** faisait échouer le compose officiel en **15** ; la référence du dépôt reste **PG15**. Voir `references/artefacts/2026-04-07_01_validation-stack-locale-peintre-nano.md`.

### File List

- `docker-compose.yml` (nouveau, racine)
- `recyclique-1.4.4/docker-compose.yml` (remplacé — include + commentaires)
- `README.md` (nouveau, racine)
- `recyclique/README.md`
- `recyclique-1.4.4/README.md`
- `recyclique/api/README.md`
- `peintre-nano/Dockerfile.dev`
- `peintre-nano/.dockerignore`
- `peintre-nano/vite.config.ts`
- `.github/workflows/deploy.yaml`
- `_bmad-output/planning-artifacts/guide-pilotage-v2.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/10-6b-clarifier-le-point-dentree-docker-local-du-mono-repo.md`
