from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


PAHEKO_IAM_CONTRACT_VERSION = "2026-02-28"


class PahekoIamErrorEnvelope(BaseModel):
    code: str
    message: str


class PahekoIamPluginResponse(BaseModel):
    data: dict | list
    request_id: str
    contract_version: str = PAHEKO_IAM_CONTRACT_VERSION


class PahekoIamContractResponse(BaseModel):
    contract_version: str = PAHEKO_IAM_CONTRACT_VERSION
    payload_format: str = "snake_case_json"
    idempotency: dict[str, str]
    error_codes: list[str]
    endpoints: list[str]


class PahekoIamTenantRequest(BaseModel):
    tenant: str = Field(..., min_length=1, max_length=128)
    exception_id: UUID | None = None


class PahekoIamMutateRequest(PahekoIamTenantRequest):
    reason: str | None = Field(default=None, max_length=512)
    idempotency_key: str | None = Field(default=None, min_length=8, max_length=128)


class PahekoIamGrantGroupRequest(PahekoIamMutateRequest):
    user_id: UUID
    group_code: str = Field(..., min_length=1, max_length=128)


class PahekoIamGrantPermissionRequest(PahekoIamMutateRequest):
    group_code: str = Field(..., min_length=1, max_length=128)
    permission_code: str = Field(..., min_length=1, max_length=128)


class PahekoIamExceptionRequest(PahekoIamMutateRequest):
    user_id: UUID
    scope: str = Field(..., min_length=1, max_length=128)
    expires_at: datetime


class PahekoIamExceptionRevokeRequest(PahekoIamMutateRequest):
    exception_id: UUID
