from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, Dict, Any


class WorkflowFeatureOption(BaseModel):
    """Schéma pour une option de feature dans workflow_options."""
    model_config = ConfigDict(from_attributes=True)
    
    enabled: bool = Field(..., description="Indique si l'option est activée")
    label: Optional[str] = Field(None, description="Libellé de l'option (optionnel)")


class WorkflowOptions(BaseModel):
    """Schéma pour les options de workflow d'une caisse.
    
    Structure:
    {
        "features": {
            "no_item_pricing": {
                "enabled": true,
                "label": "Mode prix global (total saisi manuellement, article sans prix)"
            }
        }
    }
    """
    model_config = ConfigDict(from_attributes=True)
    
    features: Dict[str, WorkflowFeatureOption] = Field(
        default_factory=dict,
        description="Dictionnaire des features de workflow disponibles"
    )
    
    @field_validator('features', mode='before')
    @classmethod
    def validate_features(cls, v):
        """Valide que features est un dictionnaire."""
        if v is None:
            return {}
        if not isinstance(v, dict):
            raise ValueError("features doit être un dictionnaire")
        return v


class CashRegisterBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str = Field(..., min_length=1, max_length=100, description="Nom du poste de caisse")
    location: Optional[str] = Field(None, max_length=255, description="Localisation du poste")
    site_id: Optional[str] = Field(None, description="ID du site")
    is_active: bool = Field(default=True, description="Poste actif")
    workflow_options: Dict[str, Any] = Field(
        default_factory=dict,
        description="Options de workflow configurables (JSONB)"
    )
    enable_virtual: bool = Field(default=False, description="Activer les caisses virtuelles")
    enable_deferred: bool = Field(default=False, description="Activer les caisses différées")

    @field_validator('site_id', mode='before')
    @classmethod
    def _validate_site_id(cls, v):
        """Validate site_id: reject empty strings, convert UUID to str."""
        if v is None:
            return None
        if isinstance(v, str):
            v = v.strip()
            if not v:  # Empty string after stripping
                raise ValueError("site_id ne peut pas être une chaîne vide")
        if hasattr(v, '__str__'):
            return str(v)
        return v


class CashRegisterCreate(CashRegisterBase):
    pass


class CashRegisterUpdate(BaseModel):
    """Schéma de mise à jour partielle d'un poste de caisse."""

    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    location: Optional[str] = Field(None, max_length=255)
    site_id: Optional[str] = Field(None)
    is_active: Optional[bool] = Field(None)
    workflow_options: Optional[Dict[str, Any]] = Field(None, description="Options de workflow configurables (JSONB)")
    enable_virtual: Optional[bool] = Field(None, description="Activer les caisses virtuelles")
    enable_deferred: Optional[bool] = Field(None, description="Activer les caisses différées")

    @field_validator("site_id", mode="before")
    @classmethod
    def _validate_site_id(cls, v):
        """Validate site_id: reject empty strings, convert UUID to str."""
        if v is None:
            return None
        if isinstance(v, str):
            v = v.strip()
            if not v:  # Empty string after stripping
                raise ValueError("site_id ne peut pas être une chaîne vide")
        if hasattr(v, "__str__"):
            return str(v)
        return v


class CashRegisterResponse(CashRegisterBase):
    id: str = Field(..., description="ID du poste de caisse")

    @field_validator('id', mode='before')
    @classmethod
    def _id_uuid_to_str(cls, v):
        if hasattr(v, '__str__'):
            return str(v)
        return v



