# Liste des endpoints API Recyclic (FastAPI)

Tous les endpoints sont préfixés par **`/v1`** (ex. `GET /v1/health`). En production, l’API est souvent exposée sous `/api` (ex. `GET /api/v1/health`).

---

## Santé & version

| Méthode | Chemin | Utilité |
|--------|--------|---------|
| GET | `/v1/health` | Health check (connexion DB, état de l’API) |
| GET | `/v1/health/version` | Version de l’API / build |

---

## Authentification (`/v1/auth`)

| Méthode | Chemin | Utilité |
|--------|--------|---------|
| POST | `/v1/auth/login` | Connexion (username + password), retourne les tokens |
| POST | `/v1/auth/signup` | Inscription d’un nouvel utilisateur |
| POST | `/v1/auth/logout` | Déconnexion (invalidation côté serveur) |
| POST | `/v1/auth/refresh` | Rafraîchir l’access token avec le refresh token |
| POST | `/v1/auth/forgot-password` | Demande de réinitialisation de mot de passe (email) |
| POST | `/v1/auth/reset-password` | Réinitialisation du mot de passe avec token |
| POST | `/v1/auth/pin` | Connexion par code PIN (caisse / tablette) |

---

## Utilisateurs (`/v1/users`)

| Méthode | Chemin | Utilité |
|--------|--------|---------|
| GET | `/v1/users/me` | Profil de l’utilisateur connecté |
| PUT | `/v1/users/me` | Mise à jour du profil (nom, prénom, etc.) |
| PUT | `/v1/users/me/password` | Changement de mot de passe |
| PUT | `/v1/users/me/pin` | Définir / modifier le PIN |
| GET | `/v1/users/me/permissions` | Permissions de l’utilisateur connecté |
| GET | `/v1/users/active-operators` | Liste des opérateurs actifs (caisse) |
| GET | `/v1/users` | Liste des utilisateurs (admin) |
| GET | `/v1/users/{user_id}` | Détail d’un utilisateur |
| POST | `/v1/users` | Création d’un utilisateur (admin) |
| PUT | `/v1/users/{user_id}` | Mise à jour d’un utilisateur (admin) |
| DELETE | `/v1/users/{user_id}` | Suppression d’un utilisateur (admin) |
| POST | `/v1/users/link-telegram` | Lier un compte Telegram à l’utilisateur |

---

## Sites (`/v1/sites`)

| Méthode | Chemin | Utilité |
|--------|--------|---------|
| GET | `/v1/sites` | Liste des sites (magasins / ressourceries) |
| GET | `/v1/sites/{site_id}` | Détail d’un site |
| POST | `/v1/sites` | Création d’un site (admin) |
| PATCH | `/v1/sites/{site_id}` | Mise à jour d’un site |
| DELETE | `/v1/sites/{site_id}` | Suppression d’un site |

---

## Dépôts / dépôts bot (`/v1/deposits`)

| Méthode | Chemin | Utilité |
|--------|--------|---------|
| GET | `/v1/deposits` | Liste des dépôts |
| GET | `/v1/deposits/{deposit_id}` | Détail d’un dépôt |
| POST | `/v1/deposits` | Création d’un dépôt |
| POST | `/v1/deposits/from-bot` | Création d’un dépôt depuis le bot Telegram |
| POST | `/v1/deposits/{deposit_id}/classify` | Classification (catégories) d’un dépôt |
| PUT | `/v1/deposits/{deposit_id}` | Finaliser un dépôt |
| GET | `/v1/deposits/metrics/validation-performance` | Métriques de performance de validation |

---

## Ventes (`/v1/sales`)

| Méthode | Chemin | Utilité |
|--------|--------|---------|
| GET | `/v1/sales` | Liste des ventes (pagination) |
| GET | `/v1/sales/{sale_id}` | Détail d’une vente |
| POST | `/v1/sales` | Création d’une vente (ticket de caisse) |
| PUT | `/v1/sales/{sale_id}` | Mise à jour (ex. note) d’une vente |
| PATCH | `/v1/sales/{sale_id}/items/{item_id}` | Mise à jour d’une ligne de vente |
| PATCH | `/v1/sales/{sale_id}/items/{item_id}/weight` | Modifier le poids d’une ligne |

---

## Sessions de caisse (`/v1/cash-sessions`)

| Méthode | Chemin | Utilité |
|--------|--------|---------|
| GET | `/v1/cash-sessions` | Liste des sessions (filtres, pagination) |
| GET | `/v1/cash-sessions/current` | Session de caisse en cours pour l’utilisateur |
| GET | `/v1/cash-sessions/{session_id}` | Détail d’une session |
| POST | `/v1/cash-sessions` | Ouvrir une session (réelle, virtuelle ou différée avec `opened_at`) |
| PUT | `/v1/cash-sessions/{session_id}` | Mise à jour d’une session |
| POST | `/v1/cash-sessions/{session_id}/close` | Fermer une session (avec montants / écart) |
| GET | `/v1/cash-sessions/status/{register_id}` | Statut de session pour un poste de caisse |
| GET | `/v1/cash-sessions/deferred/check` | Vérifier si une session différée existe pour une date |
| GET | `/v1/cash-sessions/{session_id}/step` | Étape courante du workflow (entry/sale/exit) |
| PUT | `/v1/cash-sessions/{session_id}/step` | Changer l’étape du workflow |
| GET | `/v1/cash-sessions/stats/summary` | Synthèse statistiques des sessions (période) |

---

## Postes de caisse (`/v1/cash-registers`)

| Méthode | Chemin | Utilité |
|--------|--------|---------|
| GET | `/v1/cash-registers` | Liste des postes de caisse |
| GET | `/v1/cash-registers/status` | Statut de tous les postes (occupé / libre) |
| GET | `/v1/cash-registers/{register_id}` | Détail d’un poste |
| POST | `/v1/cash-registers` | Création d’un poste de caisse |
| PATCH | `/v1/cash-registers/{register_id}` | Mise à jour d’un poste |
| DELETE | `/v1/cash-registers/{register_id}` | Suppression d’un poste |

---

## Catégories (`/v1/categories`)

| Méthode | Chemin | Utilité |
|--------|--------|---------|
| GET | `/v1/categories` | Liste des catégories (filtres) |
| GET | `/v1/categories/hierarchy` | Arborescence des catégories |
| GET | `/v1/categories/{category_id}` | Détail d’une catégorie |
| POST | `/v1/categories` | Création d’une catégorie |
| PUT | `/v1/categories/{category_id}` | Mise à jour d’une catégorie |
| DELETE | `/v1/categories/{category_id}` | Suppression (soft) |
| POST | `/v1/categories/{category_id}/restore` | Restaurer une catégorie supprimée |
| DELETE | `/v1/categories/{category_id}/hard` | Suppression définitive |
| GET | `/v1/categories/{category_id}/has-usage` | Vérifier si la catégorie est utilisée |
| GET | `/v1/categories/{category_id}/children` | Enfants (sous-catégories) |
| GET | `/v1/categories/{category_id}/parent` | Parent |
| GET | `/v1/categories/{category_id}/breadcrumb` | Fil d’Ariane |
| PUT | `/v1/categories/{category_id}/visibility` | Visibilité (caisse / réception) |
| PUT | `/v1/categories/{category_id}/display-order` | Ordre d’affichage (vente) |
| PUT | `/v1/categories/{category_id}/display-order-entry` | Ordre d’affichage (réception) |
| GET | `/v1/categories/actions/export` | Export des catégories |
| GET | `/v1/categories/import/template` | Template d’import |
| POST | `/v1/categories/import/analyze` | Analyse d’un fichier d’import |
| POST | `/v1/categories/import/execute` | Exécution de l’import |
| GET | `/v1/categories/entry-tickets` | Catégories pour tickets d’entrée (réception) |
| GET | `/v1/categories/sale-tickets` | Catégories pour tickets de vente (caisse) |

---

## Réception (`/v1/reception`)

| Méthode | Chemin | Utilité |
|--------|--------|---------|
| POST | `/v1/reception/postes/open` | Ouvrir un poste de réception (optionnel : saisie différée avec `opened_at`) |
| POST | `/v1/reception/postes/{poste_id}/close` | Fermer un poste |
| POST | `/v1/reception/tickets` | Créer un ticket de réception |
| POST | `/v1/reception/tickets/{ticket_id}/close` | Fermer un ticket |
| GET | `/v1/reception/tickets` | Liste des tickets (filtres, pagination) |
| GET | `/v1/reception/tickets/{ticket_id}` | Détail d’un ticket |
| POST | `/v1/reception/tickets/{ticket_id}/download-token` | Générer un token de téléchargement |
| GET | `/v1/reception/tickets/{ticket_id}/export-csv` | Export CSV d’un ticket |
| POST | `/v1/reception/lignes` | Ajouter une ligne à un ticket |
| GET | `/v1/reception/lignes` | Liste des lignes de dépôt (pagination) |
| GET | `/v1/reception/lignes/export-csv` | Export CSV des lignes (période) |
| PUT | `/v1/reception/lignes/{ligne_id}` | Mise à jour d’une ligne |
| DELETE | `/v1/reception/lignes/{ligne_id}` | Suppression d’une ligne |
| PATCH | `/v1/reception/tickets/{ticket_id}/lignes/{ligne_id}/weight` | Modifier le poids d’une ligne |
| GET | `/v1/reception/categories` | Catégories utilisables en réception |
| GET | `/v1/reception/stats/live` | Statistiques réception en temps réel |

---

## Statistiques (`/v1/stats`)

| Méthode | Chemin | Utilité |
|--------|--------|---------|
| GET | `/v1/stats/live` | Statistiques unifiées en temps réel (réception + ventes) |
| GET | `/v1/stats/reception/summary` | Synthèse réception (période) |
| GET | `/v1/stats/reception/by-category` | Stats réception par catégorie |
| GET | `/v1/stats/sales/by-category` | Stats ventes par catégorie |

---

## Presets (boutons rapides caisse) (`/v1/presets`)

| Méthode | Chemin | Utilité |
|--------|--------|---------|
| GET | `/v1/presets` | Liste des boutons prédéfinis (optionnel : par catégorie) |
| GET | `/v1/presets/active` | Presets actifs pour la caisse |
| GET | `/v1/presets/{preset_id}` | Détail d’un preset |

---

## Transactions / log (`/v1/transactions`)

| Méthode | Chemin | Utilité |
|--------|--------|---------|
| POST | `/v1/transactions` | Création d’une transaction (vente) |
| POST | `/v1/transactions/log` | Enregistrer un événement dans le journal des transactions |

---

## Activité (présence) (`/v1/activity`)

| Méthode | Chemin | Utilité |
|--------|--------|---------|
| POST | `/v1/activity/ping` | Signaler une activité utilisateur (pour statut en ligne / timeout session) |

---

## Paramètres applicatifs (`/v1/settings`)

| Méthode | Chemin | Utilité |
|--------|--------|---------|
| GET | `/v1/settings` | Liste des paramètres (clé-valeur) |
| GET | `/v1/settings/{key}` | Valeur d’un paramètre |
| POST | `/v1/settings` | Créer un paramètre |
| PUT | `/v1/settings/{key}` | Mettre à jour un paramètre |
| DELETE | `/v1/settings/{key}` | Supprimer un paramètre |

---

## Admin – Utilisateurs, santé, logs (`/v1/admin`)

| Méthode | Chemin | Utilité |
|--------|--------|---------|
| GET | `/v1/admin/users` | Liste des utilisateurs (filtres rôle / statut) |
| GET | `/v1/admin/users/statuses` | Statuts en ligne / hors ligne des utilisateurs |
| GET | `/v1/admin/users/{user_id}` | (via users ou détail) |
| GET | `/v1/admin/users/pending` | Utilisateurs en attente d’approbation |
| PUT | `/v1/admin/users/{user_id}/role` | Changer le rôle d’un utilisateur |
| PUT | `/v1/admin/users/{user_id}/status` | Changer le statut (actif / inactif, etc.) |
| PUT | `/v1/admin/users/{user_id}` | Mise à jour profil utilisateur (admin) |
| PUT | `/v1/admin/users/{user_id}/groups` | Affecter les groupes d’un utilisateur |
| POST | `/v1/admin/users/{user_id}/approve` | Approuver un utilisateur en attente |
| POST | `/v1/admin/users/{user_id}/reject` | Rejeter un utilisateur en attente |
| POST | `/v1/admin/users/{user_id}/reset-password` | Envoyer un lien de réinitialisation de mot de passe |
| POST | `/v1/admin/users/{user_id}/force-password` | Forcer un nouveau mot de passe (admin) |
| POST | `/v1/admin/users/{user_id}/reset-pin` | Réinitialiser le PIN de l’utilisateur |
| GET | `/v1/admin/users/{user_id}/history` | Historique des actions d’un utilisateur |
| GET | `/v1/admin/health` | Métriques de santé (système) |
| GET | `/v1/admin/health/public` | Health check public |
| GET | `/v1/admin/health/database` | Health check base de données |
| GET | `/v1/admin/health/anomalies` | Anomalies détectées |
| GET | `/v1/admin/health/scheduler` | Statut du scheduler (tâches planifiées) |
| POST | `/v1/admin/health/test-notifications` | Test des notifications (Telegram, etc.) |
| GET | `/v1/admin/health-test` | Test simple de l’endpoint admin |
| GET | `/v1/admin/transaction-logs` | Consultation des logs de transactions |
| GET | `/v1/admin/audit-log` | Journal d’audit (actions sensibles) |
| GET | `/v1/admin/email-logs` | Logs d’envoi d’emails |
| GET | `/v1/admin/settings/activity-threshold` | Seuil d’inactivité (minutes) |
| PUT | `/v1/admin/settings/activity-threshold` | Modifier le seuil d’activité |
| GET | `/v1/admin/sessions/metrics` | Métriques des sessions (nombre, durée, etc.) |
| GET | `/v1/admin/templates/reception-offline.csv` | Template CSV pour réception offline |
| POST | `/v1/admin/cash-sessions/fix-blocked-deferred` | Corriger les sessions différées bloquées (Super Admin) |
| POST | `/v1/admin/cash-sessions/merge-duplicate-deferred` | Fusionner les sessions différées dupliquées (même date / opérateur) |

---

## Admin – Base de données (`/v1/admin`)

| Méthode | Chemin | Utilité |
|--------|--------|---------|
| POST | `/v1/admin/db/export` | Export manuel de la base (dump, Super Admin) |
| POST | `/v1/admin/db/purge-transactions` | Purge des transactions (données de test, Super Admin) |
| POST | `/v1/admin/db/import` | Import d’une sauvegarde de base (Super Admin) |

---

## Admin – Groupes & permissions (`/v1/admin/groups`, `/v1/admin/permissions`)

| Méthode | Chemin | Utilité |
|--------|--------|---------|
| GET | `/v1/admin/groups` | Liste des groupes |
| GET | `/v1/admin/groups/{group_id}` | Détail d’un groupe (avec permissions et utilisateurs) |
| POST | `/v1/admin/groups` | Création d’un groupe |
| PUT | `/v1/admin/groups/{group_id}` | Mise à jour d’un groupe |
| DELETE | `/v1/admin/groups/{group_id}` | Suppression d’un groupe |
| POST | `/v1/admin/groups/{group_id}/permissions` | Ajouter des permissions à un groupe |
| DELETE | `/v1/admin/groups/{group_id}/permissions/{permission_id}` | Retirer une permission |
| POST | `/v1/admin/groups/{group_id}/users` | Ajouter des utilisateurs au groupe |
| DELETE | `/v1/admin/groups/{group_id}/users/{user_id}` | Retirer un utilisateur du groupe |
| GET | `/v1/admin/permissions` | Liste des permissions |
| GET | `/v1/admin/permissions/{permission_id}` | Détail d’une permission |
| POST | `/v1/admin/permissions` | Création d’une permission |
| PUT | `/v1/admin/permissions/{permission_id}` | Mise à jour |
| DELETE | `/v1/admin/permissions/{permission_id}` | Suppression |

---

## Admin – Paramètres d’interface (`/v1/admin/settings`)

| Méthode | Chemin | Utilité |
|--------|--------|---------|
| GET | `/v1/admin/settings/alert-thresholds` | Seuils d’alerte (activité, etc.) |
| PUT | `/v1/admin/settings/alert-thresholds` | Modifier les seuils |
| GET | `/v1/admin/settings/session` | Paramètres de session (durée, etc.) |
| PUT | `/v1/admin/settings/session` | Modifier les paramètres de session |
| GET | `/v1/admin/settings/email` | Configuration email (Brevo) |
| PUT | `/v1/admin/settings/email` | Modifier la config email |
| POST | `/v1/admin/settings/email/test` | Envoyer un email de test |

---

## Admin – Tableau de bord & rapports (`/v1/admin/dashboard`, `/v1/admin/reports`)

| Méthode | Chemin | Utilité |
|--------|--------|---------|
| GET | `/v1/admin/dashboard/stats` | Statistiques du tableau de bord admin |
| GET | `/v1/admin/reports/cash-sessions` | Lister les rapports de sessions de caisse |
| GET | `/v1/admin/reports/cash-sessions/by-session/{session_id}` | Télécharger le rapport d’une session |
| GET | `/v1/admin/reports/cash-sessions/{filename}` | Télécharger un rapport par nom de fichier |
| POST | `/v1/admin/reports/cash-sessions/export-bulk` | Export bulk des sessions de caisse (filtres) |
| POST | `/v1/admin/reports/reception-tickets/export-bulk` | Export bulk des tickets de réception |

---

## Admin – Import legacy (`/v1/admin`)

| Méthode | Chemin | Utilité |
|--------|--------|---------|
| GET | `/v1/admin/import/legacy/llm-models` | Liste des modèles LLM disponibles pour l’import legacy |
| POST | `/v1/admin/import/legacy/analyze` | Analyser un fichier d’import legacy |
| POST | `/v1/admin/import/legacy/execute` | Exécuter l’import legacy |
| POST | `/v1/admin/import/legacy/analyze/llm-only` | Analyse LLM seule |
| POST | `/v1/admin/import/legacy/validate` | Valider les données d’import |
| POST | `/v1/admin/import/legacy/preview` | Aperçu avant import |
| POST | `/v1/admin/import/legacy/export-remapped` | Export des données remappées |
| POST | `/v1/admin/import/legacy/clean` | Nettoyage après import |

---

## Email (`/v1/email`)

| Méthode | Chemin | Utilité |
|--------|--------|---------|
| POST | `/v1/email/webhook` | Webhook Brevo (statut des emails) |
| GET | `/v1/email/status/{email_address}` | Statut des emails pour une adresse |
| GET | `/v1/email/events/{email_address}` | Événements (ouvertures, clics) pour une adresse |
| GET | `/v1/email/health` | Santé du service email |

---

## Webhooks (`/v1/webhooks`)

| Méthode | Chemin | Utilité |
|--------|--------|---------|
| POST | `/v1/webhooks/brevo/email-status` | Callback Brevo pour statut des emails |
| GET | `/v1/webhooks/brevo/test` | Test du webhook Brevo |

---

## Monitoring (classification, cache, emails) (`/v1/monitoring`)

| Méthode | Chemin | Utilité |
|--------|--------|---------|
| POST | `/v1/monitoring/test-email` | Envoyer un email de test (monitoring) |
| GET | `/v1/monitoring/email/metrics` | Métriques d’envoi d’emails |
| GET | `/v1/monitoring/email/metrics/prometheus` | Métriques au format Prometheus |
| POST | `/v1/monitoring/email/metrics/reset` | Réinitialiser les métriques email |
| GET | `/v1/monitoring/classification/performance` | Performance de la classification (dépôts) |
| POST | `/v1/monitoring/classification/performance/export` | Export des métriques de classification |
| GET | `/v1/monitoring/classification/health` | Santé du service de classification |
| GET | `/v1/monitoring/classification/cache/stats` | Statistiques du cache de classification |
| POST | `/v1/monitoring/classification/cache/clear` | Vider le cache de classification |
| POST | `/v1/monitoring/classification/cache/export` | Export du cache |

---

## Test auth (développement)

| Méthode | Chemin | Utilité |
|--------|--------|---------|
| GET | `/v1/test-auth/test` | Endpoint de test d’authentification |

---

*Document généré à partir du code source de l’API (FastAPI). Pour le détail des paramètres et schémas, voir `/docs` (Swagger UI) ou `/redoc` en environnement de dev.*
