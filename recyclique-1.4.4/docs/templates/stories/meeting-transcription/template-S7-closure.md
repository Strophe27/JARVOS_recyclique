# Story S7: Vérification & Clôture

**Statut:** Draft  
**Épopée:** [${epic_ref}](../../../epics/${meeting_id}.md)  
**Module:** BMAD Workflow - PO  
**Priorité:** Moyenne  
**Meeting ID:** ${meeting_id}  
**Date:** ${date}  
**Participants:** ${participants}

---

## 1. Contexte

Le workflow doit être clôturé avec vérification finale de cohérence et archivage optionnel.

**Prérequis :**
- Story S6 complétée (compte-rendu final généré)

**Problème :**
- Pas de vérification finale de cohérence
- Pas de clôture formelle du workflow

**Informations de la réunion :**
- **Meeting ID :** ${meeting_id}
- **Date :** ${date}
- **Participants :** ${participants}

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
   - Affiche chemin du compte-rendu final : `${final_dir}compte-rendu.md`
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

- **Dossier de réunion :** `./meetings/${meeting_id}/`
- **Dossier final :** `${final_dir}`
- **Compte-rendu final :** `${final_dir}compte-rendu.md`

---

**Fin de la story**





