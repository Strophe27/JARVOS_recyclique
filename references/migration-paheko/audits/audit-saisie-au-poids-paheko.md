# Audit — Extension Saisie au poids Paheko

**Date :** 2026-02-25  
**Contexte :** Projet JARVOS Recyclique, migration Paheko. Correspondances RecyClique ↔ Paheko (caisse, saisie au poids).  
**Objectif :** Mode d'emploi synthétique + traçabilité workflow/options → UI, tables BDD, références pour le module RecyClique.  
**Sources :** Doc officielle paheko.cloud (extension Saisie au poids), [schema-paheko-dev.md](../../dumps/schema-paheko-dev.md), [schema-recyclic-dev.md](../../dumps/schema-recyclic-dev.md), [artefact 2026-02-25_04](../../artefacts/2026-02-25_04_analyse-plugins-caisse-decisions-push.md).

---

## 1. Mode d'emploi synthétique

L'extension **Saisie au poids** permet de saisir rapidement des **entrées** et **sorties** de produits en poids (kg). Utile pour ateliers vélos conventionnés Ecologic, ressourceries, structures qui doivent justifier du poids revalorisé.

### 1.1 Configuration

- **Où :** Menu gauche → Saisie au poids → onglet **Configuration** (après [activation de l'extension](https://paheko.cloud/gestion-activation-extensions)).
- **Doc :** [Configurer l'extension Saisie au poids](https://paheko.cloud/extension-saisie-au-poids-configuration).

**Entrées :** Sous-onglet **Entrées** — définir les **catégories de provenance** et les **types d'objets** (vélos, pièces, meubles, etc.) avec poids indicatif. Pour Ecologic : type d'opération par provenance (LIV = entrées sur site, PRE = prélèvement en déchetterie conventionnée).

**Sorties :** Sous-onglet **Sorties** — définir les **catégories de motif de sortie** et les **types d'objets sortants**, avec poids par défaut. Pour Ecologic : type d'opération par motif (ex. DEC_REE = Déclaration de Réemploi effectué).

**Connexion autres extensions :** Sous-onglet **Connexion avec les autres extensions** — mapping « catégorie Caisse » → « provenance ou motif Saisie au poids », et idem pour Gestion des vélos (provenance / motif vélos → provenance / motif Saisie au poids).

### 1.2 Saisie des entrées et sorties

- **Doc :** [Saisir des entrées et sorties](https://paheko.cloud/extension-saisie-au-poids-saisir-entrees-sorties).

**Entrées :** Onglet **Entrées** → « Ajouter une ligne » → poids unitaire, quantité, **provenance** (menu déroulant) → Enregistrer.

**Sorties :** Onglet **Sorties** → « Ajouter une ligne » → poids unitaire, quantité, **motif de sortie** (menu déroulant) → Enregistrer.

**Rectification :** Onglet **Historique** — détail de toutes les saisies ; bouton **Supprimer** sur une ligne pour corriger une erreur.

### 1.3 Import depuis Caisse et Gestion des vélos

- **Doc :** [Importer des données des extensions Caisse et Gestion des vélos](https://paheko.cloud/extension-saisie-au-poids-import-gestion-velos-caisse).

**Prérequis :** Caisse : produits avec poids renseigné, **session caisse clôturée**. Vélos : poids indiqué dans l'extension Gestion des vélos. Mapping configuré (Configuration → Connexion avec les autres extensions).

**Workflow :** Onglet **Import extensions** dans le menu Saisie au poids → ouverture de l'onglet déclenche l'import automatique ; message indiquant le nombre d'imports effectués. Les lignes importées apparaissent dans **Historique** avec indication de l'extension source.

**Attention :** Pour éviter les doublons (vente vélo en caisse vs sortie stock vélos), une seule des deux extensions doit être utilisée pour le calcul du poids sorti.

### 1.4 Rapports et déclaration Ecologic

- **Doc :** [Éditer les rapports de Saisie au poids](https://paheko.cloud/extension-saisie-au-poids-rapports-ecologic).

**Statistiques :** Onglet **Statistiques** → bouton **Export** (en haut à droite) → export des entrées et sorties par **mois**, **trimestre**, **année**.

**Ecologic :** Sous-onglet **Déclaration Ecologic** — export d'un rapport pour les entrées/sorties dont un type d'opération Ecologic a été indiqué (LIV, PRE, DEC_REE, etc.).

---

## 2. Traçabilité : étapes / options → UI, BDD, référence RecyClique

| Étape / Option | Description | UI | Tables BDD (saisie au poids, caisse si lien) | Référence utile RecyClique |
|----------------|-------------|-----|----------------------------------------------|----------------------------|
| **Configurer l'extension** | Activation, catégories provenance/motifs, types d'objets, poids par défaut, flag Ecologic par provenance/motif, mapping Caisse/vélos. | Menu → Saisie au poids → Configuration (sous-onglets Entrées, Sorties, Connexion). | `module_data_saisie_poids` (documents JSON : config catégories, types d'objets, mappings). Table `modules` (colonne config) pour la config globale du module. | Module RecyClique : catégories / sous-catégories, motifs, correspondance avec décla éco-organismes. |
| **Catégories / motifs (entrées)** | Provenances et types d'objets pour les entrées ; poids indicatif ; type opération Ecologic (LIV, PRE). | Configuration → Entrées. | `module_data_saisie_poids` (document par catégorie/type, schémas entry, category, object). | Flux réception / dépôts ; `poste_reception`, `ticket_depot`, `ligne_depot` (poids_kg, destination, category_id). |
| **Catégories / motifs (sorties)** | Motifs de sortie et types d'objets sortants ; poids par défaut ; type opération Ecologic (ex. DEC_REE). | Configuration → Sorties. | Idem `module_data_saisie_poids`. | Sorties, déclaration réemploi, correspondance avec décla. |
| **Saisir une entrée** | Ligne(s) : poids unitaire (kg), quantité, provenance. Le type d'objet (config) peut fournir un poids par défaut, modifiable à l'enregistrement. | Onglet Entrées → Ajouter une ligne → Enregistrer. | `module_data_saisie_poids` : nouvel enregistrement type « entrée » (JSON : type, poids unitaire, quantité, catégorie, flag Ecologic). | Réception matière, tickets dépôt, poids_kg. Voir [schema-recyclic-dev.md](../../dumps/schema-recyclic-dev.md) (ligne_depot, ticket_depot). |
| **Saisir une sortie** | Ligne(s) : poids unitaire, quantité, motif de sortie. Poids par défaut possible depuis le type d'objet (config). | Onglet Sorties → Ajouter une ligne → Enregistrer. | `module_data_saisie_poids` : nouvel enregistrement type « sortie » (JSON : motif, poids, etc.). | Ventes, enlèvements, déclaration réemploi. |
| **Historique / rectification** | Consultation et suppression d'une saisie erronée. | Onglet Historique → Supprimer sur une ligne. | `module_data_saisie_poids` : lecture/suppression par id/key. | Traçabilité et correction des erreurs côté RecyClique. |
| **Importer depuis la Caisse** | Import des poids des lignes de tickets (sessions clôturées), après mapping catégorie caisse → motif/provenance Saisie au poids. | Configuration → Connexion (mapping) ; puis onglet Import extensions. | **Lecture :** `plugin_pos_sessions` (closed non NULL), `plugin_pos_tabs`, `plugin_pos_tabs_items` (weight), `plugin_pos_products` (weight), `plugin_pos_categories`. **Écriture :** `module_data_saisie_poids` (sorties avec `pos_session_id` pour éviter doublons). | Push caisse RecyClique → plugin écrit en `plugin_pos_*` ; sync peut alimenter `module_data_saisie_poids` (logique type sync.html, automatisable dans plugin). Voir artefact 2026-02-25_04. |
| **Importer depuis Gestion des vélos** | Import des poids depuis l'extension vélos selon mapping provenance/motif. | Configuration → Connexion ; onglet Import extensions. | Tables extension vélos (non détaillées ici) → `module_data_saisie_poids`. | Si RecyClique gère du flux vélos : mapping équivalent. |
| **Flag Ecologic** | Type d'opération Ecologic par provenance (LIV, PRE) ou motif (DEC_REE). | Configuration Entrées/Sorties — champ type opération Ecologic. | `module_data_saisie_poids` : champ dans les documents (entrée/sortie) pour filtrage export Ecologic. | Déclaration éco-organismes ; alignement des libellés et codes. |
| **Statistiques / Export** | Export par période (mois, trimestre, année). | Onglet Statistiques → Export. | Lecture `module_data_saisie_poids` (filtrage par date, type). | Agrégations RecyClique pour décla et reporting. |
| **Déclaration Ecologic** | Export rapport filtré sur types d'opération Ecologic. | Statistiques → sous-onglet Déclaration Ecologic. | Lecture `module_data_saisie_poids` (filtre sur type opération Ecologic). | Module décla éco-organismes RecyClique ; format attendu par Ecologic. |

---

## 3. Où sont hébergées les données

| Donnée | Hébergement Paheko | Tables / stockage | Note pour arbitrage RecyClique vs Paheko |
|--------|--------------------|-------------------|------------------------------------------|
| **Poids (entrées/sorties)** | Module Saisie au poids | `module_data_saisie_poids` (document JSON par enregistrement : poids unitaire, quantité, poids total dérivé ; champs **type** entrée/sortie, **pos_session_id** pour dédoublonnage import, index sur type/target — voir schéma). | RecyClique = source de vérité (décision artefact 2026-02-25_05/08). Paheko peut être alimenté en écriture par le plugin après push caisse (optionnel, traçabilité). |
| **Catégories / motifs** | Module Saisie au poids | `module_data_saisie_poids` (config : listes provenance, motif, types d'objets). | À faire correspondre avec catégories/sous-catégories RecyClique et avec les codes Ecologic (LIV, PRE, DEC_REE). |
| **Lien session caisse** | Caisse (POS) + Saisie au poids | **Caisse :** `plugin_pos_sessions`, `plugin_pos_tabs`, `plugin_pos_tabs_items` (colonnes `weight`, `category_name`, `product` → `plugin_pos_products`, `plugin_pos_categories`). **Saisie au poids :** dans chaque document importé, champ type `pos_session_id` (ou équivalent) pour éviter les doublons à l'import. | Sync manuelle (onglet Import extensions) ou automatisée dans le plugin RecyClique : après écriture en `plugin_pos_*`, écriture directe en `module_data_saisie_poids` avec référence session. |
| **Poids côté caisse** | Plugin Caisse (POS) | `plugin_pos_tabs_items.weight` (g ou unité config), `plugin_pos_products.weight`. Historique poids par catégorie : `plugin_pos_categories_weight_history` (lien `item` → `plugin_pos_tabs_items`, `type` → `plugin_pos_weight_changes_types`). | Produits caisse avec poids obligatoire pour que l'import Saisie au poids ait des données ; plugin push RecyClique doit renseigner `weight` sur les lignes. |
| **Config mappings Caisse ↔ Saisie au poids** | Module Saisie au poids | `module_data_saisie_poids` (documents de config) et/ou table `modules` (colonne config) : mapping « catégorie caisse » → « motif ou provenance » Saisie au poids. | Un seul sens : Caisse → Saisie au poids. Pour RecyClique : mapping catégorie RecyClique → catégorie caisse Paheko puis → motif Saisie au poids, ou écriture directe en `module_data_saisie_poids` avec le bon motif. |

---

## 4. Références

- **Doc officielle :**
  - [Saisie au poids — accueil](https://paheko.cloud/extension-saisie-au-poids)
  - [Configurer l'extension](https://paheko.cloud/extension-saisie-au-poids-configuration)
  - [Saisir des entrées et sorties](https://paheko.cloud/extension-saisie-au-poids-saisir-entrees-sorties)
  - [Importer Caisse et Gestion des vélos](https://paheko.cloud/extension-saisie-au-poids-import-gestion-velos-caisse)
  - [Éditer les rapports / Ecologic](https://paheko.cloud/extension-saisie-au-poids-rapports-ecologic)
- **Schéma BDD Paheko :** [references/dumps/schema-paheko-dev.md](../../dumps/schema-paheko-dev.md) — § 2 (plugin_pos_*), § 3 (module_data_saisie_poids). Les tables Caisse ont le préfixe **plugin_pos_*** (nom technique POS) dans l'instance dev.
- **Schéma BDD RecyClique :** [references/dumps/schema-recyclic-dev.md](../../dumps/schema-recyclic-dev.md) — réception, dépôts (poste_reception, ticket_depot, ligne_depot, poids_kg) pour correspondances entrées/sorties.
- **Sync caisse → saisie au poids, décisions push :** [references/artefacts/2026-02-25_04_analyse-plugins-caisse-decisions-push.md](../../artefacts/2026-02-25_04_analyse-plugins-caisse-decisions-push.md).
- **Confrontation RecyClique / Paheko, source de vérité poids :** [references/artefacts/2026-02-25_05_grille-confrontation-recyclic-paheko.md](../../artefacts/2026-02-25_05_grille-confrontation-recyclic-paheko.md), [2026-02-25_08_session-confrontation-recyclic-paheko.md](../../artefacts/2026-02-25_08_session-confrontation-recyclic-paheko.md).
- **Module Brindille (code) :** repo Paheko `modules/saisie_poids/` — [references/paheko/analyse-brownfield-paheko.md](../../paheko/analyse-brownfield-paheko.md) (addendum Saisie au poids).

---

*Audit produit pour la migration Paheko / RecyClique. Aucun extrait de code ; traçabilité workflow → UI et BDD pour faciliter les arbitrages.*
