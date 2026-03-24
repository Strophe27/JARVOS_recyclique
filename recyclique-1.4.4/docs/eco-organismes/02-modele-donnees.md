# Modèle de Données - Module Éco-organismes

## Vue d'Ensemble

Ce document définit le modèle de données complet pour le module de gestion des éco-organismes dans RecyClique. Le modèle est conçu pour être:
- **Flexible** : Support de multiples éco-organismes avec configurations variées
- **Évolutif** : Facilite l'ajout de nouveaux partenaires et fonctionnalités
- **Intégré** : Connexions cohérentes avec les modules existants (deposits, inventory, cash_sessions)
- **Performant** : Optimisé pour les agrégations et calculs trimestriels

---

## Schéma Global des Entités

```
┌─────────────────────┐
│  EcoOrganism        │
│  (Partenaire)       │
└──────────┬──────────┘
           │ 1:N
           ▼
┌─────────────────────────┐       ┌──────────────────────┐
│  EcoOrganismCategory    │──────▶│  SupportRate         │
│  (Catégories)           │ 1:N   │  (Taux de soutien)   │
└──────────┬──────────────┘       └──────────────────────┘
           │ N:M
           │ (via CategoryMapping)
           │
           ▼
┌─────────────────────┐       ┌──────────────────────┐
│  Category           │       │  DeclarationPeriod   │
│  (Catégories        │       │  (Périodes)          │
│   RecyClique)       │       └─────────┬────────────┘
└─────────────────────┘                 │ 1:N
                                        ▼
                            ┌──────────────────────┐
                            │  Declaration         │
                            │  (Déclarations)      │
                            └─────────┬────────────┘
                                      │ 1:N
                                      ▼
                            ┌──────────────────────┐
                            │  DeclarationItem     │
                            │  (Lignes détail)     │
                            └──────────────────────┘

┌─────────────────────┐
│  Reminder           │
│  (Rappels auto)     │
└─────────────────────┘

┌─────────────────────┐       ┌──────────────────────┐
│  Deposit            │──────▶│  DepositEcoTracking  │
│  (Module existant)  │ 1:1   │  (Extension)         │
└─────────────────────┘       └──────────────────────┘
```

---

## Entités Principales

### 1. EcoOrganism (Éco-organisme Partenaire)

**Description** : Représente un partenaire éco-organisme (eco-maison, autre REP, etc.)

#### Attributs
```python
class EcoOrganism(Base):
    __tablename__ = "eco_organisms"

    id: UUID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Informations générales
    name: str = Column(String(100), nullable=False, unique=True)  # "eco-maison"
    full_name: str = Column(String(255), nullable=True)  # "Éco-organisme de la maison et du jardin"
    code: str = Column(String(20), nullable=False, unique=True)  # "ECO_MAISON"

    # Description et documentation
    description: str = Column(Text, nullable=True)
    website_url: str = Column(String(255), nullable=True)
    logo_url: str = Column(String(255), nullable=True)

    # Configuration technique
    declaration_platform_url: str = Column(String(255), nullable=True)
    api_endpoint: str = Column(String(255), nullable=True)  # Pour futures intégrations
    api_key_encrypted: str = Column(Text, nullable=True)  # Clé API chiffrée

    # Configuration des déclarations
    declaration_frequency: str = Column(Enum("QUARTERLY", "MONTHLY", "YEARLY"), default="QUARTERLY")
    declaration_window_days: int = Column(Integer, default=45)  # Durée fenêtre de déclaration
    declaration_start_offset_days: int = Column(Integer, default=1)  # Début après fin période

    # Contact
    contact_name: str = Column(String(100), nullable=True)
    contact_email: str = Column(String(150), nullable=True)
    contact_phone: str = Column(String(20), nullable=True)
    support_email: str = Column(String(150), nullable=True)

    # Statut et dates
    is_active: bool = Column(Boolean, default=True)
    partnership_start_date: Date = Column(Date, nullable=True)
    partnership_end_date: Date = Column(Date, nullable=True)

    # Métadonnées
    created_at: datetime = Column(DateTime(timezone=True), server_default=func.now())
    updated_at: datetime = Column(DateTime(timezone=True), onupdate=func.now())
    created_by_id: UUID = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Relations
    categories: List["EcoOrganismCategory"] = relationship("EcoOrganismCategory", back_populates="eco_organism")
    declaration_periods: List["DeclarationPeriod"] = relationship("DeclarationPeriod", back_populates="eco_organism")
    reminders: List["Reminder"] = relationship("Reminder", back_populates="eco_organism")
```

#### Contraintes
- `name` et `code` doivent être uniques
- `declaration_window_days` > 0
- Si `partnership_end_date` est défini, doit être > `partnership_start_date`

#### Index
```sql
CREATE INDEX idx_eco_organisms_code ON eco_organisms(code);
CREATE INDEX idx_eco_organisms_active ON eco_organisms(is_active);
```

---

### 2. EcoOrganismCategory (Catégories Éco-organisme)

**Description** : Hiérarchie de catégories spécifiques à chaque éco-organisme

#### Attributs
```python
class EcoOrganismCategory(Base):
    __tablename__ = "eco_organism_categories"

    id: UUID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Rattachement éco-organisme
    eco_organism_id: UUID = Column(UUID(as_uuid=True), ForeignKey("eco_organisms.id"), nullable=False)

    # Identification
    code: str = Column(String(50), nullable=False)  # "DEA_ASSISE"
    name: str = Column(String(150), nullable=False)  # "Éléments d'Ameublement - Assise"
    short_name: str = Column(String(50), nullable=True)  # "Assise"

    # Hiérarchie
    parent_id: UUID = Column(UUID(as_uuid=True), ForeignKey("eco_organism_categories.id"), nullable=True)
    level: int = Column(Integer, default=0)  # 0=racine, 1=filière, 2=catégorie, 3=sous-catégorie
    sort_order: int = Column(Integer, default=0)  # Pour tri d'affichage

    # Description
    description: str = Column(Text, nullable=True)
    examples: str = Column(Text, nullable=True)  # Exemples d'objets (JSON array)
    exclusions: str = Column(Text, nullable=True)  # Objets exclus (JSON array)

    # Configuration méthodes déclaration
    allow_weight_declaration: bool = Column(Boolean, default=True)
    allow_count_declaration: bool = Column(Boolean, default=True)
    default_unit_weight_kg: Decimal = Column(Numeric(10, 3), nullable=True)  # Poids moyen pour abaques

    # Statut
    is_active: bool = Column(Boolean, default=True)

    # Métadonnées
    created_at: datetime = Column(DateTime(timezone=True), server_default=func.now())
    updated_at: datetime = Column(DateTime(timezone=True), onupdate=func.now())

    # Relations
    eco_organism: "EcoOrganism" = relationship("EcoOrganism", back_populates="categories")
    parent: "EcoOrganismCategory" = relationship("EcoOrganismCategory", remote_side=[id], backref="children")
    support_rates: List["SupportRate"] = relationship("SupportRate", back_populates="category")
    mappings: List["CategoryMapping"] = relationship("CategoryMapping", back_populates="eco_category")
    declaration_items: List["DeclarationItem"] = relationship("DeclarationItem", back_populates="eco_category")
```

#### Contraintes
```sql
-- Combinaison éco-organisme + code unique
ALTER TABLE eco_organism_categories ADD CONSTRAINT uq_eco_organism_category_code
    UNIQUE (eco_organism_id, code);

-- Vérification niveau hiérarchique
ALTER TABLE eco_organism_categories ADD CONSTRAINT chk_level_positive
    CHECK (level >= 0 AND level <= 5);
```

#### Index
```sql
CREATE INDEX idx_eco_categories_organism ON eco_organism_categories(eco_organism_id);
CREATE INDEX idx_eco_categories_parent ON eco_organism_categories(parent_id);
CREATE INDEX idx_eco_categories_code ON eco_organism_categories(code);
CREATE INDEX idx_eco_categories_active ON eco_organism_categories(is_active);
```

---

### 3. SupportRate (Taux de Soutien Financier)

**Description** : Montants des soutiens financiers par catégorie et type de flux

#### Attributs
```python
class SupportRate(Base):
    __tablename__ = "support_rates"

    id: UUID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Rattachement
    eco_organism_id: UUID = Column(UUID(as_uuid=True), ForeignKey("eco_organisms.id"), nullable=False)
    eco_category_id: UUID = Column(UUID(as_uuid=True), ForeignKey("eco_organism_categories.id"), nullable=False)

    # Type de flux
    flow_type: str = Column(Enum("RECEIVED", "REUSED", "RECYCLED"), nullable=False)

    # Montant du soutien
    rate_per_tonne: Decimal = Column(Numeric(10, 2), nullable=False)  # €/tonne
    rate_per_unit: Decimal = Column(Numeric(10, 2), nullable=True)  # €/unité (forfaits équipement)

    # Période de validité
    valid_from: Date = Column(Date, nullable=False)
    valid_until: Date = Column(Date, nullable=True)  # NULL = indéfini

    # Description
    description: str = Column(Text, nullable=True)

    # Métadonnées
    created_at: datetime = Column(DateTime(timezone=True), server_default=func.now())
    updated_at: datetime = Column(DateTime(timezone=True), onupdate=func.now())

    # Relations
    eco_organism: "EcoOrganism" = relationship("EcoOrganism")
    category: "EcoOrganismCategory" = relationship("EcoOrganismCategory", back_populates="support_rates")
```

#### Contraintes
```sql
-- Pas de chevauchement de périodes pour une même catégorie + flux
CREATE UNIQUE INDEX uq_support_rate_category_flow_period
    ON support_rates(eco_category_id, flow_type, valid_from, valid_until);

-- Taux positifs
ALTER TABLE support_rates ADD CONSTRAINT chk_rate_positive
    CHECK (rate_per_tonne >= 0 AND (rate_per_unit IS NULL OR rate_per_unit >= 0));

-- Validité période
ALTER TABLE support_rates ADD CONSTRAINT chk_valid_period
    CHECK (valid_until IS NULL OR valid_until >= valid_from);
```

#### Index
```sql
CREATE INDEX idx_support_rates_category ON support_rates(eco_category_id);
CREATE INDEX idx_support_rates_flow ON support_rates(flow_type);
CREATE INDEX idx_support_rates_validity ON support_rates(valid_from, valid_until);
```

---

### 4. CategoryMapping (Mapping des Catégories)

**Description** : Correspondances entre catégories RecyClique et catégories éco-organismes

#### Attributs
```python
class CategoryMapping(Base):
    __tablename__ = "category_mappings"

    id: UUID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Source (RecyClique)
    recyclic_category_id: UUID = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)

    # Destination (Éco-organisme)
    eco_organism_id: UUID = Column(UUID(as_uuid=True), ForeignKey("eco_organisms.id"), nullable=False)
    eco_category_id: UUID = Column(UUID(as_uuid=True), ForeignKey("eco_organism_categories.id"), nullable=False)

    # Type de flux concerné
    flow_type: str = Column(Enum("RECEIVED", "REUSED", "RECYCLED", "ALL"), default="ALL")

    # Règles de mapping
    weight_ratio: Decimal = Column(Numeric(5, 2), default=1.0)  # Coefficient multiplicateur (ex: 0.5 si 50% du poids)
    priority: int = Column(Integer, default=0)  # En cas de mappings multiples, ordre de priorité

    # Conditions supplémentaires (JSON)
    conditions: str = Column(JSON, nullable=True)  # Ex: {"min_weight": 5, "item_status": "good"}

    # Notes
    notes: str = Column(Text, nullable=True)

    # Statut
    is_active: bool = Column(Boolean, default=True)

    # Métadonnées
    created_at: datetime = Column(DateTime(timezone=True), server_default=func.now())
    updated_at: datetime = Column(DateTime(timezone=True), onupdate=func.now())
    created_by_id: UUID = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Relations
    recyclic_category: "Category" = relationship("Category")
    eco_organism: "EcoOrganism" = relationship("EcoOrganism")
    eco_category: "EcoOrganismCategory" = relationship("EcoOrganismCategory", back_populates="mappings")
```

#### Contraintes
```sql
-- Unicité du mapping par catégorie + flux + éco-organisme
CREATE UNIQUE INDEX uq_mapping_category_flow_eco
    ON category_mappings(recyclic_category_id, eco_organism_id, eco_category_id, flow_type);

-- Weight ratio valide
ALTER TABLE category_mappings ADD CONSTRAINT chk_weight_ratio
    CHECK (weight_ratio > 0 AND weight_ratio <= 1);
```

#### Index
```sql
CREATE INDEX idx_mappings_recyclic_category ON category_mappings(recyclic_category_id);
CREATE INDEX idx_mappings_eco_category ON category_mappings(eco_category_id);
CREATE INDEX idx_mappings_eco_organism ON category_mappings(eco_organism_id);
CREATE INDEX idx_mappings_flow ON category_mappings(flow_type);
CREATE INDEX idx_mappings_active ON category_mappings(is_active);
```

---

### 5. DeclarationPeriod (Période de Déclaration)

**Description** : Définit les périodes de déclaration (trimestres, etc.) pour chaque éco-organisme

#### Attributs
```python
class DeclarationPeriod(Base):
    __tablename__ = "declaration_periods"

    id: UUID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Rattachement
    eco_organism_id: UUID = Column(UUID(as_uuid=True), ForeignKey("eco_organisms.id"), nullable=False)

    # Identification période
    year: int = Column(Integer, nullable=False)
    period_number: int = Column(Integer, nullable=False)  # 1, 2, 3, 4 pour trimestres
    period_type: str = Column(Enum("QUARTER", "MONTH", "YEAR"), default="QUARTER")
    label: str = Column(String(50), nullable=False)  # "T1 2025", "Janvier 2025"

    # Dates de la période d'activité
    activity_start_date: Date = Column(Date, nullable=False)
    activity_end_date: Date = Column(Date, nullable=False)

    # Dates de la fenêtre de déclaration
    declaration_start_date: Date = Column(Date, nullable=False)
    declaration_end_date: Date = Column(Date, nullable=False)

    # Statut
    status: str = Column(Enum("PENDING", "OPEN", "IN_PROGRESS", "SUBMITTED", "VALIDATED", "CLOSED"), default="PENDING")

    # Métadonnées
    created_at: datetime = Column(DateTime(timezone=True), server_default=func.now())
    updated_at: datetime = Column(DateTime(timezone=True), onupdate=func.now())

    # Relations
    eco_organism: "EcoOrganism" = relationship("EcoOrganism", back_populates="declaration_periods")
    declaration: "Declaration" = relationship("Declaration", back_populates="period", uselist=False)
    reminders: List["Reminder"] = relationship("Reminder", back_populates="period")
```

#### Contraintes
```sql
-- Unicité par éco-organisme + année + numéro période
ALTER TABLE declaration_periods ADD CONSTRAINT uq_period_organism_year_number
    UNIQUE (eco_organism_id, year, period_number);

-- Cohérence des dates
ALTER TABLE declaration_periods ADD CONSTRAINT chk_period_dates
    CHECK (activity_end_date >= activity_start_date
        AND declaration_start_date >= activity_end_date
        AND declaration_end_date >= declaration_start_date);
```

#### Index
```sql
CREATE INDEX idx_periods_organism ON declaration_periods(eco_organism_id);
CREATE INDEX idx_periods_year ON declaration_periods(year);
CREATE INDEX idx_periods_status ON declaration_periods(status);
CREATE INDEX idx_periods_declaration_dates ON declaration_periods(declaration_start_date, declaration_end_date);
```

---

### 6. Declaration (Déclaration Trimestrielle)

**Description** : Représente une déclaration complète pour une période donnée

#### Attributs
```python
class Declaration(Base):
    __tablename__ = "declarations"

    id: UUID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Rattachement
    period_id: UUID = Column(UUID(as_uuid=True), ForeignKey("declaration_periods.id"), nullable=False, unique=True)
    eco_organism_id: UUID = Column(UUID(as_uuid=True), ForeignKey("eco_organisms.id"), nullable=False)

    # Référence externe (numéro de déclaration éco-organisme)
    external_reference: str = Column(String(100), nullable=True)

    # Dates importantes
    submitted_at: datetime = Column(DateTime(timezone=True), nullable=True)
    validated_at: datetime = Column(DateTime(timezone=True), nullable=True)

    # Statut
    status: str = Column(Enum("DRAFT", "IN_PROGRESS", "SUBMITTED", "VALIDATED", "REJECTED", "CLOSED"), default="DRAFT")

    # Méthode de déclaration principale
    primary_method: str = Column(Enum("WEIGHT", "COUNT", "MIXED"), default="WEIGHT")

    # Totaux généraux (dénormalisés pour performance)
    total_received_weight_kg: Decimal = Column(Numeric(12, 2), default=0)
    total_reused_weight_kg: Decimal = Column(Numeric(12, 2), default=0)
    total_recycled_weight_kg: Decimal = Column(Numeric(12, 2), default=0)

    total_received_count: int = Column(Integer, default=0)
    total_reused_count: int = Column(Integer, default=0)
    total_recycled_count: int = Column(Integer, default=0)

    # Montants financiers (dénormalisés)
    total_support_received_eur: Decimal = Column(Numeric(12, 2), default=0)
    total_support_reused_eur: Decimal = Column(Numeric(12, 2), default=0)
    total_support_recycled_eur: Decimal = Column(Numeric(12, 2), default=0)
    total_support_eur: Decimal = Column(Numeric(12, 2), default=0)

    # Proforma et paiement
    proforma_number: str = Column(String(100), nullable=True)
    proforma_issued_at: datetime = Column(DateTime(timezone=True), nullable=True)
    payment_received_at: datetime = Column(DateTime(timezone=True), nullable=True)
    payment_amount_eur: Decimal = Column(Numeric(12, 2), nullable=True)

    # Notes et pièces jointes
    notes: str = Column(Text, nullable=True)
    attachments: str = Column(JSON, nullable=True)  # URLs des fichiers joints

    # Métadonnées
    created_at: datetime = Column(DateTime(timezone=True), server_default=func.now())
    updated_at: datetime = Column(DateTime(timezone=True), onupdate=func.now())
    created_by_id: UUID = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    submitted_by_id: UUID = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Relations
    period: "DeclarationPeriod" = relationship("DeclarationPeriod", back_populates="declaration")
    eco_organism: "EcoOrganism" = relationship("EcoOrganism")
    items: List["DeclarationItem"] = relationship("DeclarationItem", back_populates="declaration", cascade="all, delete-orphan")
```

#### Contraintes
```sql
-- Période unique par déclaration
ALTER TABLE declarations ADD CONSTRAINT uq_declaration_period UNIQUE (period_id);

-- Totaux cohérents
ALTER TABLE declarations ADD CONSTRAINT chk_totals_positive
    CHECK (total_received_weight_kg >= 0
        AND total_reused_weight_kg >= 0
        AND total_recycled_weight_kg >= 0);

-- Cohérence des dates
ALTER TABLE declarations ADD CONSTRAINT chk_declaration_dates
    CHECK ((submitted_at IS NULL OR created_at <= submitted_at)
        AND (validated_at IS NULL OR submitted_at IS NULL OR submitted_at <= validated_at));
```

#### Index
```sql
CREATE INDEX idx_declarations_period ON declarations(period_id);
CREATE INDEX idx_declarations_organism ON declarations(eco_organism_id);
CREATE INDEX idx_declarations_status ON declarations(status);
CREATE INDEX idx_declarations_submitted ON declarations(submitted_at);
CREATE INDEX idx_declarations_external_ref ON declarations(external_reference);
```

---

### 7. DeclarationItem (Ligne de Déclaration)

**Description** : Détail d'une déclaration par catégorie et flux

#### Attributs
```python
class DeclarationItem(Base):
    __tablename__ = "declaration_items"

    id: UUID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Rattachement
    declaration_id: UUID = Column(UUID(as_uuid=True), ForeignKey("declarations.id"), nullable=False)
    eco_category_id: UUID = Column(UUID(as_uuid=True), ForeignKey("eco_organism_categories.id"), nullable=False)

    # Type de flux
    flow_type: str = Column(Enum("RECEIVED", "REUSED", "RECYCLED"), nullable=False)

    # Données déclarées
    declaration_method: str = Column(Enum("WEIGHT", "COUNT"), nullable=False)
    weight_kg: Decimal = Column(Numeric(12, 2), nullable=True)
    count: int = Column(Integer, nullable=True)

    # Conversion (si méthode COUNT)
    unit_weight_kg: Decimal = Column(Numeric(10, 3), nullable=True)  # Poids unitaire utilisé pour conversion
    calculated_weight_kg: Decimal = Column(Numeric(12, 2), nullable=True)  # = count * unit_weight_kg

    # Soutien financier
    support_rate_per_tonne: Decimal = Column(Numeric(10, 2), nullable=True)
    support_amount_eur: Decimal = Column(Numeric(12, 2), default=0)

    # Sources de données (traçabilité)
    source_data: str = Column(JSON, nullable=True)  # Références aux objets sources (deposits, sales, etc.)

    # Notes
    notes: str = Column(Text, nullable=True)

    # Métadonnées
    created_at: datetime = Column(DateTime(timezone=True), server_default=func.now())
    updated_at: datetime = Column(DateTime(timezone=True), onupdate=func.now())

    # Relations
    declaration: "Declaration" = relationship("Declaration", back_populates="items")
    eco_category: "EcoOrganismCategory" = relationship("EcoOrganismCategory", back_populates="declaration_items")
```

#### Contraintes
```sql
-- Unicité par déclaration + catégorie + flux
ALTER TABLE declaration_items ADD CONSTRAINT uq_item_declaration_category_flow
    UNIQUE (declaration_id, eco_category_id, flow_type);

-- Données cohérentes selon méthode
ALTER TABLE declaration_items ADD CONSTRAINT chk_item_method_data
    CHECK (
        (declaration_method = 'WEIGHT' AND weight_kg IS NOT NULL AND weight_kg >= 0) OR
        (declaration_method = 'COUNT' AND count IS NOT NULL AND count >= 0 AND unit_weight_kg IS NOT NULL)
    );

-- Montants positifs
ALTER TABLE declaration_items ADD CONSTRAINT chk_item_amounts_positive
    CHECK (support_amount_eur >= 0);
```

#### Index
```sql
CREATE INDEX idx_items_declaration ON declaration_items(declaration_id);
CREATE INDEX idx_items_category ON declaration_items(eco_category_id);
CREATE INDEX idx_items_flow ON declaration_items(flow_type);
CREATE INDEX idx_items_method ON declaration_items(declaration_method);
```

---

### 8. Reminder (Rappels Automatiques)

**Description** : Système de rappels pour les échéances de déclaration

#### Attributs
```python
class Reminder(Base):
    __tablename__ = "reminders"

    id: UUID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Rattachement
    eco_organism_id: UUID = Column(UUID(as_uuid=True), ForeignKey("eco_organisms.id"), nullable=False)
    period_id: UUID = Column(UUID(as_uuid=True), ForeignKey("declaration_periods.id"), nullable=True)

    # Type de rappel
    reminder_type: str = Column(Enum("DECLARATION_OPENING", "DECLARATION_REMINDER", "DECLARATION_URGENT", "DECLARATION_CLOSED"), nullable=False)

    # Planification
    scheduled_date: datetime = Column(DateTime(timezone=True), nullable=False)
    days_before_deadline: int = Column(Integer, nullable=True)  # Ex: 7 jours avant

    # Destinataires
    recipient_user_ids: str = Column(JSON, nullable=False)  # Liste des user IDs
    recipient_emails: str = Column(JSON, nullable=True)  # Liste d'emails additionnels

    # Contenu
    subject: str = Column(String(255), nullable=False)
    message: str = Column(Text, nullable=False)

    # Statut
    status: str = Column(Enum("PENDING", "SENT", "FAILED", "CANCELLED"), default="PENDING")
    sent_at: datetime = Column(DateTime(timezone=True), nullable=True)

    # Résultats d'envoi
    sent_count: int = Column(Integer, default=0)
    failed_count: int = Column(Integer, default=0)
    error_message: str = Column(Text, nullable=True)

    # Métadonnées
    created_at: datetime = Column(DateTime(timezone=True), server_default=func.now())
    updated_at: datetime = Column(DateTime(timezone=True), onupdate=func.now())

    # Relations
    eco_organism: "EcoOrganism" = relationship("EcoOrganism", back_populates="reminders")
    period: "DeclarationPeriod" = relationship("DeclarationPeriod", back_populates="reminders")
```

#### Index
```sql
CREATE INDEX idx_reminders_organism ON reminders(eco_organism_id);
CREATE INDEX idx_reminders_period ON reminders(period_id);
CREATE INDEX idx_reminders_scheduled ON reminders(scheduled_date);
CREATE INDEX idx_reminders_status ON reminders(status);
CREATE INDEX idx_reminders_type ON reminders(reminder_type);
```

---

## Extensions aux Modules Existants

### 9. DepositEcoTracking (Extension du module Deposit)

**Description** : Table d'extension pour lier les dépôts au suivi éco-organismes

#### Attributs
```python
class DepositEcoTracking(Base):
    __tablename__ = "deposit_eco_tracking"

    id: UUID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Lien avec deposit
    deposit_id: UUID = Column(UUID(as_uuid=True), ForeignKey("deposits.id"), nullable=False, unique=True)

    # Informations de pesée
    total_weight_kg: Decimal = Column(Numeric(10, 2), nullable=True)
    weighed_at: datetime = Column(DateTime(timezone=True), nullable=True)
    weighing_ticket_number: str = Column(String(50), nullable=True)

    # Mapping éco-organisme (si applicable)
    eco_organism_id: UUID = Column(UUID(as_uuid=True), ForeignKey("eco_organisms.id"), nullable=True)
    eco_category_id: UUID = Column(UUID(as_uuid=True), ForeignKey("eco_organism_categories.id"), nullable=True)

    # Destination prévue (pour prédiction flux)
    expected_destination: str = Column(Enum("REUSE", "RECYCLE", "UNKNOWN"), default="UNKNOWN")

    # Statut d'inclusion dans déclaration
    included_in_declaration_id: UUID = Column(UUID(as_uuid=True), ForeignKey("declarations.id"), nullable=True)
    included_at: datetime = Column(DateTime(timezone=True), nullable=True)

    # Métadonnées
    created_at: datetime = Column(DateTime(timezone=True), server_default=func.now())
    updated_at: datetime = Column(DateTime(timezone=True), onupdate=func.now())

    # Relations
    deposit: "Deposit" = relationship("Deposit")
    eco_organism: "EcoOrganism" = relationship("EcoOrganism")
    eco_category: "EcoOrganismCategory" = relationship("EcoOrganismCategory")
    declaration: "Declaration" = relationship("Declaration")
```

#### Index
```sql
CREATE UNIQUE INDEX idx_deposit_tracking_deposit ON deposit_eco_tracking(deposit_id);
CREATE INDEX idx_deposit_tracking_organism ON deposit_eco_tracking(eco_organism_id);
CREATE INDEX idx_deposit_tracking_category ON deposit_eco_tracking(eco_category_id);
CREATE INDEX idx_deposit_tracking_declaration ON deposit_eco_tracking(included_in_declaration_id);
```

---

## Vues Matérialisées (Pour Performance)

### 10. MaterializedDeclarationSummary

**Description** : Vue matérialisée pour accélérer l'affichage des déclarations

```sql
CREATE MATERIALIZED VIEW mv_declaration_summary AS
SELECT
    d.id AS declaration_id,
    d.period_id,
    dp.label AS period_label,
    d.eco_organism_id,
    eo.name AS eco_organism_name,
    d.status,
    d.total_received_weight_kg,
    d.total_reused_weight_kg,
    d.total_recycled_weight_kg,
    d.total_support_eur,
    d.submitted_at,
    d.validated_at,
    COUNT(di.id) AS item_count,
    d.created_at,
    d.updated_at
FROM declarations d
JOIN declaration_periods dp ON d.period_id = dp.id
JOIN eco_organisms eo ON d.eco_organism_id = eo.id
LEFT JOIN declaration_items di ON d.id = di.declaration_id
GROUP BY d.id, dp.id, eo.id;

CREATE INDEX idx_mv_declaration_summary_organism ON mv_declaration_summary(eco_organism_id);
CREATE INDEX idx_mv_declaration_summary_period ON mv_declaration_summary(period_id);
CREATE INDEX idx_mv_declaration_summary_status ON mv_declaration_summary(status);
```

### 11. MaterializedCategoryWeights

**Description** : Vue matérialisée pour les poids agrégés par catégorie RecyClique et période

```sql
CREATE MATERIALIZED VIEW mv_category_weights AS
SELECT
    dp.id AS period_id,
    dp.eco_organism_id,
    c.id AS recyclic_category_id,
    c.name AS recyclic_category_name,
    SUM(CASE WHEN d.status = 'accepted' THEN d.total_weight ELSE 0 END) AS received_weight_kg,
    SUM(CASE WHEN cs.status = 'completed' AND csi.product_id IS NOT NULL
             THEN p.weight ELSE 0 END) AS sold_weight_kg,
    COUNT(DISTINCT d.id) AS deposit_count,
    COUNT(DISTINCT cs.id) AS sale_count
FROM declaration_periods dp
CROSS JOIN categories c
LEFT JOIN deposits d ON d.created_at BETWEEN dp.activity_start_date AND dp.activity_end_date
    AND d.category_id = c.id
LEFT JOIN cash_sessions cs ON cs.created_at BETWEEN dp.activity_start_date AND dp.activity_end_date
LEFT JOIN cash_session_items csi ON csi.session_id = cs.id
LEFT JOIN products p ON p.id = csi.product_id AND p.category_id = c.id
GROUP BY dp.id, dp.eco_organism_id, c.id, c.name;

CREATE INDEX idx_mv_category_weights_period ON mv_category_weights(period_id);
CREATE INDEX idx_mv_category_weights_organism ON mv_category_weights(eco_organism_id);
CREATE INDEX idx_mv_category_weights_category ON mv_category_weights(recyclic_category_id);
```

**Rafraîchissement** : À rafraîchir quotidiennement ou à la demande
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_declaration_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_category_weights;
```

---

## Stratégies d'Agrégation des Données

### Flux RECEIVED (Objets Reçus)

**Source** : Table `deposits`

**Logique** :
```sql
SELECT
    cm.eco_category_id,
    SUM(d.total_weight * cm.weight_ratio) AS total_weight_kg,
    COUNT(d.id) AS count
FROM deposits d
JOIN category_mappings cm ON d.category_id = cm.recyclic_category_id
WHERE d.status = 'accepted'
    AND d.created_at BETWEEN :activity_start_date AND :activity_end_date
    AND cm.eco_organism_id = :eco_organism_id
    AND cm.flow_type IN ('RECEIVED', 'ALL')
    AND cm.is_active = true
GROUP BY cm.eco_category_id;
```

### Flux REUSED (Objets Vendus/Sortis pour Réemploi)

**Source** : Tables `cash_sessions`, `cash_session_items`, `products`

**Logique** :
```sql
SELECT
    cm.eco_category_id,
    SUM(p.weight * cm.weight_ratio) AS total_weight_kg,
    COUNT(DISTINCT csi.id) AS count
FROM cash_sessions cs
JOIN cash_session_items csi ON csi.session_id = cs.id
JOIN products p ON p.id = csi.product_id
JOIN category_mappings cm ON p.category_id = cm.recyclic_category_id
WHERE cs.status = 'completed'
    AND cs.closed_at BETWEEN :activity_start_date AND :activity_end_date
    AND cm.eco_organism_id = :eco_organism_id
    AND cm.flow_type IN ('REUSED', 'ALL')
    AND cm.is_active = true
GROUP BY cm.eco_category_id;
```

### Flux RECYCLED (Objets Recyclés/Détruits)

**Source** : À déterminer selon l'architecture existante
- Potentiellement une table `recycling_operations` ou
- Champ `status` dans `products` ou `deposits` avec valeur 'recycled'/'destroyed'

**Logique** (exemple avec status sur products) :
```sql
SELECT
    cm.eco_category_id,
    SUM(p.weight * cm.weight_ratio) AS total_weight_kg,
    COUNT(DISTINCT p.id) AS count
FROM products p
JOIN category_mappings cm ON p.category_id = cm.recyclic_category_id
WHERE p.status = 'recycled'
    AND p.updated_at BETWEEN :activity_start_date AND :activity_end_date
    AND cm.eco_organism_id = :eco_organism_id
    AND cm.flow_type IN ('RECYCLED', 'ALL')
    AND cm.is_active = true
GROUP BY cm.eco_category_id;
```

---

## Triggers et Automatismes

### 1. Auto-création des Périodes de Déclaration

**Trigger** : Lors de l'activation d'un éco-organisme ou en début d'année

```python
def create_declaration_periods_for_year(eco_organism_id: UUID, year: int):
    """
    Crée automatiquement les 4 périodes trimestrielles pour une année donnée
    """
    eco_organism = session.query(EcoOrganism).get(eco_organism_id)

    quarters = [
        (1, f"Q1 {year}", date(year, 1, 1), date(year, 3, 31)),
        (2, f"Q2 {year}", date(year, 4, 1), date(year, 6, 30)),
        (3, f"Q3 {year}", date(year, 7, 1), date(year, 9, 30)),
        (4, f"Q4 {year}", date(year, 10, 1), date(year, 12, 31)),
    ]

    for quarter_num, label, start, end in quarters:
        decl_start = end + timedelta(days=eco_organism.declaration_start_offset_days)
        decl_end = decl_start + timedelta(days=eco_organism.declaration_window_days - 1)

        period = DeclarationPeriod(
            eco_organism_id=eco_organism_id,
            year=year,
            period_number=quarter_num,
            period_type="QUARTER",
            label=label,
            activity_start_date=start,
            activity_end_date=end,
            declaration_start_date=decl_start,
            declaration_end_date=decl_end,
            status="PENDING"
        )
        session.add(period)

    session.commit()
```

### 2. Mise à Jour Automatique des Totaux de Déclaration

**Trigger** : Après insertion/modification/suppression d'un `DeclarationItem`

```sql
CREATE OR REPLACE FUNCTION update_declaration_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE declarations
    SET
        total_received_weight_kg = COALESCE((
            SELECT SUM(COALESCE(weight_kg, calculated_weight_kg, 0))
            FROM declaration_items
            WHERE declaration_id = NEW.declaration_id AND flow_type = 'RECEIVED'
        ), 0),
        total_reused_weight_kg = COALESCE((
            SELECT SUM(COALESCE(weight_kg, calculated_weight_kg, 0))
            FROM declaration_items
            WHERE declaration_id = NEW.declaration_id AND flow_type = 'REUSED'
        ), 0),
        total_recycled_weight_kg = COALESCE((
            SELECT SUM(COALESCE(weight_kg, calculated_weight_kg, 0))
            FROM declaration_items
            WHERE declaration_id = NEW.declaration_id AND flow_type = 'RECYCLED'
        ), 0),
        total_received_count = COALESCE((
            SELECT SUM(COALESCE(count, 0))
            FROM declaration_items
            WHERE declaration_id = NEW.declaration_id AND flow_type = 'RECEIVED'
        ), 0),
        total_reused_count = COALESCE((
            SELECT SUM(COALESCE(count, 0))
            FROM declaration_items
            WHERE declaration_id = NEW.declaration_id AND flow_type = 'REUSED'
        ), 0),
        total_recycled_count = COALESCE((
            SELECT SUM(COALESCE(count, 0))
            FROM declaration_items
            WHERE declaration_id = NEW.declaration_id AND flow_type = 'RECYCLED'
        ), 0),
        total_support_received_eur = COALESCE((
            SELECT SUM(support_amount_eur)
            FROM declaration_items
            WHERE declaration_id = NEW.declaration_id AND flow_type = 'RECEIVED'
        ), 0),
        total_support_reused_eur = COALESCE((
            SELECT SUM(support_amount_eur)
            FROM declaration_items
            WHERE declaration_id = NEW.declaration_id AND flow_type = 'REUSED'
        ), 0),
        total_support_recycled_eur = COALESCE((
            SELECT SUM(support_amount_eur)
            FROM declaration_items
            WHERE declaration_id = NEW.declaration_id AND flow_type = 'RECYCLED'
        ), 0),
        total_support_eur = COALESCE((
            SELECT SUM(support_amount_eur)
            FROM declaration_items
            WHERE declaration_id = NEW.declaration_id
        ), 0),
        updated_at = NOW()
    WHERE id = NEW.declaration_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_declaration_totals
AFTER INSERT OR UPDATE OR DELETE ON declaration_items
FOR EACH ROW
EXECUTE FUNCTION update_declaration_totals();
```

### 3. Calcul Automatique du Soutien Financier

**Trigger** : Avant insertion/modification d'un `DeclarationItem`

```sql
CREATE OR REPLACE FUNCTION calculate_support_amount()
RETURNS TRIGGER AS $$
DECLARE
    rate NUMERIC(10, 2);
    effective_weight NUMERIC(12, 2);
BEGIN
    -- Calculer le poids effectif
    IF NEW.declaration_method = 'WEIGHT' THEN
        effective_weight := NEW.weight_kg;
    ELSIF NEW.declaration_method = 'COUNT' THEN
        NEW.calculated_weight_kg := NEW.count * NEW.unit_weight_kg;
        effective_weight := NEW.calculated_weight_kg;
    END IF;

    -- Récupérer le taux de soutien applicable
    SELECT sr.rate_per_tonne INTO rate
    FROM support_rates sr
    JOIN declaration_items di ON di.eco_category_id = sr.eco_category_id
    JOIN declarations d ON d.id = di.declaration_id
    JOIN declaration_periods dp ON dp.id = d.period_id
    WHERE sr.eco_category_id = NEW.eco_category_id
        AND sr.flow_type = NEW.flow_type
        AND dp.activity_start_date >= sr.valid_from
        AND (sr.valid_until IS NULL OR dp.activity_end_date <= sr.valid_until)
    LIMIT 1;

    -- Calculer le montant du soutien
    IF rate IS NOT NULL THEN
        NEW.support_rate_per_tonne := rate;
        NEW.support_amount_eur := (effective_weight / 1000.0) * rate;  -- Conversion kg → tonnes
    ELSE
        NEW.support_rate_per_tonne := 0;
        NEW.support_amount_eur := 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_support
BEFORE INSERT OR UPDATE ON declaration_items
FOR EACH ROW
EXECUTE FUNCTION calculate_support_amount();
```

---

## Migration et Données Initiales

### Script de Migration (Alembic)

```python
"""Create eco-organisms module tables

Revision ID: eco_organisms_001
Revises: previous_migration_id
Create Date: 2025-11-20

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'eco_organisms_001'
down_revision = 'previous_migration_id'
branch_labels = None
depends_on = None


def upgrade():
    # Création des tables dans l'ordre des dépendances

    # 1. eco_organisms
    op.create_table('eco_organisms',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False, unique=True),
        sa.Column('full_name', sa.String(255)),
        sa.Column('code', sa.String(20), nullable=False, unique=True),
        # ... (tous les autres champs)
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )

    # 2. eco_organism_categories
    op.create_table('eco_organism_categories',
        # ... (définition complète)
    )

    # 3. support_rates
    op.create_table('support_rates',
        # ...
    )

    # 4. category_mappings
    op.create_table('category_mappings',
        # ...
    )

    # 5. declaration_periods
    op.create_table('declaration_periods',
        # ...
    )

    # 6. declarations
    op.create_table('declarations',
        # ...
    )

    # 7. declaration_items
    op.create_table('declaration_items',
        # ...
    )

    # 8. reminders
    op.create_table('reminders',
        # ...
    )

    # 9. deposit_eco_tracking
    op.create_table('deposit_eco_tracking',
        # ...
    )

    # Création des index, contraintes, triggers
    # ...


def downgrade():
    # Suppression dans l'ordre inverse
    op.drop_table('deposit_eco_tracking')
    op.drop_table('reminders')
    op.drop_table('declaration_items')
    op.drop_table('declarations')
    op.drop_table('declaration_periods')
    op.drop_table('category_mappings')
    op.drop_table('support_rates')
    op.drop_table('eco_organism_categories')
    op.drop_table('eco_organisms')
```

### Données de Seed pour eco-maison

```python
def seed_eco_maison(session):
    """
    Insère les données initiales pour eco-maison
    """

    # 1. Créer l'éco-organisme
    eco_maison = EcoOrganism(
        name="eco-maison",
        full_name="Éco-organisme de la maison et du jardin",
        code="ECO_MAISON",
        description="Éco-organisme agréé pour la filière REP des Éléments d'Ameublement (DEA), Jouets, et Articles de Bricolage et Jardin (ABJ)",
        declaration_frequency="QUARTERLY",
        declaration_window_days=45,
        declaration_start_offset_days=1,
        is_active=True,
        partnership_start_date=date(2025, 1, 1)
    )
    session.add(eco_maison)
    session.flush()

    # 2. Créer les catégories DEA
    dea_root = EcoOrganismCategory(
        eco_organism_id=eco_maison.id,
        code="DEA",
        name="Éléments d'Ameublement",
        level=0,
        sort_order=1
    )
    session.add(dea_root)
    session.flush()

    dea_categories = [
        {"code": "DEA_ASSISE", "name": "Assise", "sort_order": 1},
        {"code": "DEA_COUCHAGE", "name": "Couchage", "sort_order": 2},
        {"code": "DEA_RANGEMENT", "name": "Rangement", "sort_order": 3},
        {"code": "DEA_PLAN_POSE", "name": "Plan de pose", "sort_order": 4},
        {"code": "DEA_DECO_TEXTILE", "name": "Décoration textile", "sort_order": 5},
    ]

    for cat_data in dea_categories:
        cat = EcoOrganismCategory(
            eco_organism_id=eco_maison.id,
            parent_id=dea_root.id,
            code=cat_data["code"],
            name=cat_data["name"],
            level=1,
            sort_order=cat_data["sort_order"]
        )
        session.add(cat)

    # ... (mêmes étapes pour Jouets et ABJ)

    # 3. Créer les taux de soutien
    support_rates_data = [
        {"category_code": "DEA_ASSISE", "flow": "RECEIVED", "rate": 30.00},
        {"category_code": "DEA_ASSISE", "flow": "REUSED", "rate": 130.00},
        # ... (tous les taux)
    ]

    for rate_data in support_rates_data:
        cat = session.query(EcoOrganismCategory).filter_by(
            eco_organism_id=eco_maison.id,
            code=rate_data["category_code"]
        ).first()

        rate = SupportRate(
            eco_organism_id=eco_maison.id,
            eco_category_id=cat.id,
            flow_type=rate_data["flow"],
            rate_per_tonne=rate_data["rate"],
            valid_from=date(2025, 1, 1)
        )
        session.add(rate)

    # 4. Créer les périodes 2025
    create_declaration_periods_for_year(eco_maison.id, 2025)

    session.commit()
```

---

## Considérations de Performance

### 1. Partitionnement
Pour de gros volumes, considérer le partitionnement par année :
```sql
-- Partitionner declaration_items par année de déclaration
CREATE TABLE declaration_items_2025 PARTITION OF declaration_items
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE declaration_items_2026 PARTITION OF declaration_items
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```

### 2. Cache Redis
Mettre en cache les données fréquemment consultées :
- Liste des éco-organismes actifs
- Hiérarchie des catégories
- Mappings de catégories
- Taux de soutien actuels

### 3. Calculs Asynchrones
Les agrégations lourdes (calcul des totaux trimestriels) doivent être effectuées en tâche de fond (Celery) :
- Pré-calcul nocturne des totaux en cours
- Mise à jour des vues matérialisées
- Génération des exports

---

## Sécurité et Permissions

### Rôles Suggérés
- **eco_admin** : Gestion complète des éco-organismes et configurations
- **eco_declarant** : Saisie et modification des déclarations (statut DRAFT/IN_PROGRESS)
- **eco_validator** : Validation et soumission des déclarations
- **eco_viewer** : Consultation uniquement

### Règles d'Accès (RLS - Row Level Security)
```sql
-- Exemple : Les utilisateurs ne voient que les déclarations de leur structure
ALTER TABLE declarations ENABLE ROW LEVEL SECURITY;

CREATE POLICY declarations_access_policy ON declarations
    FOR ALL
    TO authenticated_users
    USING (
        created_by_id = current_user_id()
        OR EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = current_user_id()
            AND role_name IN ('eco_admin', 'eco_validator')
        )
    );
```

---

## Documentation Technique Complémentaire

### Diagramme ERD Complet
À générer avec un outil comme dbdiagram.io ou ERDPlus à partir de ce modèle.

### API Endpoints Suggérés
Voir document [03-specifications-fonctionnelles.md](#) (à créer)

### Tests Unitaires
Chaque modèle doit avoir :
- Tests de création/lecture/mise à jour/suppression (CRUD)
- Tests de validation des contraintes
- Tests des relations
- Tests des triggers

---

**Document créé le** : 2025-11-20
**Version** : 1.0
**Statut** : ÉTUDES - Modèle de données proposé
**Prochaines étapes** : Validation par l'équipe technique, ajustements selon l'architecture existante
