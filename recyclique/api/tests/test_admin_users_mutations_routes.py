"""Enregistrement des routes admin de mutations compte utilisateur (micro-lot admin_users_mutations)."""

from fastapi import APIRouter
from slowapi import Limiter
from slowapi.util import get_remote_address

from recyclic_api.api.api_v1.endpoints.admin_users_mutations import (
    register_admin_users_mutations_routes,
)


def test_register_admin_users_mutations_routes_exposes_expected_paths():
    router = APIRouter()
    limiter = Limiter(key_func=get_remote_address)
    register_admin_users_mutations_routes(router, limiter)

    paths_methods = {
        (getattr(route, "path", None), tuple(sorted(getattr(route, "methods", []) or [])))
        for route in router.routes
    }
    assert ("/users/{user_id}/role", ("PUT",)) in paths_methods
    assert ("/users/{user_id}/status", ("PUT",)) in paths_methods
    assert ("/users/{user_id}", ("PUT",)) in paths_methods
