# Paquet 6 — canal notifications Telegram (runtime API) retiré

Date : 2026-03-26  
Périmètre : `recyclique-1.4.4/` — pas de commit demandé.

## Fait

- Suppression de `api/src/recyclic_api/services/telegram_service.py`.
- `sync_service.py` : échec kDrive → log `warning` uniquement (`no external alert channel`).
- `anomaly_detection_service.py` : `send_anomaly_notifications` → logs (warning + détail par type), pas d’HTTP.
- `config.py` : retrait de `TELEGRAM_BOT_URL`, `TELEGRAM_BOT_TOKEN`, `ADMIN_TELEGRAM_IDS`, `TELEGRAM_NOTIFICATIONS_ENABLED` et du override test `TELEGRAM_BOT_TOKEN`.
- Tests : `test_outbound_bot_notifications_disabled.py`, `test_sync_service.py`, `test_monitoring.py` (cible anomalies) réalignés.
- Exemples d’env : `env.example`, `env.staging.example`, `env.production.example`.
- Scripts : `pre-deployment-check.sh` (vars critiques), `rollback.sh` (plus d’appels Telegram), `tests/test_rollback.sh`.
- Docs actives : runbooks déploiement / restauration DB, `deployment-and-rollback.md`, `rollback-notifications-config.md` (+ copie `v1.3.0-active`), `guide-deploiement-v2.md`, `testing-strategy.md`, gates QA `b36` / `3.3`, dettes `story-b31`, `story-b36`, `story-5.4.2` (mentions obsolètes).

## Validation

- `pytest` (TESTING=true) : `test_sync_service.py`, `test_outbound_bot_notifications_disabled.py`, `test_monitoring.py::TestAnomalyDetectionService::test_send_anomaly_notifications` — OK (10 tests).
- Linter IDE sur fichiers Python touchés : pas d’alerte.

## Reliquats (hors périmètre ce lot)

- Mentions Telegram dans `docs/archive/`, `docs/backup-pre-cleanup/`, `docs/architecture.old/`, `openapi.json` (champs `telegram_id` / admin), modèles et schémas `telegram_id` / `telegram_user_id`, CLI `create_super_admin`, etc. — chantier **`telegram_id`** / UX / migrations à planifier séparément.
