import json
import logging
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from api.core.deps import require_permissions
from api.db import SessionLocal, get_db
from api.models import User
from api.services.audit import write_audit_event
from api.services.db_admin import export_dump, import_dump, purge_transactions

router = APIRouter(prefix="/db", tags=["admin-db"])
_SuperAdmin = Depends(require_permissions("super_admin"))

logger = logging.getLogger(__name__)

_MAX_IMPORT_BYTES = 500 * 1024 * 1024


@router.post("/export")
def admin_db_export(
    db: Session = Depends(get_db),
    current_user: User = _SuperAdmin,
) -> Response:
    """POST /v1/admin/db/export — dump binaire Custom PostgreSQL."""
    try:
        database_url = db.get_bind().url.render_as_string(hide_password=False)
        content, filename = export_dump(database_url)
        return Response(
            content=content,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except RuntimeError as e:
        if str(e) == "timeout":
            raise HTTPException(
                status_code=504,
                detail="L'export de la base de données a pris trop de temps (timeout après 10 minutes).",
            )
        raise HTTPException(status_code=500, detail=f"Erreur export BDD: {str(e)}")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de l'export de la base de données: {str(e)}",
        )


@router.post("/import")
def admin_db_import(
    db: Session = Depends(get_db),
    current_user: User = _SuperAdmin,
    file: UploadFile = File(...),
) -> dict:
    """POST /v1/admin/db/import — restauration depuis un fichier .dump binaire PostgreSQL."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Fichier requis")
    if not file.filename.lower().endswith(".dump"):
        raise HTTPException(
            status_code=400,
            detail="Format invalide : fichier .dump uniquement (format binaire PostgreSQL)",
        )

    try:
        content = file.file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Impossible de lire le fichier: {str(e)}")

    if not content:
        raise HTTPException(status_code=400, detail="Fichier vide")

    file_size_bytes = len(content)
    if file_size_bytes > _MAX_IMPORT_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Fichier trop volumineux ({file_size_bytes // (1024 * 1024)} MB). Limite : 500 MB.",
        )

    # Capturer user_id comme valeur Python brute avant le restore :
    # après pg_restore, la session SQLAlchemy est morte et current_user.id
    # déclencherait un lazy-load sur une connexion fermée.
    current_user_id = current_user.id

    start_time = datetime.now(timezone.utc)
    backup_created: str | None = None
    backup_path: str | None = None

    def _write_audit(
        success: bool,
        error_type: str | None = None,
        error_message: str | None = None,
    ) -> None:
        duration = (datetime.now(timezone.utc) - start_time).total_seconds()
        details = json.dumps({
            "filename": file.filename,
            "file_size_bytes": file_size_bytes,
            "file_size_mb": round(file_size_bytes / (1024 * 1024), 2),
            "duration_seconds": round(duration, 2),
            "backup_created": backup_created,
            "backup_path": backup_path,
            "success": success,
            "error_type": error_type,
            "error_message": error_message,
        })
        try:
            write_audit_event(
                db,
                user_id=current_user_id,
                action="admin.db.import",
                resource_type="db",
                details=details,
            )
            db.commit()
        except Exception as _audit_exc:
            logger.warning("audit primary session failed, retrying with new session: %s", _audit_exc)
            new_db = SessionLocal()
            try:
                write_audit_event(
                    new_db,
                    user_id=current_user_id,
                    action="admin.db.import",
                    resource_type="db",
                    details=details,
                )
                new_db.commit()
            finally:
                new_db.close()

    try:
        database_url = db.get_bind().url.render_as_string(hide_password=False)
        backups_dir = os.environ.get("BACKUPS_DIR", "/backups")
        result = import_dump(content, file.filename, database_url, backups_dir)

        backup_created = result["backup_created"]
        backup_path = result["backup_path"]

        _write_audit(success=True)

        return {
            "message": "Import de la base de données effectué avec succès",
            "imported_file": file.filename,
            "backup_created": backup_created,
            "backup_path": backup_path,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    except RuntimeError as e:
        err_str = str(e)

        if err_str == "timeout":
            _write_audit(success=False, error_type="timeout", error_message="Timeout")
            raise HTTPException(
                status_code=504,
                detail="L'import de la base de données a pris trop de temps.",
            )
        elif err_str.startswith("validation_failed:"):
            msg = err_str[len("validation_failed:"):]
            _write_audit(success=False, error_type="validation_failed", error_message=msg)
            raise HTTPException(status_code=400, detail=f"Fichier dump invalide: {msg}")
        elif err_str.startswith("backup_failed:"):
            msg = err_str[len("backup_failed:"):]
            _write_audit(success=False, error_type="backup_failed", error_message=msg)
            raise HTTPException(
                status_code=500,
                detail=f"Impossible de créer la sauvegarde préalable: {msg}",
            )
        else:
            msg = err_str.removeprefix("restore_failed:")
            _write_audit(success=False, error_type="restore_failed", error_message=msg)
            raise HTTPException(
                status_code=500, detail=f"Erreur lors de la restauration: {msg}"
            )

    except Exception as e:
        _write_audit(success=False, error_type="unexpected", error_message=str(e))
        raise HTTPException(
            status_code=500, detail=f"Erreur inattendue lors de l'import: {str(e)}"
        )


@router.post("/purge-transactions")
def admin_db_purge_transactions(
    db: Session = Depends(get_db),
    current_user: User = _SuperAdmin,
) -> dict:
    """POST /v1/admin/db/purge-transactions — suppression des tables transactionnelles (1.4.4)."""
    try:
        deleted = purge_transactions(db)
        write_audit_event(
            db,
            user_id=current_user.id,
            action="admin.db.purge_transactions",
            resource_type="db",
            details=json.dumps({"deleted_records": deleted}),
        )
        db.commit()
        return {
            "message": "Purge des données transactionnelles effectuée avec succès",
            "deleted_records": deleted,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur purge BDD: {str(e)}")
