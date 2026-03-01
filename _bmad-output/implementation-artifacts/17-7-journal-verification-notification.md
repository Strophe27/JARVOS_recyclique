# 17-7 — Journal vérification notification (Story 17.7)

Date: 2026-03-01

## Résultat attendu / observé

### Cas 1 : Config email non configurée (smtp_host vide ou absent)

**Attendu :**
```json
{"message": "Configuration email incomplete", "configured": false}
```

**Observé :** Conforme. POST `/v1/admin/health/test-notifications` retourne 200 avec `configured: false` et message explicatif. Pas de tentative SMTP.

### Cas 2 : Config email configurée (smtp_host présent)

**Attendu :** Si SMTP joignable et authentification OK : `{"message": "Email de test envoyé", "configured": true}`. Sinon message d'erreur explicite sans exposer secrets.

**Observé :** Non exécuté en contexte test (BDD vide, pas de smtp_host en admin_settings). Comportement validé via tests API : retour structure `{"message": "...", "configured": bool}`, pas de "stub" dans le message.

### Preuve pytest

Fichier : `_bmad-output/implementation-artifacts/17-7-preuve-pytest-admin-health-anomalies-notifications.txt`

Tests pertinents :
- `test_admin_health_test_notifications_configured_false` — vérifie configured false, message sans stub
- `test_admin_health_test_notifications_no_stub_in_message` — vérifie absence de "stub" dans message
