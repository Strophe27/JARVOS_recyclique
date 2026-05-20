"""Schémas Pydantic — ModuleConfigDocument (OpenAPI)."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ModuleConfigDocument(BaseModel):
    schema_version: str = Field(..., description="Version du schéma du module (SemVer).")
    payload: dict[str, Any] = Field(..., description="Charge utile validée par le schéma JSON du module.")
    version: int | None = Field(
        default=None,
        ge=0,
        description="Compteur de version aligné sur l'ETag (optionnel dans le corps).",
    )

    model_config = ConfigDict(extra="forbid")
