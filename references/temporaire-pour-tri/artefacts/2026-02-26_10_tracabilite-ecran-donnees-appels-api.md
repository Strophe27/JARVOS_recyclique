# Traçabilité écran → données + appels API + logique

**Date :** 2026-02-26  
**Objectif :** Pour chaque écran / flux 1.4.4, documenter quelles données sont affichées, quels endpoints sont appelés au chargement, et pour chaque action utilisateur quel endpoint est appelé avec quel type de payload. Utilisable pour le refactor (conception avant de coder) et pour aligner l'API RecyClique v1 aux besoins réels des écrans.  
**Sources :** [Fonctionnalités actuelles](../ancien-repo/fonctionnalites-actuelles.md), [audit caisse 1.4.4](../migration-paeco/audits/audit-caisse-recyclic-1.4.4.md), [audit réception 1.4.4](../migration-paeco/audits/audit-reception-poids-recyclic-1.4.4.md), [liste endpoints API v1.4.4](../ancien-repo/v1.4.4-liste-endpoints-api.md), [périmètre API v1](2026-02-26_09_perimetre-api-recyclique-v1.md).

---

## 1. Plan du livrable

### 1.1 Structure du document

- **§ 2** : Convention de description par écran (champs utilisés).
- **§ 3** : Liste exhaustive des écrans couverts, groupés par domaine (Auth, Caisse, Réception, Admin, Catégories).
- **§ 4 à § 8** : Un bloc par domaine ; pour chaque écran :
  - **Route(s)** : chemin(s) frontend (ex. `/caisse`, `/admin/users`).
  - **Permissions** : permission(s) requise(s) pour accéder à l'écran.
  - **Données affichées** : ce que l'utilisateur voit et d'où ça vient (réponse API ou calcul front).
  - **Appels API au chargement** : GET (et paramètres) exécutés à l'arrivée sur l'écran (mount / navigation).
  - **Actions utilisateur → appels API** : pour chaque action (clic, soumission), méthode HTTP, chemin, et type de payload (body / query).
  - **Notes** : cas particulier (saisie différée, virtuelle, push Paheko, etc.).

### 1.2 Liste des écrans couverts

| Domaine | Écrans |
|---------|--------|
| **Auth** | Login, Signup, Forgot password, Reset password, Profil (me, password, PIN), Connexion par PIN (caisse) |
| **Caisse** | Dashboard caisses (choix type), Ouverture session, Saisie vente (sale), Fermeture session, Détail session (admin) |
| **Réception** | Accueil réception (poste courant), Ouverture poste, Liste tickets, Détail ticket, Lignes (ajout/modif/suppr/poids), Export CSV, Stats live |
| **Admin** | Dashboard, Utilisateurs (liste, détail, pending), Sites (liste, formulaire), Postes caisse (liste, formulaire), Gestionnaire sessions, Détail session caisse, Rapports caisse, Réception (stats, rapports, sessions, détail ticket), Santé, Audit log, Logs email, Paramètres, BDD (export/purge/import), Import legacy, Groupes (liste, détail), Permissions, Analyse rapide |
| **Catégories** | Page catégories (liste, hiérarchie, CRUD, visibilité, ordre, import/export) |

### 1.3 Convention « Action → Appel API »

- **Chargement** : appels effectués quand l'écran est monté ou quand une ressource parent est chargée (ex. ouverture session → ensuite chargement presets + session courante).
- **Payload** : on indique le **type** (ex. `body: { initial_amount, register_id?, opened_at? }`) sans détailler tous les champs optionnels ; le détail est dans l'OpenAPI / liste endpoints.
- **Push Paheko** : côté backend, pas d'appel front supplémentaire ; on le mentionne en note pour les écrans caisse (ouverture session, vente, clôture).

---

## 2. Convention de description par écran

Pour chaque écran, les sous-sections suivantes sont renseignées :

- **Route(s)** : chemin(s) React Router (ex. `/login`, `/admin/cash-sessions/:id`).
- **Permissions** : ex. `caisse.access`, `reception.access`, `admin` (ou rôle).
- **Données affichées** : liste synthétique ; origine = « réponse GET /v1/… » ou « calcul front (ex. total panier) ».
- **Appels API au chargement** : liste « GET /v1/… » avec paramètres éventuels (query, path).
- **Actions utilisateur → appels API** : tableau ou liste « Action » → « Méthode /chemin » + « Payload type ».
- **Notes** : push Paheko, saisie différée, correctifs admin, etc.

---

## 3. Index des écrans (référence rapide)

| # | Domaine | Écran | Route(s) |
|---|---------|-------|----------|
| 1 | Auth | Login | `/login` |
| 2 | Auth | Signup | `/signup`, `/inscription` |
| 3 | Auth | Forgot password | `/forgot-password` |
| 4 | Auth | Reset password | `/reset-password` |
| 5 | Auth | Profil | `/profil` |
| 6 | Auth | Connexion par PIN (caisse) | `/login` (option PIN) ou `/cash-register/pin` |
| 7 | Caisse | Dashboard caisses | `/caisse`, `/cash-register/virtual`, `/cash-register/deferred` |
| 8 | Caisse | Ouverture session | `/cash-register/session/open` (et variantes virtual/deferred) |
| 9 | Caisse | Saisie vente (sale) | `/cash-register/sale` (étape sale du workflow) |
| 10 | Caisse | Fermeture session | Étape exit du workflow (même zone ou modal) |
| 11 | Caisse | Détail session (admin) | `/admin/cash-sessions/:id` |
| 12 | Réception | Accueil / poste courant | `/reception` |
| 13 | Réception | Ouverture poste | (depuis accueil réception) |
| 14 | Réception | Liste tickets | `/reception` (liste dans le poste) |
| 15 | Réception | Détail ticket + lignes | (détail ticket, lignes de dépôt) |
| 16 | Réception | Export CSV / Stats live | (boutons / KPI réception) |
| 17 | Admin | Dashboard | `/admin` |
| 18 | Admin | Utilisateurs (liste) | `/admin/users` |
| 19 | Admin | Utilisateurs (détail, pending) | `/admin/users/:id`, pending |
| 20 | Admin | Sites (liste, formulaire) | `/admin/sites`, `/admin/sites-and-registers` |
| 21 | Admin | Postes caisse (liste, formulaire) | `/admin/cash-registers` |
| 22 | Admin | Gestionnaire sessions | `/admin/session-manager` |
| 23 | Admin | Rapports caisse | `/admin/reports`, `/admin/reports/cash-sessions` |
| 24 | Admin | Réception (stats, rapports, tickets) | `/admin/reception-stats`, `/admin/reception-reports`, `/admin/reception-sessions`, `/admin/reception-tickets/:id` |
| 25 | Admin | Santé, audit, logs, paramètres | `/admin/health`, `/admin/audit-log`, `/admin/email-logs`, `/admin/settings` |
| 26 | Admin | BDD, Import legacy | `/admin` (sous-routes db, import/legacy) |
| 27 | Admin | Groupes, Permissions | `/admin/groups`, `/admin/permissions` (ou équivalent) |
| 28 | Admin | Analyse rapide | `/admin/quick-analysis` |
| 29 | Catégories | Page catégories | `/admin/categories` (ou équivalent) |

---

## 4. Auth

### 4.1 Login

- **Route(s)** : `/login`
- **Permissions** : aucune (écran public).
- **Données affichées** : formulaire (username, password). Message d'erreur si échec (réponse API).
- **Appels API au chargement** : aucun (ou GET health pour vérifier que l'API est joignable).
- **Actions utilisateur → appels API** :
  - Soumission formulaire (identifiants) → **POST /v1/auth/login** — body : `{ username, password }`. Réponse : tokens + user. Le front stocke les tokens et redirige (ex. vers `/caisse` ou `/admin` selon rôle).
- **Notes** : JWT 30 min ; refresh via POST /v1/auth/refresh.

### 4.2 Signup

- **Route(s)** : `/signup`, `/inscription`
- **Permissions** : aucune.
- **Données affichées** : formulaire d'inscription (champs utilisateur). Optionnel : paramètre (ex. `telegram_id`).
- **Appels API au chargement** : aucun.
- **Actions utilisateur → appels API** :
  - Soumission formulaire → **POST /v1/auth/signup** — body : champs inscription. Réponse : succès ou erreur ; workflow d'approbation admin (utilisateurs en attente).
- **Notes** : après inscription, l'utilisateur peut être en attente d'approbation (voir Admin Utilisateurs pending).

### 4.3 Forgot password

- **Route(s)** : `/forgot-password`
- **Permissions** : aucune.
- **Données affichées** : formulaire (email).
- **Appels API au chargement** : aucun.
- **Actions utilisateur → appels API** :
  - Soumission email → **POST /v1/auth/forgot-password** — body : `{ email }`. Envoi lien par Brevo.
- **Notes** : —

### 4.4 Reset password

- **Route(s)** : `/reset-password`
- **Permissions** : aucune (token dans l'URL ou le body).
- **Données affichées** : formulaire (nouveau mot de passe, confirmation).
- **Appels API au chargement** : aucun (ou lecture du token depuis l'URL).
- **Actions utilisateur → appels API** :
  - Soumission → **POST /v1/auth/reset-password** — body : `{ token, new_password }` (ou équivalent).
- **Notes** : —

### 4.5 Profil

- **Route(s)** : `/profil`
- **Permissions** : utilisateur connecté.
- **Données affichées** : profil (nom, prénom, etc.) issu de GET /v1/users/me ; formulaires changement mot de passe et PIN.
- **Appels API au chargement** :
  - **GET /v1/users/me** — profil.
  - Optionnel : **GET /v1/users/me/permissions** si affichage des permissions.
- **Actions utilisateur → appels API** :
  - Mise à jour profil → **PUT /v1/users/me** — body : champs modifiables.
  - Changement mot de passe → **PUT /v1/users/me/password** — body : ancien + nouveau.
  - Modification PIN → **PUT /v1/users/me/pin** — body : nouveau PIN.
- **Notes** : —

### 4.6 Connexion par PIN (caisse / tablette)

- **Route(s)** : `/login` avec option PIN, ou page dédiée (ex. `/cash-register/pin`).
- **Permissions** : aucune (authentification).
- **Données affichées** : clavier PIN (code à 4–6 chiffres).
- **Appels API au chargement** : aucun.
- **Actions utilisateur → appels API** :
  - Soumission PIN → **POST /v1/auth/pin** — body : `{ pin }` (ou équivalent). Réponse : tokens + user. Redirection vers dashboard caisse.
- **Notes** : utilisé pour les tablettes caisse ; même JWT que le login classique.

---

## 5. Caisse

### 5.1 Dashboard caisses (choix type)

- **Route(s)** : `/caisse` (réelle), `/cash-register/virtual` (virtuelle), `/cash-register/deferred` (différée).
- **Permissions** : `caisse.access`, `caisse.virtual.access`, `caisse.deferred.access` selon le type.
- **Données affichées** : liste des postes de caisse avec statut (occupé / libre) ; choix du poste pour ouvrir une session.
- **Appels API au chargement** :
  - **GET /v1/cash-registers** — liste des postes (filtrée par site si besoin).
  - **GET /v1/cash-registers/status** — statut global (occupé / libre par poste).
- **Actions utilisateur → appels API** :
  - Clic « Ouvrir une session » (avec choix poste) → navigation vers écran Ouverture session (voir 5.2).
- **Notes** : type de caisse (réel / virtuel / différé) déduit de la route ou des permissions.

### 5.2 Ouverture session

- **Route(s)** : `/cash-register/session/open` (et variantes virtual / deferred).
- **Permissions** : idem 5.1.
- **Données affichées** : formulaire fond de caisse (`initial_amount`), choix poste (si pas déjà fait), option date réelle `opened_at` pour saisie différée.
- **Appels API au chargement** :
  - **GET /v1/cash-registers** (si liste postes affichée).
  - Pour différée : **GET /v1/cash-sessions/deferred/check** — query : date (ex. `?date=YYYY-MM-DD`) pour vérifier qu'il n'existe pas déjà une session différée pour cette date.
- **Actions utilisateur → appels API** :
  - Soumission (fond de caisse, register_id, optionnel opened_at) → **POST /v1/cash-sessions** — body : `{ initial_amount, register_id?, opened_at? }`. Réponse : session créée. **Côté backend : push vers Paheko** (création session Paheko). Redirection vers étape sale (saisie ventes).
- **Notes** : 1 session RecyClique = 1 session Paheko ; type (réel/virtuel/différé) porté par la route ou le body selon implémentation.

### 5.3 Saisie vente (sale)

- **Route(s)** : Étape « sale » du workflow caisse (après ouverture) ; route dédiée possible ex. `/cash-register/sale`.
- **Permissions** : `caisse.access` (ou virtual/deferred).
- **Données affichées** : session courante (fond de caisse, step) ; grille de presets (boutons rapides) ; panier courant (lignes, total, poids) ; sélecteur catégories ; champs paiement (multi-moyens) ; note ticket ; option date réelle ticket (`sale_date`) pour différée.
- **Appels API au chargement** :
  - **GET /v1/cash-sessions/current** — session en cours.
  - **GET /v1/presets/active** — presets actifs pour la caisse.
  - **GET /v1/categories/sale-tickets** — catégories visibles en caisse (si sélection manuelle).
  - Optionnel : **GET /v1/cash-sessions/{id}/step** — étape courante.
- **Actions utilisateur → appels API** :
  - Enregistrer un ticket (lignes + paiements) → **POST /v1/sales** — body : `{ cash_session_id, items: [{ category_id?, preset_id?, quantity, unit_price?, total_price, weight? }], payments: [{ payment_method, amount }], note?, sale_date? }`. **Côté backend : push ticket vers Paheko** (plugin_pos_tabs, _items, _payments). Réponse : vente créée ; le panier est vidé côté front.
  - Changer l'étape (ex. vers exit) → **PUT /v1/cash-sessions/{id}/step** — body : `{ step: "exit" }`.
- **Notes** : paiements multiples (payments[]). Poids par ligne ; total_weight_out / total_weight dans le détail session. Item sans prix (prix global) : lignes avec unit_price/total_price selon cas.

### 5.4 Fermeture session

- **Route(s)** : Étape « exit » du workflow (même zone caisse ou modal).
- **Permissions** : idem 5.1.
- **Données affichées** : montants de clôture saisis par l'opérateur (`closing_amount`, `actual_amount`), commentaire écart (`variance_comment`) ; récap session (totaux, ventes).
- **Appels API au chargement** : déjà chargé (session courante, détail session avec totaux).
  - **GET /v1/cash-sessions/current** ou **GET /v1/cash-sessions/{id}** pour totaux et ventes.
- **Actions utilisateur → appels API** :
  - Confirmer clôture → **POST /v1/cash-sessions/{id}/close** — body : `{ closing_amount?, actual_amount?, variance_comment? }`. **Côté backend : clôture session Paheko + syncAccounting.** Réponse : session fermée ; redirection vers dashboard caisses ou rapport.
- **Notes** : rapports (PDF, email) peuvent être déclenchés à la clôture (côté API ou job).

### 5.5 Détail session caisse (admin)

- **Route(s)** : `/admin/cash-sessions/:id`
- **Permissions** : admin (ou permission dédiée rapports/sessions).
- **Données affichées** : détail de la session (ouverture, clôture, fond de caisse, montants, écart, step) ; liste des ventes de la session ; pour chaque vente : lignes, paiements, poids ; boutons édition item (destination, prix), édition poids (admin).
- **Appels API au chargement** :
  - **GET /v1/cash-sessions/{session_id}** — détail session + ventes + lignes + payment_transactions.
- **Actions utilisateur → appels API** :
  - Modifier la note d'une vente → **PUT /v1/sales/{sale_id}** — body : `{ note }`.
  - Modifier destination/prix d'un item → **PATCH /v1/sales/{sale_id}/items/{item_id}** — body : `{ preset_id?, unit_price? }`.
  - Modifier le poids d'un item → **PATCH /v1/sales/{sale_id}/items/{item_id}/weight** — body : `{ weight }`.
  - Télécharger rapport session → **GET /v1/admin/reports/cash-sessions/by-session/{session_id}** (ou par filename).
- **Notes** : éditeur item et poids réservés admin/super-admin ; traçabilité audit.

---

## 6. Réception

### 6.1 Accueil réception / poste courant

- **Route(s)** : `/reception`
- **Permissions** : `reception.access`
- **Données affichées** : état du poste courant (ouvert / fermé) ; si poste ouvert : liste des tickets du poste, KPI live (stats) ; boutons Ouvrir poste / Fermer poste, Créer ticket.
- **Appels API au chargement** :
  - Contexte poste : selon implémentation, soit un état « poste courant » en mémoire après ouverture, soit **GET /v1/reception/tickets** (filtre par poste si exposé).
  - **GET /v1/reception/stats/live** — KPI réception en temps réel.
  - **GET /v1/reception/categories** ou **GET /v1/categories/entry-tickets** — catégories pour les lignes (chargement possible au premier besoin).
- **Actions utilisateur → appels API** :
  - Ouvrir un poste → voir 6.2.
  - Créer un ticket → **POST /v1/reception/tickets** — body : `{ poste_id? }` (ou déduit du contexte). Réponse : ticket créé ; redirection ou rafraîchissement liste.
  - Fermer le poste → **POST /v1/reception/postes/{poste_id}/close**.
- **Notes** : poste n'a pas de site_id en BDD ; site déductible via opened_by_user_id → users.site_id.

### 6.2 Ouverture poste réception

- **Route(s)** : Depuis accueil réception (modal ou étape).
- **Permissions** : `reception.access`
- **Données affichées** : formulaire optionnel date réelle `opened_at` (saisie différée).
- **Appels API au chargement** : aucun (ou déjà chargé).
- **Actions utilisateur → appels API** :
  - Ouvrir poste → **POST /v1/reception/postes/open** — body : `{ opened_at? }`. Réponse : poste créé ; état « poste courant » mis à jour.
- **Notes** : B44-P2, B44-P4 (saisie différée réception).

### 6.3 Liste tickets réception

- **Route(s)** : `/reception` (liste dans la page).
- **Permissions** : `reception.access`
- **Données affichées** : liste des tickets (poste courant ou filtre) ; colonnes utiles (id, date, bénévole, statut, nombre de lignes, etc.).
- **Appels API au chargement** :
  - **GET /v1/reception/tickets** — query : pagination, filtres (poste_id, période, status).
- **Actions utilisateur → appels API** :
  - Clic sur un ticket → navigation vers Détail ticket (ou ouverture panneau). Chargement **GET /v1/reception/tickets/{ticket_id}**.
  - Fermer un ticket → **POST /v1/reception/tickets/{ticket_id}/close**.
- **Notes** : —

### 6.4 Détail ticket + lignes de dépôt

- **Route(s)** : Détail ticket (sous-vue ou page dédiée, ex. `/admin/reception-tickets/:id` en admin ; en réception peut être un panneau ou une vue modale).
- **Permissions** : `reception.access` (terrain) ou admin pour rapports.
- **Données affichées** : ticket (id, dates, bénévole, statut) ; lignes de dépôt (catégorie, poids_kg, destination, is_exit, notes).
- **Appels API au chargement** :
  - **GET /v1/reception/tickets/{ticket_id}** — détail ticket + lignes (ou **GET /v1/reception/lignes** avec filtre ticket_id).
- **Actions utilisateur → appels API** :
  - Ajouter une ligne → **POST /v1/reception/lignes** — body : `{ ticket_id, category_id?, poids_kg, destination, notes?, is_exit? }`.
  - Modifier une ligne → **PUT /v1/reception/lignes/{ligne_id}** — body : champs modifiables.
  - Supprimer une ligne → **DELETE /v1/reception/lignes/{ligne_id}**.
  - Modifier le poids d'une ligne → **PATCH /v1/reception/tickets/{ticket_id}/lignes/{ligne_id}/weight** — body : `{ weight }` (poids_kg).
  - Fermer le ticket → **POST /v1/reception/tickets/{ticket_id}/close**.
- **Notes** : destination = enum obligatoire côté BDD ; catégorie nullable. Optionnel : copie vers Paheko module_data_saisie_poids côté backend.

### 6.5 Export CSV / Stats live réception

- **Route(s)** : Depuis détail ticket ou page réception / admin.
- **Permissions** : `reception.access` ou admin.
- **Données affichées** : KPI live (déjà chargés sur accueil) ; boutons Export CSV (un ticket, ou lignes période).
- **Appels API au chargement** :
  - **GET /v1/reception/stats/live** ou **GET /v1/stats/live** — stats.
- **Actions utilisateur → appels API** :
  - Export CSV d'un ticket → **POST /v1/reception/tickets/{ticket_id}/download-token** (si token requis), puis **GET /v1/reception/tickets/{ticket_id}/export-csv** (avec token en query si besoin).
  - Export CSV des lignes (période) → **GET /v1/reception/lignes/export-csv** — query : période (date_from, date_to, etc.).
  - Export bulk tickets (admin) → **POST /v1/admin/reports/reception-tickets/export-bulk** — body : filtres.
- **Notes** : B50-P2, B50-P3 (export bulk corrigés).

---

## 7. Admin

### 7.1 Dashboard admin

- **Route(s)** : `/admin`
- **Permissions** : admin / super-admin.
- **Données affichées** : statistiques agrégées (dashboard), liens vers sous-sections (utilisateurs, sites, caisses, rapports, réception, santé, paramètres, etc.).
- **Appels API au chargement** :
  - **GET /v1/admin/dashboard/stats** — statistiques du tableau de bord.
- **Actions utilisateur → appels API** : navigation (pas d'action API directe sur cet écran).
- **Notes** : —

### 7.2 Utilisateurs (liste)

- **Route(s)** : `/admin/users`
- **Permissions** : admin.
- **Données affichées** : liste des utilisateurs (table) avec filtres rôle/statut, pagination.
- **Appels API au chargement** :
  - **GET /v1/admin/users** — query : rôle, statut, pagination.
  - **GET /v1/admin/users/statuses** — statuts en ligne / hors ligne (optionnel, pour indicateurs).
- **Actions utilisateur → appels API** :
  - Créer utilisateur (bouton Nouveau) → **POST /v1/users** — body : champs utilisateur (admin).
  - Clic sur une ligne → navigation vers Détail utilisateur.
  - Changer filtre / page → rechargement GET /v1/admin/users avec nouveaux paramètres.
- **Notes** : —

### 7.3 Utilisateurs (détail, pending)

- **Route(s)** : `/admin/users/:id` ; liste « en attente » possible via onglet ou **GET /v1/admin/users/pending**.
- **Permissions** : admin.
- **Données affichées** : profil utilisateur, rôle, statut, groupes, historique ; pour pending : liste des inscriptions en attente.
- **Appels API au chargement** :
  - **GET /v1/admin/users/{user_id}** (détail) ou **GET /v1/admin/users/pending** (liste pending).
  - **GET /v1/admin/users/{user_id}/history** — historique des actions.
  - **GET /v1/admin/groups** — pour affectation groupes (liste des groupes).
- **Actions utilisateur → appels API** :
  - Modifier rôle → **PUT /v1/admin/users/{user_id}/role** — body : `{ role }`.
  - Modifier statut → **PUT /v1/admin/users/{user_id}/status** — body : `{ status }`.
  - Mise à jour profil → **PUT /v1/admin/users/{user_id}**.
  - Affecter groupes → **PUT /v1/admin/users/{user_id}/groups** — body : `{ group_ids }`.
  - Approuver → **POST /v1/admin/users/{user_id}/approve**.
  - Rejeter → **POST /v1/admin/users/{user_id}/reject**.
  - Reset password → **POST /v1/admin/users/{user_id}/reset-password** (envoi lien) ou **POST /v1/admin/users/{user_id}/force-password** (forcer nouveau MDP).
  - Reset PIN → **POST /v1/admin/users/{user_id}/reset-pin**.
- **Notes** : —

### 7.4 Sites (liste, formulaire)

- **Route(s)** : `/admin/sites`, `/admin/sites-and-registers`
- **Permissions** : admin.
- **Données affichées** : liste des sites (nom, etc.) ; formulaire création/édition (nom, adresse, etc.).
- **Appels API au chargement** :
  - **GET /v1/sites** — liste des sites.
- **Actions utilisateur → appels API** :
  - Créer site → **POST /v1/sites** — body : champs site.
  - Modifier site → **PATCH /v1/sites/{site_id}** — body : champs modifiables.
  - Supprimer site → **DELETE /v1/sites/{site_id}**.
- **Notes** : —

### 7.5 Postes de caisse (liste, formulaire)

- **Route(s)** : `/admin/cash-registers`
- **Permissions** : admin.
- **Données affichées** : liste des postes (nom, site, location, actif, enable_virtual, enable_deferred) ; formulaire création/édition.
- **Appels API au chargement** :
  - **GET /v1/cash-registers** — liste.
  - **GET /v1/sites** — pour associer un poste à un site.
- **Actions utilisateur → appels API** :
  - Créer poste → **POST /v1/cash-registers** — body : name, site_id, location, is_active, enable_virtual, enable_deferred, etc.
  - Modifier poste → **PATCH /v1/cash-registers/{register_id}**.
  - Supprimer poste → **DELETE /v1/cash-registers/{register_id}**.
- **Notes** : —

### 7.6 Gestionnaire de sessions caisse

- **Route(s)** : `/admin/session-manager`
- **Permissions** : admin.
- **Données affichées** : liste des sessions (filtres : période, site, poste, opérateur, statut) ; pagination.
- **Appels API au chargement** :
  - **GET /v1/cash-sessions** — query : filtres, pagination.
- **Actions utilisateur → appels API** :
  - Clic sur une session → navigation vers Détail session (5.5).
  - Correctifs (Super Admin) : **POST /v1/admin/cash-sessions/fix-blocked-deferred**, **POST /v1/admin/cash-sessions/merge-duplicate-deferred** (sans body ou avec paramètres selon API).
- **Notes** : —

### 7.7 Rapports caisse

- **Route(s)** : `/admin/reports`, `/admin/reports/cash-sessions`
- **Permissions** : admin.
- **Données affichées** : liste des rapports disponibles (par session) ; boutons export par session, export bulk.
- **Appels API au chargement** :
  - **GET /v1/admin/reports/cash-sessions** — lister les rapports.
- **Actions utilisateur → appels API** :
  - Télécharger rapport par session → **GET /v1/admin/reports/cash-sessions/by-session/{session_id}** ou **GET /v1/admin/reports/cash-sessions/{filename}**.
  - Export bulk → **POST /v1/admin/reports/cash-sessions/export-bulk** — body : filtres (période, etc.).
- **Notes** : —

### 7.8 Réception admin (stats, rapports, sessions, tickets)

- **Route(s)** : `/admin/reception-stats`, `/admin/reception-reports`, `/admin/reception-sessions`, `/admin/reception-tickets/:id`
- **Permissions** : admin.
- **Données affichées** : dashboard réception (stats), liste des sessions/tickets, détail d'un ticket (lignes) ; exports.
- **Appels API au chargement** :
  - **GET /v1/stats/reception/summary**, **GET /v1/stats/reception/by-category** — stats.
  - **GET /v1/reception/tickets** (filtres admin) pour liste tickets/sessions.
  - **GET /v1/reception/tickets/{id}** pour détail ticket.
- **Actions utilisateur → appels API** :
  - Export bulk tickets réception → **POST /v1/admin/reports/reception-tickets/export-bulk** — body : filtres.
- **Notes** : B50-P2, B50-P3.

### 7.9 Santé, audit log, logs email, paramètres

- **Route(s)** : `/admin/health`, `/admin/audit-log`, `/admin/email-logs`, `/admin/settings`
- **Permissions** : admin (santé/paramètres parfois super-admin).
- **Données affichées** : métriques santé (système, DB, scheduler, anomalies) ; journal d'audit ; logs email ; paramètres (alertes, session, email, seuil d'activité).
- **Appels API au chargement** :
  - Santé : **GET /v1/admin/health**, **GET /v1/admin/health/database**, **GET /v1/admin/health/scheduler**, **GET /v1/admin/health/anomalies**.
  - Audit : **GET /v1/admin/audit-log** — query : pagination, filtres.
  - Logs email : **GET /v1/admin/email-logs**.
  - Paramètres : **GET /v1/admin/settings/alert-thresholds**, **GET /v1/admin/settings/session**, **GET /v1/admin/settings/email**, **GET /v1/admin/settings/activity-threshold**.
- **Actions utilisateur → appels API** :
  - Modifier seuil d'activité → **PUT /v1/admin/settings/activity-threshold** — body : valeur.
  - Modifier alertes → **PUT /v1/admin/settings/alert-thresholds**.
  - Modifier session → **PUT /v1/admin/settings/session**.
  - Modifier email → **PUT /v1/admin/settings/email** ; test → **POST /v1/admin/settings/email/test**.
  - Test notifications → **POST /v1/admin/health/test-notifications**.
- **Notes** : —

### 7.10 BDD (export, purge, import) et Import legacy

- **Route(s)** : sous-routes admin pour BDD et `/admin/import/legacy`
- **Permissions** : super-admin (BDD) ; admin (import legacy).
- **Données affichées** : boutons Export BDD, Purge transactions, Import BDD ; interface import legacy (upload CSV, analyse, validation, modèles LLM).
- **Appels API au chargement** :
  - Import legacy : **GET /v1/admin/import/legacy/llm-models** — liste des modèles LLM.
- **Actions utilisateur → appels API** :
  - Export BDD → **POST /v1/admin/db/export**.
  - Purge transactions → **POST /v1/admin/db/purge-transactions**.
  - Import BDD → **POST /v1/admin/db/import** — body : fichier ou référence sauvegarde.
  - Import legacy : **POST /v1/admin/import/legacy/analyze** (fichier), **POST /v1/admin/import/legacy/execute**, **POST /v1/admin/import/legacy/validate**, **POST /v1/admin/import/legacy/preview**, etc.
- **Notes** : B46, B47 ; scope import legacy à confirmer en v1.

### 7.11 Groupes et Permissions

- **Route(s)** : `/admin/groups`, `/admin/permissions` (ou onglets dans une page Admin).
- **Permissions** : admin.
- **Données affichées** : liste des groupes (avec permissions et utilisateurs) ; liste des permissions ; formulaires CRUD groupe, CRUD permission, liaison groupe–permissions, groupe–utilisateurs.
- **Appels API au chargement** :
  - **GET /v1/admin/groups** — liste groupes.
  - **GET /v1/admin/groups/{group_id}** — détail (permissions, utilisateurs).
  - **GET /v1/admin/permissions** — liste permissions.
- **Actions utilisateur → appels API** :
  - CRUD groupe : **POST /v1/admin/groups**, **PUT /v1/admin/groups/{group_id}**, **DELETE /v1/admin/groups/{group_id}**.
  - Ajouter/retirer permission à un groupe : **POST /v1/admin/groups/{group_id}/permissions** (body : permission_id), **DELETE /v1/admin/groups/{group_id}/permissions/{permission_id}**.
  - Ajouter/retirer utilisateur : **POST /v1/admin/groups/{group_id}/users** (body : user_id), **DELETE /v1/admin/groups/{group_id}/users/{user_id}**.
  - CRUD permission : **POST /v1/admin/permissions**, **PUT /v1/admin/permissions/{permission_id}**, **DELETE /v1/admin/permissions/{permission_id}**.
- **Notes** : —

### 7.12 Analyse rapide

- **Route(s)** : `/admin/quick-analysis`
- **Permissions** : admin.
- **Données affichées** : comparaison de périodes (stats, indicateurs) — contenu selon implémentation (agrégations ventes, réception).
- **Appels API au chargement** : selon implémentation (ex. **GET /v1/cash-sessions/stats/summary** avec plages, **GET /v1/stats/reception/summary**, etc.).
- **Actions utilisateur → appels API** : sélection des périodes → rechargement des stats avec nouveaux paramètres.
- **Notes** : B50-P8.

---

## 8. Catégories

### 8.1 Page catégories (admin)

- **Route(s)** : `/admin/categories` (ou équivalent selon 1.4.4).
- **Permissions** : admin.
- **Données affichées** : arborescence des catégories (hiérarchie) ; liste plate avec ordre, visibilité caisse/réception ; nom, official_name ; boutons CRUD, visibilité, ordre d'affichage (sale, entry), import/export.
- **Appels API au chargement** :
  - **GET /v1/categories** ou **GET /v1/categories/hierarchy** — liste / arborescence.
- **Actions utilisateur → appels API** :
  - Créer catégorie → **POST /v1/categories** — body : champs catégorie (name, parent_id?, official_name?, etc.).
  - Modifier catégorie → **PUT /v1/categories/{category_id}**.
  - Supprimer (soft) → **DELETE /v1/categories/{category_id}** ; restaurer → **POST /v1/categories/{category_id}/restore** ; hard delete → **DELETE /v1/categories/{category_id}/hard**.
  - Vérifier usage → **GET /v1/categories/{category_id}/has-usage**.
  - Visibilité → **PUT /v1/categories/{category_id}/visibility** — body : visibilité caisse/réception.
  - Ordre affichage vente → **PUT /v1/categories/{category_id}/display-order** ; réception → **PUT /v1/categories/{category_id}/display-order-entry**.
  - Export → **GET /v1/categories/actions/export**.
  - Import : **GET /v1/categories/import/template** ; **POST /v1/categories/import/analyze** (fichier) ; **POST /v1/categories/import/execute**.
- **Notes** : B48-P4 (refonte UX), B48-P5 (double dénomination), B48-P1 (soft delete). Référentiel EEE/décla dans RecyClique ; au push caisse, plugin Paheko crée ou matche les catégories à la volée.

---

## 9. Références

- [Fonctionnalités actuelles](../ancien-repo/fonctionnalites-actuelles.md)
- [Audit caisse RecyClique 1.4.4](../migration-paeco/audits/audit-caisse-recyclic-1.4.4.md)
- [Audit réception et poids RecyClique 1.4.4](../migration-paeco/audits/audit-reception-poids-recyclic-1.4.4.md)
- [Liste endpoints API v1.4.4](../ancien-repo/v1.4.4-liste-endpoints-api.md)
- [Périmètre API RecyClique v1](2026-02-26_09_perimetre-api-recyclique-v1.md)
- [Catalogue Qui stocke quoi](2026-02-26_08_catalogue-qui-stocke-quoi-recyclic-paheko.md)

---

*Document produit pour débloquer la vision architecturale et permettre un refactor en connaissance de cause. À mettre à jour si les routes ou les contrats API changent (v0.1.0).*
