# Story 17.7: Supervision admin non-stub (anomalies + test notifications)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin exploitation,
I want une supervision admin complète et non-stub,
So that la détection d'anomalies et les notifications de test soient exploitables en production.

## Acceptance Criteria

1. **Given** la page de santé admin et les endpoints associés
   **When** je consulte les anomalies et lance un test de notification
   **Then** les informations retournées correspondent à des contrôles réels
   **And** le test de notification exécute un flux effectif, pas un placeholder.

## Preuves obligatoires de fermeture (E16-B-004)

- test(s) API sur endpoints health/admin concernés,
- validation front `AdminHealthPage` avec données non-stub,
- artefact de vérification notification (résultat attendu/observé).

## Tasks / Subtasks

- [x] Task 1 — Anomalies non-stub (AC: 1, preuves)
  - [x] 1.1 Créer fonction `collect_anomalies()` dans `api/services/health_checks.py` (ou module dédié) : agrégation des anomalies depuis `check_database()`, `check_redis()`, `check_push_worker()`, `check_oidc_runtime()`, et `get_resilience_snapshot()` (dépendances idp/paheko avec `alert_triggered`, status `degraded`). Une anomalie = tout check != "ok" ou dépendance avec `alert_triggered`.
  - [x] 1.2 Modifier `api/routers/v1/admin/health.py` endpoint GET `/anomalies` : appeler `collect_anomalies()`, retourner `{"items": [...], "count": N}` avec des objets structurés (ex. `code`, `component`, `message`, `severity`).
  - [x] 1.3 Ajouter `getAdminHealthAnomalies()` dans `frontend/src/api/adminHealthAudit.ts` : GET `/v1/admin/health/anomalies`, interface `AdminHealthAnomaliesResponse`.
  - [x] 1.4 Modifier `AdminHealthPage.tsx` : charger et afficher la liste des anomalies (section dédiée, badges/cartes par anomalie). Ne plus ignorer cet appel.

- [x] Task 2 — Test notifications non-stub (AC: 1, preuves)
  - [x] 2.1 Créer `api/services/email_test.py` : fonction `send_test_email(db: Session) -> dict` qui lit `admin_settings.get_settings(db)["email"]`, valide présence de `smtp_host` (et `smtp_port` optionnel), envoie via `smtplib` si OK, retourne `{"message": "...", "configured": bool}`. Ne pas dupliquer la logique.
  - [x] 2.2 Modifier POST `/v1/admin/health/test-notifications` : ajouter `Depends(get_db)`, déléguer à `send_test_email(db)`.
  - [x] 2.3 Modifier POST `/v1/admin/settings/email/test` : ajouter `Depends(get_db)`, déléguer au même `send_test_email(db)` (éviter duplication).
  - [x] 2.4 Modifier `AdminHealthPage.tsx` : afficher le message de réponse réel (plus "stub v1"), gérer cas `configured: false`. Mettre à jour `TestNotificationsResponse` : ajouter `configured?: boolean`.

- [x] Task 3 — Tests API et preuves (AC: 1, preuves)
  - [x] 3.1 Étendre `api/tests/routers/test_admin_health_audit.py` : tests GET `/anomalies` (structure `items`/`count`, contenu réel si dégradé) ; tests POST `/test-notifications` (configured true/false, pas de "stub" dans message).
  - [x] 3.2 Archiver preuve pytest dans `_bmad-output/implementation-artifacts/17-7-preuve-pytest-admin-health-anomalies-notifications.txt`.
  - [x] 3.3 Mettre à jour `16-0-tableau-unique-ecarts.md` : E16-B-004 → fermé.
  - [x] 3.4 Créer artefact `17-7-journal-verification-notification.md` : capture résultat attendu/observé du test notification (configuré vs non configuré).
  - [x] 3.5 (optionnel) Ajouter ou étendre `AdminHealthPage.test.tsx` : smoke chargement anomalies, message test-notifications (mock API).

## Dev Notes

### Contexte code actuel

- **`api/routers/v1/admin/health.py`** : GET `/anomalies` retourne stub `{"items": [], "count": 0}` ; POST `/test-notifications` retourne stub `{"message": "Test notifications envoyé (stub v1)"}`.
- **`api/services/health_checks.py`** : `check_database`, `check_redis`, `check_push_worker`, `check_oidc_runtime` (réels). `get_resilience_snapshot()` dans `api/services/resilience.py` fournit `dependencies` (idp, paheko) avec `status`, `alert_triggered`, `consecutive_failures`.
- **`api/services/resilience.py`** : `get_resilience_snapshot()` — `ALERT_CONSECUTIVE_FAILURES = 3`, `alert_triggered` si `consecutive_failures >= 3`.
- **`frontend/src/admin/AdminHealthPage.tsx`** : n'appelle pas `/anomalies` ; bouton test notifications affiche le message stub.
- **`frontend/src/api/adminHealthAudit.ts`** : pas de `getAdminHealthAnomalies` ; `postAdminHealthTestNotifications` existe déjà.

### Structure anomalies proposée

Chaque item : `{ "code": "redis_error", "component": "redis", "message": "Redis unreachable", "severity": "error" }`. Codes possibles : `database_error`, `redis_error`, `push_worker_error`, `oidc_degraded`, `resilience_idp_alert`, `resilience_paheko_alert`, etc.

### Flux test notifications

- Service central : `api/services/email_test.py` — fonction `send_test_email(db: Session) -> dict`.
- Lire config : `admin_settings.get_settings(db)["email"]` (dict libre, clés : `smtp_host`, `smtp_port` optionnel, `smtp_user`, `smtp_password`, `from_email` selon besoin). **Validité minimale** : `smtp_host` non vide obligatoire.
- Si config incomplète → `{"message": "Configuration email incomplète", "configured": false}`.
- Sinon : envoi via `smtplib` (Python stdlib). Retourner succès `{"message": "Email de test envoyé", "configured": true}` ou erreur explicite (sans exposer secrets : mot de passe, tokens).

### Contraintes architecture

- Routes protégées par `require_permissions("super_admin")` — conserver.
- Pas de changement RBAC ; scope limité aux endpoints health/anomalies et test-notifications.
- Réutiliser `get_db` pour accès admin_settings si besoin (POST test-notifications).

### Fichiers à toucher

| Fichier | Action |
|---------|--------|
| `api/services/health_checks.py` | Ajouter `collect_anomalies()` ou nouveau module |
| `api/services/email_test.py` | **Créer** — `send_test_email(db)` central |
| `api/routers/v1/admin/health.py` | Modifier GET `/anomalies`, POST `/test-notifications` (ajouter `Depends(get_db)` pour test-notifications) |
| `api/routers/v1/admin/settings.py` | Modifier POST `/email/test` : `Depends(get_db)`, déléguer à `send_test_email(db)` |
| `frontend/src/api/adminHealthAudit.ts` | Ajouter `getAdminHealthAnomalies`, `AdminHealthAnomaliesResponse` ; étendre `TestNotificationsResponse` avec `configured?: boolean` |
| `frontend/src/admin/AdminHealthPage.tsx` | Charger anomalies (`getAdminHealthAnomalies`), afficher liste ; afficher message réel test (gérer `configured: false`) |
| `api/tests/routers/test_admin_health_audit.py` | Étendre tests anomalies + test-notifications |
| `_bmad-output/implementation-artifacts/16-0-tableau-unique-ecarts.md` | E16-B-004 → fermé |
| `_bmad-output/implementation-artifacts/17-7-preuve-pytest-*.txt` | Créer |
| `_bmad-output/implementation-artifacts/17-7-journal-verification-notification.md` | Créer |

### Références

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 17.7]
- [Source: `api/routers/v1/admin/health.py` — stubs actuels GET `/anomalies`, POST `/test-notifications`]
- [Source: `api/routers/v1/admin/settings.py` — POST `/email/test` stub, à modifier pour déléguer à `send_test_email`]
- [Source: `api/services/health_checks.py` — checks réels : check_database, check_redis, check_push_worker, check_oidc_runtime]
- [Source: `api/services/resilience.py` — get_resilience_snapshot, alert_triggered, DEPENDENCY_IDP/PAHEKO]
- [Source: `api/services/admin_settings.py` — get_settings(db) pour config email (dict avec smtp_host, etc.)]
- [Source: `frontend/src/api/adminHealthAudit.ts` — postAdminHealthTestNotifications existe ; getAdminHealthAnomalies à ajouter]
- [Source: `frontend/src/admin/AdminHealthPage.tsx` — n'appelle pas /anomalies ; affiche message stub test-notifications]
- [Source: `_bmad-output/implementation-artifacts/16-0-tableau-unique-ecarts.md` — E16-B-004]
- [Source: `api/tests/routers/test_admin_health_audit.py` — tests existants, test_admin_health_anomalies_returns_200 (stub)]

## Dependencies

- Story `17.0` (done) : harness auth/session fiabilisé.
- Story `17.6` (done) : config admin (email) persistée — prérequis pour test email.

## Mapping E16

- **E16-B-004** : Santé admin partielle (anomalies + test notifications stub) → fermer via implémentation réelle.

## Dev Agent Record

### Agent Model Used

bmad-dev (Composer)

### Debug Log References

### Completion Notes List

- Implémentation complète : collect_anomalies() agrège database, redis, push_worker, oidc, resilience (idp/paheko alert_triggered).
- Service email_test.send_test_email(db) central : smtp_host obligatoire, smtplib pour envoi réel.
- GET /anomalies et POST /test-notifications désormais non-stub ; POST /v1/admin/settings/email/test délègue à send_test_email.
- Fixture super_admin_client pour tests health (require super_admin).
- 15 tests pytest passés ; AdminHealthPage.test.tsx étendu (anomalies + test-notifications).

### File List

- api/services/health_checks.py (modifié)
- api/services/email_test.py (créé)
- api/routers/v1/admin/health.py (modifié)
- api/routers/v1/admin/settings.py (modifié)
- frontend/src/api/adminHealthAudit.ts (modifié)
- frontend/src/admin/AdminHealthPage.tsx (modifié)
- frontend/src/admin/AdminHealthPage.test.tsx (modifié)
- api/tests/routers/test_admin_health_audit.py (modifié)
- _bmad-output/implementation-artifacts/16-0-tableau-unique-ecarts.md (modifié)
- _bmad-output/implementation-artifacts/17-7-preuve-pytest-admin-health-anomalies-notifications.txt (créé)
- _bmad-output/implementation-artifacts/17-7-journal-verification-notification.md (créé)

### Change Log

- 2026-03-01 : Story 17.7 implémentée — anomalies non-stub (collect_anomalies, GET /anomalies), test notifications non-stub (send_test_email, POST test-notifications et settings/email/test), tests API étendus, E16-B-004 fermé.
