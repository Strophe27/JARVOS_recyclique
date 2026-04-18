# Standard de Format de Dates - Recyclic

**Date de création**: 2025-01-27  
**Story**: B50-P2  
**Version**: 1.0

## Objectif

Standardiser le format de dates utilisé pour la communication entre le frontend et le backend afin d'éviter les problèmes de parsing et d'assurer la cohérence du système.

## Standard ISO 8601

Le format standard utilisé dans Recyclic est **ISO 8601 avec suffixe 'Z' (UTC)** :

```
YYYY-MM-DDTHH:MM:SS.sssZ
```

### Exemples

- Date avec heure : `2025-12-10T00:00:00.000Z`
- Date avec heure complète : `2025-12-10T14:30:45.123Z`
- Date seule (pour filtres) : `2025-12-10` (sera convertie en `2025-12-10T00:00:00.000Z`)

## Utilisation Backend

### Utilitaire `date_utils.py`

Le backend utilise l'utilitaire `recyclic_api.utils.date_utils` pour le parsing et le formatage :

```python
from recyclic_api.utils.date_utils import parse_iso_datetime, format_iso_datetime

# Parser une date ISO depuis le frontend
date_from = parse_iso_datetime("2025-12-10T00:00:00.000Z")

# Formater une date pour le frontend
date_str = format_iso_datetime(datetime.now(timezone.utc))
```

### Dans les modèles Pydantic

Les validators Pydantic utilisent `parse_iso_datetime` :

```python
@field_validator('date_from', 'date_to', mode='before')
@classmethod
def parse_datetime(cls, v):
    """Parse string ISO en datetime en utilisant l'utilitaire standardisé."""
    if v is None:
        return None
    if isinstance(v, str):
        return parse_iso_datetime(v)
    if isinstance(v, datetime):
        return v
    return v
```

## Utilisation Frontend

### Format d'envoi

Le frontend doit envoyer les dates au format ISO 8601 avec 'Z' :

```typescript
const dateFrom = filters.date_from 
  ? `${filters.date_from}T00:00:00.000Z` 
  : undefined;

const dateTo = filters.date_to 
  ? `${filters.date_to}T23:59:59.999Z` 
  : undefined;
```

### Format de réception

Le backend retourne les dates au format ISO 8601 avec 'Z' (via `format_iso_datetime`).

## Fonctions Disponibles

### `parse_iso_datetime(date_str: Optional[str]) -> Optional[datetime]`

Parse une string ISO 8601 en datetime.

**Supporte** :
- ISO 8601 avec 'Z' (UTC) : `"2025-12-10T00:00:00.000Z"`
- ISO 8601 avec timezone : `"2025-12-10T00:00:00.000+00:00"`
- ISO 8601 sans timezone : `"2025-12-10T00:00:00.000"` (assumé UTC)

**Retourne** : `datetime` object (timezone-aware), ou `None` si `date_str` est `None`

**Raises** : `ValueError` si le format est invalide

### `format_iso_datetime(dt: Optional[datetime]) -> Optional[str]`

Formate un datetime en string ISO 8601 avec 'Z' (UTC).

**Format** : `"YYYY-MM-DDTHH:MM:SS.sssZ"`

**Retourne** : String ISO 8601 avec 'Z', ou `None` si `dt` est `None`

### `parse_iso_date_only(date_str: Optional[str]) -> Optional[datetime]`

Parse une date seule (YYYY-MM-DD) en datetime à minuit UTC.

**Format** : `"YYYY-MM-DD"`

**Retourne** : `datetime` object à minuit UTC, ou `None` si `date_str` est `None`

## Migration

### Avant (B50-P2)

Le parsing était fait directement dans les validators Pydantic avec du code dupliqué :

```python
if v.endswith('Z'):
    v = v.replace('Z', '+00:00')
parsed = datetime.fromisoformat(v)
```

### Après (B50-P2)

Utilisation de l'utilitaire standardisé :

```python
from recyclic_api.utils.date_utils import parse_iso_datetime

parsed = parse_iso_datetime(v)
```

## Avantages

1. **Cohérence** : Un seul format utilisé dans tout le système
2. **Maintenabilité** : Code centralisé dans `date_utils.py`
3. **Robustesse** : Gestion uniforme des timezones (UTC)
4. **Testabilité** : Fonctions utilitaires facilement testables
5. **Documentation** : Standard clairement documenté

## Références

- **Fichier utilitaire** : `api/src/recyclic_api/utils/date_utils.py`
- **Story** : B50-P2 (Correction Bug 400 - Export Réception CSV/XLS)
- **ISO 8601** : [Standard ISO 8601](https://en.wikipedia.org/wiki/ISO_8601)

