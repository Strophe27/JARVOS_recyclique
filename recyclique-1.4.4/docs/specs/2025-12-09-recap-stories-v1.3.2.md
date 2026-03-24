# Récapitulatif - Stories à créer pour v1.3.2

## ✅ Déjà fait (inclus dans 1.3.2)
- Harmonisation affichages cumuls (Point 2bis)
- Chantiers Discord (organisationnel)

---

## 📋 Stories à créer (3 stories)

### Story 1 : Soft Delete des Catégories
**Priorité :** URGENT (débloque Olive)
**Source :** Point 1 des specs

**Tâches techniques :**
- Backend : Migration DB (`deleted_at` sur `categories` et `subcategories`)
- Backend : Modifier endpoint suppression (Soft Delete au lieu de Hard Delete)
- Backend : Filtrer catégories actives uniquement dans les APIs de création (caisse/réception)
- Backend : Ne pas filtrer dans les APIs de statistiques/dashboard (garder actives + désactivées)
- Backend : Ne pas filtrer dans les APIs d'historique (garder actives + désactivées)
- Frontend Admin : Toggle "Afficher archivés" + style visuel (grisé)
- Frontend Admin : Bouton "Restaurer" pour catégories archivées
- Frontend Opérationnel : Filtrer catégories inactives uniquement dans les sélecteurs de création (caisse/réception)
- Frontend Dashboard/Stats : Afficher toutes les catégories (actives + désactivées) pour statistiques historiques
- Tests : Vérifier que les données historiques restent accessibles et mappables pour futures déclarations éco-organismes

**Estimation :** 4-6h

---

### Story 2 : Logs transactionnels (Monitoring bug tickets)
**Priorité :** HAUTE (sécurité/débogage)
**Source :** Point 2 des specs

**Tâches techniques :**
- Backend : Créer logger dédié `transaction_audit` (fichier rotatif `logs/transactions.log`)
- Backend : Logger ouverture session caisse (user_id, timestamp)
- Backend : Logger création/ouverture ticket (état panier à l'ouverture - pour détecter items fantômes)
- Backend : Logger reset/nouveau ticket (état panier avant reset)
- Backend : Logger validation paiement (transaction_id, items_count, total, état panier après)
- Backend : Logger anomalies (ajout item sans ticket ouvert)
- Tests : Vérifier format JSON structuré + rotation fichiers

**Estimation :** 3-4h

---

### Story 3 : Sorties de stock depuis écran réception
**Priorité :** MOYENNE (fonctionnalité)
**Source :** Point 4 des specs

**Tâches techniques :**
- Frontend Réception : Ajouter checkbox/toggle "Sortie de stock"
- Frontend Réception : Filtrer destinations dynamiquement (masquer "Magasin" si sortie activée)
- Backend : Ajouter flag `is_exit` dans API réception
- Backend : Logique comptable (incrémenter compteur SORTIE si `is_exit=true`, incrémenter compteur ENTRÉE si `is_exit=false`)
- Backend : Pas de décrémentation de stock (les compteurs sont décorrélés : total entrées vs total sorties)
- Tests : Vérifier comptabilité matière (poids bien comptabilisé dans le bon compteur)

**Estimation :** 3-5h

---

### Total estimation v1.3.2
**10-15h de développement**

---

## 🎯 Question Stratégique : Batch 47 vs Batch 48

**Situation actuelle :**
- Batch 47 (EPIC-B47) : Import Legacy CSV - Statut P6 "Ready for Review"
- Version 1.3.2 en dev : Besoin de 3 nouvelles stories (Soft Delete, Logs, Sorties Stock)

**Recommandation :**
**Créer un Batch 48** pour les stories v1.3.2 car :
1. **Séparation logique** : Batch 47 = Import données legacy (fonctionnalité complète), Batch 48 = Améliorations opérationnelles urgentes (bugs + features)
2. **Déploiement indépendant** : v1.3.2 peut être déployée sans attendre la finalisation du Batch 47
3. **Traçabilité** : Plus facile de suivre les stories par version si elles sont dans un batch dédié

**Structure proposée :**
- **EPIC-B48 : Améliorations Opérationnelles v1.3.2**
  - B48-P1 : Soft Delete Catégories
  - B48-P2 : Logs Transactionnels
  - B48-P3 : Sorties Stock Réception

**Alternative (si tu préfères) :**
- Continuer Batch 47 en ajoutant ces 3 stories, mais moins propre car elles ne sont pas liées à l'import legacy.

**Recommandation finale : Batch 48**

