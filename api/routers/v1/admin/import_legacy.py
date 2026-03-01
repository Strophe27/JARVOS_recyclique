# Story 8.5 / 17.5 — Import legacy : GET llm-models, POST analyze, preview, validate, execute.
# Protégé par permission admin (ou super_admin). Pipeline operationnel (non-stub).

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from api.core.deps import require_permissions
from api.db import get_db
from api.models import User
from api.services.import_legacy import (
    analyze_csv,
    execute_csv,
    preview_csv,
    validate_csv,
)

router = APIRouter(prefix="/import/legacy", tags=["admin-import-legacy"])
_Admin = Depends(require_permissions("admin", "super_admin"))


@router.get("/llm-models")
def get_legacy_llm_models(current_user: User = _Admin) -> dict:
    """GET /v1/admin/import/legacy/llm-models — liste vide (reserve future)."""
    return {"models": []}


@router.post("/analyze")
async def post_legacy_analyze(
    current_user: User = _Admin,
    file: UploadFile = File(...),
) -> dict:
    """POST /v1/admin/import/legacy/analyze — analyse le CSV (colonnes, lignes, erreurs)."""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Fichier requis")
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Fichier CSV requis")
    content = await file.read()
    return analyze_csv(content)


@router.post("/preview")
async def post_legacy_preview(
    current_user: User = _Admin,
    file: UploadFile = File(...),
) -> dict:
    """POST /v1/admin/import/legacy/preview — apercu des N premieres lignes."""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Fichier requis")
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=422, detail="Fichier CSV requis")
    content = await file.read()
    return preview_csv(content)


@router.post("/validate")
async def post_legacy_validate(
    current_user: User = _Admin,
    file: UploadFile = File(...),
    db=Depends(get_db),
) -> dict:
    """POST /v1/admin/import/legacy/validate — validation (parent_id en BDD, types)."""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Fichier requis")
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=422, detail="Fichier CSV requis")
    content = await file.read()
    return validate_csv(db, content)


@router.post("/execute")
async def post_legacy_execute(
    current_user: User = _Admin,
    file: UploadFile = File(...),
    db=Depends(get_db),
) -> dict:
    """POST /v1/admin/import/legacy/execute — execution de l'import en BDD."""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Fichier requis")
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=422, detail="Fichier CSV requis")
    content = await file.read()
    return execute_csv(db, content)
