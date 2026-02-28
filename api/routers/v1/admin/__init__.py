# RecyClique API — Router admin v1 (Story 3.2, 3.4).
# GET/POST/PUT/DELETE /v1/admin/groups, /v1/admin/permissions, cash-registers/start.
# Story 7.2 : /v1/admin/mapping (payment_methods, categories, locations) avec audit.
# Story 8.4 : /v1/admin/health, audit-log, settings, email-logs.
# Préfixe monté : /v1 (routes sous /admin).

from fastapi import APIRouter

from api.routers.v1.admin.groups import router as groups_router
from api.routers.v1.admin.permissions import router as permissions_router
from api.routers.v1.admin.cash_registers_start import router as cash_registers_start_router
from api.routers.v1.admin.mapping import router as mapping_router
from api.routers.v1.admin.users import router as admin_users_router
from api.routers.v1.admin.reports import router as reports_router
from api.routers.v1.admin.reports_reception import router as reports_reception_router
from api.routers.v1.admin.health import router as health_router
from api.routers.v1.admin.audit_log import router as audit_log_router
from api.routers.v1.admin.settings import router as settings_router
from api.routers.v1.admin.email_logs import router as email_logs_router
from api.routers.v1.admin.db import router as db_router
from api.routers.v1.admin.import_legacy import router as import_legacy_router
from api.routers.v1.admin.paheko_compta import router as paheko_compta_router
from api.routers.v1.admin.member_sync import router as member_sync_router
from api.routers.v1.admin.paheko_iam import router as paheko_iam_router

router = APIRouter(prefix="/admin", tags=["admin"])

router.include_router(groups_router, prefix="/groups", tags=["admin-groups"])
router.include_router(permissions_router, prefix="/permissions", tags=["admin-permissions"])
router.include_router(cash_registers_start_router, prefix="/cash-registers", tags=["admin-cash-registers"])
router.include_router(mapping_router, prefix="/mapping", tags=["admin-mapping"])
router.include_router(admin_users_router, prefix="/users", tags=["admin-users"])
router.include_router(reports_router)
router.include_router(reports_reception_router)
router.include_router(health_router)
router.include_router(audit_log_router)
router.include_router(settings_router)
router.include_router(email_logs_router)
router.include_router(db_router)
router.include_router(import_legacy_router)
router.include_router(paheko_compta_router)
router.include_router(member_sync_router)
router.include_router(paheko_iam_router)
