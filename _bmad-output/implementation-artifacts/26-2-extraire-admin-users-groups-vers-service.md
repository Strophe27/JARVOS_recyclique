# Story 26.2 : P1 — Extraire `admin_users_groups` vers un service dédié

Status: done

**Story key :** `26-2-extraire-admin-users-groups-vers-service`  
**Epic :** 26 — dette qualité API (`recyclique/api/`, audit brownfield 2026-04-19)  
**Implementation artifact :** `_bmad-output/implementation-artifacts/26-2-extraire-admin-users-groups-vers-service.md`

## Dépendances (prérequis)

- **Story 26.1** — **`done`** : pytest canonique (`pyproject.toml`) ; **`AdminService`** supprimé. Ne **pas** réintroduire une classe ou un module nommé **`AdminService`**.
- **Audit** : `references/artefacts/2026-04-19_01_audit-brownfield-recyclic-api-architecture-style-handoff.md` — **F4** (routes grasses), §5.4, §8 checklist PR, §9 P1.
- **Recherche** : `_bmad-output/planning-artifacts/research/technical-dette-qualite-api-audit-brownfield-research-2026-04-22.md`.
- **Epic 26 (pilotage)** : `_bmad-output/planning-artifacts/epics.md` — section **Story 26.2** et bloc **Risques / arbitrages post-26-1**.
- **Clôture P0** : `_bmad-output/implementation-artifacts/2026-04-22-cloture-p0-pytest-story-26-1.md`.

## Story (BDD)

As a **maintainer of the Recyclique API**,  
I want **the ORM logic and validations for admin users/groups moved out of the fat endpoint module**,  
So that **routes stay thin and consistent with the reception-style layering** (**F4**, audit §5.4, §9 P1).

## Acceptance Criteria

**Given** `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_users_groups.py` still carries substantial inline logic (per audit)  
**When** this story is delivered  
**Then** a dedicated service module owns the transactional work and the endpoint delegates  
**And** regression coverage exists (API tests or equivalent) for the affected operations  
**And** checklist §8 audit (alignement architectural) is satisfied for the touched files  
**And** aucune nouvelle classe ou module ne réutilise le **nom canon** `AdminService` comme simple fichier « neuf » pour contourner la règle post-26.1 — tout besoin métier porte un **identifiant distinct** (suffixe domaine) et une revue explicite

### Interprétation exécutable (DS)

- **Service** : au moins un module sous `recyclique/api/src/recyclic_api/services/` dont le **nom** et les **symboles publics** ne sont **pas** `AdminService` / `admin_service` (ex. `admin_user_groups_assignment_service` ou équivalent explicite sur le domaine *assignation de groupes à un utilisateur*).
- **Endpoint** : `register_admin_users_groups_routes` / handler `update_user_groups` se limitent à injection, appels audit logging côté route si pertinent, et délégation au service pour **requêtes ORM**, **validation des UUID**, **commit/refresh**, **construction de** `AdminResponse`.
- **Tests** : exécution **verte** des tests listés en « Gates pytest » (ci-dessous) après refactor ; ajuster les imports de tests seulement si nécessaire (pas de contournement de l’AC).
- **Checklist §8** : l’auteur de PR coche **8.1** (logique dans le service) pour les chemins modifiés ; **8.2** : ce endpoint est en **`def`** (sync) + `Session` — rester cohérent, ne pas introduire `AsyncSession` sans ADR.

## Definition of Done

- [x] Module **service** dédié créé ; endpoint **allégé** ; comportement API inchangé pour les clients (mêmes codes HTTP et corps utiles sur les scénarios couverts).
- [x] `grep -r AdminService` sous `recyclique/api/src/` : **aucune** nouvelle occurrence liée à ce chantier (le nom est **interdit** pour le neuf).
- [x] Gates pytest (voir section **Testing**) : **exit 0**.
- [x] Checklist audit **§8.1** (et **§8.2** si async/DB concerné) revue pour les fichiers touchés ; pas d’élargissement produit hors périmètre **F4**.

## Tasks / Subtasks

- [x] **Conception** : choisir le nom du module service et des fonctions (préfixe domaine, **pas** `AdminService`) ; alignement sur un patron proche de `site_service.py` / `admin_settings_service.py` (session injectée, fonctions pures côté métier).
- [x] **Extraire** la logique transactionnelle de `admin_users_groups.py` : résolution `User` par id, validation des `Group`, mutation `user.groups`, `commit` / `refresh`, préparation des données pour `log_role_change` et `AdminResponse`.
- [x] **Garder** dans l’endpoint (ou un helper mince) : `log_admin_access` *entry* si l’ordre des logs actuels doit être préservé ; documenter dans **Completion Notes** si l’ordre a été volontairement inchangé.
- [x] **Tests** : confirmer que `tests/test_user_groups.py`, `tests/test_admin_users_groups_routes.py`, et la classe `TestAdminUsersGroupsContract` dans `tests/test_groups_and_permissions.py` passent ; lancer le gate minimal + peloton ciblé (ci-dessous).
- [x] **Doc** : docstring du nouveau module (FR ou EN cohérent avec le fichier voisin) ; mettre à jour **Dev Agent Record** (File List, commandes exactes).

## Dev Notes

### Ancres code (lecture obligatoire avant modification)

| Sujet | Chemins |
|--------|---------|
| Endpoint actuel (route « grasse ») | `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_users_groups.py` |
| Enregistrement routeur | `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin.py` (`register_admin_users_groups_routes`) |
| Schémas | `recyclic_api.schemas.admin` (`AdminResponse`) ; `recyclic_api.schemas.permission` (`UserGroupUpdateRequest`) |
| Modèles | `recyclic_api.models.user.User` ; `recyclic_api.models.permission.Group` |
| Audit | `recyclic_api.core.audit` (`log_admin_access`, `log_role_change`) ; `username_for_audit` |
| Patron service voisin (sync ORM) | `recyclique/api/src/recyclic_api/services/site_service.py`, `admin_settings_service.py` |

### Interdit / risques

- **Interdit** : créer `admin_service.py` ou une classe `AdminService` pour « remplacer » l’ancien module supprimé en 26-1.
- **Risque** : dupliquer la logique d’audit — centraliser les appels pour éviter divergences.
- **Risque** : tests qui **commit** et effets de bord (F7) — ne pas affaiblir l’isolation existante sans nécessité.

### Testing / gates (Story Runner parent)

- **Gates exécutables (preuve de non-régression, alignés `sprint-status` / clôture story)** : depuis `recyclique/api`  
  - `python -m compileall src/recyclic_api -q`  
  - `python -m pytest tests/test_infrastructure.py tests/test_user_groups.py tests/test_admin_user_groups_assignment_service.py tests/api/test_admin_user_management.py --tb=short`  
  (Variante équivalente documentée en Dev Agent Record : peloton + `test_admin_users_groups_routes.py` + `TestAdminUsersGroupsContract` — l’**AC** exige des tests de régression sur les opérations affectées, pas un gel sur une liste figée de fichiers de test.)
- **Gate minimal hérité 26-1** : `python -m pytest tests/test_infrastructure.py` seul reste l’**ancre** de stabilité CI quand on raisonne « périmètre infrastructure ».
- **Peloton ciblé** (référence initiale story / audit F4) :  
  `tests/test_user_groups.py`, `tests/test_admin_users_groups_routes.py`, `tests/test_groups_and_permissions.py::TestAdminUsersGroupsContract` ; complété par **`tests/test_admin_user_groups_assignment_service.py`** (couche service post-livraison).

**Gates vs critères d’acceptation :** les **commandes** ci-dessus (et le brief Story Runner) matérialisent la **preuve reproductible** (régression, compilation). Les **AC BDD** (service dédié, délégation, pas de contournement `AdminService`, checklist §8 quand on touche le code) portent sur le **comportement et la forme** du livrable : elles ne sont **pas** remplacées par une liste figée de fichiers `pytest` — celle-ci peut évoluer tant que l’intention (couverture des chemins `admin_users_groups` + service) est tenue.

### Fichiers attendus (DS) — trace F7–F11 (`epic-26-cloture-f7-f11-trace.md`)

Mise à jour **du fichier de trace** uniquement en **fin d’epic** ou quand le parent demande la synchro. Pour le **DS** de la story 26.2, **documenter ici** les fichiers probables pour revue **§8** / F7–F11 :

| Fichier (probable) | F7 | F8 | F9 | F10 | F11 |
|---------------------|----|----|----|----|-----|
| `endpoints/admin_users_groups.py` | — | docstrings | — | — | — |
| Nouveau `services/..._service.py` | — | docstrings | — | — | — |
| `tests/test_user_groups.py` (etc.) | isolation tests | docstrings tests | — | — | conftest si changement collecte |

- **F7** : pas de changement requis de `conftest` sauf preuve d’effet de bord.
- **F8** : toute **nouvelle** API publique du service : docstring explicite.
- **F9** : ne touche `ConflictError` que si l’évolution des erreurs l’impose (hors scope nominal).
- **F10** / **F11** : pas de cible par défaut pour cette story.

### Project Structure Notes

- Périmètre **strict** : `recyclique/api/`, aligné **Epic 26**.
- Exports : ajouter l’import du service dans le package si convention du dépôt (`services/__init__.py` — seulement si le projet l’exige pour les tests ou la découverte).

### References

- `_bmad-output/planning-artifacts/epics.md` — **Story 26.2**, **Checklist clôture Epic 26 (F7–F11)**
- `references/artefacts/2026-04-19_01_audit-brownfield-recyclic-api-architecture-style-handoff.md` — §5.4, §7 **F4**, **§8** checklist PR
- `_bmad-output/planning-artifacts/research/technical-dette-qualite-api-audit-brownfield-research-2026-04-22.md`
- `_bmad-output/implementation-artifacts/26-1-p0-pytest-maitre-et-sort-admin-service.md` (leçon : pas de `AdminService`)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/epic-26-cloture-f7-f11-trace.md` (lecture — pas de modification obligatoire en CS)

## Trace Epic 26 — ADR

| Élément | Valeur |
|--------|--------|
| Nouvelle ADR structurante requise ? | **ADR N/A** — extraction de service sync dans le périmètre existant ; pas de nouvelle couche **async** admin sans produit. |

## Alignement sprint / YAML

- Clé **`26-2-extraire-admin-users-groups-vers-service`** : statut **`done`** dans `_bmad-output/implementation-artifacts/sprint-status.yaml` ; **`epic-26`** : **`in-progress`** (stories **26.3–26.5** encore **backlog**).
- Cette section décrit l’**état actuel** post–Story Runner (CS → VS → DS → gates → QA → CR) ; pas de régression de statut impliquée par une relecture documentaire (QA2).

## Dev Agent Record

### Agent Model Used

gpt-5.2 (Task DS Story Runner BMAD)

### Debug Log References

*(vide)*

### Completion Notes List

- Module `admin_user_groups_assignment_service.py` : `update_user_groups_assignment` + exceptions métier (`UserNotFoundForAssignment`, `GroupNotFoundForAssignment`, `InvalidGroupIdForAssignment`) ; `log_role_change` centralisé côté service après commit.
- Endpoint : `log_admin_access` succès **avant** l'appel service (ordre volontairement **identique** à l'existant) ; échec « utilisateur non trouvé » : second `log_admin_access` puis 404 ; **CR cr_loop=1** : mêmes `log_admin_access` (`success=False`, `error_message`) pour groupe introuvable et id de groupe invalide ; 500 : message client générique + `logger.exception` (plus de `str(e)` exposé).
- Service : chargement des `Group` en **une** requête `IN` après validation des UUID (liste vide → pas de requête groupe).
- Aucune occurrence `AdminService` sous `recyclique/api/src/` (grep).
- **Gates exécutés (cwd `recyclique/api`, exit 0)** : `python -m compileall src/recyclic_api -q` ; `python -m pytest tests/test_infrastructure.py tests/test_user_groups.py tests/api/test_admin_user_management.py --tb=short` ; peloton story : `tests/test_admin_users_groups_routes.py` + `tests/test_groups_and_permissions.py::TestAdminUsersGroupsContract` + `tests/test_admin_user_groups_assignment_service.py`.

### File List

- `recyclique/api/tests/test_admin_user_groups_assignment_service.py` (QA : tests service post–26-2)
- `recyclique/api/src/recyclic_api/services/admin_user_groups_assignment_service.py` (nouveau)
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_users_groups.py` (refactor)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (clé **26-2** → **`done`** ; journal d’orchestration — ne pas y relire un état `review` pour **26-2**)
- `_bmad-output/implementation-artifacts/epic-26-cloture-f7-f11-trace.md` (complément F8 / 26-2)
- `_bmad-output/implementation-artifacts/26-2-extraire-admin-users-groups-vers-service.md` (story)

### Change Log

- **2026-04-22** — DS : extraction ORM / transaction / audit `log_role_change` vers `admin_user_groups_assignment_service` ; endpoint allégé ; tests gates verts.
- **2026-04-22** — Task CR retry **cr_loop=1** : traçabilité `log_admin_access` sur erreurs groupe ; optimisation requêtes groupes ; durcissement message 500.
- **2026-04-22** — **CR2 APPROVE** ; story clôturée (`sprint-status` **done**).
- **2026-04-22** — Post–QA2 doc (Story Runner) : alignement `epics.md`, `epic-26-cloture-f7-f11-trace.md` et sections pilotage de cette story (**26-2** **done** vs backlog **26.3–26.5** ; clarification gates vs AC). `development_status.26-2` inchangé **`done`**.

---

## Contexte d’intelligence — Story 26.1 (rappel)

- **`AdminService`** a été **supprimé** car orphelin. Toute couche future **async** admin = **nouveau** module + revue / ADR — pas de restauration du nom ou du fichier par copie (voir `epics.md` **Risques / arbitrages post-26-1**).

**Analyse ultime (CS) :** story calée sur **epics** §26.2, chemins d’endpoint et de tests vérifiés sur le dépôt ; service **dédié** avec identifiant **distinct** de `AdminService` ; garde-fous **§8** et trace **F7–F11** documentés pour le DS.

### QA (bmad-qa-generate-e2e-tests, 2026-04-22)

- **Verdict :** **PASS** ; **qa_loop :** 0
- **Synthèse :** `_bmad-output/implementation-artifacts/tests/test-summary.md` (section Story 26.2)
- **Preuve :** 34 passed, exit 0 —  
  `python -m pytest tests/test_infrastructure.py tests/test_user_groups.py tests/api/test_admin_user_management.py tests/test_admin_users_groups_routes.py tests/test_groups_and_permissions.py::TestAdminUsersGroupsContract tests/test_admin_user_groups_assignment_service.py --tb=short -q` (cwd `recyclique/api`)
- **Tests ajoutés :** `recyclique/api/tests/test_admin_user_groups_assignment_service.py` (couche service, complément des tests API existants)
