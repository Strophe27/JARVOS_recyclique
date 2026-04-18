import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from recyclic_api.utils.report_tokens import generate_download_token, verify_download_token
from recyclic_api.utils.rate_limit import conditional_rate_limit
from recyclic_api.utils.export_error_handler import handle_export_errors_with_logging
from recyclic_api.utils.date_utils import parse_iso_datetime
from recyclic_api.core.audit import log_cash_session_access, log_admin_access
from recyclic_api.core.auth import require_role_strict
from recyclic_api.core.redis import get_redis
from recyclic_api.core.step_up import (
    IDEMPOTENCY_KEY_HEADER,
    SENSITIVE_OPERATION_REPORTS_CASH_SESSIONS_EXPORT_BULK,
    SENSITIVE_OPERATION_REPORTS_RECEPTION_TICKETS_EXPORT_BULK,
    STEP_UP_PIN_HEADER,
    verify_step_up_pin_header,
)
from recyclic_api.core.config import settings, get_browser_api_v1_prefix
from recyclic_api.core.database import get_db
from recyclic_api.models.cash_session import CashSession
from recyclic_api.models.user import User, UserRole
from recyclic_api.schemas.report import ReportEntry, ReportListResponse
from recyclic_api.schemas.cash_session import CashSessionFilters
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal

router = APIRouter()

logger = logging.getLogger(__name__)


def _require_bulk_export_step_up_and_idempotency(
    request: Request,
    current_user: User,
    redis_client,
    *,
    operation: str,
) -> str:
    """
    Story 16.4 — exports massifs : preuve PIN (Epic 2.4) + en-tête Idempotency-Key obligatoire.

    La réponse reste un flux (CSV/XLSX) : la clé sert à corrélation client / audit et discipline
    d'appel ; pas de cache de corps de réponse côté serveur pour ces routes.
    """
    verify_step_up_pin_header(
        user=current_user,
        pin_header_value=request.headers.get(STEP_UP_PIN_HEADER),
        redis_client=redis_client,
        operation=operation,
    )
    idem_raw = request.headers.get(IDEMPOTENCY_KEY_HEADER)
    if not idem_raw or not str(idem_raw).strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "IDEMPOTENCY_KEY_REQUIRED",
                "message": "En-tête Idempotency-Key requis pour les exports bulk (Story 16.4).",
            },
        )
    return str(idem_raw).strip()


# UUID de session : avant le suffixe _<timestamp>.csv (évite les échecs si opérateur/site
# contiennent des underscores dans le nom de fichier).
_SESSION_ID_IN_REPORT_NAME = re.compile(
    r"([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})_\d+\.csv$",
    re.IGNORECASE,
)


def _reports_directory() -> Path:
    directory = Path(settings.CASH_SESSION_REPORT_DIR)
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def _extract_session_id(filename: str) -> UUID | None:
    match = _SESSION_ID_IN_REPORT_NAME.search(filename)
    if not match:
        return None
    try:
        return UUID(match.group(1))
    except ValueError:
        return None


def _ensure_session_access(user: User, session: CashSession) -> None:
    if user.role == UserRole.SUPER_ADMIN:
        return
    if user.role == UserRole.ADMIN:
        if user.site_id and session.site_id and user.site_id != session.site_id:
            raise HTTPException(status_code=403, detail="Acces restreint aux rapports de votre site")


@conditional_rate_limit("30/minute")
@router.get("/cash-sessions", response_model=ReportListResponse, summary="Lister les rapports de sessions de caisse")
def list_cash_session_reports(
    request: Request,
    current_user: User = Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
) -> ReportListResponse:
    """Return the available cash session reports for administrators."""
    log_admin_access(str(current_user.id), current_user.username or "Unknown", "/admin/reports/cash-sessions", success=True)
    directory = _reports_directory()

    files = sorted(
        [file for file in directory.glob("*.csv") if file.is_file()],
        key=lambda candidate: candidate.stat().st_mtime,
        reverse=True,
    )

    reports: List[ReportEntry] = []
    for file in files:
        stat_result = file.stat()
        reports.append(
            ReportEntry(
                filename=file.name,
                size_bytes=stat_result.st_size,
                modified_at=datetime.fromtimestamp(stat_result.st_mtime, tz=timezone.utc),
                download_url=f"{get_browser_api_v1_prefix()}/admin/reports/cash-sessions/{file.name}?token={generate_download_token(file.name)}",
            )
        )

    return ReportListResponse(reports=reports, total=len(reports))


@conditional_rate_limit("60/minute")
@router.get(
    "/cash-sessions/by-session/{session_id}",
    response_class=FileResponse,
    summary="Télécharger un rapport de session de caisse par ID de session",
)
def download_cash_session_report_by_id(
    request: Request,
    session_id: UUID,
    current_user: User = Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    db: Session = Depends(get_db),
) -> FileResponse:
    """Génère et télécharge le rapport CSV d'une session de caisse par son ID."""
    cash_session = db.query(CashSession).filter(CashSession.id == session_id).first()
    if cash_session is None:
        log_admin_access(
            str(current_user.id),
            current_user.username or "Unknown",
            f"/admin/reports/cash-sessions/by-session/{session_id}",
            success=False,
            error_message="session_not_found",
        )
        raise HTTPException(status_code=404, detail="Session de caisse introuvable")

    try:
        _ensure_session_access(current_user, cash_session)
    except HTTPException as exc:
        log_admin_access(
            str(current_user.id),
            current_user.username or "Unknown",
            f"/admin/reports/cash-sessions/by-session/{session_id}",
            success=False,
            error_message=exc.detail,
        )
        raise

    # Générer le rapport avec le nouveau format
    from recyclic_api.services.export_service import generate_cash_session_report
    
    try:
        report_path = generate_cash_session_report(db, cash_session)
        
        rid = getattr(request.state, "request_id", None)
        log_cash_session_access(
            user_id=str(current_user.id),
            username=current_user.username or "Unknown",
            session_id=str(session_id),
            success=True,
            db=db,
            request_id=rid,
            site_id=str(cash_session.site_id) if cash_session.site_id else None,
            cash_register_id=str(cash_session.register_id) if cash_session.register_id else None,
            operation="cash_session.report_download",
        )
        log_admin_access(
            str(current_user.id),
            current_user.username or "Unknown",
            f"/admin/reports/cash-sessions/by-session/{session_id}",
            success=True,
        )
        
        return FileResponse(report_path, media_type="text/csv", filename=report_path.name)
    except Exception as e:
        logger.error(f"Error generating report for session {session_id}: {e}", exc_info=True)
        log_admin_access(
            str(current_user.id),
            current_user.username or "Unknown",
            f"/admin/reports/cash-sessions/by-session/{session_id}",
            success=False,
            error_message=f"report_generation_failed: {str(e)}",
        )
        raise HTTPException(status_code=500, detail="Erreur lors de la génération du rapport")


@conditional_rate_limit("60/minute")
@router.get(
    "/cash-sessions/{filename}",
    response_class=FileResponse,
    summary="Telecharger un rapport de session de caisse",
)
def download_cash_session_report(
    request: Request,
    filename: str,
    token: str = Query(..., description="Jeton d'Acces signe"),
    current_user: User = Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    db: Session = Depends(get_db),
) -> FileResponse:
    """Serve the requested cash session report as a CSV file."""
    safe_name = Path(filename).name
    endpoint_path = f"/admin/reports/cash-sessions/{safe_name}"

    if safe_name != filename or safe_name.startswith('.'):
        log_admin_access(
            str(current_user.id),
            current_user.username or "Unknown",
            endpoint_path,
            success=False,
            error_message="filename_validation_failed",
        )
        raise HTTPException(status_code=400, detail="Nom de fichier invalide")

    if not verify_download_token(token, safe_name):
        log_admin_access(
            str(current_user.id),
            current_user.username or "Unknown",
            endpoint_path,
            success=False,
            error_message="token_invalid_or_expired",
        )
        raise HTTPException(status_code=403, detail="Lien de telechargement invalide ou expire")

    session_id = _extract_session_id(safe_name)
    if session_id is None:
        log_admin_access(
            str(current_user.id),
            current_user.username or "Unknown",
            endpoint_path,
            success=False,
            error_message="invalid_report_format",
        )
        raise HTTPException(status_code=400, detail="Format de rapport inconnu")

    cash_session = db.query(CashSession).filter(CashSession.id == session_id).first()
    if cash_session is None:
        log_admin_access(
            str(current_user.id),
            current_user.username or "Unknown",
            endpoint_path,
            success=False,
            error_message="session_not_found",
        )
        raise HTTPException(status_code=404, detail="Session de caisse introuvable")

    try:
        _ensure_session_access(current_user, cash_session)
    except HTTPException as exc:
        rid = getattr(request.state, "request_id", None)
        log_cash_session_access(
            user_id=str(current_user.id),
            username=current_user.username or "Unknown",
            session_id=str(session_id),
            success=False,
            db=db,
            request_id=rid,
            site_id=str(cash_session.site_id) if cash_session.site_id else None,
            cash_register_id=str(cash_session.register_id) if cash_session.register_id else None,
            operation="cash_session.report_download",
            outcome="refused",
        )
        log_admin_access(
            str(current_user.id),
            current_user.username or "Unknown",
            endpoint_path,
            success=False,
            error_message=exc.detail,
        )
        raise

    # Régénérer le rapport avec le nouveau format (au lieu de servir l'ancien fichier)
    # Cela garantit que tous les rapports téléchargés utilisent le nouveau format amélioré
    from recyclic_api.services.export_service import generate_cash_session_report
    
    try:
        # Régénérer le rapport avec le nouveau format
        report_path = generate_cash_session_report(db, cash_session)

        rid = getattr(request.state, "request_id", None)
        log_cash_session_access(
            user_id=str(current_user.id),
            username=current_user.username or "Unknown",
            session_id=str(session_id),
            success=True,
            db=db,
            request_id=rid,
            site_id=str(cash_session.site_id) if cash_session.site_id else None,
            cash_register_id=str(cash_session.register_id) if cash_session.register_id else None,
            operation="cash_session.report_download",
        )
        log_admin_access(
            str(current_user.id),
            current_user.username or "Unknown",
            endpoint_path,
            success=True,
        )
        
        return FileResponse(report_path, media_type="text/csv", filename=report_path.name)
    except Exception as e:
        logger.error(f"Error regenerating report for session {session_id}: {e}", exc_info=True)
        # Fallback: essayer de servir l'ancien fichier s'il existe
        file_path = _reports_directory() / safe_name
        if file_path.exists() and file_path.is_file():
            log_admin_access(
                str(current_user.id),
                current_user.username or "Unknown",
                endpoint_path,
                success=True,
            )
            return FileResponse(file_path, media_type="text/csv", filename=safe_name)
        
        log_admin_access(
            str(current_user.id),
            current_user.username or "Unknown",
            endpoint_path,
            success=False,
            error_message=f"report_generation_failed: {str(e)}",
        )
        raise HTTPException(status_code=500, detail="Erreur lors de la génération du rapport")


# === SCHÉMAS POUR EXPORTS BULK ===

class BulkExportFilters(BaseModel):
    """Filtres pour export bulk de sessions de caisse."""
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    status: Optional[str] = None
    operator_id: Optional[str] = None
    site_id: Optional[str] = None
    search: Optional[str] = None
    include_empty: bool = False


class BulkExportRequest(BaseModel):
    """Requête pour export bulk."""
    filters: BulkExportFilters
    format: Literal["csv", "excel"] = Field(..., description="Format d'export: csv ou excel")


class BulkReceptionExportFilters(BaseModel):
    """Filtres pour export bulk de tickets de réception."""
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    status: Optional[str] = None
    benevole_id: Optional[str] = None
    search: Optional[str] = None
    include_empty: bool = False
    
    @field_validator('date_from', 'date_to', mode='before')
    @classmethod
    def parse_datetime(cls, v):
        """
        Parse string ISO en datetime en utilisant l'utilitaire standardisé.
        
        B50-P2: Utilise l'utilitaire date_utils pour standardiser le parsing.
        Le frontend envoie des dates en format ISO 8601 "2025-12-10T00:00:00.000Z"
        """
        if v is None:
            return None
        if isinstance(v, str):
            # B50-P2: Utiliser l'utilitaire standardisé pour le parsing
            logger.debug(f"Parsing date string: {v} (type: {type(v)})")
            try:
                parsed = parse_iso_datetime(v)
                logger.debug(f"Date parsed successfully: {parsed}")
                return parsed
            except ValueError as e:
                logger.error(f"Erreur parsing date '{v}': {e}")
                raise ValueError(f"Format de date invalide: {v}. Erreur: {e}")
        # Si c'est déjà un datetime, le retourner tel quel
        if isinstance(v, datetime):
            return v
        return v


class BulkReceptionExportRequest(BaseModel):
    """Requête pour export bulk de tickets de réception."""
    filters: BulkReceptionExportFilters
    format: Literal["csv", "excel"] = Field(..., description="Format d'export: csv ou excel")


# === ENDPOINTS EXPORTS BULK ===

@conditional_rate_limit("10/minute")
@router.post(
    "/cash-sessions/export-bulk",
    summary="Exporter toutes les sessions de caisse filtrées",
    description="""
    Exporte toutes les sessions de caisse correspondant aux filtres en format CSV ou Excel.
    
    **Format CSV** : Fichier consolidé avec toutes les sessions (une ligne par session).
    **Format Excel** : Fichier avec deux onglets :
    - "Résumé" : Vue synthétique avec totaux
    - "Détails" : Toutes les informations détaillées
    
    **Permissions** : ADMIN ou SUPER_ADMIN uniquement
    **Limite** : Maximum 10 000 sessions par export

    **Story 16.4 — sécurité** :
    - En-tête ``X-Step-Up-Pin`` obligatoire (même modèle que fermeture caisse / export base).
    - En-tête ``Idempotency-Key`` obligatoire (corrélation audit ; pas de rejouer corps binaire en cache).
    - **Audit** : ``log_admin_access`` après génération réussie (via gestionnaire d'erreurs d'export).
    """
)
def export_bulk_cash_sessions(
    request_body: BulkExportRequest,
    request: Request,
    current_user: User = Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    db: Session = Depends(get_db),
    redis_client=Depends(get_redis),
):
    """Exporte toutes les sessions de caisse filtrées en CSV ou Excel."""
    idem_key = _require_bulk_export_step_up_and_idempotency(
        request,
        current_user,
        redis_client,
        operation=SENSITIVE_OPERATION_REPORTS_CASH_SESSIONS_EXPORT_BULK,
    )
    logger.info(
        "bulk_export_cash_sessions_start user_id=%s idempotency_key_prefix=%s",
        current_user.id,
        idem_key[:12],
    )
    from recyclic_api.services.report_service import (
        generate_bulk_cash_sessions_csv,
        generate_bulk_cash_sessions_excel
    )
    
    def _export_bulk():
        # Créer un objet CashSessionFilters avec limit=10000 pour l'export
        # On utilise model_construct pour éviter la validation Pydantic qui limite limit à 100
        filters = CashSessionFilters.model_construct(
            skip=0,
            limit=10000,  # Limite de sécurité pour export
            status=request_body.filters.status,
            operator_id=request_body.filters.operator_id,
            site_id=request_body.filters.site_id,
            date_from=request_body.filters.date_from,
            date_to=request_body.filters.date_to,
            search=request_body.filters.search,
            include_empty=request_body.filters.include_empty
        )
        
        # Générer l'export selon le format
        if request_body.format == "csv":
            buffer = generate_bulk_cash_sessions_csv(db, filters)
            media_type = "text/csv"
            extension = "csv"
        else:  # excel
            buffer = generate_bulk_cash_sessions_excel(db, filters)
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            extension = "xlsx"
        
        # Générer le nom de fichier
        date_str = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"export_sessions_caisse_{date_str}.{extension}"
        
        return StreamingResponse(
            iter([buffer.getvalue()]),
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    
    # Utilisation du gestionnaire d'erreurs standardisé avec logging admin (B50-P3: Standardisation)
    return handle_export_errors_with_logging(
        _export_bulk,
        context=f"bulk sessions caisse ({request_body.format})",
        user_id=str(current_user.id),
        username=current_user.username or "Unknown",
        endpoint="/admin/reports/cash-sessions/export-bulk",
        log_access_func=log_admin_access
    )


@conditional_rate_limit("10/minute")
@router.post(
    "/reception-tickets/export-bulk",
    summary="Exporter tous les tickets de réception filtrés",
    description="""
    Exporte tous les tickets de réception correspondant aux filtres en format CSV ou Excel.
    
    **Format CSV** : Fichier consolidé avec tous les tickets (une ligne par ticket).
    **Format Excel** : Fichier avec deux onglets :
    - "Résumé" : Vue synthétique avec totaux
    - "Détails" : Toutes les informations détaillées
    
    **Permissions** : ADMIN ou SUPER_ADMIN uniquement
    **Limite** : Maximum 10 000 tickets par export

    **Story 16.4** : ``X-Step-Up-Pin`` + ``Idempotency-Key`` obligatoires ; ``log_admin_access`` sur succès.
    """
)
def export_bulk_reception_tickets(
    request_body: BulkReceptionExportRequest,
    request: Request,
    current_user: User = Depends(require_role_strict([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    db: Session = Depends(get_db),
    redis_client=Depends(get_redis),
):
    """Exporte tous les tickets de réception filtrés en CSV ou Excel."""
    idem_key = _require_bulk_export_step_up_and_idempotency(
        request,
        current_user,
        redis_client,
        operation=SENSITIVE_OPERATION_REPORTS_RECEPTION_TICKETS_EXPORT_BULK,
    )
    logger.info(
        "bulk_export_reception_tickets_start user_id=%s idempotency_key_prefix=%s",
        current_user.id,
        idem_key[:12],
    )
    from recyclic_api.services.report_service import (
        generate_bulk_reception_tickets_csv,
        generate_bulk_reception_tickets_excel
    )
    
    # B50-P2: Logging amélioré pour faciliter le debug
    logger.debug(
        f"Export bulk réception demandé par {current_user.username} (ID: {current_user.id}). "
        f"Format: {request_body.format}, Filtres: date_from={request_body.filters.date_from}, "
        f"date_to={request_body.filters.date_to}, status={request_body.filters.status}, "
        f"benevole_id={request_body.filters.benevole_id}, include_empty={request_body.filters.include_empty}"
    )
    
    def _export_bulk():
        # Convertir benevole_id en UUID si fourni
        benevole_uuid = None
        if request_body.filters.benevole_id:
            try:
                benevole_uuid = UUID(request_body.filters.benevole_id)
            except ValueError:
                logger.warning(f"benevole_id invalide reçu: {request_body.filters.benevole_id}")
                raise HTTPException(status_code=400, detail="benevole_id invalide")
        
        # Générer l'export selon le format
        if request_body.format == "csv":
            buffer = generate_bulk_reception_tickets_csv(
                db,
                current_user,
                status=request_body.filters.status,
                date_from=request_body.filters.date_from,
                date_to=request_body.filters.date_to,
                benevole_id=benevole_uuid,
                search=request_body.filters.search,
                include_empty=request_body.filters.include_empty
            )
            media_type = "text/csv"
            extension = "csv"
        else:  # excel
            buffer = generate_bulk_reception_tickets_excel(
                db,
                current_user,
                status=request_body.filters.status,
                date_from=request_body.filters.date_from,
                date_to=request_body.filters.date_to,
                benevole_id=benevole_uuid,
                search=request_body.filters.search,
                include_empty=request_body.filters.include_empty
            )
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            extension = "xlsx"
        
        # Générer le nom de fichier
        date_str = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"export_tickets_reception_{date_str}.{extension}"
        
        return StreamingResponse(
            iter([buffer.getvalue()]),
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    
    # Utilisation du gestionnaire d'erreurs standardisé avec logging admin (B50-P3: Standardisation)
    return handle_export_errors_with_logging(
        _export_bulk,
        context=f"bulk tickets réception ({request_body.format})",
        user_id=str(current_user.id),
        username=current_user.username or "Unknown",
        endpoint="/admin/reports/reception-tickets/export-bulk",
        log_access_func=log_admin_access
    )

