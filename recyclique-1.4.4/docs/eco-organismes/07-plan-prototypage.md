# Plan de Prototypage UI/UX - Phase 3

## Objectif de la Phase

Créer des prototypes haute-fidélité et interactifs du module éco-organismes pour valider l'ergonomie, les workflows et l'expérience utilisateur avant le développement.

**Durée estimée** : 2-3 semaines
**Statut** : 📋 À PLANIFIER
**Prérequis** : Phase 2 (Analyse Technique) complétée avec succès

---

## Vue d'Ensemble

### Objectifs du Prototypage

1. **Valider l'UX** : S'assurer que les workflows sont intuitifs et efficaces
2. **Tester avec utilisateurs réels** : Recueillir feedback avant développement
3. **Ajuster les maquettes** : Corriger les problèmes d'ergonomie identifiés
4. **Aligner Frontend/Backend** : Clarifier les interactions API nécessaires
5. **Réduire les risques** : Éviter de développer des fonctionnalités non-utilisables

### Périmètre du Prototypage

#### Écrans Prioritaires (MVP)
1. **Tableau de bord déclarations** : Vue d'ensemble des périodes et statuts
2. **Workflow déclaration (4 étapes)** :
   - Étape 1 : Récapitulatif période
   - Étape 2 : Saisie détaillée par catégorie
   - Étape 3 : Validation et révision
   - Étape 4 : Confirmation
3. **Interface de mapping catégories** : Outil drag & drop ou sélection
4. **Suivi financier** : Dashboard soutiens et proforma

#### Écrans Secondaires (Hors MVP, optionnels)
- Configuration des éco-organismes (admin)
- Gestion des catégories éco-organisme (admin)
- Configuration des rappels automatiques
- Rapports annuels

---

## Méthodologie de Prototypage

### Approche Recommandée

#### Étape 1 : Wireframes Basse-Fidélité (2-3 jours)
**Objectif** : Valider rapidement les structures de pages

**Outils** :
- Papier/Crayon (sketches rapides)
- Excalidraw ou Whimsical (wireframes numériques)
- Balsamiq (wireframes classiques)

**Livrables** :
- [ ] Wireframes des 4 écrans prioritaires
- [ ] Annotations des interactions clés
- [ ] Flows utilisateur principaux

**Validation** :
- Session interne (Product Owner + 1-2 devs)
- Ajustements rapides

---

#### Étape 2 : Maquettes Haute-Fidélité (4-5 jours)
**Objectif** : Créer des maquettes visuelles finales

**Outils** :
- **Figma** (recommandé) : Collaboratif, composants réutilisables, prototypage intégré
- Sketch : Alternative si déjà utilisé dans l'équipe
- Adobe XD : Alternative Adobe

**Design System** :
- [ ] Identifier le design system actuel de RecyClique (couleurs, typographies, composants)
- [ ] Réutiliser les composants existants autant que possible
- [ ] Créer nouveaux composants si nécessaire (ex: stepper 4 étapes, cartes de catégories)

**Livrables** :
- [ ] Maquettes haute-fidélité des 4 écrans prioritaires
- [ ] États multiples (vide, rempli, erreur, chargement)
- [ ] Responsive (desktop prioritaire, mobile secondaire)
- [ ] Composants documentés (design system étendu)

**Validation** :
- Revue avec équipe UX/UI (si existante)
- Revue avec équipe Frontend (faisabilité technique)
- Ajustements visuels

---

#### Étape 3 : Prototype Interactif (3-4 jours)
**Objectif** : Créer une démo cliquable pour tests utilisateurs

**Outil** : Figma (mode Prototype)

**Interactions à prototyper** :
1. **Navigation entre pages** :
   - Menu principal → Tableau de bord déclarations
   - Tableau de bord → Nouvelle déclaration
   - Stepper : passage entre étapes 1 → 2 → 3 → 4

2. **Actions utilisateur** :
   - Cliquer sur une période → Ouvre la déclaration
   - Modifier un poids dans étape 2
   - Ajouter une note
   - Joindre un fichier (simulation)
   - Soumettre la déclaration

3. **Feedbacks visuels** :
   - Hover sur boutons
   - Focus sur champs de formulaire
   - Messages de validation (succès, erreur)
   - Chargement (spinners)

**Données de test** :
- Créer un jeu de données fictif cohérent :
  - 2-3 périodes de déclaration (T4 2024, T1 2025, T2 2025)
  - 5-6 catégories eco-maison (DEA Assise, Couchage, Jouets, etc.)
  - Valeurs réalistes (poids, soutiens)

**Livrables** :
- [ ] Prototype Figma cliquable
- [ ] Scénarios de test documentés
- [ ] Lien partageable pour tests

**Validation** :
- Test interne (équipe projet)
- Vérification des flows complets

---

#### Étape 4 : Tests Utilisateurs (3-4 jours)
**Objectif** : Valider l'utilisabilité avec les utilisateurs finaux

**Participants** :
- 4-6 utilisateurs représentatifs :
  - 2 responsables déclarations (utilisateurs principaux)
  - 1-2 membres équipe terrain (pour mapping catégories)
  - 1 responsable finance (pour suivi financier)
  - 1 admin (pour configuration)

**Format** : Sessions individuelles 45-60 min

**Méthodologie** : Think Aloud (pensée à voix haute)

**Scénarios de Test** :

##### Scénario 1 : Effectuer une Déclaration Trimestrielle
**Tâche** :
"Vous devez effectuer la déclaration eco-maison pour le trimestre T1 2025. Utilisez le prototype pour compléter cette déclaration."

**Observations** :
- [ ] L'utilisateur trouve-t-il facilement le tableau de bord ?
- [ ] L'utilisateur comprend-il le statut de la période (en cours, à déclarer) ?
- [ ] L'utilisateur clique-t-il spontanément sur la bonne période ?
- [ ] **Étape 1** : L'utilisateur comprend-il les données pré-remplies ?
- [ ] **Étape 2** : L'utilisateur sait-il comment ajuster les valeurs ?
- [ ] **Étape 2** : L'utilisateur comprend-il la navigation entre catégories ?
- [ ] **Étape 3** : L'utilisateur vérifie-t-il les totaux ?
- [ ] **Étape 3** : L'utilisateur trouve-t-il comment ajouter une note/pièce jointe ?
- [ ] **Étape 4** : L'utilisateur comprend-il la confirmation et les prochaines étapes ?

**Questions post-tâche** :
1. Sur une échelle de 1 à 5, était-ce facile ou difficile ?
2. Y a-t-il eu des moments de confusion ?
3. Manque-t-il des informations ?
4. Quelque chose vous a surpris (positivement ou négativement) ?

##### Scénario 2 : Mapper une Nouvelle Catégorie
**Tâche** :
"Vous venez de créer une nouvelle catégorie 'Lampes' dans RecyClique. Mappez-la vers la catégorie eco-maison appropriée."

**Observations** :
- [ ] L'utilisateur trouve-t-il l'interface de mapping ?
- [ ] L'utilisateur comprend-il le principe du mapping ?
- [ ] L'utilisateur identifie-t-il la bonne catégorie eco-maison (DEA - Décoration ou autre) ?
- [ ] L'utilisateur sait-il comment créer le mapping ?
- [ ] L'utilisateur comprend-il les options (flux, ratio, priorité) ?

**Questions post-tâche** :
1. Aviez-vous déjà compris le concept de mapping avant de démarrer ?
2. Les catégories eco-maison sont-elles claires ?
3. Les options de configuration sont-elles compréhensibles ?

##### Scénario 3 : Consulter le Suivi Financier
**Tâche** :
"Vérifiez si le paiement eco-maison du T4 2024 a bien été reçu."

**Observations** :
- [ ] L'utilisateur trouve-t-il la page de suivi financier ?
- [ ] L'utilisateur comprend-il les différents montants (validé, reçu, en attente) ?
- [ ] L'utilisateur identifie-t-il rapidement le statut du T4 2024 ?
- [ ] L'utilisateur sait-il comment accéder au détail d'un proforma ?

**Questions post-tâche** :
1. Les informations financières sont-elles claires ?
2. Manque-t-il des données importantes pour votre suivi ?

**Métriques à collecter** :
- **Taux de succès** : % de tâches complétées sans aide
- **Temps de complétion** : Temps moyen par tâche
- **Nombre d'erreurs** : Clics incorrects, retours en arrière
- **Satisfaction** : Score SUS (System Usability Scale) ou note /5

**Livrables** :
- [ ] Rapport de tests utilisateurs (10-15 pages)
- [ ] Liste des problèmes identifiés (classés par sévérité)
- [ ] Recommandations d'amélioration
- [ ] Vidéos/enregistrements de sessions (si consentement)

---

#### Étape 5 : Ajustements et Finalisation (2-3 jours)
**Objectif** : Corriger les problèmes identifiés

**Actions** :
- [ ] Prioriser les problèmes (critiques, importants, mineurs)
- [ ] Ajuster les maquettes Figma
- [ ] Mettre à jour le prototype interactif
- [ ] Re-tester les flows problématiques (sessions courtes avec 1-2 utilisateurs)

**Validation finale** :
- [ ] Session de validation avec Product Owner
- [ ] Revue avec équipe Frontend (OK pour développement)
- [ ] Revue avec utilisateurs clés (si changements majeurs)

**Livrables finaux** :
- [ ] Maquettes finales (v2)
- [ ] Prototype final validé
- [ ] Guide de style (design system étendu)
- [ ] Spécifications d'interaction détaillées

---

## Écrans Détaillés à Prototyper

### 1. Tableau de Bord Déclarations

**URL** : `/declarations`

**Composants principaux** :
1. **Header** :
   - Titre "Mes Déclarations"
   - Bouton CTA "Nouvelle Déclaration" (si période ouverte)

2. **Cartes métriques** (3 colonnes) :
   - "À Déclarer" (nombre + icône alerte)
   - "Validées" (nombre + icône check)
   - "Soutiens 2025" (montant + icône €)

3. **Section rappels** (alertes) :
   - Liste des rappels actifs (fenêtre qui se ferme, retards)
   - Icônes visuelles (cloche, warning)

4. **Filtres** :
   - Éco-organisme (dropdown)
   - Année (dropdown)
   - Statut (dropdown : Tous, À déclarer, En cours, Validées, etc.)

5. **Tableau des déclarations** :
   - Colonnes : Période, Éco-organisme, Statut, Totaux, Soutien, Actions
   - Tri par colonne
   - Pagination
   - Actions : Voir (œil), Éditer (crayon) si éditable

**États à maquetter** :
- [ ] État normal (avec données)
- [ ] État vide (aucune déclaration)
- [ ] État avec alerte (déclaration en retard)
- [ ] État loading (skeleton loaders)

**Interactions** :
- Hover sur ligne du tableau → mise en surbrillance
- Clic sur ligne → Ouvre détail déclaration
- Clic sur "Éditer" → Ouvre workflow déclaration (étape 1)
- Filtres → Mise à jour dynamique du tableau

---

### 2. Workflow Déclaration - Étape 1 : Récapitulatif

**URL** : `/declarations/:id/edit?step=1`

**Composants principaux** :
1. **Header avec stepper** :
   - 4 étapes visuelles (cercles + labels)
   - Étape 1 active (colorée)
   - Étapes 2-3-4 inactives (grises)

2. **Informations période** (carte) :
   - Éco-organisme + logo
   - Période (T1 2025 : 01/01/2025 - 31/03/2025)
   - Fenêtre de déclaration (01/04/2025 - 15/05/2025)
   - Statut + indicateur visuel (ex: "J-10 avant clôture" en orange)

3. **Cartes par flux** (3 cartes empilées) :
   - **Flux RECEIVED** (carte bleue)
     - Titre + icône
     - Liste des catégories avec poids
     - Total flux
   - **Flux REUSED** (carte verte)
     - Même structure
   - **Flux RECYCLED** (carte rouge/orange)
     - Même structure

4. **Actions** :
   - Bouton "Actualiser les données" (icône refresh)
   - Lien "Voir le détail des objets sources" (drill-down)
   - Bouton "Annuler" (secondaire)
   - Bouton "Suivant : Détails" (primaire, CTA)

**États à maquetter** :
- [ ] État normal (avec données calculées)
- [ ] État vide (aucune donnée pour la période)
- [ ] État loading (calcul en cours)
- [ ] État après actualisation (animation subtile)

**Interactions** :
- Clic sur "Actualiser" → Spinner + rechargement des données
- Clic sur catégorie → Modale avec drill-down (liste des objets sources)
- Clic sur "Suivant" → Navigation vers étape 2

---

### 3. Workflow Déclaration - Étape 2 : Saisie Détaillée

**URL** : `/declarations/:id/edit?step=2`

**Composants principaux** :
1. **Header avec stepper** : Étape 2 active

2. **Sélecteur de catégorie** :
   - Liste ou tabs horizontaux (si peu de catégories)
   - OU Accordéon vertical (si beaucoup de catégories)
   - Catégorie active mise en évidence
   - Indicateur "complétée" (checkmark) si catégorie renseignée

3. **Formulaire par catégorie** (exemple : DEA - Assise) :
   - **3 colonnes** (une par flux) :

     **Colonne RECEIVED** :
     - Radio buttons : Pesée / Comptage
     - Si Pesée : Input poids (kg), pré-rempli, éditable
     - Si Comptage : Input quantité + abaque auto
     - Info bulle : "Pré-rempli automatiquement, ajustable"
     - Display : Soutien calculé (€) + taux (30€/t)

     **Colonne REUSED** :
     - Idem structure
     - Display : Soutien calculé (€) + taux (130€/t)

     **Colonne RECYCLED** :
     - Idem structure
     - Display : Soutien calculé (€)

   - **Zone notes** (en dessous des 3 colonnes) :
     - Textarea : "Notes pour cette catégorie"

4. **Navigation catégories** :
   - Bouton "Catégorie précédente" (si pas la première)
   - Bouton "Catégorie suivante" (ou "Terminer" si dernière)

5. **Actions globales** (footer fixe) :
   - Bouton "Précédent" (retour étape 1)
   - Bouton "Enregistrer brouillon" (secondaire)
   - Bouton "Suivant : Révision" (primaire, désactivé si catégories incomplètes)

**États à maquetter** :
- [ ] Première catégorie (bouton précédent désactivé)
- [ ] Dernière catégorie (bouton "Terminer" au lieu de "Suivant")
- [ ] Catégorie complétée (checkmark visible)
- [ ] Catégorie incomplète (warning si tentative de passer à l'étape 3)
- [ ] Calcul dynamique soutien (changement de valeur → update instantané du soutien)

**Interactions** :
- Changement méthode (Pesée ↔ Comptage) → Affiche/masque champs
- Modification poids → Recalcul instantané soutien (debounced)
- Clic "Catégorie suivante" → Slide animation + chargement catégorie suivante
- Clic "Suivant : Révision" → Validation + navigation étape 3

---

### 4. Workflow Déclaration - Étape 3 : Validation

**URL** : `/declarations/:id/edit?step=3`

**Composants principaux** :
1. **Header avec stepper** : Étape 3 active

2. **Tableau récapitulatif** :
   - Colonnes : Catégorie, Reçu (kg), Réemploi (kg), Recyclé (kg), Soutien (€)
   - Ligne par catégorie avec données
   - Ligne TOTAUX en bas (mise en évidence, gras)
   - Possibilité de cliquer sur ligne → Retour étape 2 pour ajuster

3. **Section validations** (cartes) :
   - **Vérifications automatiques** :
     - ✅ "Cohérence des flux (Reçu ≥ Réemploi + Recyclé)" : OK
     - ✅ "Toutes les catégories renseignées" : OK
     - ⚠️ "3 catégories sans données" : Avertissement (pas bloquant)
   - Messages avec icônes (check vert, warning orange, erreur rouge)

4. **Zone notes globales** :
   - Textarea : "Notes globales pour cette déclaration"
   - Info : "Ex: Trimestre marqué par forte activité DEA Couchage"

5. **Section pièces jointes** :
   - Liste des fichiers joints (nom, taille, icône type)
   - Bouton "Supprimer" par fichier
   - Bouton "Ajouter fichier" → Ouvre explorateur de fichiers

6. **Actions** :
   - Bouton "Précédent" (retour étape 2)
   - Bouton "Enregistrer brouillon" (secondaire)
   - Bouton "Soumettre la déclaration" (primaire, rouge/orange, CTA fort)

**États à maquetter** :
- [ ] Toutes validations OK (checkmarks verts)
- [ ] Une ou plusieurs validations en warning (icônes orange)
- [ ] Validation bloquante en erreur (icône rouge + bouton Soumettre désactivé)
- [ ] Avec pièces jointes (1-3 fichiers)
- [ ] Sans pièces jointes
- [ ] Confirmation de soumission (modale)

**Interactions** :
- Clic sur ligne catégorie → Retour étape 2 sur cette catégorie
- Clic "Ajouter fichier" → Input file (simulation)
- Clic "Soumettre" → Modale de confirmation :
  - "Êtes-vous sûr ? Cette action est irréversible."
  - Bouton "Annuler" / "Confirmer"
- Après confirmation → Navigation étape 4

---

### 5. Workflow Déclaration - Étape 4 : Confirmation

**URL** : `/declarations/:id/edit?step=4`

**Composants principaux** :
1. **Header avec stepper** : Étape 4 active (toutes complétées)

2. **Message de succès** (grande carte centrale) :
   - Icône check circle (grande, verte)
   - Titre : "Déclaration Soumise avec Succès !"
   - Référence : "DEC-2025-T1-ECO-MAISON-001"
   - Date de soumission : "05/04/2025 à 14:32"

3. **Section "Prochaines étapes"** (timeline visuelle) :
   - Étape 1 : "eco-maison va examiner votre déclaration (5 à 15 jours)"
   - Étape 2 : "Vous recevrez une notification par email de la validation"
   - Étape 3 : "Le proforma sera émis sous 15-30 jours après validation"
   - Étape 4 : "Le paiement (189.45 €) sera effectué sous 30-45 jours"

4. **Section documents** :
   - Lien "Télécharger Accusé de Réception PDF"
   - Lien "Télécharger Détail de la Déclaration PDF"

5. **Actions** :
   - Bouton "Retour au Tableau de Bord" (primaire)
   - Bouton "Nouvelle Déclaration" (secondaire)

**États à maquetter** :
- [ ] État normal (succès)

**Interactions** :
- Clic "Télécharger PDF" → Simulation téléchargement
- Clic "Retour au Tableau de Bord" → Navigation vers `/declarations`

---

### 6. Interface de Mapping Catégories

**URL** : `/admin/eco-organisms/:id/mappings`

**Composants principaux** :
1. **Header** :
   - Titre : "Mapping Catégories - eco-maison"
   - Bouton "Enregistrer" (désactivé si pas de modifications)

2. **Filtres** (au-dessus du contenu) :
   - Flux : Dropdown (Tous, RECEIVED, REUSED, RECYCLED)
   - Recherche RecyClique : Input texte
   - Recherche Eco : Input texte

3. **Layout 2 colonnes** :

   **Colonne Gauche : Catégories RecyClique**
   - Liste hiérarchique (arbre)
   - Checkbox par catégorie
   - Icône indiquant si mappée (check vert) ou non (cercle gris)
   - Expandable/collapsible si hiérarchie

   **Colonne Droite : Catégories Eco-maison**
   - Liste hiérarchique (arbre)
   - Indication nombre de mappings par catégorie
   - Ex: "DEA - Assise (2 mappings)"

4. **Zone centrale (ou modale)** : Configuration Mapping
   - Apparaît quand on sélectionne catégorie RecyClique + catégorie Eco
   - Champs :
     - Flux concerné (radio: Tous, RECEIVED, REUSED, RECYCLED)
     - Ratio de poids (slider 0.1 à 1.0, ou input)
     - Priorité (input number)
     - Conditions JSON (textarea, optionnel)
     - Notes (textarea)
     - Toggle "Actif"
   - Boutons : "Annuler" / "Créer Mapping"

**États à maquetter** :
- [ ] État initial (aucun mapping sélectionné)
- [ ] Sélection catégorie RecyClique (mise en évidence)
- [ ] Sélection catégorie RecyClique + Eco (modale de config apparaît)
- [ ] Mapping créé (icône check vert sur catégorie RecyClique)
- [ ] État avec filtres appliqués (catégories filtrées)

**Interactions** :
- Clic sur catégorie RecyClique non-mappée → Mise en évidence, attente sélection Eco
- Clic sur catégorie Eco → Modale config mapping s'ouvre
- Configuration mapping → Validation → Mapping créé, icône update
- Filtres → Liste catégories update

**Approche Alternative (si drag & drop souhaité)** :
- Drag catégorie RecyClique → Drop sur catégorie Eco
- → Modale config s'ouvre automatiquement

---

### 7. Suivi Financier

**URL** : `/declarations/financials`

**Composants principaux** :
1. **Header** :
   - Titre : "Suivi Financier des Soutiens"
   - Filtres : Année (dropdown), Éco-organisme (dropdown)

2. **Cartes métriques** (3 colonnes) :
   - "Total Validé" (montant + icône euro)
   - "Reçu" (montant + icône check vert)
   - "En Attente" (montant + icône horloge orange)

3. **Graphique** (zone large) :
   - Type : Barres empilées ou courbe
   - X : Trimestres (T1, T2, T3, T4)
   - Y : Montants (€)
   - Légende : Validé, Reçu, En attente

4. **Tableau détaillé** :
   - Colonnes : Période, Éco-organisme, Validé (€), Proforma, Reçu (€), Écart (€), Statut
   - Statut avec icônes (✅ OK, ⚠️ Écart, ⏳ En attente)
   - Tri par colonne
   - Pagination

5. **Actions** :
   - Bouton "Exporter en Excel"
   - Bouton "Exporter en PDF"

**États à maquetter** :
- [ ] État normal (avec données)
- [ ] État avec écart financier (ligne en warning)
- [ ] État avec paiement en retard (ligne en erreur)
- [ ] État vide (aucune donnée pour les filtres sélectionnés)

**Interactions** :
- Clic sur ligne → Modale avec détail proforma (numéro, date, montants, fichier joint)
- Filtres → Graphique et tableau update
- Clic export → Simulation téléchargement

---

## Design System et Composants

### Composants Clés à Créer/Réutiliser

#### 1. Stepper (4 étapes)
**Nouveau composant**

**Propriétés** :
- `currentStep` : number (1-4)
- `steps` : array [{label, status}]
- `onStepClick` : function (si navigation directe autorisée)

**États** :
- Step active (couleur primaire, texte bold)
- Step complétée (check vert, ligne connectée verte)
- Step à venir (gris, ligne connectée grise)

**Variantes** :
- Horizontal (desktop)
- Vertical (mobile, si nécessaire)

---

#### 2. Carte Métrique (KPI Card)
**Réutiliser composant existant ou créer**

**Propriétés** :
- `value` : string | number
- `label` : string
- `icon` : ReactNode
- `color` : "primary" | "success" | "warning" | "info"
- `trend` : {value, direction} (optionnel)

---

#### 3. Tableau de Données
**Réutiliser composant existant (si Material-UI, Ant Design, ou autre)**

**Fonctionnalités requises** :
- Tri par colonne
- Pagination
- Actions par ligne (boutons)
- États (loading, empty, error)
- Responsive (collapse colonnes sur mobile)

---

#### 4. Formulaire Multi-Colonnes (Étape 2)
**Nouveau composant spécifique**

**Structure** :
- 3 colonnes (RECEIVED, REUSED, RECYCLED)
- Champs synchronisés (même hauteur)
- Calculs dynamiques (soutiens)

---

#### 5. Modale de Confirmation
**Réutiliser composant existant**

**Variantes** :
- Confirmation simple (Oui/Non)
- Confirmation avec input (ex: montant)
- Modale de détail (readonly)

---

#### 6. Interface Drag & Drop (si implémenté)
**Nouveau composant complexe**

**Bibliothèque recommandée** :
- `react-beautiful-dnd` (si React)
- `@dnd-kit` (alternative moderne)

---

### Palette de Couleurs

**À définir selon charte RecyClique existante**

**Suggestions si création** :
- **Primaire** : Bleu (#2563EB) - Actions principales
- **Secondaire** : Gris (#6B7280) - Actions secondaires
- **Succès** : Vert (#10B981) - Validations, complétions
- **Warning** : Orange (#F59E0B) - Avertissements
- **Erreur** : Rouge (#EF4444) - Erreurs, blocages
- **Info** : Bleu clair (#3B82F6) - Informations

**Flux-specific colors** :
- RECEIVED : Bleu (#3B82F6)
- REUSED : Vert (#10B981)
- RECYCLED : Orange (#F59E0B)

---

## Tests Utilisateurs - Guide Pratique

### Préparation

#### Recrutement Participants
- [ ] Identifier 4-6 utilisateurs cibles
- [ ] Les contacter 1-2 semaines à l'avance
- [ ] Expliquer le contexte et l'objectif
- [ ] Planifier sessions (45-60 min chacune)
- [ ] Confirmer 2 jours avant

#### Matériel Nécessaire
- [ ] Prototype Figma accessible (lien)
- [ ] Ordinateur avec grand écran (pour partage)
- [ ] Enregistreur audio/vidéo (avec consentement)
- [ ] Feuille de prise de notes
- [ ] Scénarios imprimés (backup)
- [ ] Formulaire de consentement (RGPD)
- [ ] Questionnaire SUS imprimé

---

### Déroulé d'une Session

#### Introduction (5 min)
1. Accueillir le participant
2. Expliquer le processus (think aloud)
3. Rassurer : "On teste le prototype, pas vous !"
4. Obtenir consentement enregistrement
5. Expliquer qu'on ne peut pas aider pendant les tâches

#### Contexte et Warm-up (5 min)
1. Questions démographiques (rôle, expérience RecyClique)
2. Fréquence des déclarations actuelles
3. Points de douleur actuels
4. Attentes vis-à-vis du nouveau module

#### Tâches (30-35 min)
1. Présenter scénario 1
2. Observer et noter (silencieux sauf si bloqué 2+ min)
3. Poser questions de clarification si nécessaire
4. Répéter pour scénarios 2 et 3

#### Débriefing (10 min)
1. Questions ouvertes :
   - "Qu'avez-vous trouvé le plus facile ?"
   - "Qu'avez-vous trouvé le plus difficile ?"
   - "Des suggestions d'amélioration ?"
2. Questionnaire SUS (10 questions, échelle 1-5)

#### Conclusion (5 min)
1. Remercier le participant
2. Répondre à ses questions
3. Expliquer suite du processus

---

### Analyse des Résultats

#### Données Quantitatives
- [ ] Calculer taux de succès par tâche
- [ ] Calculer temps moyens par tâche
- [ ] Compter erreurs par tâche
- [ ] Calculer score SUS moyen

#### Données Qualitatives
- [ ] Lister tous les problèmes observés
- [ ] Classifier par sévérité :
  - **Critique** : Empêche de terminer la tâche
  - **Important** : Ralentit significativement, frustre
  - **Mineur** : Gêne légère, cosmétique
- [ ] Regrouper problèmes similaires
- [ ] Identifier patterns (3+ participants ont le même problème)

#### Insights et Recommandations
- [ ] Problèmes critiques → **Corriger avant développement**
- [ ] Problèmes importants → **Corriger si possible, sinon documenter**
- [ ] Problèmes mineurs → **Backlog, correction post-MVP**
- [ ] Feedback positifs → **Conserver ces éléments**

---

## Livrables Finaux de Phase 3

À l'issue de cette phase de prototypage, les livrables suivants doivent être produits :

1. **🎨 Maquettes Haute-Fidélité (Figma)**
   - Tous les écrans prioritaires (MVP)
   - États multiples (vide, rempli, erreur, loading)
   - Responsive (desktop + mobile)
   - Lien partageable

2. **🖱️ Prototype Interactif (Figma)**
   - Cliquable, avec flows complets
   - Données de test cohérentes
   - Lien partageable

3. **🎨 Guide de Style Étendu**
   - Composants nouveaux documentés
   - Palette de couleurs
   - Typographies
   - Spacings et grilles
   - Icônes

4. **📊 Rapport de Tests Utilisateurs**
   - Méthodologie
   - Participants (profils anonymisés)
   - Résultats par scénario
   - Problèmes identifiés (classés par sévérité)
   - Recommandations d'amélioration
   - Score SUS et analyse

5. **📝 Spécifications d'Interaction Détaillées**
   - Flows utilisateur finalisés
   - Interactions micro (hover, focus, transitions)
   - Validations et messages d'erreur
   - États des composants

6. **🎯 Backlog Ajustements UX**
   - Liste priorisée des ajustements à faire
   - Estimation (rapide, moyen, long)
   - Attribution (design vs. dev)

---

## Critères de Succès de la Phase 3

✅ **Maquettes haute-fidélité** créées pour tous les écrans prioritaires
✅ **Prototype interactif** fonctionnel et testé en interne
✅ **Tests utilisateurs** réalisés avec 4-6 participants
✅ **Score SUS ≥ 68** (moyenne acceptable, 80+ = excellent)
✅ **Aucun problème critique** non-résolu
✅ **Problèmes importants** documentés et planifiés
✅ **Guide de style étendu** livré et validé par équipe Frontend
✅ **GO de toutes les parties prenantes** pour phase 4 (développement)

---

**Prochaine étape** : [08-plan-developpement-detaille.md](08-plan-developpement-detaille.md) - Phase 4 de Développement

---

**Document créé le** : 2025-11-20
**Version** : 1.0
**Statut** : PROPOSITION - Plan de prototypage UI/UX complet
**Outils recommandés** : Figma pour maquettes et prototype interactif
