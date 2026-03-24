# Guide Développeur - Architecture des Options de Workflow

**Version:** 1.0  
**Date:** 2025-01-27  
**Story:** B49-P4

## Vue d'Ensemble

Le système d'options de workflow permet de configurer le comportement de chaque poste de caisse de manière flexible et extensible. Les options sont stockées en JSONB dans PostgreSQL et propagées aux sessions de caisse.

## Architecture Technique

### Structure des Données

#### Base de Données (PostgreSQL)

**Table `cash_registers`:**
```sql
-- Options de workflow (structure JSON extensible)
workflow_options JSONB NOT NULL DEFAULT '{}'

-- Activation modes virtuels/différés
enable_virtual BOOLEAN NOT NULL DEFAULT false
enable_deferred BOOLEAN NOT NULL DEFAULT false
```

**Structure JSON `workflow_options`:**
```json
{
  "features": {
    "no_item_pricing": {
      "enabled": true,
      "label": "Mode prix global (total saisi manuellement, article sans prix)"
    }
  }
}
```

#### Backend (Python/Pydantic)

**Schéma Pydantic (`api/src/recyclic_api/schemas/cash_register.py`):**

```python
class WorkflowFeatureOption(BaseModel):
    """Option individuelle de feature."""
    enabled: bool = Field(..., description="État activé/désactivé")
    label: Optional[str] = Field(None, description="Libellé de l'option")

class WorkflowOptions(BaseModel):
    """Schéma pour les options de workflow d'une caisse."""
    features: Dict[str, WorkflowFeatureOption] = Field(
        default_factory=dict,
        description="Dictionnaire des features de workflow disponibles"
    )
```

**Modèle SQLAlchemy (`api/src/recyclic_api/models/cash_register.py`):**

```python
class CashRegister(Base):
    # ...
    workflow_options = Column(JSONB, nullable=False, server_default='{}')
    enable_virtual = Column(Boolean, nullable=False, server_default='false')
    enable_deferred = Column(Boolean, nullable=False, server_default='false')
```

#### Frontend (TypeScript)

**Types TypeScript (`frontend/src/types/cashRegister.ts`):**

```typescript
export interface WorkflowFeatureOption {
  enabled: boolean;
  label?: string;
}

export interface WorkflowOptions {
  features: Record<string, WorkflowFeatureOption>;
}

export interface CashRegisterWithOptions {
  id: string;
  name: string;
  // ... autres champs
  workflow_options: WorkflowOptions;
  enable_virtual: boolean;
  enable_deferred: boolean;
}
```

## Flux de Propagation des Options

### 1. Configuration (Admin)

```
Admin → POST/PATCH /api/v1/cash-registers/{id}
  → CashRegisterService.create/update()
  → Validation Pydantic (WorkflowOptions)
  → Sauvegarde DB (workflow_options JSONB)
```

### 2. Création de Session

```
Frontend → POST /api/v1/cash-sessions/
  → CashSessionService.create_session()
  → Récupération CashRegister associé
  → Extraction workflow_options
  → Inclusion dans CashSessionResponse (register_options)
```

### 3. Utilisation Frontend

```
API Response (CashSessionResponse)
  → register_options: { features: { no_item_pricing: { enabled: true } } }
  → cashSessionStore.setCurrentRegisterOptions()
  → Composants React (SaleWizard, FinalizationScreen)
  → Application du comportement selon options
```

## Points d'Intégration

### Backend

#### CashRegisterService

**Fichier:** `api/src/recyclic_api/services/cash_register_service.py`

**Méthodes clés:**
- `create(data: CashRegisterCreate)`: Crée un register avec `workflow_options`
- `update(register: CashRegister, data: CashRegisterUpdate)`: Met à jour `workflow_options`

**Exemple:**
```python
from recyclic_api.schemas.cash_register import CashRegisterCreate, WorkflowOptions

data = CashRegisterCreate(
    name="Caisse Test",
    site_id=str(site.id),
    workflow_options={
        "features": {
            "no_item_pricing": {
                "enabled": True,
                "label": "Mode prix global"
            }
        }
    }
)
register = service.create(data=data)
```

#### CashSessionService

**Fichier:** `api/src/recyclic_api/services/cash_session_service.py`

**Méthode clé:**
- `get_register_options(session: CashSession)`: Récupère les options du register associé

**Exemple:**
```python
register_options = service.get_register_options(session)
# Retourne: { "features": { "no_item_pricing": { "enabled": True } } }
```

**Propagation dans réponse API:**
```python
# Dans CashSessionResponse
register_options: Optional[Dict[str, Any]] = Field(
    None,
    description="Options de workflow du register associé"
)
```

### Frontend

#### Stores Zustand

**Fichier:** `frontend/src/stores/cashSessionStore.ts`

**État:**
```typescript
interface CashSessionState {
  // ...
  currentRegisterOptions: Record<string, any> | null;
  setCurrentRegisterOptions: (options: Record<string, any> | null) => void;
}
```

**Utilisation:**
```typescript
const store = useCashSessionStore();
const isNoItemPricingEnabled = 
  store.currentRegisterOptions?.features?.no_item_pricing?.enabled ?? false;
```

#### Composants React

**SaleWizard (`frontend/src/components/business/SaleWizard.tsx`):**

```typescript
const isNoItemPricingEnabled = 
  useCashSessionStore(state => 
    state.currentRegisterOptions?.features?.no_item_pricing?.enabled ?? false
  );

// Masquer l'onglet Quantité si mode prix global activé
const tabOrder: CashWizardStep[] = isNoItemPricingEnabled 
  ? ['category', 'subcategory', 'weight', 'price']
  : ['category', 'subcategory', 'weight', 'quantity', 'price'];
```

**FinalizationScreen (`frontend/src/components/business/FinalizationScreen.tsx`):**

```typescript
const isNoItemPricingEnabled = 
  useCashSessionStore(state => 
    state.currentRegisterOptions?.features?.no_item_pricing?.enabled ?? false
  );

// Afficher champ "Total à payer" si mode prix global activé
{isNoItemPricingEnabled && (
  <TextInput
    data-testid="manual-total-input"
    value={manualTotal}
    onChange={(e) => setManualTotal(e.target.value)}
    // ...
  />
)}
```

## Diagrammes Techniques

### Flux de Données

```
┌─────────────────┐
│  Admin Config   │
│  (workflow_     │
│   options)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PostgreSQL     │
│  cash_registers │
│  (JSONB)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ CashSession     │
│ Service         │
│ (get_register_  │
│  options)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ API Response    │
│ (register_      │
│  options)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Frontend Store  │
│ (currentRegister │
│  Options)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ React Components│
│ (SaleWizard,    │
│  Finalization)  │
└─────────────────┘
```

### Héritage des Options

```
CashRegister (workflow_options)
         │
         ├─→ CashSession (register_options)
         │        │
         │        ├─→ Virtual Session (hérite)
         │        │
         │        └─→ Deferred Session (hérite)
         │
         └─→ Frontend Store (currentRegisterOptions)
```

## Validation et Sécurité

### Validation Backend

**Pydantic:**
- Structure stricte: `features` doit être un dictionnaire
- Chaque feature doit avoir `enabled: bool`
- `label` est optionnel

**Exemple de validation:**
```python
from recyclic_api.schemas.cash_register import WorkflowOptions

# Valide
options = WorkflowOptions.model_validate({
    "features": {
        "no_item_pricing": {
            "enabled": True,
            "label": "Mode prix global"
        }
    }
})

# Invalide (erreur de validation)
options = WorkflowOptions.model_validate({
    "features": ["no_item_pricing"]  # Doit être un dict, pas une liste
})
```

### Sécurité Frontend

- Les options sont en lecture seule côté frontend (pas de modification directe)
- La modification se fait uniquement via l'API admin
- Validation côté client pour l'affichage conditionnel

## Rétrocompatibilité

### Valeurs par Défaut

- `workflow_options`: `{}` (objet vide)
- `enable_virtual`: `false`
- `enable_deferred`: `false`

### Comportement Legacy

- Les caisses existantes sans options fonctionnent normalement
- Le workflow standard est utilisé si `workflow_options` est vide
- Aucune régression sur les fonctionnalités existantes

## Tests

### Tests Backend

**Fichier:** `api/tests/test_b49_p4_cash_register_options.py`

- Création avec `workflow_options`
- Mise à jour avec `workflow_options`
- Validation des schémas Pydantic
- Propagation dans `CashSessionResponse`

### Tests Frontend

**Fichiers:**
- `frontend/src/test/stores/cashSessionStore.test.ts`
- `frontend/src/test/integration/mode-prix-global-e2e.test.tsx`

- Tests unitaires des stores
- Tests d'intégration des workflows
- Tests E2E des scénarios complets

## Références

- **Story B49-P1:** Infrastructure Options de Workflow
- **Story B49-P2:** Mode Prix Global
- **Story B49-P3:** Refonte Caisses Virtuelles/Différées
- **Epic B49:** Framework Caisse avec Options de Workflow

