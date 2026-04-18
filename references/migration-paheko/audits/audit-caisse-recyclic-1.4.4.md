# Audit caisse RecyClique 1.4.4

Audit de la caisse (ventes, sessions, presets, paiements) pour préparer les correspondances avec le plugin Caisse Paheko. Version RecyClique **1.4.4**.

- **Date** : 2026-02-25  
- **Sources** : `references/ancien-repo/fonctionnalites-actuelles.md` (section Caisse), `references/ancien-repo/v1.4.4-liste-endpoints-api.md`, `references/dumps/schema-recyclic-dev.md`  
- **Guides utilisateur** : `docs/guides/interface-caisse-manual.md`, `docs/guides/guide-utilisateur-session-banniere.md`, `docs/guides/correction-date-session-caisse-differee.md` (ancien repo)

---

## 1. Mode d'emploi synthétique

### 1.1 Types de caisse

- **Caisse réelle** : sessions réelles, impact sur les données et les stats. Permission `caisse.access`. Routes : `/caisse`, `/cash-register/session/open` (etc.).
- **Caisse virtuelle** : formation, pas d'impact sur les données réelles. Permission `caisse.virtual.access`. Routes : `/cash-register/virtual`. Le poste peut avoir `enable_virtual` activé.
- **Caisse différée** : saisie a posteriori (cahiers papier) avec date réelle d'ouverture. Permission `caisse.deferred.access`. Routes : `/cash-register/deferred`. Ouverture avec `opened_at` ; vérification d'existence pour une date via `GET /v1/cash-sessions/deferred/check`.

### 1.2 Workflow session (entry → sale → exit)

1. **Ouverture** : l'opérateur choisit le type (réel / virtuel / différé), le poste de caisse, saisit le fond de caisse (`initial_amount`). En différé, il indique la date réelle `opened_at`.  
   → `POST /v1/cash-sessions` (body : fond de caisse, optionnellement `opened_at`, type implicite selon route ou permissions).

2. **Saisie des ventes (sale)** : étape « sale » du workflow. Création de tickets via `POST /v1/sales` : lignes (catégorie, quantité, prix, preset éventuel), option « item sans prix » (prix global), presets Don 0 €, Don -18, Recyclage, Déchèterie. Paiements multiples : tableau `payments[]` (méthode + montant). Note sur le ticket (`note`). Date réelle du ticket : `sale_date` (surtout pour sessions différées).

3. **Fermeture (exit)** : l'opérateur saisit les montants de clôture (`closing_amount`, `actual_amount`), éventuellement un commentaire d'écart (`variance_comment`).  
   → `POST /v1/cash-sessions/{id}/close`. Les rapports (export, email) peuvent être déclenchés à la clôture.

### 1.3 Options et variantes

- **Presets (boutons rapides)** : liste des presets actifs pour la caisse (`GET /v1/presets/active`). Chaque preset lie une catégorie, un prix prédéfini et un type de bouton (Don, Recyclage, Déchèterie, etc.). Les lignes de vente peuvent référencer `preset_id`.
- **Paiements multiples** : une vente peut avoir plusieurs lignes dans `payment_transactions` (espèces, chèque, etc.), créées via le body `payments[]` de `POST /v1/sales`. Mode chèque : montant chèque sans rendu de monnaie (B39-P6).
- **Poids** : par ligne (`sale_items.weight`), éditable en admin après coup (`PATCH /v1/sales/{sale_id}/items/{item_id}/weight`). Poids total session / panier exposés dans le détail session (réponse API, champs type `total_weight_out` / `total_weight`).
- **Éditeur item (admin)** : modification destination (preset) et prix par ligne ; traçabilité audit (`PATCH /v1/sales/{sale_id}/items/{item_id}`).
- **Session en cours** : un seul opérateur par poste ; récupération via `GET /v1/cash-sessions/current`. Statut par poste : `GET /v1/cash-sessions/status/{register_id}`.

---

## 2. Tableau de traçabilité : étape/option → API et BDD

| Étape / Option | Description | API (méthode + chemin) | Tables BDD (table, colonnes clés) | Remarque / code |
|----------------|-------------|------------------------|-----------------------------------|------------------|
| **Ouverture de session** | Création session (réelle, virtuelle ou différée), fond de caisse, option `opened_at` pour différée | `POST /v1/cash-sessions` | `cash_sessions` : id, operator_id, site_id, register_id, initial_amount, current_amount, status, opened_at, closed_at, current_step | Type de session selon route front ou body ; register avec enable_virtual / enable_deferred |
| **Mise à jour session** | Mise à jour d'une session ouverte (ex. champs métier) | `PUT /v1/cash-sessions/{session_id}` | `cash_sessions` | Complément à l'ouverture / au step |
| **Session en cours** | Récupérer la session ouverte pour l'opérateur connecté | `GET /v1/cash-sessions/current` | `cash_sessions` (filtre status ouvert, operator_id) | Une session ouverte par opérateur/poste |
| **Statut par poste** | Savoir si un poste a une session ouverte (occupé / libre) | `GET /v1/cash-sessions/status/{register_id}` | `cash_sessions` (register_id, status) | Utilisé pour le dashboard caisses |
| **Workflow step (lecture)** | Étape courante du workflow (entry / sale / exit) | `GET /v1/cash-sessions/{id}/step` | `cash_sessions.current_step` | — |
| **Workflow step (écriture)** | Changer l'étape du workflow | `PUT /v1/cash-sessions/{id}/step` | `cash_sessions.current_step`, step_start_time | — |
| **Saisie différée – vérification** | Vérifier si une session différée existe déjà pour une date | `GET /v1/cash-sessions/deferred/check` | `cash_sessions` (opened_at, type différé) | Éviter doublons ; correctifs admin : fix-blocked-deferred, merge-duplicate-deferred |
| **Création vente (ticket)** | Créer un ticket : lignes (catégorie, quantité, prix, preset), payments[], note, sale_date | `POST /v1/sales` | `sales` : id, cash_session_id, total_amount, operator_id, donation, payment_method, note, sale_date ; `sale_items` : sale_id, category, quantity, unit_price, total_price, weight, preset_id ; `payment_transactions` : sale_id, payment_method, amount | payment_method sur sales = legacy / résumé ; détail dans payment_transactions |
| **Date réelle du ticket (sale_date)** | Date réelle du ticket (cahier) vs date d'enregistrement ; pour sessions différées | Champ `sale_date` dans `POST /v1/sales`, réponses et exports | `sales.sale_date` | B52-P3 ; affichage admin |
| **Liste des ventes** | Liste des ventes (pagination, filtres) | `GET /v1/sales` | `sales` (+ jointures selon réponse) | Admin, rapports |
| **Détail vente** | Détail d'une vente (lignes, paiements) ; utilisé pour éditeur item / poids | `GET /v1/sales/{sale_id}` | `sales`, `sale_items`, `payment_transactions` | — |
| **Mise à jour vente (note)** | Modifier la note d'un ticket | `PUT /v1/sales/{sale_id}` | `sales.note` | B40-P4 |
| **Paiements multiples** | Plusieurs moyens de paiement par encaissement (espèces + chèques, etc.) | Body `payments[]` dans `POST /v1/sales` | `payment_transactions` : sale_id, payment_method, amount | B52-P1 ; affichage dans détail session |
| **Presets (liste / actifs)** | Liste des boutons prédéfinis ; presets actifs pour la caisse | `GET /v1/presets`, `GET /v1/presets/active` | `preset_buttons` : id, name, category_id, preset_price, button_type, sort_order, is_active | Catégories liées : categories |
| **Preset détail** | Détail d'un preset | `GET /v1/presets/{preset_id}` | `preset_buttons` | — |
| **Presets Recyclage / Déchèterie** | Logique dédiée pour ces types de presets | Utilisation des presets dans `POST /v1/sales` (preset_id sur les lignes) | `preset_buttons.button_type`, `sale_items.preset_id` | B49-P6 |
| **Mode « item sans prix » (prix global)** | Ticket sans détail de prix par ligne | `POST /v1/sales` (lignes avec prix global ou équivalent) | `sale_items` (unit_price, total_price) | B49-P2 |
| **Édition poids (admin)** | Modifier le poids d'une ligne après validation ; recalcul stats, audit | `PATCH /v1/sales/{sale_id}/items/{item_id}/weight` | `sale_items.weight` | B52-P2 ; admin/super-admin |
| **Éditeur item (destination et prix)** | Modifier preset/destination et prix par item ; traçabilité audit | `PATCH /v1/sales/{sale_id}/items/{item_id}` (preset_id, unit_price) | `sale_items.preset_id`, unit_price, total_price | B52-P4 ; prix réservé admin |
| **Poids par session / panier** | Poids total sorti sur la session, poids total par ticket | Détail session (réponse API) | `cash_sessions` (agrégat ou vue), `sale_items.weight` | B52-P6 ; champs type total_weight_out, total_weight dans réponses |
| **Fermeture de session** | Clôture avec montants de clôture, écart, variance | `POST /v1/cash-sessions/{id}/close` | `cash_sessions` : closed_at, closing_amount, actual_amount, variance, variance_comment, total_sales, total_items | — |
| **Détail session** | Consultation d'une session et de ses ventes | `GET /v1/cash-sessions/{id}` | `cash_sessions` + jointures sales, sale_items, payment_transactions | Utilisé admin et rapports |
| **Liste sessions** | Liste des sessions (filtres, pagination) | `GET /v1/cash-sessions` | `cash_sessions` | Admin, gestionnaire de sessions |
| **Synthèse stats sessions** | Statistiques des sessions sur une période | `GET /v1/cash-sessions/stats/summary` | `cash_sessions` (agrégations) | — |
| **Postes de caisse (liste)** | Liste des postes par site | `GET /v1/cash-registers` | `cash_registers` : id, name, location, site_id, is_active, workflow_options, enable_virtual, enable_deferred | — |
| **Détail poste** | Détail d'un poste de caisse | `GET /v1/cash-registers/{register_id}` | `cash_registers` | — |
| **Statut global postes** | Occupé / libre pour tous les postes | `GET /v1/cash-registers/status` | `cash_registers` + `cash_sessions` (session ouverte) | — |
| **CRUD postes** | Création, modification, suppression de postes (admin) | `POST /v1/cash-registers`, `PATCH /v1/cash-registers/{register_id}`, `DELETE /v1/cash-registers/{register_id}` | `cash_registers` | — |
| **Catégories caisse** | Catégories utilisables pour les tickets de vente | `GET /v1/categories/sale-tickets` | `categories` : is_visible, display_order, deleted_at ; visibilité caisse | — |

---

## 3. Références rapides

- **Permissions caisse** : `caisse.access`, `caisse.virtual.access`, `caisse.deferred.access`.
- **Connexion caisse (tablette)** : `POST /v1/auth/pin` (connexion par PIN).
- **Stories / épics** : B39-P6 (mode chèque), B40-P4 (notes), B44 (saisie différée), B49 (presets, item sans prix), B52-P1 (paiements multiples), B52-P2 (édition poids), B52-P3 (sale_date), B52-P4 (éditeur item), B52-P6 (poids session/panier).
- **Correctifs admin** : `POST /v1/admin/cash-sessions/fix-blocked-deferred`, `POST /v1/admin/cash-sessions/merge-duplicate-deferred`.
- **Rapports** : `GET /v1/admin/reports/cash-sessions`, export par session, `POST /v1/admin/reports/cash-sessions/export-bulk`.

---

*Document produit pour la migration Paheko. Correspondances avec plugin_caisse_* et écritures comptables à documenter dans un prochain livrable.*
