"""
Endpoints admin : template CSV réception offline (sans Telegram).
"""

from __future__ import annotations

import io
import logging
import sys
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status as http_status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from slowapi import Limiter

from recyclic_api.core.audit import log_admin_access
from recyclic_api.core.auth import require_role_strict
from recyclic_api.core.database import get_db
from recyclic_api.models.user import User, UserRole

logger = logging.getLogger(__name__)


def register_admin_templates_offline_routes(router: APIRouter, _limiter: Limiter) -> None:
    """Enregistre GET /admin/templates/reception-offline.csv."""

    @router.get(
        "/templates/reception-offline.csv",
        summary="Télécharger le template CSV offline pour les réceptions",
        description="Retourne un fichier CSV modèle vierge pour la saisie manuelle des réceptions en cas de panne réseau. Nécessite ADMIN ou SUPER_ADMIN.",
    )
    async def download_reception_offline_template(
        current_user: User = Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
        db: Session = Depends(get_db),
    ):
        """
        Génère et retourne le template CSV offline pour les réceptions.

        Le template contient les colonnes suivantes:
        - date: Format ISO 8601 (YYYY-MM-DD)
        - category: Nom exact de la catégorie en base
        - poids_kg: Nombre décimal avec 2 décimales (ex: 12.50)
        - destination: MAGASIN, RECYCLAGE, ou DECHETERIE
        - notes: Texte libre (optionnel)

        Le fichier est encodé en UTF-8 avec BOM pour compatibilité Excel.
        """
        try:
            # Importer le script de génération
            scripts_path = Path(__file__).parent.parent.parent.parent.parent.parent / "scripts"
            if str(scripts_path) not in sys.path:
                sys.path.insert(0, str(scripts_path))

            # Importer et exécuter la fonction de génération
            from generate_offline_template import generate_template_csv

            # Générer le contenu CSV
            csv_content = generate_template_csv()

            # Nom du fichier
            filename = "template-reception-offline.csv"

            # Log de l'accès admin
            log_admin_access(
                str(current_user.id),
                current_user.username or "Unknown",
                "/admin/templates/reception-offline.csv",
                success=True,
            )

            # Retourner le fichier en streaming
            return StreamingResponse(
                io.BytesIO(csv_content),
                media_type="text/csv; charset=utf-8",
                headers={"Content-Disposition": f"attachment; filename={filename}"},
            )
        except ImportError as e:
            logger.error(f"Erreur lors de l'import du script de génération: {e}", exc_info=True)
            log_admin_access(
                str(current_user.id),
                current_user.username or "Unknown",
                "/admin/templates/reception-offline.csv",
                success=False,
                error_message=f"import_error: {str(e)}",
            )
            raise HTTPException(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erreur lors de la génération du template",
            )
        except Exception as e:
            logger.error(f"Erreur lors de la génération du template: {e}", exc_info=True)
            log_admin_access(
                str(current_user.id),
                current_user.username or "Unknown",
                "/admin/templates/reception-offline.csv",
                success=False,
                error_message=f"generation_error: {str(e)}",
            )
            raise HTTPException(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erreur lors de la génération du template",
            )
