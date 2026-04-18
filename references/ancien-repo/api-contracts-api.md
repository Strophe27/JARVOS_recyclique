# Contrats API — RecyClique 1.4.4 (part: api)

**Base URL :** `/v1` (config `API_V1_STR`). En dev : selon compose ; stack Docker **`recyclic-local`** (`recyclique-1.4.4/docker-compose.yml`) : API souvent **`http://localhost:8000`**, schéma **`/v1/openapi.json`**, Swagger **`/docs`**. (Autres ports possibles, ex. 4433.)  
**Auth :** JWT (Bearer), durée 30 min. Rôles : cashier, admin, super-admin.

---

## Résumé par préfixe

| Préfixe | Domaine | Endpoints principaux |
|---------|---------|----------------------|
| `/v1/health` | Santé | GET /, GET /version |
| `/v1/auth` | Auth | POST /login, /signup, /forgot-password, /reset-password, /pin, /logout, refresh |
| `/v1/users` | Utilisateurs | GET/PUT /me, PUT /me/password, /me/pin, /me/permissions, GET/POST /, GET/PUT/DELETE /{id}, GET /active-operators (`link-telegram` : voir inventaire détaillé — absent OpenAPI live réconcilié 2026-04-02) |
| `/v1/sites` | Sites | CRUD /, /{site_id} |
| `/v1/deposits` | Dépôts | GET/POST /, GET/PUT /{id}, GET /metrics/validation-performance (`from-bot` / `classify` : retirés — consolidation mars 2026, voir artefacts paquet 3–4) |
| `/v1/sales` | Ventes | GET/POST /, GET/PUT/PATCH /{id}, PATCH /{id}/items/{item_id}, /{id}/items/{item_id}/weight |
| `/v1/cash-sessions` | Sessions caisse | POST (open/close), GET /current, /stats/summary, PUT /{id}, nombreux GET list/detail |
| `/v1/cash-registers` | Postes caisse | CRUD /, GET /status |
| `/v1/reception` | Réception (dépôts) | POST /postes/open, /postes/{id}/close, POST /tickets, /tickets/{id}/close, POST /lignes, GET/PUT/DELETE /lignes, GET /categories, GET /tickets, /lignes, export CSV, GET /stats/live |
| `/v1/categories` | Catégories EEE | Nombreux GET/POST/PUT/DELETE (arborescence, boutons, ordre) |
| `/v1/presets` | Presets boutons | GET /, /active, /{id} |
| `/v1/settings` | Paramètres | CRUD /, /{key} |
| `/v1/transactions` | Transactions | POST /, POST /log |
| `/v1/stats` | Statistiques | GET (dashboard, live, agrégations) |
| `/v1/admin` | Administration | Utilisateurs en attente, groupes, permissions, imports legacy, export/purge/import BDD, sessions, métriques, etc. |
| `/v1/admin/reports` | Rapports | GET /cash-sessions, génération rapports, POST (génération) |
| `/v1/admin/settings` | Réglages admin | GET/PUT /alert-thresholds, /session, /email, POST /email/test |
| `/v1/admin/dashboard` | Tableau de bord | GET /stats |
| `/v1/admin/groups` | Groupes | CRUD, membres |
| `/v1/admin/permissions` | Permissions | GET/POST/PUT/DELETE |
| `/v1/monitoring` | Monitoring | Email (test, metrics, prometheus, reset), classification (performance, health, cache), auth metrics, sessions metrics |
| `/v1/email` | Email (Brevo) | POST /webhook, GET /status/{email}, /events/{email}, /health |
| `/v1/webhooks` | Webhooks | POST /brevo/email-status, GET /brevo/test |
| `/v1/activity` | Activité | POST /ping |

---

## Détail (sélection pour migration)

- **Auth :** login, signup, forgot-password, reset-password, pin, logout, refresh. Réponses typiques : tokens, user.
- **Réception :** postes (open/close), tickets (création, fermeture, liste, détail), lignes (CRUD, weight), categories, export CSV, stats live.
- **Caisse :** cash-sessions (cycle ouvert/fermé), cash-registers (postes), sales (ventes, lignes, poids), presets.
- **Admin :** users, groups, permissions, admin/settings (alertes, session, email), reports, dashboard, db export/import/purge, legacy_import.
- **Deposits :** CRUD HTTP standard ; chemins bot historiques retirés (même source que l'inventaire réconcilié `v1.4.4-liste-endpoints-api.md`).

Inventaire exhaustif et preuve de continuité (diff vs OpenAPI live) : **`v1.4.4-liste-endpoints-api.md`** + `references/artefacts/2026-04-02_02_audit-brownfield-backend-api-donnees-critiques.md` §1 bis. Schéma généré : **`/v1/openapi.json`**.
