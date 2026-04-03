"""
Implémentation OpenRouter du `LLMCategoryMappingClient` pour B47-P5.

Cette implémentation :
- appelle l'API OpenRouter en mode JSON strict (`response_format={"type": "json_object"}`),
- envoie uniquement des noms de catégories (privacy),
- retourne un dict {source_name: {"target_name": str, "confidence": float}}.

En cas d'erreur réseau, HTTP ou de parsing JSON, elle loggue et retourne un dict vide
afin de respecter le caractère "best-effort" du fallback LLM.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List
import json

import httpx

from recyclic_api.core.config import settings
from recyclic_api.services.llm_category_mapping_client import (
    LLMCategoryMappingClient,
    LLMCategoryMappingRequest,
    CategoryMappingLike,
)

logger = logging.getLogger(__name__)


class OpenRouterCategoryMappingClient(LLMCategoryMappingClient):
    """Client LLM basé sur OpenRouter pour le mapping de catégories legacy."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        base_url: str | None = None,
        timeout_seconds: float = 30.0,
    ) -> None:
        self._api_key = api_key or settings.OPENROUTER_API_KEY
        self._model = model or settings.LEGACY_IMPORT_LLM_MODEL
        self._base_url = base_url or settings.OPENROUTER_API_BASE_URL
        self._timeout_seconds = timeout_seconds

    @property
    def provider_name(self) -> str:
        return "llm-openrouter"

    def suggest_mappings(
        self,
        unmapped: List[str],
        known_categories: List[str],
    ) -> Dict[str, CategoryMappingLike]:
        """
        Propose des mappings via OpenRouter.

        Retourne un dict {source_name: {"target_name": str, "confidence": float}}.
        """
        # Si pas de clé ou de modèle configuré, ne rien faire.
        if not self._api_key or not self._model:
            logger.info(
                "OpenRouterCategoryMappingClient désactivé (clé ou modèle manquant). "
                "Aucun appel LLM ne sera effectué. api_key_set=%s, model=%s",
                bool(self._api_key),
                self._model,
            )
            return {}

        if not unmapped:
            logger.debug(
                "OpenRouterCategoryMappingClient.suggest_mappings appelé avec unmapped=[] – rien à faire."
            )
            return {}

        request = LLMCategoryMappingRequest(
            known_categories=known_categories,
            unmapped_categories=unmapped,
        )
        payload = request.to_payload()

        # Prompt minimaliste orienté JSON strict.
        system_prompt = (
            "Tu es un assistant qui fait du mapping de catégories de recyclage. "
            "On te donne une liste de catégories 'unmapped_categories' issues d'un CSV legacy, "
            "et une liste de catégories cibles 'known_categories' provenant d'une base de données. "
            "Pour chaque entrée de 'unmapped_categories', si possible, propose la meilleure catégorie cible "
            "parmi 'known_categories' avec un score de confiance entre 0 et 100. "
            "Répond STRICTEMENT avec un objet JSON de la forme : "
            '{\"mappings\": {\"source_name\": {\"target_name\": \"nom_cible\", \"confidence\": 0-100.0}}} '
            "sans texte additionnel."
        )

        # On encode le payload en JSON dans le contenu utilisateur, car OpenRouter
        # (API compatible OpenAI) attend un `content` de type string.
        user_content = json.dumps(payload, ensure_ascii=False)

        body: Dict[str, Any] = {
            "model": self._model,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": user_content,
                },
            ],
        }

        # OpenRouter recommande fortement d'ajouter HTTP-Referer et X-Title
        # pour l'identification du client, en plus du Bearer token.
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://recyclic.local/dev",  # valeur générique pour dev
            "X-Title": "Recyclic-LegacyImport-LLM",
        }

        url = f"{self._base_url.rstrip('/')}/chat/completions"

        logger.info(
            "OpenRouterCategoryMappingClient: envoi requête LLM. url=%s, model=%s, unmapped_count=%d, known_categories_count=%d",
            url,
            self._model,
            len(unmapped),
            len(known_categories),
        )

        try:
            with httpx.Client(timeout=self._timeout_seconds) as client:
                response = client.post(url, json=body, headers=headers)
                response.raise_for_status()
        except httpx.RequestError as exc:
            logger.error(
                "Erreur de requête vers OpenRouter pour le mapping de catégories: %s",
                exc,
                exc_info=True,
            )
            return {}
        except httpx.HTTPStatusError as exc:
            logger.error(
                "Réponse HTTP invalide d'OpenRouter (status=%s): %s",
                exc.response.status_code,
                exc,
                exc_info=True,
            )
            return {}

        try:
            data = response.json()
            logger.debug(
                "OpenRouterCategoryMappingClient: réponse brute reçue (troncature). keys=%s",
                list(data.keys()),
            )
        except ValueError as exc:
            logger.error("Réponse OpenRouter non JSON: %s", exc, exc_info=True)
            return {}

        # Extraire le contenu JSON structuré selon le schéma OpenAI-like.
        try:
            messages = data.get("choices", [])
            if not messages:
                logger.warning(
                    "Réponse OpenRouter sans 'choices' pour le mapping de catégories."
                )
                return {}

            content = messages[0]["message"]["content"]
            if isinstance(content, str):
                llm_json = httpx.Response(200, text=content).json()
            else:
                # Certains providers renvoient déjà un objet JSON.
                llm_json = content

            logger.debug(
                "OpenRouterCategoryMappingClient: contenu LLM extrait (aperçu mappings keys)"
            )
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "Erreur lors de l'extraction du contenu OpenRouter: %s",
                exc,
                exc_info=True,
            )
            return {}

        try:
            mappings_raw = llm_json.get("mappings", {})
            result: Dict[str, CategoryMappingLike] = {}
            for source_name, mapping in mappings_raw.items():
                target_name = mapping.get("target_name")
                confidence = float(mapping.get("confidence", 0.0))
                # Clamp du score dans [0, 100]
                if confidence < 0:
                    confidence = 0.0
                if confidence > 100:
                    confidence = 100.0

                if isinstance(target_name, str) and target_name.strip():
                    result[source_name] = {
                        "target_name": target_name.strip(),
                        "confidence": confidence,
                    }

            logger.info(
                "OpenRouterCategoryMappingClient: %d mappings proposés par le LLM pour %d entrées unmapped.",
                len(result),
                len(unmapped),
            )

            return result
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "Erreur lors du parsing des mappings OpenRouter: %s",
                exc,
                exc_info=True,
            )
            return {}



