# Guide Développeur - Ajouter une Nouvelle Option de Workflow

**Version:** 1.0  
**Date:** 2025-01-27  
**Story:** B49-P4

## Introduction

Ce guide explique comment ajouter une nouvelle option de workflow au système. Les options de workflow permettent de personnaliser le comportement des caisses de manière extensible.

## Processus Étape par Étape

### Étape 1: Définir la Nouvelle Option

**Décision:** Choisir un identifiant unique pour votre option (ex: `my_new_feature`)

**Structure JSON:**
```json
{
  "features": {
    "my_new_feature": {
      "enabled": true,
      "label": "Ma nouvelle fonctionnalité"
    }
  }
}
```

### Étape 2: Backend - Schémas Pydantic (Optionnel)

Si votre option nécessite une validation spécifique, vous pouvez étendre les schémas Pydantic.

**Fichier:** `api/src/recyclic_api/schemas/cash_register.py`

**Note:** Le schéma `WorkflowOptions` est générique et accepte n'importe quelle feature. Aucune modification n'est nécessaire sauf si vous avez besoin de validation spécifique.

**Exemple (si validation nécessaire):**
```python
class MyNewFeatureOption(WorkflowFeatureOption):
    """Option spécifique avec validation supplémentaire."""
    
    @field_validator('enabled')
    @classmethod
    def validate_enabled(cls, v):
        # Validation spécifique si nécessaire
        return v
```

### Étape 3: Backend - Service Layer

**Fichier:** `api/src/recyclic_api/services/cash_session_service.py`

**Méthode `get_register_options()`:**
Cette méthode récupère déjà les options du register. Aucune modification nécessaire sauf si vous avez besoin de logique spécifique.

**Exemple (si logique spécifique nécessaire):**
```python
def get_register_options(self, session: CashSession) -> Optional[Dict[str, Any]]:
    # ... code existant ...
    
    # Votre logique spécifique si nécessaire
    if options and options.get("features", {}).get("my_new_feature", {}).get("enabled"):
        # Traitement spécifique
        pass
    
    return options
```

### Étape 4: Frontend - Types TypeScript

**Fichier:** `frontend/src/types/cashRegister.ts`

**Note:** Les types TypeScript sont génériques et acceptent n'importe quelle feature. Aucune modification nécessaire.

**Si vous voulez un type spécifique (optionnel):**
```typescript
export interface MyNewFeatureOption extends WorkflowFeatureOption {
  // Propriétés spécifiques si nécessaire
  customProperty?: string;
}
```

### Étape 5: Frontend - Store Zustand

**Fichier:** `frontend/src/stores/cashSessionStore.ts`

**Utilisation:**
```typescript
const store = useCashSessionStore();
const isMyNewFeatureEnabled = 
  store.currentRegisterOptions?.features?.my_new_feature?.enabled ?? false;
```

**Note:** Le store stocke déjà `currentRegisterOptions` de manière générique. Aucune modification nécessaire.

### Étape 6: Frontend - Composants React

**Exemple dans un composant:**

```typescript
import { useCashSessionStore } from '../../stores/cashSessionStore';

function MyComponent() {
  const isMyNewFeatureEnabled = useCashSessionStore(state => 
    state.currentRegisterOptions?.features?.my_new_feature?.enabled ?? false
  );

  return (
    <div>
      {isMyNewFeatureEnabled ? (
        <NewFeatureUI />
      ) : (
        <StandardUI />
      )}
    </div>
  );
}
```

### Étape 7: Tests

#### Tests Backend

**Fichier:** `api/tests/test_my_new_feature.py`

```python
def test_create_register_with_my_new_feature(self, db_session: Session, test_site: Site):
    """Test création register avec nouvelle option."""
    service = CashRegisterService(db_session)
    
    data = CashRegisterCreate(
        name="Test Register",
        site_id=str(test_site.id),
        workflow_options={
            "features": {
                "my_new_feature": {
                    "enabled": True,
                    "label": "Ma nouvelle fonctionnalité"
                }
            }
        }
    )
    
    register = service.create(data=data)
    assert register.workflow_options["features"]["my_new_feature"]["enabled"] is True
```

#### Tests Frontend

**Fichier:** `frontend/src/test/components/MyComponent.test.tsx`

```typescript
it('should display new feature when enabled', () => {
  useCashSessionStore.setState({
    currentRegisterOptions: {
      features: {
        my_new_feature: { enabled: true }
      }
    }
  });

  render(<MyComponent />);
  expect(screen.getByTestId('new-feature-ui')).toBeInTheDocument();
});
```

### Étape 8: Documentation

1. **Mettre à jour le guide utilisateur** (`docs/guides/workflow-options-configuration.md`)
2. **Mettre à jour le guide développeur** (`docs/guides/workflow-options-architecture.md`)
3. **Ajouter des exemples** dans la documentation

## Structure JSON à Suivre

### Format Standard

```json
{
  "features": {
    "feature_id": {
      "enabled": true,
      "label": "Libellé de la fonctionnalité"
    }
  }
}
```

### Règles

- **`feature_id`**: Identifiant unique (snake_case recommandé)
- **`enabled`**: Booléen obligatoire
- **`label`**: Chaîne optionnelle (affichage utilisateur)

### Exemple Complet

```json
{
  "features": {
    "no_item_pricing": {
      "enabled": true,
      "label": "Mode prix global (total saisi manuellement, article sans prix)"
    },
    "my_new_feature": {
      "enabled": false,
      "label": "Ma nouvelle fonctionnalité"
    }
  }
}
```

## Points d'Intégration

### Backend

1. **CashRegisterService** (`api/src/recyclic_api/services/cash_register_service.py`)
   - Gère la création/mise à jour avec `workflow_options`
   - Validation via Pydantic (automatique)

2. **CashSessionService** (`api/src/recyclic_api/services/cash_session_service.py`)
   - Récupère les options via `get_register_options()`
   - Inclut dans `CashSessionResponse` (automatique)

### Frontend

1. **Stores Zustand** (`frontend/src/stores/cashSessionStore.ts`)
   - Stocke `currentRegisterOptions` (déjà implémenté)
   - Accès via `useCashSessionStore()`

2. **Composants React**
   - Lecture des options depuis le store
   - Application conditionnelle du comportement

## Exemples de Code

### Exemple 1: Option Simple (Affichage Conditionnel)

```typescript
// Dans un composant React
const isFeatureEnabled = useCashSessionStore(state => 
  state.currentRegisterOptions?.features?.my_feature?.enabled ?? false
);

return (
  <>
    {isFeatureEnabled && <NewFeatureComponent />}
    <StandardComponent />
  </>
);
```

### Exemple 2: Option avec Logique Métier

```typescript
// Dans un service ou hook
function useMyFeature() {
  const options = useCashSessionStore(state => state.currentRegisterOptions);
  const isEnabled = options?.features?.my_feature?.enabled ?? false;
  
  const processData = (data: any) => {
    if (isEnabled) {
      // Logique spécifique à la feature
      return processWithFeature(data);
    }
    return processStandard(data);
  };
  
  return { isEnabled, processData };
}
```

### Exemple 3: Option avec Validation

```python
# Backend - Validation spécifique
from pydantic import field_validator

class MyFeatureOption(WorkflowFeatureOption):
    @field_validator('enabled')
    @classmethod
    def validate_enabled(cls, v, info):
        # Validation spécifique
        if v and not info.data.get('label'):
            raise ValueError('Label required when enabled')
        return v
```

## Bonnes Pratiques

1. **Nommage:** Utilisez des identifiants clairs et descriptifs (snake_case)
2. **Documentation:** Documentez chaque nouvelle option dans les guides
3. **Tests:** Ajoutez des tests pour chaque nouvelle option
4. **Rétrocompatibilité:** Assurez-vous que les caisses sans l'option fonctionnent normalement
5. **Validation:** Validez les données côté backend et frontend

## Checklist

- [ ] Identifiant unique choisi pour l'option
- [ ] Structure JSON définie
- [ ] Tests backend créés
- [ ] Tests frontend créés
- [ ] Composants React mis à jour
- [ ] Documentation utilisateur mise à jour
- [ ] Documentation développeur mise à jour
- [ ] Validation des données implémentée
- [ ] Rétrocompatibilité vérifiée

## Support

Pour toute question, consultez:
- [Guide Architecture](./workflow-options-architecture.md)
- [Story B49-P1](../stories/story-b49-p1-infrastructure-options-workflow.md)
- [Epic B49](../epics/epic-b49-framework-caisse-options-workflow.md)

