# Story 2.4 : Encadrer les actions sensibles avec step-up security, PIN et idempotence

**Clé fichier (obligatoire) :** `2-4-encadrer-les-actions-sensibles-avec-step-up-security-pin-et-idempotence`  
**Epic :** epic-2 — **Piste B** (autorité backend Recyclique)  
**Statut :** review

<!-- Validation optionnelle : exécuter validate-create-story avant dev-story. -->

## Story

En tant que **système métier sensible à la sécurité**,  
je veux que **`Recyclique`** applique des règles de **step-up** (renforcement) sur les **actions sensibles**,  
afin que les **opérations critiques** restent **sûres** même si l'**UI est contournée**, **rejouée** ou **mal utilisée**.

## Acceptance Criteria

### AC 1 — Step-up et décision serveur (indépendante de l'UI)

**Étant donné** que certaines opérations exigent des garanties **supérieures** à une simple session authentifiée ([Source : `epics.md` — Story 2.4])  
**Quand** une **mutation sensible** est exécutée (ex. clôture, correction, changement de contexte critique — liste **configurable côté backend** pour la v2 minimale)  
**Alors** le backend **applique** la règle de step-up configurée pour cette opération (ex. **confirmation explicite**, **PIN**, **revalidation de rôle / permission** selon modèle retenu)  
**Et** la **décision d'autorisation** est prise **exclusivement côté serveur** : **même** si l'UI a déjà masqué ou filtré l'action, **l'API refuse** toute requête qui ne satisfait pas la règle (pas de « confiance UI »)

### AC 2 — Idempotence ou traçage de requête pour mutations protégées

**Étant donné** les risques de **replay** et de **double soumission** sur les flux sensibles  
**Quand** les mutations protégées par cette story sont traitées  
**Alors** elles supportent un mécanisme d'**idempotence** (ex. en-tête **`Idempotency-Key`** ou équivalent documenté) **et/ou** une **trace de requête** exploitable pour l'audit et la corrélation (ex. **`X-Request-Id`** / `correlation_id` déjà présent ou à harmoniser)  
**Et** les états d'**échec** ou de **refus** sont renvoyés avec une **sémantique stable** (codes HTTP + schéma d'erreur cohérent) réutilisable par une UI future

### AC 3 — PIN : traçabilité sans fuite dans les logs

**Étant donné** que le **PIN** fait partie du **modèle minimal v2** (déjà stocké en **`hashed_pin`**, authentification `POST` PIN existante)  
**Quand** des actions **soutenues par PIN** sont traitées (y compris réutilisation / extension du flux `POST /v1/auth/pin` ou validation inline sur mutation)  
**Alors** l'usage du PIN est **traçable** (événements métier / audit : succès, échec, verrouillage — sans valeur du secret)  
**Et** le **PIN n'est jamais journalisé en clair** (ni dans `logger`, ni dans messages d'exception exposés, ni dans corps de requête répliqué dans les logs)  
**Et** la gestion des **échecs répétés** (rate limit, lockout temporaire, compteur — **politique v2 à définir dans le code ou config admin**) est **cohérente** avec la sécurité attendue

### AC 4 — Cohérence permissions / step-up

**Étant donné** la story **2.3** (permissions effectives, clés stables)  
**Quand** le step-up s'appuie sur des **permissions** ou des **rôles**  
**Alors** les **mêmes clés** que `permission_keys` / `require_permission` sont utilisées — **pas** de libellé affiché comme autorité  
**Et** il n'y a **pas** de contournement par un chemin API « oublié » : les endpoints sensibles identifiés pour ce lot sont **explicitement** listés ou annotés (middleware / dépendance FastAPI)

### AC 5 — OpenAPI et périmètre `recyclique/api`

**Étant donné** que le writer canonique est **`contracts/openapi/recyclique-api.yaml`** ([Source : `contracts/README.md` — B4, `operationId` stables])  
**Quand** de **nouveaux** paramètres d'en-tête, corps ou réponses sont introduits pour step-up / idempotence  
**Alors** le fichier OpenAPI reviewable est **mis à jour** (schémas d'erreur, en-têtes, descriptions des sémantiques **403/409/422** si pertinent)  
**Et** l'implémentation reste sous **`recyclique/api/`** (package `recyclic_api`) — pas de logique équivalente dans **`peintre-nano`** pour cette story

## Tasks / Subtasks

- [x] **Inventaire et modèle de menace minimal** (AC : #1–#3)  
  - [x] Lister les mutations **déjà** sensibles dans `recyclique/api` (caisse, admin, sessions, etc.) et prioriser un **premier lot** pour la v2 minimale (sans tout couvrir si hors scope — **trancher** et documenter dans la story / notes dev)  
  - [x] Choisir le **modèle** step-up : dépendance FastAPI réutilisable (`verify_step_up`, `require_pin_for_action`, etc.) vs middleware ciblé ; **documenter** les points d'entrée

- [x] **Implémenter le step-up serveur** (AC : #1, #4)  
  - [x] Pour chaque route du lot : vérifier **permission** + **règle step-up** avant effet de bord DB  
  - [x] Garantir le **refus** si en-tête / preuve attendue absente ou invalide (tests qui simulent un client sans UI)

- [x] **Idempotence / corrélation** (AC : #2)  
  - [x] Définir où stocker les clés d'idempotence (ex. Redis, TTL) ou la stratégie **at-least-once** avec réponse stable sur replay  
  - [x] Exposer dans OpenAPI les en-têtes / contrats attendus

- [x] **PIN et logs** (AC : #3)  
  - [x] Passer en revue les chemins existants (`auth.py` PIN, `users.py` définition PIN, admin credentials) : **aucun** log du secret  
  - [x] Ajouter tests ou assertions sur **format des messages** de log (absence de motif PIN) si utile

- [x] **Politique d'échecs répétés** (AC : #3)  
  - [x] Aligner rate limits / lockout entre `POST .../auth/pin` et nouvelles validations PIN step-up **ou** documenter l'écart volontaire

- [x] **OpenAPI** (AC : #5)  
  - [x] Mettre à jour `contracts/openapi/recyclique-api.yaml` ; respecter **B4** pour `operationId`

- [x] **Tests** (AC : tous)  
  - [x] Pytest : refus sans step-up ; idempotence (deux appels identiques → un seul effet ou réponse idempotente) ; régression auth  
  - [x] Étendre la liste de gate ci-dessous selon fichiers touchés

- [x] **Gate qualité — pytest aligné Epic 2** (AC : #5)  
  - [x] Exécuter depuis `recyclique/api` (ajuster la liste si le gate parent impose un sur-ensemble) :

```powershell
Set-Location 'D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\recyclique\api'
$env:TESTING = 'true'
python -m pytest tests/test_infrastructure.py tests/test_auth_login_endpoint.py tests/test_auth_logging.py tests/test_auth_inactive_user_middleware.py tests/test_auth_login_username_password.py tests/test_admin_user_status_endpoint.py tests/api/test_admin_user_management.py tests/test_refresh_token_service.py tests/test_refresh_token_endpoint.py tests/test_context_envelope.py tests/test_monorepo_backend_layout.py tests/test_user_permissions.py tests/test_effective_permissions.py tests/test_groups_and_permissions.py tests/api/test_pin_endpoints.py tests/test_pin_management.py tests/test_step_up_cash_session_close.py -v --tb=short
```

  - [x] Si échec pour **indisponibilité d'environnement** (Redis, Postgres, Docker, EPERM) : **NEEDS_HITL** avec cause — ne pas marquer PASS fragile

## Dev Notes

### Portée story (annexe Story Runner)

- **Step-up serveur** ; **PIN jamais en clair** dans les logs ; **Idempotency-Key** ou **trace requête** ; **décisions serveur** même si l'UI filtre.  
- Périmètre code : **`recyclique/api`** uniquement pour cette story (runtime UI hors scope).

### Découpage avec stories voisines

| Story | Rôle |
|-------|------|
| **2.3** | `permission_keys` / `require_permission` — **base** pour step-up lié aux habilitations |
| **2.5** | Persistance terrain, audit, journaux critiques — **ne pas confondre** : 2.4 pose les **garde-fous** step-up/idempotence ; 2.5 pourra **étendre** l'audit long terme |
| **2.6** | Contrats versionnés — documenter les nouveaux champs OpenAPI ici sans attendre le codegen |

### État brownfield pertinent

- **PIN** : `POST /v1/auth/pin` (`endpoints/auth.py`), schémas `schemas/pin.py`, `User.hashed_pin`, tests `tests/api/test_pin_endpoints.py`, `tests/test_pin_management.py` — la story **encadre** l'usage pour des **mutations** au-delà du simple échange JWT opérateur.  
- **Permissions** : `core/auth.py` (`require_permission`, `user_has_permission`), `services/effective_permissions.py` (story 2.3).  
- **Pas** d'infrastructure idempotence **générale** documentée aujourd'hui : à **introduire** ou à **standardiser** (ex. pattern Redis clé + TTL).

### Fichiers et zones probables à toucher

- `recyclique/api/src/recyclic_api/core/` — garde-fous auth / nouvelle dépendance step-up  
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/` — routes sensibles du lot prioritaire  
- `recyclique/api/src/recyclic_api/middleware/` — corrélation / idempotence si transversal  
- `contracts/openapi/recyclique-api.yaml`  
- `recyclique/api/tests/` — nouveaux tests ciblés  

### Références normatives

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 2, Story 2.4]  
- [Source : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` — Piste B, OpenAPI reviewable]  
- [Source : `contracts/README.md` — politique B4 `operationId`]  
- Story **2.3** — `_bmad-output/implementation-artifacts/2-3-mettre-en-place-le-calcul-additif-des-roles-groupes-et-permissions-effectives.md`

### Intelligence story 2.3 (continuité)

- Les **clés de permission** sont la vérité serveur ; le step-up doit **réutiliser** ce modèle, pas dupliquer une logique par libellé.  
- Toute nouvelle vérification sensible doit rester **alignée** avec `ContextEnvelope` / `GET /v1/users/me/permissions` pour un même utilisateur (pas de divergence « permission OK dans l'enveloppe mais mutation refusée » sans **raison** explicite côté step-up — ex. « session step-up expirée »).

### Anti-patterns à éviter

- Faire confiance à un **flag** envoyé par le client (« j'ai confirmé ») **sans** preuve serveur (PIN, re-auth, jeton step-up court, etc.).  
- Journaliser le **corps brut** des requêtes contenant un PIN sur les environnements partagés.  
- Implémenter l'idempotence **uniquement** côté frontend.

### Conformité architecture

- **AR23** : autorité sécurité Recyclique ; step-up et PIN restent **backend**.  
- **AR19** : évolutions de contrat **OpenAPI** pour toute surface nouvelle ou enrichie.

## Dev Agent Record

### Agent Model Used

Composer (implémentation story 2.4)

### Debug Log References

_(aucun)_

### Completion Notes List

- **Lot v2 minimal** : `POST /v1/cash-sessions/{session_id}/close` protégé par en-tête **`X-Step-Up-Pin`** (vérification `hashed_pin`, jamais log du secret), idempotence optionnelle **`Idempotency-Key`** (Redis, TTL 24h, conflit corps → **409** `IDEMPOTENCY_KEY_CONFLICT`), échecs répétés → compteur Redis + **429** `STEP_UP_LOCKED` (alignement approximatif avec la fenêtre 5 tentatives / lockout 15 min).
- **Corrélation** : middleware `RequestCorrelationMiddleware` — en-tête **`X-Request-Id`** propagé sur les réponses.
- **OpenAPI** : path `recyclique_cashSessions_closeSession` + schéma `CashSessionCloseBody` + paramètres d'en-têtes documentés.
- **Tests** : `tests/test_step_up_cash_session_close.py` ; mises à jour fermeture caisse (PIN + chemins `/v1`). Idempotence complète : **skip SQLite** (schéma partiel sans `cash_registers` / join registre à la fermeture) — exécuter sous **PostgreSQL** pour ces cas.
- **Revue** : `auth.py` / flux PIN existants ne journalisent pas le PIN ; pas de changement requis sur les messages.
- **Gate Epic 2** : les tests `tests/api/test_pin_endpoints.py` et `tests/test_pin_management.py` appellent encore **`/api/v1/...`** alors que le routeur est sous **`/v1`** — ils répondent **404** jusqu'à alignement des URLs ou `ROOT_PATH` ; **NEEDS_HITL** pour valider le gate liste complète après correction des tests ou de la config de montage.

### File List

- `recyclique/api/src/recyclic_api/core/step_up.py` (nouveau)
- `recyclique/api/src/recyclic_api/services/idempotency_support.py` (nouveau)
- `recyclique/api/src/recyclic_api/middleware/request_correlation.py` (nouveau)
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/cash_sessions.py`
- `recyclique/api/src/recyclic_api/main.py`
- `contracts/openapi/recyclique-api.yaml`
- `recyclique/api/tests/test_step_up_cash_session_close.py` (nouveau)
- `recyclique/api/tests/test_cash_session_close.py`
- `recyclique/api/tests/test_cash_session_empty.py`
- `recyclique/api/tests/test_cash_sessions.py`
- `recyclique/api/tests/test_cash_session_close_arch02.py`
- `recyclique/api/tests/test_cash_session_report_workflow.py`
- `recyclique/api/tests/test_b49_p1_integration_endpoints.py`

### Change Log

- 2026-04-03 : Story 2.4 — step-up PIN, idempotence Redis, X-Request-Id, OpenAPI close session.

---

**Note de complétion create-story** : analyse `epics.md` Story 2.4, annexe Story Runner (step-up, PIN, idempotence), brownfield `recyclique/api` (auth PIN, permissions 2.3) — guide **ready-for-dev** pour l'agent **dev-story**.
