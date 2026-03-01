# Story 17.8 — Journal de vérification logs email

**Date :** 2026-03-01

## Résultat attendu

- Table `email_logs` créée (migration Alembic).
- Envois de test (POST /v1/admin/health/test-notifications, POST /v1/admin/settings/email/test) enregistrés avec `status=sent` ou `status=failed`.
- GET /v1/admin/email-logs retourne une liste paginée et filtrable (date_from, date_to, recipient, status).
- Page Admin Logs email affiche filtres, tableau et pagination ; message « Aucun log email » uniquement si total=0.

## Données observées / jeu de test

### Tests API (pytest)

- 4 tests dans `api/tests/routers/test_admin_email_logs.py` :
  - `test_email_logs_returns_200_and_pagination` : 200, structure items/total/page/page_size.
  - `test_email_logs_without_auth_returns_401` : 401 sans token.
  - `test_email_logs_with_filters` : 200 avec filtre status=sent.
  - `test_email_logs_list_non_empty_with_fixture` : liste non vide avec fixture (2 EmailLog insérés).

### Tests front (Vitest)

- 3 tests dans `AdminEmailLogsPage.test.tsx` :
  - Forbidden si pas admin.
  - Affichage page + tableau + message vide quand items=[], total=0.
  - Affichage items quand mock retourne 2 logs (recipient, subject, status visibles).

### Reproducibilité

1. Appliquer la migration : `alembic upgrade head`.
2. Envoyer un email de test : POST /v1/admin/health/test-notifications (ou /v1/admin/settings/email/test) avec config SMTP valide ou invalide.
3. Consulter : GET /v1/admin/email-logs → items non vides si envoi tenté.

## E16-B-005

Écart fermé : logs email admin opérationnels (table, enregistrement, API, front, preuves).
