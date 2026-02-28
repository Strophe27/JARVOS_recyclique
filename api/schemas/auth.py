# Schemas Pydantic — Auth (Story 3.1). Login, tokens, signup, forgot/reset, PIN.

from pydantic import BaseModel, Field
from pydantic import ConfigDict


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=128)
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserInToken(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    email: str
    role: str
    status: str
    first_name: str | None
    last_name: str | None


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserInToken
    permissions: list[str] = Field(default_factory=list)


class SessionResponse(BaseModel):
    authenticated: bool
    user: UserInToken | None = None
    permissions: list[str] = Field(default_factory=list)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., min_length=1)


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=1)


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)


class PinLoginRequest(BaseModel):
    pin: str = Field(..., min_length=4, max_length=8)


class SignupRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=128)
    email: str = Field(..., min_length=1)
    password: str = Field(..., min_length=8)
    first_name: str | None = Field(None, max_length=128)
    last_name: str | None = Field(None, max_length=128)
