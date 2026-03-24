# Plan de Développement Détaillé - Phase 4

## Objectif de la Phase

Développer le module éco-organismes de bout en bout, de la base de données aux interfaces utilisateur, en suivant une approche incrémentale par sprints.

**Durée estimée** : 3-4 mois (6-8 sprints de 2 semaines)
**Statut** : 📋 À PLANIFIER
**Prérequis** : Phase 3 (Prototypage) complétée avec succès

---

## Organisation du Développement

### Équipe Recommandée

**Core Team** :
- **1 Tech Lead** (30-50% temps) : Architecture, revues code, décisions techniques
- **2 Développeurs Backend** (100%) : API, services, modèles, migrations
- **2 Développeurs Frontend** (100%) : UI, composants, intégration API
- **1 QA/Testeur** (50-100%) : Tests fonctionnels, non-régression, rapports bugs

**Support** :
- **Product Owner** (20%) : Validation stories, priorités, acceptance criteria
- **UX/UI Designer** (10-20%) : Support implémentation, ajustements visuels

### Méthodologie

**Framework** : Scrum adapté

**Sprints** : 2 semaines
- Sprint Planning : Début S1 (2h)
- Daily Stand-ups : Tous les jours (15 min)
- Sprint Review : Fin S2 (1h)
- Sprint Retrospective : Fin S2 (1h)

**Outils** :
- Gestion projet : Jira, Linear, ou GitHub Projects
- Code : Git + GitHub/GitLab
- Communication : Slack channel dédié
- Documentation : Confluence ou Notion

---

## Découpage en Sprints

### 🏗️ Sprint 0 : Préparation (1 semaine, avant Sprint 1)

**Objectif** : Mettre en place l'environnement et les fondations

#### Tâches Backend
- [ ] **Setup branche** `feature/eco-organisms` depuis `main`
- [ ] **Créer structure** des répertoires (models, services, endpoints, schemas)
- [ ] **Setup migrations Alembic** : Créer fichier de migration initial vide
- [ ] **Créer PR template** avec checklist éco-organismes
- [ ] **Setup tests** : Fixtures de base, configuration pytest

#### Tâches Frontend
- [ ] **Setup branche** `feature/eco-organisms-ui` depuis `main`
- [ ] **Créer structure** des pages et composants
- [ ] **Importer maquettes Figma** dans Storybook (si utilisé)
- [ ] **Setup routing** : Nouvelles routes `/declarations`, `/admin/eco-organisms`
- [ ] **Setup tests** : Configuration Jest/Vitest

#### Tâches DevOps
- [ ] **Créer environnement** de staging dédié (optionnel)
- [ ] **Setup CI/CD** : Pipelines pour branche feature
- [ ] **Variables d'environnement** : Ajouter configs eco-organismes

**Critères de succès** :
- [ ] Environnements dev fonctionnels pour tous
- [ ] Première migration exécutable (même si vide)
- [ ] Première page frontend accessible (même vide)
- [ ] Tests passent (même si minimaux)

---

### 📦 Sprint 1 : Fondations Données (2 semaines)

**Objectif** : Créer les entités de base et premières API CRUD

#### User Stories

**US-1.1** : En tant qu'admin, je peux créer un éco-organisme
**Acceptance Criteria** :
- Migration créée avec table `eco_organisms` (tous les champs du modèle)
- Modèle SQLAlchemy `EcoOrganism` avec relations
- Schema Pydantic `EcoOrganismCreate`, `EcoOrganismRead`, `EcoOrganismUpdate`
- Endpoint POST `/api/v1/eco-organisms`
- Endpoint GET `/api/v1/eco-organisms` (liste)
- Endpoint GET `/api/v1/eco-organisms/:id` (détail)
- Endpoint PUT `/api/v1/eco-organisms/:id`
- Endpoint DELETE `/api/v1/eco-organisms/:id`
- Tests unitaires pour chaque endpoint (>80% coverage)
- Documentation API (OpenAPI/Swagger)

**Estimation** : 5 points

---

**US-1.2** : En tant qu'admin, je peux gérer les catégories d'un éco-organisme
**Acceptance Criteria** :
- Migration créée avec table `eco_organism_categories`
- Modèle SQLAlchemy `EcoOrganismCategory` avec relations (parent/children)
- Schemas Pydantic
- Endpoints CRUD `/api/v1/eco-organism-categories`
- Endpoint GET `/api/v1/eco-organisms/:id/categories` (arbre hiérarchique)
- Tests unitaires
- Seed data : Catégories eco-maison (DEA, Jouets, ABJ) créées

**Estimation** : 5 points

---

**US-1.3** : En tant qu'admin, je peux définir les taux de soutien financier
**Acceptance Criteria** :
- Migration créée avec table `support_rates`
- Modèle SQLAlchemy `SupportRate`
- Schemas Pydantic
- Endpoints CRUD `/api/v1/support-rates`
- Endpoint GET `/api/v1/eco-organism-categories/:id/support-rates`
- Tests unitaires
- Seed data : Taux eco-maison (30€/t reçu, 130€/t réemployé)

**Estimation** : 3 points

---

**US-1.4** : En tant qu'admin, je peux mapper les catégories RecyClique vers éco-organisme
**Acceptance Criteria** :
- Migration créée avec table `category_mappings`
- Modèle SQLAlchemy `CategoryMapping`
- Schemas Pydantic
- Endpoints CRUD `/api/v1/category-mappings`
- Endpoint GET `/api/v1/eco-organisms/:id/mappings` (tous les mappings)
- Tests unitaires

**Estimation** : 5 points

---

**US-1.5** : En tant que système, je génère automatiquement les périodes de déclaration
**Acceptance Criteria** :
- Migration créée avec table `declaration_periods`
- Modèle SQLAlchemy `DeclarationPeriod`
- Schemas Pydantic
- Fonction `generate_periods_for_year(eco_organism_id, year)` dans service
- Endpoint POST `/api/v1/declaration-periods/generate` (body: {organism_id, year})
- Endpoint GET `/api/v1/declaration-periods` (liste filtrée)
- Tests unitaires

**Estimation** : 3 points

---

**Total Sprint 1** : 21 points (~52 heures dev, faisable en 2 semaines avec 2 devs backend)

**Risques** :
- Complexité des migrations (structure hiérarchique, enums)
- Interdépendances entre tables (ordre de création)

**Mitigation** :
- Revue architecture quotidienne première semaine
- Pair programming sur migrations complexes

---

### 🔗 Sprint 2 : Déclarations Fondamentales (2 semaines)

**Objectif** : Créer les entités de déclaration et logique de base

#### User Stories

**US-2.1** : En tant que système, je peux créer une déclaration vide
**Acceptance Criteria** :
- Migration créée avec table `declarations`
- Modèle SQLAlchemy `Declaration` avec relations
- Schemas Pydantic
- Endpoint POST `/api/v1/declarations` (crée déclaration avec statut DRAFT)
- Endpoint GET `/api/v1/declarations/:id`
- Tests unitaires

**Estimation** : 3 points

---

**US-2.2** : En tant que déclarant, je peux saisir les détails d'une déclaration
**Acceptance Criteria** :
- Migration créée avec table `declaration_items`
- Modèle SQLAlchemy `DeclarationItem`
- Schemas Pydantic
- Endpoint POST `/api/v1/declarations/:id/items` (crée ligne de détail)
- Endpoint PUT `/api/v1/declarations/:id/items/:item_id` (modifie ligne)
- Endpoint DELETE `/api/v1/declarations/:id/items/:item_id`
- Endpoint GET `/api/v1/declarations/:id/items` (liste toutes les lignes)
- Calcul automatique du soutien lors de la création/modification d'un item (trigger)
- Tests unitaires

**Estimation** : 5 points

---

**US-2.3** : En tant que système, je calcule automatiquement les totaux d'une déclaration
**Acceptance Criteria** :
- Trigger SQL `update_declaration_totals()` créé et testé
- Fonction Python `recalculate_declaration_totals(declaration_id)` (backup)
- Endpoint POST `/api/v1/declarations/:id/recalculate`
- Totaux mis à jour automatiquement après chaque modification d'item
- Tests unitaires (vérifier cohérence totaux)

**Estimation** : 3 points

---

**US-2.4** : En tant que déclarant, je peux soumettre une déclaration
**Acceptance Criteria** :
- Endpoint POST `/api/v1/declarations/:id/submit`
- Validations :
  - Statut = DRAFT ou IN_PROGRESS
  - Au moins 1 item déclaré
  - Cohérence flux (Reçu ≥ Réemploi + Recyclé) par catégorie
- Changement statut : DRAFT/IN_PROGRESS → SUBMITTED
- Date `submitted_at` renseignée
- Déclaration devient non-éditable
- Tests unitaires (validations + erreurs)

**Estimation** : 5 points

---

**US-2.5** : En tant qu'admin, je peux valider une déclaration
**Acceptance Criteria** :
- Endpoint POST `/api/v1/declarations/:id/validate`
- Changement statut : SUBMITTED → VALIDATED
- Date `validated_at` renseignée
- Permissions : Seuls rôles `eco_admin` ou `eco_validator`
- Tests unitaires (permissions + workflow)

**Estimation** : 3 points

---

**Total Sprint 2** : 19 points (~47 heures dev)

**Risques** :
- Complexité des triggers SQL (tests, performances)
- Logique de validation complexe

**Mitigation** :
- Tests approfondis des triggers (cas limites)
- Revue code stricte sur validations

---

### ⚙️ Sprint 3 : Agrégation et Calculs (2 semaines)

**Objectif** : Implémenter la logique d'agrégation des poids depuis modules existants

#### User Stories

**US-3.1** : En tant que système, j'agrège les poids des dépôts (flux RECEIVED)
**Acceptance Criteria** :
- Service `WeightAggregationService.calculate_received(organism_id, period_id)` créé
- Requête SQLAlchemy complexe :
  - Join `deposits`, `category_mappings`
  - Filtres : date, statut, organism, flow_type
  - Group by : eco_category_id
  - Retourne : [{eco_category_id, total_weight_kg, count}]
- Endpoint GET `/api/v1/aggregations/received?organism_id=...&period_id=...`
- Tests unitaires (fixtures de données, vérification calculs)
- Tests de performance (mesurer temps requête sur 1000+ deposits)

**Estimation** : 8 points

---

**US-3.2** : En tant que système, j'agrège les poids des ventes (flux REUSED)
**Acceptance Criteria** :
- Service `WeightAggregationService.calculate_reused(organism_id, period_id)` créé
- Requête SQLAlchemy complexe :
  - Join `cash_sessions`, `sales`, `sale_items`, `products` (ou équivalent)
  - Filtres : date, statut session (CLOSED), organism, flow_type
  - Group by : eco_category_id
  - Retourne : [{eco_category_id, total_weight_kg, count}]
- Endpoint GET `/api/v1/aggregations/reused?organism_id=...&period_id=...`
- Tests unitaires
- Tests de performance

**Estimation** : 8 points

---

**US-3.3** : En tant que système, j'agrège les poids des recyclages (flux RECYCLED)
**Acceptance Criteria** :
- Service `WeightAggregationService.calculate_recycled(organism_id, period_id)` créé
- Stratégie à déterminer selon résultats analyse technique (Phase 2) :
  - Option A : Requête sur statut `recycled` dans deposits/products
  - Option B : Table dédiée `recycling_operations`
  - Option C : Calcul par différence (temporaire si pas de données)
- Endpoint GET `/api/v1/aggregations/recycled?organism_id=...&period_id=...`
- Tests unitaires

**Estimation** : 5 points (ou 0 si Option C temporaire)

---

**US-3.4** : En tant que déclarant, je pré-remplis automatiquement une déclaration
**Acceptance Criteria** :
- Endpoint POST `/api/v1/declarations/:id/autofill`
- Appelle les 3 services d'agrégation (RECEIVED, REUSED, RECYCLED)
- Crée automatiquement les `DeclarationItem` correspondants
- Ne remplace pas les items déjà saisis manuellement (option à paramétrer)
- Retourne déclaration complète avec items pré-remplis
- Tests unitaires (vérifier données correctes)

**Estimation** : 5 points

---

**Total Sprint 3** : 26 points (~65 heures dev, nécessite 2 devs backend + support)

**Risques** :
- **HAUT** : Flux RECYCLED non tracé (dépend Phase 2)
- **MOYEN** : Performances des requêtes d'agrégation
- Complexité des jointures (dépend de la structure existante)

**Mitigation** :
- Validation findings Phase 2 AVANT ce sprint
- Optimisations requêtes (index, EXPLAIN ANALYZE)
- Si perfs insuffisantes : cache Redis avec TTL 24h

---

### 🎨 Sprint 4-5 : Interfaces Utilisateur Core (4 semaines)

**Objectif** : Développer les interfaces principales (déclarations, mapping)

#### Sprint 4 : Tableau de Bord + Workflow Étapes 1-2

**US-4.1** : En tant que déclarant, je vois le tableau de bord déclarations
**Acceptance Criteria** :
- Page `/declarations` créée
- Composants : Cartes métriques, tableau déclarations
- Intégration API GET `/api/v1/declarations` (filtrée par user/site)
- Filtres fonctionnels (éco-organisme, année, statut)
- Tri et pagination
- Tests E2E (Cypress/Playwright)

**Estimation** : 8 points

---

**US-4.2** : En tant que déclarant, je démarre une nouvelle déclaration (Étape 1)
**Acceptance Criteria** :
- Page `/declarations/:id/edit?step=1` créée
- Composant Stepper (4 étapes) réutilisable
- Affichage informations période (dates, statut, J-X avant clôture)
- 3 cartes flux (RECEIVED, REUSED, RECYCLED) avec données agrégées
- Bouton "Actualiser les données" fonctionnel (appelle autofill API)
- Bouton "Suivant" → Navigation étape 2
- Tests E2E

**Estimation** : 8 points

---

**US-4.3** : En tant que déclarant, je saisis les détails par catégorie (Étape 2)
**Acceptance Criteria** :
- Page `/declarations/:id/edit?step=2` créée
- Composant Formulaire 3 colonnes (RECEIVED, REUSED, RECYCLED) réutilisable
- Navigation entre catégories (précédent/suivant)
- Radio buttons : Pesée / Comptage (affichage conditionnel)
- Calcul dynamique soutien (debounced, appelle API)
- Enregistrement automatique (debounced, ou bouton "Enregistrer")
- Indicateur catégories complétées (checkmarks)
- Tests E2E

**Estimation** : 13 points

---

**Total Sprint 4** : 29 points (~72 heures dev, 2 devs frontend)

#### Sprint 5 : Workflow Étapes 3-4 + Mapping

**US-5.1** : En tant que déclarant, je valide et révise ma déclaration (Étape 3)
**Acceptance Criteria** :
- Page `/declarations/:id/edit?step=3` créée
- Tableau récapitulatif (toutes catégories + totaux)
- Section validations avec checks (cohérence flux, etc.)
- Zone notes globales
- Section pièces jointes (upload simulé ou réel si backend prêt)
- Bouton "Soumettre" avec modale de confirmation
- Tests E2E

**Estimation** : 8 points

---

**US-5.2** : En tant que déclarant, je reçois confirmation de soumission (Étape 4)
**Acceptance Criteria** :
- Page `/declarations/:id/edit?step=4` créée
- Message de succès avec référence déclaration
- Timeline "Prochaines étapes"
- Liens téléchargement PDF (simulés ou réels)
- Boutons "Retour au tableau de bord" et "Nouvelle déclaration"
- Tests E2E

**Estimation** : 3 points

---

**US-5.3** : En tant qu'admin, je mappe les catégories RecyClique vers éco-organisme
**Acceptance Criteria** :
- Page `/admin/eco-organisms/:id/mappings` créée
- Layout 2 colonnes (RecyClique | Eco-organisme)
- Listes hiérarchiques (arbres cliquables)
- Modale configuration mapping (flux, ratio, priorité, notes)
- Intégration API POST/PUT `/api/v1/category-mappings`
- Indicateurs visuels (mappé/non-mappé)
- Tests E2E

**Estimation** : 13 points

---

**Total Sprint 5** : 24 points (~60 heures dev, 2 devs frontend)

**Risques** :
- Complexité UI du mapping (arbre + drag & drop si implémenté)
- Upload fichiers (backend + storage)

**Mitigation** :
- Commencer par version simple du mapping (sélection + modale)
- Drag & drop en amélioration future (hors MVP)
- Upload fichiers : mock si backend pas prêt

---

### 💰 Sprint 6 : Suivi Financier + Permissions (2 semaines)

**Objectif** : Suivi financier et gestion des permissions

#### User Stories

**US-6.1** : En tant que responsable finance, je consulte le suivi financier
**Acceptance Criteria** :
- Page `/declarations/financials` créée
- Cartes métriques (Total validé, Reçu, En attente)
- Graphique (barres empilées ou courbe)
- Tableau détaillé (périodes, montants, statuts)
- Filtres (année, éco-organisme)
- Intégration API GET `/api/v1/declarations/financial-summary`
- Tests E2E

**Estimation** : 8 points (frontend)

---

**US-6.2** : En tant qu'admin, j'enregistre les proforma et paiements
**Acceptance Criteria** :
- Endpoint POST `/api/v1/declarations/:id/proforma` (enregistre numéro, date, montant)
- Endpoint POST `/api/v1/declarations/:id/payment` (enregistre date et montant réel)
- Calcul automatique écart (montant validé vs. reçu)
- Changement statut déclaration (VALIDATED → CLOSED si paiement reçu)
- Tests unitaires

**Estimation** : 5 points (backend)

---

**US-6.3** : En tant que système, je gère les permissions éco-organismes
**Acceptance Criteria** :
- Création des rôles dans base de données :
  - `eco_admin` (toutes actions)
  - `eco_declarant` (créer/éditer déclarations)
  - `eco_validator` (valider déclarations)
  - `eco_finance` (accès suivi financier)
  - `eco_viewer` (lecture seule)
- Décorateurs de permission sur endpoints
  - Ex: `@require_role("eco_admin")` ou `@require_permission("eco.declarations.create")`
- Tests unitaires (tentatives accès non-autorisés)
- Tests E2E (utilisateurs différents rôles)

**Estimation** : 8 points (backend + tests)

---

**Total Sprint 6** : 21 points (~52 heures dev)

---

### 🔔 Sprint 7 : Rappels + Exports (2 semaines)

**Objectif** : Notifications et exports de données

#### User Stories

**US-7.1** : En tant que système, j'envoie des rappels automatiques
**Acceptance Criteria** :
- Migration créée avec table `reminders`
- Modèle SQLAlchemy `Reminder`
- Service `ReminderService.create_reminders_for_period(period_id)` :
  - Crée 4 rappels (ouverture, intermédiaire, urgent, clôture)
  - Calcule dates d'envoi selon config éco-organisme
- Job/Task asynchrone (Celery/APScheduler) :
  - Exécuté quotidiennement (ex: 8h du matin)
  - Récupère rappels à envoyer (scheduled_date <= aujourd'hui, status = PENDING)
  - Envoie emails via service email existant
  - Update statut rappel (PENDING → SENT)
- Tests unitaires

**Estimation** : 13 points

---

**US-7.2** : En tant que déclarant, j'exporte une déclaration en PDF
**Acceptance Criteria** :
- Endpoint GET `/api/v1/declarations/:id/export?format=pdf`
- Service `ExportService.generate_pdf(declaration)` :
  - Template HTML avec données déclaration
  - Génération PDF (bibliothèque: ReportLab, WeasyPrint, ou autre)
  - En-tête avec logos
  - Tableau récapitulatif
  - Graphiques (optionnel)
- Bouton "Télécharger PDF" dans UI
- Tests unitaires

**Estimation** : 8 points

---

**US-7.3** : En tant que responsable finance, j'exporte le suivi financier en Excel
**Acceptance Criteria** :
- Endpoint GET `/api/v1/declarations/financial-summary/export?format=xlsx`
- Service `ExportService.generate_excel(financial_data)` :
  - Bibliothèque: openpyxl ou xlsxwriter
  - Feuille avec tableau détaillé
  - Formats (€, dates)
  - Totaux et sous-totaux
- Bouton "Exporter en Excel" dans UI
- Tests unitaires

**Estimation** : 5 points

---

**Total Sprint 7** : 26 points (~65 heures dev)

**Risques** :
- Setup Celery/APScheduler (si pas déjà existant)
- Génération PDF (templates complexes)

**Mitigation** :
- Si pas de worker async : cron job simple (script Python)
- Templates PDF minimalistes (MVP)

---

### 🧪 Sprint 8 : Tests, Documentation, Polish (2 semaines)

**Objectif** : Finalisation, tests approfondis, documentation

#### Tâches

**Tests Backend** :
- [ ] Compléter tests unitaires (coverage > 85%)
- [ ] Tests d'intégration (flows complets)
- [ ] Tests de performance (agrégations, requêtes lourdes)
- [ ] Tests de charge (10+ utilisateurs simultanés)
- [ ] Correction bugs identifiés

**Estimation** : 8 points

---

**Tests Frontend** :
- [ ] Tests E2E complets (tous les workflows)
- [ ] Tests d'accessibilité (a11y)
- [ ] Tests responsive (mobile, tablet)
- [ ] Tests cross-browser (Chrome, Firefox, Safari, Edge)
- [ ] Correction bugs identifiés

**Estimation** : 8 points

---

**Documentation** :
- [ ] Documentation API complète (OpenAPI/Swagger)
- [ ] Guide utilisateur (avec screenshots)
- [ ] Guide admin (configuration initiale)
- [ ] Guide développeur (architecture, services, conventions)
- [ ] Changelog

**Estimation** : 5 points

---

**Polish & UX** :
- [ ] Animations et transitions
- [ ] Messages d'erreur clairs et utiles
- [ ] Loading states (spinners, skeletons)
- [ ] Empty states (illustrations, messages)
- [ ] Toast notifications (succès, erreur, info)
- [ ] Responsive final

**Estimation** : 5 points

---

**Migration & Déploiement** :
- [ ] Script de migration de données (si nécessaire)
- [ ] Seed data production (eco-maison, catégories, taux)
- [ ] Déploiement staging → tests UAT
- [ ] Déploiement production (planifié, hors-heures)
- [ ] Monitoring et logs

**Estimation** : 5 points

---

**Total Sprint 8** : 31 points (~77 heures dev + test + deploy)

---

## Résumé du Planning

| Sprint | Thème | Points | Durée | Dates (exemple) |
|--------|-------|--------|-------|-----------------|
| 0 | Préparation | - | 1 sem | 01/04 - 05/04 |
| 1 | Fondations Données | 21 | 2 sem | 08/04 - 19/04 |
| 2 | Déclarations Base | 19 | 2 sem | 22/04 - 03/05 |
| 3 | Agrégation Calculs | 26 | 2 sem | 06/05 - 17/05 |
| 4 | UI Core (Part 1) | 29 | 2 sem | 20/05 - 31/05 |
| 5 | UI Core (Part 2) | 24 | 2 sem | 03/06 - 14/06 |
| 6 | Finance + Permissions | 21 | 2 sem | 17/06 - 28/06 |
| 7 | Rappels + Exports | 26 | 2 sem | 01/07 - 12/07 |
| 8 | Tests + Polish | 31 | 2 sem | 15/07 - 26/07 |

**Total** : 197 points (~492 heures dev, soit 12 semaines à 2 devs)

**Mise en production** : Fin juillet 2025 (pour déclarations T3 2025)

---

## Stratégie de Tests

### Tests Backend

#### Tests Unitaires (pytest)
- **Coverage minimum** : 85%
- **Focus** :
  - Modèles (relations, validations)
  - Services (logique métier)
  - Endpoints (status codes, réponses, erreurs)
  - Triggers SQL (calculs totaux)
  - Agrégations (calculs poids)

**Fixtures** :
- Créer jeu de données de test complet :
  - 1 éco-organisme (eco-maison)
  - 10 catégories eco-maison
  - 20 catégories RecyClique
  - 15 mappings
  - 4 périodes (T1-T4 2025)
  - 100 deposits (poids variés, dates variées)
  - 50 ventes (cash_sessions, sales, etc.)
  - 10 déclarations (états variés)

#### Tests d'Intégration
- **Flows complets** :
  - Créer éco-organisme → Créer catégories → Créer mappings → Générer périodes → Autofill déclaration → Soumettre → Valider
- **Tests de régression** :
  - Vérifier que modules existants (deposits, cash_sessions) fonctionnent toujours

#### Tests de Performance
- **Agrégations** :
  - Tester avec 1000, 5000, 10000 deposits
  - Mesurer temps de réponse (objectif < 2 secondes)
- **Listings** :
  - Pagination efficace
  - Filtres rapides

---

### Tests Frontend

#### Tests Unitaires (Jest/Vitest)
- **Composants** :
  - Props et états
  - Événements utilisateur
  - Rendu conditionnel
- **Services** :
  - Appels API (mockés)
  - Gestion erreurs

#### Tests E2E (Cypress/Playwright)
- **Flows prioritaires** :
  - Connexion → Tableau de bord déclarations → Créer déclaration → Étapes 1-2-3-4 → Confirmation
  - Admin → Mapping catégories → Créer mapping → Vérifier dans liste
  - Finance → Suivi financier → Filtrer → Voir détail proforma
- **Tests de non-régression** :
  - Modules existants accessibles et fonctionnels

#### Tests d'Accessibilité (a11y)
- **Outils** : axe-core, Lighthouse
- **Critères WCAG 2.1** : Niveau AA minimum
- **Focus** :
  - Navigation clavier
  - Lecteurs d'écran
  - Contrastes couleurs
  - Labels et aria-*

---

## Gestion des Risques

### Risques Techniques

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Flux RECYCLED non tracé | HAUTE | MOYEN | Option C (calcul différence) en MVP, améliorer en v2 |
| Performances agrégations | MOYENNE | HAUTE | Optimisations requêtes, cache Redis, vues matérialisées |
| Complexité mapping UI | MOYENNE | MOYENNE | Version simple MVP (sélection), drag & drop en v2 |
| Upload fichiers (storage) | FAIBLE | FAIBLE | Mock en dev, AWS S3 ou local en prod |
| Setup workers async (Celery) | MOYENNE | MOYENNE | Alternative : cron jobs simples |
| Intégration modules existants | MOYENNE | HAUTE | PoC en Phase 2, tests d'intégration approfondis |

### Risques Projet

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Disponibilité équipe | MOYENNE | HAUTE | Buffer 20% dans planning, prioriser MVP |
| Changement périmètre | MOYENNE | MOYENNE | Product Owner valide toutes stories, no scope creep |
| Dépendance Phase 2 | MOYENNE | HAUTE | Valider findings Phase 2 AVANT Sprint 3 |
| Bugs de régression | FAIBLE | HAUTE | Tests d'intégration, revues code strictes |

---

## Critères d'Acceptation MVP

### Fonctionnalités Incluses
✅ Gestion éco-organismes (CRUD)
✅ Gestion catégories éco-organismes (CRUD, hiérarchie)
✅ Mapping catégories (interface basique)
✅ Génération périodes de déclaration
✅ Workflow déclaration complet (4 étapes)
✅ Calcul automatique poids (flux RECEIVED, REUSED, RECYCLED si tracé)
✅ Soumission et validation déclarations
✅ Suivi financier (proforma, paiements)
✅ Permissions (5 rôles)
✅ Rappels automatiques (emails)
✅ Exports (PDF déclaration, Excel suivi financier)

### Fonctionnalités Hors MVP (v2)
❌ Interface drag & drop pour mapping
❌ Rapports annuels avancés
❌ Intégration API éco-organismes (soumission auto)
❌ Mobile app
❌ Scan et OCR tickets de pesée
❌ Dashboards analytics avancés

### Critères de Mise en Production
- [ ] Tous les tests passent (unitaires, intégration, E2E)
- [ ] Coverage backend > 85%
- [ ] Coverage frontend > 70%
- [ ] Aucun bug critique ouvert
- [ ] Performance agrégations < 2 secondes (10000 deposits)
- [ ] Tests UAT validés par utilisateurs clés (2+ personnes)
- [ ] Documentation complète
- [ ] Seed data eco-maison en production
- [ ] Monitoring et logs opérationnels
- [ ] Plan de rollback défini

---

## Post-MVP : Roadmap v2

### Court Terme (3-6 mois post-MVP)
- Interface drag & drop pour mapping catégories
- Dashboards analytics (tendances, prévisions)
- Amélioration flux RECYCLED (si données deviennent disponibles)
- Optimisations performances (vues matérialisées)
- Support de 2-3 nouveaux éco-organismes

### Moyen Terme (6-12 mois)
- Intégration API éco-organismes (soumission automatique)
- Rapports annuels et exports avancés
- Scan et OCR tickets de pesée (IA/ML)
- Application mobile (React Native ou PWA)

### Long Terme (12+ mois)
- IA pour catégorisation automatique (photo → catégorie)
- Blockchain pour traçabilité immuable
- IoT : Balances connectées
- Réseau multi-structures (consolidation)

---

## Livrables Finaux de Phase 4

À l'issue de cette phase de développement, les livrables suivants doivent être produits :

1. **💻 Code Source**
   - Backend : API complète, services, modèles
   - Frontend : Pages, composants, intégration API
   - Tests : Unitaires, intégration, E2E
   - Branche mergée dans `main` (via PRs successives)

2. **🗄️ Base de Données**
   - Migrations Alembic (toutes les tables)
   - Seed data (eco-maison, catégories, taux)
   - Index et optimisations

3. **📚 Documentation**
   - Documentation API (OpenAPI/Swagger)
   - Guide utilisateur (avec screenshots)
   - Guide admin
   - Guide développeur
   - Changelog

4. **✅ Tests**
   - Suite de tests complète (unitaires, intégration, E2E)
   - Rapports de coverage
   - Rapports de tests de performance

5. **🚀 Déploiement**
   - Application déployée en production
   - Monitoring et logs actifs
   - Plan de rollback documenté

---

## Critères de Succès de la Phase 4

✅ **MVP complet développé** (toutes fonctionnalités prioritaires)
✅ **Tests passent** (>85% backend, >70% frontend)
✅ **Performances acceptables** (agrégations < 2s)
✅ **UAT validée** par utilisateurs clés
✅ **Aucun bug critique** ouvert
✅ **Documentation complète** livrée
✅ **Application en production** et opérationnelle
✅ **Première déclaration réelle** effectuée avec succès (T3 2025)
✅ **Équipe formée** et autonome sur le module

---

**Document créé le** : 2025-11-20
**Version** : 1.0
**Statut** : PROPOSITION - Plan de développement complet
**Prochaine étape** : Validation planning et lancement Sprint 0
