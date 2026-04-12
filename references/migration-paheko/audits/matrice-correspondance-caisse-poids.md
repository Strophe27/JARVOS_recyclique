# Matrice de correspondance caisse et poids RecyClique ↔ Paheko

**Date :** 2026-02-25  
**Objectif :** Alimenter le module de correspondance et les arbitrages (hébergement matière, poids, catégories). Une ligne par capacité ; colonnes Paheko / RecyClique / mapping / écart ou décision.  
**Références :** [Grille confrontation 2026-02-25_05](../../artefacts/2026-02-25_05_grille-confrontation-recyclic-paheko.md), [Session confrontation 2026-02-25_08](../../artefacts/2026-02-25_08_session-confrontation-recyclic-paheko.md), [versioning](../../versioning.md). Audits : `audit-caisse-paheko.md`, `audit-saisie-au-poids-paheko.md`, `audit-caisse-recyclic-1.4.4.md`, `audit-reception-poids-recyclic-1.4.4.md`.

---

## 1. Tableau des capacités

| Capabilité | Paheko (oui/non, où) | RecyClique (oui/non, où) | Mapping / correspondance | Écart / décision |
|------------|----------------------|---------------------------|---------------------------|------------------|
| **Ouverture session avec fond de caisse** | Oui. `session_open.php` → solde d'ouverture par moyen ; tables `plugin_pos_sessions`, `plugin_pos_sessions_balances` (open_amount). | Oui. `POST /v1/cash-sessions` (initial_amount, optionnel opened_at). Tables `cash_sessions` (initial_amount, opened_at). | Session RecyClique → session Paheko au push : créer `plugin_pos_sessions` + `plugin_pos_sessions_balances` ; initial_amount (centimes) → open_amount par méthode (mapping méthode RecyClique → id_method Paheko). | **Décidé : 1 session RecyClique = 1 session Paheko** (ouverture avec fond de caisse → clôture avec comptage, même workflow). Push par ticket ; ouverture session Paheko créée par le plugin à l'ouverture côté RecyClique. |
| **Encaisser une vente avec lignes** | Oui. Note (tab) + lignes (`plugin_pos_tabs`, `plugin_pos_tabs_items`) ; produit, qty, price, total, weight, category_name, account. | Oui. `POST /v1/sales` : lignes (catégorie, quantité, prix, preset_id), sale_items (category, quantity, unit_price, total_price, weight). Tables `sales`, `sale_items`. | sale → plugin_pos_tabs ; sale_items → plugin_pos_tabs_items. Catégorie : plugin crée ou matche à la volée (libellé/code). Montants en centimes. weight (RecyClique) → weight (plugin_pos_tabs_items). | Décidé : push par ticket ; catégories à la volée. Champ product : soit produit Paheko matche par code/libellé, soit ligne « sans produit » selon config. |
| **Paiement multi-moyens** | Oui. Plusieurs lignes `plugin_pos_tabs_payments` par tab ; type, method, amount, reference. | Oui. Body `payments[]` dans `POST /v1/sales` ; table `payment_transactions` (payment_method, amount). | payment_transactions → plugin_pos_tabs_payments. Mapping payment_method (RecyClique) → id_method Paheko (config ou à la volée). Montants centimes. | Aligner les moyens de paiement (espèces, chèque, CB, etc.) entre les deux ; référentiel à définir dans le module correspondance. |
| **Poids par ligne / par ticket** | Oui. `plugin_pos_tabs_items.weight` ; option produit « au poids » ; historique `plugin_pos_categories_weight_history`. Unité : g ou selon config (schéma BDD). | Oui. `sale_items.weight` (éditable en admin via `PATCH .../items/{id}/weight`) ; totaux session/panier (total_weight_out, total_weight) en API. Réception : `ligne_depot.poids_kg` (kg). | sale_items.weight → plugin_pos_tabs_items.weight. Unité : réception RecyClique = kg (poids_kg) ; caisse RecyClique = non précisée (double precision) ; Paheko caisse = g ou unité config — à homogénéiser ou convertir au push. | RecyClique = source de vérité poids. Poids poussés sur les lignes au push ; optionnel écriture dans module_data_saisie_poids après push (voir Import poids). |
| **Catégories produits** | Oui. `plugin_pos_categories` (name, account) ; produits liés à une catégorie. Gestion et statistiques → Catégories. | Oui. `GET /v1/categories/sale-tickets` ; table `categories` (is_visible, display_order). Lignes de vente : category_id / preset → libellé. | Plugin recyclique crée ou matche les catégories à la volée (libellé/code) au push. Fallback config admin si référentiel préalable. category_id / name RecyClique → plugin_pos_categories (id ou name) + compte recette si config. | Décidé (grille 05/08). Précision avec dumps BDD pour champs exacts (code, libellé). |
| **Ardoises / ventes non réglées** | Oui. Moyen de paiement type Ardoise (type=2) ; note associée à un membre ; remboursement ultérieur ; pas d'écriture compta hors caisse. Tables `plugin_pos_tabs_payments` (type=2), balances. | Non documenté en 1.4.4 (audit caisse). Pas d'équivalent explicite « ardoise » dans les endpoints listés. | Si RecyClique n'a pas d'ardoise : à ignorer côté push ou traiter comme « reste à payer » avec méthode dédiée si implémenté plus tard. Si RecyClique ajoute ardoise : mapping vers method type=2 + user_id sur tab. | Manquant RecyClique 1.4.4 ; à ignorer en v0.1 ou à implémenter dans RecyClique puis mapper. |
| **Porte-monnaie membre** | Oui. Moyen type Porte-monnaie (type=3) ; crédit par membre ; paiement avec le crédit. `tab_add_credit.php`, balances type=3, `Tab::addUserCredit`, `Tab::getUserCredit`. | Non documenté en 1.4.4 (audit caisse). Pas d'équivalent « porte-monnaie » dans les endpoints listés. | Si RecyClique n'a pas de porte-monnaie : à ignorer. Si ajouté : crédit → écriture type TYPE_CREDIT ; paiement → plugin_pos_tabs_payments type=3. | Manquant RecyClique 1.4.4 ; à ignorer en v0.1 ou à implémenter puis mapper. |
| **Saisie entrées/sorties au poids** | Oui. Extension Saisie au poids : entrées (poids, provenance, type objet) ; sorties (poids, motif). Config : catégories provenance/motifs, types objets, flag Ecologic (LIV, PRE, DEC_REE). Données dans `module_data_saisie_poids` (JSON). | Oui. Réception : poste → tickets → lignes (`ligne_depot` : poids_kg, category_id, destination, is_exit). API : `POST /v1/reception/postes/open`, tickets, `POST /v1/reception/lignes`, etc. Pas de sync manuelle vers Paheko. | Réception RecyClique = source de vérité. Pas de sync bidirectionnelle. Optionnel : plugin peut écrire en `module_data_saisie_poids` (entrées) après traitement côté RecyClique pour traçabilité Paheko ; pas d'obligation (décision 08). | Décidé : RecyClique produit et conserve ; Paheko Saisie au poids optionnel (stats, export manuel) ou alimenté en lecture seule par le plugin. |
| **Import poids depuis caisse** | Oui. Saisie au poids : onglet « Import extensions » ; après clôture session caisse, import des poids des lignes (mapping catégorie caisse → motif/provenance). Écriture dans `module_data_saisie_poids` avec pos_session_id (dédoublonnage). | N/A (RecyClique est la caisse terrain). Les ventes avec poids sont poussées vers Paheko (plugin_pos_tabs_items.weight). | Après push caisse RecyClique → plugin : écriture en `plugin_pos_*` ; puis logique type sync.html automatisable dans le plugin pour alimenter `module_data_saisie_poids` (sorties avec pos_session_id). Mapping catégorie RecyClique → motif Saisie au poids. | Décidé (artefact 08) : plugin peut écrire dans module_data_saisie_poids après push caisse ; réévaluer en v0.5 (éco-organismes). |
| **Clôture session / contrôle totaux** | Oui. `session_close.php` : vérif paiements, solde fermeture, écart ; sync comptable à la clôture (POS::syncAccounting). Tables `plugin_pos_sessions` (closed, result), `plugin_pos_sessions_balances` (close_amount, error_amount). | Oui. `POST /v1/cash-sessions/{id}/close` (closing_amount, actual_amount, variance_comment). Tables `cash_sessions` (closed_at, closing_amount, actual_amount, variance). | À la clôture RecyClique : le plugin reçoit la clôture et **déclenche côté Paheko la clôture de la session correspondante** (contrôle totaux : somme des tickets poussés vs totaux envoyés par RecyClique), puis syncAccounting. Clôture session Paheko = contrôle + syncAccounting. | Décidé : clôture RecyClique déclenche clôture session Paheko (contrôle totaux puis syncAccounting). Granularité push par ticket. Détail séquence à figer dans le PRD. |
| **Rapports / déclarations** | Oui. Caisse : résumé session, PDF, stats (manage/stats.php). Saisie au poids : Statistiques (export mois/trimestre/année), sous-onglet Déclaration Ecologic. | Oui. Caisse : `GET /v1/admin/reports/cash-sessions`, export bulk. Réception : `GET /v1/reception/lignes/export-csv`, export bulk tickets. Stats : `GET /v1/cash-sessions/stats/summary`, `GET /v1/reception/stats/live`, etc. | Rapports caisse : RecyClique peut rester source des exports terrain ; Paheko reçoit les données via push pour ses propres stats/PDF. Déclarations éco-organismes : RecyClique produit et conserve (module décla) ; Paheko peut garder copie minimale (Saisie au poids) pour traçabilité. | Décidé : données déclaratives RecyClique ; rapports côté RecyClique ; Paheko = compta et optionnel stats locales. |
| **Code barre** | Oui. `plugin_pos_products.code` ; douchette ou BarcodeDetector ; `Tab::addItemByCode`, `tab.php?code=XXX`. | Non détaillé dans l'audit caisse 1.4.4 (possible en front). | Si RecyClique envoie un code produit : mapping vers plugin_pos_products.code pour ajout par code. Sinon ligne avec product id ou name. | À valider : présence code barre dans API/BDD RecyClique pour correspondance. |
| **Presets / boutons rapides** | Oui. Produits avec nom, prix, catégorie ; pas de concept « preset » identique. Produits liés (ajout auto). | Oui. `preset_buttons` (category_id, preset_price, button_type : Don, Recyclage, Déchèterie, etc.) ; lignes de vente avec preset_id. | Preset RecyClique → ligne avec catégorie + prix ; côté Paheko = produit ou ligne sans produit selon config. Catégorie à la volée. | Mapping preset → (catégorie + prix) suffit pour le push ; pas besoin d'entité « preset » côté Paheko. |
| **Emplacements / multi-points de vente** | Oui. `plugin_pos_locations` ; sessions et méthodes peuvent être liées à un emplacement. | Oui. `cash_registers` (site_id, location) ; sessions liées à register_id. | register_id / site_id RecyClique → id_location Paheko (config mapping ou à la volée). | À trancher avec dumps : champs site/emplacement pour une session. |
| **Sync comptabilité** | Oui. POS::syncAccounting (écritures consolidées par session) ; comptes catégories et moyens obligatoires. | N/A (RecyClique ne fait pas la compta). | Données poussées vers plugin → écritures compta via syncAccounting à la clôture (côté Paheko). | Décidé : Paheko = source de vérité compta ; sync à la clôture. |

---

## 2. Section arbitrages

Points à trancher pour le module de correspondance et le PRD, en cohérence avec la grille 05 et la session 08.

### 2.1 Où héberger la matière (flux entrées/sorties)

| Option | Description | Référence décision |
|--------|-------------|--------------------|
| **A** | RecyClique uniquement : réception (poste, tickets, lignes) reste dans RecyClique ; aucune écriture obligatoire dans Paheko Saisie au poids. | Grille 05 axe 3–4, artefact 08 : RecyClique = source de vérité ; Paheko optionnel. |
| **B** | RecyClique + copie optionnelle Paheko : plugin peut écrire en `module_data_saisie_poids` (entrées = flux réception) pour traçabilité compta / stats locales ; lecture côté Paheko après écriture. | Session 08 : « Paheko peut garder une copie minimale pour traçabilité compta ; pas d'obligation ». |
| **C** | Sync bidirectionnelle : rejeté. | Grille 05 : pas de sync bidirectionnelle. |

**Recommandation :** A ou B selon besoin métier (traçabilité sur instance Paheko). Figer dans le PRD module décla / correspondance.

### 2.2 Où héberger les poids (déclarations, stats)

| Option | Description | Référence décision |
|--------|-------------|--------------------|
| **A** | RecyClique = source de vérité pour tous les poids (ventes et réception). Paheko reçoit les poids sur les lignes caisse au push ; Saisie au poids optionnel. | Grille 05 axe 3, artefact 08. |
| **B** | Poids ventes : dans RecyClique et poussés vers `plugin_pos_tabs_items.weight` ; après push, optionnel alimentation `module_data_saisie_poids` (import caisse automatisé). Poids réception : source RecyClique ; copie optionnelle vers Paheko possible (voir 2.1 B). | Artefact 08 : « plugin peut écrire dans module_data_saisie_poids après push caisse ». |
| **C** | Tout dans Paheko : rejeté. | Source de vérité = RecyClique. |

**Recommandation :** B pour ventes (poids sur lignes + optionnel Saisie au poids) ; réception : source RecyClique uniquement (copie optionnelle vers Paheko voir 2.1 B). Détaillé dans PRD module correspondance.

### 2.3 Où héberger les catégories (produits, EEE, décla)

| Option | Description | Référence décision |
|--------|-------------|--------------------|
| **A** | Catégories caisse : plugin crée ou matche à la volée au push (libellé/code) ; référentiel EEE et décla dans RecyClique. | Grille 05 axe 2, artefact 08. |
| **B** | Config admin Paheko préalable (catégories, comptes) en fallback si référentiel imposé. | Grille 05 : « fallback config admin si référentiel préalable souhaité ». |
| **C** | Catégories réception (entrées) : RecyClique ; correspondance avec codes Ecologic (LIV, PRE, DEC_REE) pour décla dans RecyClique. | Grille 05 axe 4 : RecyClique produit et conserve ; module décla multi-éco-organismes. |

**Recommandation :** A + B pour caisse ; C pour réception et décla. Alignement des libellés/codes entre RecyClique et Paheko à documenter dans le module correspondance (dumps BDD + analyste).

### 2.5 Unité de poids (kg ↔ g)

| Contexte | Unité | Convention |
|----------|--------|------------|
| Réception RecyClique | kg (`poids_kg`) | Source de vérité. |
| Caisse RecyClique (stockage) | À préciser (double precision en BDD). | — |
| Paheko caisse | g ou selon config (schéma BDD). | Champ `plugin_pos_tabs_items.weight` en **g**. |

**Règle :** conversion au push si nécessaire (ex. kg → g : multiplier par 1000). Figer la convention dans le PRD (champ `plugin_pos_tabs_items.weight` en g).

### 2.4 Ce qui reste dans RecyClique vs synchronisé vers Paheko

| Donnée / flux | Reste dans RecyClique | Synchronisé vers Paheko | Note |
|---------------|------------------------|-------------------------|------|
| Sessions caisse (ouverture, clôture) | Oui (source) | Oui (création/contrôle session) | Décidé : 1 session RecyClique = 1 session Paheko. |
| Ventes / tickets / lignes / paiements | Oui (source) | Oui (plugin_pos_tabs, _items, _payments) | Push par ticket au fil de l'eau. |
| Poids (lignes de vente) | Oui (source) | Oui (plugin_pos_tabs_items.weight) ; optionnel module_data_saisie_poids | Décision 08. |
| Réception / dépôts (poste, tickets, lignes) | Oui (source) | Non obligatoire ; optionnel : plugin écrit une copie en `module_data_saisie_poids` pour traçabilité. | Pas de sync manuelle. |
| Catégories | Référentiel EEE / décla dans RecyClique | Création/match à la volée (plugin_pos_categories) | Plugin à la volée. |
| Données déclaratives (poids, flux, périodes) | RecyClique produit et conserve | Copie minimale optionnelle Paheko | PRD module décla. |
| Ardoises / porte-monnaie | Non en 1.4.4 | — | À ignorer ou à implémenter plus tard. |

---

## 3. Références

- **Audits :** `audit-caisse-paheko.md`, `audit-saisie-au-poids-paheko.md`, `audit-caisse-recyclic-1.4.4.md`, `audit-reception-poids-recyclic-1.4.4.md`.
- **Décisions :** [2026-02-25_05_grille-confrontation-recyclic-paheko.md](../../artefacts/2026-02-25_05_grille-confrontation-recyclic-paheko.md), [2026-02-25_08_session-confrontation-recyclic-paheko.md](../../artefacts/2026-02-25_08_session-confrontation-recyclic-paheko.md).
- **Schémas BDD :** `references/dumps/schema-paheko-dev.md`, `references/dumps/schema-recyclic-dev.md`. Tables caisse Paheko : préfixe **plugin_pos_*** (POS = point of sale) dans les schémas et audits.
- **Versioning :** `references/versioning.md`.

---


## 4. Fonctionnalités Paheko absentes de RecyClique 1.4.4 (v0.1 ignorées, v0.2+)

Liste des capacités Paheko non couvertes en RecyClique 1.4.4 — source : [audit-caisse-paheko.md](audit-caisse-paheko.md) § 1 et 2.2. Pour le détail « à développer plus tard », les lignes déjà dans le tableau des capacités (ardoises, porte-monnaie, code barre) renvoient à cette section.

| Fonctionnalité Paheko | Description courte | v0.1 | v0.2+ |
|-----------------------|---------------------|------|-------|
| **Ardoises** | Moyen type=2 ; note associée à un membre ; remboursement ultérieur ; pas d'écriture compta hors caisse. | Ignorer | Optionnel / à développer |
| **Porte-monnaie membre** | Moyen type=3 ; crédit par membre ; paiement avec le crédit (`tab_add_credit.php`, balances type=3). | Ignorer | Optionnel / à développer |
| **Code barre** | Produit par code (`plugin_pos_products.code`, `Tab::addItemByCode`). | Ignorer | Optionnel / à développer |
| **Produits liés** | Ajout auto au panier (`plugin_pos_products_links`). | Ignorer | Optionnel / à développer |
| **Restriction moyen de paiement par produit** | `plugin_pos_products_methods` : certains moyens acceptés ou non par produit. | Ignorer | Optionnel / à développer |
| **Gestion du stock** | Mouvements, événements (`plugin_pos_products_stock_history`, `plugin_pos_stock_events`). | Ignorer | Optionnel / à développer |
| **Lien activité / cotisation** | Produit → tarif adhésion (`plugin_pos_products.id_fee`, inscription à la clôture de la note). | Ignorer | Optionnel / à développer |
| **Reçu PDF** | Génération côté Paheko (bouton imprimante sur la note). | Ignorer | Optionnel / à développer |
| **Erreur de caisse** | Écart solde physique / théorique à la clôture → écriture 678/778. | Ignorer | Optionnel / à développer |

---

## 5. Principe de compatibilité Paheko

Le plugin RecyClique et le push doivent **s'appuyer sur les workflows et paramétrages Paheko** (comptes comptables des catégories et des moyens de paiement, exercice pour les écritures, emplacements si utilisés) pour ne rien casser. RecyClique envoie des données conformes à ce que Paheko attend (sessions, tabs, items, payments, clôture) ; **la config Paheko (comptes, moyens, etc.) est la référence**. À rappeler dans le PRD (module correspondance + plugin).

---

*Matrice produite pour alimenter le module de correspondance et les arbitrages migration Paheko. À mettre à jour avec les champs exacts issus des dumps BDD et de l'instance dev.*

