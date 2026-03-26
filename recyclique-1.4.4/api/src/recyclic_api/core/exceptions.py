"""
Custom exceptions for the Recyclic API
"""


class RecyclicException(Exception):
    """Base exception for Recyclic API"""
    pass

class NotFoundError(RecyclicException):
    """Raised when a resource is not found"""
    pass

class ValidationError(RecyclicException):
    """Raised when validation fails"""
    pass

class AuthenticationError(RecyclicException):
    """Raised when authentication fails"""
    pass

class AuthorizationError(RecyclicException):
    """Raised when authorization fails"""
    pass

class DatabaseError(RecyclicException):
    """Raised when database operations fail"""
    pass


class ConflictError(RecyclicException):
    """Raised when current state blocks the operation (dependencies, business rules)."""

    def __init__(self, detail: str | dict) -> None:
        self.detail = detail
        if isinstance(detail, str):
            super().__init__(detail)
        else:
            super().__init__(detail.get("detail", str(detail)))


class TelegramLinkDisabledError(RecyclicException):
    """La liaison de compte Telegram n'est plus proposée (flux retiré)."""

    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)
