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

## Etat courant

- **Vague 1:** terminee
- **Vague 2:** terminee en micro-lots executes jusqu'ici
- **Vague 3:** pilote d'isolation ouvert et ferme avec reserve sur le sous-ensemble auth + infra
- **Vague 4:** terminee pour cette passe
- **Vague 5:** pilote architecture backend ouvert et ferme avec reserve sur `delete_site`
- **Structure Git:** `recyclique-1.4.4/` detache du depot imbrique ; index parent reecrit (fichiers reels)
- **Lots fermes:** `1A`, `1B`, `1C`, `1D`, `1E`, `1G`, `2A`, `2B`, `2C`, `2D`, `3A`, `3B`, `3C`, `3D`, `3E`, `4A`, `4B`, `4C`, `4D`
- **Lots fermes avec reserve:** aucun a ce stade pour cette passe
- **Prochaine etape logique:** decider s'il faut ouvrir une phase de coherence frontend plus large, et/ou etendre prudemment le pilote tests backend et le pattern `ARCH-03`

---

## Regle de mise a jour

Pour les prochains runs, ce journal doit etre **complete apres chaque lot ferme**, idealement avec:
- theme du lot
- fichiers touches
- validation effectuee
- verdict de cloture
