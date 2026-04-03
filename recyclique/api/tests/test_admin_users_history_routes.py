"""Enregistrement des routes admin d'historique utilisateur (micro-lot admin_users_history)."""

from fastapi import APIRouter
from slowapi import Limiter
from slowapi.util import get_remote_address

from recyclic_api.api.api_v1.endpoints.admin_users_history import register_admin_users_history_routes


def test_register_admin_users_history_routes_exposes_expected_paths():
    router = APIRouter()
    limiter = Limiter(key_func=get_remote_address)
    register_admin_users_history_routes(router, limiter)

    paths = {getattr(route, "path", None) for route in router.routes}
    assert "/users/{user_id}/history" in paths
