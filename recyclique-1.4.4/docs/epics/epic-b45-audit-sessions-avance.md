# EPIC-B45: Audit Sessions Avancé - Améliorations d'Audit et d'Analyse

**Statut:** Draft  
**Module:** Frontend Admin + Backend API  
**Priorité:** Moyenne (après B44-P4)

## 1. Contexte

Suite à l'analyse des besoins d'audit (voir `docs/audits/analyse-besoins-audit-sessions.md`), il a été identifié que les interfaces "Sessions de Caisse" et "Sessions de Réception" sont suffisantes pour un audit basique mais manquent de fonctionnalités essentielles pour un audit efficace et approfondi.

Cet epic regroupe toutes les améliorations nécessaires pour rendre l'audit 10x plus efficace, organisées en 3 phases selon leur priorité.

## 2. Objectif

Améliorer significativement les capacités d'audit et d'analyse des sessions de caisse et de réception en ajoutant :
- Export global multi-sessions/tickets
- Filtres avancés
- Format Excel
- Comparaisons périodes
- Détection d'anomalies
- Visualisations
- Traçabilité complète
- Rapports programmés
- Interface avancée

## 3. Portée

**Sessions concernées** :
- Sessions de Caisse (`SessionManager.tsx`)
- Sessions de Réception (`ReceptionSessionManager.tsx` - à créer dans B44-P4)

**Fonctionnalités** :
- Export et rapports
- Filtres et recherche
- Analyses et visualisations
- Traçabilité
- Automatisation

## 4. Critères d'acceptation Epic

1. **Phase 1 (Priorité HAUTE)** : Export global, filtres avancés, format Excel implémentés
2. **Phase 2 (Priorité MOYENNE)** : Comparaisons, détection anomalies, visualisations implémentées
3. **Phase 3 (Priorité BASSE)** : Traçabilité, rapports programmés, interface avancée implémentées
4. **Cohérence** : Toutes les fonctionnalités disponibles pour Sessions de Caisse ET Sessions de Réception
5. **Performance** : Exports et analyses performants même avec grandes quantités de données
6. **Documentation** : Guides utilisateur mis à jour pour toutes les nouvelles fonctionnalités

## 5. Stories

### Story Préalable : Design UX

#### Story B45-P0: Design UX Audit Avancé - Architecture Interface
**Objectif** : Définir l'architecture d'interface avant toute implémentation

**Critères d'acceptation** :
- Document de design complet avec wireframes/mockups
- Patterns d'interface pour chaque fonctionnalité
- Stratégie de découverte progressive (mode expert)
- Validation PO + Tech Lead + UX

**Estimation** : 3 points  
**Prérequis** : Aucun  
**Blocker** : Toutes les autres stories B45-P1 à P9

### Phase 1 : Fondations (Priorité HAUTE)

#### Story B45-P1: Export Global Multi-Sessions/Tickets
**Objectif** : Permettre d'exporter toutes les sessions/tickets filtrés en une fois

**Critères d'acceptation** :
- Bouton "Exporter toutes les sessions filtrées" dans SessionManager
- Bouton "Exporter tous les tickets filtrés" dans ReceptionSessionManager
- Format CSV consolidé (toutes les sessions dans un fichier)
- Format Excel avec onglets (Résumé + Détails)
- Endpoints API : `POST /v1/admin/reports/cash-sessions/export-bulk` et `/v1/admin/reports/reception-tickets/export-bulk`

**Estimation** : 5 points

#### Story B45-P2: Filtres Avancés
**Objectif** : Ajouter des filtres avancés pour cibler précisément les sessions/tickets

**Critères d'acceptation** :
- **Sessions de Caisse** : Montant min/max, variance (oui/non ou seuil), durée session, méthode paiement, présence don
- **Sessions de Réception** : Poids min/max, catégorie (multi-sélection), destination (multi-sélection), nombre lignes min/max
- Filtres combinables (ET logique)
- Sauvegarde filtres dans URL (partageable)

**Estimation** : 3 points

#### Story B45-P3: Format Excel avec Mise en Forme
**Objectif** : Ajouter export Excel avec mise en forme professionnelle

**Critères d'acceptation** :
- Export Excel avec bibliothèque (ex: `xlsx` ou `exceljs`)
- Mise en forme : en-têtes en gras, couleurs, bordures
- Onglets : Résumé, Détails, Graphiques (optionnel)
- Formules : Totaux, moyennes automatiques
- Compatible Excel et LibreOffice

**Estimation** : 5 points

### Phase 2 : Analyses (Priorité MOYENNE)

#### Story B45-P4: Comparaisons Périodes
**Objectif** : Permettre de comparer des périodes (semaine vs semaine, mois vs mois)

**Critères d'acceptation** :
- Sélecteur "Comparer avec" : Semaine précédente, Mois précédent, Année précédente, Période personnalisée
- Affichage côte à côte : Période actuelle vs Période de comparaison
- Différences : +X% ou -X% pour chaque KPI
- Graphiques comparatifs (barres groupées)

**Estimation** : 5 points

#### Story B45-P5: Détection d'Anomalies
**Objectif** : Automatiser la détection de sessions/tickets nécessitant attention

**Critères d'acceptation** :
- Badge "⚠️" sur sessions avec variance > seuil (configurable, ex: 10€)
- Badge "⚠️" sur sessions avec durée anormale (ex: > 12h)
- Badge "⚠️" sur tickets avec poids anormalement élevé
- Filtre "Afficher uniquement les anomalies"
- Section dédiée "Sessions nécessitant attention"
- Configuration des seuils dans settings admin

**Estimation** : 5 points

#### Story B45-P6: Visualisations Basiques
**Objectif** : Ajouter des graphiques pour faciliter la compréhension des données

**Critères d'acceptation** :
- Graphique linéaire : Évolution CA/poids par jour
- Graphique en barres : CA/poids par opérateur/bénévole
- Graphique camembert : Répartition par site/catégorie
- Bibliothèque : `recharts` ou `chart.js`
- Export graphiques en PNG/PDF

**Estimation** : 8 points

### Phase 3 : Expert (Priorité BASSE)

#### Story B45-P7: Traçabilité Complète
**Objectif** : Ajouter historique des modifications et logs d'accès

**Critères d'acceptation** :
- Onglet "Historique" dans détail session/ticket
- Liste des modifications (qui, quand, quoi)
- Log des accès (qui a consulté)
- Commentaires d'audit (champ texte libre)
- Export historique en CSV

**Estimation** : 5 points

#### Story B45-P8: Rapports Programmés
**Objectif** : Automatiser les exports récurrents

**Critères d'acceptation** :
- Interface de configuration (fréquence, destinataires, format)
- Jobs en arrière-plan (cron)
- Envoi par email avec pièce jointe
- Logs des envois
- Gestion erreurs (retry, notifications)

**Estimation** : 8 points

#### Story B45-P9: Interface Avancée
**Objectif** : Améliorer l'expérience utilisateur pour audits fréquents

**Critères d'acceptation** :
- Bouton "Sauvegarder cette vue" (nom, filtres, colonnes)
- Liste des vues sauvegardées
- Colonnes personnalisables (drag & drop, show/hide)
- Export de la vue actuelle (tableau tel qu'affiché)
- Mode impression optimisé

**Estimation** : 5 points

## 6. Dépendances

- **B44-P4** : Doit être complété avant de commencer cet epic (Sessions de Réception doit exister)
- **B45-P0** : Doit être complété AVANT toutes les autres stories (design UX préalable)
- **Phase 1 → Phase 2** : Les exports globaux (P1) sont prérequis pour les comparaisons (P4)
- **Phase 2 → Phase 3** : Les visualisations (P6) peuvent être utilisées dans les rapports programmés (P8)

## 7. Risques

1. **Performance** : Exports globaux avec grandes quantités de données
   - **Mitigation** : Pagination serveur, streaming, limites raisonnables

2. **Complexité Excel** : Génération Excel avec mise en forme peut être complexe
   - **Mitigation** : Utiliser bibliothèque mature, tests approfondis

3. **Rapports programmés** : Nécessite infrastructure de jobs (cron, queue)
   - **Mitigation** : Utiliser solution existante (Celery, RQ) ou simple cron

4. **Compatibilité** : Excel doit fonctionner sur différents systèmes
   - **Mitigation** : Tests sur Windows, Mac, Linux, LibreOffice

## 8. Métriques de Succès

- **Efficacité** : Réduction de 90% du temps nécessaire pour exporter 100 sessions (de 100 clics à 1 clic)
- **Adoption** : 80% des admins utilisent les nouvelles fonctionnalités dans les 2 semaines
- **Satisfaction** : Score de satisfaction > 4/5 pour les fonctionnalités d'audit
- **Performance** : Exports globaux < 30 secondes pour 1000 sessions

## 9. Plan d'Implémentation

### Sprint 0 : Design UX
- B45-P0 : Design UX Architecture Interface

### Sprint 1-2 : Phase 1 (Fondations)
- B45-P1 : Export Global
- B45-P2 : Filtres Avancés
- B45-P3 : Format Excel

### Sprint 3-4 : Phase 2 (Analyses)
- B45-P4 : Comparaisons Périodes
- B45-P5 : Détection Anomalies
- B45-P6 : Visualisations

### Sprint 5-6 : Phase 3 (Expert)
- B45-P7 : Traçabilité
- B45-P8 : Rapports Programmés
- B45-P9 : Interface Avancée

**Durée totale estimée** : 7 sprints (14 semaines) - incluant design UX

## 10. Références

- **Audit refonte** : `docs/audits/audit-refonte-rapports-sessions.md`
- **Analyse besoins** : `docs/audits/analyse-besoins-audit-sessions.md`
- **Composants référence** : `frontend/src/pages/Admin/SessionManager.tsx`

## 11. Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-01-27 | 1.0 | Création epic initial | Sarah (PO) |

