"""GET/PATCH configuration module par site (T-MOD-3)."""

from __future__ import annotations

import uuid
from typing import Optional, Union

from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from sqlalchemy.orm import Session

from recyclic_api.core.auth import CachedUser, get_current_user_strict
from recyclic_api.core.database import get_db
from recyclic_api.core.exceptions import (
    AuthorizationError,
    ConflictError,
    NotFoundError,
    ValidationError,
)
from recyclic_api.models.user import User, UserRole
from recyclic_api.modules.module_config.service import ModuleConfigService
from recyclic_api.modules.module_config.validation import format_etag
from recyclic_api.schemas.module_config import ModuleConfigDocument

router = APIRouter()


def _parse_site_id(site_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(site_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site introuvable") from exc


def _require_admin_subject(current_user: Union[User, CachedUser]) -> None:
    if current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès refusé — rôle administrateur requis.",
        )


@router.get(
    "/{site_id}/module-config/{module_key}",
    response_model=ModuleConfigDocument,
    summary="Lire la configuration d'un module pour un site",
    openapi_extra={"operationId": "recyclique_moduleConfig_getSiteModuleConfig"},
    responses={
        401: {"description": "Non authentifié"},
        403: {"description": "Interdit pour ce site ou ce rôle"},
        404: {"description": "Site ou module inconnu"},
    },
)
def get_site_module_config(
    site_id: str,
    module_key: str,
    response: Response,
    db: Session = Depends(get_db),
    current_user: Union[User, CachedUser] = Depends(get_current_user_strict),
) -> ModuleConfigDocument:
    _require_admin_subject(current_user)
    svc = ModuleConfigService(db)
    try:
        doc, etag_version = svc.get_site_module_config(
            site_id=_parse_site_id(site_id),
            module_key=module_key,
            current_user=current_user,
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except AuthorizationError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    response.headers["ETag"] = format_etag(etag_version)
    return doc


@router.patch(
    "/{site_id}/module-config/{module_key}",
    response_model=ModuleConfigDocument,
    summary="Mettre à jour la configuration d'un module pour un site",
    openapi_extra={"operationId": "recyclique_moduleConfig_patchSiteModuleConfig"},
    responses={
        401: {"description": "Non authentifié"},
        403: {"description": "Interdit pour ce site ou ce rôle"},
        404: {"description": "Site ou module inconnu"},
        409: {"description": "Conflit If-Match"},
        422: {"description": "Corps invalide ou hors schéma"},
    },
)
def patch_site_module_config(
    site_id: str,
    module_key: str,
    body: ModuleConfigDocument,
    response: Response,
    db: Session = Depends(get_db),
    current_user: Union[User, CachedUser] = Depends(get_current_user_strict),
    if_match: Optional[str] = Header(default=None, alias="If-Match"),
) -> ModuleConfigDocument:
    _require_admin_subject(current_user)
    svc = ModuleConfigService(db)
    try:
        doc, etag_version = svc.patch_site_module_config(
            site_id=_parse_site_id(site_id),
            module_key=module_key,
            body=body,
            if_match=if_match,
            current_user=current_user,
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except AuthorizationError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.detail) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    response.headers["ETag"] = format_etag(etag_version)
    return doc
