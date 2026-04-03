"""
Endpoints pour l'import de données legacy depuis CSV.
"""

import base64
import csv
import io
import json
import logging
import time
from datetime import date, datetime
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from recyclic_api.core.auth import require_role_strict
from recyclic_api.core.config import settings
from recyclic_api.core.database import get_db
from recyclic_api.models.user import User, UserRole
from recyclic_api.services.legacy_import_service import LegacyImportService
from recyclic_api.services.legacy_csv_cleaner_service import LegacyCSVCleanerService
from recyclic_api.services.csv_validation_service import CSVValidationService
from recyclic_api.schemas.legacy_import import (
    CategoryMapping,
    CategoryMappingRequest,
    ImportReport,
    LLMModelsResponse,
    LLMOnlyStatistics,
    LegacyImportAnalyzeResponse,
    LegacyImportCleanResponse,
    LegacyImportCleanStatistics,
    LegacyImportExecuteResponse,
    LegacyImportPreviewResponse,
    LegacyImportStatistics,
    LegacyImportValidationResponse,
)

router = APIRouter(tags=["admin"])
logger = logging.getLogger(__name__)

_OPENROUTER_MODELS_CACHE: Dict[str, Any] | None = None
_OPENROUTER_MODELS_CACHE_TS: float | None = None
_OPENROUTER_MODELS_CACHE_TTL_SECONDS: int = 3600


def _get_openrouter_models_from_cache() -> Dict[str, Any] | None:
    """Retourne le cache valide des modèles OpenRouter si disponible."""
    global _OPENROUTER_MODELS_CACHE, _OPENROUTER_MODELS_CACHE_TS

    if _OPENROUTER_MODELS_CACHE is None or _OPENROUTER_MODELS_CACHE_TS is None:
        return None

    now = time.time()
    if now - _OPENROUTER_MODELS_CACHE_TS > _OPENROUTER_MODELS_CACHE_TTL_SECONDS:
        return None

    return _OPENROUTER_MODELS_CACHE


def _set_openrouter_models_cache(payload: Dict[str, Any]) -> None:
    """Met à jour le cache en mémoire pour les modèles OpenRouter."""
    global _OPENROUTER_MODELS_CACHE, _OPENROUTER_MODELS_CACHE_TS

    _OPENROUTER_MODELS_CACHE = payload
    _OPENROUTER_MODELS_CACHE_TS = time.time()


def _transform_openrouter_models(payload: Dict[str, Any]) -> list[dict[str, Any]]:
    """
    Transforme la réponse brute OpenRouter en liste de modèles filtrés.

    Seuls les modèles texte sont conservés. Le champ `is_free` est déterminé à
    partir du suffixe `:free` ou d'un pricing à 0.
    """
    data = payload.get("data") or []
    models: list[dict[str, Any]] = []
    
    logger.debug("Transformation de %d modèles OpenRouter", len(data))

    for raw in data:
        # Vérifier la modalité (text, vision, audio, etc.)
        architecture = raw.get("architecture") or {}
        modality = architecture.get("modality") or raw.get("modality")
        input_modalities = architecture.get("input_modalities") or []
        output_modalities = architecture.get("output_modalities") or []
        
        # Accepter les modèles qui :
        # 1. Ont "text" dans leur modalité (ex: "text", "text+image->text")
        # 2. OU ont "text" dans input_modalities ET peuvent générer du texte
        is_text_model = (
            (modality and "text" in modality.lower()) or
            ("text" in input_modalities and "text" in output_modalities)
        )
        
        if not is_text_model:
            continue

        model_id = str(raw.get("id") or "").strip()
        if not model_id:
            continue

        raw_name = str(raw.get("name") or model_id).strip() or model_id
        pricing = raw.get("pricing") or {}
        prompt_price = str(pricing.get("prompt") or "").strip()
        completion_price = str(pricing.get("completion") or "").strip()

        is_free = model_id.endswith(":free") or (
            prompt_price in {"0", "0.0"} and completion_price in {"0", "0.0"}
        )

        display_name = raw_name
        if is_free and "(Free)" not in raw_name:
            display_name = f"{raw_name} (Free)"

        provider = None
        if "/" in model_id:
            provider = model_id.split("/", 1)[0]

        models.append(
            {
                "id": model_id,
                "name": display_name,
                "provider": provider,
                "is_free": is_free,
                "context_length": raw.get("context_length"),
                "pricing": {
                    "prompt": prompt_price,
                    "completion": completion_price,
                }
                if pricing
                else None,
            }
        )

    logger.debug("Transformation terminée: %d modèles texte trouvés", len(models))
    return models


@router.get(
    "/import/legacy/llm-models",
    response_model=LLMModelsResponse,
    summary="Lister les modèles LLM OpenRouter pour l'import legacy",
    description=(
        "Récupère la liste des modèles OpenRouter compatibles avec l'import legacy "
        "(modèles texte). Les résultats sont mis en cache pendant 1h pour limiter "
        "les appels réseau."
    ),
)
async def list_legacy_import_llm_models(
    current_user: User = Depends(
        require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])
    ),
) -> LLMModelsResponse:
    """
    Retourne la liste des modèles OpenRouter disponibles pour le fallback LLM.

    En cas d'erreur réseau ou de réponse invalide, retourne une liste vide avec
    un message d'erreur explicite. Si un cache précédent existe, il est utilisé
    comme valeur de repli.
    """
    _ = current_user  # Utilisé uniquement pour la vérification d'autorisation.

    cached = _get_openrouter_models_from_cache()
    base_url = (settings.OPENROUTER_API_BASE_URL or "https://openrouter.ai/api/v1").rstrip(
        "/"
    )
    url = f"{base_url}/models"

    if cached is not None:
        try:
            models = _transform_openrouter_models(cached)
            return LLMModelsResponse(
                models=models,
                error=None,
                default_model_id=settings.LEGACY_IMPORT_LLM_MODEL,
            )
        except Exception:  # noqa: BLE001
            # Si le cache est corrompu, on ignore simplement et on retente un appel réseau.
            logger.warning(
                "Cache OpenRouter des modèles invalide, tentative de rafraîchissement."
            )

    headers: Dict[str, str] = {
        "Accept": "application/json",
    }
    if settings.OPENROUTER_API_KEY:
        headers["Authorization"] = f"Bearer {settings.OPENROUTER_API_KEY}"

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(url, headers=headers)
            response.raise_for_status()
            payload = response.json()
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "Erreur lors de la récupération des modèles OpenRouter: %s",
            exc,
            exc_info=True,
        )
        if cached is not None:
            try:
                models = _transform_openrouter_models(cached)
                return LLMModelsResponse(
                    models=models,
                    error=(
                        "Impossible de contacter OpenRouter, liste issue du cache local."
                    ),
                    default_model_id=settings.LEGACY_IMPORT_LLM_MODEL,
                )
            except Exception:
                logger.warning(
                    "Cache OpenRouter des modèles inutilisable après erreur réseau."
                )

        return LLMModelsResponse(
            models=[],
            error=(
                "Impossible de contacter OpenRouter pour lister les modèles. "
                "Vérifiez la configuration ou réessayez plus tard."
            ),
            default_model_id=settings.LEGACY_IMPORT_LLM_MODEL,
        )

    _set_openrouter_models_cache(payload)

    try:
        models = _transform_openrouter_models(payload)
        logger.info(
            "Transformation OpenRouter réussie: %d modèles trouvés sur %d modèles totaux",
            len(models),
            len(payload.get("data", [])),
        )
        if len(models) == 0:
            logger.warning(
                "Aucun modèle texte trouvé dans la réponse OpenRouter. "
                "Vérifiez que la structure de la réponse correspond aux attentes."
            )
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "Erreur lors du parsing des modèles OpenRouter: %s",
            exc,
            exc_info=True,
        )
        return LLMModelsResponse(
            models=[],
            error=(
                f"Réponse d'OpenRouter invalide lors de la liste des modèles: {str(exc)}. "
                "Réessayez plus tard ou changez de configuration."
            ),
        )

    if len(models) == 0:
        return LLMModelsResponse(
            models=[],
            error=(
                "Aucun modèle texte compatible trouvé dans la réponse OpenRouter. "
                "Vérifiez la configuration ou réessayez plus tard."
            ),
            default_model_id=settings.LEGACY_IMPORT_LLM_MODEL,
        )

    return LLMModelsResponse(
        models=models,
        error=None,
        default_model_id=settings.LEGACY_IMPORT_LLM_MODEL,
    )


@router.post(
    "/import/legacy/analyze",
    response_model=LegacyImportAnalyzeResponse,
    summary="Analyser un CSV legacy pour import",
    description="Analyse un CSV nettoyé et propose des mappings de catégories via fuzzy matching. Nécessite ADMIN ou SUPER_ADMIN.",
)
async def analyze_legacy_import(
    file: UploadFile = File(..., description="Fichier CSV nettoyé à analyser"),
    confidence_threshold: Optional[float] = Form(None, description="Seuil de confiance pour le fuzzy matching (0-100, défaut: 80)"),
    llm_model_id: Optional[str] = Form(None, description="ID du modèle LLM à utiliser (override de la config, optionnel)"),
    current_user: User = Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    db: Session = Depends(get_db)
):
    """
    Analyse un CSV legacy et propose des mappings de catégories.
    
    Le CSV doit contenir les colonnes suivantes:
    - date: Date de la ligne (format: YYYY-MM-DD, DD/MM/YYYY, etc.)
    - category: Nom de la catégorie (non normalisé)
    - poids_kg: Poids en kilogrammes
    - destination: Destination (MAGASIN, RECYCLAGE, DECHETERIE)
    - notes: Notes optionnelles
    
    Retourne:
    - mappings: Dictionnaire des mappings proposés avec scores de confiance
    - unmapped: Liste des catégories non mappables (score < seuil)
    - statistics: Statistiques de l'analyse
    - errors: Liste des erreurs de validation
    """
    # Validation du format de fichier
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format non supporté: fournir un fichier .csv"
        )
    
    # Validation du seuil de confiance
    if confidence_threshold is not None:
        if not 0 <= confidence_threshold <= 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="confidence_threshold doit être entre 0 et 100"
            )
    
    try:
        # Lire le contenu du fichier
        content = await file.read()
        
        # Créer le service et analyser
        service = LegacyImportService(db)
        result = service.analyze(
            content,
            confidence_threshold=confidence_threshold,
            llm_model_override=llm_model_id,
        )
        
        return LegacyImportAnalyzeResponse(**result)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de l'analyse du CSV legacy: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'analyse: {str(e)}"
        )


@router.post(
    "/import/legacy/execute",
    response_model=LegacyImportExecuteResponse,
    summary="Exécuter l'import legacy avec mapping validé",
    description="Importe le CSV avec le fichier de mapping validé. Crée les postes, tickets et lignes en base. Nécessite ADMIN ou SUPER_ADMIN.",
)
async def execute_legacy_import(
    csv_file: UploadFile = File(..., description="Fichier CSV nettoyé à importer"),
    mapping_file: UploadFile = File(..., description="Fichier JSON de mapping validé"),
    import_date: Optional[str] = Form(None, description="Date d'import manuelle (format ISO 8601: YYYY-MM-DD). Si fournie, toutes les données seront importées avec cette date unique."),
    current_user: User = Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    db: Session = Depends(get_db)
):
    """
    Exécute l'import du CSV avec le mapping validé.
    
    Le fichier de mapping doit avoir la structure:
    {
        "mappings": {
            "Vaisselle": {"category_id": "uuid", "category_name": "Vaisselle", "confidence": 100},
            "DEEE": {"category_id": "uuid", "category_name": "DEEE", "confidence": 85}
        },
        "unmapped": ["D3E", "EEE PAM"]
    }
    
    Le processus:
    1. Valide le CSV et le mapping
    2. Crée un PosteReception par jour (ou réutilise s'il existe)
    3. Crée un TicketDepot par jour
    4. Crée les LigneDepot avec les catégories mappées
    
    Transaction: tout ou rien (rollback en cas d'erreur).
    """
    # Validation des formats de fichiers
    if not csv_file.filename or not csv_file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le fichier CSV doit être un fichier .csv"
        )
    
    if not mapping_file.filename or not mapping_file.filename.lower().endswith(".json"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le fichier de mapping doit être un fichier .json"
        )
    
    try:
        # Lire les fichiers
        csv_content = await csv_file.read()
        mapping_content = await mapping_file.read()
        
        # Parser le JSON de mapping
        try:
            mapping_json = json.loads(mapping_content.decode("utf-8"))
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Fichier de mapping JSON invalide: {str(e)}"
            )
        
        # Valider la structure du mapping
        try:
            mapping_request = CategoryMappingRequest(**mapping_json)
            mapping_dict = mapping_request.model_dump()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Structure de mapping invalide: {str(e)}"
            )
        
        # Valider et convertir import_date si fourni (B47-P11)
        import_date_obj = None
        if import_date:
            try:
                import_date_obj = datetime.strptime(import_date, "%Y-%m-%d").date()
                # Vérifier que la date n'est pas dans le futur
                if import_date_obj > date.today():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="La date d'import ne peut pas être dans le futur"
                    )
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Format de date invalide. Utilisez YYYY-MM-DD"
                )
        
        # Créer le service et exécuter l'import
        service = LegacyImportService(db)
        report_dict = service.execute(
            file_bytes=csv_content,
            mapping_json=mapping_dict,
            admin_user_id=current_user.id,
            import_date=import_date_obj
        )
        
        report = ImportReport(**report_dict)
        
        # Message de succès
        message = "Import terminé avec succès"
        if report.total_errors > 0:
            message = f"Import terminé avec {report.total_errors} erreur(s)"
        
        logger.info(
            f"Import legacy exécuté par {current_user.username}: "
            f"{report.postes_created} postes créés, {report.postes_reused} réutilisés, "
            f"{report.tickets_created} tickets, {report.lignes_imported} lignes"
        )
        
        return LegacyImportExecuteResponse(
            report=report,
            message=message
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de l'import legacy: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'import: {str(e)}"
        )


class LLMOnlyRequest(BaseModel):
    """Requête pour relancer uniquement le LLM sur des catégories spécifiques."""
    unmapped_categories: List[str]
    llm_model_id: Optional[str] = None


class LLMOnlyResponse(BaseModel):
    """Réponse de l'endpoint llm-only."""
    mappings: Dict[str, CategoryMapping]
    statistics: LLMOnlyStatistics


@router.post(
    "/import/legacy/analyze/llm-only",
    response_model=LLMOnlyResponse,
    summary="Relancer uniquement le LLM sur des catégories non mappées",
    description="Appelle le LLM uniquement sur les catégories spécifiées, sans refaire le fuzzy matching. Nécessite ADMIN ou SUPER_ADMIN.",
)
async def analyze_legacy_import_llm_only(
    request: LLMOnlyRequest,
    current_user: User = Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    db: Session = Depends(get_db)
):
    """
    Relance uniquement le LLM sur des catégories spécifiques (relance ciblée).

    Cet endpoint permet de relancer le LLM uniquement sur les catégories restantes
    après une première analyse, sans refaire tout le processus de fuzzy matching.

    Args:
        request: Contient `unmapped_categories` (liste des catégories à mapper) et
                 `llm_model_id` (optionnel, override du modèle configuré)

    Returns:
        Nouveaux mappings LLM proposés + statistiques LLM détaillées
    """
    try:
        service = LegacyImportService(db)
        result = service.analyze_llm_only(
            unmapped_categories=request.unmapped_categories,
            llm_model_override=request.llm_model_id,
        )

        # Construire la réponse avec les mappings et statistiques
        return LLMOnlyResponse(
            mappings=result["mappings"],
            statistics=LLMOnlyStatistics(**result["statistics"]),
        )

    except Exception as e:
        logger.error(f"Erreur lors de la relance LLM ciblée: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la relance LLM: {str(e)}"
        )


@router.post(
    "/import/legacy/validate",
    response_model=LegacyImportValidationResponse,
    summary="Valider la conformité d'un CSV legacy",
    description="Valide qu'un CSV est conforme au template offline standardisé. Nécessite ADMIN ou SUPER_ADMIN.",
)
async def validate_legacy_import(
    file: UploadFile = File(..., description="Fichier CSV à valider"),
    current_user: User = Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """
    Valide la conformité d'un CSV.

    Vérifie:
    - Colonnes requises présentes (date, category, poids_kg, destination, notes)
    - Format des dates (ISO 8601: YYYY-MM-DD)
    - Poids numériques et > 0
    - Détection des problèmes structurels (lignes de totaux, colonnes supplémentaires)

    Args:
        file: Fichier CSV à valider

    Returns:
        Rapport de validation avec is_valid, errors, warnings, statistics
    """
    # Validation du format de fichier
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format non supporté: fournir un fichier .csv"
        )

    try:
        # Lire le contenu du fichier
        content = await file.read()

        # Créer le service de validation et valider
        validator = CSVValidationService()
        result = validator.validate(content)

        return LegacyImportValidationResponse(**result)

    except Exception as e:
        logger.error(f"Erreur lors de la validation du CSV: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la validation: {str(e)}"
        )


@router.post(
    "/import/legacy/preview",
    response_model=LegacyImportPreviewResponse,
    summary="Prévisualiser le récapitulatif d'import",
    description="Calcule le récapitulatif de ce qui sera importé avec les mappings fournis. Nécessite ADMIN ou SUPER_ADMIN.",
)
async def preview_legacy_import(
    csv_file: UploadFile = File(..., description="Fichier CSV nettoyé à prévisualiser"),
    mapping_file: UploadFile = File(..., description="Fichier JSON de mapping validé"),
    current_user: User = Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    db: Session = Depends(get_db)
):
    """
    Calcule le récapitulatif de ce qui sera importé avec les mappings fournis.
    
    Le fichier de mapping doit avoir la structure:
    {
        "mappings": {
            "Vaisselle": {"category_id": "uuid", "category_name": "Vaisselle", "confidence": 100},
            "DEEE": {"category_id": "uuid", "category_name": "DEEE", "confidence": 85}
        },
        "unmapped": ["D3E", "EEE PAM"]
    }
    
    Retourne:
    - total_lines: Nombre total de lignes à importer
    - total_kilos: Total des kilos
    - unique_dates: Nombre de dates uniques
    - unique_categories: Nombre de catégories uniques (après mapping)
    - by_category: Répartition par catégorie
    - by_date: Répartition par date
    - unmapped_categories: Liste des catégories non mappées
    """
    # Validation des formats de fichiers
    if not csv_file.filename or not csv_file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le fichier CSV doit être un fichier .csv"
        )
    
    if not mapping_file.filename or not mapping_file.filename.lower().endswith(".json"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le fichier de mapping doit être un fichier .json"
        )
    
    try:
        # Lire les fichiers
        csv_content = await csv_file.read()
        mapping_content = await mapping_file.read()
        
        # Parser le JSON de mapping
        try:
            mapping_json = json.loads(mapping_content.decode("utf-8"))
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Fichier de mapping JSON invalide: {str(e)}"
            )
        
        # Valider la structure du mapping
        try:
            mapping_request = CategoryMappingRequest(**mapping_json)
            mapping_dict = mapping_request.model_dump()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Structure de mapping invalide: {str(e)}"
            )
        
        # Créer le service et calculer le récapitulatif
        service = LegacyImportService(db)
        preview_dict = service.preview(
            file_bytes=csv_content,
            mapping_json=mapping_dict,
        )
        
        return LegacyImportPreviewResponse(**preview_dict)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors du calcul du récapitulatif: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du calcul du récapitulatif: {str(e)}"
        )


@router.post(
    "/import/legacy/export-remapped",
    summary="Exporter le CSV avec les catégories remappées",
    description="Applique les mappings pour remplacer les catégories CSV par les catégories mappées et retourne le CSV remappé. Nécessite ADMIN ou SUPER_ADMIN.",
)
async def export_remapped_legacy_import(
    csv_file: UploadFile = File(..., description="Fichier CSV à remapper"),
    mapping_file: UploadFile = File(..., description="Fichier JSON de mapping validé"),
    current_user: User = Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """
    Exporte le CSV avec les catégories remappées.
    
    Le fichier de mapping doit avoir la structure:
    {
        "mappings": {
            "Vaisselle": {"category_id": "uuid", "category_name": "Vaisselle", "confidence": 100},
            "DEEE": {"category_id": "uuid", "category_name": "DEEE", "confidence": 85}
        },
        "unmapped": ["D3E", "EEE PAM"]
    }
    
    Le CSV exporté aura les catégories CSV remplacées par les catégories mappées (category_name).
    Les autres colonnes (date, poids_kg, destination, notes) sont conservées.
    """
    _ = current_user  # Utilisé uniquement pour la vérification d'autorisation
    
    # Validation des formats de fichiers
    if not csv_file.filename or not csv_file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le fichier CSV doit être un fichier .csv"
        )
    
    if not mapping_file.filename or not mapping_file.filename.lower().endswith(".json"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le fichier de mapping doit être un fichier .json"
        )
    
    try:
        # Lire les fichiers
        csv_content = await csv_file.read()
        mapping_content = await mapping_file.read()
        
        # Parser le JSON de mapping
        try:
            mapping_json = json.loads(mapping_content.decode("utf-8"))
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Fichier de mapping JSON invalide: {str(e)}"
            )
        
        # Valider la structure du mapping
        try:
            mapping_request = CategoryMappingRequest(**mapping_json)
            mapping_dict = mapping_request.model_dump()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Structure de mapping invalide: {str(e)}"
            )
        
        mappings = mapping_dict.get("mappings", {})
        
        # Parser le CSV
        try:
            text = csv_content.decode("utf-8", errors="replace")
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Erreur lors du décodage du CSV: {str(e)}"
            )
        
        reader = csv.DictReader(io.StringIO(text))
        
        # Générer le CSV remappé
        output = io.StringIO()
        writer = csv.writer(output, delimiter=',', quoting=csv.QUOTE_MINIMAL)
        
        # En-têtes
        writer.writerow(["date", "category", "poids_kg", "destination", "notes"])
        
        # Lignes remappées
        for row in reader:
            csv_category = row.get("category", "").strip()
            if csv_category in mappings:
                # Remplacer par la catégorie mappée
                mapped_category = mappings[csv_category]["category_name"]
            else:
                # Conserver le nom original si non mappé
                mapped_category = csv_category
            
            # Nettoyer et formater le poids pour qu'Excel le reconnaisse comme un nombre
            poids_str = row.get("poids_kg", "").strip()
            # Retirer les apostrophes/guillemets si présents
            poids_str = poids_str.lstrip("'\"")
            poids_str = poids_str.rstrip("'\"")
            # Parser comme float pour valider et formater correctement
            try:
                poids_float = float(poids_str) if poids_str else 0.0
                # Formater avec 2 décimales, sans guillemets
                poids_formatted = f"{poids_float:.2f}"
            except (ValueError, TypeError):
                # Si ce n'est pas un nombre valide, garder la valeur originale
                poids_formatted = poids_str
            
            writer.writerow([
                row.get("date", ""),
                mapped_category,  # Catégorie remappée
                poids_formatted,  # Poids formaté comme nombre
                row.get("destination", ""),
                row.get("notes", "")
            ])
        
        # Générer le CSV
        csv_content_remapped = output.getvalue()
        csv_bytes = csv_content_remapped.encode('utf-8-sig')  # BOM pour Excel
        
        # Nom de fichier
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"import_legacy_remappe_{timestamp}.csv"
        
        return StreamingResponse(
            iter([csv_bytes]),
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de l'export CSV remappé: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'export: {str(e)}"
        )


@router.post(
    "/import/legacy/clean",
    response_model=LegacyImportCleanResponse,
    summary="Nettoyer un CSV legacy",
    description="Nettoie un CSV legacy (non conforme) et retourne le CSV nettoyé prêt à être analysé. Nécessite ADMIN ou SUPER_ADMIN.",
)
async def clean_legacy_import(
    file: UploadFile = File(..., description="Fichier CSV legacy à nettoyer"),
    current_user: User = Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
):
    """
    Nettoie un CSV legacy et retourne le CSV nettoyé.

    Le CSV nettoyé est retourné en base64 dans un JSON avec les statistiques de nettoyage.
    Le frontend peut décoder le base64, créer un Blob, puis un File pour remplacer le fichier original.

    Args:
        file: Fichier CSV legacy (peut être non conforme)

    Returns:
        JSON avec cleaned_csv_base64, filename, et statistics
    """
    # Validation du format de fichier
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format non supporté: fournir un fichier .csv"
        )

    try:
        # Lire le contenu du fichier
        content = await file.read()

        # Créer le service de nettoyage et nettoyer
        cleaner = LegacyCSVCleanerService()
        cleaned_csv_bytes, stats_dict = cleaner.clean_csv(content)

        # Encoder le CSV nettoyé en base64
        cleaned_csv_base64 = base64.b64encode(cleaned_csv_bytes).decode("utf-8")

        # Générer le nom de fichier nettoyé
        original_filename = file.filename or "import.csv"
        cleaned_filename = f"{original_filename.rsplit('.', 1)[0]}_CLEANED.csv"

        # Construire la réponse
        return LegacyImportCleanResponse(
            cleaned_csv_base64=cleaned_csv_base64,
            filename=cleaned_filename,
            statistics=LegacyImportCleanStatistics(**stats_dict),
        )

    except ValueError as e:
        # Erreurs de validation (CSV vide, colonnes manquantes, etc.)
        logger.error(f"Erreur de validation lors du nettoyage CSV: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erreur lors du nettoyage: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Erreur lors du nettoyage du CSV legacy: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du nettoyage: {str(e)}"
        )

