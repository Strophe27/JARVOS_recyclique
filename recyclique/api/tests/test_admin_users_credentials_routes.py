"""Enregistrement des routes admin credentials utilisateur (micro-lot admin_users_credentials)."""

from fastapi import APIRouter
from slowapi import Limiter
from slowapi.util import get_remote_address

from recyclic_api.api.api_v1.endpoints.admin_users_credentials import (
    register_admin_users_credentials_routes,
)


def test_register_admin_users_credentials_routes_exposes_expected_paths():
    router = APIRouter()
    limiter = Limiter(key_func=get_remote_address)
    register_admin_users_credentials_routes(router, limiter)

    paths_methods = {
        (getattr(route, "path", None), tuple(sorted(getattr(route, "methods", []) or [])))
        for route in router.routes
    }
    assert ("/users/{user_id}/reset-password", ("POST",)) in paths_methods
    assert ("/users/{user_id}/force-password", ("POST",)) in paths_methods
    assert ("/users/{user_id}/reset-pin", ("POST",)) in paths_methods
