# Catalogue « Qui stocke quoi » — RecyClique vs Paheko

**Date :** 2026-02-26  
**Objectif :** Document unique listant les entités métier et, pour chacune, où sont stockées les données (RecyClique uniquement, Paheko uniquement, ou les deux avec règle de source de vérité). À utiliser pour concevoir l'API RecyClique et les écrans avant de coder.  
**Sources :** [Matrice correspondance caisse/poids](../migration-paeco/audits/matrice-correspondance-caisse-poids.md), [grille confrontation 2026-02-25_05](2026-02-25_05_grille-confrontation-recyclic-paheko.md), [session 08](2026-02-25_08_session-confrontation-recyclic-paheko.md), [audits caisse et réception](../migration-paeco/audits/), [data-models-api](../ancien-repo/data-models-api.md).

---

## 1. Règle de lecture

| Colonne | Signification |
|--------|----------------|
| **RecyClique** | Donnée stockée en BDD RecyClique (nouveau backend v0.1). |
| **Paheko** | Donnée stockée en BDD Paheko (core + plugins Caisse / Saisie au poids). |
| **Source de vérité** | Qui crée / met à jour en premier ; l'autre reçoit une copie ou un reflet. |
| **Remarque** | Règles de création, mise à jour, sync (push, optionnel, hors scope v1). |

---

## 2. Catalogue par entité

### 2.1 Utilisateurs et rôles

| Entité | RecyClique | Paheko | Source de vérité | Remarque |
|--------|------------|--------|------------------|-----------|
| **Utilisateurs « terrain »** (opérateurs caisse, réception, bénévoles) | Oui. Tables `users`, `user_sessions`, `login_history`, `registration_request`. Profil, PIN, permissions app. | Non (v0.1). | **RecyClique.** | v0.1 : auth séparée ; app terrain = JWT FastAPI (RecyClique). Comptes terrain créés et gérés dans RecyClique. |
| **Comptes admin / compta** | Non (v0.1). | Oui. Comptes Paheko pour accès admin Paheko, API, compta. | **Paheko.** | v0.1 : pas de SSO ; deux mondes. v0.2 : SSO à documenter. |
| **Rôles / statuts utilisateur** | Oui. Rôles et statuts pour l'app (UserRole, UserStatus, actif/inactif, approbation). | N/A pour terrain. | **RecyClique** pour l'app. | Permissions caisse/réception/admin exposées par l'API RecyClique. |
| **Groupes et permissions** | Oui. Tables `groups`, `permissions`, `user_groups`, `group_permissions`. Gestion des droits app (caisse.access, reception.access, etc.). | N/A pour app terrain. | **RecyClique.** | Admin RecyClique gère les groupes et permissions de l'app ; pas de sync vers Paheko. |

---

### 2.2 Sites et postes

| Entité | RecyClique | Paheko | Source de vérité | Remarque |
|--------|------------|--------|------------------|-----------|
| **Sites** (magasins, ressourceries) | Oui. Table `sites`. CRUD dans l'app. | Non. Emplacements éventuels `plugin_pos_locations` si utilisé. | **RecyClique.** | Mapping site RecyClique → emplacement Paheko possible dans le module correspondance (config ou à la volée au push). |
| **Postes de caisse** (cash_registers) | Oui. Table `cash_registers` (site_id, location, enable_virtual, enable_deferred). | Non. | **RecyClique.** | register_id / site_id utilisés au push pour lier la session à un emplacement Paheko si besoin. |

---

### 2.3 Sessions et ventes (caisse)

| Entité | RecyClique | Paheko | Source de vérité | Remarque |
|--------|------------|--------|------------------|-----------|
| **Sessions de caisse** | Oui. `cash_sessions` (ouverture, clôture, fond de caisse, step, montants). | Oui (miroir). `plugin_pos_sessions`, `plugin_pos_sessions_balances`. | **RecyClique.** Création et mises à jour dans RecyClique ; push vers Paheko (ouverture → création session Paheko ; clôture → clôture session Paheko + syncAccounting). | 1 session RecyClique = 1 session Paheko. Push par ticket au fil de l'eau ; clôture RecyClique déclenche clôture Paheko (contrôle totaux puis syncAccounting). |
| **Ventes / tickets** | Oui. `sales`, `sale_items`, `payment_transactions`. | Oui (miroir). `plugin_pos_tabs`, `plugin_pos_tabs_items`, `plugin_pos_tabs_payments`. | **RecyClique.** | Push par ticket ; montants en centimes ; catégories créées ou matchées à la volée côté plugin. |
| **Paiements** (multi-moyens) | Oui. `payment_transactions` (payment_method, amount). | Oui (miroir). `plugin_pos_tabs_payments`. | **RecyClique.** | Mapping méthode RecyClique → id_method Paheko (référentiel à définir dans le module correspondance). |
| **Poids (lignes de vente)** | Oui. `sale_items.weight`. | Oui (miroir). `plugin_pos_tabs_items.weight` (en g) ; optionnel `module_data_saisie_poids` après push. | **RecyClique.** | Unité : réception = kg ; caisse à homogénéiser (conversion kg → g au push si besoin). |

---

### 2.4 Réception (dépôts, postes, tickets, lignes)

| Entité | RecyClique | Paheko | Source de vérité | Remarque |
|--------|------------|--------|------------------|-----------|
| **Postes de réception** | Oui. `poste_reception` (opened_by_user_id, opened_at, status). | Non obligatoire. | **RecyClique.** | Pas de sync manuelle vers Paheko. |
| **Tickets de réception** | Oui. `ticket_depot` (poste_id, benevole_user_id, status). | Non obligatoire. | **RecyClique.** | — |
| **Lignes de dépôt** | Oui. `ligne_depot` (poids_kg, category_id, destination, is_exit). | Optionnel. Copie possible dans `module_data_saisie_poids` pour traçabilité (écriture par plugin après traitement RecyClique). | **RecyClique.** | RecyClique = source de vérité pour les poids déclaratifs. Pas de sync bidirectionnelle. |

---

### 2.5 Catégories

| Entité | RecyClique | Paheko | Source de vérité | Remarque |
|--------|------------|--------|------------------|-----------|
| **Catégories EEE / décla** | Oui. Table `categories` (hiérarchie, visibilité caisse/réception, ordre, official_name). Référentiel pour décla éco-organismes. | Non comme référentiel. Création ou match **à la volée** au push (plugin_pos_categories) par libellé/code. | **RecyClique** pour le référentiel ; **Paheko** reçoit des créations/matchs à la volée. | Plugin RecyClique crée ou matche les catégories caisse à la volée au push ; fallback config admin Paheko si référentiel préalable souhaité. |
| **Catégories « boutique » Paheko** | N/A. | Oui. `plugin_pos_categories` (name, account). | **Paheko** pour la compta (comptes) ; contenu alimenté par le push RecyClique. | — |

---

### 2.6 Presets (boutons rapides caisse)

| Entité | RecyClique | Paheko | Source de vérité | Remarque |
|--------|------------|--------|------------------|-----------|
| **Presets** | Oui. `preset_buttons` (category_id, preset_price, button_type, etc.). | Non (pas d'entité équivalente). Au push : ligne avec catégorie + prix. | **RecyClique.** | Mapping preset → (catégorie + prix) suffit pour le push ; pas besoin d'entité « preset » côté Paheko. |

---

### 2.7 Données déclaratives et poids (flux matière)

| Entité | RecyClique | Paheko | Source de vérité | Remarque |
|--------|------------|--------|------------------|-----------|
| **Données déclaratives** (poids, flux, catégories, périodes T1–T4) | Oui. RecyClique produit et conserve (module décla, multi-éco-organismes). | Copie minimale optionnelle (ex. Saisie au poids) pour traçabilité compta ; pas d'obligation. | **RecyClique.** | Détail dans PRD module décla. |
| **Poids (réception)** | Oui. `ligne_depot.poids_kg`. | Optionnel : plugin peut écrire dans `module_data_saisie_poids` (entrées) après traitement RecyClique. | **RecyClique.** | Pas de sync bidirectionnelle. |
| **Poids (caisse, lignes de vente)** | Oui. `sale_items.weight`. | Oui sur lignes au push ; optionnel écriture dans `module_data_saisie_poids` après push (type import caisse automatisé). | **RecyClique.** | Réévaluer en v0.5 (éco-organismes). |

---

### 2.8 Paramètres et configuration

| Entité | RecyClique | Paheko | Source de vérité | Remarque |
|--------|------------|--------|------------------|-----------|
| **Paramètres applicatifs** (clé-valeur, seuils, session, email, alertes) | Oui. `settings`, `admin_settings`. | Oui (config Paheko, comptes, moyens de paiement). | **RecyClique** pour l'app ; **Paheko** pour la compta. | Pas de sync ; deux mondes. |
| **Configuration compta** (comptes, moyens de paiement, exercices) | Non. | Oui. | **Paheko.** | RecyClique envoie des données conformes ; la config Paheko est la référence. |

---

### 2.9 Logs, audit, santé

| Entité | RecyClique | Paheko | Source de vérité | Remarque |
|--------|------------|--------|------------------|-----------|
| **Journal d'audit** (actions sensibles) | Oui. `audit_log`. | Paheko peut avoir son propre audit. | **RecyClique** pour l'app. | — |
| **Logs transactions / email / sync** | Oui. `transaction_logs`, `email_logs`, `sync_log`. | N/A. | **RecyClique.** | — |
| **Santé / métriques** | Oui (endpoints health, DB, scheduler). | Oui (health propre). | Chacun son périmètre. | — |

---

### 2.10 Dépôts (bot / IA)

| Entité | RecyClique | Paheko | Source de vérité | Remarque |
|--------|------------|--------|------------------|-----------|
| **Dépôts** (deposits, bot Telegram, classification) | Oui en 1.4.4. Table `deposits`. | Non. | **RecyClique.** | Bot désactivé en 1.4.4 ; hors scope ou placeholder v0.1 selon décision produit. |

---

### 2.11 Ardoises, porte-monnaie, code barre

| Entité | RecyClique | Paheko | Source de vérité | Remarque |
|--------|------------|--------|------------------|-----------|
| **Ardoises / ventes non réglées** | Non en 1.4.4. | Oui (moyen type=2). | **Paheko** si utilisé. | v0.1 : ignorer ou à implémenter plus tard dans RecyClique puis mapper. |
| **Porte-monnaie membre** | Non en 1.4.4. | Oui (moyen type=3). | **Paheko** si utilisé. | v0.1 : ignorer. |
| **Code barre** | Non détaillé en 1.4.4. | Oui (plugin_pos_products.code). | À trancher. | v0.1 : ignorer ou valider présence dans API/BDD RecyClique. |

---

## 3. Synthèse par « qui crée / qui lit »

- **Uniquement RecyClique** : utilisateurs terrain, rôles/groupes/permissions app, sites, cash_registers, postes/tickets/lignes de réception, catégories (référentiel), presets, paramètres app, logs/audit, données déclaratives (production et conservation).
- **RecyClique source + miroir Paheko** : sessions de caisse, ventes/tickets/lignes/paiements, poids (lignes caisse) ; push par ticket, clôture déclenche clôture Paheko et syncAccounting.
- **RecyClique source, copie optionnelle Paheko** : réception (poste, ticket, lignes) → `module_data_saisie_poids` ; poids déclaratifs.
- **Paheko uniquement** (v0.1) : comptes admin/compta, configuration compta (comptes, moyens, exercices), ardoises/porte-monnaie si utilisés.
- **Création à la volée côté Paheko** : catégories caisse (plugin crée ou matche au push par libellé/code).

---

## 4. Références

- [Matrice correspondance caisse/poids](../migration-paeco/audits/matrice-correspondance-caisse-poids.md)
- [Grille confrontation 2026-02-25_05](2026-02-25_05_grille-confrontation-recyclic-paheko.md)
- [Session confrontation 2026-02-25_08](2026-02-25_08_session-confrontation-recyclic-paheko.md)
- [Audit caisse RecyClique 1.4.4](../migration-paeco/audits/audit-caisse-recyclic-1.4.4.md)
- [Audit réception et poids RecyClique 1.4.4](../migration-paeco/audits/audit-reception-poids-recyclic-1.4.4.md)
- [Data models API](../ancien-repo/data-models-api.md)

---

*Document produit pour débloquer la vision architecturale. À mettre à jour avec les champs exacts issus des dumps BDD (references/dumps/) et de l'instance dev.*
