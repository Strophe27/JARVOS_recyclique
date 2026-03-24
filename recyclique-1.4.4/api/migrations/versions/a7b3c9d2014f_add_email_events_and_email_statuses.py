"""add_email_events_and_email_statuses

Lot 1C / QA: tables alignées sur models/email_event.py (EmailEvent, EmailStatusModel).

Revision ID: a7b3c9d2014f
Revises: b52_p1_payments
Create Date: 2026-03-23

"""
from alembic import op
import sqlalchemy as sa


revision = "a7b3c9d2014f"
down_revision = "b52_p1_payments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "email_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email_address", sa.String(length=255), nullable=False),
        sa.Column("message_id", sa.String(length=255), nullable=True),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("event_timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "webhook_timestamp",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("error_code", sa.String(length=50), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("webhook_data", sa.Text(), nullable=True),
        sa.Column(
            "processed",
            sa.String(length=10),
            server_default=sa.text("'pending'"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_email_events_email_address"),
        "email_events",
        ["email_address"],
        unique=False,
    )
    op.create_index(
        op.f("ix_email_events_event_type"),
        "email_events",
        ["event_type"],
        unique=False,
    )
    op.create_index(
        op.f("ix_email_events_message_id"),
        "email_events",
        ["message_id"],
        unique=False,
    )

    op.create_table(
        "email_statuses",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email_address", sa.String(length=255), nullable=False),
        sa.Column("message_id", sa.String(length=255), nullable=True),
        sa.Column(
            "current_status",
            sa.String(length=50),
            server_default=sa.text("'sent'"),
            nullable=False,
        ),
        sa.Column(
            "last_updated",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("sent_timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("subject", sa.String(length=255), nullable=True),
        sa.Column(
            "provider",
            sa.String(length=50),
            server_default=sa.text("'brevo'"),
            nullable=False,
        ),
        sa.Column("bounced_reason", sa.Text(), nullable=True),
        sa.Column("error_details", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_email_statuses_current_status"),
        "email_statuses",
        ["current_status"],
        unique=False,
    )
    op.create_index(
        op.f("ix_email_statuses_email_address"),
        "email_statuses",
        ["email_address"],
        unique=False,
    )
    op.create_index(
        op.f("ix_email_statuses_message_id"),
        "email_statuses",
        ["message_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_email_statuses_message_id"), table_name="email_statuses")
    op.drop_index(op.f("ix_email_statuses_email_address"), table_name="email_statuses")
    op.drop_index(op.f("ix_email_statuses_current_status"), table_name="email_statuses")
    op.drop_table("email_statuses")

    op.drop_index(op.f("ix_email_events_message_id"), table_name="email_events")
    op.drop_index(op.f("ix_email_events_event_type"), table_name="email_events")
    op.drop_index(op.f("ix_email_events_email_address"), table_name="email_events")
    op.drop_table("email_events")
