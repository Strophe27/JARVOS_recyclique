"""Middleware : propage X-Request-Id (corrélation audit / support)."""

from __future__ import annotations

import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class RequestCorrelationMiddleware(BaseHTTPMiddleware):
    """Réutilise ``X-Request-Id`` client ou génère un UUID ; renvoie l'en-tête sur la réponse."""

    header_name = "X-Request-Id"

    async def dispatch(self, request: Request, call_next):
        incoming = request.headers.get(self.header_name)
        rid = incoming.strip() if incoming and incoming.strip() else str(uuid.uuid4())
        request.state.request_id = rid
        response: Response = await call_next(request)
        response.headers[self.header_name] = rid
        return response
