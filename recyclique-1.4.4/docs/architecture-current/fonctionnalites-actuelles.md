# Recyclic – Fonctionnalités actuelles (état des lieux)

Ce document liste les **fonctionnalités réellement livrées et opérationnelles** à ce jour, déduites des stories marquées « Done », des endpoints API exposés, des routes frontend et des guides. Il sert de référence pour l’architecture externe et les partenaires.

- **Date de référence** : 2025-02-23  
- **Version produit** : **1.4.4** (frontend `package.json`)  
- **Complément** : voir `docs/guides/liste-endpoints-api.md` pour le détail des API, et `docs/architecture-current/architecture-brownfield.md` pour l’infrastructure.

---

## 1. Périmètre et méthode

- **Inclus** : ce qui est déployé (API + frontend) et couvert par des stories « Done » ou équivalent (Ready for Done, implémentation complète). L’**Epic B52 (v1.4.3)** est considéré comme **livré** : le code (paiements multiples, sale_date, édition du poids, éditeur item destination/prix, poids par session/panier) est présent en codebase et en production (version 1.4.4).
- **Exclu** : le **bot Telegram** (service désactivé, code présent mais non déployé). Les fonctionnalités « Dépôts via app (IA) » dépendant uniquement du bot ne sont pas considérées comme actives.

---

## 2. Authentification et utilisateur

| Fonctionnalité | Description | Où c’est exposé |
|----------------|-------------|------------------|
| Connexion (login) | Identifiants + mot de passe, tokens JWT (access + refresh) | `POST /v1/auth/login`, page `/login` |
| Inscription (signup) | Création de compte, workflow d’approbation admin | `POST /v1/auth/signup`, page `/signup` |
| Déconnexion | Invalidation côté serveur | `POST /v1/auth/logout` |
| Rafraîchissement du token | Renouvellement de l’access token | `POST /v1/auth/refresh` |
| Mot de passe oublié | Demande par email (Brevo) | `POST /v1/auth/forgot-password`, page `/forgot-password` |
| Réinitialisation mot de passe | Avec token reçu par email | `POST /v1/auth/reset-password`, page `/reset-password` |
| Connexion par PIN | Pour caisse / tablette | `POST /v1/auth/pin` |
| Lien compte Telegram | Lier un compte Telegram à l’utilisateur (bot désactivé mais endpoint présent) | `POST /v1/users/link-telegram`, page `/telegram-auth` |
| Profil utilisateur | Consultation et mise à jour (nom, prénom, etc.) | `GET/PUT /v1/users/me`, page `/profil` |
| Changement mot de passe / PIN | Depuis le profil | `PUT /v1/users/me/password`, `PUT /v1/users/me/pin` |
| Permissions utilisateur | Liste des permissions de l’utilisateur connecté | `GET /v1/users/me/permissions` |
| Inscription (page dédiée) | Inscription avec paramètre optionnel (ex. `telegram_id`) | Page `/inscription` |

**Stories / épics concernés** : Epic 2 (Cycle d’inscription), Epic 3 (Gestion administrative), refonte IAM (B33).

---

## 3. Caisse (ventes et sessions)

### 3.1 Vue d’ensemble

- **Caisse réelle** : ouverture/fermeture de session, saisie de ventes (tickets), fond de caisse, écart à la clôture. Permissions : `caisse.access`.
- **Caisse virtuelle** : même workflow pour la formation, sans impact sur les données réelles. Permission : `caisse.virtual.access`.
- **Saisie différée** : saisie a posteriori de cahiers papier avec date réelle d’ouverture. Permission : `caisse.deferred.access`.

### 3.2 Fonctionnalités caisse (livrées)

| Fonctionnalité | Description | API / routes |
|----------------|-------------|--------------|
| Dashboard caisses | Choix du type de caisse (réelle / virtuelle / différée) selon permissions | `/caisse`, `/cash-register/virtual`, `/cash-register/deferred` |
| Ouverture de session | Fond de caisse, type de session (réelle, virtuelle, différée avec `opened_at`) | `POST /v1/cash-sessions`, `/cash-register/session/open`, etc. |
| Saisie de vente (ticket) | Ajout d’articles par catégorie/quantité/prix, presets (Don 0 €, Don -18, Recyclage, Déchèterie) | `POST /v1/sales`, pages `/cash-register/sale`, etc. |
| Presets (boutons rapides) | Liste et usage des presets actifs | `GET /v1/presets`, `GET /v1/presets/active` |
| Fermeture de session | Montants de clôture, écart, variance | `POST /v1/cash-sessions/{id}/close`, `/cash-register/session/close` |
| Session en cours | Récupération de la session courante pour l’opérateur | `GET /v1/cash-sessions/current` |
| Détail d’une session | Consultation d’une session et de ses ventes | `GET /v1/cash-sessions/{id}` |
| Statut par poste | Savoir si un poste a une session ouverte | `GET /v1/cash-sessions/status/{register_id}` |
| Saisie différée (caisse) | Vérification et création de session différée pour une date | `GET /v1/cash-sessions/deferred/check`, workflow B44-P1 |
| Workflow par étapes | Entry / sale / exit | `GET/PUT /v1/cash-sessions/{id}/step` |
| Mode « item sans prix » (prix global) | Option pour ticket sans détail de prix par ligne | B49-P2 |
| Presets Recyclage / Déchèterie | Logique dédiée pour ces presets | B49-P6 |
| Mode chèque | Montant donné pour chèques (sans rendu de monnaie) | B39-P6 (cashChequesV2) |
| Notes sur les ventes | Note sur un ticket (ex. commentaire) | B40-P4, `PUT /v1/sales/{id}` |
| **Paiements multiples** | Plusieurs moyens de paiement par encaissement (espèces + chèques, etc.), approche séquentielle | B52-P1, `POST /v1/sales` avec `payments[]`, affichage dans détail session |
| **Date réelle des tickets (sale_date)** | Distinction date réelle du ticket vs date d’enregistrement ; pour sessions différées : date du cahier | B52-P3, champ `sale_date` (modèle, API, exports), affichage admin |
| **Édition du poids (admin)** | Modification du poids d’un item après validation, recalcul des stats, log d’audit | B52-P2, `PATCH /v1/sales/{sale_id}/items/{item_id}/weight` (admin/super-admin) |
| **Éditeur d’item (destination et prix)** | Modification preset/destination et prix par item ; prix réservé aux admin, traçabilité audit | B52-P4, `PATCH /v1/sales/{sale_id}/items/{item_id}` (preset_id, unit_price) |
| **Poids par session et par panier** | Poids total sorti sur la session, poids total par ticket (panier) | B52-P6, `total_weight_out` et `total_weight` dans détail session, `CashSessionDetail` |

**Guides** : `docs/guides/interface-caisse-manual.md`, `docs/guides/guide-utilisateur-session-banniere.md`, `docs/guides/correction-date-session-caisse-differee.md`.

### 3.3 Postes de caisse (registres)

| Fonctionnalité | Description | API |
|----------------|-------------|-----|
| Liste des postes | Postes de caisse par site | `GET /v1/cash-registers` |
| Statut global | Occupé / libre par poste | `GET /v1/cash-registers/status` |
| CRUD postes | Création, modification, suppression (admin) | `POST/PATCH/DELETE /v1/cash-registers` |

---

## 4. Réception (dépôts et tickets)

| Fonctionnalité | Description | API / routes |
|----------------|-------------|--------------|
| Accès réception | Module réception (permission `reception.access`) | `/reception` |
| Postes de réception | Ouverture/fermeture de poste, option saisie différée (`opened_at`) | `POST /v1/reception/postes/open`, `POST .../close` |
| Tickets de réception | Création, fermeture, liste, détail | `POST/GET /v1/reception/tickets`, etc. |
| Lignes de dépôt | Ajout, modification, suppression de lignes, catégorie, poids | `POST/GET/PUT/DELETE /v1/reception/lignes`, `PATCH .../weight` |
| Export CSV ticket | Export d’un ticket individuel | `GET /v1/reception/tickets/{id}/export-csv` |
| Export CSV lignes (période) | Export bulk des lignes | `GET /v1/reception/lignes/export-csv` |
| Stats réception en temps réel | KPI réception (live) | `GET /v1/reception/stats/live`, `GET /v1/stats/live` |
| Saisie différée réception | Tickets avec date réelle (cahier) | B44-P2, B44-P4, guide `reception-saisie-differee-guide.md` |
| Sorties stock (réception) | Gestion des sorties | B48-P3 |
| Filtrage stats live (exclusion sessions différées) | Option d’exclusion des sessions différées des stats | B44-P5 |

**Guides** : `docs/guides/reception-saisie-differee-guide.md`, `docs/guides/template-offline-reception.md`.

---

## 5. Catégories

| Fonctionnalité | Description | API |
|----------------|-------------|-----|
| Liste et hiérarchie | Catégories EEE, arborescence | `GET /v1/categories`, `GET /v1/categories/hierarchy` |
| CRUD catégories | Création, modification, suppression (soft delete) | `POST/PUT/DELETE /v1/categories`, etc. |
| Restauration / hard delete | Restaurer une catégorie supprimée, ou suppression définitive | `POST .../restore`, `DELETE .../hard` |
| Visibilité et ordre | Visibilité caisse / réception, ordre d’affichage | `PUT .../visibility`, `PUT .../display-order`, etc. |
| Import/export catégories | Template, analyse, exécution d’import | `GET .../import/template`, `POST .../import/analyze`, `POST .../import/execute` |
| Double dénomination | Nom court + nom officiel | B48-P5 (`name`, `official_name`) |
| Soft delete | Catégories désactivées mais conservées | B48-P1 |
| Refonte UX page catégories | Interface admin gestion catégories | B48-P4 |
| Catégories pour réception / vente | Listes dédiées entry-tickets / sale-tickets | `GET /v1/categories/entry-tickets`, `.../sale-tickets` |

---

## 6. Administration (back-office)

### 6.1 Accès et navigation

- **URL type** : `/admin` (avec sous-routes). Réservé aux rôles admin / super-admin (ou permissions équivalentes).
- **Layout** : `AdminLayout` avec menu (Dashboard, Utilisateurs, Sites, Caisses, Rapports, Réception, Catégories, Groupes, Audit, Logs email, Santé, Paramètres, Import legacy, Analyse rapide).

### 6.2 Utilisateurs et groupes

| Fonctionnalité | Description | API / routes |
|----------------|-------------|--------------|
| Liste utilisateurs | Filtres rôle/statut, pagination | `GET /v1/admin/users`, page `/admin/users` |
| Utilisateurs en attente | Inscriptions en attente d’approbation | `GET /v1/admin/users/pending` |
| Rôle et statut | Modification rôle, statut (actif/inactif, etc.) | `PUT /v1/admin/users/{id}/role`, `.../status` |
| Approbation / rejet | Approuver ou rejeter un utilisateur en attente | `POST .../approve`, `.../reject` |
| Réinitialisation mot de passe / PIN | Envoi lien ou forcer un nouveau mot de passe / reset PIN | `POST .../reset-password`, `.../force-password`, `.../reset-pin` |
| Groupes d’un utilisateur | Affectation aux groupes | `PUT /v1/admin/users/{id}/groups` |
| Historique utilisateur | Historique des actions d’un utilisateur | `GET /v1/admin/users/{id}/history` (B50 / 5.4.2) |
| Statuts en ligne | Utilisateurs en ligne / hors ligne | `GET /v1/admin/users/statuses` |
| Groupes et permissions | CRUD groupes, permissions, liaison groupes-permissions-utilisateurs | `GET/POST/PUT/DELETE /v1/admin/groups`, `.../permissions` |

### 6.3 Sites et postes de caisse

| Fonctionnalité | Description | API / routes |
|----------------|-------------|--------------|
| Sites (magasins) | CRUD sites | `GET/POST/PATCH/DELETE /v1/sites`, pages `/admin/sites`, `/admin/sites-and-registers` |
| Postes de caisse | Gestion des registres (voir section 3.3) | `/admin/cash-registers` |

### 6.4 Sessions et rapports

| Fonctionnalité | Description | API / routes |
|----------------|-------------|--------------|
| Gestionnaire de sessions caisse | Liste, filtres, ouverture/fermeture de sessions | `GET /v1/cash-sessions`, page `/admin/session-manager` |
| Détail session caisse | Détail d’une session et de ses tickets | `/admin/cash-sessions/:id` |
| Rapports caisse | Liste des rapports, export par session, export bulk | `GET/POST /v1/admin/reports/cash-sessions/...`, `/admin/reports`, `/admin/reports/cash-sessions` |
| Export atomisé (détails tickets) | Export Excel avec onglet « Détails Tickets » | B50-P1, export bulk |
| Réception – stats et rapports | Dashboard réception, rapports, sessions réception, détail ticket | `/admin/reception-stats`, `/admin/reception-reports`, `/admin/reception-sessions`, `/admin/reception-tickets/:id` |
| Export réception (bulk) | Export bulk des tickets de réception (bugs 400/500 corrigés) | B50-P2, B50-P3, `POST /v1/admin/reports/reception-tickets/export-bulk` |
| Analyse rapide (comparaison périodes) | Page comparaison de périodes | B50-P8, `/admin/quick-analysis` |

### 6.5 Santé, audit, logs, paramètres

| Fonctionnalité | Description | API / routes |
|----------------|-------------|--------------|
| Santé (health) | Métriques système, DB, scheduler, anomalies | `GET /v1/admin/health`, `.../health/database`, `.../health/scheduler`, `.../health/anomalies`, page `/admin/health` |
| Journal d’audit | Consultation des actions sensibles | `GET /v1/admin/audit-log`, `/admin/audit-log` |
| Logs de transactions | Journal des transactions | `GET /v1/admin/transaction-logs` |
| Logs email | Suivi des envois d’emails | `GET /v1/admin/email-logs`, `/admin/email-logs` |
| Paramètres (alertes, session, email) | Seuils d’alerte, paramètres de session, config email | `GET/PUT /v1/admin/settings/...`, `/admin/settings` |
| Seuil d’activité | Paramètre d’inactivité (timeout session) | `GET/PUT /v1/admin/settings/activity-threshold` |
| Correctifs admin sessions | Correction sessions différées bloquées, fusion doublons | `POST /v1/admin/cash-sessions/fix-blocked-deferred`, `.../merge-duplicate-deferred` |
| Template réception offline | Fichier CSV template pour réception hors ligne | `GET /v1/admin/templates/reception-offline.csv` |

### 6.6 Base de données et import

| Fonctionnalité | Description | API / routes |
|----------------|-------------|--------------|
| Export BDD (dump) | Export manuel de la base (Super Admin) | `POST /v1/admin/db/export`, design B46-P1, implémentation B46-P2 |
| Purge des transactions | Purge des données de test (Super Admin) | `POST /v1/admin/db/purge-transactions` |
| Import BDD | Restauration d’une sauvegarde (Super Admin) | `POST /v1/admin/db/import`, B46-P4 (backup automation) |
| Import legacy (CSV) | Nettoyage CSV, fuzzy matching, interface de validation, fallback LLM optionnel, sélecteur de modèles | B47-P1 à B47-P6, `GET/POST /v1/admin/import/legacy/...`, page `/admin/import/legacy` |

---

## 7. Statistiques et monitoring

| Fonctionnalité | Description | API |
|----------------|-------------|-----|
| Stats unifiées temps réel | Réception + ventes (live) | `GET /v1/stats/live` |
| Stats réception | Synthèse, par catégorie | `GET /v1/stats/reception/summary`, `.../by-category` |
| Stats ventes | Par catégorie | `GET /v1/stats/sales/by-category` |
| Synthèse sessions caisse | Stats des sessions (période) | `GET /v1/cash-sessions/stats/summary` |
| Dashboard admin | Statistiques agrégées pour l’admin | `GET /v1/admin/dashboard/stats` |
| Métriques sessions | Nombre, durée, etc. | `GET /v1/admin/sessions/metrics` |
| Monitoring email / classification | Métriques Prometheus, santé classification, cache | `GET/POST /v1/monitoring/...` |

**Stories** : B38-P2 (API KPI réception live), B38-P3 (rafraîchissement continu KPI admin), B48-P7 (unification endpoints stats live).

---

## 8. Emails et webhooks

| Fonctionnalité | Description | API |
|----------------|-------------|-----|
| Envoi d’emails | Via Brevo (Sendinblue) | Service email (Brevo API) |
| Webhook Brevo | Callback statut des emails | `POST /v1/email/webhook`, `POST /v1/webhooks/brevo/email-status` |
| Logs et statut email | Consultation par adresse | `GET /v1/email/status/{email}`, `.../events/{email}` |
| Test email | Envoi d’un email de test (admin / monitoring) | `POST /v1/admin/settings/email/test`, `POST /v1/monitoring/test-email` |

Rapports envoyés par email à la clôture de caisse (configurable).

---

## 9. Activité et traçabilité

| Fonctionnalité | Description | API |
|----------------|-------------|-----|
| Ping d’activité | Signalement d’activité utilisateur (timeout session, statut en ligne) | `POST /v1/activity/ping` |
| Journal d’audit | Traçabilité des actions sensibles (rôles, statuts, sessions, etc.) | B46-P3, `GET /v1/admin/audit-log` |
| Logs transactionnels | Journal des transactions (B48-P2) | `GET /v1/admin/transaction-logs`, `POST /v1/transactions/log` |
| Bannière statut de session | Alerte hors ligne / token qui expire (B42-P3, B42-P4) | Frontend `SessionStatusBanner`, heartbeat + refresh token |

---

## 10. Paramètres applicatifs et feature flags

| Fonctionnalité | Description | API |
|----------------|-------------|-----|
| Paramètres clé-valeur | Paramètres globaux (hors admin/settings) | `GET/POST/PUT/DELETE /v1/settings` |
| Badge environnement | Indication test/staging (B50-P7) | Frontend (build-info, env) |

---

## 11. Ce qui n’est pas actif ou pas encore livré

- **Bot Telegram** : service désactivé (docker-compose). Les endpoints « dépôts depuis le bot » et « classification » existent côté API mais ne sont pas utilisés en production sans le bot.
- **Dépôts via app (IA) / vocal** : décrits dans la présentation comme « innovation clé » mais dépendants du bot ; à considérer comme non actifs tant que le bot n’est pas redéployé.
- **Module éco-organismes (REP)** : en phase d’études / spécifications, pas de module livré dans l’application actuelle.

**Note Epic B52 (v1.4.3)** : Les fonctionnalités B52-P1 à B52-P6 sont **implémentées en code et en production** (version 1.4.4) : paiements multiples, date réelle des tickets (`sale_date`), édition du poids (admin), éditeur d’item (destination + prix admin), poids par session et par panier. Les statuts des stories peuvent encore être « Ready for Review » côté BMAD ; le présent document reflète l’état du code et du déploiement.

---

## 12. Références croisées

| Besoin | Document |
|--------|----------|
| Liste exhaustive des endpoints | `docs/guides/liste-endpoints-api.md` |
| Architecture technique actuelle | `docs/architecture-current/architecture-brownfield.md` |
| Interface caisse (utilisateur) | `docs/guides/interface-caisse-manual.md` |
| Saisie différée réception | `docs/guides/reception-saisie-differee-guide.md` |
| Tableau de bord admin | `docs/guides/admin-dashboard-guide.md` |
| Correction date session caisse différée | `docs/guides/correction-date-session-caisse-differee.md` |
| Stories « Done » | Dossier `docs/stories/` (filtre par `**Statut:** Done` ou `Ready for Done`) |
| Epics | `docs/prd/epic-list.md`, `docs/epics/` |

---

*Document généré pour refléter l’état des fonctionnalités à la date indiquée. Pour mettre à jour : reprendre les stories Done, les routes dans `frontend/src/App.jsx`, les routers dans `api/.../api_v1/api.py`, et les guides dans `docs/guides/`.*
