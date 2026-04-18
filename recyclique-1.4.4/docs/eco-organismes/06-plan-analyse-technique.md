# Plan d'Analyse Technique - Phase 2

## Objectif de la Phase

Analyser en profondeur le codebase existant de RecyClique pour identifier précisément les points d'intégration avec le nouveau module éco-organismes et préparer la phase de développement.

**Durée estimée** : 2-3 semaines
**Statut** : 📋 À PLANIFIER
**Prérequis** : Phase 1 (Validation) complétée avec succès (GO)

---

## Vue d'Ensemble du Codebase Existant

### Stack Technique Identifié

#### Backend
- **Framework** : FastAPI (Python)
- **ORM** : SQLAlchemy
- **Base de données** : PostgreSQL
- **Migrations** : Alembic
- **Cache** : Redis (détecté via `core/redis.py`)
- **Authentification** : JWT + système de permissions personnalisé

#### Structure des Répertoires
```
api/src/recyclic_api/
├── api/                    # Endpoints API
│   └── api_v1/
│       ├── api.py          # Router principal
│       └── endpoints/      # Endpoints par module
│           ├── deposits.py
│           ├── cash_sessions.py
│           ├── categories.py
│           ├── sales.py
│           └── ...
├── models/                 # Modèles SQLAlchemy
│   ├── deposit.py
│   ├── cash_session.py
│   ├── category.py
│   ├── sale.py
│   └── ...
├── schemas/                # Schémas Pydantic (validation)
│   ├── deposit.py
│   ├── dashboard.py
│   └── ...
├── services/               # Logique métier
│   ├── cash_session_service.py
│   ├── category_service.py
│   ├── reception_service.py
│   └── ...
├── repositories/           # Accès données (pattern Repository)
│   ├── reception.py
│   └── ...
├── core/                   # Configuration et utilitaires
│   ├── config.py
│   ├── database.py
│   ├── security.py
│   ├── redis.py
│   └── audit.py
└── utils/                  # Fonctions utilitaires
    └── ...
```

---

## Analyse des Modèles Existants

### 1. Modèle `Deposit` (deposits.py)

**Fichier** : `api/src/recyclic_api/models/deposit.py`

**Structure actuelle** :
```python
class Deposit(Base):
    __tablename__ = "deposits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    site_id = Column(UUID(as_uuid=True), ForeignKey("sites.id"), nullable=True)
    telegram_user_id = Column(String, nullable=True)
    audio_file_path = Column(String, nullable=True)

    # Statut et catégorisation
    status = Column(Enum(DepositStatus), nullable=False, default=DepositStatus.PENDING_AUDIO)
    category = Column(Enum(EEECategory), nullable=True)  # ⚠️ Enum EEECategory (DEEE)

    # Poids et description
    weight = Column(Float, nullable=True)  # ✅ Poids en kg - UTILISABLE !
    description = Column(String, nullable=True)

    # IA et transcription
    transcription = Column(Text, nullable=True)
    eee_category = Column(Enum(EEECategory), nullable=True)
    confidence_score = Column(Float, nullable=True)
    alternative_categories = Column(JSON, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relations
    user = relationship("User", back_populates="deposits")
    site = relationship("Site", back_populates="deposits")
```

**Points Clés** :
- ✅ **Champ `weight`** : Déjà présent en Float (kg) - utilisable directement pour flux RECEIVED
- ⚠️ **Catégorie** : Utilise actuellement `EEECategory` (enum DEEE) - **pas compatible** avec catégories génériques
- ✅ **Dates** : `created_at` disponible pour filtrer par période
- ✅ **Statut** : Enum `DepositStatus` avec plusieurs états (PENDING, VALIDATED, COMPLETED)
- ⚠️ **Pas de lien vers catégories génériques** : Actuellement focalisé sur DEEE

**Recommandations pour Intégration** :
1. **NE PAS modifier** la structure actuelle de `Deposit`
2. **Créer table d'extension** `deposit_eco_tracking` (comme proposé dans modèle de données)
3. **Lien 1:1** entre `Deposit` et `DepositEcoTracking` via `deposit_id`
4. Dans `DepositEcoTracking`, stocker :
   - `total_weight_kg` (copie ou agrégation du poids)
   - `eco_organism_id` et `eco_category_id` (si mapping applicable)
   - `included_in_declaration_id` (traçabilité)

**Requête d'Agrégation Flux RECEIVED (Exemple)** :
```python
# Pseudo-code pour comprendre l'intégration
def calculate_received_weight_for_period(organism_id, start_date, end_date):
    """
    Agrège les poids des dépôts pour une période donnée
    """
    query = (
        db.query(
            CategoryMapping.eco_category_id,
            func.sum(Deposit.weight * CategoryMapping.weight_ratio).label('total_weight')
        )
        .join(DepositEcoTracking, Deposit.id == DepositEcoTracking.deposit_id)
        .join(CategoryMapping,
              and_(
                  DepositEcoTracking.eco_organism_id == CategoryMapping.eco_organism_id,
                  DepositEcoTracking.eco_category_id == CategoryMapping.eco_category_id
              ))
        .filter(
            Deposit.status.in_([DepositStatus.VALIDATED, DepositStatus.COMPLETED]),
            Deposit.created_at >= start_date,
            Deposit.created_at <= end_date,
            CategoryMapping.eco_organism_id == organism_id,
            CategoryMapping.flow_type.in_(['RECEIVED', 'ALL']),
            CategoryMapping.is_active == True
        )
        .group_by(CategoryMapping.eco_category_id)
    )
    return query.all()
```

---

### 2. Modèle `CashSession` (cash_session.py)

**Fichier** : `api/src/recyclic_api/models/cash_session.py`

**Structure actuelle** :
```python
class CashSession(Base):
    __tablename__ = "cash_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    operator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    site_id = Column(UUID(as_uuid=True), ForeignKey("sites.id"), nullable=False)
    register_id = Column(UUID(as_uuid=True), ForeignKey("cash_registers.id"), nullable=True)

    # Montants
    initial_amount = Column(Float, nullable=False, default=0.0)
    current_amount = Column(Float, nullable=False, default=0.0)

    # Statut et étapes
    status = Column(SAEnum(CashSessionStatus), nullable=False, default=CashSessionStatus.OPEN)
    current_step = Column(SAEnum(CashSessionStep), nullable=True, default=None)

    # Statistiques
    total_sales = Column(Float, nullable=True, default=0.0)
    total_items = Column(Integer, nullable=True, default=0)

    # Dates
    opened_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)

    # Relations
    sales = relationship("Sale", back_populates="cash_session", cascade="all, delete-orphan")
    operator = relationship("User", back_populates="cash_sessions")
    site = relationship("Site", back_populates="cash_sessions")
    register = relationship("CashRegister", lazy="joined")
```

**Points Clés** :
- ✅ **Relation `sales`** : Accès aux ventes via relation 1:N
- ✅ **Dates** : `closed_at` disponible pour filtrer les sessions complétées
- ✅ **Site** : Possibilité de filtrer par site si multi-sites
- ⚠️ **Pas de poids** : Les poids des objets vendus sont dans les `Sale` / `SaleItem`

**À Explorer** :
- Modèle `Sale` : Contient-il les objets vendus ?
- Modèle `SaleItem` : Lien vers les produits/objets ?
- Y a-t-il un modèle `Product` ou `InventoryItem` ?

**Recommandations pour Intégration** :
1. **Explorer la chaîne** : `CashSession` → `Sale` → `SaleItem` → `Product` (?)
2. **Identifier où est le poids** : Probablement dans `Product` ou `SaleItem`
3. **Créer requête d'agrégation** similaire à celle des deposits

**Requête d'Agrégation Flux REUSED (Hypothèse à valider)** :
```python
# Pseudo-code hypothétique (à adapter après exploration Sale/SaleItem)
def calculate_reused_weight_for_period(organism_id, start_date, end_date):
    """
    Agrège les poids des objets vendus pour une période donnée
    """
    # Hypothèse: SaleItem a un lien vers Product qui a un champ weight et category_id
    query = (
        db.query(
            CategoryMapping.eco_category_id,
            func.sum(Product.weight * CategoryMapping.weight_ratio).label('total_weight')
        )
        .join(Sale, SaleItem.sale_id == Sale.id)
        .join(CashSession, Sale.cash_session_id == CashSession.id)
        .join(Product, SaleItem.product_id == Product.id)
        .join(CategoryMapping,
              and_(
                  Product.category_id == CategoryMapping.recyclic_category_id,
                  CategoryMapping.eco_organism_id == organism_id
              ))
        .filter(
            CashSession.status == CashSessionStatus.CLOSED,
            CashSession.closed_at >= start_date,
            CashSession.closed_at <= end_date,
            CategoryMapping.flow_type.in_(['REUSED', 'ALL']),
            CategoryMapping.is_active == True
        )
        .group_by(CategoryMapping.eco_category_id)
    )
    return query.all()
```

---

### 3. Modèle `Category` (category.py)

**Fichier** : `api/src/recyclic_api/models/category.py`

**Structure actuelle** :
```python
class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Hiérarchie
    parent_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True, index=True)
    parent = relationship("Category", remote_side=[id], back_populates="children")
    children = relationship("Category", back_populates="parent")

    # Tarification
    price = Column(Numeric(10, 2), nullable=True)
    max_price = Column(Numeric(10, 2), nullable=True)

    # Affichage
    display_order = Column(Integer, default=0, nullable=False, index=True)
    is_visible = Column(Boolean, default=True, nullable=False, index=True)
    shortcut_key = Column(String, nullable=True)

    # Dates
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

**Points Clés** :
- ✅ **Hiérarchie** : Support parent/child via `parent_id`
- ✅ **Name unique** : Identifiant clair pour mapping
- ✅ **Active/Visible** : Filtres disponibles
- ✅ **UUID** : Compatible avec le modèle proposé
- ⚠️ **Tarification** : Champs `price`/`max_price` - usage actuel à comprendre

**Recommandations pour Intégration** :
1. **Utiliser directement** cette table pour le mapping
2. Table `CategoryMapping` référencera `categories.id` via `recyclic_category_id`
3. **Pas de modification** nécessaire sur ce modèle

---

### 4. Modèles à Explorer en Priorité

#### A. Sale et SaleItem
**Fichiers** : `models/sale.py` et `models/sale_item.py`

**Objectif** :
- Comprendre la structure des ventes
- Identifier le lien vers les produits/objets vendus
- Localiser le champ `weight` (si existant)
- Valider la possibilité d'agréger les poids

**Questions** :
1. `Sale` contient-il plusieurs `SaleItem` ?
2. `SaleItem` a-t-il un champ `product_id` ou équivalent ?
3. Y a-t-il un modèle `Product` distinct ?
4. Le poids est-il stocké au niveau `SaleItem` ou `Product` ?
5. La catégorie est-elle liée au niveau `Product` ?

#### B. Inventory / Stock (si existant)
**Fichier potentiel** : `models/inventory.py` ou `models/product.py`

**Objectif** :
- Identifier la gestion du stock/inventaire
- Comprendre le cycle de vie : Dépôt → Stock → Vente
- Identifier le flux RECYCLED (objets détruits/recyclés)

**Questions** :
1. Existe-t-il un modèle `InventoryItem` ou `Product` ?
2. Les objets ont-ils un statut `recycled` ou `destroyed` ?
3. Comment est tracé le passage du dépôt au stock puis à la vente ?
4. Y a-t-il une notion de "mouvement" ou "transaction" ?

#### C. Système de Permissions
**Fichier** : `models/permission.py` et `core/security.py`

**Objectif** :
- Comprendre le système de permissions actuel
- Identifier comment ajouter les rôles éco-organismes (eco_admin, eco_declarant, etc.)

**Questions** :
1. Permissions basées sur des rôles prédéfinis ou flexibles ?
2. Y a-t-il une table `roles` et `user_roles` ?
3. Comment sont vérifiées les permissions dans les endpoints (décorateur, middleware) ?
4. Peut-on facilement ajouter de nouveaux rôles ?

---

## Plan d'Audit Détaillé

### Semaine 1 : Exploration Modules Core

#### Jour 1 : Modèles de Données
- [ ] **Lire et documenter** tous les modèles dans `models/`
- [ ] **Créer schéma ERD** de l'existant (focus sur: deposits, sales, categories, inventory)
- [ ] **Identifier les champs** utilisables pour éco-organismes (poids, dates, catégories, statuts)
- [ ] **Lister les enums** existants et leur usage

**Livrable** : Document `audit-modeles-existants.md` avec ERD et analyse détaillée

#### Jour 2 : Services et Logique Métier
- [ ] **Analyser** `services/reception_service.py` (gestion des dépôts)
- [ ] **Analyser** `services/cash_session_service.py` (gestion des ventes)
- [ ] **Analyser** `services/category_service.py` (gestion des catégories)
- [ ] **Identifier** les méthodes réutilisables ou à étendre
- [ ] **Comprendre** les patterns de service (injection de dépendances, transactions, etc.)

**Livrable** : Document `audit-services-existants.md` avec patterns identifiés

#### Jour 3 : API et Endpoints
- [ ] **Analyser** la structure des endpoints (`api/api_v1/endpoints/`)
- [ ] **Comprendre** le router principal (`api/api_v1/api.py`)
- [ ] **Identifier** les patterns de validation (Pydantic schemas)
- [ ] **Comprendre** la gestion des erreurs et exceptions
- [ ] **Analyser** l'authentification et les permissions (décorateurs, middleware)

**Livrable** : Document `audit-api-existante.md` avec conventions à suivre

#### Jour 4-5 : Infrastructure et Outils
- [ ] **Analyser** `core/config.py` : Configuration et variables d'environnement
- [ ] **Analyser** `core/database.py` : Setup base de données et sessions
- [ ] **Analyser** `core/redis.py` : Utilisation du cache
- [ ] **Analyser** `core/audit.py` : Système d'audit existant
- [ ] **Explorer** les migrations Alembic existantes (`migrations/versions/`)
- [ ] **Comprendre** le système de tests (`tests/`)

**Livrable** : Document `audit-infrastructure.md` avec recommandations d'intégration

---

### Semaine 2 : Exploration Chaînes Fonctionnelles

#### Jour 1 : Chaîne "Dépôt → Stock"
**Objectif** : Comprendre le flux RECEIVED

- [ ] **Tracer** le parcours d'un objet depuis son dépôt
- [ ] **Identifier** où et quand le poids est enregistré
- [ ] **Comprendre** les statuts et transitions
- [ ] **Localiser** le lien avec les catégories
- [ ] **Valider** si extension `DepositEcoTracking` est viable

**Livrable** : Diagramme de séquence "Flux RECEIVED" + analyse

#### Jour 2 : Chaîne "Vente"
**Objectif** : Comprendre le flux REUSED

- [ ] **Tracer** le parcours d'un objet vendu
- [ ] **Explorer** modèles `Sale`, `SaleItem`, `Product` (si existants)
- [ ] **Identifier** où est le poids des objets vendus
- [ ] **Comprendre** le lien entre objet déposé et objet vendu (traçabilité)
- [ ] **Valider** faisabilité agrégation poids par catégorie

**Livrable** : Diagramme de séquence "Flux REUSED" + analyse

#### Jour 3 : Chaîne "Recyclage/Destruction"
**Objectif** : Comprendre le flux RECYCLED

- [ ] **Identifier** comment sont marqués les objets recyclés/détruits
- [ ] **Comprendre** le processus de décision (objet non-vendable)
- [ ] **Localiser** les statuts ou champs pertinents
- [ ] **Évaluer** si cette information existe ou doit être créée

**Livrable** : Analyse flux RECYCLED + recommandations

#### Jour 4 : Système de Catégories et Mappings
- [ ] **Analyser** l'usage actuel des catégories dans l'app
- [ ] **Identifier** les points de saisie/modification des catégories
- [ ] **Comprendre** la hiérarchie et son utilisation
- [ ] **Valider** que les catégories sont bien attachées aux objets (deposits, products)
- [ ] **Tester** des requêtes d'agrégation par catégorie

**Livrable** : Analyse système de catégories + requêtes de test

#### Jour 5 : Permissions et Sécurité
- [ ] **Comprendre** le modèle de permissions complet
- [ ] **Identifier** comment créer de nouveaux rôles
- [ ] **Analyser** Row Level Security (si existant)
- [ ] **Proposer** intégration des rôles éco-organismes

**Livrable** : Plan d'intégration des permissions

---

### Semaine 3 : Synthèse et Prototypage

#### Jour 1-2 : Requêtes d'Agrégation
- [ ] **Écrire** requêtes SQL/SQLAlchemy pour chaque flux (RECEIVED, REUSED, RECYCLED)
- [ ] **Tester** sur données réelles ou fixtures
- [ ] **Mesurer** les performances (EXPLAIN ANALYZE)
- [ ] **Optimiser** avec index si nécessaire
- [ ] **Valider** que les calculs sont corrects

**Livrable** : Fichier `aggregation_queries.py` avec requêtes documentées et testées

#### Jour 3 : Preuve de Concept (PoC) Technique
- [ ] **Créer** une migration test avec une table simplifiée (ex: `eco_test`)
- [ ] **Implémenter** un endpoint API minimal pour test
- [ ] **Tester** l'intégration avec l'existant (pas de régression)
- [ ] **Valider** le pattern de développement

**Livrable** : PoC fonctionnel + retour d'expérience

#### Jour 4 : Documentation des Points d'Intégration
- [ ] **Consolider** toutes les analyses précédentes
- [ ] **Créer** document de référence "Points d'Intégration"
- [ ] **Lister** les modifications nécessaires (minimales) sur l'existant
- [ ] **Identifier** les risques techniques et mitigations

**Livrable** : Document `points-integration-detail.md`

#### Jour 5 : Présentation et Validation
- [ ] **Préparer** présentation des findings
- [ ] **Session** avec équipe technique (2h)
- [ ] **Valider** l'approche d'intégration
- [ ] **Ajuster** le modèle de données proposé si nécessaire
- [ ] **Obtenir** le GO pour phase 3 (prototypage)

**Livrable** : Présentation + Compte-rendu de validation

---

## Pistes d'Analyse Concrètes (Basées sur Exploration Initiale)

### Piste 1 : Extension du Modèle Deposit

**Constat** :
Le modèle `Deposit` actuel utilise un enum `EEECategory` spécifique aux DEEE, incompatible avec un système de catégories génériques.

**Hypothèse** :
Créer une table d'extension `DepositEcoTracking` en relation 1:1 avec `Deposit`.

**Validation nécessaire** :
1. ✅ Vérifier qu'il n'y a **pas déjà** de lien entre `Deposit` et `Category`
2. ✅ Confirmer que `weight` dans `Deposit` est **toujours renseigné** pour objets traçables
3. ⚠️ Identifier si certains dépôts **n'ont pas de poids** (et pourquoi)
4. ✅ Valider que `created_at` est fiable pour filtrage par période

**Requête de test** :
```sql
-- Vérifier la couverture du champ weight
SELECT
    COUNT(*) as total_deposits,
    COUNT(weight) as deposits_with_weight,
    COUNT(*) - COUNT(weight) as deposits_without_weight,
    AVG(weight) as avg_weight,
    MIN(weight) as min_weight,
    MAX(weight) as max_weight
FROM deposits
WHERE status IN ('validated', 'completed');
```

**Action** :
- [ ] Exécuter requête de test
- [ ] Analyser les résultats
- [ ] Décider si `DepositEcoTracking` est nécessaire ou si on peut utiliser directement `Deposit`

---

### Piste 2 : Chaîne Sale → Product/Category

**Constat** :
Le modèle `CashSession` a une relation vers `Sale`, mais la structure complète `Sale → SaleItem → Product` doit être confirmée.

**Hypothèse** :
Il existe une chaîne `CashSession → Sale → SaleItem → Product` où `Product` a un champ `weight` et `category_id`.

**Validation nécessaire** :
1. ⚠️ **Lire** `models/sale.py` et `models/sale_item.py`
2. ⚠️ **Identifier** si modèle `Product` existe (ou équivalent)
3. ⚠️ **Localiser** le champ `weight` dans la chaîne
4. ⚠️ **Vérifier** le lien avec `Category`
5. ⚠️ **Comprendre** si objets vendus = objets déposés (traçabilité)

**Requête de test** (à adapter) :
```sql
-- Hypothèse à valider
SELECT
    cs.id as session_id,
    cs.closed_at,
    COUNT(s.id) as nb_sales,
    SUM(si.quantity) as total_items,
    SUM(p.weight * si.quantity) as total_weight  -- Si cette structure existe
FROM cash_sessions cs
JOIN sales s ON s.cash_session_id = cs.id
JOIN sale_items si ON si.sale_id = s.id
JOIN products p ON p.id = si.product_id  -- À valider
WHERE cs.status = 'closed'
GROUP BY cs.id, cs.closed_at;
```

**Actions** :
- [ ] Lire fichiers `sale.py` et `sale_item.py`
- [ ] Chercher modèle `Product` ou équivalent
- [ ] Adapter requête de test
- [ ] Valider faisabilité agrégation

---

### Piste 3 : Flux RECYCLED - Stratégies Possibles

**Constat** :
Le flux RECYCLED (objets recyclés/détruits) n'est pas évident dans les modèles analysés.

**Stratégies à explorer** :

#### Stratégie A : Statut sur Deposit
Si les objets non-vendables sont marqués directement dans `Deposit` avec un statut spécifique.

**Validation** :
```sql
-- Lister les statuts existants et leur fréquence
SELECT status, COUNT(*)
FROM deposits
GROUP BY status;
```

**Action** :
- [ ] Identifier si un statut type `recycled`, `destroyed`, `rejected` existe
- [ ] Si oui : Utiliser ce statut pour flux RECYCLED

#### Stratégie B : Table séparée `RecyclingOperation`
Si le recyclage est un processus séparé avec traçabilité.

**Validation** :
- [ ] Chercher modèle `RecyclingOperation`, `WasteManagement`, ou similaire
- [ ] Analyser sa structure et relations

#### Stratégie C : Déduction (Gisement - Réemploi)
Si pas de traçabilité explicite, calculer par différence.

**Formule** :
```
Recyclé = Gisement - Réemploi
```

**Inconvénient** : Moins précis, ne capture pas les objets encore en stock

**Action** :
- [ ] Évaluer si cette approximation est acceptable
- [ ] Documenter les limites

---

### Piste 4 : Performance des Agrégations

**Constat** :
Les agrégations sur plusieurs mois avec mappings peuvent être lourdes.

**Stratégie** :
Utiliser des **vues matérialisées** ou un **système de cache**.

**Validation nécessaire** :
1. ⚠️ Identifier si vues matérialisées sont déjà utilisées dans le projet
2. ⚠️ Comprendre la fréquence de rafraîchissement acceptable
3. ⚠️ Mesurer les temps de réponse des requêtes d'agrégation
4. ⚠️ Évaluer Redis pour cache des calculs (TTL de 24h par exemple)

**Approche recommandée** :
1. **Phase 1 (MVP)** : Calculs à la demande (simples, peut être lent)
2. **Phase 2** : Cache Redis avec invalidation intelligente
3. **Phase 3** : Vues matérialisées rafraîchies quotidiennement

**Actions** :
- [ ] Mesurer temps de calcul sur jeu de données réel (3 mois de données)
- [ ] Si > 2 secondes : Implémenter cache Redis
- [ ] Si > 10 secondes : Considérer vues matérialisées

---

## Checklist d'Audit

### Modèles de Données
- [ ] Tous les modèles listés et documentés
- [ ] ERD complet créé
- [ ] Relations entre entités comprises
- [ ] Champs `weight` localisés (deposits, products, etc.)
- [ ] Champs de dates identifiés pour filtrage par période
- [ ] Statuts et enums documentés
- [ ] Contraintes et index analysés

### Services et Logique Métier
- [ ] Services existants listés et analysés
- [ ] Patterns de services identifiés (injection dépendances, transactions)
- [ ] Méthodes réutilisables identifiées
- [ ] Points d'extension localisés

### API et Endpoints
- [ ] Structure des endpoints comprise
- [ ] Patterns de validation (Pydantic) documentés
- [ ] Gestion d'erreurs analysée
- [ ] Système d'authentification et permissions compris
- [ ] Conventions de nommage identifiées

### Infrastructure
- [ ] Configuration et variables d'environnement documentées
- [ ] Setup base de données et sessions compris
- [ ] Utilisation de Redis identifiée
- [ ] Système d'audit existant analysé
- [ ] Migrations Alembic explorées
- [ ] Tests existants analysés

### Flux Fonctionnels
- [ ] Flux RECEIVED (dépôt) tracé et documenté
- [ ] Flux REUSED (vente) tracé et documenté
- [ ] Flux RECYCLED (recyclage) identifié ou stratégie définie
- [ ] Diagrammes de séquence créés pour chaque flux

### Permissions et Sécurité
- [ ] Modèle de permissions compris
- [ ] Méthode d'ajout de nouveaux rôles identifiée
- [ ] Row Level Security (si existant) analysé
- [ ] Plan d'intégration des rôles éco-organismes défini

### Requêtes et Performance
- [ ] Requêtes d'agrégation écrites et testées pour chaque flux
- [ ] Performances mesurées (temps de réponse)
- [ ] Index nécessaires identifiés
- [ ] Stratégie de cache définie si nécessaire

### Preuve de Concept
- [ ] Migration test créée
- [ ] Endpoint API minimal implémenté
- [ ] Intégration avec existant testée (pas de régression)
- [ ] Pattern de développement validé

---

## Livrables Finaux de Phase 2

À l'issue de cette phase d'analyse technique, les livrables suivants doivent être produits :

1. **📄 Rapport d'Audit Complet** (30-50 pages)
   - ERD de l'existant
   - Documentation des modèles, services, API
   - Analyse des flux fonctionnels
   - Diagrammes de séquence

2. **🗺️ Document "Points d'Intégration Détaillés"** (10-15 pages)
   - Liste exhaustive des points d'intégration
   - Modifications nécessaires sur l'existant (si)
   - Risques techniques et mitigations
   - Recommandations d'implémentation

3. **💻 Fichier `aggregation_queries.py`**
   - Requêtes SQLAlchemy pour chaque flux
   - Commentées et documentées
   - Testées sur données réelles/fixtures
   - Mesures de performance incluses

4. **🧪 Preuve de Concept (PoC)**
   - Code source dans branche `poc/eco-organisms`
   - Migration de test
   - Endpoint API minimal
   - Documentation d'installation et test

5. **📊 Présentation Findings** (Slides)
   - Synthèse des analyses
   - Schémas et diagrammes
   - Recommandations clés
   - Next steps

6. **📋 Plan de Développement Ajusté** (v2)
   - Mise à jour du plan initial basé sur findings
   - Séquençage des sprints ajusté
   - Estimation des charges revue
   - Risques techniques identifiés et mitigés

---

## Risques et Mitigations

### Risque 1 : Flux RECYCLED non tracé
**Impact** : Impossibilité de déclarer ce flux à eco-maison
**Probabilité** : MOYENNE
**Mitigation** :
- Option A : Ajouter champ de statut ou table dédiée (développement additionnel)
- Option B : Utiliser calcul par différence (moins précis mais rapide)
- Option C : Reporter cette fonctionnalité en v2 (déclarer seulement RECEIVED et REUSED)

### Risque 2 : Poids non renseignés systématiquement
**Impact** : Calculs automatiques incomplets, nécessité de saisie manuelle
**Probabilité** : FAIBLE (champ weight existe)
**Mitigation** :
- Analyse de couverture (combien de deposits ont weight = NULL ?)
- Si < 5% : Acceptable, signaler dans UI
- Si > 5% : Sensibiliser équipe terrain à renseigner poids

### Risque 3 : Performances des agrégations insuffisantes
**Impact** : Lenteur de l'application, mauvaise UX
**Probabilité** : MOYENNE
**Mitigation** :
- Mesurer dès la phase d'audit
- Implémenter cache Redis si nécessaire
- Utiliser vues matérialisées en dernier recours

### Risque 4 : Incompatibilité avec architecture existante
**Impact** : Refonte majeure nécessaire, délais allongés
**Probabilité** : FAIBLE
**Mitigation** :
- Audit approfondi en phase 2
- PoC pour valider l'intégration
- Approche modulaire (extension, pas modification)

### Risque 5 : Données historiques inexploitables
**Impact** : Pas de déclarations rétroactives possibles
**Probabilité** : MOYENNE
**Mitigation** :
- Analyser qualité des données historiques
- Définir date de démarrage réaliste (ex: T2 2025)
- Documenter limitations

---

## Critères de Succès de la Phase 2

✅ **Audit complet réalisé** (tous les modèles, services, API analysés)
✅ **Flux RECEIVED et REUSED** clairement identifiés et documentés
✅ **Flux RECYCLED** : Stratégie définie (même si non-idéale)
✅ **Requêtes d'agrégation** écrites, testées, et performantes (< 2s)
✅ **PoC technique** fonctionnel et validé par équipe
✅ **Points d'intégration** clairement documentés
✅ **Risques techniques** identifiés avec mitigations
✅ **Plan de développement** ajusté et réaliste
✅ **GO de l'équipe technique** pour phase 3 (prototypage)

---

**Prochaine étape** : [07-plan-prototypage.md](07-plan-prototypage.md) - Phase 3 de Prototypage UI/UX

---

## Notes pour l'Équipe d'Audit

### Composition Équipe Recommandée
- **1 Backend Senior** : Lead audit, analyse modèles et services
- **1 Backend Junior** : Support, tests, requêtes SQL
- **1 Architecte** : Validation architecture, performance
- **Disponibilité du Tech Lead actuel** : 20-30% pour questions/clarifications

### Outils Nécessaires
- Accès lecture à la base de données (staging ou copie anonymisée)
- Environnement de développement local fonctionnel
- Outils de diagrammes (draw.io, dbdiagram.io)
- PostgreSQL + pgAdmin ou DBeaver pour analyses SQL

### Règles d'Engagement
1. **Ne rien modifier** dans la base de données de production
2. **Ne rien committer** sur la branche main pendant l'audit
3. **Utiliser branche dédiée** `audit/eco-organisms` pour notes et tests
4. **Documenter au fur et à mesure** (ne pas attendre la fin)
5. **Poser des questions** au Tech Lead dès qu'un point n'est pas clair
6. **Partager les findings** en daily stand-ups (15 min/jour)

---

**Document créé le** : 2025-11-20
**Version** : 1.0
**Statut** : PROPOSITION - Plan d'audit technique détaillé
**Basé sur** : Exploration initiale du codebase RecyClique
