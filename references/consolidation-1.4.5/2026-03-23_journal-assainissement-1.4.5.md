# Journal d'execution — assainissement 1.4.5

**Date de depart:** 2026-03-23  
**Perimetre:** base active `recyclique-1.4.4/`  
**Objectif:** garder une trace chronologique simple des audits, lots executes, validations et decisions de lot.

---

## Phase 0 — Cadrage et audit brownfield

### 2026-03-23 — Mise en place du referentiel durable
- Creation du dossier `references/consolidation-1.4.5/`.
- Creation de `references/consolidation-1.4.5/index.md`.
- Ajout du sous-dossier `consolidation-1.4.5/` dans `references/index.md`.

### 2026-03-23 — Audit brownfield backend + frontend
- Production des rapports thematiques :
  - `2026-03-23_audit-backend-architecture-1.4.4.md`
  - `2026-03-23_audit-backend-data-1.4.4.md`
  - `2026-03-23_audit-backend-config-ops-1.4.4.md`
  - `2026-03-23_audit-backend-tests-1.4.4.md`
  - `2026-03-23_audit-frontend-architecture-1.4.4.md`
  - `2026-03-23_audit-frontend-coherence-technique-1.4.4.md`
  - `2026-03-23_audit-frontend-auth-permissions-1.4.4.md`
- Production de la synthese :
  - `2026-03-23_synthese-audit-consolidation-1.4.5.md`
- Production du backlog priorise :
  - `2026-03-23_backlog-assainissement-1.4.5.md`

### 2026-03-23 — Decision de programme
- Adoption d'un plan global d'assainissement en vagues et petits lots.
- Ordre retenu :
  - Vague 1 : verite runtime / dependances / migrations
  - Vague 2 : structure backend
  - Vague 3 : fiabilite tests backend
  - Vague 4 : reunification frontend

---

## Phase 1 — Lots executes

## Lot 1A — Verite runtime DB / version / README

**Statut:** ferme  
**Theme:** unifier la verite de lancement local et runtime

### Actions
- Alignement de `POSTGRES_DB` entre `docker-compose.yml`, l'app et les migrations.
- Ajout / alignement de `APP_VERSION` dans la config runtime.
- Realignement du `README.md` de `recyclique-1.4.4/` sur :
  - `docker compose`
  - ports reels
  - usage de `api-migrations`
  - prefixe API local
- Garde-fou dans `api/migrations/env.py` pour ne prendre `TEST_DATABASE_URL` qu'en contexte test.
- Healthcheck Postgres aligne sur la vraie base via `pg_isready -U ... -d ...`.
- Corrections de fin de lot sur les health checks :
  - retour `503` en cas d'etat unhealthy
  - fermeture correcte de session DB sur `/health`

### Fichiers touches
- `recyclique-1.4.4/docker-compose.yml`
- `recyclique-1.4.4/api/migrations/env.py`
- `recyclique-1.4.4/api/src/recyclic_api/core/config.py`
- `recyclique-1.4.4/api/src/recyclic_api/main.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/health.py`
- `recyclique-1.4.4/README.md`

### Validation
- Verification compose legere.
- Compilation Python legere.
- QA en plusieurs passes jusqu'a fermeture propre du lot.

### Resultat
- Lot ferme.
- Base runtime plus coherente.
- Sondes health en echec renvoient bien un code HTTP d'echec.

---

## Lot 1B — Dependances backend / Docker / Alembic packaging

**Statut:** ferme  
**Theme:** clarifier runtime, dev et packaging

### Actions
- Alignement de `pyproject.toml` et `requirements.txt` sur la stack runtime.
- Clarification du role de `requirements-dev.txt` et de l'extra `[dev]`.
- Introduction de `INSTALL_DEV` dans `Dockerfile` pour distinguer plus clairement runtime et outils de dev.
- Suppression du `--reload` du `CMD` par defaut de l'image ; le reload reste porte par `docker-compose.yml`.
- Clarification de `Dockerfile.migrations` et `alembic.ini`.
- Creation de `recyclique-1.4.4/api/README.md`.
- Suppression de la dependance Redis dans le demarrage de `api-migrations` tout en gardant `REDIS_URL` pour satisfaire le chargement de config.

### Fichiers touches
- `recyclique-1.4.4/api/pyproject.toml`
- `recyclique-1.4.4/api/requirements.txt`
- `recyclique-1.4.4/api/requirements-dev.txt`
- `recyclique-1.4.4/api/Dockerfile`
- `recyclique-1.4.4/api/Dockerfile.migrations`
- `recyclique-1.4.4/api/alembic.ini`
- `recyclique-1.4.4/api/README.md`
- `recyclique-1.4.4/docker-compose.yml`

### Validation
- Verification TOML.
- Verification Compose legere.
- QA jusqu'a fermeture propre du lot.

### Resultat
- Lot ferme.
- Packaging backend plus lisible.
- Frontiere dev / runtime clarifiee sans gros refactor.

---

## Lot 1C — Exports modeles / chaine Alembic / migration email manquante

**Statut:** ferme  
**Theme:** remettre d'equerre la source de verite schema

### Actions
- Ajout d'exports modeles manquants dans `models/__init__.py` :
  - `Destination`
  - `EmailEvent`
  - `EmailEventType`
  - `EmailStatusModel`
- Ajout du gabarit `migrations/script.py.mako`.
- Documentation courte dans `api/README.md` : schema = migrations versionnees, prudence avec `stamp` / autogenerate.
- Verification de la chaine Alembic existante : le depot possedait deja un historique de revisions.
- Ajout d'une migration ciblee pour `email_events` et `email_statuses` :
  - `a7b3c9d2014f_add_email_events_and_email_statuses.py`

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/models/__init__.py`
- `recyclique-1.4.4/api/src/recyclic_api/models/email_event.py` (contexte fonctionnel, pas de refactor metier)
- `recyclique-1.4.4/api/migrations/script.py.mako`
- `recyclique-1.4.4/api/migrations/versions/a7b3c9d2014f_add_email_events_and_email_statuses.py`
- `recyclique-1.4.4/api/README.md`

### Validation
- Verification `alembic heads`.
- Verification de branchement de la nouvelle revision.
- QA dediee : aucune casse de chaine remontee.

### Resultat
- Lot ferme.
- Le schema des tables email du webhook est maintenant couvre par migration.
- La chaine Alembic reste exploitable avec une tete unique.

---

## Lot 2A — Micro-lot health backend

**Statut:** ferme  
**Theme:** fiabiliser le health racine sans gros refactor backend

### Actions
- Alignement du health racine `GET /health` sur la verification DB du health v1 avec `SELECT 1`.
- Conservation du comportement `200` / `503`.
- Suppression de la fuite de `str(e)` dans les corps `503`.
- Ajout de logs cote serveur pour garder le diagnostic sans l'exposer au client.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/main.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/health.py`

### Validation
- `tests/test_infrastructure.py` repasse.
- QA dediee de cloture.

### Resultat
- Lot ferme.
- Health racine plus fiable pour les sondes ops.
- Dette plus large sur transactions / `HTTPException` dans les services encore ouverte pour des lots suivants.

---

## Lot 2B — Extraction ciblee de `/admin/users/statuses`

**Statut:** ferme  
**Theme:** alleger `admin.py` sans refactor large

### Actions
- Extraction de la logique de construction de la reponse `GET /admin/users/statuses` hors de la route.
- Creation d'une methode dediee dans `ActivityService` pour construire `UserStatusesResponse`.
- Conservation du contrat API existant :
  - meme route
  - meme `response_model`
  - meme structure de reponse
- La route `admin.py` garde uniquement :
  - dependances FastAPI
  - log d'acces admin
  - appel au service
  - gestion d'erreur HTTP existante

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin.py`
- `recyclique-1.4.4/api/src/recyclic_api/services/activity_service.py`

### Validation
- Verification syntaxique / lints.
- QA dediee de cloture.

### Resultat
- Lot ferme.
- `admin.py` est un peu moins monolithique sur la zone activite / presence utilisateur.
- Dette legere restante acceptee pour l'instant :
  - couplage du service avec les schemas de reponse admin
  - semantique du champ `minutes_since_login` a clarifier plus tard si besoin

---

## Lot 2C — Extraction ciblee de `/admin/sessions/metrics`

**Statut:** ferme  
**Theme:** poursuivre l'allegement de `admin.py` sans toucher aux zones les plus sensibles

### Actions
- Extraction de la route `GET /admin/sessions/metrics` dans un module endpoint dedie.
- Conservation du meme chemin final, du meme parametre `hours` et du meme comportement d'erreur.
- Enregistrement du nouveau router sous le meme prefixe `/admin`.
- Nettoyage final du handler pour retirer une dependance DB inutile.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_session_metrics.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/__init__.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/api.py`

### Validation
- Verification syntaxique / lints.
- QA dediee : pas de doublon de route, pas de collision de chemin, lot fermable proprement.

### Resultat
- Lot ferme.
- `admin.py` est encore un peu allege.
- Dette distincte relevee par QA dans `admin.py` sur la journalisation avant/apres des groupes utilisateur, a traiter dans un lot separe.

---

## Lot 2D — Correction de la traçabilite des groupes utilisateur

**Statut:** ferme  
**Theme:** corriger une dette QA locale dans `admin.py`

### Actions
- Correction de la journalisation de `PUT /admin/users/{user_id}/groups`.
- Capture de l'etat des groupes **avant** mutation.
- Conservation du format existant `groups=[...]` dans `log_role_change`.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin.py`

### Validation
- Verification syntaxique / lints.
- QA dediee de cloture.

### Resultat
- Lot ferme.
- Le journal audit avant/apres des groupes n'est plus faux dans cette route.
- Dette generale restante :
  - `log_role_change` reste un helper de role reutilise pour d'autres changements admin
  - la sémantique fine de l'audit pourra etre reprise dans un lot separe si necessaire

---

## Lot 3A — Decollision des utilisateurs inactifs dans les tests auth

**Statut:** ferme  
**Theme:** reduire une cause evidente de flakiness dans les tests backend

### Actions
- Remplacement du username fixe `inactive_user` par une valeur unique par test dans :
  - `test_auth_login_endpoint.py`
  - `test_auth_logging.py`
- Conservation des assertions fonctionnelles et de logging.

### Fichiers touches
- `recyclique-1.4.4/api/tests/test_auth_login_endpoint.py`
- `recyclique-1.4.4/api/tests/test_auth_logging.py`

### Validation
- Sous-ensemble cible relance :
  - `tests/test_auth_login_endpoint.py`
  - `tests/test_auth_logging.py`
- QA dediee de cloture.

### Resultat
- Lot ferme.
- La collision la plus evidente sur `inactive_user` est supprimee.
- Dette restante acceptee :
  - d'autres usernames fixes peuvent encore exister
  - l'isolation transactionnelle globale des tests reste a traiter dans un lot separe

---

## Lot 3B — Decollision complementaire des usernames fixes auth

**Statut:** ferme  
**Theme:** poursuivre la stabilisation du petit sous-ensemble de tests backend

### Actions
- Remplacement des usernames fixes encore presents dans les tests auth qui creent de vrais utilisateurs en base.
- Unicite etendue aussi aux emails associes quand necessaire.
- Perimetre volontairement limite aux fichiers auth du lot minimal.

### Fichiers touches
- `recyclique-1.4.4/api/tests/test_auth_login_endpoint.py`
- `recyclique-1.4.4/api/tests/test_auth_logging.py`

### Validation
- Relance ciblee :
  - `tests/test_auth_login_endpoint.py`
  - `tests/test_auth_logging.py`
- QA dediee de cloture.

### Resultat
- Lot ferme.
- Les collisions les plus evidentes de usernames fixes dans le sous-ensemble auth sont maintenant reduites.
- Dette restante acceptee :
  - imports / hygiene mineure dans les fichiers de tests
  - chantier plus large d'isolation transactionnelle toujours ouvert

---

## Lot 3C — Source de verite pytest et doc du lot minimal

**Statut:** ferme  
**Theme:** cadrer la configuration de test sans toucher encore a l'isolation

### Actions
- Ajout d'une configuration pytest canonique dans `pyproject.toml`.
- Enregistrement du marker `no_db`.
- Realignement de `tests/README.md` sur `pyproject.toml` comme source de verite.
- Suppression de la duplication des options pytest dans `run_tests.sh`.
- Ajustement du `Dockerfile` pour copier `pyproject.toml` au lieu d'un `pytest.ini` inexistant.

### Fichiers touches
- `recyclique-1.4.4/api/pyproject.toml`
- `recyclique-1.4.4/api/tests/README.md`
- `recyclique-1.4.4/api/run_tests.sh`
- `recyclique-1.4.4/api/Dockerfile`

### Validation
- Collecte pytest sur le lot minimal.
- QA dediee de cloture.

### Resultat
- Lot ferme.
- Une seule source de verite pytest est maintenant explicite.
- Dette restante acceptee :
  - details cosmetiques dans la doc tests
  - chantier transactionnel / isolation toujours a traiter a part

---

## Lot 3D — Decollision du fichier middleware admin inactif

**Statut:** ferme  
**Theme:** enlever une autre source locale de collision dans les tests backend

### Actions
- Remplacement des usernames fixes dans `test_auth_inactive_user_middleware.py` par des valeurs uniques.
- Realignement du fichier sur `settings.API_V1_STR` au lieu d'un prefixe `/api/v1` code en dur.

### Fichiers touches
- `recyclique-1.4.4/api/tests/test_auth_inactive_user_middleware.py`

### Validation
- Relance du fichier de test cible.
- QA dediee de cloture.

### Resultat
- Lot ferme.
- Le fichier de test est aligne sur la config API reelle et moins sensible aux collisions de donnees.
- Reserve faible acceptee :
  - le fichier valide surtout `require_admin_role` et pas toute la couche auth/caching
  - une assertion de succes pourrait etre resserree plus tard

---

## Lot 3E — Clarification du contrat de fixture backend

**Statut:** ferme  
**Theme:** documenter proprement les limites reelles de `_db_autouse`

### Actions
- Clarification de la docstring de `_db_autouse` dans `conftest.py`.
- Clarification de ce qui est garanti et non garanti :
  - override `get_db`
  - session/connexion par test
  - absence d'isolation par rollback entre tests
- Realignement de `tests/README.md` sur ce contrat reel.
- Micro-nettoyage sans changement de comportement transactionnel.

### Fichiers touches
- `recyclique-1.4.4/api/tests/conftest.py`
- `recyclique-1.4.4/api/tests/README.md`

### Validation
- Relance du sous-ensemble minimal :
  - `test_infrastructure.py`
  - `test_auth_login_endpoint.py`
  - `test_auth_logging.py`
- QA dediee de cloture.

### Resultat
- Lot ferme.
- Le contrat reel des fixtures DB est maintenant explicite pour les prochains auteurs de tests.
- Dette restante acceptee :
  - l'isolation transactionnelle n'est toujours pas corrigee
  - plusieurs details documentaires ou fixtures secondaires restent a nettoyer plus tard

---

## Lot 4A — Unification de la logique de permissions frontend

**Statut:** ferme  
**Theme:** aligner `ProtectedRoute` sur la source de verite du store

### Actions
- Remplacement de la logique locale de permissions dans `ProtectedRoute`.
- Utilisation de `hasPermission` du store pour :
  - `requiredPermission`
  - `requiredPermissions`
- Alignement du comportement `admin` / `super-admin` entre routes protegees et reste de l'UI.

### Fichiers touches
- `recyclique-1.4.4/frontend/src/components/auth/ProtectedRoute.tsx`

### Validation
- Verification lints locale.
- QA dediee de cloture.

### Resultat
- Lot ferme.
- La regle de permissions frontend est plus coherente.
- Dette restante acceptee :
  - `initializeAuth` ne recharge pas encore profil + permissions
  - l'ecart de type `manager` reste latent tant qu'il n'est pas utilise

---

## Lot 4B — Rechargement auth / permissions au demarrage frontend

**Statut:** ferme  
**Theme:** aligner l'etat auth restaure sur le backend reel

### Actions
- Completion de `initializeAuth` dans `authStore.ts`.
- Rechargement de `currentUser` via `/v1/users/me`.
- Rechargement de `permissions` via `/v1/users/me/permissions`.
- Unification du mapping user entre `login` et `initializeAuth`.
- Correction de coherence entre store et intercepteur en cas d'echec de refresh :
  - plus de nettoyage partiel
  - `logout()` utilise comme nettoyage canonique cote intercepteur
- Durcissement des tests du store auth.

### Fichiers touches
- `recyclique-1.4.4/frontend/src/stores/authStore.ts`
- `recyclique-1.4.4/frontend/src/api/axiosClient.ts`
- `recyclique-1.4.4/frontend/src/stores/__tests__/authStore.test.ts`

### Validation
- Vitest cible sur `authStore.test.ts`.
- QA dediee de cloture.

### Resultat
- Lot ferme.
- Le demarrage frontend recharge maintenant profil + permissions.
- Le comportement de nettoyage auth est plus coherent en cas d'echec refresh.
- Dette restante acceptee :
  - cycle `authStore` <-> `axiosClient`
  - pas encore de gate UI globale pendant `initializeAuth`

---

## Lot 4C — Nettoyage faible risque de `App.jsx`

**Statut:** ferme  
**Theme:** retirer du code mort et une exposition globale redondante

### Actions
- Suppression de l'exposition `window.useAuthStore`.
- Suppression des imports morts dans `App.jsx`.
- Suppression du composant `PostLoginRedirect.tsx` apres verification qu'il n'etait reference nulle part dans le depot.

### Fichiers touches
- `recyclique-1.4.4/frontend/src/App.jsx`
- `recyclique-1.4.4/frontend/src/components/PostLoginRedirect.tsx`

### Validation
- Build frontend reussi.
- QA dediee de cloture.

### Resultat
- Lot ferme.
- `App.jsx` est un peu plus propre et la surface globale auth est reduite.
- Reserve mineure acceptee :
  - le flux post-login reste simplement `navigate('/')`, ce qui est coherent avec l'etat actuel du produit

---

## Lot 4D — Verrouillage de `ProtectedRoute` par tests

**Statut:** ferme  
**Theme:** figer la logique de garde frontend sans refactor runtime

### Actions
- Ajout d'un fichier de test cible pour `ProtectedRoute`.
- Couverture des cas :
  - non authentifie
  - `adminOnly`
  - `requiredRole`
  - `requiredRoles`
  - `requiredPermission`
  - `requiredPermissions` en logique OR
  - tableaux vides pour les roles/permissions multiples
- Harmonisation de `requiredRoles={[]}` avec `requiredPermissions={[]}`.

### Fichiers touches
- `recyclique-1.4.4/frontend/src/components/auth/ProtectedRoute.tsx`
- `recyclique-1.4.4/frontend/src/components/auth/__tests__/ProtectedRoute.test.tsx`

### Validation
- Vitest cible sur `ProtectedRoute.test.tsx`.
- QA dediee de cloture.

### Resultat
- Lot ferme.
- La logique actuelle de garde frontend est maintenant verrouillee par des tests dedies.
- Dette restante acceptee :
  - ecart latent autour du role `manager`
  - pas encore de gate UI sur `loading`

---

## Lot 1D — Ops residuel de reprise

**Statut:** ferme  
**Theme:** fermer les ecarts restants de configuration et d'outillage avant les lots schema et tests

### Actions
- Centralisation de `FRONTEND_URL` et des origines CORS dans `Settings`.
- Ajout d'un calcul explicite de repli frontend reserve aux environnements de type dev.
- Realignement du middleware CORS sur cette source de verite de config.
- Suppression du risque de liens email vers `localhost` hors dev quand `FRONTEND_URL` est absent.
- Fiabilisation de la chaine de version :
  - correction de l'usage compose de `APP_VERSION`
  - durcissement de `scripts/get-version.sh` pour fonctionner depuis son propre dossier
- Clarification du runtime Python :
  - Docker = Python 3.11
  - local = `>=3.11`, avec preference 3.11.x
- Realignement des scripts `start.sh` et `start.bat` pour preferer `docker compose` avec repli `docker-compose`.
- Ajout d'un test cible pour la logique `FRONTEND_URL` / CORS.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/core/config.py`
- `recyclique-1.4.4/api/src/recyclic_api/core/auth.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/auth.py`
- `recyclique-1.4.4/api/src/recyclic_api/main.py`
- `recyclique-1.4.4/docker-compose.prod.yml`
- `recyclique-1.4.4/docker-compose.staging.yml`
- `recyclique-1.4.4/scripts/get-version.sh`
- `recyclique-1.4.4/api/README.md`
- `recyclique-1.4.4/README.md`
- `recyclique-1.4.4/start.sh`
- `recyclique-1.4.4/start.bat`
- `recyclique-1.4.4/api/tests/test_config_cors_frontend_url.py`

### Validation
- `python -m compileall` sur les fichiers Python modifies.
- `pytest tests/test_infrastructure.py`.
- `pytest tests/test_config_cors_frontend_url.py`.
- QA en deux temps :
  - premiere QA : **fermable avec reserves**
  - correctifs cibles
  - QA de cloture seule : **fermable**

### Resultat
- Lot ferme.
- Le repli `FRONTEND_URL` n'est plus implicite vers `localhost` hors environnements dev-like.
- La configuration CORS est plus coherente avec `Settings`.
- Les scripts de demarrage sont plus robustes face a Compose v1/v2.
- Reserve faible acceptee :
  - quelques docs hors perimetre lot A peuvent encore mentionner `4433`
  - des validations ops reelles restent utiles sur les environnements de deploiement non dev

---

## Lot 1E — Integrite `User.site_id`

**Statut:** ferme  
**Theme:** ajouter la contrainte de referentialite manquante sur `users.site_id`

### Actions
- Ajout de `ForeignKey("sites.id")` sur `User.site_id` dans le modele ORM.
- Creation d'une migration Alembic dediee pour ajouter la contrainte `fk_users_site_id_sites`.
- Assainissement prudent des donnees avant ajout de la FK :
  - mise a `NULL` des `site_id` orphelins
  - traçabilite legere du nombre de lignes nettoyees dans la migration
- Realignement de `api/create_schema.py` sur cette FK pour supprimer un chemin parallele de schema contradictoire.
- Ajout d'une logique defensive dans `create_schema.py` pour:
  - creer `sites` avant `users`
  - ajouter la contrainte si une ancienne table `users` existait deja sans FK

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/models/user.py`
- `recyclique-1.4.4/api/migrations/versions/d4e5f6a7b8c1_add_fk_users_site_id.py`
- `recyclique-1.4.4/api/create_schema.py`

### Validation
- `python -m compileall` sur le modele et la migration.
- Verification de la chaine Alembic :
  - `alembic heads`
  - `alembic show head`
- Verification du chemin SQLite minimal autour de `User` / `sites`.
- QA en deux temps :
  - premiere QA : **fermable avec reserves**
  - correction du chemin parallele `create_schema.py` et de la traçabilite
  - QA de cloture seule : **fermable**

### Resultat
- Lot ferme.
- `users.site_id` est maintenant aligne sur `sites.id` au niveau modele et migration.
- Le chemin bootstrap `create_schema.py` n'est plus en contradiction frontale avec la FK ajoutee.
- Reserves faibles acceptees :
  - le script `create_schema.py` reste un bootstrap historique et non une source de verite complete du schema
  - des validations PostgreSQL reelles restent utiles sur une base jetable ou de preprod

---

## Lot 1F — Pilote isolation tests auth + infra

**Statut:** ferme  
**Theme:** ouvrir un premier palier credible d'isolation DB pour le sous-ensemble backend deja stabilise

### Actions
- Mise en place d'un cleanup deterministe apres chaque test du pilote dans `_db_autouse`.
- Limitation explicite du pilote a un petit sous-ensemble :
  - `test_infrastructure.py`
  - `test_auth_login_endpoint.py`
  - `test_auth_logging.py`
  - `test_auth_inactive_user_middleware.py`
- Nettoyage cible des tables les plus directement touchees par ce sous-ensemble :
  - `audit_logs`
  - `user_sessions`
  - `login_history`
  - `users`
- Realignement du timing du cleanup pour eviter les verrous SQLite.
- Ajout d'un `timeout` SQLite pour reduire la fragilite locale.
- Suppression du caractere silencieux du cleanup :
  - logs d'erreur explicites
  - levee de `RuntimeError` si inspection ou `DELETE` echoue

### Fichiers touches
- `recyclique-1.4.4/api/tests/conftest.py`

### Validation
- Relances ciblees du sous-ensemble pilote :
  - `tests/test_infrastructure.py`
  - `tests/test_auth_login_endpoint.py`
  - `tests/test_auth_logging.py`
  - `tests/test_auth_inactive_user_middleware.py`
- Premiere QA : **fermable avec reserves**
- Correctif sur l'observabilite du cleanup
- QA de cloture seule : **fermable avec reserves**
- Validation PostgreSQL reelle sous Docker :
  - `tests/test_infrastructure.py`
  - `tests/test_auth_login_endpoint.py`
  - `tests/test_auth_logging.py`
  - `tests/test_auth_inactive_user_middleware.py`
  - verdict : `28/28 passed`
- QA finale de levee de reserve : reserve PostgreSQL levee pour le sous-ensemble pilote

### Resultat
- Le pilote ne repose plus sur un cleanup silencieux.
- Les erreurs de cleanup remontent maintenant explicitement au teardown.
- Le sous-ensemble auth + infra dispose d'un premier mecanisme d'isolation apres `commit()`.
- Limites de perimetre acceptees :
  - le pilote ne couvre pas encore toute la suite backend
  - l'execution mixte avec des tests hors pilote reste un sujet d'extension futur, pas un blocage du pilote courant

---

## Lot 1G — Frontend auth / UX cible

**Statut:** ferme  
**Theme:** fermer les dettes auth frontend restantes sans refonte globale du router

### Actions
- Remplacement de la redirection 401 pleine page par une navigation compatible router quand le `navigate` React est disponible.
- Ajout d'un petit registre de navigation auth pour relier l'intercepteur HTTP au router sans refonte structurelle.
- Conservation d'un repli `window.location.assign` si un 401 survient avant l'enregistrement du `navigate`.
- Realignement du role `manager` sur l'enum `UserRole` generee.
- Typage `ProtectedRoute` sur `UserRole` au lieu de chaines libres pour `requiredRole` / `requiredRoles`.
- Ajout d'un gate `loading` dans `ProtectedRoute` quand un token existe mais que la rehydratation auth est encore en cours.
- Mise a jour des tests cibles frontend autour de `ProtectedRoute`, `authNavigation` et des routes publiques de test.

### Fichiers touches
- `recyclique-1.4.4/frontend/src/api/authNavigation.ts`
- `recyclique-1.4.4/frontend/src/components/auth/RegisterRouterNavigate.tsx`
- `recyclique-1.4.4/frontend/src/api/__tests__/authNavigation.test.ts`
- `recyclique-1.4.4/frontend/src/api/axiosClient.ts`
- `recyclique-1.4.4/frontend/src/App.jsx`
- `recyclique-1.4.4/frontend/src/stores/authStore.ts`
- `recyclique-1.4.4/frontend/src/components/auth/ProtectedRoute.tsx`
- `recyclique-1.4.4/frontend/src/components/auth/__tests__/ProtectedRoute.test.tsx`
- `recyclique-1.4.4/frontend/src/test/integration/public-routes.test.tsx`
- `recyclique-1.4.4/frontend/src/test/test-utils.tsx`

### Validation
- Vitest cible sur :
  - `ProtectedRoute.test.tsx`
  - `authNavigation.test.ts`
  - `authStore.test.ts`
  - `public-routes.test.tsx`
- Build frontend Vite reussi.
- QA de cloture seule : **fermable**

### Resultat
- Lot ferme.
- Le flux 401 passe maintenant prioritairement par le router au lieu d'une redirection pleine page.
- L'ecart `manager` / type `User` est traite sur le perimetre auth.
- `ProtectedRoute` gere mieux la phase de rehydratation auth avec token.
- Reserve faible acceptee :
  - le repli `window.location.assign` reste volontairement present avant enregistrement du `navigate`
  - les tests d'integration de routes publiques restent un proxy partiel du vrai routeur applicatif

---

## Lot 1H — Pilote architecture backend `delete_site`

**Statut:** ferme  
**Theme:** valider un premier pattern de service sans `HTTPException`, traduit au bord HTTP

### Actions
- Introduction d'une exception metier `ConflictError` dans `core/exceptions.py`.
- Retrait de `HTTPException` de `SiteService` sur le flux pilote `delete_site`.
- Remplacement des levées HTTP par `ConflictError` dans `_check_dependencies`.
- Traduction explicite `ConflictError` -> `HTTP 409` dans l'endpoint `sites.py`.
- Ajout d'un test dedie a la branche « utilisateurs rattaches -> 409 ».

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/core/exceptions.py`
- `recyclique-1.4.4/api/src/recyclic_api/services/site_service.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/sites.py`
- `recyclique-1.4.4/api/tests/test_sites_crud.py`

### Validation
- Compilation syntaxique des fichiers backend touches.
- Verification des diagnostics IDE sur les fichiers modifies.
- QA en deux temps :
  - premiere QA : **fermable avec reserves**
  - ajout d'un test de couverture sur la branche utilisateurs
  - QA de cloture seule : **fermable avec reserves**
- Validation PostgreSQL reelle sous Docker :
  - `tests/test_sites_crud.py::test_delete_site_fails_409_when_users_attached`
  - `tests/test_cash_registers_endpoint.py::TestCashRegistersEndpoint::test_delete_site_with_cash_registers_fails_409`
  - avec `API_V1_STR=/api/v1`
  - verdict : `2/2 passed`
- QA finale de levee de reserve : reserve liee au schema de test SQLite minimale levee pour le flux pilote `delete_site`

### Resultat
- Le flux pilote `delete_site` n'expose plus de `HTTPException` depuis la couche service.
- Le contrat API reste conserve au niveau route :
  - `404` si site absent
  - `409` si dependances metier
  - `204` si suppression reussie
- Limites de perimetre acceptees :
  - la validation complete du module `sites` sur PostgreSQL reste un renforcement possible mais n'est pas necessaire pour ce pilote
  - le pattern n'est valide que sur une petite surface pilote, pas encore generalise

---

## Lot 2F — Fondations frontend : React Query et outillage minimal

**Statut:** ferme  
**Theme:** retirer une couche de data fetching inactive et nettoyer l'outillage frontal minimal pour aligner le projet sur sa stack reelle

### Actions
- Retrait de `react-query` du point d'entree frontend et des dependances.
- Suppression de `QueryClientProvider` et de la configuration associee dans `src/index.tsx`.
- Realignement du test `TicketForm.keyboard.integration.test.tsx` pour ne plus importer `@tanstack/react-query`.
- Deplacement de `@playwright/test` en `devDependencies`.
- Suppression des reliquats CRA les plus evidents dans `package.json` :
  - script `eject`
  - bloc `eslintConfig` `react-app`
- Durcissement du mock global `styled-components` pour supporter `.withConfig(...)`.
- Ajustements cibles du test clavier `TicketForm` pour retrouver une preuve de fonctionnement reelle.

### Fichiers touches
- `recyclique-1.4.4/frontend/src/index.tsx`
- `recyclique-1.4.4/frontend/package.json`
- `recyclique-1.4.4/frontend/package-lock.json`
- `recyclique-1.4.4/frontend/src/test/setup.ts`
- `recyclique-1.4.4/frontend/src/pages/Reception/TicketForm.keyboard.integration.test.tsx`

### Validation
- `npm install`
- `npm run build`
- `eslint` cible sur les fichiers modifies
- `npx vitest run src/pages/Reception/TicketForm.keyboard.integration.test.tsx`
- Premiere QA : **fermable avec reserves**
- Correctif cible sur les mocks frontend
- QA de cloture seule : **fermable**

### Resultat
- Le frontend n'embarque plus React Query sans usage reel.
- L'outillage frontal raconte une histoire plus cohérente avec Vite / Vitest.
- Le test clavier `TicketForm` repasse et le mock global `styled-components` est moins fragile sur `.withConfig`.
- Reserve faible acceptee :
  - quelques details de housekeeping restent possibles dans `setup.ts` ou `package.json`
  - ce lot ne pretend pas nettoyer tout l'outillage frontend en une fois

---

## Lot 2G — Routes admin pending et tests de routing reels

**Statut:** ferme  
**Theme:** supprimer un lien admin casse et rapprocher les tests d'integration du routeur reel

### Actions
- Ajout de la route admin reelle `/admin/pending` dans `App.jsx`.
- Branchement du composant `PendingUsers` sous le parent admin deja protege par `ProtectedRoute adminOnly`.
- Realignement de `public-routes.test.tsx` pour monter `App` plutot qu'un graphe de routes factice.
- Ajout d'un test d'integration admin dedie pour verifier l'acces a `/admin/pending`.
- Nettoyage des declarations `lazy` mortes `AdminDashboard` et `TicketDetail` dans `App.jsx`.

### Fichiers touches
- `recyclique-1.4.4/frontend/src/App.jsx`
- `recyclique-1.4.4/frontend/src/test/integration/public-routes.test.tsx`
- `recyclique-1.4.4/frontend/src/test/integration/admin-pending-route.test.tsx`

### Validation
- `npx vitest run src/test/integration/public-routes.test.tsx`
- `npx vitest run src/test/integration/admin-pending-route.test.tsx`
- `npx vitest run src/test/integration/public-routes.test.tsx src/test/integration/admin-pending-route.test.tsx`
- `npx eslint src/App.jsx src/test/integration/admin-pending-route.test.tsx`
- Premiere QA : **fermable avec reserves**
- Correctifs cibles sur les imports morts et la couverture admin
- QA de cloture seule : **fermable**

### Resultat
- Le lien `/admin/pending` n'est plus casse.
- Les tests de routes publiques reposent maintenant sur `App` et non sur un faux graphe parallele.
- Une couverture minimale de navigation admin vers `/admin/pending` existe desormais.
- Reserve faible acceptee :
  - des scenarios supplementaires de roles (user non admin, super-admin) peuvent etre ajoutes plus tard sans bloquer ce lot

---

## Lot 2H — Convention HTTP et facade categories

**Statut:** ferme  
**Theme:** clarifier la source de verite du client HTTP et supprimer le doublon categories le plus net

### Actions
- Formalisation de `axiosClient` comme client HTTP unique explicite pour les services frontend cibles.
- Realignement de `cashSessionService.ts` sur `axiosClient` au lieu de `ApiClient.client`.
- Realignement de `categoryService.ts` sur `axiosClient`.
- Transformation de `categoriesService.ts` en facade de compatibilite au-dessus de `categoryService`.
- Ajustement des tests cibles `cashSessionService` pour coller au contrat reel de `closeSessionWithAmounts`.

### Fichiers touches
- `recyclique-1.4.4/frontend/src/services/cashSessionService.ts`
- `recyclique-1.4.4/frontend/src/services/categoryService.ts`
- `recyclique-1.4.4/frontend/src/services/categoriesService.ts`
- `recyclique-1.4.4/frontend/src/test/services/cashSessionService.test.ts`

### Validation
- Vitest cible :
  - `src/test/services/cashSessionService.test.ts`
  - `src/test/stores/categoryStore.test.ts`
  - `src/stores/__tests__/categoryStore.test.ts`
- Lint cible sur les fichiers modifies.
- QA de cloture seule : **fermable**

### Resultat
- La convention HTTP est plus lisible sur les services touches.
- Le doublon categories est centralise sur `categoryService` avec une facade `categoriesService`.
- Le lot ne force pas une fusion artificielle des services caisse admin / operationnels.
- Reserve faible acceptee :
  - d'autres services manuels ou usages ponctuels pourront etre realignes plus tard par vagues
  - ce lot ne traite pas toute la dette de couverture tests sur les services

---

## Lot 2I — UX transverse frontend : notifications, polling et doc legere

**Statut:** ferme avec reserves acceptees  
**Theme:** terminer la coherence frontend transverse sans ouvrir une refonte complete des hooks ou de la documentation

### Actions
- `FE-12` :
  - retrait de `react-hot-toast`
  - conservation de Mantine Notifications comme pile unique
- `FE-14` :
  - extraction de `liveNetworkPolling.ts`
  - centralisation du mapping d'erreurs live et du plancher d'intervalle reseau
  - realignement des hooks `useLiveReceptionStats`, `useCashLiveStats`, `useReceptionKPILiveStats`
  - ajout de tests cibles pour le helper et `useCashLiveStats`
- `FE-13` leger :
  - realignement de `frontend/README.md` sur la stack reelle
  - clarification du JSDoc de `useReceptionKPILiveStats`

### Fichiers touches
- `recyclique-1.4.4/frontend/src/index.tsx`
- `recyclique-1.4.4/frontend/package.json`
- `recyclique-1.4.4/frontend/package-lock.json`
- `recyclique-1.4.4/frontend/src/hooks/liveNetworkPolling.ts`
- `recyclique-1.4.4/frontend/src/hooks/useLiveReceptionStats.ts`
- `recyclique-1.4.4/frontend/src/hooks/useCashLiveStats.ts`
- `recyclique-1.4.4/frontend/src/hooks/useReceptionKPILiveStats.ts`
- `recyclique-1.4.4/frontend/src/hooks/__tests__/liveNetworkPolling.test.ts`
- `recyclique-1.4.4/frontend/src/hooks/__tests__/useLiveReceptionStats.test.ts`
- `recyclique-1.4.4/frontend/src/test/hooks/useReceptionKPILiveStats.test.ts`
- `recyclique-1.4.4/frontend/src/test/hooks/useCashLiveStats.test.ts`
- `recyclique-1.4.4/frontend/README.md`

### Validation
- `npm install` dans `frontend`
- `npm run build`
- suites Vitest cibles :
  - `src/hooks/__tests__/liveNetworkPolling.test.ts`
  - `src/hooks/__tests__/useLiveReceptionStats.test.ts`
  - `src/test/hooks/useReceptionKPILiveStats.test.ts`
  - `src/test/hooks/useCashLiveStats.test.ts`
- eslint cible sur les fichiers modifies
- QA intermediaire FE-12 : **fermable**
- QA intermediaire FE-14 : **fermable avec reserves**
- correctif cible FE-14
- QA de cloture vague frontend restante : **fermable avec reserves**

### Resultat
- Le frontend n'embarque plus de double pile de notifications.
- Les hooks live reseau partagent des bases communes utiles sans abstraction prematuree.
- La documentation de proximite frontend raconte mieux la stack reelle apres cette vague.
- Reserves acceptees :
  - la couverture hooks live reste volontairement partielle hors des cas les plus critiques
  - la duplication structurelle complete des hooks live n'est pas encore reduite a un hook generique
  - quelques commentaires/tests historiques restent a harmoniser dans une passe documentation/tests plus large

---

## Lot 3F — Tests backend auth/admin : collisions et extension pilote

**Statut:** ferme  
**Theme:** reduire la pollution de donnees la plus visible et etendre le pilote d'isolation a un sous-ensemble auth/admin rentable

### Actions
- Unicification des identifiants de test (`username`, `telegram_id`) dans :
  - `api/tests/test_auth_login_username_password.py`
  - `api/tests/test_admin_user_status_endpoint.py`
  - `api/tests/api/test_admin_user_management.py`
- Realignement de ces tests sur `settings.API_V1_STR` au lieu de chemins API figes quand pertinent.
- Extension de `_PILOT_DB_ISOLATION_BASENAMES` dans `api/tests/conftest.py` a ces modules.
- Extension du cleanup pilote a `user_status_history`.
- Neutralisation SQLite de `log_audit` sur les surfaces auth/admin necessaires pour garder les tests cibles stables en schema minimal.
- Realignement de `api/run_tests.sh` sur le sous-ensemble pilote effectivement supporte.

### Fichiers touches
- `recyclique-1.4.4/api/tests/conftest.py`
- `recyclique-1.4.4/api/tests/test_auth_login_username_password.py`
- `recyclique-1.4.4/api/tests/test_admin_user_status_endpoint.py`
- `recyclique-1.4.4/api/tests/api/test_admin_user_management.py`
- `recyclique-1.4.4/api/run_tests.sh`

### Validation
- `pytest` cible sur :
  - `tests/test_infrastructure.py`
  - `tests/test_auth_login_endpoint.py`
  - `tests/test_auth_logging.py`
  - `tests/test_auth_inactive_user_middleware.py`
  - `tests/test_auth_login_username_password.py`
  - `tests/test_admin_user_status_endpoint.py`
  - `tests/api/test_admin_user_management.py`
- Resultat : **57 tests passes**
- QA de cloture seule : **fermable**

### Resultat
- Les collisions de donnees les plus evidentes du lot auth/admin sont reduites.
- Le pilote d'isolation couvre un sous-ensemble auth/admin plus representatif qu'avant.
- `run_tests.sh` raconte mieux le sous-ensemble pilote reel.

---

## Lot 3G — Tests backend refresh : service + settings

**Statut:** ferme avec reserves acceptees  
**Theme:** etendre prudemment le pilote auth aux tests du `RefreshTokenService`

### Actions
- Ajout de `api/tests/test_refresh_token_service.py` au pilote d'isolation.
- Extension du cleanup pilote a `settings` pour eviter les fuites d'etat sur `refresh_token_max_hours`.
- Reset explicite du cache `ActivityService` pendant le teardown pilote.
- Correctif SQLite cible pour les datetimes `UserSession` rechargees depuis la base de test.
- Unicification des usernames dans `test_refresh_token_service.py`.
- Ajustement du test de rotation reussie pour stabiliser la partie "activite recente" sans dependre du comportement reel Redis local.
- Extension de `api/run_tests.sh` a `tests/test_refresh_token_service.py`.

### Fichiers touches
- `recyclique-1.4.4/api/tests/conftest.py`
- `recyclique-1.4.4/api/tests/test_refresh_token_service.py`
- `recyclique-1.4.4/api/run_tests.sh`

### Validation
- `pytest tests/test_refresh_token_service.py`
- `pytest` cible sur le sous-ensemble pilote auth/admin + refresh
- Resultat final revalide : **69 tests passes**
- QA de cloture seule : **fermable avec reserves**

### Resultat
- Le pilote auth couvre maintenant aussi le service refresh et son usage de `settings`.
- Les fuites d'etat les plus probables autour de `refresh_token_max_hours` sont neutralisees.
- Reserves acceptees :
  - le pilote reste une isolation par cleanup cible, pas un rollback transactionnel global
  - la validation Docker/PostgreSQL du script `run_tests.sh` reste utile comme passe complementaire

---

## Lot 3H — Tests backend refresh endpoint

**Statut:** ferme avec reserves acceptees  
**Theme:** etendre l'axe auth backend du pilote/service vers l'endpoint `/auth/refresh`

### Actions
- Realignement de `api/tests/test_refresh_token_endpoint.py` sur `settings.API_V1_STR`.
- Unicification des usernames de test pour reduire les collisions residuelles.
- Correction du scenario "inactivite" pour supprimer explicitement le marqueur d'activite Redis apres login, au lieu de supposer une absence d'activite deja fausse.
- Ajout d'une fixture `requires_redis` pour rendre les executions locales sans Redis explicitement `skip` plutot que trompeuses.
- Ajout de `test_refresh_token_endpoint.py` a `_PILOT_DB_ISOLATION_BASENAMES` dans `api/tests/conftest.py`.
- Extension de `api/run_tests.sh` a `tests/test_refresh_token_endpoint.py`.

### Fichiers touches
- `recyclique-1.4.4/api/tests/test_refresh_token_endpoint.py`
- `recyclique-1.4.4/api/tests/conftest.py`
- `recyclique-1.4.4/api/run_tests.sh`

### Validation
- Local sans Redis : `pytest tests/test_refresh_token_endpoint.py -q`
- Resultat local : **3 passes, 4 skips**
- Docker/PostgreSQL/Redis : `pytest tests/test_refresh_token_endpoint.py -q`
- Resultat Docker : **7 tests passes**
- QA de cloture seule : **fermable avec reserves**

### Resultat
- L'endpoint refresh est maintenant couvre proprement a la fois en execution locale degradee et en validation reelle Docker.
- Le pilote auth couvre desormais aussi le test endpoint refresh, pas seulement le service.
- Reserves acceptees :
  - quelques assertions restent couplees au wording francais des messages d'erreur
  - le nom du test "inactive_user" raconte encore imparfaitement une absence d'activite Redis plutot qu'un statut utilisateur en base

---

## Lot 3I — Tests backend logout / audit PostgreSQL

**Statut:** ferme  
**Theme:** stabiliser `test_auth_logout.py` dans son vrai environnement cible au lieu de forcer une compatibilite artificielle avec SQLite

### Actions
- Realignement de `api/tests/test_auth_logout.py` sur `settings.API_V1_STR`.
- Unicification des usernames pour eviter les collisions avec une base PostgreSQL partagee.
- Alignement des assertions texte sur le comportement reel actuel de `auth.logout` (`Deconnexion reussie`, description d'audit sans accents).
- Ajout d'un `skip` explicite hors PostgreSQL pour eviter les faux rouges sur SQLite alors que `audit_logs` repose sur `JSONB`.

### Fichiers touches
- `recyclique-1.4.4/api/tests/test_auth_logout.py`

### Validation
- Local SQLite : `pytest tests/test_auth_logout.py -q`
- Resultat local : **5 skips**
- Docker/PostgreSQL/Redis : `pytest tests/test_auth_logout.py -q`
- Resultat Docker : **5 tests passes**
- Validation d'integration auth backend ciblee :
  - `pytest tests/test_refresh_token_service.py tests/test_refresh_token_endpoint.py tests/test_auth_logout.py -q`
- Resultat integration : **24 tests passes**
- QA de cloture seule : **fermable**

### Resultat
- Les tests logout/audit refletent maintenant le comportement reel de l'endpoint sans dependre du pilote SQLite minimal.
- La frontiere est clarifiee : SQLite minimal pour le pilote rentable, PostgreSQL reel pour l'audit `JSONB`.

---

## Lot 1I — Pilote ARCH-02 sur `reception`

**Statut:** ferme  
**Theme:** clarifier la frontiere transactionnelle sur une verticale backend etroite avant toute generalisation

### Actions
- Retrait des `commit()` / `refresh()` des repositories `reception`.
- Centralisation des ecritures transactionnelles dans `ReceptionService` via :
  - `_commit_and_refresh()` pour les creations / mises a jour
  - `_commit()` pour les suppressions
- Realignement de `open_poste()` sur le repository `PosteReceptionRepository` pour supprimer un chemin d'ecriture parallele.
- Ajout d'un test unitaire dedie de politique transactionnelle pour figer :
  - repository sans `commit`
  - service comme point unique de `commit`

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/repositories/reception.py`
- `recyclique-1.4.4/api/src/recyclic_api/services/reception_service.py`
- `recyclique-1.4.4/api/tests/test_reception_transaction_policy.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_reception_transaction_policy.py`
- Resultat local :
  - **2 tests passes**
- Validation Docker/PostgreSQL ciblee :
  - `tests/test_reception_transaction_policy.py`
  - `tests/test_integration_category_migration.py::TestCategoryMigrationIntegration::test_reception_service_uses_new_categories`
- Resultat Docker :
  - **3 tests passes**
- QA de cloture seule : **fermable**

### Resultat
- La verticale `reception` a maintenant une regle transactionnelle plus lisible :
  - repository = acces donnees / mutation en memoire
  - service = point de `commit`
- Le lot fournit un premier pilote concret `ARCH-02` sans melanger encore la question `HTTPException` (`ARCH-03`).
- Reserves faibles acceptees :
  - la couverture specifique de politique transactionnelle reste volontairement etroite sur ce premier pilote
  - plusieurs tests HTTP historiques en `/api/v1/...` restent hors lot et ne servent pas encore de validation fiable pour `reception`

---

## Lot 1J — Pilote ARCH-02 sur creation `cash_sessions`

**Statut:** ferme avec reserves acceptees  
**Theme:** etendre le pilote transactionnel a un flux plus sensible en eliminant les commits redondants sur l'ouverture de session de caisse

### Actions
- Deplacement de l'initialisation `current_step=ENTRY` dans `CashSessionService.create_session()` avant le `commit` final.
- Remplacement du `commit` intermediaire sur la creation implicite du `Default Register` par un `flush()` pour conserver une seule transaction metier de creation.
- Suppression dans l'endpoint `create_cash_session` du `set_current_step(...)` et du `db.commit()` redondants apres l'appel service.
- Ajout d'un test dedie `test_cash_session_transaction_policy.py` pour figer :
  - un seul `commit` cote service sur le flux create
  - usage de `flush()` pour le registre implicite
  - initialisation de l'etape `ENTRY`
- Renforcement du test service existant `TestCashSessionService::test_create_session` pour verifier aussi :
  - `current_step`
  - `step_start_time`
  - `last_activity`

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/services/cash_session_service.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py`
- `recyclique-1.4.4/api/tests/test_cash_session_transaction_policy.py`
- `recyclique-1.4.4/api/tests/test_cash_sessions.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale :
  - `tests/test_cash_session_transaction_policy.py`
- Resultat local :
  - **2 tests passes**
- Validation Docker/PostgreSQL ciblee :
  - `tests/test_cash_session_transaction_policy.py`
  - `tests/test_cash_sessions.py::TestCashSessionService::test_create_session`
- Resultat Docker :
  - **3 tests passes**
- QA de cloture seule : **fermable avec reserves**

### Resultat
- Le flux de creation `cash_sessions` a maintenant une frontiere transactionnelle plus claire :
  - service = point principal de persistance de la creation
  - endpoint = permissions, audit, traduction HTTP et serialisation
- Le registre implicite et la session initialisee partagent desormais le meme commit metier sur ce flux.
- Reserves acceptees :
  - l'audit d'ouverture reste sur un `commit` distinct hors du perimetre strict du lot
  - la couverture HTTP du contrat JSON de creation peut encore etre etendue sur les champs d'etape

---

## Lot 1K — Pilote ARCH-02 sur fermeture `cash_sessions`

**Statut:** ferme avec reserves acceptees  
**Theme:** supprimer la duplication de calcul metier entre endpoint et service sur la cloture de session

### Actions
- Introduction dans `CashSessionService` de deux helpers cibles :
  - `get_total_donations_for_session()`
  - `get_closing_preview()`
- Realignement de `close_session_with_amounts()` sur `get_closing_preview()` pour reutiliser une seule formule de :
  - dons
  - montant theorique
  - variance
- Realignement de l'endpoint `close_cash_session` sur cette meme source de verite pour la prevalidation HTTP (commentaire obligatoire et tolerance).
- Extraction de la tolerance dans `CLOSE_VARIANCE_TOLERANCE`.
- Ajout d'un test dedie `test_cash_session_close_policy.py` pour figer :
  - la formule de cloture cote service
  - la reutilisation de cette formule par `close_session_with_amounts()`
- Ajout d'un test endpoint cible `test_cash_session_close_arch02.py` aligne sur `settings.API_V1_STR`.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/services/cash_session_service.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py`
- `recyclique-1.4.4/api/tests/test_cash_session_close_policy.py`
- `recyclique-1.4.4/api/tests/test_cash_session_close_arch02.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale :
  - `tests/test_cash_session_close_policy.py`
- Resultat local :
  - **2 tests passes**
- Validation Docker/PostgreSQL ciblee :
  - `tests/test_cash_session_close_policy.py`
  - `tests/test_cash_session_close_arch02.py`
  - `tests/test_cash_session_empty.py::TestEmptySessionDeletion::test_close_non_empty_session_closes_normally`
- Resultat Docker :
  - **5 tests passes**
- QA de cloture seule : **fermable avec reserves**

### Resultat
- Le flux de fermeture `cash_sessions` utilise maintenant une formule unique pour les dons, le montant theorique et la variance.
- Le service redevient la source de verite du calcul metier de cloture, l'endpoint ne gardant que la prevalidation HTTP et l'orchestration.
- Reserves acceptees :
  - le preview de cloture est encore calcule deux fois dans la requete HTTP (endpoint puis service)
  - la couverture HTTP ciblee ne verrouille pas encore un cas avec dons reellement agreges en base

---

## Lot 1L — Pilote ARCH-03 sur fermeture `reception`

**Statut:** ferme avec reserves acceptees  
**Theme:** sortir un premier flux `reception` de la logique `HTTPException` cote service sans melanger toute la verticale

### Actions
- Retrait de `HTTPException` dans `ReceptionService.close_poste()` au profit de :
  - `NotFoundError` pour `Poste introuvable`
  - `ConflictError` pour la fermeture bloquee par des tickets ouverts
- Retrait de `HTTPException` dans `ReceptionService.close_ticket()` au profit de `NotFoundError` tout en conservant l'idempotence du ticket deja ferme.
- Translation explicite de ces exceptions metier au bord HTTP dans `endpoints/reception.py` pour :
  - `POST /reception/postes/{poste_id}/close`
  - `POST /reception/tickets/{ticket_id}/close`
- Realignement des tests `reception` cibles sur `settings.API_V1_STR` afin d'arreter de valider ce flux avec des chemins historiques `/api/v1/...`.
- Ajout d'un test unitaire dedie `test_reception_arch03_domain_errors.py` pour figer le contrat metier minimal du pilote.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/services/reception_service.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/reception.py`
- `recyclique-1.4.4/api/tests/test_reception_endpoints.py`
- `recyclique-1.4.4/api/tests/test_reception_user_access.py`
- `recyclique-1.4.4/api/tests/test_reception_arch03_domain_errors.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale unitaire :
  - `tests/test_reception_arch03_domain_errors.py`
- Resultat local :
  - **4 tests passes**
- Validation locale SQLite des tests HTTP cibles :
  - `tests/test_reception_endpoints.py`
  - `tests/test_reception_user_access.py`
- Resultat SQLite :
  - **echec connu hors lot** sur schema minimal (`poste_reception` absent), sans signaler de regression specifique `ARCH-03`
- Validation Docker/PostgreSQL ciblee :
  - `tests/test_reception_endpoints.py`
  - `tests/test_reception_user_access.py`
- Resultat Docker :
  - **7 tests passes**
- QA de cloture seule : **OK**

### Resultat
- Le service `reception` a maintenant un premier ilot `ARCH-03` coherent :
  - service = exceptions metier
  - endpoint = traduction HTTP
- Le contrat existant des routes de fermeture `reception` est conserve en `404` / `409` / `200`.
- Reserves acceptees :
  - les routes convertissent encore `UUID(...)` sans garde explicite sur les identifiants invalides
  - le reste de `ReceptionService` demeure heterogene et continue de lever des `HTTPException`
  - `close_poste()` n'est pas encore traite comme operation idempotente

---

## Lot 1M — Pilote ARCH-03 sur creation `reception/ticket`

**Statut:** ferme avec reserves acceptees  
**Theme:** etendre le decouplage `HTTPException` -> exceptions metier au flux de creation de ticket sans ouvrir encore le chantier des lignes

### Actions
- Retrait de `HTTPException` dans `ReceptionService.create_ticket()` au profit de :
  - `NotFoundError` pour `Poste introuvable`
  - `ConflictError` pour `Poste ferme`
  - `NotFoundError` pour `Utilisateur introuvable`
- Translation explicite de ces exceptions dans la route `POST /reception/tickets`.
- Extension des tests unitaires `ARCH-03` pour figer les trois branches metier de `create_ticket`.
- Ajout de deux verrous HTTP cibles :
  - creation sur poste inconnu -> `404`
  - creation sur poste ferme -> `409`

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/services/reception_service.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/reception.py`
- `recyclique-1.4.4/api/tests/test_reception_arch03_domain_errors.py`
- `recyclique-1.4.4/api/tests/test_reception_endpoints.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale unitaire :
  - `tests/test_reception_arch03_domain_errors.py`
- Resultat local :
  - **7 tests passes**
- Validation Docker/PostgreSQL ciblee :
  - `tests/test_reception_endpoints.py`
  - `tests/test_reception_user_access.py`
- Resultat Docker :
  - **9 tests passes**
- QA de cloture seule : **OK**

### Resultat
- Le flux `create_ticket` suit maintenant la meme frontiere ARCH-03 que `close_poste` / `close_ticket` :
  - service = exceptions metier
  - endpoint = traduction HTTP
- Le contrat HTTP existant reste stable sur les cas critiques `404` / `409`.
- Reserves acceptees :
  - la verticale `reception` reste encore heterogene tant que `open_poste` et les lignes levent toujours des `HTTPException`
  - la traduction `NotFoundError` / `ConflictError` reste implemente par route, sans helper partage

---

## Lot 1N — Pilote ARCH-03 sur ouverture `reception/poste`

**Statut:** ferme avec reserves acceptees  
**Theme:** sortir la validation d'ouverture de poste du service HTTP tout en consolidant les tests de saisie differee

### Actions
- Remplacement du `HTTPException(400)` de `ReceptionService.open_poste()` par `ValidationError` quand `opened_at` est dans le futur.
- Translation explicite de `ValidationError` dans la route `POST /reception/postes/open`.
- Ajout d'un test unitaire `ARCH-03` pour figer le rejet metier d'une date future.
- Realignement de `test_reception_deferred.py` sur `settings.API_V1_STR`.
- Stabilisation du test `test_create_ticket_in_normal_poste_uses_current_time` pour verifier un ticket "proche de maintenant" avec une vraie tolerance, au lieu d'une fenetre strictement comprise entre deux horodatages du client de test.
- Correction locale de la logique de date dans `create_ticket()` :
  - un poste normal n'est plus assimile a un poste differe juste parce que son `opened_at` precede de quelques millisecondes la creation du ticket
  - `opened_at` n'est reutilise que pour un poste reellement ancien (saisie differee)

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/services/reception_service.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/reception.py`
- `recyclique-1.4.4/api/tests/test_reception_arch03_domain_errors.py`
- `recyclique-1.4.4/api/tests/test_reception_deferred.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale unitaire :
  - `tests/test_reception_arch03_domain_errors.py`
- Resultat local :
  - **8 tests passes**
- Validation Docker/PostgreSQL ciblee :
  - `tests/test_reception_endpoints.py`
  - `tests/test_reception_user_access.py`
  - `tests/test_reception_deferred.py`
- Resultat Docker :
  - **18 tests passes**
- QA de cloture seule : **OK**

### Resultat
- `open_poste` suit maintenant la meme frontiere ARCH-03 que les autres flux `reception` deja migres :
  - service = validation / exceptions metier
  - endpoint = traduction HTTP
- Les tests de saisie differee sont maintenant alignes sur le prefixe API courant et moins sensibles au timing de test.
- Reserves acceptees :
  - la comparaison "date future" reste stricte et peut etre sensible a un cas limite "quasi maintenant"
  - la verticale `reception` reste heterogene tant que les lignes n'ont pas ete migrees hors `HTTPException`

---

## Lot 1O — Pilote ARCH-03 sur creation `reception/ligne`

**Statut:** ferme avec reserves acceptees  
**Theme:** ouvrir le chantier ARCH-03 des lignes par le plus petit flux utile, en preservant le contrat HTTP `404` / `409` / `422`

### Actions
- Remplacement des `HTTPException` de `ReceptionService.create_ligne()` par :
  - `NotFoundError` pour `Ticket introuvable`
  - `ConflictError` pour `Ticket ferme`
  - `NotFoundError` pour `Categorie introuvable`
  - `ValidationError` pour les cas de validation metier (`poids_kg`, destination invalide, regle `is_exit`)
- Translation explicite de ces exceptions dans la route `POST /reception/lignes`.
- Ajout de tests unitaires `ARCH-03` pour figer les branches metier de `create_ligne`.
- Ajout d'un test d'integration cible `test_reception_line_create_arch03.py` pour verrouiller :
  - ticket inconnu -> `404`
  - ticket ferme -> `409`
  - categorie inconnue -> `404`
  - `is_exit=true` avec `MAGASIN` -> `422`

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/services/reception_service.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/reception.py`
- `recyclique-1.4.4/api/tests/test_reception_arch03_domain_errors.py`
- `recyclique-1.4.4/api/tests/test_reception_line_create_arch03.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale unitaire :
  - `tests/test_reception_arch03_domain_errors.py`
- Resultat local :
  - **13 tests passes**
- Validation Docker/PostgreSQL ciblee :
  - `tests/test_reception_line_create_arch03.py`
- Resultat Docker :
  - **4 tests passes**
- QA de cloture seule : **OK**

### Resultat
- `create_ligne` suit maintenant le meme patron ARCH-03 que les autres flux `reception` deja migres :
  - service = exceptions metier
  - endpoint = traduction HTTP
- Le contrat HTTP utile du flux de creation de ligne est maintenant verrouille explicitement sur les branches critiques.
- Reserves acceptees :
  - `update_ligne`, `delete_ligne` et `update_ligne_weight_admin` restent hors lot et continuent de lever des `HTTPException`
  - `ValidationError("Destination invalide")` reste surtout utile pour les appels directs au service, le schema HTTP filtrant deja la plupart des valeurs invalides

---

## Lot 1P — Pilote ARCH-03 sur mise a jour `reception/ligne`

**Statut:** ferme avec reserves acceptees  
**Theme:** etendre le decouplage ARCH-03 a la modification de ligne, y compris sur les mises a jour partielles

### Actions
- Remplacement des `HTTPException` de `ReceptionService.update_ligne()` par :
  - `NotFoundError` pour `Ligne introuvable`, `Ticket introuvable`, `Categorie introuvable`
  - `ConflictError` pour `Ticket ferme`
  - `ValidationError` pour `poids_kg`, destination invalide et regles `is_exit`
- Translation explicite de ces erreurs dans `PUT /reception/lignes/{ligne_id}`.
- Ajout de tests unitaires `ARCH-03` pour les branches metier de `update_ligne`.
- Ajout d'un test d'integration cible `test_reception_line_update_arch03.py` pour verrouiller :
  - ligne inconnue -> `404`
  - ticket ferme -> `409`
  - categorie inconnue -> `404`
  - `is_exit=true` invalide -> `422`
- Correction apres QA d'un trou metier sur la mise a jour partielle :
  - une ligne deja `is_exit=true` ne peut plus devenir incoherente si seule la destination passe a `MAGASIN`
  - remplacement du `assert ticket is not None` par une erreur metier explicite

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/services/reception_service.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/reception.py`
- `recyclique-1.4.4/api/tests/test_reception_arch03_domain_errors.py`
- `recyclique-1.4.4/api/tests/test_reception_line_update_arch03.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale unitaire :
  - `tests/test_reception_arch03_domain_errors.py`
- Resultat local :
  - **20 tests passes**
- Validation Docker/PostgreSQL ciblee :
  - `tests/test_reception_line_update_arch03.py`
- Resultat Docker :
  - **5 tests passes**
- QA de cloture seule : **OK**

### Resultat
- `update_ligne` suit maintenant le meme patron ARCH-03 que `create_ligne`.
- Les mises a jour partielles respectent a nouveau les invariants metier `is_exit` / destination.
- Reserves acceptees :
  - `delete_ligne` et `update_ligne_weight_admin` restaient hors lot a ce stade
  - quelques gardes UUID restent encore a harmoniser au niveau endpoint

---

## Lot 1Q — Cloture ARCH-03 sur les derniers flux `reception`

**Statut:** ferme avec reserves acceptees  
**Theme:** fermer l'axe `ARCH-03/reception` en migrant la suppression de ligne et la correction admin de poids

### Actions
- Remplacement des `HTTPException` de `ReceptionService.delete_ligne()` par :
  - `NotFoundError` pour `Ligne introuvable` et `Ticket introuvable`
  - `ConflictError` pour `Ticket ferme`
- Remplacement des `HTTPException` de `ReceptionService.update_ligne_weight_admin()` par :
  - `NotFoundError` pour `Ligne introuvable`
  - `ValidationError` pour `poids_kg`
- Translation explicite de ces erreurs dans :
  - `DELETE /reception/lignes/{ligne_id}`
  - `PATCH /reception/tickets/{ticket_id}/lignes/{ligne_id}/weight`
- Ajout d'une garde `UUID` sur `delete_ligne` pour eviter un `ValueError` non mappe sur identifiant de chemin invalide.
- Mise a jour de la docstring `update_ligne_weight_admin` et suppression d'un import FastAPI mort dans le service.
- Ajout de tests unitaires `ARCH-03` pour les branches metier de `delete_ligne` et `update_ligne_weight_admin`.
- Ajout d'un test d'integration cible `test_reception_line_tail_arch03.py` pour verrouiller :
  - suppression ligne inconnue -> `404`
  - suppression sur ticket ferme -> `409`
  - incoherence ticket/ligne sur patch poids -> `400`
  - correction admin du poids maintenue sur ticket ferme -> `200`

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/services/reception_service.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/reception.py`
- `recyclique-1.4.4/api/tests/test_reception_arch03_domain_errors.py`
- `recyclique-1.4.4/api/tests/test_reception_line_tail_arch03.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale unitaire :
  - `tests/test_reception_arch03_domain_errors.py`
- Resultat local :
  - **25 tests passes**
- Validation Docker/PostgreSQL ciblee :
  - `tests/test_reception_line_create_arch03.py`
  - `tests/test_reception_line_update_arch03.py`
  - `tests/test_reception_line_tail_arch03.py`
- Resultat Docker :
  - **13 tests passes**
- QA finale seule sur l'axe `ARCH-03/reception` : **OK**

### Resultat
- `ReceptionService` ne leve plus de `HTTPException` sur le perimetre `reception` couvert par ARCH-03 :
  - postes
  - tickets
  - lignes
  - correction admin de poids
- La traduction HTTP est maintenant concentree dans `endpoints/reception.py` pour ce perimetre.
- L'axe `ARCH-03/reception` peut etre considere comme **ferme** fonctionnellement.
- Reserves acceptees :
  - quelques verifications de coherence ticket/ligne et UUID restent encore cote endpoint, pas dans le service
  - les erreurs DB / integrite restent hors modelisation metier et peuvent encore remonter en `500`

---

## Structure Git — detachement de `recyclique-1.4.4/`

**Statut:** execute (index parent reecrit)  
**Theme:** le dossier etait suivi comme **gitlink** (mode `160000`, sans `.gitmodules`) ; les fichiers internes n'apparaissaient pas dans `git status` du depot parent.

### Actions
- Sauvegarde du `.git` imbrique et metadonnees (`remote`, `HEAD`, `status`) vers :
  - `references/artefacts/2026-03-23_01_recyclique-1.4.4-nested-git-backup/` (copie locale, **non versionnee**).
- Suppression du repertoire `recyclique-1.4.4/.git`.
- `git rm --cached recyclique-1.4.4` puis `git add recyclique-1.4.4/` pour remplacer le gitlink par l'arborescence de fichiers.
- Ajout dans `.gitignore` racine du motif `references/artefacts/*-nested-git-backup/` pour eviter tout commit accidentel de la sauvegarde (~44 Mo).

### Validation
- `git ls-files -s recyclique-1.4.4` ne doit plus montrer de mode `160000` sur la racine ; les chemins fichiers doivent apparaitre en `100644` / `100755` selon le cas.
- `git status` du parent doit lister les fichiers sous `recyclique-1.4.4/...` (y compris les edits recents type `ProtectedRoute.tsx`).

### Resultat
- Le code sous `recyclique-1.4.4/` est desormais **suivi comme fichiers normaux** dans `JARVOS_recyclique`.
- Conserver la sauvegarde locale tant qu'on n'a pas valide un premier commit parent incluant l'arborescence ; supprimer ensuite si plus utile.

---

## Lot 1R — Pilote ARCH-03 sur creation `cash_sessions`

**Statut:** ferme avec reserves acceptees  
**Theme:** decoupler la creation de session de caisse entre service metier et bord HTTP, sans casser le contrat existant de creation

### Actions
- Remplacement des `ValueError` metier de `CashSessionService.create_session()` par :
  - `ValidationError` pour `opened_at` futur et UUID mal formes (`operator_id`, `site_id`, `register_id`)
  - `NotFoundError` pour `Operateur non trouve`
  - `ConflictError` pour registre deja occupe
- Alignement de `get_open_session_by_operator()` sur la meme frontiere metier pour eviter un `500` en cas de `operator_id` invalide lors du pre-check endpoint.
- Translation explicite dans `POST /cash-sessions/` :
  - `NotFoundError` -> `404`
  - `ValidationError` -> `400`
  - `ConflictError` -> `400` (contrat historique de creation preserve)
- Sortie du controle `opened_at` futur hors schema `CashSessionCreate` pour laisser la regle vivre dans le service et eviter la casse du handler global de validation.
- Durcissement de l'audit d'echec d'ouverture : `session_id` vide ne part plus comme faux UUID dans `audit_logs`.
- Ajout d'un fichier de tests cible `test_cash_session_create_arch03.py` couvrant :
  - erreurs metier unitaires (`future date`, `operator_id` invalide, operateur inconnu, registre deja ouvert)
  - contrat HTTP cible (`400` ID invalide, `404` operateur inconnu)
- Realignement partiel de `test_cash_session_deferred.py` sur `settings.API_V1_STR` pour la creation de session et les scenarii de creation cibles.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/services/cash_session_service.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py`
- `recyclique-1.4.4/api/src/recyclic_api/schemas/cash_session.py`
- `recyclique-1.4.4/api/src/recyclic_api/core/audit.py`
- `recyclique-1.4.4/api/tests/test_cash_session_create_arch03.py`
- `recyclique-1.4.4/api/tests/test_cash_session_deferred.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_cash_session_create_arch03.py`
- Resultat local :
  - **5 tests passes** + **1 skip PostgreSQL-only**
- Validation Docker/PostgreSQL ciblee :
  - `tests/test_cash_session_create_arch03.py::test_create_cash_session_returns_404_for_unknown_operator`
  - `tests/test_cash_session_deferred.py::TestDeferredCashSessionCreation::*`
- Resultat Docker :
  - **8 tests passes**
- QA finale seule : **OK**

### Resultat
- La creation `cash_sessions` suit maintenant une frontiere `ARCH-03` explicite :
  - service = validation / exceptions metier
  - endpoint = traduction HTTP / permissions
- Les UUID mal formes n'aboutissent plus a des `500` sur le flux create.
- Le contrat HTTP utile de create est verrouille explicitement sur `400`, `403`, `404` et `201`.
- Reserves acceptees :
  - le test HTTP `404 operateur introuvable` reste execute uniquement sous PostgreSQL
  - les scenarii de creation de vente depuis session differee relèvent d'un axe metier voisin et ne font pas partie de la cloture de ce lot

---

## Lot 1S — Pilote ARCH-03 sur fermeture `cash_sessions`

**Statut:** ferme avec reserves acceptees  
**Theme:** sortir les regles metier de fermeture de session de caisse du bord HTTP, en preservant le contrat existant de fermeture

### Actions
- Introduction de `get_session_by_id_or_raise()` dans `CashSessionService` pour centraliser :
  - `NotFoundError` sur session absente
  - `ValidationError` sur `session_id` mal forme
- Introduction de `validate_session_close()` pour porter cote service :
  - `ConflictError` si la session est deja fermee
  - `ValidationError` si un commentaire manque alors qu'un ecart depasse la tolerance
  - normalisation des commentaires vides / espaces
- Refactor de `close_session_with_amounts()` pour reutiliser la validation metier et accepter un `preview` deja calcule afin d'eviter la double validation.
- Simplification de `POST /cash-sessions/{session_id}/close` :
  - l'autorisation reste cote endpoint
  - la validation metier et les messages de fermeture sont desormais delegates au service
  - traduction explicite de `NotFoundError` -> `404`, `ConflictError` -> `400`, `ValidationError` -> `400`
- Ajout d'un fichier de tests unitaire cible `test_cash_session_close_arch03_domain_errors.py` pour figer :
  - session introuvable
  - `session_id` invalide
  - session deja fermee
  - commentaire manquant / vide en cas d'ecart
- Realignement de `test_cash_session_close.py` sur `settings.API_V1_STR` et explicitation PostgreSQL-only.
- Extension des tests d'integration de fermeture avec :
  - `403` sur fermeture par un autre operateur `USER`
  - `400` sur `session_id` invalide

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/services/cash_session_service.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py`
- `recyclique-1.4.4/api/tests/test_cash_session_close_arch03_domain_errors.py`
- `recyclique-1.4.4/api/tests/test_cash_session_close.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_cash_session_close_arch03_domain_errors.py`
  - `tests/test_cash_session_close.py`
- Resultat local :
  - **5 tests passes** + **10 skips PostgreSQL-only**
- Validation Docker/PostgreSQL ciblee :
  - `tests/test_cash_session_close_arch03_domain_errors.py`
  - `tests/test_cash_session_close.py`
- Resultat Docker :
  - **15 tests passes**
- QA finale seule : **OK**

### Resultat
- La fermeture `cash_sessions` suit maintenant une frontiere `ARCH-03` explicite :
  - service = validation / erreurs metier de fermeture
  - endpoint = autorisation / traduction HTTP / orchestration
- Le contrat HTTP utile de fermeture est verrouille explicitement sur `200`, `400`, `403`, `404`.
- Le cas `session_id` invalide ne tombe plus en erreur serveur sur le flux close.
- Reserves acceptees :
  - `test_cash_session_close.py` reste un fichier d'integration PostgreSQL-only
  - le flux lit encore la session deux fois (endpoint puis service), ce qui laisse une fenetre de course theorique mais non bloquante a ce stade

---

## Lot 1T — Pilote ARCH-03 sur detail `cash_sessions`

**Statut:** ferme avec reserves acceptees  
**Theme:** aligner le detail de session de caisse sur la frontiere ARCH-03 en supprimant les `500` evitables sur le lookup par `session_id`

### Actions
- Introduction de `get_session_with_details_or_raise()` dans `CashSessionService` pour centraliser :
  - `ValidationError` sur `session_id` mal forme
  - `NotFoundError` sur session detail absente
- Refactor de `GET /cash-sessions/{session_id}` pour :
  - utiliser le lookup metier `*_or_raise`
  - traduire explicitement `ValidationError` -> `400` et `NotFoundError` -> `404`
  - conserver l'autorisation ADMIN/SUPER_ADMIN cote endpoint
  - conserver l'audit d'acces, en succes comme en echec
- Ajout d'un logging explicite sur le chemin `500` inattendu du detail pour ameliorer le diagnostic.
- Extension du fichier unitaire `test_cash_session_close_arch03_domain_errors.py` pour couvrir aussi le lookup detail :
  - `session_id` detail invalide
  - session detail absente
- Realignement de `test_cash_session_detail.py` sur `settings.API_V1_STR` et explicitation PostgreSQL-only.
- Correction des fixtures/tests detail existants pour coller au contrat reel :
  - `sale_date` renseigne dans les ventes de test pour satisfaire `SaleDetail`
  - acces non authentifie constate a `403` sur cette route
  - verification de l'audit par lecture de `audit_logs` au lieu de `caplog`

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/services/cash_session_service.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py`
- `recyclique-1.4.4/api/tests/test_cash_session_close_arch03_domain_errors.py`
- `recyclique-1.4.4/api/tests/test_cash_session_detail.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_cash_session_close_arch03_domain_errors.py`
  - `tests/test_cash_session_detail.py`
- Resultat local :
  - **7 tests passes** + **8 skips PostgreSQL-only**
- Validation Docker/PostgreSQL ciblee :
  - `tests/test_cash_session_close_arch03_domain_errors.py`
  - `tests/test_cash_session_detail.py`
- Resultat Docker :
  - **15 tests passes**
- QA finale seule : **OK**

### Resultat
- Le detail `cash_sessions` suit maintenant le meme patron ARCH-03 que `create` et `close` :
  - service = erreurs metier de lookup
  - endpoint = auth / audit / traduction HTTP
- Le cas `session_id` invalide ne tombe plus en erreur serveur sur la route de detail.
- Le contrat HTTP detail est verrouille explicitement sur `200`, `400`, `403`, `404`.
- Reserves acceptees :
  - `test_cash_session_detail.py` reste un fichier d'integration PostgreSQL-only
  - d'autres routes du meme module (`current`, `update`, `step`) restent encore a aligner sur la meme frontiere ARCH-03

---

## Lot 1U — Pilote ARCH-03 sur `cash_sessions/current`

**Statut:** ferme avec reserves acceptees  
**Theme:** nettoyer la route de session courante pour supprimer le mode debug ad hoc et stabiliser le contrat HTTP sans sur-architecturer le service

### Actions
- Simplification de `GET /cash-sessions/current` dans `cash_sessions.py` :
  - suppression des logs `=== DEBUG ===`
  - suppression du `500` exposant des details techniques au client
  - conservation du contrat `200 + null` quand aucune session ouverte n'existe
  - traduction explicite de `ValidationError` metier -> `400`
  - logging serveur via `logger.exception(...)` sur le chemin `500` inattendu
- Ajout d'un fichier cible `test_cash_session_current_arch03.py` pour verrouiller sans dependance DB complete :
  - `null` HTTP quand le service retourne `None`
  - `400` HTTP quand le service leve `ValidationError`
  - test unitaire `no_db` deja utile sur le service
- Realignement de `test_cash_session_current_endpoint.py` sur `settings.API_V1_STR`.
- Clarification du contrat d'acces non authentifie (`403` constate) dans les tests.
- Correction des fixtures PostgreSQL de `test_cash_session_current_endpoint.py` :
  - creation d'un `Site` minimal
  - rattachement de `site_id` aux `CashSession` de test pour respecter le schema reel

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py`
- `recyclique-1.4.4/api/tests/test_cash_session_current_arch03.py`
- `recyclique-1.4.4/api/tests/test_cash_session_current_endpoint.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_cash_session_current_endpoint.py`
  - `tests/test_cash_session_current_arch03.py`
- Resultat local :
  - **4 tests passes** + **4 skips PostgreSQL-only**
- Validation Docker/PostgreSQL ciblee :
  - `tests/test_cash_session_current_endpoint.py`
  - `tests/test_cash_session_current_arch03.py`
- Resultat Docker :
  - **8 tests passes**
- QA finale seule : **OK**

### Resultat
- La route `cash_sessions/current` ne renvoie plus de `500` ad hoc avec message `DEBUG`.
- Le contrat HTTP utile est maintenant verrouille sur :
  - `200` + objet si session ouverte
  - `200` + `null` si aucune session ouverte
  - `400` sur `ValidationError` metier
  - `403` sans authentification / auth stricte non satisfaite
- Reserves acceptees :
  - les scenarii integration complets de `current` restent PostgreSQL-only
  - l'heuristique interne de `90 jours` dans `get_open_session_by_operator()` reste une reserve metier distincte, hors lot

---

## Lot 1V — Pilote ARCH-03 sur `cash_sessions/step update`

**Statut:** ferme avec reserves acceptees  
**Theme:** sortir la mise a jour d'etape de session de caisse du bord HTTP et homogeniser le contrat d'erreur de la route `PUT /cash-sessions/{session_id}/step`

### Actions
- Introduction de `apply_step_update_to_open_session()` dans `CashSessionService` pour :
  - refuser une session non `OPEN` via `ConflictError`
  - convertir l'etape API vers l'enum modele
  - persister le changement d'etape (`commit` / `refresh`) cote service
- Refactor de `PUT /cash-sessions/{session_id}/step` pour :
  - charger la session via `get_session_by_id_or_raise()`
  - traduire explicitement `NotFoundError` -> `404`
  - traduire explicitement `ValidationError` -> `400`
  - conserver le `403` d'autorisation si un `USER` tente de modifier la session d'un autre operateur
  - traduire `ConflictError` -> `400`
  - supprimer la logique metier/commit ad hoc du endpoint
- Ajout du fichier cible `test_cash_session_step_update_arch03.py` avec couverture stable :
  - tests unitaires service sur session fermee / chemin nominal
  - tests HTTP sur `404`, `400` lookup, `400` conflit, `403` autorisation et `200` nominal

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/services/cash_session_service.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py`
- `recyclique-1.4.4/api/tests/test_cash_session_step_update_arch03.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_cash_session_step_update_arch03.py`
- Resultat local :
  - **7 tests passes**
- Validation Docker/PostgreSQL :
  - non necessaire pour ce lot, la couverture est mockee / no_db et ne depend pas du schema reel
- QA finale seule : **OK**

### Resultat
- La route `PUT /cash-sessions/{session_id}/step` suit maintenant le patron ARCH-03 :
  - service = regles metier de transition / persistance
  - endpoint = auth / orchestration / traduction HTTP
- Le contrat HTTP utile est verrouille explicitement sur `200`, `400`, `403`, `404`.
- Reserves acceptees :
  - la couverture `200` et `403` reste route-level avec service mocke, pas integration DB complete
  - `GET /cash-sessions/{session_id}/step` n'est pas traite dans ce lot et reste asymetrique vis-a-vis du `PUT`

---

## Lot 1W — Pilote ARCH-03 sur `stats_service`

**Statut:** ferme avec reserves acceptees  
**Theme:** sortir la validation de plage de dates du service stats hors HTTP et homogeniser la traduction `400` sur les routes statistiques associees

### Actions
- Refactor de `StatsService` pour remplacer le `HTTPException` metier de validation de plage par `ValidationError`.
- Introduction d'un helper `_run_stats_service()` dans `endpoints/stats.py` pour traduire `ValidationError` -> `400` sur les trois routes ciblees :
  - `GET /stats/reception/summary`
  - `GET /stats/reception/by-category`
  - `GET /stats/sales/by-category`
- Ajustement des filtres de bornes `end_date` dans `stats_service.py` pour rendre les requetes `YYYY-MM-DD` coherentes avec un comportement de jour calendaire inclusif.
- Realignement des tests stats sur le contrat reel :
  - `settings.API_V1_STR` au lieu de chemins codes en dur
  - utilisateurs authentifies non admin autorises sur les endpoints reception stats concernes
  - `SaleItem.category` renseigne avec des UUID de categories dans les tests PostgreSQL
  - `CashSession.site_id` relie a un vrai `Site` dans les fixtures PostgreSQL
- Ajout / adaptation des tests cibles pour verrouiller le `400` sur plage invalide et stabiliser la campagne PostgreSQL.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/services/stats_service.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/stats.py`
- `recyclique-1.4.4/api/tests/test_sales_stats_by_category.py`
- `recyclique-1.4.4/api/tests/api/test_stats_endpoints.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_sales_stats_by_category.py`
  - `tests/api/test_stats_endpoints.py`
- Resultat local :
  - non conclusif sur SQLite minimal (schema incomplet pour ces tests)
- Validation Docker/PostgreSQL ciblee :
  - `tests/test_sales_stats_by_category.py`
  - `tests/api/test_stats_endpoints.py`
- Resultat Docker :
  - **25 tests passes**
- QA finale seule : **OK**

### Resultat
- `StatsService` ne leve plus d'erreur HTTP directe pour les plages de dates invalides.
- Les trois endpoints stats concernes traduisent maintenant uniformement les erreurs metier de validation en `400`.
- Le comportement des filtres `date-only` est aligne sur une lecture inclusive de la journee calendaire.
- Reserves acceptees :
  - le lot reste borne a la validation de plage de dates et aux routes stats associees
  - `/stats/live` et les autres services statistiques ne sont pas touches ici

---

## Lot 1X — Pilote ARCH-03 sur `cash_register_service`

**Statut:** ferme avec reserves acceptees  
**Theme:** sortir le lookup obligatoire et le blocage de suppression des postes de caisse hors HTTP pour homogeniser les routes `cash_registers`

### Actions
- Introduction de `get_required()` dans `CashRegisterService` pour lever `NotFoundError("Poste de caisse introuvable")` quand la ressource est obligatoire.
- Conversion du blocage de suppression `_check_dependencies()` vers `ConflictError` avec conservation du message metier existant.
- Refactor des routes `cash_registers` suivantes :
  - `GET /cash-registers/{register_id}` -> `NotFoundError` traduit en `404`
  - `PATCH /cash-registers/{register_id}` -> `NotFoundError` traduit en `404`
  - `DELETE /cash-registers/{register_id}` -> `NotFoundError` traduit en `404`, `ConflictError` traduit en `409`
- Ajout du fichier cible `test_cash_register_arch03.py` pour verrouiller :
  - service `get_required()` sur ressource absente
  - service `delete()` sur conflit / succes
  - routes HTTP `GET -> 404`, `PATCH -> 404`, `DELETE -> 409`

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/services/cash_register_service.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/cash_registers.py`
- `recyclique-1.4.4/api/tests/test_cash_register_arch03.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_cash_register_arch03.py`
- Resultat local :
  - **6 tests passes**
- Validation Docker/PostgreSQL :
  - non necessaire pour ce lot, la couverture ajoutee est mockee / unitaire
- QA finale seule : **OK**

### Resultat
- `cash_register_service` ne leve plus d'erreur HTTP directe sur les chemins metier traites.
- Les routes `cash_registers` ciblees suivent maintenant un patron ARCH-03 explicite pour `404` et `409`.
- Reserves acceptees :
  - la couverture HTTP reste route-level avec service mocke
  - `GET /cash-registers/status` reste hors perimetre de ce lot

---

## Lot 1Y — Pilote ARCH-03 sur `category_management`

**Statut:** ferme avec reserves acceptees  
**Theme:** sortir les erreurs metier des trois routes de gestion d'affichage des categories hors HTTP, sans ouvrir encore le gros chantier `CategoryService`

### Actions
- Refactor de `CategoryManagementService` pour remplacer les `HTTPException` par :
  - `ValidationError` sur UUID invalide
  - `NotFoundError` sur categorie absente
  - `ConflictError` sur la regle "au moins une categorie visible" lors du masquage
- Refactor des trois routes `PUT` associees dans `categories.py` :
  - `PUT /{category_id}/visibility`
  - `PUT /{category_id}/display-order`
  - `PUT /{category_id}/display-order-entry`
- Traduction HTTP preservee au niveau route :
  - `ValidationError` -> `400`
  - `NotFoundError` -> `404`
  - `ConflictError` -> `422` pour la visibilite afin de conserver le contrat historique
- Ajout du fichier cible `test_category_management_arch03.py` pour verrouiller :
  - exceptions metier cote service
  - mappings HTTP `400`, `404`, `422` sur les trois routes `PUT`

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/services/category_management.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/categories.py`
- `recyclique-1.4.4/api/tests/test_category_management_arch03.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_category_management_arch03.py`
- Resultat local :
  - **12 tests passes**
- Validation Docker/PostgreSQL :
  - non necessaire pour ce lot, la couverture ajoutee est mockee / unitaire
- QA finale seule : **OK**

### Resultat
- `CategoryManagementService` ne leve plus d'erreur HTTP directe sur le sous-ensemble management traite.
- Les trois routes `PUT` categories ciblees suivent maintenant un patron ARCH-03 explicite.
- Reserves acceptees :
  - la couverture reste route-level avec service mocke
  - `CategoryService` et les flux create/update/delete/restore restent a traiter dans des micro-lots separes

---

## Lot 1Z — Pilote ARCH-03 sur `CategoryService.hard_delete_category`

**Statut:** ferme avec reserves acceptees  
**Theme:** sortir le hard delete des categories hors HTTP, sans melanger le soft delete ni le reste du CRUD categories

### Actions
- Refactor de `CategoryService.hard_delete_category()` pour remplacer les `HTTPException` par :
  - `ValidationError` sur identifiant invalide
  - `NotFoundError` sur categorie absente
  - `ConflictError` si la categorie possede encore des sous-categories
- Refactor de `DELETE /categories/{category_id}/hard` dans `categories.py` pour traduire explicitement :
  - `ValidationError` -> `400`
  - `NotFoundError` -> `404`
  - `ConflictError` -> `422`
- Ajout du fichier cible `test_category_hard_delete_arch03.py` pour verrouiller :
  - service `hard_delete_category()` sur UUID invalide / categorie absente / categorie avec enfants / suppression reussie
  - route HTTP `DELETE .../hard` sur `400`, `404`, `422` et succes `204`

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/services/category_service.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/categories.py`
- `recyclique-1.4.4/api/tests/test_category_hard_delete_arch03.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_category_hard_delete_arch03.py`
- Resultat local :
  - **8 tests passes**
- Validation Docker/PostgreSQL :
  - non necessaire pour ce lot, la couverture ajoutee est mockee / unitaire
- QA finale seule : **OK**

### Resultat
- `CategoryService.hard_delete_category()` ne leve plus d'erreur HTTP directe.
- Le contrat HTTP de `DELETE .../hard` est preserve sur `400`, `404`, `422`, `204`.
- Reserves acceptees :
  - la couverture reste route-level avec service mocke
  - un `IntegrityError` SQL sur d'autres dependances DB potentielles resterait traite hors de ce lot

---

## Lot 2AA — Pilote ARCH-03 sur `CategoryService.restore_category`

**Statut:** ferme avec reserves acceptees  
**Theme:** sortir la restauration de categorie hors HTTP en preservant le contrat historique `200/404/400`

### Actions
- Refactor de `CategoryService.restore_category()` pour remplacer le `HTTPException` du cas "deja active" par `ValidationError`, avec conservation du message existant.
- Conservation volontaire du comportement `None` sur categorie absente ou identifiant invalide afin de preserver le `404` historique de la route.
- Refactor de `POST /categories/{category_id}/restore` dans `categories.py` pour traduire `ValidationError` -> `400`, tout en gardant `404` si le service retourne `None`.
- Ajout du fichier cible `test_category_restore_arch03.py` pour verrouiller :
  - mapping route `400` sur `ValidationError`
  - mapping route `404` sur `None`
  - succes nominal sur le contrat HTTP
- Adaptation de `tests/test_category_soft_delete_b48_p1.py` sur le sous-ensemble `TestCategoryRestore` pour utiliser `await` et verifier `ValidationError` au niveau service.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/services/category_service.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/categories.py`
- `recyclique-1.4.4/api/tests/test_category_restore_arch03.py`
- `recyclique-1.4.4/api/tests/test_category_soft_delete_b48_p1.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_category_restore_arch03.py`
  - `tests/test_category_hard_delete_arch03.py`
- Resultat local :
  - **12 tests passes**
- Validation Docker/PostgreSQL :
  - non necessaire pour ce lot, la couverture ajoutee est route-level / unitaire
- QA finale seule : **OK**

### Resultat
- `CategoryService.restore_category()` ne leve plus d'erreur HTTP directe.
- Le contrat HTTP de `POST .../restore` est preserve sur `200`, `404`, `400`.
- Reserves acceptees :
  - la couverture HTTP reste surtout route-level avec service mocke
  - les autres tests async du fichier B48 restent une dette voisine hors du perimetre strict de ce lot

---

## Lot 2AB — Pilote ARCH-03 sur `CategoryService.soft_delete_category`

**Statut:** ferme avec reserves acceptees  
**Theme:** sortir le soft delete des categories hors HTTP tout en preservant strictement le `422` avec detail structure

### Actions
- Extension minimale de `ConflictError` pour accepter un `detail` de type `str` ou `dict`, sans casser les usages existants.
- Refactor de `CategoryService.soft_delete_category()` pour remplacer le `HTTPException` sur enfants actifs par `ConflictError(detail_struct)`.
- Refactor de `DELETE /categories/{category_id}` dans `categories.py` pour traduire `ConflictError` -> `422` avec `detail=exc.detail`.
- Ajout du fichier cible `test_category_soft_delete_arch03.py` pour verrouiller :
  - levee service `ConflictError` avec detail structure
  - mapping route `422` avec payload structure conserve
  - succes nominal
- Adaptation de `tests/test_category_soft_delete_b48_p1.py` et de `tests/api/test_categories_endpoint.py` pour coller au contrat HTTP reel et au passage par `ConflictError`.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/core/exceptions.py`
- `recyclique-1.4.4/api/src/recyclic_api/services/category_service.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/categories.py`
- `recyclique-1.4.4/api/tests/test_category_soft_delete_arch03.py`
- `recyclique-1.4.4/api/tests/test_category_soft_delete_b48_p1.py`
- `recyclique-1.4.4/api/tests/api/test_categories_endpoint.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_category_soft_delete_arch03.py`
  - `tests/test_category_hard_delete_arch03.py`
  - `tests/test_category_management_arch03.py`
- Resultat local :
  - **26 tests passes**
- Validation Docker/PostgreSQL :
  - non conclusif dans cet environnement sur `test_categories_endpoint.py` a cause d'une incompatibilite fixture `AsyncClient(app=...)` / version `httpx`, preexistante au lot
- QA finale seule : **OK**

### Resultat
- `CategoryService.soft_delete_category()` ne leve plus d'erreur HTTP directe.
- Le contrat HTTP de `DELETE /categories/{category_id}` conserve le `422` avec `detail` structure (`detail`, `category_id`, `active_children_count`).
- Reserves acceptees :
  - ambiguite metier residuelle entre "enfants actifs" et "enfants non archives" dans le filtre actuel
  - la couverture d'integration async du fichier `test_categories_endpoint.py` reste limitee par l'environnement local

---

## Lot 2AC — Pilote ARCH-03 sur `CategoryService.create_category`

**Statut:** ferme avec reserves acceptees  
**Theme:** sortir la creation de categorie hors HTTP en preservant le contrat metier et le `400` historique sur les erreurs de validation

### Actions
- Refactor de `CategoryService.create_category()` pour remplacer les `HTTPException(400, ...)` par `ValidationError`, avec conservation des messages existants :
  - doublon de nom
  - parent absent ou inactif
  - `parent_id` invalide
  - profondeur maximale atteinte
  - `IntegrityError` mappee sur le meme message de doublon
- Conservation volontaire de la logique metier existante qui retire les prix du parent quand on cree un enfant sous une categorie tarifee.
- Refactor de `POST /categories/` dans `categories.py` pour traduire `ValidationError` -> `400`, en preservant `201` sur succes.
- Ajout du fichier cible `test_category_create_arch03.py` pour verrouiller :
  - levees `ValidationError` cote service
  - mapping HTTP `400` sur la route
  - comportement parent tarife conserve

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/services/category_service.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/categories.py`
- `recyclique-1.4.4/api/tests/test_category_create_arch03.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_category_create_arch03.py`
- Resultat local :
  - **7 tests passes**
- Validation Docker/PostgreSQL :
  - non conclusif dans cet environnement sur `test_categories_endpoint.py` a cause de la fixture `AsyncClient(app=...)` / `httpx`, preexistante au lot
- QA finale seule : **OK**

### Resultat
- `CategoryService.create_category()` ne leve plus d'erreur HTTP directe.
- Le contrat HTTP de `POST /categories/` est preserve sur `201` et `400` pour les erreurs metier de validation.
- Reserves acceptees :
  - `IntegrityError` reste mappee de facon large sur le message de doublon
  - la logique transactionnelle en deux temps (retrait prix parent puis creation enfant) reste une dette voisine hors du perimetre strict du lot

---

## Lot 2AD — Pilote ARCH-03 sur `CategoryService.update_category`

**Statut:** ferme avec reserves acceptees  
**Theme:** sortir la mise a jour de categorie hors HTTP en preservant strictement `404`, `400` et `422` selon les branches metier existantes

### Actions
- Refactor de `CategoryService.update_category()` pour remplacer les `HTTPException` par :
  - `ValidationError` sur les erreurs metier historiquement en `400`
  - `ConflictError` sur la regle metier `422` quand on tente de poser des prix sur une categorie ayant des enfants
- Conservation volontaire du comportement `None` sur categorie absente ou identifiant invalide afin de preserver le `404` historique de la route.
- Refactor de `PUT /categories/{category_id}` dans `categories.py` pour traduire explicitement :
  - `ValidationError` -> `400`
  - `ConflictError` -> `422`
  - `None` -> `404`
- Suppression de l'import `HTTPException` devenu inutile dans `category_service.py`.
- Ajout du fichier cible `test_category_update_arch03.py` pour verrouiller :
  - levees service `ValidationError` / `ConflictError`
  - mapping route `400`, `422`, `404`
  - preservation de la regle metier parent tarifee deja en place

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/services/category_service.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/categories.py`
- `recyclique-1.4.4/api/tests/test_category_update_arch03.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_category_update_arch03.py`
  - `tests/test_category_create_arch03.py`
- Resultat local :
  - **14 tests passes**
- Validation Docker/PostgreSQL :
  - non conclusif dans cet environnement sur les tests d'integration async / DB, pour des raisons preexistantes de fixture `AsyncClient(app=...)` et de schema local incomplet
- QA finale seule : **OK**

### Resultat
- `CategoryService.update_category()` ne leve plus d'erreur HTTP directe.
- Le contrat HTTP de `PUT /categories/{id}` est preserve sur `404`, `400`, `422`.
- Reserves acceptees :
  - la regle "prix + enfants" continue de ne considerer que les enfants `is_active == True`
  - `IntegrityError` reste mappee largement sur le message de doublon

---

## Lot 2AE — Passe DRY sur les traductions HTTP domaine -> route

**Statut:** ferme avec reserves acceptees  
**Theme:** reduire la duplication des mappings `NotFoundError` / `ConflictError` / `ValidationError` vers `HTTPException` dans `reception.py` et `cash_sessions.py` sans modifier les contrats HTTP existants

### Actions
- Ajout d'un helper dedie `recyclic_api/utils/domain_exception_http.py` pour centraliser le mapping :
  - `NotFoundError` -> `detail=str(exc)`
  - `ConflictError` -> `detail=exc.detail`
  - `ValidationError` -> `detail=str(exc)`
- Adoption du helper dans `reception.py` avec conservation explicite des statuts propres a chaque route :
  - `ConflictError` -> `409`
  - `ValidationError` -> `400` ou `422` selon le endpoint
  - `NotFoundError` -> `404`
- Adoption du helper dans `cash_sessions.py` avec conservation explicite des statuts existants :
  - `ConflictError` -> `400`
  - `ValidationError` -> `400`
  - `NotFoundError` -> `404`
- Aucun refactor des blocs d'audit / logs de `cash_sessions`, volontairement laisses en place.
- Ajout du fichier cible `test_domain_exception_http.py` pour verrouiller le helper (detail chaine, detail structure, chainage d'exception).

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/utils/domain_exception_http.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/reception.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py`
- `recyclique-1.4.4/api/tests/test_domain_exception_http.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_domain_exception_http.py`
  - `tests/test_reception_arch03_domain_errors.py`
  - `tests/test_cash_session_close_arch03_domain_errors.py`
  - `tests/test_cash_session_step_update_arch03.py`
- Resultat local :
  - **42 tests passes**
- Validation Docker/PostgreSQL :
  - non necessaire pour ce lot, le helper est couvert en unitaire et la non-regression des mappings est couverte par les tests cibles locaux
- QA finale seule : **OK**

### Resultat
- La duplication des mappings domaine -> HTTP est reduite sans modifier les codes retour des routes deja migrees.
- Les verticales `reception` et `cash_sessions` gardent leurs specificites de statuts (`409` vs `400`, `400` vs `422` sur `ValidationError`) sans helper "magique" qui uniformiserait de travers.
- Reserves acceptees :
  - quelques appels au helper passent un `validation_status` inerte si le `except` ne capture pas `ValidationError`
  - les blocs d'audit/logs restent volontairement dupliques pour eviter un sur-refactor risqué

---

## Lot 2AF — Pilote ARCH-04 sur `create_sale`

**Statut:** ferme avec reserves acceptees  
**Theme:** extraire la creation de vente hors du routeur `sales.py` vers un service applicatif dedie, sans changer le contrat HTTP de `POST /sales/`

### Actions
- Creation de `recyclic_api/services/sale_service.py` avec `SaleService.create_sale()` pour porter :
  - validation metier du flux vente
  - creation `Sale`, `SaleItem`, `PaymentTransaction`
  - mise a jour des agregats de session caisse
  - rechargement ORM de la vente pour la reponse
- Amincissement de `endpoints/sales.py` :
  - auth Bearer / orchestration legere seulement
  - delegation de la logique metier a `SaleService`
- Nettoyage de `endpoints/transactions.py` pour ne plus reutiliser directement le handler FastAPI `create_sale`.
- Ajustement du schema `SaleResponse` pour accepter `sale_date: null` quand la donnee SQL est effectivement nullable.
- Fix des horodatages `created_at` / `updated_at` a la creation cote service pour eviter les timestamps identiques sous transaction PostgreSQL.
- Ajout du fichier cible `tests/test_sale_service.py` et adaptation de `tests/test_sales_integration.py` a un contrat coherent sur les paiements insuffisants.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/services/sale_service.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/sales.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/transactions.py`
- `recyclique-1.4.4/api/src/recyclic_api/schemas/sale.py`
- `recyclique-1.4.4/api/tests/test_sale_service.py`
- `recyclique-1.4.4/api/tests/test_sales_integration.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_sale_service.py`
  - `tests/test_sales_integration.py`
- Resultat local SQLite :
  - non conclusif (schema incomplet pour les tests ventes)
- Validation Docker/PostgreSQL ciblee :
  - `tests/test_sale_service.py`
  - `tests/test_sales_integration.py`
- Resultat Docker/PostgreSQL :
  - **23 tests passes**
- QA finale seule : **OK**

### Resultat
- La logique lourde de creation de vente n'est plus inline dans `sales.py`.
- Le contrat HTTP de `POST /sales/` est preserve sur le flux principal valide par PostgreSQL.
- Reserves acceptees :
  - `SaleService` leve encore des `HTTPException` (pilote `ARCH-04`, pas encore `ARCH-03`)
  - `POST /transactions/` reste un endpoint heritage qui retourne explicitement `401` sans flux metier utile
  - la transaction reste en deux temps (vente puis agregats session), comme avant

---

## Lot 2AG — Pilote ARCH-04 sur `create_cash_session`

**Statut:** ferme avec reserves acceptees  
**Theme:** extraire l'orchestration d'ouverture de session caisse hors de `cash_sessions.py`, avec validation conjointe du flux de ventes differees qui en depend

### Actions
- Creation de `recyclic_api/application/cash_session_opening.py` pour porter :
  - permissions de saisie differée
  - garde "session deja ouverte" sur le flux non differe
  - appel a `CashSessionService.create_session`
  - audits `log_cash_session_opening`
  - traduction des erreurs domaine vers HTTP
  - fallback de serialisation de reponse
- Extraction de `enrich_session_response` vers `recyclic_api/services/cash_session_response_enrichment.py` pour reutilisation sans import circulaire.
- Amincissement de `POST /cash-sessions/` dans `endpoints/cash_sessions.py` au profit du use case `open_cash_session`.
- Ajustement transverse de `SaleService.create_sale()` et du schema `SaleResponse` pour conserver le contrat des ventes differees :
  - `sale_date`, `created_at`, `updated_at` alignes sur `opened_at` si la session est consideree comme differee
  - `sale_date` nullable cote schema quand la donnee historique l'est reellement
- Ajout du fichier cible `tests/test_cash_session_create_arch04.py` et adaptation de `tests/test_b52_p3_sale_date.py` pour verrouiller l'alignement temporel des ventes differees.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/application/__init__.py`
- `recyclique-1.4.4/api/src/recyclic_api/application/cash_session_opening.py`
- `recyclique-1.4.4/api/src/recyclic_api/services/cash_session_response_enrichment.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py`
- `recyclique-1.4.4/api/src/recyclic_api/services/sale_service.py`
- `recyclique-1.4.4/api/src/recyclic_api/schemas/sale.py`
- `recyclique-1.4.4/api/tests/test_cash_session_create_arch04.py`
- `recyclique-1.4.4/api/tests/test_b52_p3_sale_date.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_cash_session_create_arch04.py`
  - `tests/test_cash_session_create_arch03.py`
- Resultat local :
  - **8 tests passes** + **1 skip**
- Validation Docker/PostgreSQL ciblee :
  - `tests/test_cash_session_create_arch04.py`
  - `tests/test_cash_session_create_arch03.py`
  - `tests/test_cash_session_deferred.py`
  - `tests/test_sale_service.py`
  - `tests/test_b52_p3_sale_date.py`
  - `tests/test_sales_integration.py`
- Resultat Docker/PostgreSQL :
  - **46 tests passes**
- QA finale seule : **OK**

### Resultat
- L'ouverture de session caisse n'est plus inline dans le routeur.
- Le flux des ventes differees reste coherent avec `opened_at` apres extraction.
- Reserves acceptees :
  - la notion de session differee reste fondee sur un seuil de 24 h, pas sur le seul fait de fournir `opened_at`
  - `_CASH_DOMAIN_HTTP` reste duplique entre le routeur et le use case pour eviter un refactor plus large dans ce lot

---

## Lot 2AH — Pilote ARCH-04 sur `close_cash_session`

**Statut:** ferme avec reserves acceptees  
**Theme:** extraire le noyau d'orchestration de fermeture de session caisse hors de `cash_sessions.py` tout en laissant rapport et email au routeur pour ce premier passage

### Actions
- Creation de `recyclic_api/application/cash_session_closing.py` avec un use case de fermeture qui porte :
  - chargement session + controle operateur
  - validation metier de fermeture
  - audit succes / echec du noyau metier
  - execution de `close_session_with_amounts`
  - gestion du cas session vide supprimee
  - traduction des erreurs domaine vers HTTP
- Amincissement de `POST /cash-sessions/{session_id}/close` dans `endpoints/cash_sessions.py` :
  - delegation du noyau de fermeture au use case
  - conservation dans le routeur de la generation rapport CSV, URL, envoi email et enrichissement final de reponse
- Ajout du fichier cible `tests/test_cash_session_close_arch04.py` pour verrouiller le noyau extrait.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/application/cash_session_closing.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py`
- `recyclique-1.4.4/api/tests/test_cash_session_close_arch04.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_cash_session_close_arch04.py`
  - `tests/test_cash_session_close_arch03_domain_errors.py`
  - `tests/test_cash_session_create_arch04.py`
- Resultat local :
  - **13 tests passes**
- Validation Docker/PostgreSQL ciblee :
  - `tests/test_cash_session_close_arch04.py`
  - `tests/test_cash_session_close_arch03_domain_errors.py`
  - `tests/test_cash_session_close.py`
- Resultat Docker/PostgreSQL :
  - **20 tests passes**
- QA finale seule : **OK**

### Resultat
- Le noyau d'orchestration de fermeture n'est plus inline dans le routeur.
- Le contrat HTTP de `POST .../close` reste stable sur les scenarios verifies.
- Reserves acceptees :
  - la couche application leve encore un `HTTPException` 403 pour coller au contrat existant
  - le rapport CSV, l'URL et l'email restent dans le routeur pour ce premier pilote
  - en cas d'erreur apres fermeture reussie mais avant reponse finale, l'audit d'echec global n'est plus centralise exactement comme avant

---

## Lot 2AI — Pilote ARCH-04 sur la presentation post-fermeture `close_cash_session`

**Statut:** ferme avec reserves acceptees  
**Theme:** extraire hors du routeur le bloc de presentation post-fermeture (rapport, URL, email, enrichissement) pour parachever le pilote `close_cash_session`

### Actions
- Creation de `recyclic_api/application/cash_session_close_presentation.py` pour porter :
  - generation du rapport CSV
  - token / URL de telechargement
  - tentative d'envoi d'email
  - enrichissement de la reponse finale
  - reponse JSON 200 du cas session vide
- Amincissement complementaire de `POST /cash-sessions/{session_id}/close` dans `endpoints/cash_sessions.py` au profit de `present_close_cash_session_outcome(...)`.
- Reexport de `generate_cash_session_report` et `get_email_service` dans `cash_sessions.py` pour conserver la compatibilite des monkeypatchs de tests existants.
- Ajout du fichier cible `tests/test_cash_session_close_presentation_arch04.py` pour verrouiller la presentation post-close.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/application/cash_session_close_presentation.py`
- `recyclique-1.4.4/api/src/recyclic_api/application/cash_session_closing.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py`
- `recyclique-1.4.4/api/tests/test_cash_session_close_presentation_arch04.py`
- `recyclique-1.4.4/api/tests/test_cash_session_close_arch04.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_cash_session_close_presentation_arch04.py`
  - `tests/test_cash_session_close_arch04.py`
- Resultat local :
  - **5 tests passes**
- Validation Docker/PostgreSQL ciblee :
  - `tests/test_cash_session_close_presentation_arch04.py`
  - `tests/test_cash_session_close_arch04.py`
  - `tests/test_cash_session_close_arch03_domain_errors.py`
  - `tests/test_cash_session_close.py`
  - `tests/test_cash_session_empty.py`
- Resultat Docker/PostgreSQL :
  - **34 tests passes**
- QA finale seule : **OK**

### Resultat
- Le routeur `close_cash_session` ne conserve plus que le strict bord HTTP et la delegation vers les deux couches applicatives.
- Le contrat HTTP du flux fermeture reste stable, y compris le cas session vide et le flux rapport/email.
- Reserves acceptees :
  - import local depuis `cash_sessions.py` pour garder la compatibilite de monkeypatch des tests
  - `response_model=CashSessionResponse` ne reflete toujours pas la reponse JSON speciale du cas session vide

---

## Lot 2AJ — Pilote ARCH-04 sur l'export ticket `reception`

**Statut:** ferme avec reserves acceptees  
**Theme:** extraire hors du routeur `reception.py` la presentation du flux `download-token` + `export-csv` d'un ticket pour garantir un nom de fichier unique entre token, JSON et telechargement

### Actions
- Creation de `recyclic_api/application/reception_ticket_export_presentation.py` pour porter :
  - calcul unique du nom de fichier export ticket
  - construction du payload JSON de telechargement (`token`, `download_url`, `filename`, `expires_in_seconds`)
  - rendu CSV UTF-8 BOM du ticket
- Amincissement de `POST /reception/tickets/{ticket_id}/download-token` et `GET /reception/tickets/{ticket_id}/export-csv` dans `endpoints/reception.py`.
- Alignement du `download_url` genere sur `settings.API_V1_STR` au lieu d'un prefixe fige.
- Ajout du fichier cible `tests/test_reception_ticket_export_presentation_arch04.py`.
- Adaptation des tests d'historique pour valider le flux nominal `download-token` puis `export-csv?token=...`.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/application/reception_ticket_export_presentation.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/reception.py`
- `recyclique-1.4.4/api/tests/test_reception_ticket_export_presentation_arch04.py`
- `recyclique-1.4.4/api/tests/test_reception_tickets_history.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_reception_ticket_export_presentation_arch04.py`
- Resultat local :
  - **4 tests passes**
- Validation Docker/PostgreSQL ciblee :
  - `tests/test_reception_ticket_export_presentation_arch04.py`
  - `tests/test_reception_ticket_export_csv.py`
  - `tests/test_reception_tickets_history.py`
- Resultat Docker/PostgreSQL :
  - **31 tests passes**
- QA finale seule : **OK**

### Resultat
- Le flux `download-token` -> `export-csv?token=...` n'est plus assemble inline dans le routeur.
- Le nom de fichier export ticket est maintenant unique et partage entre token, payload JSON et reponse telechargee.
- Reserves acceptees :
  - `render_reception_ticket_csv_bytes(...)` depend encore de `ReceptionService._calculate_ticket_totals`
  - certains tests integration n'assertent pas encore explicitement l'egalite `filename` JSON vs `Content-Disposition`

---

## Lot 2AK — Pilote ARCH-04 sur l'export CSV des lignes `reception`

**Statut:** ferme avec reserves acceptees  
**Theme:** extraire hors du routeur `reception.py` la presentation CSV de `GET /reception/lignes/export-csv` tout en conservant les filtres et le contrat actuel

### Actions
- Creation de `recyclic_api/application/reception_lignes_export_presentation.py` pour porter :
  - rendu CSV des lignes de depot
  - construction du nom de fichier export avec horodatage UTC et suffixes de filtres
- Amincissement de `GET /reception/lignes/export-csv` dans `endpoints/reception.py`.
- Conservation dans le routeur de :
  - l'auth admin
  - la validation UUID de `category_id`
  - l'appel `ReceptionService.get_lignes_depot_for_export(...)`
  - la resolution optionnelle du nom de categorie pour le filename
- Ajout du fichier cible `tests/test_reception_lignes_export_presentation_arch04.py`.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/application/reception_lignes_export_presentation.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/reception.py`
- `recyclique-1.4.4/api/tests/test_reception_lignes_export_presentation_arch04.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_reception_lignes_export_presentation_arch04.py`
- Resultat local :
  - **4 tests passes**
- Validation Docker/PostgreSQL ciblee :
  - `tests/test_reception_lignes_export_presentation_arch04.py`
  - `tests/test_reception_reports.py`
- Resultat Docker/PostgreSQL :
  - **17 tests passes**
- QA finale seule : **OK**

### Resultat
- L'export CSV des lignes n'est plus assemble inline dans le routeur.
- Le contrat de filtres, colonnes et nom de fichier reste stable sur les scenarios verifies.
- Reserves acceptees :
  - `Content-Disposition` reste sans guillemets autour du `filename`, comme avant
  - la resolution du nom de categorie pour le filename repose encore sur `db.query(Category).get(...)`

---

## Lot 2AL — Pilote ARCH-04 sur la presentation des listes JSON `reception`

**Statut:** ferme avec reserves acceptees  
**Theme:** extraire hors du routeur `reception.py` le mapping de presentation des listes `GET /reception/tickets` et `GET /reception/lignes`

### Actions
- Creation de `recyclic_api/application/reception_lists_presentation.py` pour porter :
  - calcul de pagination
  - mapping `TicketDepot -> TicketSummaryResponse`
  - assemblage `TicketListResponse`
  - mapping `LigneDepot -> LigneDepotReportResponse`
  - assemblage `LigneDepotListResponse`
- Amincissement de `GET /reception/tickets` et `GET /reception/lignes` dans `endpoints/reception.py`.
- Conservation dans le routeur de :
  - l'auth et les query params
  - la validation UUID des filtres
  - les appels `ReceptionService.get_tickets_list(...)` et `get_lignes_depot_filtered(...)`
- Ajout du fichier cible `tests/test_reception_lists_presentation_arch04.py`.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/application/reception_lists_presentation.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/reception.py`
- `recyclique-1.4.4/api/tests/test_reception_lists_presentation_arch04.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_reception_lists_presentation_arch04.py`
- Resultat local :
  - **5 tests passes**
- Validation Docker/PostgreSQL ciblee :
  - `tests/test_reception_reports.py`
  - `tests/test_reception_tickets_history.py`
- Resultat Docker/PostgreSQL :
  - **35 tests passes**
- Diagnostic complementaire hors perimetre :
  - `tests/test_reception_tickets_status_filter.py` et `tests/test_reception_tickets_advanced_filters.py` montrent une dette de tests preexistante / designee a traiter dans un lot separe
- QA finale seule : **OK**

### Resultat
- Les listes JSON `reception` ne sont plus assemblees inline dans le routeur.
- Les contrats verifies sur les suites historiques `reports` + `tickets_history` restent stables.
- Reserves acceptees :
  - la couche presentation continue d'appeler `ReceptionService._calculate_ticket_totals`
  - les suites `status_filter` / `advanced_filters` restent a realigner sur le contrat reel dans un lot suivant

---

## Lot 2AM — Realignement des tests `reception` sur le contrat reel

**Statut:** ferme  
**Theme:** remettre en coherence les suites `status_filter` et `advanced_filters` avec le prefixe d'API, l'auth stricte et le comportement `include_empty` de `GET /reception/tickets`

### Actions
- Alignement de `tests/test_reception_tickets_advanced_filters.py` sur `settings.API_V1_STR` au lieu d'un chemin fixe `/v1`.
- Alignement de `tests/test_reception_tickets_status_filter.py` sur `settings.API_V1_STR`.
- Ajout de `include_empty=true` dans les scenarios qui creent des tickets sans lignes mais attendent leur presence dans la liste.
- Alignement du test sans token sur le contrat reel de la zone `reception` : `403` au lieu de `401`.
- Correction d'assertions erronees de type `any(bool)` dans `tests/test_reception_tickets_advanced_filters.py`.

### Fichiers touches
- `recyclique-1.4.4/api/tests/test_reception_tickets_status_filter.py`
- `recyclique-1.4.4/api/tests/test_reception_tickets_advanced_filters.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation Docker/PostgreSQL ciblee :
  - `tests/test_reception_tickets_status_filter.py`
  - `tests/test_reception_tickets_advanced_filters.py`
- Resultat Docker/PostgreSQL :
  - **11 tests passes**
- Validation Docker/PostgreSQL consolidee de la zone `reception` :
  - `tests/test_reception_lists_presentation_arch04.py`
  - `tests/test_reception_lignes_export_presentation_arch04.py`
  - `tests/test_reception_ticket_export_presentation_arch04.py`
  - `tests/test_reception_reports.py`
  - `tests/test_reception_tickets_history.py`
  - `tests/test_reception_tickets_status_filter.py`
  - `tests/test_reception_tickets_advanced_filters.py`
- Resultat Docker/PostgreSQL consolide :
  - **59 tests passes**
- QA finale seule : **OK**

### Resultat
- La zone `reception` est maintenant alignee sur une campagne PostgreSQL consolidee.
- Les dettes de tests immediates sur `status_filter` et `advanced_filters` sont resolues.

---

## Lot 2AN — ARCH-03 sur `SaleService.create_sale`

**Statut:** ferme avec reserves acceptees  
**Theme:** retirer les `HTTPException` metier de `SaleService.create_sale` et traduire ces erreurs uniquement au niveau de `POST /sales/`

### Actions
- Remplacement des `HTTPException` levees dans `SaleService.create_sale` et `_resolve_payments` par des exceptions domaine :
  - `NotFoundError` pour session absente
  - `ConflictError` pour session fermee
  - `ValidationError` pour paiements insuffisants / erreurs de validation metier
- Amincissement de `POST /sales/` dans `endpoints/sales.py` avec traduction centralisee via `raise_domain_exception_as_http`.
- Ajout du fichier cible `tests/test_sale_create_arch03.py` pour verrouiller les traductions HTTP 404 / 400 / 422.
- Adaptation de `tests/test_sale_service.py` aux exceptions domaine.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/services/sale_service.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/sales.py`
- `recyclique-1.4.4/api/tests/test_sale_service.py`
- `recyclique-1.4.4/api/tests/test_sale_create_arch03.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_sale_create_arch03.py`
- Resultat local :
  - **3 tests passes**
- Validation Docker/PostgreSQL ciblee :
  - `tests/test_sale_create_arch03.py`
  - `tests/test_sale_service.py`
  - `tests/test_sales_integration.py`
- Resultat Docker/PostgreSQL :
  - **29 tests passes**
- QA finale seule : **OK**

### Resultat
- `SaleService.create_sale` n'exprime plus ses erreurs metier en `HTTPException`.
- Le contrat HTTP de `POST /sales/` reste stable sur les scenarios verifies :
  - `404` session absente
  - `422` session fermee
  - `400` validation / paiements
- Reserves acceptees :
  - le `404` session absente est couvert en HTTP via mock, pas encore par un scenario integration complet
  - d'autres routes `sales.py` restent a traiter dans des micro-lots suivants

---

## Lot 2AO — Fermeture de la reserve integration `sales` sur le `404`

**Statut:** ferme  
**Theme:** couvrir en integration PostgreSQL reelle le `404` de `POST /sales/` quand `cash_session_id` ne correspond a aucune session

### Actions
- Ajout dans `tests/test_sales_integration.py` d'un scenario d'integration complet pour `POST /sales/` avec `cash_session_id` inexistant.
- Mise a jour legere de `tests/test_sale_create_arch03.py` pour documenter la complementarite entre tests de mapping HTTP par mock et couverture integration reelle.

### Fichiers touches
- `recyclique-1.4.4/api/tests/test_sales_integration.py`
- `recyclique-1.4.4/api/tests/test_sale_create_arch03.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation Docker/PostgreSQL ciblee :
  - `tests/test_sales_integration.py::TestSalesIntegration::test_create_sale_cash_session_not_found_integration`
  - `tests/test_sale_create_arch03.py`
- Resultat Docker/PostgreSQL :
  - **4 tests passes**
- QA finale seule : **OK**

### Resultat
- La reserve principale du lot `2AN` est fermee par un scenario integration bout-en-bout.
- Le `404` de `POST /sales/` pour session absente est maintenant verrouille sans mock du service.

---

## Lot 2AP — ARCH-03 sur `PUT /sales/{sale_id}` (note admin)

**Statut:** ferme avec reserves acceptees  
**Theme:** sortir la logique metier / DB de mise a jour de note admin hors de `endpoints/sales.py`

### Actions
- Creation de `SaleService.update_admin_note(...)` pour porter :
  - validation UUID du `sale_id`
  - chargement de la vente
  - mise a jour conditionnelle de `note`
  - `commit`
  - rechargement eager `items` + `payments`
- Amincissement de `PUT /sales/{sale_id}` dans `endpoints/sales.py` avec traduction centralisee des erreurs domaine `400 / 404`.
- Adaptation de `tests/test_sale_service.py` avec des cas cibles sur `update_admin_note`.
- Ajout d'un scenario d'integration `invalid sale ID format` dans `tests/test_sales_integration.py`.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/services/sale_service.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/sales.py`
- `recyclique-1.4.4/api/tests/test_sale_service.py`
- `recyclique-1.4.4/api/tests/test_sales_integration.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation Docker/PostgreSQL ciblee :
  - `tests/test_sales_integration.py -k update_sale_note`
  - `tests/test_sale_service.py -k update_admin_note`
- Resultat Docker/PostgreSQL :
  - **10 tests passes**
- QA finale seule : **OK**

### Resultat
- `PUT /sales/{sale_id}` n'assemble plus inline la logique metier de note admin.
- Le contrat HTTP reste stable sur les scenarios verifies :
  - `401` auth
  - `403` droits admin
  - `400` format UUID invalide
  - `404` vente absente
  - `200` succes
- Reserves acceptees :
  - pas encore de scenario integration HTTP sur `note=null` / omission
  - l'auth JWT reste sur un `except Exception` large, aligne avec le reste du fichier

---

## Lot 2AQ — ARCH-03 sur `PATCH /sales/{sale_id}/items/{item_id}`

**Statut:** ferme avec reserves acceptees  
**Theme:** sortir la logique metier / DB du PATCH item hors de `endpoints/sales.py`, avec validation explicite de `preset_id`

### Actions
- Creation de `SaleService.update_sale_item(...)` pour porter :
  - validation UUID `sale_id` / `item_id`
  - verification vente + item rattache a la vente
  - regles metier sur `quantity`, `weight`, `unit_price`
  - garde admin pour la mise a jour de prix
  - validation explicite de `preset_id` pour eviter une erreur FK PostgreSQL brute
  - audit prix et persistence
- Amincissement de `PATCH /sales/{sale_id}/items/{item_id}` dans `endpoints/sales.py` avec traduction centralisee des erreurs domaine `400 / 404` et `403` sur `AuthorizationError`.
- Adaptation de `tests/test_sale_service.py` pour les cas `update_sale_item`, y compris `preset` inconnu.
- Adaptation de `tests/test_b52_p4_update_sale_item.py` pour le schema PostgreSQL complet :
  - chemins via `settings.API_V1_STR`
  - seed valide de `PresetButton`
  - garde `skipif` hors PostgreSQL
- Ajustement de `tests/conftest.py` pour neutraliser `log_audit` aussi dans `sale_service` sous SQLite minimal.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/services/sale_service.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/sales.py`
- `recyclique-1.4.4/api/tests/conftest.py`
- `recyclique-1.4.4/api/tests/test_b52_p4_update_sale_item.py`
- `recyclique-1.4.4/api/tests/test_sale_service.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation Docker/PostgreSQL ciblee :
  - `tests/test_b52_p4_update_sale_item.py`
  - `tests/test_sale_service.py`
- Resultat Docker/PostgreSQL :
  - **31 tests passes**
- QA finale seule : **OK**

### Resultat
- `PATCH /sales/{sale_id}/items/{item_id}` n'assemble plus inline sa logique metier principale.
- Le contrat HTTP reste stable sur les scenarios verifies :
  - `401` auth / user absent
  - `400` UUID invalides, valeurs invalides, `preset` inconnu
  - `403` prix reserve admin
  - `404` vente ou item absents
  - `200` succes
- Reserves acceptees :
  - un `preset_id` non-UUID reste valide par Pydantic avant d'atteindre le service (422 potentielle selon schema)
  - pas encore de scenario HTTP dedie sur `preset` inconnu, meme si le service le couvre

---

## Lot 2AR — ARCH-03 sur `PATCH /sales/{sale_id}/items/{item_id}/weight`

**Statut:** ferme avec reserves acceptees  
**Theme:** sortir la logique metier / DB du PATCH poids hors de `endpoints/sales.py` en preservant recalcul stats et audit

### Actions
- Creation de `SaleService.update_sale_item_weight_admin(...)` pour porter :
  - validation UUID `sale_id` / `item_id`
  - verification item rattache a la vente
  - validation du poids
  - `flush`
  - recalcul via `StatisticsRecalculationService.recalculate_after_sale_item_weight_update(...)`
  - `log_audit`
  - `commit` + `refresh`
- Amincissement de `PATCH /sales/{sale_id}/items/{item_id}/weight` dans `endpoints/sales.py` avec traduction centralisee des erreurs domaine `400 / 404`.
- Adaptation de `tests/test_sale_service.py` avec des cas cibles sur `update_sale_item_weight_admin`.
- Adaptation de `tests/test_b52_p4_update_sale_item.py` pour couvrir aussi le lot ARCH-03 sur `/weight`.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/services/sale_service.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/sales.py`
- `recyclique-1.4.4/api/tests/test_sale_service.py`
- `recyclique-1.4.4/api/tests/test_b52_p4_update_sale_item.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation Docker/PostgreSQL ciblee :
  - `tests/test_sale_service.py`
  - `tests/test_b52_p4_update_sale_item.py`
- Resultat Docker/PostgreSQL :
  - **37 tests passes**
- QA finale seule : **OK**

### Resultat
- `PATCH /sales/{sale_id}/items/{item_id}/weight` n'assemble plus inline sa logique metier principale.
- Le contrat HTTP reste stable sur les scenarios verifies :
  - `400` UUID invalide / valeurs invalides
  - `404` vente ou item absents
  - `200` succes
- Reserves acceptees :
  - sans Bearer, la route stricte reste sur le comportement historique de securite (`403` FastAPI/security) plutot que `401`
  - pas encore de test HTTP dedie sur un poids invalide passe via le body Pydantic (422 historique)

---

## Lot 2AS — Harmonisation prudente de l'auth sur les mutantes `sales`

**Statut:** ferme avec reserves acceptees  
**Theme:** reduire la duplication auth des routes mutantes `sales.py` sans changer leurs contrats historiques 401/403

### Actions
- Factorisation dans `endpoints/sales.py` de l'extraction JWT Bearer optionnelle pour les routes mutantes qui n'utilisent pas `require_role_strict`.
- Centralisation prudente de la resolution utilisateur pour :
  - `POST /sales/`
  - `PUT /sales/{sale_id}`
  - `PATCH /sales/{sale_id}/items/{item_id}`
- Ajout de `tests/test_sales_mutation_auth_contract.py` pour verrouiller la nuance historique :
  - `PUT /sales/{sale_id}` avec JWT orphelin -> `403`
  - `PATCH /sales/{sale_id}/items/{item_id}` avec JWT orphelin -> `401`
- Aucune modification des `GET /sales` ni de `PATCH .../weight`.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/sales.py`
- `recyclique-1.4.4/api/tests/test_sales_mutation_auth_contract.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation Docker/PostgreSQL ciblee :
  - `tests/test_sales_mutation_auth_contract.py`
  - `tests/test_sale_create_arch03.py`
  - `tests/test_b52_p4_update_sale_item.py`
  - `tests/test_sales_integration.py -k update_sale_note`
- Resultat Docker/PostgreSQL :
  - **25 tests passes**
- QA finale seule : **OK**

### Resultat
- Les routes mutantes `sales.py` sont plus homogenes cote auth sans basculer brutalement vers le modele `require_role_strict`.
- Les contrats historiques sensibles 401/403 restent verrouilles par test.
- Reserves acceptees :
  - `GET /sales` et `GET /sales/{id}` restent hors de ce lot
  - la divergence historique entre PUT note / PATCH item / PATCH weight en cas d'absence de Bearer reste assumee et documentee

---

## Lot 2AT — Premier decoupage de `admin.py` sur la sante

**Statut:** ferme avec reserves acceptees  
**Theme:** extraire les endpoints sante / probes hors de `admin.py` vers un sous-module dedie, sans toucher au bloc Telegram

### Actions
- Creation de `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_health.py`.
- Extraction dans ce module des routes :
  - `GET /admin/health-test`
  - `GET /admin/health/public`
  - `GET /admin/health/database`
  - `GET /admin/health`
  - `GET /admin/health/anomalies`
  - `GET /admin/health/scheduler`
- Enregistrement via `register_admin_health_routes(router, limiter)` depuis `admin.py`.
- Conservation de `POST /admin/health/test-notifications` dans `admin.py` car lie Telegram.
- Ajout du fichier cible `tests/test_admin_health_endpoints.py`.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_health.py`
- `recyclique-1.4.4/api/tests/test_admin_health_endpoints.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_admin_health_endpoints.py`
- Resultat local :
  - **6 tests passes**
- QA finale seule : **OK**

### Resultat
- `admin.py` commence a etre decoupe par sous-blocs coherents.
- Les routes sante / probes restent stables et toujours publiees sous le prefixe `/admin`.
- Reserves acceptees :
  - `POST /admin/health/test-notifications` reste dans `admin.py`
  - `db.execute("SELECT 1")` n'a pas ete modernise en `text("SELECT 1")` dans ce lot

---

## Lot 2AU — Extraction observabilite dans `admin.py`

**Statut:** ferme avec reserves acceptees  
**Theme:** isoler les endpoints de consultation des journaux admin hors de `admin.py`

### Actions
- Creation de `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_observability.py`.
- Extraction dans ce module des routes :
  - `GET /admin/transaction-logs`
  - `GET /admin/audit-log`
  - `GET /admin/email-logs`
- Enregistrement via `register_admin_observability_routes(router, limiter)` depuis `admin.py`.
- Alignement des tests sur `settings.API_V1_STR`.
- Durcissement ciblé de `EmailLogService` pour normaliser les filtres `user_id` string/UUID.
- Extension du schema SQLite minimal de test pour inclure `email_logs`.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_observability.py`
- `recyclique-1.4.4/api/src/recyclic_api/services/email_log_service.py`
- `recyclique-1.4.4/api/tests/conftest.py`
- `recyclique-1.4.4/api/tests/test_admin_observability_endpoints.py`
- `recyclique-1.4.4/api/tests/test_transaction_logs_api.py`
- `recyclique-1.4.4/api/tests/test_email_logs_endpoint.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_admin_observability_endpoints.py`
  - `tests/test_transaction_logs_api.py`
  - `tests/test_email_logs_endpoint.py`
  - `tests/test_admin_health_endpoints.py`
- Resultat local :
  - **27 tests passes, 1 skipped**
- QA finale seule : **OK**

### Resultat
- `admin.py` perd un second gros bloc non Telegram, centre sur la lecture des journaux.
- Les trois routes d'observabilite gardent leur auth admin stricte, leurs contrats HTTP et leur prefixe `/admin`.
- Reserves acceptees :
  - la couverture `GET /admin/audit-log` reste partielle en SQLite et doit etre reverifiee sous PostgreSQL reel
  - `log_admin_access` reste asymetrique par rapport aux autres endpoints de consultation

---

## Lot 2AV — Extraction du seuil d'activite admin

**Statut:** ferme avec reserves acceptees  
**Theme:** sortir la lecture / mise a jour du seuil d'activite hors de `admin.py`

### Actions
- Creation de `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_activity_threshold.py`.
- Extraction dans ce module des routes :
  - `GET /admin/settings/activity-threshold`
  - `PUT /admin/settings/activity-threshold`
- Enregistrement via `register_admin_activity_threshold_routes(router, limiter)` depuis `admin.py`.
- Correction ciblee du trou d'audit associe en ajoutant `SETTING_UPDATED` a `AuditActionType`.
- Ajout des tests cibles `tests/test_admin_activity_threshold_endpoints.py`.
- Harmonisation du fallback GET avec `DEFAULT_ACTIVITY_THRESHOLD_MINUTES`.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_activity_threshold.py`
- `recyclique-1.4.4/api/src/recyclic_api/models/audit_log.py`
- `recyclique-1.4.4/api/tests/conftest.py`
- `recyclique-1.4.4/api/tests/test_admin_activity_threshold_endpoints.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_admin_activity_threshold_endpoints.py`
  - `tests/test_admin_observability_endpoints.py`
  - `tests/test_admin_health_endpoints.py`
- Resultat local :
  - **19 tests passes, 1 skipped**
- QA finale seule : **OK**

### Resultat
- `admin.py` perd un troisieme sous-bloc coherent, simple et frequemment sensible cote admin.
- Les contrats HTTP, les limites, le refresh du cache d'activite et l'audit restent preserves.
- Reserves acceptees :
  - le body du `PUT` reste un `dict` non typé, comme avant
  - la verification PostgreSQL reelle du `PUT` avec table `audit_logs` reste a rejouer en environnement complet

---

## Lot 2AW — Extraction lecture utilisateurs dans `admin.py`

**Statut:** ferme avec reserves acceptees  
**Theme:** sortir la consultation admin des utilisateurs hors de `admin.py` sans toucher aux mutations

### Actions
- Creation de `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_users_read.py`.
- Extraction dans ce module des routes :
  - `GET /admin/users`
  - `GET /admin/users/statuses`
  - `GET /admin/users/pending`
- Enregistrement via `register_admin_users_read_routes(router, limiter)` depuis `admin.py`.
- Realignement des tests concernes sur `settings.API_V1_STR`.
- Stabilisation des fixtures/tests lies aux pending users et aux statuts utilisateurs en SQLite.
- Ajout du fichier cible `tests/test_admin_users_read_routes.py`.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_users_read.py`
- `recyclique-1.4.4/api/tests/test_admin_users_read_routes.py`
- `recyclique-1.4.4/api/tests/test_admin_pending_endpoints.py`
- `recyclique-1.4.4/api/tests/test_user_statuses_endpoint.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_admin_users_read_routes.py`
  - `tests/test_admin_pending_endpoints.py`
  - `tests/test_user_statuses_endpoint.py`
  - `tests/test_auth_inactive_user_middleware.py`
- Resultat local :
  - **24 tests passes**
- QA finale seule : **OK**

### Resultat
- `admin.py` perd un quatrieme sous-bloc coherent, centre sur la lecture admin des utilisateurs.
- Les routes, l'auth admin et les contrats HTTP restent preserves sous le prefixe `/admin`.
- Reserves acceptees :
  - `GET /users/pending` reste fragile si `telegram_id` est nul, comme avant ce lot
  - la couverture de `test_admin_users_read_routes.py` reste volontairement structurelle, pas comportementale

---

## Lot 2AX — Extraction mutations compte utilisateur dans `admin.py`

**Statut:** ferme avec reserves acceptees  
**Theme:** sortir les mutations admin de compte utilisateur hors de `admin.py`, sans toucher aux credentials ni a Telegram

### Actions
- Creation de `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_users_mutations.py`.
- Extraction dans ce module des routes :
  - `PUT /admin/users/{user_id}/role`
  - `PUT /admin/users/{user_id}/status`
  - `PUT /admin/users/{user_id}`
- Enregistrement via `register_admin_users_mutations_routes(router, limiter)` depuis `admin.py`.
- Mise a jour mineure du docstring de `admin_users_read.py` pour refleter la nouvelle separation.
- Ajout du fichier cible `tests/test_admin_users_mutations_routes.py`.
- Realignement et validation ciblee des tests d'integration sur la gestion admin des utilisateurs.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_users_mutations.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_users_read.py`
- `recyclique-1.4.4/api/tests/test_admin_users_mutations_routes.py`
- `recyclique-1.4.4/api/tests/api/test_admin_user_management.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_admin_users_mutations_routes.py`
  - `tests/test_admin_user_status_endpoint.py`
  - `tests/api/test_admin_user_management.py`
- Resultat local :
  - **20 tests passes**
- QA finale seule : **OK**

### Resultat
- `admin.py` perd un cinquieme sous-bloc coherent, cette fois sur les mutations de compte les plus centrales.
- Les routes, l'auth admin, les schemas d'entree/sortie et les gardes-fous metier restent preserves.
- Reserves acceptees :
  - les messages API sont reappliques en UTF-8 propre, ce qui peut diverger d'anciennes chaines mojibake si un client comparait au caractere pres
  - `update_user_status` conserve sa logique historique en deux `commit`, hors refactor transactionnel dans ce lot

---

## Lot 2AY — Extraction groupes utilisateur dans `admin.py`

**Statut:** ferme avec reserves acceptees  
**Theme:** sortir la mutation admin de groupes utilisateur hors de `admin.py`

### Actions
- Creation de `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_users_groups.py`.
- Extraction dans ce module de la route :
  - `PUT /admin/users/{user_id}/groups`
- Enregistrement via `register_admin_users_groups_routes(router, limiter)` depuis `admin.py`.
- Stabilisation des tests groupes avec JWT reels et prefixe `API_V1_STR`.
- Extension ciblee du schema SQLite minimal de test pour `groups` et `user_groups`.
- Ajout du fichier cible `tests/test_admin_users_groups_routes.py`.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_users_groups.py`
- `recyclique-1.4.4/api/tests/conftest.py`
- `recyclique-1.4.4/api/tests/test_user_groups.py`
- `recyclique-1.4.4/api/tests/test_admin_users_groups_routes.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_admin_users_groups_routes.py`
  - `tests/test_user_groups.py`
  - `tests/test_admin_users_mutations_routes.py`
  - `tests/test_admin_users_read_routes.py`
- Resultat local :
  - **10 tests passes**
- QA finale seule : **OK**

### Resultat
- `admin.py` perd un sixieme sous-bloc coherent, cette fois sur la gestion des groupes utilisateur.
- La route, l'auth admin, les validations de groupes et les messages HTTP restent preserves.
- Reserves acceptees :
  - l'ordre entre `group_ids` et `group_names` n'est pas strictement garanti par la requete SQL, comme dans la logique historique
  - la verification PostgreSQL reelle de ce flux reste a refaire en environnement complet si necessaire

---

## Lot 2AZ — Extraction credentials utilisateur dans `admin.py`

**Statut:** ferme avec reserves acceptees  
**Theme:** sortir les endpoints admin de reset / forçage des credentials hors de `admin.py`, sans toucher a Telegram

### Actions
- Creation de `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_users_credentials.py`.
- Extraction dans ce module des routes :
  - `POST /admin/users/{user_id}/reset-password`
  - `POST /admin/users/{user_id}/force-password`
  - `POST /admin/users/{user_id}/reset-pin`
- Enregistrement via `register_admin_users_credentials_routes(router, limiter)` depuis `admin.py`.
- Realignement cible des tests force-password / reset-pin et ajout du fichier `tests/test_admin_users_credentials_routes.py`.
- Harmonisation de `reset-password` sur UUID invalide (`404` au lieu d'un `500` accidentel).

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_users_credentials.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_users_read.py`
- `recyclique-1.4.4/api/tests/conftest.py`
- `recyclique-1.4.4/api/tests/test_admin_force_password.py`
- `recyclique-1.4.4/api/tests/test_pin_management.py`
- `recyclique-1.4.4/api/tests/test_admin_users_credentials_routes.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee avec `API_V1_STR=/api/v1` :
  - `tests/test_admin_users_credentials_routes.py`
  - `tests/test_admin_force_password.py`
  - `tests/test_pin_management.py::TestAdminPinReset`
- Resultat local :
  - **15 tests passes**
- QA finale seule : **OK**

### Resultat
- `admin.py` perd un septieme sous-bloc coherent, sur un domaine sensible mais bien borne.
- Les routes, auth, limites et comportements metier des flux credentials restent preserves.
- Reserves acceptees :
  - certains tests du projet restent encore couples a un prefixe `/api/v1` en dur au lieu de `settings.API_V1_STR`
  - la verification PostgreSQL reelle de l'audit credentials reste a rejouer en environnement complet

---

## Lot 2BA — Extraction historique utilisateur dans `admin.py`

**Statut:** ferme avec reserves acceptees  
**Theme:** sortir la lecture d'historique utilisateur hors de `admin.py`

### Actions
- Creation de `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_users_history.py`.
- Extraction dans ce module de la route :
  - `GET /admin/users/{user_id}/history`
- Enregistrement via `register_admin_users_history_routes(router, limiter)` depuis `admin.py`.
- Mise a jour mineure du docstring de `admin_users_read.py` pour refléter la separation.
- Harmonisation preventive du cas UUID invalide avant l'appel base pour eviter un ecart potentiel SQLite/PostgreSQL.
- Ajout du fichier cible `tests/test_admin_users_history_routes.py`.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_users_history.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_users_read.py`
- `recyclique-1.4.4/api/tests/test_admin_users_history_routes.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_admin_users_history_routes.py`
  - `tests/test_admin_users_read_routes.py`
- Resultat local :
  - **2 tests passes**
- QA finale seule : **OK**

### Resultat
- `admin.py` perd un huitieme sous-bloc coherent, cote lecture utilisateur.
- La route, l'auth admin, les query params et le contrat HTTP restent preserves.
- Reserves acceptees :
  - la validation a surtout porte sur l'enregistrement de route ; les tests d'integration history existants restent dependants d'un environnement plus complet
  - `target_name` reste calcule mais non utilise, comme dans la logique historique

---

## Lot 2BB — Extraction maintenance cash sessions dans `admin.py`

**Statut:** ferme avec reserves acceptees  
**Theme:** sortir les endpoints admin de maintenance caisse hors de `admin.py`

### Actions
- Creation de `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_cash_sessions_maintenance.py`.
- Extraction dans ce module des routes :
  - `POST /admin/cash-sessions/fix-blocked-deferred`
  - `POST /admin/cash-sessions/merge-duplicate-deferred`
- Enregistrement via `register_admin_cash_sessions_maintenance_routes(router, limiter)` depuis `admin.py`.
- Ajout des tests cibles `tests/test_admin_cash_sessions_maintenance.py`.
- Extension ciblee du schema SQLite minimal de test pour `sites`, `cash_sessions` et `sales`.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_cash_sessions_maintenance.py`
- `recyclique-1.4.4/api/tests/test_admin_cash_sessions_maintenance.py`
- `recyclique-1.4.4/api/tests/conftest.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_admin_cash_sessions_maintenance.py`
- Resultat local :
  - **7 tests passes**
- QA finale seule : **OK**

### Resultat
- `admin.py` perd un neuvieme sous-bloc coherent, cote maintenance caisse.
- Les routes, auth super-admin et contrats HTTP restent preserves.
- Reserves acceptees :
  - `merge-duplicate-deferred` garde un message d'erreur pas parfaitement specifique si `operator_id` est invalide
  - la verification PostgreSQL reelle de ce flux reste a rejouer en environnement complet si necessaire

---

## Lot 2BC — Extraction template reception offline dans `admin.py`

**Statut:** ferme avec reserves acceptees  
**Theme:** sortir le telechargement du template CSV offline hors de `admin.py`

### Actions
- Creation de `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_templates_offline.py`.
- Extraction dans ce module de la route :
  - `GET /admin/templates/reception-offline.csv`
- Enregistrement via `register_admin_templates_offline_routes(router, limiter)` depuis `admin.py`.
- Ajout d'un shim importable `recyclique-1.4.4/api/scripts/generate_offline_template.py` pour charger le script canonique legacy.
- Realignement cible des tests template offline sur `settings.API_V1_STR`.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_templates_offline.py`
- `recyclique-1.4.4/api/scripts/generate_offline_template.py`
- `recyclique-1.4.4/api/tests/test_template_offline.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_template_offline.py`
- Resultat local :
  - **9 tests passes, 1 skipped**
- QA finale seule : **OK**

### Resultat
- `admin.py` perd un dixieme sous-bloc coherent, sur un endpoint utilitaire isole.
- La route, l'auth admin stricte et le contrat CSV restent preserves.
- Reserves acceptees :
  - le shim d'import legacy reste sensible au layout disque tant que le script canonique garde son nom non importable
  - un test de cycle complet reste dependant d'un schema plus complet que le SQLite minimal

---

## Lot 2BD — Neutralisation prudente des notifications Telegram sortantes

**Statut:** ferme avec reserves acceptees  
**Theme:** desactiver par defaut les envois Telegram sans encore supprimer les colonnes ni les routes Telegram

### Actions
- Ajout dans `config.py` de `TELEGRAM_NOTIFICATIONS_ENABLED = False` par defaut.
- Neutralisation `no-op` de `telegram_service` tant que ce flag est faux.
- Court-circuit explicite de `POST /admin/health/test-notifications` avec retour `disabled` si Telegram est desactive.
- Garde preventive dans `sync_service` et `anomaly_detection_service` pour eviter les appels reseau Telegram inutiles.
- Ajout des tests cibles `tests/test_outbound_bot_notifications_disabled.py`.
- Realignement des tests existants qui veulent encore verifier le chemin Telegram actif en leur forcant `TELEGRAM_NOTIFICATIONS_ENABLED=True`.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/core/config.py`
- `recyclique-1.4.4/api/src/recyclic_api/services/telegram_service.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin.py`
- `recyclique-1.4.4/api/src/recyclic_api/services/sync_service.py`
- `recyclique-1.4.4/api/src/recyclic_api/services/anomaly_detection_service.py`
- `recyclique-1.4.4/api/tests/test_outbound_bot_notifications_disabled.py`
- `recyclique-1.4.4/api/tests/test_sync_service.py`
- `recyclique-1.4.4/api/tests/test_monitoring.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_outbound_bot_notifications_disabled.py`
  - `tests/test_sync_service.py::test_upload_file_failure_triggers_notification`
  - `tests/test_monitoring.py::TestAnomalyDetectionService::test_send_anomaly_notifications`
- Resultat local :
  - **7 tests passes**
- QA finale seule : **OK**

### Resultat
- Le backend ne depend plus d'un bot Telegram actif pour ses notifications sortantes par defaut.
- Le comportement est explicite et prudent : no-op / `disabled` plutot qu'echec reseau.
- Reserves acceptees :
  - la reactivation Telegram demande maintenant un flag explicite en plus de la configuration historique
  - la suppression complete des routes / schemas / colonnes Telegram reste un lot distinct

---

## Lot 2BE — Desactivation explicite du flux `link-telegram`

**Statut:** ferme avec reserves acceptees  
**Theme:** retirer proprement la liaison Telegram utilisateur sans encore migrer le schema

### Actions
- Desactivation explicite de `POST /users/link-telegram` avec retour `410 Gone`.
- Ajout de `TelegramLinkDisabledError` dans `core/exceptions.py`.
- Neutralisation de `TelegramLinkService.link_telegram_account()` pour lever cette exception dediee si appele directement.
- Mise a jour du schema `LinkTelegramRequest` pour documenter le retrait du flux.
- Realignement des tests `test_telegram_link_endpoint.py` et `test_telegram_link_arch03.py`.
- Ajustement de `pytest.ini` pour ne plus exclure globalement les tests contenant `telegram`.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/core/exceptions.py`
- `recyclique-1.4.4/api/src/recyclic_api/services/telegram_link_service.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/users.py`
- `recyclique-1.4.4/api/src/recyclic_api/schemas/user.py`
- `recyclique-1.4.4/api/tests/test_telegram_link_endpoint.py`
- `recyclique-1.4.4/api/tests/test_telegram_link_arch03.py`
- `recyclique-1.4.4/api/pytest.ini`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_telegram_link_endpoint.py`
  - `tests/test_telegram_link_arch03.py`
- Resultat local :
  - **7 tests passes**
- QA finale seule : **OK**

### Resultat
- Le flux de liaison Telegram n'est plus semi-actif : il est desormais retire explicitement cote API.
- Le contrat HTTP est clair et stable : `410 Gone` pour une fonctionnalite retiree.
- Reserves acceptees :
  - un appel direct au service leve l'exception dediee sans mapping HTTP global hors de cette route
  - la suppression complete des champs / schemas Telegram reste un lot distinct

---

## Lot 2BF — Desactivation explicite des endpoints bot de depots

**Statut:** ferme avec reserves acceptees  
**Theme:** retirer proprement `from-bot` et `classify` comme flux Telegram historiques

### Actions
- Desactivation explicite avec `410 Gone` de :
  - `POST /deposits/from-bot`
  - `POST /deposits/{deposit_id}/classify`
- Centralisation du message de retrait dans `core/bot_auth.py`.
- Realignement des tests bot / classification / workflow pour verifier le nouveau contrat `410`.
- Extension ciblee du schema SQLite minimal de test pour inclure `deposits`.
- Correctif connexe dans `finalize_deposit` pour persister proprement la fusion JSON de `alternative_categories`.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/core/bot_auth.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/deposits.py`
- `recyclique-1.4.4/api/tests/conftest.py`
- `recyclique-1.4.4/api/tests/test_deposit_bot_integration.py`
- `recyclique-1.4.4/api/tests/test_bot_auth_simple.py`
- `recyclique-1.4.4/api/tests/test_deposit_validation_workflow.py`
- `recyclique-1.4.4/api/tests/test_deposit_classification_integration.py`
- `recyclique-1.4.4/api/tests/test_classification_fixed.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_deposit_bot_integration.py`
  - `tests/test_bot_auth_simple.py`
  - `tests/test_deposit_validation_workflow.py`
  - `tests/test_deposit_classification_integration.py`
  - `tests/test_classification_fixed.py`
- Resultat local :
  - **26 tests passes**
- QA finale seule : **OK**

### Resultat
- Les endpoints bot historiques de depots ne sont plus semi-actifs : ils annoncent explicitement leur retrait.
- Le contrat HTTP est clair et stable : `410 Gone` sur ces deux routes.
- Reserves acceptees :
  - `PUT /deposits/{id}` garde encore son auth bot pour l'instant, hors perimetre de ce lot
  - la suppression complete des champs / schemas lies au bot Telegram reste un lot distinct

---

## Lot 2BG — Suppression des appels Telegram directs restants dans `admin.py`

**Statut:** ferme avec reserves acceptees  
**Theme:** retirer les derniers appels directs a `telegram_service` dans les flux admin, sans casser le coeur metier

### Actions
- Suppression dans `approve_user` et `reject_user` des blocs de notification Telegram utilisateur/admin.
- Conservation intacte du coeur metier de validation/rejet (controle, commit, audit, reponse API).
- Simplification de `POST /admin/health/test-notifications` vers une reponse explicite `unavailable`, sans appel Telegram.
- Realignement des tests admin/pending/workflow sur ce nouveau comportement et sur le prefixe API reel.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_health.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_users_read.py`
- `recyclique-1.4.4/api/tests/test_outbound_bot_notifications_disabled.py`
- `recyclique-1.4.4/api/tests/test_admin_pending_endpoints.py`
- `recyclique-1.4.4/api/tests/test_integration_pending_workflow.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_outbound_bot_notifications_disabled.py`
  - `tests/test_admin_pending_endpoints.py`
  - `tests/test_integration_pending_workflow.py`
- Resultat local :
  - **26 tests passes**
- QA finale seule : **OK**

### Resultat
- `admin.py` ne depend plus directement de `telegram_service` pour les flux approve/reject.
- Le retrait de Telegram devient explicite aussi sur l'endpoint de test admin.
- Reserves acceptees :
  - le champ `message` des requetes d'approbation reste accepte mais n'est plus utilise pour notifier
  - la qualite des libelles mojibake dans `admin.py` reste un sujet distinct hors de ce lot

---

## Lot 2BH — Elagage du code mort dans `telegram_service`

**Statut:** ferme avec reserves acceptees  
**Theme:** reduire `telegram_service.py` au reliquat Telegram encore reellement utilise

### Actions
- Suppression de `send_user_approval_notification`, `send_user_rejection_notification` et `notify_admins_user_processed`.
- Conservation de `notify_sync_failure` comme seul point d'entree encore utile cote application.
- Realignement des tests cibles sur ce service reduit.
- Mise a jour du script manuel `api/test_telegram_notifications.py` pour ne verifier que le flux encore vivant.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/services/telegram_service.py`
- `recyclique-1.4.4/api/tests/test_outbound_bot_notifications_disabled.py`
- `recyclique-1.4.4/api/tests/test_sync_service.py`
- `recyclique-1.4.4/api/test_telegram_notifications.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_outbound_bot_notifications_disabled.py`
  - `tests/test_sync_service.py`
- Resultat local :
  - **11 tests passes**
- QA finale seule : **OK**

### Resultat
- Le service Telegram ne contient plus de points d'entree morts issus des anciens flux admin.
- Le reliquat Telegram actif est desormais encore plus resserre autour des alertes sync/anomalies.
- Reserves acceptees :
  - `notify_sync_failure` renvoie encore `True` quand le canal est desactive, pour rester no-op et non cassant
  - un doublon de test hors `api/tests` existe toujours mais n'entre pas dans la suite pytest canonique

---

## Lot 2BI — Gel contractuel du reliquat auth bot sur `PUT /deposits/{id}`

**Statut:** ferme avec reserves acceptees  
**Theme:** confirmer explicitement que la finalisation de depot reste le seul endpoint depots encore protege par `X-Bot-Token`

### Actions
- Documentation explicite dans `deposits.py` pour signaler que `PUT /deposits/{id}` est le dernier endpoint depots conservant l'auth bot.
- Ajout d'un test OpenAPI cible qui verifie que le header `X-Bot-Token` n'est documente que sur `PUT /deposits/{id}` et plus sur les routes Telegram deja desactivees.
- Decision de prudence enterinee : ne pas retirer `get_bot_token_dependency` tant qu'aucun contrat d'auth de remplacement n'est defini pour la finalisation.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/deposits.py`
- `recyclique-1.4.4/api/tests/test_bot_auth_simple.py`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee :
  - `tests/test_bot_auth_simple.py`
  - `tests/test_deposit_validation_workflow.py`
- Resultat local :
  - **15 tests passes**
- QA finale seule : **OK**

### Resultat
- Le reliquat `get_bot_token_dependency` est maintenant explicite et verrouille par un test de contrat OpenAPI.
- Le micro-lot confirme que ce reliquat n'est pas du code mort mais un contrat HTTP encore vivant autour de la finalisation de depot.
- Reserves acceptees :
  - l'auth bot reste une dette ciblee tant qu'aucune auth de remplacement n'est decidee pour `PUT /deposits/{id}`
  - le test OpenAPI protege l'unicite actuelle du header documente, pas l'ensemble des usages eventuels hors schema genere

---

## Lot 2BJ — Alignement `telegram_id` sur `/admin/users/pending`

**Statut:** ferme avec reserves acceptees  
**Theme:** eliminer le cast `int(...)` fragile sur les users pending et aligner la surface backend/frontend sur la valeur string reelle stockee

### Actions
- Alignement de `PendingUserResponse.telegram_id` sur `Optional[str]` avec normalisation string cote schema.
- Suppression du cast `int(user.telegram_id)` dans `GET /admin/users/pending`.
- Ajout d'un test backend anti-regression pour garantir qu'un `telegram_id` non numerique ne provoque plus de `500`.
- Alignement de `adminService.getPendingUsers()` pour preserver `telegram_id` tel quel cote front.
- Ajout d'un test front dedie sur l'adaptateur `pending` pour verrouiller la preservation des valeurs non numeriques.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/schemas/admin.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_users_read.py`
- `recyclique-1.4.4/api/tests/test_admin_pending_endpoints.py`
- `recyclique-1.4.4/frontend/src/services/adminService.ts`
- `recyclique-1.4.4/frontend/src/test/services/adminService.pendingUsers.test.ts`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee backend :
  - `tests/test_admin_pending_endpoints.py`
- Resultat backend :
  - **14 tests passes**
- Validation locale ciblee frontend :
  - `src/test/services/adminService.pendingUsers.test.ts`
  - `src/test/pages/Admin/PendingUsers.test.tsx`
  - `src/test/components/business/PendingUsersTable.test.tsx`
- Resultat frontend :
  - **61 tests passes**
- QA finale seule : **OK**

### Resultat
- `GET /admin/users/pending` ne casse plus quand `telegram_id` n'est pas un entier pur.
- Le front `pending` conserve desormais la valeur reelle de `telegram_id` au lieu de produire un `NaN`.
- Reserves acceptees :
  - le contrat JSON de `telegram_id` sur ce endpoint peut apparaitre en string la ou certains consommateurs pouvaient tolerer un nombre
  - `api/openapi.json` statique n'a pas pu etre regenere localement faute de variables d'environnement backend (`DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`) ; la reserve documentaire reste explicite
  - le reste des surfaces `telegram_id` hors `/admin/users/pending` demeure a traiter en micro-lots distincts

---

## Lot 2BK — Alignement `telegram_id` sur la liste admin frontend

**Statut:** ferme avec reserves acceptees  
**Theme:** supprimer la coercition locale `parseInt` dans le mapping frontend des utilisateurs admin

### Actions
- Suppression du `parseInt` dans `convertToAdminUser` afin de conserver `telegram_id` tel que renvoye par l'API.
- Ajout d'un test frontend dedie qui verrouille la preservation d'un `telegram_id` non numerique sur `getUsers()`.

### Fichiers touches
- `recyclique-1.4.4/frontend/src/services/adminService.ts`
- `recyclique-1.4.4/frontend/src/test/services/adminService.userMapping.test.ts`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee frontend :
  - `src/test/services/adminService.userMapping.test.ts`
  - `src/test/services/adminService.pendingUsers.test.ts`
  - `src/test/pages/Admin/PendingUsers.test.tsx`
  - `src/test/components/business/PendingUsersTable.test.tsx`
- Resultat frontend :
  - **62 tests passes**
- QA finale seule : **OK**

### Resultat
- La liste admin frontend n'ecrase plus `telegram_id` en nombre et ne peut plus produire de `NaN` sur cette surface.
- Le comportement frontend est maintenant coherent entre `getUsers()` et `getPendingUsers()`.
- Reserves acceptees :
  - le helper `convertToAdminUser` est aussi reutilise par d'autres chemins (`getUserById`, `createUser`, `updateUser`) mais ce lot ne les reteste pas explicitement
  - le bruit local residuel sur `frontend/src/generated/*` reste hors lot et n'est pas embarque

---

## Lot 2BL — Centralisation du fallback d'affichage `@username / telegram_id`

**Statut:** ferme avec reserves acceptees  
**Theme:** extraire un helper pur pour uniformiser le fallback d'affichage `@username || telegram_id` sur les ecrans admin

### Actions
- Creation du helper `usernameOrTelegramForAtHandle`.
- Remplacement de la logique inline dans `UserListTable`, `UserDetailView` et `UserProfileTab`.
- Ajout d'un test unitaire dedie pour verrouiller la semantique existante, y compris le cas falsy `0`.

### Fichiers touches
- `recyclique-1.4.4/frontend/src/utils/userDisplay.ts`
- `recyclique-1.4.4/frontend/src/utils/__tests__/userDisplay.test.ts`
- `recyclique-1.4.4/frontend/src/components/business/UserListTable.tsx`
- `recyclique-1.4.4/frontend/src/components/business/UserDetailView.tsx`
- `recyclique-1.4.4/frontend/src/components/business/UserProfileTab.tsx`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee frontend :
  - `src/utils/__tests__/userDisplay.test.ts`
- Resultat frontend :
  - **5 tests passes**
- QA finale seule : **OK**

### Resultat
- Les trois composants admin partagent maintenant la meme logique de fallback d'affichage pour `@username` / `telegram_id`.
- Le lot reste purement presentationnel, sans impact sur les contrats API ni sur l'auth.
- Reserves acceptees :
  - les suites composants historiques ciblees restent bruyantes hors lot et n'ont pas ete reouvertes
  - le bruit local residuel sur `frontend/src/generated/*` reste hors lot et n'est pas embarque

---

## Lot 2BM — Centralisation du fallback `full_name` frontend

**Statut:** ferme avec reserves acceptees  
**Theme:** extraire et fiabiliser le fallback de libelle utilisateur utilise par `convertToAdminUser`

### Actions
- Ajout du helper `fullNameOrUsernameOrTelegramFallback` dans `userDisplay.ts`.
- Remplacement de la logique inline de `convertToAdminUser` par ce helper.
- Couverture de tests etendue sur les cas nom complet, nom partiel, username seul, telegram id seul et absence totale d'identifiants.

### Fichiers touches
- `recyclique-1.4.4/frontend/src/utils/userDisplay.ts`
- `recyclique-1.4.4/frontend/src/utils/__tests__/userDisplay.test.ts`
- `recyclique-1.4.4/frontend/src/services/adminService.ts`

### Validation
- Diagnostics IDE / lints sur les fichiers modifies.
- Validation locale ciblee frontend :
  - `src/utils/__tests__/userDisplay.test.ts`
  - `src/test/services/adminService.userMapping.test.ts`
- Resultat frontend :
  - **11 tests passes**
- QA finale seule : **OK**

### Resultat
- Le libelle frontend des utilisateurs admin est maintenant centralise dans un helper pur.
- Les cas de donnees partielles evitent des sorties de type `User undefined` et tombent sur un fallback propre (`Bénévole`) si aucun identifiant n'est disponible.
- Reserves acceptees :
  - le lot reste borne au mapping frontend et ne touche pas les surfaces auth/backend
  - le bruit local residuel sur `frontend/src/generated/*` reste hors lot et n'est pas embarque

---

## Lot 2BN — Tests anti-regression `convertToAdminUser` hors liste (getUserById / createUser / updateUser)

**Statut:** ferme avec reserves acceptees  
**Theme:** verrouiller les chemins admin qui passent par `convertToAdminUser` avec un `telegram_id` non numerique

### Actions
- Extension de `adminService.userMapping.test.ts` : mock `UsersApi` pour `userapiv1usersuseridget`, `userapiv1userspost`, `userapiv1usersuseridput`.
- Trois tests cibles : `getUserById`, `createUser`, `updateUser` avec reponse API `telegram_id: tg_admin_alpha` et attente `full_name: Admin Alpha` (coherent avec le helper post-lot 2BM).
- Le test existant sur `getUsers` est factorise sur un objet reponse partage.

### Fichiers touches
- `recyclique-1.4.4/frontend/src/test/services/adminService.userMapping.test.ts`

### Validation
- Diagnostics IDE / lints sur le fichier modifie.
- Validation locale ciblee frontend :
  - `src/test/services/adminService.userMapping.test.ts`
- Resultat frontend :
  - **4 tests passes**
- ESLint sur le fichier de test : **OK** (exit 0)
- QA mini-lot : **OK** (comportement attendu : pas de coercion numerique, `full_name` = prenom + nom)

### Resultat
- Les quatre entrees utilisant `convertToAdminUser` cote liste + detail + creation + mise a jour sont couvertes pour le cas `telegram_id` alphanumerique.
- Reserves acceptees :
  - le lot ne modifie pas `generated/*` ; le bruit local residuel sur ce dossier reste ignore et hors commit
  - pas de changement produit, uniquement tests

---

## Lot 2BO — Suppression d'un reliquat mort dans `telegram_link_service`

**Statut:** ferme avec reserves acceptees  
**Theme:** retirer la methode morte `check_telegram_id_conflict` et realigner la documentation du service de liaison Telegram

### Actions
- Suppression de `check_telegram_id_conflict`, sans usage residuel dans le depot.
- Mise a jour de la docstring du module pour indiquer que seul l'helper d'auth locale reste aux cotes de `link_telegram_account` desactive.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/services/telegram_link_service.py`

### Validation
- Diagnostics IDE / lints sur le fichier modifie.
- Validation locale ciblee backend :
  - `tests/test_telegram_link_arch03.py`
  - `tests/test_telegram_link_endpoint.py`
- Resultat backend :
  - **7 tests passes**
- QA finale seule : **OK**

### Resultat
- `telegram_link_service.py` ne conserve plus ce reliquat mort.
- Le service est maintenant plus coherent avec la desactivation deja effective du flux `link-telegram`.
- Reserves acceptees :
  - un appelant externe au depot qui utiliserait encore cette methode obtiendrait desormais une `AttributeError`

---

## Lot 4E — Session / authStore : conserver `telegram_id` non numerique

**Statut:** ferme  
**Theme:** aligner le mapping login et `GET /v1/users/me` avec les identifiants Telegram alphanumeriques (sans modifier `generated/*`)

### Actions
- Type `User.telegram_id` et `AuthUser.telegram_id` : `string | number`.
- Remplacement du cast `Number(telegramRaw)` seul par `parseTelegramIdFromApi` : chaîne entièrement numérique → `number` (safe integer), sinon chaîne telle quelle, nombre fini conservé.
- Tests Vitest sur `login` et `initializeAuth` (chemins session).

### Fichiers touches
- `recyclique-1.4.4/frontend/src/stores/authStore.ts`
- `recyclique-1.4.4/frontend/src/services/authService.ts`
- `recyclique-1.4.4/frontend/src/stores/__tests__/authStore.test.ts`
- `recyclique-1.4.4/frontend/src/test/stores/authStore.test.ts` (attente explicite `telegram_id: undefined` pour egalite stricte)

### Validation
- `npx vitest run src/stores/__tests__/authStore.test.ts` : **15 tests OK**
- `src/test/stores/authStore.test.ts` : le test « should login successfully » (attente `telegram_id: undefined`) passe ; **6 autres tests** de ce fichier echouent encore (API attendue obsolete : `canManageUsers`, permissions caisse sur `user` sans `permissions` dans le mock) — **hors perimetre** de ce micro-lot
- ESLint sur les fichiers modifies : **0 erreur** (warnings `any` preexistants)

### Resultat
- Les reponses API avec `telegram_id` alphanumerique ne sont plus perdues dans le store persiste (partialize `currentUser`).

---

## Lot 4F — API login : `AuthUser.telegram_id` en `str` (alignement DB)

**Statut:** ferme  
**Theme:** aligner le schéma de reponse `POST /auth/login` sur la colonne `users.telegram_id` (VARCHAR) et sur la chaine frontend (lot 4E)

### Actions
- `AuthUser.telegram_id` : `Optional[int]` remplace par `Optional[str]` avec description OpenAPI (valeurs non numeriques acceptees sans conversion fragile).
- Aucun changement fonctionnel requis dans `endpoints/auth.py` : `AuthUser.model_validate(user)` et le fallback manuel passent deja la valeur ORM telle quelle.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/schemas/auth.py`
- `recyclique-1.4.4/api/tests/test_auth_login_endpoint.py` (`test_login_success_non_numeric_telegram_id`)

### Validation
- `pytest tests/test_auth_login_endpoint.py tests/test_auth_login_username_password.py` : **24 tests OK**
- Diagnostics IDE sur les fichiers modifies : **0 probleme**
- `flake8` : module non disponible dans l'environnement Python invoque pour ce run (non bloquant si CI dispose des dev deps)

### Resultat
- Le login ne renvoie plus d'erreur 500 lorsque `telegram_id` en base est alphanumerique ; le JSON expose une chaine coherente avec la DB et le frontend.

---

## Lot 4G — Test backend `GET /users/me` : `telegram_id` non numerique

**Statut:** ferme  
**Theme:** verrouiller la serialisation `UserResponse` sur `GET /v1/users/me` lorsque `telegram_id` est alphanumerique (alignement lots 4E / 4F)

### Actions
- Ajout de `test_get_me_preserves_non_numeric_telegram_id` dans `test_user_self_endpoints.py` : utilisateur en base avec `telegram_id` alphanumerique, JWT, appel `GET /v1/users/me`, validation `UserResponse` + egalite JSON.
- Correction des chemins des tests existants du meme fichier : `/api/v1/...` → `/v1/...` (conforme a `settings.API_V1_STR` dans `main.py`) — sans quoi les trois tests du fichier retournaient `404` et la validation du fichier etait impossible.

### Fichiers touches
- `recyclique-1.4.4/api/tests/test_user_self_endpoints.py`

### Validation
- `pytest tests/test_user_self_endpoints.py` : **3 tests OK**
- Diagnostics IDE sur le fichier modifie : **0 probleme**
- `ruff` : non disponible dans l'environnement Python invoque pour ce run (non bloquant si CI dispose des dev deps)
- QA mini-lot : **OK** (reponse 200, pas de perte / coercion numerique sur `telegram_id`)

### Resultat
- `GET /v1/users/me` est couvert pour le cas `telegram_id` alphanumerique, en coherence avec le schema `UserResponse` et la colonne VARCHAR.
- Les self-endpoints de ce fichier de test ciblent desormais le bon prefixe API.

---

## Lot 4H — Core : helper `username_or_telegram_id` pour audit `SaleService`

**Statut:** ferme  
**Theme:** extraire le fallback `username or telegram_id` (details audit modification de prix) dans un helper pur reutilisable, sans changer le comportement

### Actions
- Ajout de `recyclic_api.core.user_identity.username_or_telegram_id` : meme semantique que `username or telegram_id` (chaine vide → repli sur `telegram_id`).
- `SaleService.update_sale_item` : cle `username` des details `log_audit` passe par ce helper.
- Tests `@pytest.mark.no_db` sur le helper (`tests/test_user_identity.py`).

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/core/user_identity.py`
- `recyclique-1.4.4/api/src/recyclic_api/services/sale_service.py`
- `recyclique-1.4.4/api/tests/test_user_identity.py`
- `references/consolidation-1.4.5/2026-03-23_journal-assainissement-1.4.5.md`

### Validation
- `pytest tests/test_user_identity.py` : **4 tests OK** (semantique `or` verrouillee).
- `pytest tests/test_sale_service.py::test_sale_service_update_sale_item_admin_updates_price` : **non execute avec succes** sur la machine du run sous SQLite minimal (`cash_registers` absent du `create_all` partiel dans `conftest`) — **hors regression de ce lot** ; a rejouer avec `TEST_DATABASE_URL` PostgreSQL ou schema SQLite elargi si besoin.
- Diagnostics IDE / lints sur les fichiers Python modifies : **0 probleme**

### Resultat
- Un seul point d'usage conserve dans `sale_service` ; le fallback est documente et testable sans DB.

---

## Micro-lot 4I — `admin_users_history` + `username_or_telegram_id`

### Theme
Reutiliser le helper `username_or_telegram_id` pour le parametre `username` des trois appels `log_admin_access` dans `admin_users_history.py`, en conservant la semantique stricte `username or telegram_id` (deja garantie par le helper et ses tests).

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_users_history.py`
- `references/consolidation-1.4.5/2026-03-23_journal-assainissement-1.4.5.md`

### Validation
- `pytest tests/test_admin_users_history_routes.py tests/test_user_identity.py` : **5 tests OK**
- Diagnostics IDE / lints sur le fichier endpoint modifie : **0 probleme**

### Resultat / mini-QA
- Les trois branches (succes, `ValueError`, `Exception`) passent la meme valeur qu'avant vers `log_admin_access` ; alignement avec les autres usages du helper (`SaleService`).
- Lot ferme ; pret commit/push sur branche courante si le reste du worktree reste propre.

---

## Micro-lot 4J — `admin_users_read` + `username_or_telegram_id`

### Theme
Reutiliser le helper `username_or_telegram_id` pour le parametre `username` des quatre appels `log_admin_access` dans `admin_users_read.py` (liste utilisateurs, statuts succes/echec, pending), en conservant la semantique stricte `username or telegram_id` ; aucun changement aux schemas JSON des reponses.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_users_read.py`
- `references/consolidation-1.4.5/2026-03-23_journal-assainissement-1.4.5.md`

### Validation
- `pytest tests/test_admin_users_read_routes.py tests/test_user_identity.py` : **5 tests OK**
- Diagnostics IDE / lints sur le fichier endpoint modifie : **0 probleme**

### Resultat / mini-QA
- Meme valeur passee a `log_admin_access` qu'avec `current_user.username or current_user.telegram_id` (helper documente comme equivalent strict).
- Alignement avec `admin_users_history` et `SaleService`.
- Lot ferme ; pret commit/push si worktree reste limite a ces fichiers.

---

## Micro-lot 4K — `admin_observability` + `username_or_telegram_id`

### Theme
Reutiliser le helper `username_or_telegram_id` pour le parametre `username` de l'unique appel `log_admin_access` dans `get_email_logs` (`admin_observability.py`), en conservant la semantique stricte `username or telegram_id` ; aucun changement aux schemas JSON (`EmailLogListResponse` inchangé).

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_observability.py`
- `references/consolidation-1.4.5/2026-03-23_journal-assainissement-1.4.5.md`

### Validation
- `pytest tests/test_admin_observability_endpoints.py tests/test_user_identity.py` : **8 OK, 1 skip** (warnings Pydantic hors sujet)
- `pytest tests/test_email_logs_endpoint.py::TestEmailLogsEndpoint::test_get_email_logs_success_admin` : **1 OK** (controle route `/admin/email-logs`)
- Diagnostics IDE / lints sur le fichier endpoint modifie : **0 probleme**

### Resultat / mini-QA
- Seul `get_email_logs` appelait `log_admin_access` avec `username=current_user.username` ; les autres routes observabilite n'ont pas d'audit admin access dans ce module.
- Valeur passee a `log_admin_access` identique a `current_user.username or current_user.telegram_id` via le helper aligne sur 4I/4J.
- Lot ferme ; pret commit/push si worktree reste limite a ces fichiers.

---

## Micro-lot 4L — `admin_users_groups` + `username_or_telegram_id`

### Theme
Reutiliser le helper `username_or_telegram_id` pour le parametre `username` des deux appels `log_admin_access` dans `admin_users_groups.py` (succes initial et echec utilisateur introuvable), en conservant la semantique stricte `username or telegram_id` ; `log_role_change` laisse en place `current_user.username or current_user.telegram_id` (hors perimetre) ; aucun changement aux schemas JSON (`AdminResponse` / `UserGroupUpdateRequest` inchanges).

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_users_groups.py`
- `references/consolidation-1.4.5/2026-03-23_journal-assainissement-1.4.5.md`

### Validation
- `pytest tests/test_admin_users_groups_routes.py tests/test_user_identity.py` : **5 tests OK** (warnings Pydantic hors sujet)
- Diagnostics IDE / lints sur le fichier endpoint modifie : **0 probleme**

### Resultat / mini-QA
- Meme valeur passee a `log_admin_access` qu'avec `current_user.username or current_user.telegram_id` (helper documente comme equivalent strict dans `user_identity.py`).
- Alignement avec `admin_users_read`, `admin_users_history`, `admin_observability`.
- Lot ferme ; pret commit/push si worktree reste limite a ces fichiers.

---

## Micro-lot 4M — `admin_users_mutations` + `username_or_telegram_id`

### Theme
Reutiliser le helper `username_or_telegram_id` pour le parametre `username` des six appels `log_admin_access` dans `admin_users_mutations.py` (role, status, profil : succes initial et echec utilisateur introuvable), en conservant la semantique stricte `username or telegram_id` ; `log_role_change` laisse en place `current_user.username or current_user.telegram_id` (hors perimetre, comme en 4L) ; aucun changement aux schemas JSON (`AdminResponse`, corps de requete inchanges).

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_users_mutations.py`
- `references/consolidation-1.4.5/2026-03-23_journal-assainissement-1.4.5.md`

### Validation
- `pytest tests/test_admin_users_mutations_routes.py tests/test_user_identity.py` : **5 tests OK** (warnings Pydantic hors sujet)
- Diagnostics IDE / lints sur le fichier endpoint modifie : **0 probleme**

### Resultat / mini-QA
- Meme valeur passee a `log_admin_access` qu'avec `current_user.username or current_user.telegram_id` (helper documente comme equivalent strict dans `user_identity.py`).
- Alignement avec `admin_users_groups`, `admin_users_read`, `admin_users_history`, `admin_observability`.
- Lot ferme ; pret commit/push si worktree reste limite a ces fichiers.

---

## Micro-lot 4N — `admin_users_credentials` + `username_or_telegram_id`

### Theme
Reutiliser le helper `username_or_telegram_id` pour le parametre `username` des six appels `log_admin_access` dans `admin_users_credentials.py` (force-password et reset-pin : succes initial, echec utilisateur introuvable, exception generique), en conservant la semantique stricte `username or telegram_id` ; `log_audit`, `log_role_change` et `logger.info` laissent en place `current_user.username or current_user.telegram_id` (hors perimetre, comme en 4M) ; aucun changement aux schemas JSON (`AdminResponse`, corps de requete inchanges).

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin_users_credentials.py`
- `references/consolidation-1.4.5/2026-03-23_journal-assainissement-1.4.5.md`

### Validation
- `pytest tests/test_admin_users_credentials_routes.py tests/test_user_identity.py` : **5 tests OK** (warnings Pydantic hors sujet)
- Diagnostics IDE / lints sur le fichier endpoint modifie : **0 probleme**

### Resultat / mini-QA
- Meme valeur passee a `log_admin_access` qu'avec `current_user.username or current_user.telegram_id` (helper documente comme equivalent strict dans `user_identity.py`).
- Alignement avec `admin_users_mutations`, `admin_users_groups`, `admin_users_read`, `admin_users_history`, `admin_observability`.
- Lot ferme ; pret commit/push si worktree reste limite a ces fichiers.

---

## Micro-lot 4O — `admin.py` (approve/reject) + `username_or_telegram_id`

### Theme
Reutiliser le helper `username_or_telegram_id` pour les appels `log_admin_access` et `log_role_change` des routes `POST .../approve` et `POST .../reject` encore definies dans `admin.py`, en conservant la semantique stricte `username or telegram_id` ; aucun changement aux schemas JSON (`AdminResponse`, corps de requete inchanges) ni aux champs `data` des reponses.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/admin.py`
- `references/consolidation-1.4.5/2026-03-23_journal-assainissement-1.4.5.md`

### Validation
- `pytest tests/test_admin_pending_endpoints.py tests/test_user_identity.py` : **18 tests OK** (warnings Pydantic hors sujet)
- Diagnostics IDE / lints sur le fichier endpoint modifie : **0 probleme**

### Resultat / mini-QA
- Memes valeurs passees a `log_admin_access` / `log_role_change` qu'avec `username or telegram_id` (helper documente comme equivalent strict dans `user_identity.py`).
- Alignement avec les autres modules admin deja migres (`4I`–`4N`).
- Perimetre volontairement limite aux deux handlers approve/reject restants dans `admin.py` ; pas de refactor du reste du fichier (mojibake dans les messages, route `test-notifications`, etc.).
- Lot ferme ; pret commit/push si worktree reste limite a ces fichiers.

---

## Micro-lot 4P — `core/auth.py` : suppression des helpers Telegram morts

### Theme
Retirer `get_user_by_telegram_id` et `authenticate_user` (module `recyclic_api.core.auth`) : aucun import ni appel dans le depot ; l'endpoint `GET .../telegram/{telegram_id}` du doublon de routes `api/api/.../users.py` implemente sa propre requete ORM et n'utilise pas ces fonctions. `TelegramLinkService.authenticate_user` (username/mot de passe) est un autre symbole, non concerne.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/core/auth.py`
- `references/consolidation-1.4.5/2026-03-23_journal-assainissement-1.4.5.md`

### Validation
- `pytest tests/test_auth_login_endpoint.py tests/test_auth_cache_behavior.py` : **14 tests OK** (warnings Pydantic hors sujet)
- Diagnostics IDE / lints sur `auth.py` : **0 probleme**

### Resultat / mini-QA
- Worktree de depart : **propre** (`git status` sans changement inattendu).
- Suppression strictement limitee au bloc mort documente « Utilities for Telegram auth flows » ; pas d'impact sur le cache JWT / Redis ni sur les dependances FastAPI existantes.
- Lot ferme ; pret commit/push si worktree reste limite a ces fichiers.

---

## Micro-lot 4Q — Harmonisation typage `telegram_id` (`AdminUser` / `UserBase`)

### Theme
Aligner les annotations Pydantic sur une chaine optionnelle coherente avec la colonne VARCHAR et les lots `4F` / `UserResponse` : `AdminUser.telegram_id` en `Optional[str]` (plus `Union[int, str]`) ; `UserBase.telegram_id` en `Optional[str] = None` (aligne `UserCreate` / reponses utilisateur). `model_post_init` sur `AdminUser` conserve la normalisation `str(...)` lorsque la valeur est non nulle. Aucun autre schema elargi dans ce micro-lot.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/schemas/admin.py`
- `recyclique-1.4.4/api/src/recyclic_api/schemas/user.py`
- `references/consolidation-1.4.5/2026-03-23_journal-assainissement-1.4.5.md`

### Validation
- Worktree de depart : **propre** (`chore/v1.4.5-consolidation`, aucun diff avant modifications).
- `pytest tests/test_admin_schemas.py tests/test_user_self_endpoints.py tests/test_auth_login_endpoint.py` : **19 tests OK** (warnings Pydantic hors sujet).
- `pytest tests/test_admin_pending_endpoints.py::TestPendingUsersEndpoints::test_get_pending_users_success_returns_list tests/test_admin_pending_endpoints.py::TestPendingUsersEndpoints::test_get_pending_users_preserves_non_numeric_telegram_id` : **2 tests OK**.
- `tests/test_user_creation.py` et `tests/test_auth_signup_endpoint.py` : **non retenus** pour ce lot (routes `POST /users/` et `POST /auth/signup` renvoient **404** dans cette invocation pytest locale ; debranchement connu, sans lien avec le typage des schemas).
- Diagnostics IDE / lints sur `admin.py` et `user.py` : **0 probleme**.

### Resultat / mini-QA
- Contrat type plus strict cote annotation ; entiers issus de l'ORM restent assimilables via coercion Pydantic v2 vers `str` si necessaire, et `model_post_init` garde une couche de normalisation sur `AdminUser`.
- Lot ferme ; **pret commit/push** si le worktree reste limite a ces trois fichiers.

---

## Micro-lot 4R — `telegram_link_service` : annotation `NoReturn` sur `link_telegram_account`

### Theme
Retirer le reliquat de type `Tuple[bool, str]` sur la methode neutralisee : elle ne retourne jamais, elle leve toujours `TelegramLinkDisabledError`. Alignement sur le pattern `NoReturn` deja present dans `domain_exception_http.py`. Aucun changement runtime ; le 410 sur `POST .../link-telegram` inchange.

### Fichiers touches
- `recyclique-1.4.4/api/src/recyclic_api/services/telegram_link_service.py`
- `references/consolidation-1.4.5/2026-03-23_journal-assainissement-1.4.5.md`

### Validation
- Worktree de depart : **propre** (`chore/v1.4.5-consolidation`, aucun diff avant modifications).
- `pytest tests/test_telegram_link_arch03.py tests/test_telegram_link_endpoint.py` : **7 tests OK** (warnings Pydantic hors sujet).
- Diagnostics IDE / lints sur `telegram_link_service.py` : **0 probleme**.

### Resultat / mini-QA
- Typage plus fidele au contrat reel (exception systematique) ; pas d'autre elagage sans risque identifie sur ce fichier (signatures et docstrings restent utiles aux appelants / ARCH-03). Comportement HTTP : **410** et detail stable (`TELEGRAM_LINK_DISABLED_DETAIL`) inchanges.
- Lot ferme ; **pret commit/push** si le worktree reste limite a ces deux fichiers.

---

## Etat courant

- **Vague 1:** terminee
- **Vague 2:** terminee en micro-lots executes jusqu'ici
- **Vague 3:** pilote d'isolation ouvert et ferme avec reserve sur le sous-ensemble auth + infra
- **Vague 4:** terminee pour cette passe ; micro-lots `4N` (credentials), `4O` (`admin.py` approve/reject), `4P` (elagage helpers Telegram morts dans `core/auth.py`), `4Q` (schemas `telegram_id` admin / user base) et `4R` (`telegram_link_service` : `NoReturn` sur `link_telegram_account`) executes apres la passe initiale
- **Vague 5:** pilotes architecture backend ouverts ; `delete_site`, trois premiers lots `ARCH-02` (`reception`, `cash_sessions/create`, `cash_sessions/close`), l'axe `ARCH-03/reception` et les pilotes `ARCH-03/cash_sessions/create`, `ARCH-03/cash_sessions/close`, `ARCH-03/cash_sessions/detail`, `ARCH-03/cash_sessions/current`, `ARCH-03/cash_sessions/step update`, `ARCH-03/stats_service`, `ARCH-03/cash_register_service`, `ARCH-03/category_management`, `ARCH-03/category_hard_delete`, `ARCH-03/category_restore`, `ARCH-03/category_soft_delete`, `ARCH-03/category_create`, `ARCH-03/category_update` et la passe DRY HTTP sont fermes
- **Vague 8:** premier pilote `ARCH-04` sur `create_sale` ferme avec reserves acceptees
- **Vague 8:** second pilote `ARCH-04` sur `create_cash_session` ferme avec reserves acceptees
- **Vague 8:** troisieme pilote `ARCH-04` sur `close_cash_session` ferme avec reserves acceptees
- **Vague 8:** quatrieme pilote `ARCH-04` sur la presentation post-fermeture `close_cash_session` ferme avec reserves acceptees
- **Vague 8:** cinquieme pilote `ARCH-04` sur l'export ticket `reception` ferme avec reserves acceptees
- **Vague 8:** sixieme pilote `ARCH-04` sur l'export CSV des lignes `reception` ferme avec reserves acceptees
- **Vague 8:** septieme pilote `ARCH-04` sur la presentation des listes JSON `reception` ferme avec reserves acceptees
- **Vague 8:** nettoyage des tests `reception` aligne et valide en PostgreSQL
- **Vague 5:** nouvel axe ouvert sur `sales` avec un premier lot `ARCH-03` ferme sur `create_sale`
- **Vague 5:** reserve integration `sales` sur le `404` fermee
- **Vague 5:** second lot `ARCH-03` ferme sur `PUT /sales/{sale_id}` (note admin)
- **Vague 5:** troisieme lot `ARCH-03` ferme sur `PATCH /sales/{sale_id}/items/{item_id}`
- **Vague 5:** quatrieme lot `ARCH-03` ferme sur `PATCH /sales/{sale_id}/items/{item_id}/weight`
- **Vague 5:** coherence auth amelioree sur les mutantes `sales`
- **Vague 5:** premier lot `admin` ferme sur le sous-bloc sante / probes
- **Vague 5:** second lot `admin` ferme sur le sous-bloc observabilite / journaux
- **Vague 5:** troisieme lot `admin` ferme sur le seuil d'activite
- **Vague 5:** quatrieme lot `admin` ferme sur la lecture utilisateurs
- **Vague 5:** cinquieme lot `admin` ferme sur les mutations de compte utilisateur
- **Vague 5:** sixieme lot `admin` ferme sur les groupes utilisateur
- **Vague 5:** septieme lot `admin` ferme sur les credentials utilisateur
- **Vague 5:** huitieme lot `admin` ferme sur l'historique utilisateur
- **Vague 5:** neuvieme lot `admin` ferme sur la maintenance cash sessions
- **Vague 5:** dixieme lot `admin` ferme sur le template reception offline
- **Vague 5:** premier lot final Telegram ferme sur la neutralisation des notifications sortantes
- **Vague 5:** second lot final Telegram ferme sur la desactivation de `link-telegram`
- **Vague 5:** troisieme lot final Telegram ferme sur les endpoints bot de depots
- **Vague 5:** quatrieme lot final Telegram ferme sur la suppression des appels directs admin
- **Vague 5:** cinquieme lot final Telegram ferme sur l'elagage du service Telegram
- **Vague 4:** lot `4H` ferme sur helper core `username_or_telegram_id` + usage dans `SaleService` (audit prix item)
- **Vague 4:** lot `4I` ferme sur `admin_users_history` : `log_admin_access` via `username_or_telegram_id`
- **Vague 4:** lot `4J` ferme sur `admin_users_read` : `log_admin_access` via `username_or_telegram_id`
- **Vague 4:** lot `4K` ferme sur `admin_observability` (`get_email_logs`) : `log_admin_access` via `username_or_telegram_id`
- **Vague 4:** lot `4L` ferme sur `admin_users_groups` : `log_admin_access` via `username_or_telegram_id`
- **Vague 4:** lot `4M` ferme sur `admin_users_mutations` : `log_admin_access` via `username_or_telegram_id`
- **Vague 4:** lot `4N` ferme sur `admin_users_credentials` : `log_admin_access` via `username_or_telegram_id`
- **Vague 4:** lot `4O` ferme sur `admin.py` (approve/reject) : `log_admin_access` et `log_role_change` via `username_or_telegram_id`
- **Vague 4:** lot `4P` ferme sur suppression de `get_user_by_telegram_id` / `authenticate_user` (telegram_id) dans `core/auth.py` (code mort sans consommateurs)
- **Vague 4:** lot `4Q` ferme sur harmonisation `telegram_id` : `AdminUser` et `UserBase` en `Optional[str]` (perimetre minimal schemas)
- **Vague 4:** lot `4R` ferme sur `telegram_link_service.link_telegram_account` : retour annote `NoReturn` (plus `Tuple[bool, str]` fantome)
- **Vague 6:** phase coherence frontend ouverte ; premier sous-lot fondations ferme
- **Vague 6:** sous-lot routes/tests ferme
- **Vague 6:** sous-lot convention HTTP / services ferme
- **Vague 6:** sous-lot UX transverse et doc legere ferme avec reserves acceptees
- **Vague 7:** extension backend tests auth/admin/refresh/logout fermee
- **Structure Git:** `recyclique-1.4.4/` detache du depot imbrique ; index parent reecrit (fichiers reels)
- **Lots fermes:** `1A`, `1B`, `1C`, `1D`, `1E`, `1F`, `1G`, `1H`, `1I`, `2A`, `2B`, `2C`, `2D`, `2F`, `2G`, `2H`, `3A`, `3B`, `3C`, `3D`, `3E`, `3F`, `3I`, `4A`, `4B`, `4C`, `4D`, `4E`, `4F`, `4G`, `4H`, `4I`, `4J`, `4K`, `4L`, `4M`, `4N`, `4O`, `4P`, `4Q`, `4R`
- **Lots fermes avec reserve:** `1J`, `1K`, `1L`, `1M`, `1N`, `1O`, `1P`, `1Q`, `1R`, `1S`, `1T`, `1U`, `1V`, `1W`, `1X`, `1Y`, `1Z`, `2AA`, `2AB`, `2AC`, `2AD`, `2AE`, `2AF`, `2AG`, `2AH`, `2AI`, `2AJ`, `2AK`, `2AL`, `2AN`, `2AP`, `2AQ`, `2AR`, `2AS`, `2AT`, `2AU`, `2AV`, `2AW`, `2AX`, `2AY`, `2AZ`, `2BA`, `2BB`, `2BC`, `2BD`, `2BE`, `2BF`, `2BG`, `2BH`, `2BI`, `2BJ`, `2BK`, `2BL`, `2BM`, `2BN`, `2I`, `3G`, `3H`
- **Lots fermes:** ajout des lots `2AM` (realignement des tests `reception`) et `2AO` (reserve integration `sales`)
- **Prochaine etape logique:** poursuivre la coherence `telegram_id` / fallbacks sur d'autres surfaces faible risque si le backlog le demande

---

## Regle de mise a jour

Pour les prochains runs, ce journal doit etre **complete apres chaque lot ferme**, idealement avec:
- theme du lot
- fichiers touches
- validation effectuee
- verdict de cloture
