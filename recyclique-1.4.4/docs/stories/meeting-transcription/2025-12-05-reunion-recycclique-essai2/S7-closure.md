# Story S7: Vérification & Clôture

**Statut:** Draft  
**Épopée:** [docs/epics/2025-12-05-reunion-recycclique-essai2.md](../../../epics/2025-12-05-reunion-recycclique-essai2.md)  
**Module:** BMAD Workflow - PO  
**Priorité:** Moyenne  
**Meeting ID:** 2025-12-05-reunion-recycclique-essai2  
**Date:** 2025-12-05  
**Participants:** Christophe, Christel/Germaine, Olivier/Olive, Caro, Gaby (distanciel)

---

## 1. Contexte

Le workflow doit être clôturé avec vérification finale de cohérence et archivage optionnel.

**Prérequis :**
- Story S6 complétée (compte-rendu final généré)

**Problème :**
- Pas de vérification finale de cohérence
- Pas de clôture formelle du workflow

**Informations de la réunion :**
- **Meeting ID :** 2025-12-05-reunion-recycclique-essai2
- **Date :** 2025-12-05
- **Participants :** Christophe, Christel/Germaine, Olivier/Olive, Caro, Gaby (distanciel)

---

## 2. User Story

En tant que **PO BMAD**,  
je veux **vérifier la cohérence finale et clôturer le workflow**,  
afin de **garantir la qualité et permettre l'archivage**.

---

## 3. Critères d'acceptation

### 3.1. Vérification artefacts

1. **Task `verify_artifacts_consistency`**
   - Vérifie structure de dossiers (tous présents)
   - Vérifie métadonnées (meeting-id cohérent, timestamps cohérents)
   - Vérifie chemins (tous référencés existent)
   - Vérifie complétude (tous segments ont résumé, tous résumés référencés)
   - Génère rapport de vérification avec statut global

### 3.2. Clôture et archivage

1. **Task `approve_and_archive`**
   - Affiche résumé final avec tous les artefacts
   - Affiche chemin du compte-rendu final : `meetings/2025-12-05-reunion-recycclique-essai2/final/compte-rendu.md`
   - Demande validation utilisateur
   - Si archivage demandé : crée archive ou déplace vers `archives/`
   - Confirme clôture

---

## 4. Tâches

- [ ] **T1 – Vérification cohérence**
  - Implémenter `verify_artifacts_consistency` task
  - Vérification structure, métadonnées, chemins, complétude

- [ ] **T2 – Clôture et archivage**
  - Implémenter `approve_and_archive` task
  - Validation utilisateur
  - Archivage optionnel

---

## 5. Dépendances

- **Pré-requis :** Story S6 (compte-rendu final généré)
- **Bloque :** Aucune (fin du workflow)

---

## 6. Livrables

- Rapport de vérification
- Validation finale
- Archivage (si demandé)

---

## 7. Chemins de travail

- **Dossier de réunion :** `./meetings/2025-12-05-reunion-recycclique-essai2/`
- **Dossier final :** `meetings/2025-12-05-reunion-recycclique-essai2/final/`
- **Compte-rendu final :** `meetings/2025-12-05-reunion-recycclique-essai2/final/compte-rendu.md`

---

**Fin de la story**





