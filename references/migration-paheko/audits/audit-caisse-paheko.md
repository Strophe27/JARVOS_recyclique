# Audit extension Caisse Paheko

**Date :** 2026-02-25  
**Objectif :** Mode d'emploi synthétique + traçabilité workflow/options → UI, tables BDD, références plugin (fichiers/routes) pour le module RecyClique → Paheko.  
**Sources :** Doc officielle [paheko.cloud](https://paheko.cloud/extension-caisse), schéma BDD `references/dumps/schema-paheko-dev.md`, code plugin Caisse (dev-tampon).

Aucun extrait de code ; uniquement noms de tables, fichiers et concepts.

---

## 1. Mode d'emploi synthétique

### 1.1 Activation et accès

- **Activation :** Configuration → Extensions → onglet Inactives → activer l'extension Caisse.
- **Droits :** Accès réservé aux membres ayant **lecture/écriture** sur la section « Gestion des membres » et **droits d'administration de la comptabilité** (restrict_section=users, restrict_level=write, détail : administrateur compta).
- **Doc :** [Extension Caisse — accueil](https://paheko.cloud/extension-caisse).

### 1.2 Gestion et configuration

- **Catégories :** Caisse → Gestion et statistiques → Catégories. Créer des catégories avec **nom** et **numéro de compte de recette** (ex. 756 cotisations, 707 ventes marchandises, 706 prestations, 701 ventes produits finis). [Doc produits et catégories](https://paheko.cloud/caisse-configuration-produits-categories).
- **Produits :** Gestion et statistiques → Produits. Nom, prix, catégorie, option « produit au poids », lien activité (tarif adhésion), code barre, stock, produits liés.
- **Moyens de paiement :** Gestion et statistiques → Moyens de paiement. Nom, compte compta, min/max (plafond), référence obligatoire ou non, « accepter pour tous les produits » ou liaison produit par produit. Types : Suivi (0), Informel / espèces (1), Ardoise (2), Porte-monnaie (3). [Doc configuration paiement](https://paheko.cloud/caisse-configuration-paiement).
- **Emplacements (optionnel) :** Gestion et statistiques → Emplacements pour multi-points de vente.
- **Configuration globale :** Caisse → Configuration. Exercice pour écritures auto à la clôture, clôture automatique des notes (soldées), envoi d'email à la clôture, etc. [Doc clôture automatique des notes](https://paheko.cloud/configurer-cloture-automatique-notes).

### 1.3 Ouvrir la caisse

- Menu **Caisse** → **Ouvrir la caisse**.
- Saisir le **solde d'ouverture** (espèces) par moyen de paiement concerné (et éventuellement l'emplacement).
- Cliquer sur **Ouvrir la caisse**. Redirection vers l'écran de session (notes).
- La caisse fonctionne par **sessions** (événement / journée), pas par exercice comptable.
- **Doc :** [Ouvrir la caisse](https://paheko.cloud/ouverture-caisse).

### 1.4 Encaisser une vente

1. **+ Nouvelle note** → ouverture d'un ticket (note) dans la session.
2. **Ajouter des produits** : clic sur un produit (liste par catégories ou recherche nom / code barre) ; modifier qté et montant si besoin.
3. **Enregistrer un paiement** : choisir moyen de paiement, montant (pré-rempli au reste à payer), référence optionnelle (chèque, etc.) → Enregistrer.
4. **Multi-moyens :** enregistrer plusieurs paiements en plusieurs fois (montant < reste à payer pour les premiers).
5. **Associer un membre** : bouton « Renommer », recherche membre → reçu nominatif et lien pour cotisation/ardoise/porte-monnaie.
6. Quand reste à payer = 0 €, la note est **clôturée** automatiquement (sauf si config « clôture manuelle »).
7. **Ré-ouvrir une note** : possible tant que la session est ouverte (bouton Ré-ouvrir la note).
8. **Résumé** : liste des règlements, totaux par moyen, recettes par catégorie, membres non inscrits ayant réglé.
9. **Reçu PDF** : bouton imprimante sur la note.

**Doc :** [Encaisser une vente](https://paheko.cloud/caisse-encaissement-vente).

### 1.5 Ardoises (ventes non réglées)

- Choisir le moyen de paiement **Ardoise** pour enregistrer un reste à régler. La note doit être **associée à un membre** (Renommer).
- L'ardoise s'affiche sur les prochaines notes du même membre jusqu'à remboursement.
- **Ardoises** (bouton menu ou session) → onglet « Ardoises en cours » → liste des dettes, bouton **Rembourser** pour encaisser dans la session en cours.
- **Historique** : onglet « Historique des ardoises et remboursements » pour retrouver les notes.
- Les ardoises **ne génèrent pas d'écritures comptables** (hors caisse).
- **Doc :** [Les ardoises pour les ventes non réglées](https://paheko.cloud/ardoises-pour-ventes-non-reglees).

### 1.6 Porte-monnaie (crédit membre)

- Moyen de paiement de type **Porte-monnaie** : compte individuel par membre, créditable avec un autre moyen (espèces, CB…), puis paiement avec ce crédit.
- **Créditer** : sur une note liée à un membre, bouton « Créditer le porte-monnaie » (ou entrée dédiée) → montant + moyen de crédit.
- **Payer avec le porte-monnaie** : choisir le moyen « Porte-monnaie » au paiement ; le montant ne peut pas dépasser le solde créditeur du membre.
- Liste : **Porte-monnaie** (menu/session) → soldes par membre ; historique par membre.
- Référence plugin : `tab_add_credit.php`, `balances.php?type=3`, `balances_history.php?type=3`, entité `Tab::addUserCredit`, `Tab::getUserCredit`, `Method::TYPE_CREDIT`.

### 1.7 Clôturer la caisse

- **Prérequis :** toutes les notes doivent être clôturées (sinon message d'erreur).
- Depuis la session en cours : **Clôturer la caisse** ; ou depuis le menu Caisse : liste des sessions → clôturer la session choisie.
- **Étapes :**
  1. Vérifier les **paiements hors espèces** (cocher les cases quand justificatifs vérifiés).
  2. **Solde à la clôture** : renseigner le solde réel (espèces, etc.) ; le solde théorique est calculé automatiquement.
  3. En cas d'**écart** : recompter ; si l'écart persiste, cocher « Je confirme avoir re-compté… » pour valider la clôture (une écriture d'erreur de caisse peut être générée).
  4. **Confirmer et clôturer**.
- Après clôture : résumé session (ouverture, fermeture, détail) ; possibilité de **générer un PDF**.
- Si config « exercice pour écritures » : **sync comptable** automatique à la clôture (POS::syncAccounting).
- **Doc :** [Clôturer la caisse](https://paheko.cloud/caisse-cloture).

### 1.8 Synchronisation avec la comptabilité

- **Manuelle :** Gestion et statistiques → **Comptabilité** → choisir l'exercice → Synchroniser. Ou depuis une fiche session clôturée : bouton « Créer l'écriture ».
- **Automatique :** Configuration caisse → « Exercice où créer les écritures comptables » → à chaque clôture une écriture est créée pour la session (si date dans l'exercice).
- **Concept :** `POS::syncAccounting` (id_creator, year, optionnel only_session_id) ; écritures consolidées (pas une écriture par note). Comptes obligatoires : catégories et moyens de paiement doivent avoir un compte associé.
- Référence : `admin/manage/sync.php`, `admin/session.php` (sync), `lib/POS.php` (syncAccounting), `lib/Entities/Session.php` (syncWithYearId).

### 1.9 Code barre

- **Prérequis :** renseigner le **code barre** du produit (Gestion et statistiques → Produits → Modifier → champ Code barre). EAN 13, ISBN, etc.
- **Douchette USB/Bluetooth :** se placer sur la note, scanner → le produit est ajouté (saisie comme clavier).
- **Smartphone Android :** bouton scan à côté du champ recherche → caméra → scan → ajout produit. Navigateurs Chromium supportés (BarcodeDetector API).
- **Doc :** [Encaisser une vente avec un code barre](https://paheko.cloud/encaisser-une-vente-avec-code-barre).
- Référence : champ `plugin_pos_products.code`, `tab.php?code=XXX`, `Tab::addItemByCode`, `admin/product_search.js` (bouton scan).

### 1.10 Autres fonctions

- **Gestion du stock :** produits avec stock → mouvements sur vente et sur événements (réception, etc.). Tables `plugin_pos_products_stock_history`, `plugin_pos_stock_events`. Écrans : Gestion et statistiques → Stock (historique, événements, détails).
- **Poids / saisie au poids :** produits avec option « saisir un poids » et option « prix au kg ». Colonne `plugin_pos_tabs_items.weight` ; lien possible avec le module Saisie au poids (`module_data_saisie_poids`). Historique poids par catégorie : `plugin_pos_categories_weight_history`.
- **Produits liés :** un produit peut avoir des produits liés ajoutés automatiquement au panier. Table `plugin_pos_products_links`.
- **Lien activité (cotisation) :** produit lié à un tarif (`services_fees`) → à la clôture de la note le membre peut être inscrit à l'activité. Champs `plugin_pos_products.id_fee`, `plugin_pos_tabs_items.id_fee`, `id_subscription`.
- **Statistiques :** Gestion et statistiques → Statistiques (ou onglet dédié) : ventes par période, produits les plus vendus, moyens de paiement, etc. Référence : `admin/manage/stats.php`.

---

## 2. Tableaux de traçabilité

### 2.1 Workflows principaux

| Étape / Option | Description courte | UI / écran | Tables BDD (clés) | Référence plugin |
|----------------|---------------------|------------|-------------------|------------------|
| Ouvrir la caisse | Saisie solde d'ouverture, choix emplacement | `session_open.php` → `session_open.tpl` | `plugin_pos_sessions` (id, id_location, opened, open_user, closed=NULL), `plugin_pos_sessions_balances` (id_session, id_method, open_amount) | `admin/session_open.php`, `Sessions::open`, `Sessions::listOpeningBalances` |
| Nouvelle note | Création d'un ticket dans la session | `tab.php?new` → `tab.tpl` | `plugin_pos_tabs` (id, session, name, user_id, opened, closed=NULL) | `admin/tab.php`, `Tabs::openTab` |
| Ajouter un produit | Sélection produit → ligne sur la note | `tab.tpl` (liste catégories + recherche) | `plugin_pos_tabs_items` (tab, product, qty, price, total, weight, name, category_name, account, type, id_method), stock si activé : `plugin_pos_products_stock_history` | `admin/tab.php` (add_item), `Tab::addItem`, `Products::listBuyableByCategory` |
| Enregistrer un paiement | Moyen + montant + référence | Formulaire paiement sur `tab.tpl` | `plugin_pos_tabs_payments` (tab, method, date, amount, reference, account, type) | `Tab::pay`, `Tab::listPaymentOptions` |
| Multi-moyens de paiement | Plusieurs paiements pour une même note | Même écran, montant < reste à payer | `plugin_pos_tabs_payments` (plusieurs lignes par tab) | `Tab::getRemainder`, `Tab::pay` |
| Associer un membre | Renommer note + recherche membre | Bouton Renommer, `user_search` | `plugin_pos_tabs.user_id` → users(id) | `Tab::rename`, `admin/user_search.php` |
| Clôturer une note | Reste à payer = 0 ou clôture manuelle | Bouton Clôturer / Ré-ouvrir | `plugin_pos_tabs.closed` | `Tab::close`, `Tab::reopen`, config `auto_close_tabs` |
| Clôturer la caisse | Vérif. paiements, solde fermeture, confirmation | `session_close.php` → `session_close.tpl` | `plugin_pos_sessions` (closed, close_user, result, nb_tabs), `plugin_pos_sessions_balances` (close_amount, error_amount) | `admin/session_close.php`, entité Session (plugin)->close, optionnel syncWithYearId |
| Sync comptabilité | Création écritures depuis sessions clôturées | `manage/sync.php` ou bouton sur fiche session | `acc_transactions`, `acc_transactions_lines`, `acc_accounts` ; lecture plugin_pos_* | `POS::syncAccounting`, entité Session->syncWithYearId, `admin/manage/sync.php` |

### 2.2 Options et fonctionnalités

| Étape / Option | Description courte | UI / écran | Tables BDD (clés) | Référence plugin |
|----------------|---------------------|------------|-------------------|------------------|
| Catégories | Types de produits + compte recette | Gestion et statistiques → Catégories, `manage/categories/` | `plugin_pos_categories` (id, name, account) | `admin/manage/categories/`, `lib/Categories.php` |
| Produits | Fiche produit, prix, catégorie, poids, code barre, stock, lien activité | Gestion et statistiques → Produits, `manage/products/` | `plugin_pos_products` (id, category, name, price, stock, weight, code, id_fee, archived), `plugin_pos_products_methods`, `plugin_pos_products_links` | `admin/manage/products/`, `lib/Products.php` |
| Moyens de paiement | Nom, compte, min/max, type (Suivi/Informel/Ardoise/Porte-monnaie) | Gestion et statistiques → Moyens de paiement | `plugin_pos_methods` (id, id_location, name, type, min, max, account, is_default, enabled) | `admin/manage/methods/`, `lib/Methods.php`, `Method::TYPE_*` |
| Produits liés | Ajout auto de produits liés au panier | Config produit | `plugin_pos_products_links` (id_product, id_linked_product) | `lib/Entities/Product.php`, lecture dans flux d'ajout au panier |
| Produits ↔ moyens de paiement | Restriction par produit des moyens acceptés | Gestion et statistiques → Moyens de paiement (par produit) ou Produits → Modifier | `plugin_pos_products_methods` (product, method) | `Method::listProducts`, `Method::linkProducts`, `manage/methods/products.php` |
| Ardoises | Dette membre, remboursement ultérieur | Ardoise comme moyen de paiement ; bouton Ardoises ; Rembourser | `plugin_pos_methods` (type=2), `plugin_pos_tabs_payments` (type=2), `plugin_pos_tabs_items` (type=TYPE_PAYOFF pour remboursement) ; solde dette par user_id | `Tab::addUserDebtAsPayoff`, `Tabs::getGlobalDebtBalance`, `admin/balances.php?type=2`, `admin/balances_history.php` |
| Porte-monnaie membre | Crédit par membre, paiement avec le crédit | Créditer le porte-monnaie ; moyen Porte-monnaie au paiement | `plugin_pos_methods` (type=3), `plugin_pos_tabs_items` (type=TYPE_CREDIT pour crédit), `plugin_pos_tabs_payments` (type=3) ; solde crédit par user_id | `Tab::getUserCredit`, `Tab::addUserCredit`, `admin/tab_add_credit.php`, `admin/balances.php?type=3`, `Methods::hasCreditMethods` |
| Code barre | Ajout produit par scan (douchette ou mobile) | Champ recherche + scan ; paramètre `tab.php?code=XXX` | `plugin_pos_products.code` | `Tab::addItemByCode`, `admin/product_search.js` (BarcodeDetector) |
| Reçu PDF | Génération ticket/reçu par note | Bouton imprimante sur note | Lecture `plugin_pos_tabs`, `plugin_pos_tabs_items`, `plugin_pos_tabs_payments`, users | `admin/receipt.php`, template `invoice.skel` |
| Résumé session | Liste règlements, totaux, recettes par catégorie | Bouton Résumé depuis session | `plugin_pos_sessions`, `plugin_pos_tabs`, `plugin_pos_tabs_items`, `plugin_pos_tabs_payments` | `admin/session.php`, template `session.tpl` |
| Configuration caisse | Exercice compta, clôture auto notes, email clôture | Caisse → Configuration | Table `plugins`, colonne `config` (JSON) ; ou fichier `config.json` du plugin (auto_close_tabs, accounting_year_id, etc.) | `admin/config.php`, `config.tpl`, `config.json` |
| Emplacements | Multi points de vente | Gestion et statistiques → Emplacements | `plugin_pos_locations` (id, name) ; `plugin_pos_sessions.id_location`, `plugin_pos_methods.id_location` | `admin/manage/locations/`, `lib/Locations.php` |
| Gestion du stock | Mouvements, événements, historique | Gestion et statistiques → Stock | `plugin_pos_products.stock`, `plugin_pos_products_stock_history`, `plugin_pos_stock_events` | `admin/manage/stock/`, `lib/Stock.php` |
| Poids / décla | Poids par ligne de vente, historique par catégorie | Produit « au poids » ; colonne poids sur ligne | `plugin_pos_tabs_items.weight`, `plugin_pos_products.weight`, `plugin_pos_categories_weight_history`, `plugin_pos_weight_changes_types` | `Tab::updateItemWeight`, module Saisie au poids (sync) |
| Erreur de caisse | Écart solde physique / théorique à la clôture | Case « Je confirme avoir re-compté… » | `plugin_pos_sessions_balances.error_amount` ; écriture compta 678/778 | `POS::ERROR_DEBIT_ACCOUNT`, `POS::ERROR_CREDIT_ACCOUNT`, `Sessions::listClosingBalances` |
| Statistiques | Ventes par période, produits, moyens de paiement | Gestion et statistiques → Statistiques | Lecture `plugin_pos_sessions`, `plugin_pos_tabs`, `plugin_pos_tabs_items`, `plugin_pos_tabs_payments` (agrégations) | `admin/manage/stats.php` |

### 2.3 Fichiers et routes principaux (entrées admin plugin)

| Usage | Fichier / route |
|-------|------------------|
| Accueil caisse (liste sessions) | `admin/index.php`, `templates/index.tpl` |
| Ouvrir session | `admin/session_open.php`, `templates/session_open.tpl` |
| Session en cours (notes, encaissement) | `admin/tab.php`, `templates/tab.tpl`, `admin/tab.js`, `admin/product_search.js` |
| Fiche session (résumé, sync) | `admin/session.php`, `templates/session.tpl` |
| Supprimer une session | `admin/session_delete.php`, `templates/session_delete.tpl` (session non synchronisée compta) |
| Clôture session | `admin/session_close.php`, `templates/session_close.tpl` |
| Reçu PDF | `admin/receipt.php` |
| Recherche membre (associer à une note) | `admin/user_search.php`, `templates/user_search.tpl` (appel depuis tab.tpl / tab.js) |
| Configuration | `admin/config.php`, `templates/config.tpl` |
| Ardoises / Porte-monnaie listes | `admin/balances.php`, `templates/balances.tpl` ; `admin/balances_history.php`, `templates/balances_history.tpl` |
| Crédit porte-monnaie | `admin/tab_add_credit.php`, `templates/tab_add_credit.tpl` |
| Gestion (catégories, produits, méthodes, emplacements, stock, export, sync) | `admin/manage/_inc.php`, `admin/manage/index.php`, `manage/categories/`, `manage/products/`, `manage/methods/`, `manage/locations/`, `manage/stock/`, `manage/export.php`, `manage/sync.php` |
| Statistiques (ventes par période, produits, moyens de paiement) | `admin/manage/stats.php` |
| Entités / logique métier | `lib/POS.php` (préfixe tables, syncAccounting), `lib/Sessions.php`, `lib/Tabs.php`, `lib/Products.php`, `lib/Categories.php`, `lib/Methods.php`, `lib/Locations.php`, `lib/Stock.php` ; `lib/Entities/Session.php`, `Tab.php`, `TabItem.php`, `Product.php`, `Category.php`, `Method.php`, etc. |

---

## 3. Liens doc officielle (récap)

| Page | URL |
|------|-----|
| Extension Caisse | https://paheko.cloud/extension-caisse |
| Ouvrir la caisse | https://paheko.cloud/ouverture-caisse |
| Encaisser une vente | https://paheko.cloud/caisse-encaissement-vente |
| Produits et catégories | https://paheko.cloud/caisse-configuration-produits-categories |
| Configuration moyens de paiement | https://paheko.cloud/caisse-configuration-paiement |
| Clôturer la caisse | https://paheko.cloud/caisse-cloture |
| Clôture automatique des notes | https://paheko.cloud/configurer-cloture-automatique-notes |
| Ardoises | https://paheko.cloud/ardoises-pour-ventes-non-reglees |
| Code barre | https://paheko.cloud/encaisser-une-vente-avec-code-barre |
| Fonctionnalités caisse (vue d'ensemble) | https://paheko.cloud/fonctionnalites-caisse |

---

*Audit produit pour la migration RecyClique → Paheko. Schéma BDD détaillé : `references/dumps/schema-paheko-dev.md`.*
