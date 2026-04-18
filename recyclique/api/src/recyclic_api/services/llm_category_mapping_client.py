"""
Client LLM pour le mapping de catégories legacy (B47-P5).

Cette abstraction permet à `LegacyImportService` d'obtenir des propositions de
mapping supplémentaires pour les catégories non résolues par le fuzzy matching,
sans se coupler à un provider ou un modèle spécifique.

Format d'échange attendu avec le LLM
------------------------------------

Entrée (payload JSON envoyé au LLM) :
{
  "known_categories": [
    "Vaisselle",
    "Électroménager",
    "... autres catégories connues en base ..."
  ],
  "unmapped_categories": [
    "Vaisselle cassée",
    "Gros électroménager HS"
  ]
}

Sortie (réponse JSON du LLM, sous forme d'objet) :
{
  "mappings": {
    "Vaisselle cassée": {
      "target_name": "Vaisselle",
      "confidence": 92.5
    },
    "Gros électroménager HS": {
      "target_name": "Électroménager",
      "confidence": 88.0
    }
  }
}

La logique applicative se charge ensuite de :
- convertir `target_name` en `category_id` correspondant en base,
- construire des instances `CategoryMapping` Pydantic avec un
  `confidence` dans [0, 100].
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Protocol, runtime_checkable


CategoryMappingLike = Dict[str, Any]


@runtime_checkable
class LLMCategoryMappingClient(Protocol):
    """
    Client LLM pour le mapping de catégories legacy.

    Cette interface est volontairement minimale pour rester agnostique
    du provider (OpenRouter, Gemini, Groq, etc.).
    """

    @property
    def provider_name(self) -> str:
        """Nom symbolique du provider (ex. 'openrouter')."""

    def suggest_mappings(
        self,
        unmapped: List[str],
        known_categories: List[str],
    ) -> Dict[str, CategoryMappingLike]:
        """
        Propose des mappings pour une liste de catégories non résolues.

        Args:
            unmapped: Liste de noms de catégories issus du CSV pour lesquels
                le fuzzy matching n'a pas trouvé de correspondance.
            known_categories: Liste des noms de catégories connues en base
                (catégories actives).

        Returns:
            Un dict {source_name: CategoryMappingLike}, où chaque valeur est
            un objet contenant a minima :
              - 'target_name': str  -> nom de la catégorie cible en base
              - 'confidence': float -> score de confiance dans [0, 100]

        Remarques :
            - Cette méthode ne doit JAMAIS lever d'exception métier : en cas
              d'erreur réseau, de timeout ou de parsing JSON, l'implémentation
              doit journaliser l'erreur et retourner un dict vide.
            - Le service appelant reste responsable de décider comment fusionner
              ces propositions avec les mappings existants et comment gérer
              les doublons ou conflits éventuels.
        """


@dataclass
class LLMCategoryMappingRequest:
    """
    Représente la charge utile envoyée au LLM.

    Cette structure est principalement documentaire et peut être sérialisée
    en dict/JSON pour l'appel HTTP effectif.
    """

    known_categories: List[str]
    unmapped_categories: List[str]

    def to_payload(self) -> Dict[str, Any]:
        """Convertit la requête en payload JSON sérialisable."""
        return {
            "known_categories": self.known_categories,
            "unmapped_categories": self.unmapped_categories,
        }



