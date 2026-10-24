"""Create initial schema for users, workspaces, audit, strategies, and jobs.

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-10-24 16:00:00.000000

"""
from collections.abc import Sequence
from alembic import op
import sqlalchemy as sa
from services.api.models.types import GUID, JSONType

revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. users table
    op.create_table(
        "users",
        sa.Column("id", GUID(), primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=100), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="active", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # 2. workspaces table
    op.create_table(
        "workspaces",
        sa.Column("id", GUID(), primary_key=True, nullable=False),
        sa.Column("owner_user_id", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("plan_code", sa.String(length=30), server_default="starter", nullable=False),
        sa.Column("risk_limits", JSONType(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_workspaces_owner_user_id", "workspaces", ["owner_user_id"])

    # 3. workspace_members table
    op.create_table(
        "workspace_members",
        sa.Column("workspace_id", GUID(), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("role", sa.String(length=20), server_default="owner", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # 4. audit_events table
    op.create_table(
        "audit_events",
        sa.Column("id", GUID(), primary_key=True, nullable=False),
        sa.Column("workspace_id", GUID(), nullable=False),
        sa.Column("actor_user_id", GUID(), nullable=False),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("resource_type", sa.String(length=50), nullable=False),
        sa.Column("resource_id", GUID(), nullable=True),
        sa.Column("correlation_id", sa.String(length=100), nullable=False),
        sa.Column("metadata_payload", JSONType(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_audit_events_workspace_id", "audit_events", ["workspace_id"])
    op.create_index("ix_audit_events_correlation_id", "audit_events", ["correlation_id"])
    op.create_index("ix_audit_events_created_at", "audit_events", ["created_at"])

    # 5. strategies table
    op.create_table(
        "strategies",
        sa.Column("id", GUID(), primary_key=True, nullable=False),
        sa.Column("workspace_id", GUID(), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("owner_user_id", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="draft", nullable=False),
        sa.Column("current_version_id", GUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_strategies_workspace_id", "strategies", ["workspace_id"])

    # 6. strategy_versions table
    op.create_table(
        "strategy_versions",
        sa.Column("id", GUID(), primary_key=True, nullable=False),
        sa.Column("strategy_id", GUID(), sa.ForeignKey("strategies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("specification", JSONType(), nullable=False),
        sa.Column("specification_hash", sa.String(length=64), nullable=False),
        sa.Column("compiler_version", sa.String(length=20), server_default="1.0.0", nullable=False),
        sa.Column("created_by", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("strategy_id", "version_number", name="uq_strategy_version_number"),
    )
    op.create_index("ix_strategy_versions_strategy_id", "strategy_versions", ["strategy_id"])
    op.create_index("ix_strategy_versions_specification_hash", "strategy_versions", ["specification_hash"])

    # 7. backtest_jobs table
    op.create_table(
        "backtest_jobs",
        sa.Column("id", GUID(), primary_key=True, nullable=False),
        sa.Column("workspace_id", GUID(), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("strategy_version_id", GUID(), sa.ForeignKey("strategy_versions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="QUEUED", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_backtest_jobs_workspace_id", "backtest_jobs", ["workspace_id"])

    # 8. paper_sessions table
    op.create_table(
        "paper_sessions",
        sa.Column("id", GUID(), primary_key=True, nullable=False),
        sa.Column("workspace_id", GUID(), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("strategy_version_id", GUID(), sa.ForeignKey("strategy_versions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="RUNNING", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_paper_sessions_workspace_id", "paper_sessions", ["workspace_id"])


def downgrade() -> None:
    op.drop_table("paper_sessions")
    op.drop_table("backtest_jobs")
    op.drop_table("strategy_versions")
    op.drop_table("strategies")
    op.drop_table("audit_events")
    op.drop_table("workspace_members")
    op.drop_table("workspaces")
    op.drop_table("users")
