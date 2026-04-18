# Besoins Utilisateur - Module Éco-organismes

## Contexte
RecyClique doit développer un module de gestion des partenariats avec les éco-organismes (REP - Responsabilité Élargie du Producteur) pour faciliter les déclarations obligatoires et le suivi des soutiens financiers.

## Objectif Principal
Créer un espace dans RecyClique permettant de gérer plusieurs partenaires éco-organismes avec leurs spécificités, tout en maintenant un système de déclaration commun.

## Phase Actuelle
**ÉTUDES** - Analyse des besoins et conception du système

## Besoins Fonctionnels

### 1. Gestion Multi-Partenaires
- **Objectif**: Supporter plusieurs éco-organismes (eco-maison, autres REP à venir)
- **Contrainte**: Chaque éco-organisme a ses propres catégories, modalités, dates, et taux de soutien
- **Besoin**: Structure flexible permettant de définir des configurations spécifiques par partenaire

### 2. Suivi des Déclarations

#### 2.1 Objets à Déclarer
Le système doit tracker trois flux principaux:
- **Objets reçus** (entrées/gisements)
- **Objets recyclés** (destruction/valorisation)
- **Objets vendus/sortis** (réemploi/ventes)

#### 2.2 Modalités de Déclaration
- **Périodes**: Déclarations trimestrielles (T1, T2, T3, T4)
- **Méthodes**: Support de deux modes
  - Déclaration par pesée (poids réel)
  - Déclaration par comptage (conversion via abaques)
- **Données requises**: Poids, quantités, catégories, dates

#### 2.3 Dates et Échéances
- **Début de période de déclaration** (ex: 1er jour du trimestre suivant)
- **Fin de période de déclaration** (ex: 45 jours après début)
- **Rappels automatiques**: Système d'alertes avant les échéances
- **Historique**: Conservation des déclarations passées

### 3. Gestion des Catégories

#### 3.1 Catégories Éco-organismes
- Chaque partenaire a sa propre hiérarchie de catégories
- **Exemple eco-maison**:
  - DEA (Éléments d'Ameublement): Assise, Couchage, Rangement, Plan de pose, Décoration textile
  - Jouets: 3 catégories principales
  - ABJ (Brico-Jardin): 2 catégories avec sous-catégories

#### 3.2 Mapping des Catégories
- **Besoin critique**: Correspondance entre catégories RecyClique et catégories éco-organismes
- **Objectif**: Comptabilisation automatique des poids par catégorie éco-organisme
- **Granularité**: Une catégorie RecyClique peut correspondre à plusieurs catégories éco-organismes
- **Flux**: Le mapping doit s'appliquer aux 3 flux (reçu, recyclé, vendu)

### 4. Comptabilisation Automatique des Poids

#### 4.1 Agrégation par Période
- Calcul automatique des totaux par période de déclaration
- Agrégation par catégorie éco-organisme selon le mapping
- Distinction des trois flux (entrées, recyclage, sorties)

#### 4.2 Sources de Données
À identifier dans le codebase existant:
- Module de gestion des dépôts (deposits)
- Module de gestion des stocks (inventory)
- Module de caisse/ventes (cash sessions)
- Pesées et mesures existantes

### 5. Champs Libres et Notes
- **Opérations spéciales**: Champ pour noter des événements particuliers
- **Partenariats saisonniers**: Informations contextuelles
- **Remarques**: Tout élément utile pour la déclaration
- **Attachements**: Possibilité de joindre des documents justificatifs

### 6. Préparation des Données
- **Export des données**: Format compatible avec les plateformes de déclaration
- **Validation pré-déclaration**: Vérification de la complétude des données
- **Récapitulatifs**: Tableaux de bord avec les données à déclarer
- **Simulation**: Calcul prévisionnel des soutiens financiers

### 7. Suivi Financier
- Montants des soutiens par catégorie et type d'activité
- Suivi des proforma et paiements reçus
- Historique des versements par éco-organisme

## Intégration avec l'Existant

### Modules RecyClique à Connecter
1. **Gestion des dépôts** (deposit management)
   - Source: poids et catégories des objets reçus
   - Lien: Flux "objets reçus"

2. **Gestion des stocks** (inventory)
   - Source: objets en stock, catégorisés
   - Lien: Suivi des mouvements

3. **Sessions de caisse** (cash sessions)
   - Source: ventes et sorties
   - Lien: Flux "objets vendus/sortis"

4. **Traitement des objets** (processing)
   - Source: décisions de recyclage/destruction
   - Lien: Flux "objets recyclés"

5. **Système de catégories existant**
   - Base pour le mapping vers catégories éco-organismes
   - Nécessite analyse de la structure actuelle

### Données Existantes à Exploiter
- Pesées (poids des objets)
- Dates des opérations (dépôt, vente, recyclage)
- Catégorisation actuelle des objets
- Statuts des objets (accepted, sold, recycled, destroyed)

## Architecture Proposée

### Entités Principales
1. **EcoOrganism** (Partenaire)
   - Informations générales (nom, contact, etc.)
   - Configuration spécifique

2. **DeclarationPeriod** (Période de déclaration)
   - Dates de début/fin
   - Trimestre/année
   - Statut (en cours, clôturée, déclarée)

3. **EcoOrganismCategory** (Catégories par partenaire)
   - Hiérarchie de catégories
   - Taux de soutien

4. **CategoryMapping** (Mapping)
   - Correspondance RecyClique ↔ Éco-organisme
   - Par flux (received, recycled, sold)

5. **Declaration** (Déclaration)
   - Données agrégées par période
   - Poids/quantités par catégorie et flux
   - Statut et historique

6. **DeclarationItem** (Ligne de déclaration)
   - Détail par catégorie
   - Flux concerné
   - Poids/quantité
   - Montant du soutien

### Services à Développer
1. **DeclarationService**
   - Agrégation des données
   - Calcul des totaux
   - Génération des exports

2. **CategoryMappingService**
   - Gestion des correspondances
   - Validation des mappings

3. **ReminderService**
   - Calcul des échéances
   - Envoi des notifications

4. **WeightAggregationService**
   - Récupération des données sources
   - Application du mapping
   - Calculs par période

## Priorités de Développement

### Phase 1 - Fondations (Sprint 1-2)
1. Modèle de données pour éco-organismes et catégories
2. Interface de configuration d'un partenaire
3. Système de mapping de catégories (UI basique)
4. Documentation technique eco-maison complète

### Phase 2 - Comptabilisation (Sprint 3-4)
1. Service d'agrégation des poids
2. Connexion aux modules existants (deposits, inventory, cash_sessions)
3. Calculs par période de déclaration
4. Tableaux de bord de suivi

### Phase 3 - Déclarations (Sprint 5-6)
1. Gestion des périodes de déclaration
2. Interface de préparation des déclarations
3. Export des données
4. Suivi financier (soutiens)

### Phase 4 - Automatisation (Sprint 7+)
1. Système de rappels automatiques
2. Pré-remplissage des déclarations
3. Validation automatique
4. Intégration API (si disponible)

## Questions Techniques à Résoudre

### 1. Pesées et Mesures
- Comment sont actuellement enregistrées les pesées dans RecyClique?
- Les poids sont-ils au niveau des objets individuels ou par lot?
- Y a-t-il déjà une structure de pesées liée aux dépôts?

### 2. Catégories Actuelles
- Quelle est la structure de catégorisation actuelle?
- Combien de niveaux de hiérarchie?
- Les catégories sont-elles flexibles ou fixes?

### 3. Statuts des Objets
- Quels sont les statuts possibles d'un objet?
- Comment tracer le cycle de vie: dépôt → stock → vente/recyclage?
- Y a-t-il déjà une notion de "flux" ou "mouvement"?

### 4. Dates et Périodes
- Y a-t-il déjà un système de périodes comptables?
- Comment sont gérées les dates des différentes opérations?

### 5. Performance
- Volume estimé de données (objets/mois, poids total)?
- Fréquence des calculs d'agrégation?
- Besoin de cache pour les calculs lourds?

## Livrables Attendus (Phase ÉTUDES)

### Documentation
- [x] Récapitulatif des besoins (ce document)
- [ ] Fiche technique eco-maison complète
- [ ] Modèle de données détaillé
- [ ] Spécifications fonctionnelles
- [ ] Guide de mapping des catégories

### Analyse Technique
- [ ] Audit du code existant (deposits, inventory, cash_sessions)
- [ ] Schéma de la base de données actuelle (parties concernées)
- [ ] Points d'intégration identifiés
- [ ] Impacts sur les modules existants

### Conception
- [ ] Maquettes UI (gestion partenaires, mapping, déclarations)
- [ ] Schéma d'architecture du nouveau module
- [ ] API endpoints proposés
- [ ] Stratégie de migration/déploiement

## Notes et Considérations

### Évolutivité
Le système doit être conçu pour accueillir facilement de nouveaux éco-organismes avec des configurations différentes (catégories, périodes, modalités).

### Conformité
Les déclarations doivent respecter strictement les formats et règles des éco-organismes pour éviter les rejets.

### Traçabilité
Tout doit être auditable: qui a déclaré quoi, quand, avec quelles données sources.

### Sécurité
Les données de déclaration peuvent être sensibles (chiffre d'affaires, volumes) - prévoir les permissions appropriées.

### UX/UI
L'interface doit simplifier au maximum un processus intrinsèquement complexe. Prioriser l'automatisation et les assistants.
