"""
Database export endpoint for SuperAdmins.
Allows manual database backup on-demand.
"""

import logging
import os
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse, unquote
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from recyclic_api.core.database import get_db
from recyclic_api.core.auth import require_super_admin_role
from recyclic_api.core.config import settings
from recyclic_api.models.user import User

router = APIRouter(tags=["admin"])
logger = logging.getLogger(__name__)


@router.post(
    "/db/export",
    summary="Export manuel de la base de données (Super Admin uniquement)",
    description="Génère un export pg_dump au format binaire (.dump) de la base de données et le télécharge",
    response_class=FileResponse
)
async def export_database(
    current_user: User = Depends(require_super_admin_role()),
    db: Session = Depends(get_db)
):
    """
    Génère un export de la base de données PostgreSQL et le retourne en tant que fichier téléchargeable.

    Restrictions:
    - Accessible uniquement aux Super-Admins
    - Peut être une opération longue pour les bases de données volumineuses
    """
    try:
        logger.info(f"Database export requested by user {current_user.id} ({current_user.username})")

        # Parse DATABASE_URL to extract connection parameters using urllib.parse
        db_url = settings.DATABASE_URL

        try:
            parsed = urlparse(db_url)
            
            # Validate scheme
            if parsed.scheme not in ("postgresql", "postgres"):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Invalid database URL scheme (must be postgresql:// or postgres://)"
                )
            
            # Extract credentials
            db_user = unquote(parsed.username) if parsed.username else ""
            db_password = unquote(parsed.password) if parsed.password else ""
            
            # Extract host and port
            db_host = parsed.hostname or "localhost"
            db_port = str(parsed.port) if parsed.port else "5432"
            
            # Extract database name (remove leading slash)
            db_name = parsed.path.lstrip("/") if parsed.path else ""
            
            if not db_name:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Database name is required in DATABASE_URL"
                )
            
            if not db_user:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Database user is required in DATABASE_URL"
                )
                
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Invalid database URL format: {str(e)}"
            )

        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"recyclic_db_export_{timestamp}.dump"

        # Create temporary file for the export
        temp_dir = tempfile.gettempdir()
        export_path = os.path.join(temp_dir, filename)

        # Prepare pg_dump command
        # Use environment variables for password to avoid shell injection
        env = os.environ.copy()
        env["PGPASSWORD"] = db_password

        pg_dump_cmd = [
            "pg_dump",
            "-h", db_host,
            "-p", db_port,
            "-U", db_user,
            "-d", db_name,
            "-F", "c",  # Custom format (binary)
            "-Z", "9",  # Compression level 9
            "-f", export_path,
            "--clean",  # Include DROP statements
            "--if-exists",  # Use IF EXISTS for DROP
            "--no-owner",  # Don't include ownership commands
            "--no-privileges",  # Don't include privilege commands
            # IMPORTANT: Exporter toutes les tables, même vides
            # Par défaut, pg_dump exporte toutes les tables, mais on s'assure explicitement
            # que les tables vides sont incluses dans le schéma
        ]

        logger.info(f"Executing pg_dump to {export_path}")

        # Execute pg_dump
        result = subprocess.run(
            pg_dump_cmd,
            env=env,
            capture_output=True,
            text=True,
            timeout=600,  # 10 minutes timeout (peut être long pour bases volumineuses)
            check=False  # Don't raise exception on non-zero exit
        )

        if result.returncode != 0:
            logger.error(f"pg_dump failed with return code {result.returncode}: {result.stderr}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database export failed: {result.stderr}"
            )

        # Check if file was created
        if not os.path.exists(export_path):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Export file was not created"
            )

        logger.info(f"Database export successful: {export_path}")

        # Return file as download
        return FileResponse(
            path=export_path,
            filename=filename,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )

    except subprocess.TimeoutExpired:
        logger.error("Database export timed out after 10 minutes")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="L'export de la base de données a pris trop de temps (timeout après 10 minutes). La base est peut-être trop volumineuse."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during database export: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'export de la base de données: {str(e)}"
        )
