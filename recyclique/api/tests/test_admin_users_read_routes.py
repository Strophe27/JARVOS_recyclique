"""Enregistrement des routes admin de lecture utilisateurs (micro-lot admin_users_read)."""

from fastapi import APIRouter
from slowapi import Limiter
from slowapi.util import get_remote_address

from recyclic_api.api.api_v1.endpoints.admin_users_read import register_admin_users_read_routes


def test_register_admin_users_read_routes_exposes_expected_paths():
    router = APIRouter()
    limiter = Limiter(key_func=get_remote_address)
    register_admin_users_read_routes(router, limiter)

    paths = {getattr(route, "path", None) for route in router.routes}
    assert "/users" in paths
    assert "/users/statuses" in paths
    assert "/users/pending" in paths
