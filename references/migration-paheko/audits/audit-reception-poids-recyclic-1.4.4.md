# Audit — Réception et poids RecyClique 1.4.4

Audit de la réception et du poids dans RecyClique 1.4.4 : mode d'emploi synthétique, traçabilité workflow/options → API, tables BDD, et emplacement des données pour les arbitrages avec Paheko Saisie au poids.

- **Contexte** : Projet JARVOS Recyclique, migration Paheko. Correspondances réception / poids RecyClique ↔ Paheko (Saisie au poids).
- **Sources** : `references/ancien-repo/fonctionnalites-actuelles.md` (section Réception), `references/ancien-repo/v1.4.4-liste-endpoints-api.md`, `references/dumps/schema-recyclic-dev.md`.
- **Version cible** : RecyClique 1.4.4.

---

## 1. Mode d'emploi synthétique

### 1.1 Périmètre

- **Module réception** : accès via permission `reception.access`, route frontend `/reception`.
- **Concepts** : **poste de réception** (session de travail) → **tickets de réception** (un dépôt par bénévole / par visite) → **lignes de dépôt** (catégorie, poids, destination, option sortie stock).

### 1.2 Workflow principal

1. **Ouverture d'un poste de réception**  
   L'opérateur ouvre un poste. Option **saisie différée** : fournir une date réelle passée `opened_at` (ex. cahier papier) pour que les tickets créés dans ce poste soient datés correctement.

2. **Création et gestion des tickets**  
   - Créer un ticket (lié au poste courant).  
   - En BDD le ticket a un **bénévole** obligatoire (`benevole_user_id`) — en pratique l'API peut utiliser l'opérateur connecté par défaut.  
   - Fermer le ticket quand le dépôt est terminé.

3. **Lignes de dépôt**  
   Pour chaque ticket :  
   - **Ajout de lignes** : catégorie (EEE), **poids (kg)**, **destination** (enum), notes.  
   - **Sortie stock** : marque `is_exit` pour les lignes qui sortent du stock.  
   - Modification / suppression de lignes tant que le ticket est ouvert ; **PATCH weight** permet de corriger le poids d'une ligne (y compris après fermeture, selon droits).

4. **Fermeture du poste**  
   Fermeture du poste une fois tous les tickets traités. Les stats et exports s'appuient sur `opened_at` / `closed_at` des postes et tickets.

5. **Exports**  
   - **CSV d'un ticket** : `GET /v1/reception/tickets/{id}/export-csv`.  
   - **CSV des lignes (période)** : `GET /v1/reception/lignes/export-csv` (paramètres de période).  
   - **Export bulk tickets** (admin) : `POST /v1/admin/reports/reception-tickets/export-bulk`.

6. **Saisie différée**  
   - Ouverture de poste avec `opened_at` dans le passé.  
   - Les tickets créés dans ce poste héritent du contexte « différé » ; les stats peuvent exclure les sessions différées (option B44-P5).  
   - Guide : `docs/guides/reception-saisie-differee-guide.md`.

7. **Réception hors ligne**  
   Template CSV pour saisie offline : `GET /v1/admin/templates/reception-offline.csv`.

### 1.3 Options et variantes

- **Catégories réception** : liste dédiée `GET /v1/categories/entry-tickets` ou `GET /v1/reception/categories` (catégories visibles en réception, ordre `display_order_entry`).
- **Stats live** : KPI réception en temps réel (`GET /v1/reception/stats/live`, `GET /v1/stats/live`), avec possibilité d'exclure les sessions différées.
- **Modification du poids** : `PATCH /v1/reception/tickets/{ticket_id}/lignes/{ligne_id}/weight` (droits à vérifier côté admin / audit).

---

## 2. Tableau de traçabilité : étape / option → API → tables BDD

| Étape / Option | Description | API | Tables BDD | Remarque |
|----------------|-------------|-----|------------|----------|
| Accès module réception | Permission, route front | — | — | Permission `reception.access`, `/reception` |
| Ouverture poste réception | Ouvrir une session de réception (poste) | `POST /v1/reception/postes/open` (body optionnel : `opened_at` pour saisie différée) | `poste_reception` | `opened_by_user_id`, `opened_at`, `status` = 'opened'. Pas de `site_id` en BDD sur le poste. |
| Fermeture poste réception | Clôturer le poste | `POST /v1/reception/postes/{poste_id}/close` | `poste_reception` | `closed_at`, `status` mis à jour |
| Création ticket réception | Créer un ticket dans le poste courant | `POST /v1/reception/tickets` | `ticket_depot` | `poste_id`, `benevole_user_id` (requis en BDD, souvent opérateur connecté), `created_at`, `status` = 'opened' |
| Fermeture ticket | Clôturer un ticket | `POST /v1/reception/tickets/{ticket_id}/close` | `ticket_depot` | `closed_at`, `status` |
| Liste / détail tickets | Lister ou afficher un ticket | `GET /v1/reception/tickets`, `GET /v1/reception/tickets/{ticket_id}` | `ticket_depot` | Filtres, pagination côté API |
| Liste des lignes | Lister les lignes de dépôt (pagination) | `GET /v1/reception/lignes` | `ligne_depot` | Filtres (ex. par ticket, période) selon API |
| Ligne de dépôt (ajout) | Ajouter une ligne : catégorie, poids, destination, notes | `POST /v1/reception/lignes` | `ligne_depot` | `ticket_id`, `poids_kg`, `category_id` (nullable), `destination` (enum), `notes`, `is_exit` |
| Ligne de dépôt (modification) | Modifier une ligne | `PUT /v1/reception/lignes/{ligne_id}` | `ligne_depot` | Mise à jour champs modifiables |
| Ligne de dépôt (poids) | Modifier uniquement le poids d'une ligne | `PATCH /v1/reception/tickets/{ticket_id}/lignes/{ligne_id}/weight` | `ligne_depot` | `poids_kg` ; traçabilité / audit selon implémentation |
| Ligne de dépôt (suppression) | Supprimer une ligne | `DELETE /v1/reception/lignes/{ligne_id}` | `ligne_depot` | — |
| Catégorie / destination | Référentiel catégories EEE et destination par ligne | `GET /v1/reception/categories`, `GET /v1/categories/entry-tickets` | `categories`, `ligne_depot.category_id` (nullable), `ligne_depot.destination` | `categories.display_order_entry`, visibilité réception ; `destination` = enum obligatoire côté BDD |
| Sortie stock (réception) | Marquer une ligne comme sortie stock | Via `POST/PUT` lignes avec `is_exit` | `ligne_depot.is_exit` | B48-P3 |
| Export CSV (un ticket) | Télécharger le CSV d'un ticket | `GET /v1/reception/tickets/{ticket_id}/export-csv` (token possible) | `ticket_depot`, `ligne_depot`, `categories` | Token : `POST /v1/reception/tickets/{ticket_id}/download-token` |
| Export CSV lignes (période) | Export bulk des lignes sur une période | `GET /v1/reception/lignes/export-csv` | `ligne_depot`, `ticket_depot`, `categories` | Paramètres de filtre période |
| Export bulk tickets (admin) | Export bulk des tickets (rapports admin) | `POST /v1/admin/reports/reception-tickets/export-bulk` | `ticket_depot`, `ligne_depot`, `poste_reception`, `categories` | B50-P2, B50-P3 |
| Saisie différée réception | Poste ouvert avec date réelle passée | `POST /v1/reception/postes/open` avec `opened_at` | `poste_reception.opened_at` | B44-P2, B44-P4 ; stats option exclusion B44-P5 |
| Stats réception live | KPI réception en temps réel | `GET /v1/reception/stats/live`, `GET /v1/stats/live` | Agrégations sur `poste_reception`, `ticket_depot`, `ligne_depot` | Peut exclure sessions différées |
| Stats réception (synthèse / catégorie) | Synthèse période, par catégorie | `GET /v1/stats/reception/summary`, `GET /v1/stats/reception/by-category` | Idem | — |
| Template réception offline | Fichier modèle CSV pour saisie hors ligne | `GET /v1/admin/templates/reception-offline.csv` | — | Référentiel catégories / format attendu |

---

## 3. Où sont hébergées les données (arbitrages Paheko Saisie au poids)

Pour les correspondances avec **Paheko Saisie au poids** et le flux matière :

- **Site** : `poste_reception` et `ticket_depot` n'ont pas de `site_id` ; le site est déductible via `poste_reception.opened_by_user_id` → `users.site_id`.

| Donnée | Hébergement RecyClique 1.4.4 | Tables / API | Remarque pour arbitrage |
|--------|------------------------------|--------------|---------------------------|
| **Poids** | Par **ligne de dépôt** | `ligne_depot.poids_kg` (numeric, obligatoire) | Un ticket = N lignes ; chaque ligne a un poids. À mapper vers entrées « saisie au poids » Paheko (par ligne ou agrégé selon choix métier). |
| **Catégories (EEE)** | Référentiel global, visibilité réception | `categories` ; `ligne_depot.category_id` (nullable) ; API `GET /v1/categories/entry-tickets`, `GET /v1/reception/categories` | Alignement nécessaire avec le référentiel Paheko (catégories produits / flux matière) pour déclarations et stats. |
| **Destination** | Par ligne (enum) | `ligne_depot.destination` (USER-DEFINED enum) | Valeurs métier à lister depuis le schéma ou l'API ; à faire correspondre aux types de flux / destinations dans Paheko. |
| **Flux matière (entrée)** | Poste → ticket → lignes | `poste_reception`, `ticket_depot`, `ligne_depot` | Entrées = tickets ouverts/fermés dans un poste. Voir note Site ci-dessus pour le rattachement au site. |
| **Sorties stock** | Marque sur la ligne | `ligne_depot.is_exit` (boolean) | À rapprocher des sorties stock / flux matière côté Paheko si le plugin caisse ou saisie au poids gère les sorties. |
| **Horodatage** | Poste et ticket | `poste_reception.opened_at`, `ticket_depot.created_at`, `ticket_depot.closed_at` | Pour saisie différée, `opened_at` du poste = date réelle ; à utiliser pour dater les flux dans Paheko. |
| **Bénévole / opérateur** | Par ticket et poste | `ticket_depot.benevole_user_id`, `poste_reception.opened_by_user_id` | Correspondance avec membres / utilisateurs Paheko si besoin de traçabilité par personne. |

**Synthèse pour la migration** :  
- **Poids et catégories** : portés par `ligne_depot` et `categories` ; RecyClique est la source des dépôts « au poids » par ticket/ligne.  
- **Flux matière** : chaîne poste → ticket → lignes (poids, catégorie, destination, is_exit) ; à faire correspondre aux entités Paheko Saisie au poids (événements, lignes, produits/catégories).  
- **Exports CSV** et **export bulk** permettent d'alimenter des traitements externes ou une première synchro ; une intégration API ou file (ex. Redis) ciblant ces tables sera nécessaire pour une synchro durable.

---

## 4. Références rapides

- **Fonctionnalités réception** : `references/ancien-repo/fonctionnalites-actuelles.md` (§ 4 Réception).  
- **Endpoints réception / postes / tickets / lignes** : `references/ancien-repo/v1.4.4-liste-endpoints-api.md` (section Réception).  
- **Schéma BDD** : `references/dumps/schema-recyclic-dev.md` (`poste_reception`, `ticket_depot`, `ligne_depot`, `categories`).  
- **Correspondances Paheko** : `references/dumps/schema-recyclic-dev.md` (fin de fichier) — réception/dépôts → module_data_saisie_poids, flux matière.  
- **Guides (ancien repo)** : `docs/guides/reception-saisie-differee-guide.md`, `docs/guides/template-offline-reception.md`.
