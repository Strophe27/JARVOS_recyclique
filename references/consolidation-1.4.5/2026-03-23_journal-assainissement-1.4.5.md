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
- **Vague 3:** terminee en micro-lots executes jusqu'ici
- **Vague 4:** terminee pour cette passe
- **Structure Git:** `recyclique-1.4.4/` detache du depot imbrique ; index parent reecrit (fichiers reels)
- **Lots fermes:** `1A`, `1B`, `1C`, `2A`, `2B`, `2C`, `2D`, `3A`, `3B`, `3C`, `3D`, `3E`, `4A`, `4B`, `4C`, `4D`
- **Prochaine etape logique:** voir `2026-03-23_prochaine-passe-assainissement-1.4.5.md` pour la passe suivante en contexte vierge

---

## Regle de mise a jour

Pour les prochains runs, ce journal doit etre **complete apres chaque lot ferme**, idealement avec:
- theme du lot
- fichiers touches
- validation effectuee
- verdict de cloture
