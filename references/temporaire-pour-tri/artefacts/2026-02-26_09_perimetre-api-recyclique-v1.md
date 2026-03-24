# Périmètre API RecyClique v1

**Date :** 2026-02-26  
**Objectif :** Définir quels endpoints l'API RecyClique doit exposer en v1, pour quels écrans/parcours, et d'où viennent les données (BDD RecyClique, proxy Paheko, ou les deux). Dérivé des écrans/parcours 1.4.4 et du [catalogue Qui stocke quoi](2026-02-26_08_catalogue-qui-stocke-quoi-recyclic-paheko.md).  
**Référence liste complète 1.4.4 :** [v1.4.4-liste-endpoints-api.md](../ancien-repo/v1.4.4-liste-endpoints-api.md).

---

## 1. Principes du périmètre v1

- **L'API RecyClique v1** sert les écrans et parcours **terrain** (caisse, réception, profil, admin app) et les rapports / stats / paramètres de l'app. Les données exposées proviennent en majorité de la **BDD RecyClique**.
- **Effets de bord** : certaines actions (caisse) déclenchent un **push vers Paheko** (sessions, ventes, clôture) ; l'API reste l'interface unique pour le front, le backend RecyClique orchestre l'appel à Paheko (file Redis, workers, etc.).
- **Hors scope v1** : écrans purement Paheko (compta, bilan, factures, rapprochement bancaire) ne sont pas servis par l'API RecyClique ; accès direct à l'UI Paheko pour l'admin compta. Pas de SSO en v1 (auth séparée).
- **Proxy Paheko** : aucun endpoint v1 n'est un simple « proxy » de lecture vers Paheko pour l'instant ; les données métier caisse/réception sont en RecyClique. Un éventuel « health Paheko » ou « vérification connecteur » peut être ajouté en admin.

---

## 2. Légende

| Source données | Signification |
|----------------|----------------|
| **RecyClique** | Données lues/écrites en BDD RecyClique uniquement. |
| **RecyClique + push Paheko** | Données en RecyClique ; l'action déclenche en plus un push vers Paheko (sessions, ventes, clôture). |
| **RecyClique (optionnel Paheko)** | Données en RecyClique ; copie optionnelle vers Paheko (ex. réception → module_data_saisie_poids). |
| **Hors scope v1** | Endpoint 1.4.4 non repris en v1 (délégué à Paheko ou désactivé). |
| **Conservé v1** | Endpoint conservé tel quel (données RecyClique). |

---

## 3. Périmètre par domaine

### 3.1 Santé et version

| Méthode | Chemin | Source données | Statut v1 | Note |
|--------|--------|----------------|----------|------|
| GET | `/v1/health` | RecyClique | Conservé v1 | Health check API + DB RecyClique. |
| GET | `/v1/health/version` | RecyClique | Conservé v1 | Version/build API. |

---

### 3.2 Authentification

| Méthode | Chemin | Source données | Statut v1 | Note |
|--------|--------|----------------|----------|------|
| POST | `/v1/auth/login` | RecyClique | Conservé v1 | JWT pour app terrain (utilisateurs RecyClique). |
| POST | `/v1/auth/signup` | RecyClique | Conservé v1 | Inscription, workflow approbation admin. |
| POST | `/v1/auth/logout` | RecyClique | Conservé v1 | Invalidation session. |
| POST | `/v1/auth/refresh` | RecyClique | Conservé v1 | Rafraîchissement token. |
| POST | `/v1/auth/forgot-password` | RecyClique | Conservé v1 | Email Brevo. |
| POST | `/v1/auth/reset-password` | RecyClique | Conservé v1 | Reset avec token. |
| POST | `/v1/auth/pin` | RecyClique | Conservé v1 | Connexion caisse / tablette. |

---

### 3.3 Utilisateurs

| Méthode | Chemin | Source données | Statut v1 | Note |
|--------|--------|----------------|----------|------|
| GET | `/v1/users/me` | RecyClique | Conservé v1 | Profil utilisateur connecté. |
| PUT | `/v1/users/me` | RecyClique | Conservé v1 | Mise à jour profil. |
| PUT | `/v1/users/me/password` | RecyClique | Conservé v1 | — |
| PUT | `/v1/users/me/pin` | RecyClique | Conservé v1 | — |
| GET | `/v1/users/me/permissions` | RecyClique | Conservé v1 | Permissions pour l'app. |
| GET | `/v1/users/active-operators` | RecyClique | Conservé v1 | Opérateurs actifs (caisse). |
| GET | `/v1/users` | RecyClique | Conservé v1 | Liste utilisateurs (admin). |
| GET | `/v1/users/{user_id}` | RecyClique | Conservé v1 | — |
| POST | `/v1/users` | RecyClique | Conservé v1 | Création (admin). |
| PUT | `/v1/users/{user_id}` | RecyClique | Conservé v1 | — |
| DELETE | `/v1/users/{user_id}` | RecyClique | Conservé v1 | — |
| POST | `/v1/users/link-telegram` | RecyClique | Hors scope v1 ou placeholder | Bot désactivé ; à trancher produit. |

---

### 3.4 Sites

| Méthode | Chemin | Source données | Statut v1 | Note |
|--------|--------|----------------|----------|------|
| GET | `/v1/sites` | RecyClique | Conservé v1 | Liste sites. |
| GET | `/v1/sites/{site_id}` | RecyClique | Conservé v1 | — |
| POST | `/v1/sites` | RecyClique | Conservé v1 | Admin. |
| PATCH | `/v1/sites/{site_id}` | RecyClique | Conservé v1 | — |
| DELETE | `/v1/sites/{site_id}` | RecyClique | Conservé v1 | — |

---

### 3.5 Dépôts (bot / classification)

| Méthode | Chemin | Source données | Statut v1 | Note |
|--------|--------|----------------|----------|------|
| GET | `/v1/deposits` | RecyClique | Hors scope v1 ou placeholder | Bot désactivé. |
| GET | `/v1/deposits/{deposit_id}` | RecyClique | Idem | — |
| POST | `/v1/deposits` | RecyClique | Idem | — |
| POST | `/v1/deposits/from-bot` | RecyClique | Hors scope v1 | — |
| POST | `/v1/deposits/{deposit_id}/classify` | RecyClique | Hors scope v1 | — |
| PUT | `/v1/deposits/{deposit_id}` | RecyClique | Idem | — |
| GET | `/v1/deposits/metrics/validation-performance` | RecyClique | Hors scope v1 | — |

---

### 3.6 Ventes (caisse)

| Méthode | Chemin | Source données | Statut v1 | Note |
|--------|--------|----------------|----------|------|
| GET | `/v1/sales` | RecyClique | Conservé v1 | Liste ventes (admin, rapports). |
| GET | `/v1/sales/{sale_id}` | RecyClique | Conservé v1 | Détail (éditeur item, poids). |
| POST | `/v1/sales` | RecyClique + push Paheko | Conservé v1 | Création ticket ; après écriture RecyClique, push par ticket vers Paheko (plugin_pos_tabs, _items, _payments). |
| PUT | `/v1/sales/{sale_id}` | RecyClique | Conservé v1 | Note. |
| PATCH | `/v1/sales/{sale_id}/items/{item_id}` | RecyClique | Conservé v1 | Éditeur item (destination, prix). |
| PATCH | `/v1/sales/{sale_id}/items/{item_id}/weight` | RecyClique | Conservé v1 | Édition poids (admin). |

---

### 3.7 Sessions de caisse

| Méthode | Chemin | Source données | Statut v1 | Note |
|--------|--------|----------------|----------|------|
| GET | `/v1/cash-sessions` | RecyClique | Conservé v1 | Liste sessions (filtres, pagination). |
| GET | `/v1/cash-sessions/current` | RecyClique | Conservé v1 | Session en cours (opérateur). |
| GET | `/v1/cash-sessions/{session_id}` | RecyClique | Conservé v1 | Détail. |
| POST | `/v1/cash-sessions` | RecyClique + push Paheko | Conservé v1 | Ouverture ; création session Paheko par plugin (fond de caisse, opened_at). |
| PUT | `/v1/cash-sessions/{session_id}` | RecyClique | Conservé v1 | Mise à jour. |
| POST | `/v1/cash-sessions/{session_id}/close` | RecyClique + push Paheko | Conservé v1 | Clôture ; envoi clôture vers Paheko → contrôle totaux + syncAccounting. |
| GET | `/v1/cash-sessions/status/{register_id}` | RecyClique | Conservé v1 | Occupé / libre. |
| GET | `/v1/cash-sessions/deferred/check` | RecyClique | Conservé v1 | Vérif session différée (date). |
| GET | `/v1/cash-sessions/{session_id}/step` | RecyClique | Conservé v1 | Workflow step. |
| PUT | `/v1/cash-sessions/{session_id}/step` | RecyClique | Conservé v1 | — |
| GET | `/v1/cash-sessions/stats/summary` | RecyClique | Conservé v1 | Synthèse stats (période). |

---

### 3.8 Postes de caisse

| Méthode | Chemin | Source données | Statut v1 | Note |
|--------|--------|----------------|----------|------|
| GET | `/v1/cash-registers` | RecyClique | Conservé v1 | Liste postes. |
| GET | `/v1/cash-registers/status` | RecyClique | Conservé v1 | Statut global. |
| GET | `/v1/cash-registers/{register_id}` | RecyClique | Conservé v1 | — |
| POST | `/v1/cash-registers` | RecyClique | Conservé v1 | Admin. |
| PATCH | `/v1/cash-registers/{register_id}` | RecyClique | Conservé v1 | — |
| DELETE | `/v1/cash-registers/{register_id}` | RecyClique | Conservé v1 | — |

---

### 3.9 Catégories

| Méthode | Chemin | Source données | Statut v1 | Note |
|--------|--------|----------------|----------|------|
| GET | `/v1/categories` | RecyClique | Conservé v1 | Liste, filtres. |
| GET | `/v1/categories/hierarchy` | RecyClique | Conservé v1 | Arborescence. |
| GET | `/v1/categories/{category_id}` | RecyClique | Conservé v1 | — |
| POST | `/v1/categories` | RecyClique | Conservé v1 | Référentiel EEE/décla. |
| PUT | `/v1/categories/{category_id}` | RecyClique | Conservé v1 | — |
| DELETE | `/v1/categories/{category_id}` | RecyClique | Conservé v1 | Soft delete. |
| POST | `/v1/categories/{category_id}/restore` | RecyClique | Conservé v1 | — |
| DELETE | `/v1/categories/{category_id}/hard` | RecyClique | Conservé v1 | — |
| GET | `/v1/categories/{category_id}/has-usage` | RecyClique | Conservé v1 | — |
| GET | `/v1/categories/{category_id}/children` | RecyClique | Conservé v1 | — |
| GET | `/v1/categories/{category_id}/parent` | RecyClique | Conservé v1 | — |
| GET | `/v1/categories/{category_id}/breadcrumb` | RecyClique | Conservé v1 | — |
| PUT | `/v1/categories/{category_id}/visibility` | RecyClique | Conservé v1 | Caisse / réception. |
| PUT | `/v1/categories/{category_id}/display-order` | RecyClique | Conservé v1 | — |
| PUT | `/v1/categories/{category_id}/display-order-entry` | RecyClique | Conservé v1 | — |
| GET | `/v1/categories/actions/export` | RecyClique | Conservé v1 | — |
| GET | `/v1/categories/import/template` | RecyClique | Conservé v1 | — |
| POST | `/v1/categories/import/analyze` | RecyClique | Conservé v1 | — |
| POST | `/v1/categories/import/execute` | RecyClique | Conservé v1 | — |
| GET | `/v1/categories/entry-tickets` | RecyClique | Conservé v1 | Catégories réception. |
| GET | `/v1/categories/sale-tickets` | RecyClique | Conservé v1 | Catégories caisse. |

---

### 3.10 Réception

| Méthode | Chemin | Source données | Statut v1 | Note |
|--------|--------|----------------|----------|------|
| POST | `/v1/reception/postes/open` | RecyClique | Conservé v1 | Ouverture poste (optionnel opened_at). |
| POST | `/v1/reception/postes/{poste_id}/close` | RecyClique | Conservé v1 | Fermeture poste. |
| POST | `/v1/reception/tickets` | RecyClique | Conservé v1 | Création ticket. |
| POST | `/v1/reception/tickets/{ticket_id}/close` | RecyClique | Conservé v1 | Fermeture ticket. |
| GET | `/v1/reception/tickets` | RecyClique | Conservé v1 | Liste (filtres, pagination). |
| GET | `/v1/reception/tickets/{ticket_id}` | RecyClique | Conservé v1 | Détail. |
| POST | `/v1/reception/tickets/{ticket_id}/download-token` | RecyClique | Conservé v1 | Token export. |
| GET | `/v1/reception/tickets/{ticket_id}/export-csv` | RecyClique | Conservé v1 | — |
| POST | `/v1/reception/lignes` | RecyClique (optionnel Paheko) | Conservé v1 | Ajout ligne ; copie optionnelle vers module_data_saisie_poids selon config. |
| GET | `/v1/reception/lignes` | RecyClique | Conservé v1 | — |
| GET | `/v1/reception/lignes/export-csv` | RecyClique | Conservé v1 | — |
| PUT | `/v1/reception/lignes/{ligne_id}` | RecyClique | Conservé v1 | — |
| DELETE | `/v1/reception/lignes/{ligne_id}` | RecyClique | Conservé v1 | — |
| PATCH | `/v1/reception/tickets/{ticket_id}/lignes/{ligne_id}/weight` | RecyClique | Conservé v1 | — |
| GET | `/v1/reception/categories` | RecyClique | Conservé v1 | — |
| GET | `/v1/reception/stats/live` | RecyClique | Conservé v1 | KPI temps réel. |

---

### 3.11 Statistiques

| Méthode | Chemin | Source données | Statut v1 | Note |
|--------|--------|----------------|----------|------|
| GET | `/v1/stats/live` | RecyClique | Conservé v1 | Réception + ventes (live). |
| GET | `/v1/stats/reception/summary` | RecyClique | Conservé v1 | — |
| GET | `/v1/stats/reception/by-category` | RecyClique | Conservé v1 | — |
| GET | `/v1/stats/sales/by-category` | RecyClique | Conservé v1 | — |

---

### 3.12 Presets

| Méthode | Chemin | Source données | Statut v1 | Note |
|--------|--------|----------------|----------|------|
| GET | `/v1/presets` | RecyClique | Conservé v1 | — |
| GET | `/v1/presets/active` | RecyClique | Conservé v1 | Boutons actifs caisse. |
| GET | `/v1/presets/{preset_id}` | RecyClique | Conservé v1 | — |

---

### 3.13 Transactions / log, activité, paramètres

| Méthode | Chemin | Source données | Statut v1 | Note |
|--------|--------|----------------|----------|------|
| POST | `/v1/transactions` | RecyClique | Conservé v1 | Création transaction (vente). |
| POST | `/v1/transactions/log` | RecyClique | Conservé v1 | Journal. |
| POST | `/v1/activity/ping` | RecyClique | Conservé v1 | Activité / timeout session. |
| GET | `/v1/settings` | RecyClique | Conservé v1 | Paramètres clé-valeur. |
| GET | `/v1/settings/{key}` | RecyClique | Conservé v1 | — |
| POST | `/v1/settings` | RecyClique | Conservé v1 | — |
| PUT | `/v1/settings/{key}` | RecyClique | Conservé v1 | — |
| DELETE | `/v1/settings/{key}` | RecyClique | Conservé v1 | — |

---

### 3.14 Admin (utilisateurs, santé, logs, groupes, paramètres, rapports)

Tous **RecyClique** (données et logs côté app). Aucun endpoint admin ne lit directement la BDD Paheko en v1.

| Méthode | Chemin | Source données | Statut v1 | Note |
|--------|--------|----------------|----------|------|
| GET | `/v1/admin/users` | RecyClique | Conservé v1 | — |
| GET | `/v1/admin/users/statuses` | RecyClique | Conservé v1 | — |
| GET | `/v1/admin/users/{user_id}` | RecyClique | Conservé v1 | — |
| GET | `/v1/admin/users/pending` | RecyClique | Conservé v1 | — |
| PUT | `/v1/admin/users/{user_id}/role` | RecyClique | Conservé v1 | — |
| PUT | `/v1/admin/users/{user_id}/status` | RecyClique | Conservé v1 | — |
| PUT | `/v1/admin/users/{user_id}` | RecyClique | Conservé v1 | — |
| PUT | `/v1/admin/users/{user_id}/groups` | RecyClique | Conservé v1 | — |
| POST | `/v1/admin/users/{user_id}/approve` | RecyClique | Conservé v1 | — |
| POST | `/v1/admin/users/{user_id}/reject` | RecyClique | Conservé v1 | — |
| POST | `/v1/admin/users/{user_id}/reset-password` | RecyClique | Conservé v1 | — |
| POST | `/v1/admin/users/{user_id}/force-password` | RecyClique | Conservé v1 | — |
| POST | `/v1/admin/users/{user_id}/reset-pin` | RecyClique | Conservé v1 | — |
| GET | `/v1/admin/users/{user_id}/history` | RecyClique | Conservé v1 | — |
| GET | `/v1/admin/health` | RecyClique | Conservé v1 | — |
| GET | `/v1/admin/health/public` | RecyClique | Conservé v1 | — |
| GET | `/v1/admin/health/database` | RecyClique | Conservé v1 | — |
| GET | `/v1/admin/health/anomalies` | RecyClique | Conservé v1 | — |
| GET | `/v1/admin/health/scheduler` | RecyClique | Conservé v1 | — |
| POST | `/v1/admin/health/test-notifications` | RecyClique | Conservé v1 | — |
| GET | `/v1/admin/health-test` | RecyClique | Conservé v1 | — |
| GET | `/v1/admin/transaction-logs` | RecyClique | Conservé v1 | — |
| GET | `/v1/admin/audit-log` | RecyClique | Conservé v1 | — |
| GET | `/v1/admin/email-logs` | RecyClique | Conservé v1 | — |
| GET/PUT | `/v1/admin/settings/activity-threshold` | RecyClique | Conservé v1 | — |
| GET | `/v1/admin/sessions/metrics` | RecyClique | Conservé v1 | — |
| GET | `/v1/admin/templates/reception-offline.csv` | RecyClique | Conservé v1 | — |
| POST | `/v1/admin/cash-sessions/fix-blocked-deferred` | RecyClique | Conservé v1 | — |
| POST | `/v1/admin/cash-sessions/merge-duplicate-deferred` | RecyClique | Conservé v1 | — |
| POST | `/v1/admin/db/export` | RecyClique | Conservé v1 | — |
| POST | `/v1/admin/db/purge-transactions` | RecyClique | Conservé v1 | — |
| POST | `/v1/admin/db/import` | RecyClique | Conservé v1 | — |
| GET | `/v1/admin/groups` | RecyClique | Conservé v1 | — |
| GET | `/v1/admin/groups/{group_id}` | RecyClique | Conservé v1 | — |
| POST | `/v1/admin/groups` | RecyClique | Conservé v1 | — |
| PUT | `/v1/admin/groups/{group_id}` | RecyClique | Conservé v1 | — |
| DELETE | `/v1/admin/groups/{group_id}` | RecyClique | Conservé v1 | — |
| POST/DELETE | `/v1/admin/groups/{group_id}/permissions` | RecyClique | Conservé v1 | — |
| POST/DELETE | `/v1/admin/groups/{group_id}/users` | RecyClique | Conservé v1 | — |
| GET | `/v1/admin/permissions` | RecyClique | Conservé v1 | — |
| GET | `/v1/admin/permissions/{permission_id}` | RecyClique | Conservé v1 | — |
| POST | `/v1/admin/permissions` | RecyClique | Conservé v1 | — |
| PUT | `/v1/admin/permissions/{permission_id}` | RecyClique | Conservé v1 | — |
| DELETE | `/v1/admin/permissions/{permission_id}` | RecyClique | Conservé v1 | — |
| GET/PUT | `/v1/admin/settings/alert-thresholds` | RecyClique | Conservé v1 | — |
| GET/PUT | `/v1/admin/settings/session` | RecyClique | Conservé v1 | — |
| GET/PUT | `/v1/admin/settings/email` | RecyClique | Conservé v1 | — |
| POST | `/v1/admin/settings/email/test` | RecyClique | Conservé v1 | — |
| GET | `/v1/admin/dashboard/stats` | RecyClique | Conservé v1 | — |
| GET | `/v1/admin/reports/cash-sessions` | RecyClique | Conservé v1 | — |
| GET | `/v1/admin/reports/cash-sessions/by-session/{session_id}` | RecyClique | Conservé v1 | — |
| GET | `/v1/admin/reports/cash-sessions/{filename}` | RecyClique | Conservé v1 | — |
| POST | `/v1/admin/reports/cash-sessions/export-bulk` | RecyClique | Conservé v1 | — |
| POST | `/v1/admin/reports/reception-tickets/export-bulk` | RecyClique | Conservé v1 | — |
| GET/POST | `/v1/admin/import/legacy/*` | RecyClique | Conservé v1 ou à trancher | Import legacy CSV ; scope à confirmer. |

---

### 3.15 Email, webhooks, monitoring, test auth

| Méthode | Chemin | Source données | Statut v1 | Note |
|--------|--------|----------------|----------|------|
| POST | `/v1/email/webhook` | RecyClique | Conservé v1 | Brevo. |
| GET | `/v1/email/status/{email_address}` | RecyClique | Conservé v1 | — |
| GET | `/v1/email/events/{email_address}` | RecyClique | Conservé v1 | — |
| GET | `/v1/email/health` | RecyClique | Conservé v1 | — |
| POST | `/v1/webhooks/brevo/email-status` | RecyClique | Conservé v1 | — |
| GET | `/v1/webhooks/brevo/test` | RecyClique | Conservé v1 | — |
| POST | `/v1/monitoring/test-email` | RecyClique | Conservé v1 | — |
| GET | `/v1/monitoring/email/metrics` | RecyClique | Conservé v1 | — |
| GET | `/v1/monitoring/email/metrics/prometheus` | RecyClique | Conservé v1 | — |
| POST | `/v1/monitoring/email/metrics/reset` | RecyClique | Conservé v1 | — |
| GET | `/v1/monitoring/classification/performance` | RecyClique | Hors scope v1 ou placeholder | Bot/IA désactivé. |
| POST | `/v1/monitoring/classification/performance/export` | RecyClique | Idem | — |
| GET | `/v1/monitoring/classification/health` | RecyClique | Idem | — |
| GET | `/v1/monitoring/classification/cache/stats` | RecyClique | Idem | — |
| POST | `/v1/monitoring/classification/cache/clear` | RecyClique | Idem | — |
| POST | `/v1/monitoring/classification/cache/export` | RecyClique | Idem | — |
| GET | `/v1/test-auth/test` | RecyClique | Dev uniquement | — |

---

## 4. Synthèse : ce que l'API RecyClique expose en v1 et pourquoi

| Domaine | Écrans / parcours servis | Source données | Cas « RecyClique appelle Paheko » |
|---------|--------------------------|----------------|-----------------------------------|
| **Auth** | Login, signup, PIN caisse, profil, reset password | RecyClique | Aucun. |
| **Sites** | Admin sites, choix site/postes | RecyClique | Aucun. |
| **Caisse** | Ouverture/fermeture session, saisie ventes, presets, statut postes, rapports | RecyClique | **POST cash-sessions** → création session Paheko ; **POST sales** → push ticket vers Paheko ; **POST cash-sessions/{id}/close** → clôture + syncAccounting Paheko. |
| **Réception** | Postes, tickets, lignes, poids, exports, stats live | RecyClique | Optionnel : écriture copie dans module_data_saisie_poids (config). |
| **Catégories** | Référentiel EEE, caisse, réception, import/export | RecyClique | Au push caisse : plugin Paheko crée ou matche les catégories à la volée (pas d'appel API depuis RecyClique vers Paheko pour lire les catégories). |
| **Admin** | Utilisateurs, groupes, permissions, santé, logs, rapports, paramètres, BDD, import legacy | RecyClique | Aucun en v1. |
| **Stats** | Dashboard, KPI live, synthèses réception/ventes | RecyClique | Aucun. |
| **Dépôts / classification** | — | — | **Hors scope v1** (bot désactivé) ou placeholders. |

---

## 5. Références

- [Catalogue Qui stocke quoi](2026-02-26_08_catalogue-qui-stocke-quoi-recyclic-paheko.md)
- [Liste endpoints API v1.4.4](../ancien-repo/v1.4.4-liste-endpoints-api.md)
- [Fonctionnalités actuelles](../ancien-repo/fonctionnalites-actuelles.md)
- [Matrice correspondance caisse/poids](../migration-paeco/audits/matrice-correspondance-caisse-poids.md)

---

*Document produit pour débloquer la vision architecturale. À mettre à jour avec les décisions produit (dépôts, import legacy, monitoring classification) et les écrans cibles v1.*
