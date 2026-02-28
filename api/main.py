# RecyClique API — FastAPI app (socle Epic 1 + sites Story 2.1).
# Story 4.2 : lifespan pour démarrer le worker push (même process).

import threading
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from api.core.modules.loader import load_modules_from_toml
from api.routers import auth_router, pos_router, reception_router, admin_router
from api.routers.v1 import v1_auth_router, v1_users_router, v1_reception_router
from api.routers.v1.admin import router as v1_admin_router
from api.routers.admin.health import router as health_router
from api.routers.sites import router as sites_router
from api.routers.cash_registers import router as cash_registers_router
from api.routers.cash_sessions import router as cash_sessions_router
from api.routers.categories import router as categories_router
from api.routers.presets import router as presets_router
from api.routers.sales import router as sales_router
from api.routers.mapping import router as mapping_router
from api.routers.declarative import router as declarative_router
from api.workers.push_consumer import run_push_consumer, set_shutdown_event
from api.workers.member_sync_worker import run_member_sync_worker, set_member_sync_shutdown_event


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Démarre le worker push en arrière-plan ; arrêt propre au shutdown."""
    shutdown = threading.Event()
    set_shutdown_event(shutdown)
    set_member_sync_shutdown_event(shutdown)
    thread = threading.Thread(target=run_push_consumer, daemon=True)
    member_sync_thread = threading.Thread(target=run_member_sync_worker, daemon=True)
    thread.start()
    member_sync_thread.start()
    yield
    shutdown.set()
    thread.join(timeout=10)
    member_sync_thread.join(timeout=10)


app = FastAPI(title="RecyClique API", lifespan=lifespan)

# Chargement des modules (TOML, ModuleBase) — Story 1.4
load_modules_from_toml(app)

# Health à la racine (GET /health)
app.include_router(health_router)

# Routers métier sous /api
app.include_router(auth_router, prefix="/api/auth")
app.include_router(pos_router, prefix="/api/pos")
app.include_router(reception_router, prefix="/api/reception")
app.include_router(admin_router, prefix="/api/admin")

# API v1 : auth (login, refresh, logout, signup, forgot/reset password, pin)
app.include_router(v1_auth_router, prefix="/v1/auth")
# API v1 : users (me, me/password, me/pin, me/permissions)
app.include_router(v1_users_router, prefix="/v1")
# API v1 : reception (postes/open) — Story 3.4
app.include_router(v1_reception_router, prefix="/v1")
# API v1 : admin (groupes, permissions)
app.include_router(v1_admin_router, prefix="/v1")
# API v1 : sites CRUD (GET/POST/PATCH/DELETE /v1/sites)
app.include_router(sites_router, prefix="/v1")
# API v1 : postes de caisse CRUD + GET /status (Story 2.2)
app.include_router(cash_registers_router, prefix="/v1")
# API v1 : sessions de caisse ouverture/fermeture/lecture (Story 5.1)
app.include_router(cash_sessions_router, prefix="/v1")
# API v1 : categories CRUD, hierarchy, visibilité, ordre, soft delete (Story 2.3)
app.include_router(categories_router, prefix="/v1")
# API v1 : presets CRUD + GET /active (Story 2.4)
app.include_router(presets_router, prefix="/v1")
# API v1 : sales POST/GET/PUT/PATCH (Story 5.2)
app.include_router(sales_router, prefix="/v1")
# API v1 : agrégats déclaratifs read-only (Story 9.1)
app.include_router(declarative_router, prefix="/v1")
# API v1 : export décla (Story 9.2 post-MVP) — si module decla activé (évite double lecture TOML)
from api.core.modules.loader import get_enabled_modules
if "decla" in get_enabled_modules():
    from api.routers.declarative_export import router as decla_export_router
    app.include_router(decla_export_router, prefix="/v1")
# API mapping RecyClique -> Paheko (Story 7.1) : GET/POST/PATCH /api/mapping/*
app.include_router(mapping_router, prefix="/api/mapping")
dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if dist.exists() and (dist / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def catch_all_spa(full_path: str):
        """Catch-all pour SPA : racine (/) ou chemin non-API renvoie index.html."""
        is_spa_path = (
            not full_path
            or full_path == "/"
            or not full_path.startswith(("api/", "v1/", "health", "docs", "openapi", "assets"))
        )
        if is_spa_path:
            return FileResponse(dist / "index.html")
        return JSONResponse({"detail": "Not Found", "message": "Path not found"}, status_code=404)
else:
    @app.get("/{full_path:path}")
    def catch_all_no_dist(full_path: str):
        """Build frontend absent : JSON explicite."""
        return JSONResponse(
            {"message": "Frontend build not found", "detail": "Run npm run build in frontend/"},
            status_code=200,
        )
