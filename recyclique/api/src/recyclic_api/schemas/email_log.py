"""
Schemas for email log management.
"""
from datetime import datetime
from typing import List
from pydantic import BaseModel, Field
from uuid import UUID

from recyclic_api.models.email_log import EmailStatus, EmailType


class EmailLogBase(BaseModel):
    """Base schema for email log."""
    recipient_email: str = Field(..., description="Recipient email address")
    recipient_name: str | None = Field(None, description="Recipient name")
    subject: str = Field(..., description="Email subject")
    body_text: str | None = Field(None, description="Plain text body")
    body_html: str | None = Field(None, description="HTML body")
    email_type: EmailType = Field(..., description="Type of email")
    status: EmailStatus = Field(..., description="Current status of the email")
    external_id: str | None = Field(None, description="External service ID")
    error_message: str | None = Field(None, description="Error message if failed")
    sent_at: datetime | None = Field(None, description="When email was sent")
    delivered_at: datetime | None = Field(None, description="When email was delivered")
    opened_at: datetime | None = Field(None, description="When email was opened")
    clicked_at: datetime | None = Field(None, description="When email was clicked")
    bounced_at: datetime | None = Field(None, description="When email bounced")
    created_at: datetime = Field(..., description="When log was created")
    updated_at: datetime = Field(..., description="When log was last updated")
    user_id: UUID | None = Field(None, description="Associated user ID")
    additional_data: str | None = Field(None, description="Additional metadata")


class EmailLogResponse(EmailLogBase):
    """Response schema for email log."""
    id: UUID = Field(..., description="Email log ID")
    
    class Config:
        from_attributes = True


class EmailLogListResponse(BaseModel):
    """Response schema for email log list with pagination."""
    email_logs: List[EmailLogResponse] = Field(..., description="List of email logs")
    total: int = Field(..., description="Total number of email logs")
    page: int = Field(..., description="Current page number")
    per_page: int = Field(..., description="Number of items per page")
    total_pages: int = Field(..., description="Total number of pages")


class EmailLogFilters(BaseModel):
    """Filters for email log queries."""
    recipient_email: str | None = Field(None, description="Filter by recipient email")
    status: EmailStatus | None = Field(None, description="Filter by status")
    email_type: EmailType | None = Field(None, description="Filter by email type")
    user_id: UUID | None = Field(None, description="Filter by user ID")
    page: int = Field(1, ge=1, description="Page number")
    per_page: int = Field(50, ge=1, le=100, description="Items per page")


