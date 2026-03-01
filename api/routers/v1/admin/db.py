# Story 8.5 / 17.3 — POST /v1/admin/db/export, purge-transactions, import.
# Permissions (v1) : super_admin OU admin.
# Story 17.3 : implementation operationnelle (export dump reel, purge FK, import SQL).

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from api.core.deps import require_permissions
from api.db import get_db
from api.models import User
from api.services.audit import write_audit_event
from api.services.db_admin import (
    execute_import_sql,
    export_dump,
    purge_transactions,
)

router = APIRouter(prefix="/db", tags=["admin-db"])
_DbAdmin = Depends(require_permissions("super_admin", "admin"))


@router.post("/export")
def admin_db_export(
    db: Session = Depends(get_db),
    current_user: User = _DbAdmin,
) -> Response:
    """POST /v1/admin/db/export — dump SQL reel de la base RecyClique."""
    try:
        engine = db.get_bind()
        content = export_dump(engine)
        return Response(
            content=content,
            media_type="application/sql",
            headers={"Content-Disposition": 'attachment; filename="recyclique-export.sql"'},
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur export BDD: {str(e)}",
        )


@router.post("/purge-transactions")
def admin_db_purge_transactions(
    db: Session = Depends(get_db),
    current_user: User = _DbAdmin,
) -> dict:
    """POST /v1/admin/db/purge-transactions — suppression reelle des transactions (FK)."""
    try:
        deleted = purge_transactions(db)
        total = sum(deleted.values())
        write_audit_event(
            db,
            user_id=current_user.id,
            action="admin.db.purge_transactions",
            resource_type="db",
            details=f"purge-transactions: {total} enregistrement(s) supprime(s)",
        )
        db.commit()
        return {
            "message": f"Purge terminee : {total} enregistrement(s) supprime(s)",
            "deleted_count": total,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erreur purge BDD: {str(e)}",
        )


@router.post("/import")
def admin_db_import(
    db: Session = Depends(get_db),
    current_user: User = _DbAdmin,
    file: UploadFile = File(...),
) -> dict:
    """POST /v1/admin/db/import — restauration depuis un fichier SQL."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Fichier requis")
    ext = (file.filename or "").lower()
    if not (ext.endswith(".sql") or ext.endswith(".dump")):
        raise HTTPException(
            status_code=400,
            detail="Format invalide : fichier .sql ou .dump attendu",
        )
    try:
        content = file.file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Impossible de lire le fichier: {str(e)}")
    if not content:
        raise HTTPException(status_code=400, detail="Fichier vide")

    try:
        sql_content = content.decode("utf-8", errors="replace")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Fichier invalide (encodage): {str(e)}")

    ok, message = execute_import_sql(db, sql_content)
    if not ok:
        db.rollback()
        raise HTTPException(
            status_code=422,
            detail=message,
        )

    write_audit_event(
        db,
        user_id=current_user.id,
        action="admin.db.import",
        resource_type="db",
        details=f"import file={file.filename}",
    )
    db.commit()
    return {
        "ok": True,
        "message": f"Import termine : {message}",
        "filename": file.filename,
    }
