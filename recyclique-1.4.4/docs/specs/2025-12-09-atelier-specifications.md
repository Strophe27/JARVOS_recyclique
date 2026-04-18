# Atelier de Spécifications Techniques - 9 Décembre 2025

Ce document rassemble les décisions techniques et fonctionnelles prises lors de la session de travail sur la TODO List post-réunion du 5 décembre.

---

## 1. Gestion du Cycle de Vie des Catégories (Refonte Suppression)

**Source :** TODO "Support opérationnel urgent" - Mapping anciennes données.

### Problème
La suppression actuelle des catégories est destructive (Hard Delete). Cela pose problème pour l'intégrité des données historiques et empêche l'archivage propre des anciennes nomenclatures utilisées par Olivier.

### Solution Validée : Pattern "Soft Delete"

#### Backend (Base de Données)
- **Migration Schema :** Ajouter une colonne `deleted_at` (Timestamp, Nullable) sur les tables `categories` et `subcategories` (si applicable).
- **Logique Suppression :**
  - Action "Supprimer" → `UPDATE table SET deleted_at = NOW() WHERE id = X`.
  - Ne **JAMAIS** faire de `DELETE` SQL physique si des relations existent (ventes, stocks).
  - *Optionnel :* Autoriser le Hard Delete uniquement si aucune relation n'existe (clean de données erronées).

#### Frontend (Interface Admin)
- **Liste des Catégories :**
  - Par défaut : Filtrer pour n'afficher que `deleted_at IS NULL`.
  - **Nouveauté UI :** Ajouter un Toggle / Checkbox "Afficher les éléments archivés".
  - Les éléments archivés doivent être visuellement distincts (ex: grisés, icône "archive").
- **Réactivation :** Possibilité de "Restaurer" une catégorie archivée (remettre `deleted_at` à NULL).

#### Frontend (Interface Opérationnelle - Caisse/Réception)
- Les sélecteurs de catégories ne doivent afficher **QUE** les catégories actives (`deleted_at IS NULL`).
- **Exception :** Dans l'historique des transactions passées, la catégorie doit toujours s'afficher (jointure conservée), même si elle est désactivée aujourd'hui.

---

## 2. Monitoring Bug "Tickets Fantômes" (Logs Applicatifs)

**Source :** TODO "Bugs et corrections immédiates" - Investiguer bug tickets non vierges.

### Décision
Ne pas lancer d'investigation code lourde ("archéologie") tant que le bug n'est pas reproduit.
Mise en place d'une sonde de logging pour capturer l'état lors des prochaines occurrences.

### Solution Technique : Logs Transactionnels

#### Backend (Logger Dédié)
- Mettre en place un logger spécifique (ex: `transaction_audit`) qui écrit dans un fichier rotatif séparé (ex: `logs/transactions.log`).
- **Pourquoi un fichier ?** Plus facile à extraire/analyser qu'un flux Docker global mélangé.

#### Points de Capture (Triggers)
Logger un événement JSON structuré aux moments clés du cycle de vie d'un ticket :
1.  **Ouverture Session Caisse :** Qui ? Quand ? (Timestamp + UserID).
2.  **Reset / Nouveau Ticket :** État du panier AVANT le reset (s'il n'était pas vide alors qu'il aurait dû).
3.  **Validation Paiement :**
    - ID Transaction.
    - Nombre d'items.
    - Montant total.
    - État du panier juste APRES validation (devrait être vide).
4.  **Anomalies détectées :** Si une action "Ajout Item" arrive alors qu'aucun ticket n'est explicitement "ouvert" (selon la logique front).

---

## 2bis. Harmonisation Affichages Cumuls

**Source :** TODO "Bugs et corrections immédiates" - Finaliser harmonisation affichages cumuls.

### Problème
Incohérence d'affichage : Cumul "toujours" (all-time) pour les entrées vs cumul "jour" (daily) pour les sorties.
Cela crée une confusion dans les tableaux de bord et les statistiques.

### Statut Actuel
**Déjà en cours dans nouvelle version** (selon TODO).
**Action requise :** Vérification que la correction est bien implémentée et déploiement si validé.

### Solution Technique (À Vérifier)

#### Frontend (Affichage Statistiques)
- **Unification des périodes :** Les cumuls Entrées et Sorties doivent utiliser la même granularité temporelle.
- **Options possibles :**
  - Option A : Cumul "toujours" pour les deux (cohérence historique).
  - Option B : Cumul "jour" pour les deux (cohérence opérationnelle).
  - Option C : Permettre le choix de la période (Jour/Semaine/Mois/Toujours) avec sélection synchronisée.

#### Backend (API Statistiques)
- Vérifier que les endpoints de stats retournent des données cohérentes (même période pour entrées/sorties).
- Si correction déjà faite : Valider que les tests passent et que l'UI reflète bien la cohérence.

### Action Immédiate
1. Vérifier dans le code actuel si la correction est présente.
2. Tester l'affichage en environnement de développement.
3. Si OK : Déployer en production.
4. Si KO : Créer ticket de correction.

---

## 3. Option "Prix par défaut = 0€"

**Source :** TODO "Court Terme" - Implémenter option prix 0€.

### Statut : STAND-BY / BLOQUÉ

**Raison :** Questions métier bloquantes soulevées (impact sur stats dons, tracking vélos, gestion dons €).
**Action :** Fil Discord ouvert le 09/12/2025. Attente décision collégiale sur le workflow exact avant développement.
**Questions en suspens :**
- Gestion des destinations spéciales (Dons, Recyclage) si l'écran "Prix" disparaît.
- Utilité du champ "Quantité" dans un mode forfaitaire.
- Distinction Dons matériels vs Dons financiers.

---

## 4. Gestion Sorties de Stock (Écran Réception)

**Source :** TODO "Court Terme" - Ajouter gestion sorties de stock sur écran réception.

### Besoin Métier
Permettre de déclarer des sorties (Recyclage, Déchetterie) directement depuis l'interface de réception ("l'arrière"), pour des objets qui ont été pesés/triés mais qui repartent aussitôt, ou pour du déstockage massif.
Actuellement, tout ce qui est saisi en réception est compté comme "ENTRÉE" (+ Stock).

### Solution Technique

#### Frontend (Écran Réception)
- **Nouveau Contrôle :** Checkbox/Toggle "Sortie de stock" (ou "Mode Sortie").
- **Comportement Dynamique :**
  - Si actif : Liste des destinations filtrée.
    - Masquer : "Magasin" (Incohérent).
    - Garder : "Recyclage", "Déchetterie".
  - Si inactif (défaut) : Liste standard (Magasin, Recyclage, Déchetterie...).

#### Backend (Comptabilité Matière)
- L'API de réception doit accepter un flag `is_exit` (ou déduire du contexte).
- **Logique Comptable :**
  - Si `is_exit = true` : Poids ajouté au compteur **SORTIE** (comme une vente caisse).
  - Si `is_exit = false` : Poids ajouté au compteur **ENTRÉE**.
- **Impact Stock :**
  - Entrée : + Stock.
  - Sortie : - Stock (si gestion stock temps réel) ou juste Stats Sortie.

---

## 5. Notes sur Transactions

**Source :** TODO "Court Terme" - Finaliser système de notes.

### Statut : DÉJÀ IMPLÉMENTÉ
**Vérification :** Le champ existe déjà pour les dons 0€, -18 ans, et sorties recyclage/déchetterie.
**Décision :** Pas d'action de développement requise pour l'instant.

---

## 6. Déconnexion Automatique

**Source :** TODO "Court Terme" - Prévoir système déconnexion auto configurable.

### Statut : REPORTÉ
**Raison :** Moins prioritaire que les urgences opérationnelles. Sera traité conjointement avec la mise en place des comptes utilisateurs individuels et des Codes PIN (chantier futur).

---

## 7. Module Éco-Organismes

**Source :** TODO "Court Terme" - Développer module éco-organismes.

### Statut : STAND-BY / ATTENTE MÉTIER
**Raison :** Besoin de règles de mapping précises (Catégorie Interne → Code Éco-organisme) avant de coder.
**Action :** Fil Discord ouvert ("Chantier 2"). Attente retour binôme métier pour spécifier les règles.
