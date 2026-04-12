# Story 2.3 : Mettre en place le calcul additif des rôles, groupes et permissions effectives

**Clé fichier (obligatoire) :** `2-3-mettre-en-place-le-calcul-additif-des-roles-groupes-et-permissions-effectives`  
**Epic :** epic-2 — **Piste B** (autorité backend Recyclique)  
**Statut :** done

<!-- Validation optionnelle : exécuter validate-create-story avant dev-story. -->

## Story

En tant qu'**administrateur produit et responsable du modèle de sécurité**,  
je veux que **`Recyclique`** calcule les **permissions effectives** à partir des **rôles**, **groupes** et **contexte** (périmètre actif),  
afin que l'**autorisation** reste **stable**, **explicable** et **adaptable par ressourcerie**, sans que **`Peintre_nano`** devienne une seconde vérité de sécurité.

## Acceptance Criteria

### AC 1 — Clés techniques stables vs libellés (rôles / groupes)

**Étant donné** que la v2 prévoit des rôles et groupes **configurables** par ressourcerie ([Source : `epics.md` — Story 2.3 ; FR14, FR33, FR34 ; `references/artefacts/2026-04-02_03_spec-multi-contextes-invariants-autorisation-v2.md` — §5.2–5.3])  
**Quand** le modèle d'autorisation est implémenté ou complété côté données  
**Alors** chaque **rôle** et chaque **groupe** pertinent pour le calcul dispose d'une **clé technique stable** (identifiant machine, ex. kebab-case / namespace cohérent), **distincte** du **libellé** affiché  
**Et** les **libellés** restent une couche **présentation** : ils ne sont **pas** utilisés pour décider d'un accès serveur

### AC 2 — Union additive des permissions dans le périmètre actif

**Étant donné** que le modèle v2 est **additif** ([Source : spec 1.3 — §5.1, §5.4 ; FR15, FR16])  
**Quand** les permissions effectives sont calculées pour un utilisateur authentifié  
**Alors** le backend calcule l'**union** des permissions accordées via les **affectations de groupes** (multi-appartenance **cumulée**) **et** toute règle **additive** liée au **rôle** / politique applicable dans le **périmètre actif** (site / scope — voir AC 3)  
**Et** le résultat est une **liste de clés de permission** (`permission_keys`) alignée sur la convention existante (ex. `caisse.access`, namespaces stables — spec §5.3)  
**Et** **aucune** permission « inventée » côté client : la **seule** vérité exposée à l'UI pour l'habilitation reste ce calcul serveur (AR23, AR39)

### AC 3 — Isolation par site / scope administratif

**Étant donné** l'exigence **zéro fuite** de contexte entre sites ([Source : spec 1.3 — §3, FR20, FR36])  
**Quand** un opérateur a un **site actif** (ex. `User.site_id` / contexte d'exploitation aligné Story 2.2)  
**Alors** les groupes / habilitations pris en compte pour l'union sont **bornés** au **périmètre autorisé** (ex. groupes et jeux de permissions **rattachés au site** ou globaux selon règles métier documentées — **à trancher en implémentation** sans élargir silencieusement les droits hors périmètre)  
**Et** un utilisateur **sans** habilitation explicite pour agir hors de son îlot **ne** reçoit **pas** de permissions effectives élargies par effet de bord

### AC 4 — Cohérence des surfaces API et OpenAPI

**Étant donné** que le **`ContextEnvelope`** et `GET /v1/users/me/permissions` consomment le même besoin métier ([Source : story 2.2 — `context_envelope_service.py` ; `users.py`])  
**Quand** cette story est livrée  
**Alors** **un seul chemin de calcul** (ou service dédié clairement factorisé) alimente **`permission_keys`** dans l'enveloppe **et** la liste renvoyée par `/me/permissions` (pas de divergence)  
**Et** `contracts/openapi/recyclique-api.yaml` est **mis à jour** : descriptions **`ContextEnvelope.permission_keys`** (et routes voisines si nécessaire) pour refléter l'**union exhaustive** (plus le libellé « sous-ensemble minimal reporté 2.3 » de la story 2.2) ; **`operationId`** inchangés sauf extension documentée (politique **B4** / `contracts/README.md`)

### AC 5 — Non-régression auth et endpoints protégés

**Étant donné** les dépendances **2.1** (session / JWT / cookies) et **2.2** (enveloppe, recalcul explicite)  
**Quand** les permissions sont enrichies  
**Alors** `get_current_user` / `require_permission` / `user_has_permission` restent **cohérents** avec le nouveau calcul (mêmes clés que l'enveloppe pour un même utilisateur et même session DB)  
**Et** les tests existants pertinents sont **étendus** ou **ajustés** sans affaiblir les garde-fous (comptes inactifs, 403, etc.)

## Tasks / Subtasks

- [x] **Cartographier l'existant et l'écart spec §5** (AC : #1–#3)  
  - [x] Relire `core/auth.py` (`get_user_permissions`, `user_has_permission`, `require_permission`), `models/permission.py` (`Group`, `Permission`), `models/user.py` (`UserRole`), endpoints admin groupes / permissions  
  - [x] Lister ce qui manque pour **clé stable ≠ libellé** (colonnes ? table de libellés ? migration Alembic) et pour **filtrage site**

- [x] **Implémenter le moteur additif unique** (AC : #2, #4, #5)  
  - [x] Extraire ou centraliser le calcul dans un module dédié (ex. `services/effective_permissions.py` ou équivalent) appelé par `get_user_permissions` **et** tout autre point unique nécessaire  
  - [x] Règles : union des permissions des groupes membres ; cumul avec règles **rôle** (`ADMIN` / `SUPER_ADMIN` / `USER`) **explicites** et documentées ; pas de modèle **deny** implicite (spec §5.1 — rester additif pur sauf décision tracée)

- [x] **Périmètre actif / site** (AC : #3)  
  - [x] Définir et coder le filtrage des groupes (ou memberships) par `site_id` / scope — en cohérence avec `User.site_id` et les invariants Story 2.2  
  - [x] Cas limites : utilisateur sans site, admin multi-site (spec §1 bis — **exceptions = permissions explicites**, pas libellé)

- [x] **Persistance** (AC : #1)  
  - [x] Migration(s) Alembic si nouvelles colonnes / tables ; jeux de données de test si besoin  
  - [x] Préserver la compatibilité ascendante des **noms** de permissions déjà en base (`permissions.name` comme clé stable ou migration guidée)

- [x] **OpenAPI** (AC : #4)  
  - [x] Mettre à jour `contracts/openapi/recyclique-api.yaml` (descriptions, schémas si nouveaux champs **non secrets** pour libellés vs clés côté admin — **sans** exposer la sécurité au manifeste runtime)

- [x] **Tests** (AC : tous)  
  - [x] Pytest : multi-groupes → union ; cohérence enveloppe vs `/me/permissions` ; cas site / hors site si applicable ; régression sur fichiers existants (`test_user_permissions.py`, `test_context_envelope.py`, `test_groups_and_permissions.py` selon périmètre touché)

- [x] **Gate qualité — pytest aligné Epic 2** (AC : #5)  
  - [x] Exécuter depuis `recyclique/api` (ajuster la liste si le gate parent impose un sur-ensemble) :

```powershell
Set-Location 'D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\recyclique\api'
$env:TESTING = 'true'
python -m pytest tests/test_infrastructure.py tests/test_auth_login_endpoint.py tests/test_auth_logging.py tests/test_auth_inactive_user_middleware.py tests/test_auth_login_username_password.py tests/test_admin_user_status_endpoint.py tests/api/test_admin_user_management.py tests/test_refresh_token_service.py tests/test_refresh_token_endpoint.py tests/test_context_envelope.py tests/test_monorepo_backend_layout.py tests/test_user_permissions.py tests/test_effective_permissions.py tests/test_groups_and_permissions.py -v --tb=short
```

  - [x] Si échec pour **indisponibilité d'environnement** (Redis, Postgres, Docker, EPERM) : **NEEDS_HITL** avec cause — ne pas marquer PASS fragile

## Dev Notes

### Portée story (rappel annexe Story Runner)

- **Piste B** : autorité **backend** Recyclique ; **Peintre_nano** consomme les **clés** (`permission_keys`), **pas** la sécurité (AR23).  
- **Aligner OpenAPI** si nouvelles surfaces ou enrichissement des descriptions.  
- **Dépendances** : **2.1** auth ; **2.2** `ContextEnvelope` minimal — **ne pas dupliquer** la vérité côté frontend.

### Découpage avec stories voisines

| Story | Rôle |
|-------|------|
| **2.2** | Enveloppe + recalcul explicite + `permission_keys` branchés sur `get_user_permissions` — **placeholders** retirés ou complétés ici |
| **2.4** | Step-up, PIN, idempotence sur actions sensibles — **hors scope** sauf points d'ancrage sur les mêmes clés |
| **2.6** | Versionnage / codegen contrats — ne pas bloquer 2.3 ; garder YAML reviewable |

### État brownfield pertinent

- **`get_user_permissions`** : aujourd'hui union des permissions des groupes + raccourci **toutes** permissions si `ADMIN`/`SUPER_ADMIN` ([Source : `recyclique/api/src/recyclic_api/core/auth.py`]).  
- **`Group`** / **`Permission`** : `Group.name` et `Permission.name` uniques — vérifier si `name` sert déjà de clé stable ou s'il faut introduire `key` + `display_name` (ou équivalent) pour satisfaire AC1.  
- **`ContextEnvelope`** : `build_context_envelope` appelle déjà `get_user_permissions` — le **comportement** enrichi doit s'y refléter automatiquement une fois le cœur de calcul mis à jour.

### Fichiers et zones probables à toucher

- `recyclique/api/src/recyclic_api/core/auth.py` — refactor vers service de calcul effectif  
- `recyclique/api/src/recyclic_api/services/context_envelope_service.py` — imports / appels si signature ou contexte supplémentaire (ex. site actif explicite)  
- `recyclique/api/src/recyclic_api/models/permission.py`, `user.py` — schéma données  
- `recyclique/api/migrations/versions/` — nouvelles migrations  
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/users.py`, `groups.py` — cohérence réponses admin vs runtime  
- `contracts/openapi/recyclique-api.yaml` — descriptions `ContextEnvelope`, routes `users`  
- `recyclique/api/tests/` — extensions listées ci-dessus  

### Références normatives

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 2, Story 2.3]  
- [Source : `references/artefacts/2026-04-02_03_spec-multi-contextes-invariants-autorisation-v2.md` — §3 isolation, §5 modèle additif]  
- [Source : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` — Piste B, OpenAPI reviewable]  
- [Source : `contracts/README.md` — politique contrats, B4]  
- Stories **2.2** / **2.2b** — `_bmad-output/implementation-artifacts/2-2-*.md` (chemins `recyclique/api/`)

### Intelligence stories 2.2 et 2.2b (continuité)

- **2.2** : `GET /v1/users/me/context`, `POST /v1/users/me/context/refresh`, `tests/test_context_envelope.py`, OpenAPI — calcul permissions explicitement **partiel** jusqu'à 2.3 ; cette story **complète** l'union additive et la documentation contractuelle.  
- **2.2b** : code canonique sous **`recyclique/api/`** ; Docker `recyclic-local` via `recyclique-1.4.4/docker-compose.yml` ; pas de retour à `recyclique-1.4.4/api/` pour le neuf.

### Anti-patterns à éviter

- Dupliquer un calcul de permissions dans le frontend ou dans les manifests **CREOS** pour « accélérer » — **interdit** pour la décision sécurité (spec §5.5, §7).  
- Utiliser un **libellé** de groupe ou de rôle affiché en base comme clé d'autorisation sans colonne **key** stable — fragile (i18n, renommage).  
- Introduire un modèle **deny** par défaut sans décision produit/architecture explicite (hors additif v2).

### Conformité architecture

- **AR23** : autorité auth/permissions Recyclique ; adaptateur côté UI ne décide pas.  
- **AR19** : Recyclique writer canonique OpenAPI — toute évolution de schéma passe par `contracts/openapi/recyclique-api.yaml`.

## Dev Agent Record

### Agent Model Used

Composer (implémentation DS story 2.3)

### Debug Log References

### Completion Notes List

- Service unique `compute_effective_permission_keys` / `user_has_effective_permission` (`services/effective_permissions.py`) ; `get_user_permissions` et `user_has_permission` délèguent — aligné avec `ContextEnvelope` via `get_user_permissions`.
- Groupes : colonnes `key` (stable), `display_name`, `site_id` ; périmètre = global (`site_id` NULL) ou même site que l'utilisateur ; utilisateur sans site ne reçoit pas les groupes rattachés à un site.
- Permissions : `Permission.name` reste la clé stable (documentée).
- SQLite tests : `conftest` crée `permissions` / `group_permissions` et aligne la table `groups` si schéma ancien.
- OpenAPI : route documentée `GET /v1/users/me/permissions` + descriptions `permission_keys`.

### File List

- `recyclique/api/src/recyclic_api/services/effective_permissions.py` (nouveau)
- `recyclique/api/src/recyclic_api/utils/stable_keys.py` (nouveau)
- `recyclique/api/src/recyclic_api/core/auth.py`
- `recyclique/api/src/recyclic_api/models/permission.py`
- `recyclique/api/src/recyclic_api/models/site.py`
- `recyclique/api/src/recyclic_api/schemas/permission.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/groups.py`
- `recyclique/api/migrations/versions/b53_st2_3_group_key_site_scope.py` (nouveau)
- `recyclique/api/tests/conftest.py`
- `recyclique/api/tests/test_effective_permissions.py` (nouveau)
- `recyclique/api/tests/test_user_permissions.py`
- `recyclique/api/tests/test_groups_and_permissions.py`
- `contracts/openapi/recyclique-api.yaml`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-04-03 : Story 2.3 — moteur additif permissions, schéma groupe (key / site), migration Alembic, OpenAPI, tests.

---

**Note de complétion create-story (moteur contexte)** : analyse artefacts epics, spec 1.3 §5, brownfield `recyclique/api` — guide de mise en œuvre **ready-for-dev** pour l'agent **dev-story**.
