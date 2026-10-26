"""Add StrategyFolder, StrategyCollection, and enrich Strategy, StrategyVersion, BacktestJob.

Revision ID: 0002_strategy_library_enhancements
Revises: 0001_initial_schema
Create Date: 2026-10-25 12:00:00.000000

"""
from collections.abc import Sequence
from alembic import op
import sqlalchemy as sa
from services.api.models.types import GUID, JSONType

revision: str = "0002_strategy_library_enhancements"
down_revision: str | None = "0001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. strategy_folders table
    op.create_table(
        "strategy_folders",
        sa.Column("id", GUID(), primary_key=True, nullable=False),
        sa.Column("workspace_id", GUID(), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("color", sa.String(length=30), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_by", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_strategy_folders_workspace_id", "strategy_folders", ["workspace_id"])

    # 2. strategy_collections table
    op.create_table(
        "strategy_collections",
        sa.Column("id", GUID(), primary_key=True, nullable=False),
        sa.Column("workspace_id", GUID(), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("strategy_ids", JSONType(), nullable=False),
        sa.Column("created_by", GUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_strategy_collections_workspace_id", "strategy_collections", ["workspace_id"])

    # 3. Alter strategies table
    with op.batch_alter_table("strategies") as batch_op:
        batch_op.add_column(sa.Column("folder_id", GUID(), nullable=True))
        batch_op.add_column(sa.Column("is_favorite", sa.Boolean(), server_default=sa.text("0"), nullable=False))
        batch_op.add_column(sa.Column("tags", JSONType(), server_default=sa.text("'[]'"), nullable=False))
        batch_op.add_column(sa.Column("source", sa.String(length=50), server_default="CUSTOM", nullable=False))
        batch_op.create_foreign_key("fk_strategies_folder_id", "strategy_folders", ["folder_id"], ["id"], ondelete="SET NULL")
        batch_op.create_index("ix_strategies_folder_id", ["folder_id"])
        batch_op.create_index("ix_strategies_is_favorite", ["is_favorite"])

    # 4. Alter strategy_versions table
    with op.batch_alter_table("strategy_versions") as batch_op:
        batch_op.add_column(sa.Column("change_summary", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("validation_report", JSONType(), nullable=True))

    # 5. Alter backtest_jobs table
    with op.batch_alter_table("backtest_jobs") as batch_op:
        batch_op.add_column(sa.Column("configuration", JSONType(), nullable=True))
        batch_op.add_column(sa.Column("metrics", JSONType(), nullable=True))
        batch_op.add_column(sa.Column("error_message", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("backtest_jobs") as batch_op:
        batch_op.drop_column("completed_at")
        batch_op.drop_column("error_message")
        batch_op.drop_column("metrics")
        batch_op.drop_column("configuration")

    with op.batch_alter_table("strategy_versions") as batch_op:
        batch_op.drop_column("validation_report")
        batch_op.drop_column("change_summary")

    with op.batch_alter_table("strategies") as batch_op:
        batch_op.drop_index("ix_strategies_is_favorite")
        batch_op.drop_index("ix_strategies_folder_id")
        batch_op.drop_constraint("fk_strategies_folder_id", type_="foreignkey")
        batch_op.drop_column("source")
        batch_op.drop_column("tags")
        batch_op.drop_column("is_favorite")
        batch_op.drop_column("folder_id")

    op.drop_table("strategy_collections")
    op.drop_table("strategy_folders")
