import uuid

from sqlalchemy import Column, String, DateTime, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from recyclic_api.core.database import Base


class LegacyCategoryMappingCache(Base):
    """
    Cache persistant pour les mappings de catégories legacy obtenus
    via fuzzy matching ou LLM (B47-P5).

    L'objectif est de réduire les appels LLM en réutilisant des mappings
    déjà validés pour des valeurs sources identiques (après normalisation).
    """

    __tablename__ = "legacy_category_mapping_cache"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Clé normalisée (e.g. lower + strip) de la catégorie source issue du CSV.
    source_name_normalized = Column(String, nullable=False, unique=True, index=True)

    # Identifiant de la catégorie cible en base (UUID Category.id sous forme de texte).
    target_category_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    # Provider ayant produit ce mapping (ex. "fuzzy", "llm-openrouter").
    provider = Column(String, nullable=False, index=True)

    # Score de confiance associé à ce mapping (0-100).
    confidence = Column(Float, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"<LegacyCategoryMappingCache(id={self.id}, "
            f"source='{self.source_name_normalized}', "
            f"target={self.target_category_id}, "
            f"provider={self.provider}, confidence={self.confidence})>"
        )



