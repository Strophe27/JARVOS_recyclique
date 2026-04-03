"""
Utilitaire standardisé pour la gestion des erreurs dans les endpoints d'export.

Story B50-P3: Standardisation de la gestion d'erreurs pour éviter la duplication
et améliorer la maintenabilité.
"""
import logging
from typing import Callable, TypeVar, Any
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

T = TypeVar('T')


def handle_export_errors(
    export_func: Callable[[], T],
    context: str = "export",
    resource_id: str | None = None
) -> T:
    """
    Gère de manière standardisée les erreurs dans les endpoints d'export.
    
    Args:
        export_func: Fonction d'export à exécuter (sans arguments)
        context: Contexte de l'export (ex: "ticket CSV", "bulk sessions")
        resource_id: ID de la ressource exportée (optionnel, pour le logging)
    
    Returns:
        Résultat de la fonction d'export
    
    Raises:
        HTTPException: Erreur HTTP standardisée selon le type d'erreur
    """
    try:
        return export_func()
    except AttributeError as e:
        logger.error(
            f"Attribut manquant lors de l'export {context}: {e}",
            extra={"resource_id": resource_id, "context": context},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'export {context}: attribut manquant - {str(e)}"
        )
    except ValueError as e:
        logger.error(
            f"Erreur de validation lors de l'export {context}: {e}",
            extra={"resource_id": resource_id, "context": context},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erreur de validation lors de l'export {context}: {str(e)}"
        )
    except HTTPException:
        # Re-raise les HTTPException telles quelles (déjà gérées)
        raise
    except Exception as e:
        logger.error(
            f"Erreur inattendue lors de l'export {context}: {e}",
            extra={"resource_id": resource_id, "context": context},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'export {context}: {str(e)}"
        )


def handle_export_errors_with_logging(
    export_func: Callable[[], T],
    context: str = "export",
    resource_id: str | None = None,
    user_id: str | None = None,
    username: str | None = None,
    endpoint: str | None = None,
    log_access_func: Callable[[str, str, str, bool, str | None], None] | None = None
) -> T:
    """
    Gère les erreurs d'export avec logging d'accès admin intégré.
    
    Utile pour les endpoints qui nécessitent un audit trail (ex: exports bulk).
    
    Args:
        export_func: Fonction d'export à exécuter
        context: Contexte de l'export
        resource_id: ID de la ressource exportée
        user_id: ID de l'utilisateur (pour audit)
        username: Nom d'utilisateur (pour audit)
        endpoint: Endpoint appelé (pour audit)
        log_access_func: Fonction de logging d'accès (ex: log_admin_access)
    
    Returns:
        Résultat de la fonction d'export
    """
    try:
        result = export_func()
        
        # Log succès si fonction de logging fournie
        if log_access_func and user_id and endpoint:
            log_access_func(
                user_id,
                username or "Unknown",
                endpoint,
                success=True
            )
        
        return result
    except HTTPException as e:
        # Log échec pour les erreurs HTTP
        if log_access_func and user_id and endpoint:
            log_access_func(
                user_id,
                username or "Unknown",
                endpoint,
                success=False,
                error_message=str(e.detail)
            )
        raise
    except AttributeError as e:
        error_msg = f"Attribut manquant lors de l'export {context}: {e}"
        logger.error(
            error_msg,
            extra={"resource_id": resource_id, "context": context},
            exc_info=True
        )
        
        if log_access_func and user_id and endpoint:
            log_access_func(
                user_id,
                username or "Unknown",
                endpoint,
                success=False,
                error_message=f"attribute_error: {str(e)}"
            )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'export {context}: attribut manquant - {str(e)}"
        )
    except ValueError as e:
        error_msg = f"Erreur de validation lors de l'export {context}: {e}"
        logger.error(
            error_msg,
            extra={"resource_id": resource_id, "context": context},
            exc_info=True
        )
        
        if log_access_func and user_id and endpoint:
            log_access_func(
                user_id,
                username or "Unknown",
                endpoint,
                success=False,
                error_message=str(e)
            )
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erreur de validation lors de l'export {context}: {str(e)}"
        )
    except Exception as e:
        error_msg = f"Erreur inattendue lors de l'export {context}: {e}"
        logger.error(
            error_msg,
            extra={"resource_id": resource_id, "context": context},
            exc_info=True
        )
        
        if log_access_func and user_id and endpoint:
            log_access_func(
                user_id,
                username or "Unknown",
                endpoint,
                success=False,
                error_message=f"export_generation_failed: {str(e)}"
            )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'export {context}: {str(e)}"
        )

