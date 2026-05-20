"""Service configuration module par site."""

from __future__ import annotations

import uuid
from typing import Any, Union

from sqlalchemy.orm import Session

from recyclic_api.core.auth import CachedUser
from recyclic_api.core.exceptions import AuthorizationError, ConflictError, NotFoundError, ValidationError
from recyclic_api.models.site import Site
from recyclic_api.models.site_module_config import SiteModuleConfig
from recyclic_api.models.user import User, UserRole
from recyclic_api.modules.module_config.registry import (
    SCHEMA_VERSION_KPI_LIVE_BANNER_V1,
    get_registry_entry,
    is_active_module_key,
)
from recyclic_api.modules.module_config.validation import (
    parse_if_match,
    validate_payload,
)
from recyclic_api.schemas.module_config import ModuleConfigDocument

KPI_LIVE_BANNER_DEFAULT_PAYLOAD: dict[str, Any] = {
    "show_on_caisse": True,
    "show_on_reception": True,
    "refresh_interval_seconds": 60,
}


class ModuleConfigService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _resolve_user(self, current_user: Union[User, CachedUser]) -> User:
        user = self.db.get(User, current_user.id)
        if user is None:
            raise NotFoundError("Utilisateur introuvable")
        return user

    def assert_site_access(
        self,
        *,
        site_id: uuid.UUID,
        current_user: Union[User, CachedUser],
    ) -> Site:
        site = self.db.get(Site, site_id)
        if site is None:
            raise NotFoundError("Site introuvable")

        user = self._resolve_user(current_user)
        if user.role == UserRole.SUPER_ADMIN:
            return site
        if user.role != UserRole.ADMIN:
            raise AuthorizationError("Accès refusé pour ce site.")
        if user.site_id is None:
            raise ValidationError("Aucun site affecté — accès module-config impossible.")
        if user.site_id != site_id:
            raise AuthorizationError("Accès refusé pour ce site.")
        return site

    @staticmethod
    def assert_module_key(module_key: str) -> None:
        if not is_active_module_key(module_key):
            raise NotFoundError("Module inconnu")

    def default_document(self, module_key: str) -> tuple[ModuleConfigDocument, int]:
        entry = get_registry_entry(module_key)
        if entry is None:
            raise NotFoundError("Module inconnu")
        if module_key == entry.module_key:
            payload = dict(KPI_LIVE_BANNER_DEFAULT_PAYLOAD)
            return (
                ModuleConfigDocument(
                    schema_version=SCHEMA_VERSION_KPI_LIVE_BANNER_V1,
                    payload=payload,
                    version=0,
                ),
                0,
            )
        raise NotFoundError("Module inconnu")

    def get_site_module_config(
        self,
        *,
        site_id: uuid.UUID,
        module_key: str,
        current_user: Union[User, CachedUser],
    ) -> tuple[ModuleConfigDocument, int]:
        self.assert_module_key(module_key)
        self.assert_site_access(site_id=site_id, current_user=current_user)

        row = (
            self.db.query(SiteModuleConfig)
            .filter(
                SiteModuleConfig.site_id == site_id,
                SiteModuleConfig.module_key == module_key,
            )
            .one_or_none()
        )
        if row is None:
            return self.default_document(module_key)

        doc = ModuleConfigDocument(
            schema_version=row.schema_version,
            payload=dict(row.payload) if isinstance(row.payload, dict) else {},
            version=row.version,
        )
        return doc, int(row.version)

    def patch_site_module_config(
        self,
        *,
        site_id: uuid.UUID,
        module_key: str,
        body: ModuleConfigDocument,
        if_match: str | None,
        current_user: Union[User, CachedUser],
    ) -> tuple[ModuleConfigDocument, int]:
        self.assert_module_key(module_key)
        entry = get_registry_entry(module_key)
        if entry is None:
            raise NotFoundError("Module inconnu")

        self.assert_site_access(site_id=site_id, current_user=current_user)

        if body.schema_version != entry.schema_version:
            raise ValidationError(
                f"schema_version non supportée pour {module_key!r}: {body.schema_version!r}"
            )

        validate_payload(entry.schema_relative_path, body.payload)

        row = (
            self.db.query(SiteModuleConfig)
            .filter(
                SiteModuleConfig.site_id == site_id,
                SiteModuleConfig.module_key == module_key,
            )
            .one_or_none()
        )

        current_version = int(row.version) if row is not None else 0
        expected = parse_if_match(if_match)
        if expected is not None and expected != current_version:
            raise ConflictError(
                "Conflit de version : le document a été modifié entre-temps (If-Match)."
            )
        # If-Match absent → dernière écriture gagnante (pas de 428).

        next_version = current_version + 1
        if row is None:
            row = SiteModuleConfig(
                site_id=site_id,
                module_key=module_key,
                schema_version=body.schema_version,
                payload=body.payload,
                version=next_version,
            )
            self.db.add(row)
        else:
            row.schema_version = body.schema_version
            row.payload = body.payload
            row.version = next_version
            self.db.add(row)

        self.db.commit()
        self.db.refresh(row)

        doc = ModuleConfigDocument(
            schema_version=row.schema_version,
            payload=dict(row.payload) if isinstance(row.payload, dict) else {},
            version=row.version,
        )
        return doc, int(row.version)
