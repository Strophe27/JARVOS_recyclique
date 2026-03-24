# Epic 50: Améliorations Exports, Permissions et Statistiques

**Statut:** In Progress  
**Version:** v1.4.1  
**Date:** 2025-01-27  
**Module:** Frontend Admin + Backend API  
**Priorité:** Haute  
**Auteur:** BMad Orchestrator

---

## 1. Contexte

Suite à l'investigation approfondie des besoins d'amélioration, cet epic regroupe :
- Atomisation des exports de cessions de caisse (détails par ticket)
- Correction des bugs d'export réception (400 et 500)
- Séparation des autorisations caisse virtuelle et différée
- Ajout des statistiques matières sorties sur le dashboard
- Correction bugs critiques caisse virtuelle/différée (suite B50-P4)
- Refactoring unification stores caisse

## 2. Objectif

Améliorer les capacités d'export, de gestion des permissions et d'analyse statistique pour :
- Permettre des analyses détaillées de sortie de produits par catégorie
- Corriger les dysfonctionnements d'export réception
- Offrir une gestion fine des permissions par type de caisse
- Compléter les statistiques dashboard avec les sorties

## 3. Portée

**Modules concernés :**
- Exports (caisse et réception)
- Gestion des permissions et groupes
- Dashboard et statistiques

**Fonctionnalités :**
- Export Excel atomisé avec détails tickets
- Correction bugs export réception
- Permissions granulaires caisse
- Statistiques sorties par catégorie

## 4. Critères d'acceptation Epic

1. **Exports atomisés** : Export Excel caisse avec onglet détaillé par ticket et catégorie principale
2. **Bugs corrigés** : Exports réception CSV/XLS fonctionnels (400 et 500 résolus)
3. **Permissions séparées** : 3 permissions distinctes (caisse, virtuelle, différée) avec migration
4. **Stats sorties** : Graphiques statistiques matières sorties sur dashboard
5. **Tests** : Tous les bugs investigués avec tests de régression

## 5. Stories

### Story B50-P1: Atomisation Export Cessions de Caisse - Détails Tickets
**Statut:** Done  
**Priorité:** P1  
**Objectif** : Ajouter un onglet "Détails Tickets" dans l'export Excel avec une ligne par item de vente, groupé par catégorie principale

**Référence** : `docs/stories/story-b50-p1-atomisation-export-caisse.md`

### Story B50-P2: Correction Bug 400 - Export Réception CSV/XLS
**Statut:** Done  
**Priorité:** P0 (Bug critique)  
**Objectif** : Corriger l'erreur 400 lors de l'export bulk réception (validation dates)

**Référence** : `docs/stories/story-b50-p2-bug-400-export-reception.md`

### Story B50-P3: Correction Bug 500 - Export CSV Ticket Individuel
**Statut:** Done  
**Priorité:** P0 (Bug critique)  
**Objectif** : Corriger l'erreur 500 lors de l'export CSV d'un ticket de réception individuel

**Référence** : `docs/stories/story-b50-p3-bug-500-export-ticket-csv.md`

### Story B50-P4: Séparation Permissions Caisse Virtuelle et Différée
**Statut:** Done  
**Priorité:** P1  
**Objectif** : Créer 2 nouvelles permissions distinctes et mettre à jour les routes

**Référence** : `docs/stories/story-b50-p4-permissions-caisse-separees.md`

### Story B50-P5: Statistiques Matières Sorties - Dashboard
**Statut:** Done  
**Priorité:** P1  
**Objectif** : Ajouter les graphiques de statistiques matières sorties sur dashboard et page d'accueil

**Référence** : `docs/stories/story-b50-p5-stats-sorties-dashboard.md`

### Story B50-P6: Investigation Bug Prix Global - Désactivation Subite
**Statut:** Done  
**Priorité:** P0 (Bug critique production)  
**Objectif** : Investiguer et corriger le bug où le mode prix global se désactive subitement en production

**Référence** : `docs/stories/story-b50-p6-bug-prix-global-desactivation.md`

### Story B50-P7: Badge "Environnement de test" en Staging
**Statut:** Done  
**Priorité:** P1  
**Objectif** : Ajouter un badge d'avertissement "Environnement de test" sur le header en staging pour éviter les confusions avec la production

**Référence** : `docs/stories/story-b50-p7-badge-environnement-test-staging.md`

### Story B50-P8: Page Analyse Rapide - Comparaison de Périodes
**Statut:** Done  
**Priorité:** P1  
**Objectif** : Créer une page d'analyse rapide pour comparer les statistiques de sortie entre deux périodes, accessible depuis le gestionnaire de sessions

**Référence** : `docs/stories/story-b50-p8-analyse-rapide-comparaison-periodes.md`

### Story B50-P9: Bug Critique - Correction Bugs Caisse Virtuelle/Différée
**Statut:** Todo  
**Priorité:** P0 (Critique)  
**Objectif** : Corriger les 4 bugs critiques identifiés dans les stores caisse virtuelle/différée (overrideTotalAmount, préremplissage, fermeture session, écran fermeture)

**Référence** : `docs/stories/story-b50-p9-bug-critique-caisses-virtuelles-differees.md`

### Story B50-P10: Refactoring - Unification Stores Caisse
**Statut:** Todo  
**Priorité:** P2  
**Objectif** : Créer une interface commune et factoriser la logique partagée entre les 3 stores caisse pour garantir la cohérence et faciliter la maintenance

**Référence** : `docs/stories/story-b50-p10-refactoring-unification-stores-caisse.md`  
**Dépendance:** B50-P9 (doit être complétée d'abord)

## 6. Dépendances

- B50-P2 et B50-P3 doivent être investigués AVANT correction (voir instructions dans stories)
- B50-P4 nécessite une migration de base de données
- B50-P5 dépend de l'API stats existante
- B50-P9 doit être investiguée AVANT correction (voir instructions dans story)
- B50-P10 dépend de B50-P9 (refactoring après correction bugs)

## 7. Estimation Globale

- B50-P1: 5 points
- B50-P2: 3 points (investigation + correction)
- B50-P3: 3 points (investigation + correction)
- B50-P4: 5 points (migration + frontend + backend)
- B50-P5: 5 points
- B50-P6: 5 points (investigation approfondie + correction)
- B50-P7: 3 points (modifications simples + déploiement staging)
- B50-P8: 5 points (page complète avec composants réutilisables)
- B50-P9: 5-7 points (correction 4 bugs critiques)
- B50-P10: 8-12 points (refactoring architecture)

**Total Epic:** 47-53 points

