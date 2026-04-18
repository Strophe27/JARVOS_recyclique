from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
import uuid

class RegistrationRequestBase(BaseModel):
    external_registration_key: str = Field(
        ...,
        description="Identifiant d'inscription externe (colonne DB historique)",
    )
    username: Optional[str] = Field(None, description="Nom d'utilisateur associé")
    first_name: Optional[str] = Field(None, description="Prénom")
    last_name: Optional[str] = Field(None, description="Nom de famille")
    email: Optional[str] = Field(None, description="Adresse email")
    phone: Optional[str] = Field(None, description="Numéro de téléphone")
    site_id: Optional[uuid.UUID] = Field(None, description="ID du site/ressourcerie")
    notes: Optional[str] = Field(None, description="Notes additionnelles")

class RegistrationRequestCreate(RegistrationRequestBase):
    pass

class RegistrationRequestUpdate(BaseModel):
    status: Optional[str] = Field(None, description="Statut de la demande")
    reviewed_by: Optional[uuid.UUID] = Field(None, description="ID de l'admin qui a traité")
    notes: Optional[str] = Field(None, description="Notes de l'admin")

class RegistrationRequestResponse(RegistrationRequestBase):
    id: uuid.UUID
    status: str = Field(..., description="Statut: pending, approved, rejected")
    created_at: datetime
    updated_at: datetime
    reviewed_by: Optional[uuid.UUID] = None
    reviewed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
