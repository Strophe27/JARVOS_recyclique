# Backend Recyclique — API et données (v2)

**Audience :** architecte externe.  

**Date de rédaction :** 2026-05-20.  

**Périmètre code vivant :** `recyclique/api/` (package `recyclic_api`).  

**Contrat reviewable :** `contracts/openapi/recyclique-api.yaml` (v `0.1.28-draft`).

---

## 1. Positionnement dans le mono-repo

| Zone | Rôle |
|------|------|
| `recyclique/api/` | **Vérité unique** FastAPI depuis story **2.2b** (2026-04-03) : `src/recyclic_api/`, `tests/`, `migrations/`, `pyproject.toml`, `requirements*.txt` |
| `recyclique/README.md` | Point d'entrée humain (pytest, Docker, PIN step-up, lien OpenAPI) |
| `docker-compose.yml` (racine) | Stack **`recyclic-local`** : Postgres 17, Redis 7, API (`recyclique/api/Dockerfile`), `peintre-nano/` (:4444), `recyclique-1.4.4/frontend` legacy (:4445) |
| `recyclique-1.4.4/` | Brownfield **1.4.4** : frontend legacy, `env.example`, compose de compatibilité (inclut le compose racine) — **plus** la racine de dev du package API |
| `contracts/` | OpenAPI + CREOS reviewables ; gouvernance : `contracts/README.md`, pivot `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md` |
| `peintre-nano/` | Client v2 (proxy Vite `/api` → service `api`) |
| `_bmad-output/planning-artifacts/` | PRD, epics, architecture, readiness — **pilotage**, pas runtime |

Référence structure : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`.

---

## 2. Stack backend v2

### 2.1 Runtime et dépendances

Versions **pinnées** dans `recyclique/api/requirements.txt` (alignées sur `pyproject.toml`) :

| Composant | Version / choix | Fichiers |
|-----------|-----------------|----------|
| **Python** | **3.11** en image Docker (`recyclique/api/Dockerfile`) ; local `>=3.11` | `recyclique/api/README.md` |
| **FastAPI** | `0.104.1` | `requirements.txt`, `recyclic_api/main.py` |
| **Uvicorn** | `0.24.0` | compose `command: uvicorn recyclic_api.main:app` |
| **SQLAlchemy** | `2.0.23`, ORM **synchrone** (`Session`, pas async engine) | `recyclic_api/core/database.py` |
| **PostgreSQL** | Driver `psycopg2-binary` ; cible **Postgres 17** en dev compose | `docker-compose.yml` |
| **Alembic** | `1.12.1`, révisions sous `recyclique/api/migrations/versions/` | racine chaîne `335d7c71186e` |
| **Redis** | `redis==5.0.1`, client `recyclic_api/core/redis.py` | healthcheck `/health` dans `main.py` |
| **Auth** | JWT (`python-jose`), bcrypt/passlib, rate limit `slowapi` | `recyclic_api/core/auth.py`, endpoints `auth.py` |
| **Validation** | Pydantic v2 (`2.5.0`), schémas sous `recyclic_api/schemas/` | |

**Redis — rôle réel (pas vérité comptable Paheko) :** cache / activité en ligne (`ActivityService`), ping santé ; **ADR 25-3** : file durable Paheko = **outbox PostgreSQL**, Redis **auxiliaire** (transport, observabilité). Voir `_bmad-output/planning-artifacts/architecture/2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md`.

### 2.2 Application FastAPI

- **Entrée :** `recyclique/api/src/recyclic_api/main.py`
- **Préfixes montés :**
  - `settings.API_V1_STR` → **`/v1`** (défaut, `recyclic_api/core/config.py`) — surface métier brownfield + socle v2
  - **`/v2`** — slice **exploitation** (bandeau live), sans casser `/v1/*` (story 2.7)
- **OpenAPI runtime :** `{API_V1_STR}/openapi.json` ; enrichissement cookies session web v2 (`custom_openapi()`)
- **Erreurs JSON stables :** `RecycliqueApiError` (story 2.6), corrélation `RequestCorrelationMiddleware` (`X-Request-Id`)
- **Lifespan :** scheduler métier, sync kDrive optionnelle, bootstrap super-admin (`initial_data.py`) — désactivé en `TESTING=true`

### 2.3 Persistance et migrations

- **URL :** `DATABASE_URL` (PostgreSQL en prod/dev compose ; SQLite possible en pytest local — voir README racine `recyclique/`).
- **Session factory :** `SessionLocal` synchrone, dépendance `get_db()` génératrice.
- **Règle :** toute évolution schéma → révision Alembic versionnée ; pas de DDL ad hoc prod (`recyclique/api/README.md` § migrations).

---

## 3. Multisite, permissions, kiosque, ContextEnvelope

### 3.1 Spécifications normatives

| Document | Contenu |
|----------|---------|
| `references/artefacts/2026-04-02_03_spec-multi-contextes-invariants-autorisation-v2.md` | Entités `site`, `caisse`, `session`, `poste`, rôles, groupes, PIN, zero-leakage (Epic **1.3**) |
| `_bmad-output/planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md` | Convergence Epic **25.4** : invariants poste/kiosque, projection Paheko sans substitution silencieuse |
| `contracts/openapi/recyclique-api.yaml` | Schémas `ContextEnvelope`, `ExploitationContextIds`, auth v2 |
| `_bmad-output/planning-artifacts/epics.md` | Epics **1** (prérequis), **2** (socle backend), **25** (alignement vision kiosque) |

### 3.2 Modèle de contexte (brownfield exécuté)

**Entités pivot (ORM) :**

- `Site` — `recyclic_api/models/site.py`
- `CashRegister`, `CashSession` — caisse / session terrain
- `PosteReception`, `TicketDepot`, `LigneDepot` — réception
- `User` — affectation `site_id`, statut, rôle (`UserRole`), PIN hashé (`hashed_pin`)

**Autorité serveur :** le client (**Peintre_nano**) ne reconstruit pas les permissions ; il consomme l'API.

### 3.3 ContextEnvelope

**Implémentation :**

- Service : `recyclic_api/services/context_envelope_service.py` (`build_context_envelope`)
- Schéma : `recyclic_api/schemas/context_envelope.py`
- Endpoints : `recyclic_api/api/api_v1/endpoints/users.py` — `GET /v1/users/me/context`, `POST /v1/users/me/context/refresh`
- OpenAPI : `operationId` `recyclique_users_getContextEnvelope`, `recyclique_users_refreshContextEnvelope`

**Champs contractuels (AR39) :**

| Champ | Sémantique |
|-------|------------|
| `runtime_state` | `ok` \| `degraded` \| `forbidden` — jamais deviné côté UI |
| `context` | `site_id`, `cash_register_id`, `cash_session_id`, `reception_post_id` (optionnels) |
| `permission_keys` | Union **additive** rôles + groupes (story 2.3) ; alignée sur `GET /v1/users/me/permissions` |
| `computed_at` | Horodatage serveur autoritaire |
| `restriction_message` | Diagnostic `degraded` / `forbidden` |
| `presentation_labels` | Map `label_key` → libellé **affichage uniquement** (CREOS / story 5.5) |

**Règles d'évaluation (extrait code) :** compte `REJECTED` → `forbidden` ; pas de `site_id` → `degraded` ; session caisse sur autre site que l'affectation → `degraded` + message explicite.

### 3.4 Permissions et step-up

- Tables : `Permission`, `Group`, associations `user_groups`, `group_permissions` — `recyclic_api/models/permission.py`
- Calcul effectif : `recyclic_api/core/auth.py` (`get_user_permissions`)
- **PIN opérateur (canon) :** vérification serveur ; mutations sensibles via en-tête **`X-Step-Up-Pin`** — `recyclic_api/core/step_up.py`, doc `recyclique/README.md`
- **PIN kiosque / secret de poste (cible) :** ADR acceptée **25-2** — `_bmad-output/planning-artifacts/architecture/2026-04-19-adr-pin-kiosque-vs-pin-operateur-secret-poste-step-up-lockout-offline.md` ; **non** implémenté comme modèle unique en production PWA massif (readiness **NOT READY** programme kiosque)

### 3.5 Refus contexte stale (Epic 25.8)

- Garde : `recyclic_api/core/context_binding_guard.py`
- **Portée (Epic 25.8)** : garde sur mutations **caisse + vente** (`cash_sessions.py`, `sales.py`) → HTTP **409** **`CONTEXT_STALE`**. **Hors périmètre actuel** : réception, dépôts, admin.
- Aligné spec 25.4 §3.1 : pas de continuation sur contexte périmé après bascule site/caisse

### 3.6 Auth session web v2 (Epic 2.1)

Contrat OpenAPI `contracts/openapi/recyclique-api.yaml` :

- `POST /v1/auth/login` — JSON legacy + cookies httpOnly optionnels (`use_web_session_cookies`)
- `POST /v1/auth/logout`, `POST /v1/auth/refresh` — rotation refresh
- Schéma sécurité : `bearerOrCookie` (Bearer JWT et/ou cookie `recyclique_access` configurable via `Settings`)

**PIN métier caisse** reste distinct : `POST /v1/auth/pin` (spec 1.3 §6).

### 3.7 Surface v2 exploitation (bandeau live)

- Router : `recyclic_api/api/api_v2/endpoints/exploitation.py`
- Montage : `GET /v2/exploitation/live-snapshot` (`recyclique_exploitation_getLiveSnapshot`)
- Service : `exploitation_live_snapshot_service.py` ; schéma `ExploitationLiveSnapshotResponse`
- Signaux métier : `references/artefacts/2026-04-02_07_signaux-exploitation-bandeau-live-premiers-slices.md`

---

## 4. Modèle de données — principes (sans DDL complet)

### 4.1 Organisation du package

```

recyclique/api/src/recyclic_api/

  models/          # SQLAlchemy ORM (vérité persistance)

  schemas/         # DTO Pydantic entrée/sortie API

  services/        # Logique métier, orchestration

  api/api_v1/endpoints/   # Routeurs FastAPI

  api/api_v2/endpoints/   # Slices v2 non breaking

  migrations/versions/    # Alembic

```

Export central : `recyclic_api/models/__init__.py`.

### 4.2 Domaines et tables représentatives

| Domaine | Modèles clés | Notes |
|---------|--------------|-------|
| **Identité & sécurité** | `User`, `UserSession`, `LoginHistory`, `UserStatusHistory`, `RegistrationRequest` | Sessions refresh persistées ; audit connexion |
| **Multisite** | `Site` | Pivot isolation ; mappings Paheko par site |
| **Caisse** | `CashRegister`, `CashSession`, `CashDisbursement`, `CashInternalTransfer`, `MaterialExchange`, `ExceptionalRefund` | Session → snapshot comptable figé à clôture |
| **Vente** | `Sale`, `SaleItem`, `SaleReversal`, `PaymentTransaction`, `PaymentMethodDefinition` | Corrections, held sales, tags métier (stories 24.x) |
| **Réception** | `PosteReception`, `TicketDepot`, `LigneDepot`, `Deposit` | Postes ouverts/fermés ; lignes et poids |
| **Référentiel** | `Category`, `PresetButton`, `Setting`, `AdminSetting` | Soft-delete catégories, visibilité, import CSV |
| **Autorisation** | `Permission`, `Group` + tables d'association | Clés techniques stables côté API |
| **Compta / Paheko** | `PahekoOutboxItem`, `PahekoOutboxSyncTransition`, `PahekoCashSessionCloseMapping`, `AccountingConfigRevision`, `GlobalAccountingSettings`, `AccountingPeriodAuthoritySnapshot` | Outbox = file durable ; builder consomme snapshot |
| **Intégration & ops** | `SyncLog`, `EmailLog`, `EmailEvent`, `AuditLog`, `LegacyCategoryMappingCache` | Import legacy, webhooks email, traçabilité admin |

### 4.3 Invariants données (à respecter en évolution)

1. **Zero-leakage contexte :** écritures et agrégats sensibles filtrés par `site_id` / session / permissions — pas d'inférence UI.

2. **Snapshot caisse immuable post-clôture :** base des écritures Paheko (`cash-accounting-paheko-canonical-chain.md`).

3. **Mapping Paheko obligatoire avant succès outbox** (stories **8-3**, **25-9**) — pas de projet/emplacement par défaut silencieux.

4. **Permissions additives :** pas de sémantique « deny wins » implicite sans règle documentée.

5. **UUID / clés string** : identifiants exposés API souvent stringifiés dans schémas OpenAPI.

### 4.4 Schémas API vs modèles

- Pattern dominant : endpoint mince → **service** → ORM ; DTO dans `schemas/` (convention PEP 604 en cours : Epic **26.4** sur vagues ciblées).
- Erreur métier structurée : `schemas/recyclique_api_error.py`.

---

## 5. Legacy `recyclique-1.4.4` vs API v2

| Aspect | Legacy 1.4.4 | v2 (état 2026-05) |
|--------|----------------|-------------------|
| **Code API actif** | `recyclique-1.4.4/api/` **archivé** pour dev (redirect story 2.2b) | **`recyclique/api/`** seul package mutable |
| **Frontend dev par défaut** | `recyclique-1.4.4/frontend` (:4445 transitoire) | **`peintre-nano/`** (:4444) |
| **Contrat HTTP** | OpenAPI **runtime** généré par FastAPI + inventaire artefacts | **`contracts/openapi/recyclique-api.yaml`** reviewable (**Piste B** : writer Recyclique, drift contrôlé Epic 10) |
| **Préfixe routes** | Historiquement `/v1/...` | Inchangé **`/v1`** pour compatibilité ; **`/v2`** pour nouveaux slices |
| **Auth** | JWT Bearer dominant | Bearer **+** cookies session web v2 + refresh rotation |
| **Contexte** | État client + endpoints épars | **`ContextEnvelope`** autoritaire + refresh explicite |
| **Import données** | Chemins admin legacy CSV | `legacy_import.py`, services `legacy_import_service.py`, cache `LegacyCategoryMappingCache` |

**Coexistence Docker :** une seule API (`recyclique/api`) sert les deux frontends (CORS `4444` et `4445`) — `docker-compose.yml`.

Analyse endpoints historiques : `references/ancien-repo/v1.4.4-liste-endpoints-api.md`, artefacts `2026-04-02_02_*`.

---

## 6. Points d'entrée API — organisation des routeurs

### 6.1 Agrégateur v1

Fichier maître : `recyclique/api/src/recyclic_api/api/api_v1/api.py` → `api_router` inclus sous `/v1`.

| Préfixe monté | Module endpoint | Domaine métier |
|--------------|-----------------|----------------|
| `/health` | `health.py` | Santé |
| `/users` | `users.py` | Profil, contexte, PIN |
| `/sites` | `sites.py` | Multisite |
| `/auth` | `auth.py` | Login, refresh, PIN |
| `/cash-registers` | `cash_registers.py` | Caisses |
| `/cash-sessions` | `cash_sessions.py` | Sessions, clôture, flux internes |
| `/sales` | `sales.py` | Ventes, corrections, held |
| `/deposits` | `deposits.py` | Dépôts |
| `/reception` | `reception.py` | Postes, tickets, lignes |
| `/categories` | `categories.py` | Arborescence, import/export |
| `/stats` | `stats.py` | Agrégats admin (réception, live) |
| `/settings` | `settings.py` | Paramètres applicatifs |
| `/presets` | `presets.py` | Boutons preset caisse |
| `/transactions` | `transactions.py` | Journal transactions |
| `/activity` | `activity.py` | Activité utilisateur |
| `/email` | `email.py` | Envoi / logs email |
| `/webhooks` | `webhooks.py` | Webhooks (ex. Brevo) |
| `/monitoring` | `monitoring.py` | Métriques / observabilité |
| `/admin` | Agrégateur `admin.py` + modules éclatés (`admin_users_read`, `admin_users_mutations`, `admin_observability`, `admin_cash_sessions_maintenance`, `admin_paheko_outbox`, etc.) | Administration |
| `/admin/groups` | `groups.py` | Groupes |
| `/admin/permissions` | `permissions.py` | Référentiel permissions |
| `/admin/paheko-outbox` | `admin_paheko_outbox.py` | Supervision file Paheko |
| `/admin/paheko-mappings` | `admin_paheko_mapping.py` | Correspondances clôture → Paheko |
| `/admin/accounting-expert` | `admin_accounting_expert.py` | Paramétrage comptable expert |
| `/admin` (legacy) | `legacy_import.py` | Import CSV brownfield |

**Fichiers routeurs (~43 actifs)** : répertoire `recyclique/api/src/recyclic_api/api/api_v1/endpoints/` (exclure artefacts `.bak` du dénombrement).

### 6.2 Agrégateur v2

`recyclique/api/src/recyclic_api/api/api_v2/api.py` :

- `/v2/exploitation/*` → bandeau live (extensible sans toucher v1)

### 6.3 OpenAPI reviewable — tags et patterns

Fichier : `contracts/openapi/recyclique-api.yaml`

- **Serveur nominal :** `/api` (ajuster `ROOT_PATH` / reverse proxy en déploiement)
- **`operationId` stables** : préfixe `recyclique_<domaine>_<action>` dans le **YAML reviewable** — référencés par manifests CREOS via `data_contract.operation_id`. L'export runtime `recyclique/api/openapi.json` peut encore porter des IDs auto-générés sur une partie des routes v1 : **ne pas** lier CREOS au runtime brut sans export CI (voir §8)
- **Tags observés (échantillon)** : `auth`, `users`, `context`, `sites`, `cash-sessions`, `cash-registers`, `sales`, `reception`, `categories`, `stats`, `admin`, `paheko-outbox`, `paheko-mappings`, `accounting-expert`
- **Sécurité :** `bearerOrCookie`, schémas erreur `RecycliqueApiError`
- **Versionnement semver draft** : minor = ajout rétro-compatible ; major / procédure **B4** si rupture schéma ou renommage `operationId` référencé

**Gate CI (Epic 10)** : chaque `data_contract.operation_id` CREOS reviewable doit exister dans le YAML.

### 6.4 Intégration Paheko (contexte API uniquement)

Matière produit/compta : `references/migration-paheko/` (PRD `2026-04-15_prd-recyclique-caisse-compta-paheko.md`, spec HelloAsso `2026-04-12_*`).

**Chaîne technique côté Recyclique :**

1. Clôture session → snapshot comptable figé  

2. Builder → sous-écritures  

3. Persistance **outbox PostgreSQL** (`PahekoOutboxItem`)  

4. Sync / quarantaine / levée manuelle — endpoints admin sous `/v1/admin/paheko-outbox/*`

5. Mappings obligatoires — `/v1/admin/paheko-mappings/cash-session-close/*`

6. **Blocage sélectif clôture (story 8.6)** : garde A1 (`paheko_sync_final_action_policy`) — HTTP **409** si mapping absent ou outbox session en quarantaine **avant** clôture — détail [ch. 04 §1](04-ARCH-integration-paheko-compta-sync.md)

Architecture : `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md`.

---

## 7. Synthèse epics BMAD (1–2, 25–26)

### Epic 1 — Prérequis structurants

- **1.1** Surface de travail Paheko / Docker / SQLite de référence  
- **1.2** Audit brownfield backend (entrées caisse, réception, auth, sync)  
- **1.3** Spec multi-contextes + invariants authz (`references/artefacts/2026-04-02_03_*`)  
- **1.4** Gouvernance OpenAPI / CREOS / `ContextEnvelope`  

**Livrable clé pour l'architecte :** hiérarchie de vérité — backend writer, UI consommateur, pas de permissions inventées côté Peintre.

### Epic 2 — Socle backend brownfield v2

- **2.1** Session web v2 (cookies + JWT)  
- **2.2** `ContextEnvelope` + refresh explicite  
- **2.2b** Migration package → `recyclique/api/` (**fait**)  
- **2.3–2.7** Permissions additives, erreurs stables, bandeau `/v2`, etc.  

**Suite documentée :** stories 2.3→2.7 après 2.2b ; compose racine story **10.6b**.

### Epic 25 — Alignement PRD vision kiosque / multisite

- **25.1–25.5** Matrice vision, ADR PIN (**25-2**), ADR async Paheko (**25-3**), spec convergée (**25.4**), readiness  
- **25.6** Levée **gel process** hors clés `25-*` (addendum 2026-04-20) — distinct du **NOT READY** PWA massif  
- **25.7–25.11+** Implémentation : checklist spec 25.4, `CONTEXT_STALE`, projection mapping Paheko, taxonomie causes racines outbox, spike contrats enveloppe  

**Verdict readiness (à garder en tête) :** **GO conditionnel** cœur v2 ; **NOT READY** programme PWA/kiosque massif — `implementation-readiness-report-2026-04-19.md`, note `2026-04-20-note-readiness-cible-post-epic25-decisions.md`.

### Epic 26 — Dette qualité API (`recyclique/api/`)

- **Clos au pilotage 2026-04-22/23** : P0 pytest unique + suppression `AdminService` orphelin ; P1 extraction admin groups, convention sync/async pilote categories, PEP 604 vague schémas ; P2 ruff + doc repository  
- Audit source : `references/artefacts/2026-04-19_01_audit-brownfield-recyclic-api-architecture-style-handoff.md`  

**Résidu organisationnel :** ne pas restaurer un « `AdminService` » supprimé sans ADR ; convention sync/async **non généralisée** à tout le package.

---

## 8. Dette et chantiers connus (une phrase chacun)

| Chantier | État / risque |
|---------|----------------|
| **Drift OpenAPI Piste B** | Le YAML reviewable (`contracts/openapi/recyclique-api.yaml`) et l'OpenAPI runtime FastAPI doivent converger via génération/CI Epic 10 — édition manuelle des chemins d'implémentation déconseillée. |
| **Async def vs ORM sync** | Convention Epic 26.3 pilote sur `categories` ; le reste du package mélange encore `async def` avec `Session` synchrone. |
| **PEP 604 schémas** | Première vague (category, context_envelope, email_log) ; centaines de `Optional[T]` subsistent. |
| **Programme PWA / kiosque massif** | Readiness **NOT READY** malgré ADR 25-2/25-3 acceptées — pas d'épic delivery kiosque sans FR/epics vision absorbés. |
| **Gate qualité API touches Paheko/caisse** | Epic 26 a clos P0–P2 audit ; promotions lourdes restent soumises aux garde-fous readiness 2026-04-20 (orthogonal mais à croiser). |
| **Double frontend** | `peintre-nano` + `recyclique-1.4.4/frontend` contre la même API jusqu'à fin de migration écrans. |
| **PostgreSQL 15→17** | Compose cible PG17 ; volumes existants en 15 nécessitent runbook migration (`operations/runbook-spike-postgresql-15-vers-17.md`). |
| **HelloAsso / tiers** | Spec intégration dans `references/migration-paheko/2026-04-12_*` — pas de module API dédié livré dans le périmètre décrit ici. |
| **Chantier protocole modules site** | Pack `references/config-modules-site-id/` + plan `.cursor/plans/chantier_protocole_modules_*` — OpenAPI brouillon `GET/PATCH` config modules par `site_id`. |
| **Pin LangChain / IA classification** | Dépendances commentées dans `requirements.txt` — classification legacy non active dans l'image standard. |

---

## 9. Références rapides (chemins absolus relatifs dépôt)

```

recyclique/README.md

recyclique/api/README.md

recyclique/api/src/recyclic_api/main.py

recyclique/api/src/recyclic_api/api/api_v1/api.py

recyclique/api/src/recyclic_api/api/api_v2/api.py

recyclique/api/src/recyclic_api/services/context_envelope_service.py

recyclique/api/src/recyclic_api/models/__init__.py

contracts/openapi/recyclique-api.yaml

contracts/README.md

docker-compose.yml

_bmad-output/planning-artifacts/epics.md

_bmad-output/planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md

references/migration-paheko/index.md

references/artefacts/2026-04-19_01_audit-brownfield-recyclic-api-architecture-style-handoff.md

```

---

*Document 03 du dossier `references/dossier-architecte-externe-v2/` — à croiser avec les autres fiches du pack (frontend, contrats, déploiement) lorsqu'elles existent.*

