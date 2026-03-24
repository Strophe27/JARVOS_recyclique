# Documentation Module Éco-organismes

## Vue d'Ensemble

Ce dossier contient la documentation complète pour le développement du module de gestion des éco-organismes dans RecyClique. Ce module permettra de gérer les déclarations trimestrielles aux partenaires REP (Responsabilité Élargie du Producteur) et d'automatiser le suivi des soutiens financiers.

## Phase Actuelle

**🔬 ÉTUDES** - Documentation et conception technique

La phase d'études est maintenant complète. Les prochaines étapes sont :
1. Validation par l'équipe technique et métier
2. Analyse du codebase existant (deposits, inventory, cash_sessions)
3. Prototypage des interfaces utilisateur
4. Planification des sprints de développement

---

## Documents Disponibles

### 📋 [00-besoins-utilisateur.md](00-besoins-utilisateur.md)
**Récapitulatif des Besoins Utilisateur**

Document de référence présentant :
- Contexte et objectifs du module
- Besoins fonctionnels détaillés
- Intégration avec les modules existants
- Priorités de développement
- Questions techniques à résoudre

**👥 Public cible** : Chefs de projet, Product Owners, Équipe métier

**📅 Quand le consulter** :
- Au démarrage du projet
- Pour comprendre la vision globale
- Lors de réunions de cadrage

---

### 📖 [01-fiche-eco-maison.md](01-fiche-eco-maison.md)
**Fiche Technique eco-maison**

Documentation exhaustive sur le partenaire eco-maison :
- Présentation et filières couvertes (DEA, Jouets, ABJ)
- Système de déclarations trimestrielles
- Catégories et sous-catégories détaillées
- Méthodes de déclaration (pesées vs. comptages)
- Soutiens financiers et barèmes
- Consignes de tri et cas particuliers
- FAQ et contacts

**👥 Public cible** : Tous (référence complète)

**📅 Quand le consulter** :
- Lors de la configuration d'eco-maison
- Pour comprendre les règles métier
- En cas de doute sur une catégorie
- Avant les déclarations trimestrielles

**📄 Pages** : ~65 pages de documentation structurée

---

### 🗄️ [02-modele-donnees.md](02-modele-donnees.md)
**Modèle de Données Complet**

Architecture technique de la base de données :
- 9 entités principales avec tous les champs
- Schéma relationnel (ERD textuel)
- Contraintes et validations SQL
- Index et optimisations
- Triggers et automatismes
- Extensions aux modules existants
- Vues matérialisées pour performance
- Scripts de migration Alembic
- Données de seed pour eco-maison

**👥 Public cible** : Développeurs Backend, Architectes, DBA

**📅 Quand le consulter** :
- Avant de commencer le développement
- Pour créer les migrations de base de données
- Lors de l'implémentation des modèles SQLAlchemy
- Pour comprendre les relations entre tables

**🔧 Contient** : Code SQL, Python (SQLAlchemy), triggers, migrations

---

### 🎨 [03-specifications-fonctionnelles.md](03-specifications-fonctionnelles.md)
**Spécifications Fonctionnelles et UI/UX**

Description complète des fonctionnalités et interfaces :
- Architecture fonctionnelle du module
- Maquettes ASCII des pages principales
- Workflows utilisateur détaillés (4 étapes déclaration)
- 40+ API endpoints documentés
- Règles de gestion métier
- Système de permissions et rôles
- Notifications et rappels automatiques
- Cas d'usage détaillés
- Roadmap des améliorations futures

**👥 Public cible** : Développeurs Frontend/Backend, UI/UX Designers, Testeurs

**📅 Quand le consulter** :
- Avant le développement de chaque fonctionnalité
- Pour implémenter les interfaces utilisateur
- Pour développer les API
- Lors de la rédaction des tests

**🖼️ Contient** : Maquettes, workflows, spécifications API, règles métier

---

### 🗺️ [04-guide-mapping-categories.md](04-guide-mapping-categories.md)
**Guide Pratique de Mapping des Catégories**

Guide opérationnel pour créer les correspondances catégories :
- Méthodologie de mapping étape par étape
- Guide catégorie par catégorie pour eco-maison
- 30+ exemples de mappings recommandés
- Cas particuliers et arbres de décision
- Matrice de mapping complète
- Workflow de création et maintenance
- Bonnes pratiques et pièges à éviter
- Troubleshooting (résolution de problèmes)
- Checklist de validation

**👥 Public cible** : Utilisateurs finaux, Administrateurs, Équipe opérationnelle

**📅 Quand le consulter** :
- Lors de la configuration initiale des mappings
- En cas de doute sur une correspondance
- Pour former les utilisateurs
- Lors de l'ajout de nouvelles catégories
- En révision trimestrielle

**✅ Contient** : Exemples concrets, tableaux de correspondance, procédures

---

## Structure du Module

### Vue Schématique

```
MODULE ÉCO-ORGANISMES
│
├── Configuration (Admin)
│   ├── Gestion des partenaires (eco-maison, autres REP)
│   ├── Catégories éco-organismes (hiérarchies)
│   ├── Taux de soutien financier
│   ├── Mapping des catégories (RecyClique ↔ Éco-organisme)
│   └── Rappels automatiques
│
├── Déclarations (Utilisateurs)
│   ├── Tableau de bord (périodes, statuts)
│   ├── Création/Édition déclaration (4 étapes)
│   ├── Calcul automatique des poids (agrégation)
│   ├── Soumission et validation
│   └── Historique et archivage
│
├── Suivi Financier (Finance)
│   ├── Soutiens validés / reçus / en attente
│   ├── Proforma et paiements
│   ├── Écarts et alertes
│   └── Exports comptables
│
└── Reporting (Tous)
    ├── Rapports trimestriels/annuels
    ├── Exports (PDF, Excel, CSV, JSON)
    └── Graphiques et statistiques
```

---

## Points Clés du Système

### ✨ Fonctionnalités Principales

1. **Multi-partenaires** : Support de plusieurs éco-organismes avec configurations spécifiques
2. **Mapping intelligent** : Correspondances automatiques entre catégories internes et externes
3. **Calcul automatique** : Agrégation des poids par période et catégorie via mappings
4. **Déclarations guidées** : Workflow en 4 étapes avec pré-remplissage automatique
5. **Rappels automatiques** : Notifications par email avant les échéances
6. **Suivi financier** : Traçabilité complète des soutiens (validés → reçus)
7. **Exports multiples** : Formats PDF, Excel, CSV, JSON

### 🔗 Intégrations Nécessaires

Le module s'intègre avec les modules existants de RecyClique :

1. **Deposits (Dépôts)** → Flux RECEIVED (objets reçus/gisements)
2. **Inventory (Stock)** → Suivi des objets en cours
3. **Cash Sessions (Caisse)** → Flux REUSED (objets vendus/réemployés)
4. **Processing (Traitement)** → Flux RECYCLED (objets recyclés/détruits)
5. **Categories** → Base pour le mapping

**⚠️ Important** : Une analyse approfondie du codebase existant est nécessaire pour identifier précisément les points d'intégration.

---

## Entités de Base de Données

Les 9 tables principales à créer :

| Table | Rôle | Nombre de lignes estimé |
|-------|------|-------------------------|
| `eco_organisms` | Partenaires éco-organismes | ~10 (1 par partenaire) |
| `eco_organism_categories` | Catégories par éco-organisme | ~50-100 par partenaire |
| `support_rates` | Taux de soutien financier | ~150 (par catégorie × flux) |
| `category_mappings` | Correspondances catégories | ~100-200 |
| `declaration_periods` | Périodes trimestrielles | ~40/an (4 trimestres × 10 partenaires) |
| `declarations` | Déclarations complètes | ~40/an |
| `declaration_items` | Lignes de détail | ~500/an (déclaration × catégories) |
| `reminders` | Rappels automatiques | ~200/an |
| `deposit_eco_tracking` | Extension dépôts | Autant que `deposits` |

**Total estimé** : ~2000-3000 lignes/an + données référentielles

---

## Cas d'Usage Principal : Déclaration T1 2025 eco-maison

### Workflow Complet (Exemple)

#### **J-30 avant ouverture** : Système prépare la période
- Création automatique de la période "T1 2025"
- Planification des rappels (ouverture, intermédiaire, urgent, clôture)

#### **01/04/2025** : Ouverture fenêtre de déclaration
- Email automatique aux déclarants : "Période T1 2025 ouverte jusqu'au 15/05"
- Statut période : PENDING → OPEN

#### **05/04/2025** : Déclarant crée la déclaration
1. **Connexion** à RecyClique, accès `/declarations`
2. **Étape 1 - Récapitulatif** :
   - Système calcule automatiquement les poids par catégorie eco-maison
   - Basé sur les dépôts (janv-mars) et ventes (janv-mars) via mappings
   - Affiche : 1385 kg reçus, 1020 kg réemployés, 350 kg recyclés
3. **Étape 2 - Saisie détaillée** :
   - Déclarant parcourt chaque catégorie (DEA Assise, Couchage, etc.)
   - Valeurs pré-remplies, possibilité d'ajuster
   - Calcul automatique des soutiens (30€/t reçu, 130€/t réemployé)
4. **Étape 3 - Validation** :
   - Révision totaux : 1505 kg reçus, 1110 kg réemployés, 395 kg recyclés
   - Soutiens totaux : 189.45 €
   - Ajout de notes et pièces jointes (tickets de pesée PDF)
5. **Étape 4 - Soumission** :
   - Déclarant clique "Soumettre"
   - Statut : DRAFT → SUBMITTED
   - Télécharge accusé de réception PDF

#### **20/04/2025** : eco-maison valide la déclaration
- Statut : SUBMITTED → VALIDATED
- Notification email au déclarant

#### **05/05/2025** : Proforma émis
- eco-maison émet proforma n°PRO-2025-T1-XXX : 189.45 €
- Enregistré dans RecyClique

#### **10/06/2025** : Paiement reçu
- Virement de 189.45 € reçu
- Responsable finance enregistre le paiement dans RecyClique
- Statut : VALIDATED → CLOSED

#### **Résultat** : ✅ Déclaration complète, tracée, soutiens perçus

---

## Prochaines Étapes (Action Items)

### Phase 1 : Validation (1-2 semaines)
- [ ] Revue de la documentation par l'équipe technique
- [ ] Revue par l'équipe métier (responsables déclarations)
- [ ] Validation du modèle de données par le DBA
- [ ] Validation des maquettes par l'UX/UI designer
- [ ] Identification des ajustements nécessaires

### Phase 2 : Analyse Technique (2-3 semaines)
- [ ] Audit du codebase existant (modules deposits, inventory, cash_sessions)
- [ ] Schéma de la base de données actuelle (export ERD)
- [ ] Identification des points d'intégration précis
- [ ] Évaluation de l'impact sur les modules existants
- [ ] Définition de la stratégie de migration de données

### Phase 3 : Prototypage (2-3 semaines)
- [ ] Création de maquettes haute-fidélité (Figma/Adobe XD)
- [ ] Prototype interactif du workflow de déclaration
- [ ] Tests utilisateurs avec l'équipe opérationnelle
- [ ] Ajustements UX/UI selon feedback

### Phase 4 : Planification Développement (1 semaine)
- [ ] Découpage en stories/epics
- [ ] Estimation des charges (story points)
- [ ] Planification des sprints (6-8 sprints estimés)
- [ ] Définition des critères d'acceptation
- [ ] Préparation de l'environnement de développement

### Phase 5 : Développement (3-4 mois)
- [ ] Sprint 1-2 : Modèle de données + Configuration partenaires
- [ ] Sprint 3-4 : Mapping catégories + Agrégation poids
- [ ] Sprint 5-6 : Déclarations + Suivi financier
- [ ] Sprint 7-8 : Rappels + Exports + Tests finaux

---

## Ressources Complémentaires

### Fichiers Source
- 📄 `docs/eco-organismes/eco-maison/Consignes de tri DEA Jouets ABJ - ESS - Nov. 2024.pdf`
- 📄 `docs/eco-organismes/eco-maison/-EA-JJ-ABJ- Mode Opératoire - Déclarations ESS - Juillet 2025.pdf`

### Liens Utiles
- Site eco-maison : www.eco-maison.com (à vérifier)
- Documentation REP : https://www.ecologie.gouv.fr/rep
- RecyClique Docs : [docs/prd/](../prd/) et [docs/architecture/](../architecture/)

### Contacts
- **Équipe Projet** : (à compléter)
- **Sponsor** : (à compléter)
- **Référent eco-maison** : (à compléter)

---

## Statistiques de Documentation

**📊 Volume produit** :
- 5 documents techniques
- ~350 pages équivalent A4
- ~50 000 mots
- 9 entités de base de données
- 40+ API endpoints
- 30+ maquettes ASCII
- 10+ workflows détaillés
- 100+ exemples de mappings

**⏱️ Temps de lecture estimé** :
- Survol : 1h
- Lecture complète : 6-8h
- Étude approfondie : 2-3 jours

---

## Contributeurs

- **Analyse et Documentation** : Claude Code (Anthropic)
- **Basé sur** : PDFs eco-maison (Nov. 2024, Juil. 2025)
- **Pour** : RecyClique - La Clique Qui Recycle
- **Date** : Novembre 2025 (2025-11-20)
- **Version** : 1.0 - Phase ÉTUDES

---

## Notes de Version

### v1.0 (2025-11-20) - Phase ÉTUDES
- ✅ Analyse complète des besoins utilisateur
- ✅ Documentation eco-maison exhaustive
- ✅ Modèle de données complet (9 entités)
- ✅ Spécifications fonctionnelles détaillées
- ✅ Guide pratique de mapping des catégories
- ✅ Prêt pour validation et développement

---

**🎯 Objectif Final** : Simplifier les déclarations REP, automatiser les calculs, maximiser les soutiens financiers perçus par RecyClique.

**💡 Vision** : Un système flexible, évolutif, capable de gérer facilement de nouveaux partenaires éco-organismes au fil du temps.

---

**Bon développement ! 🚀**
