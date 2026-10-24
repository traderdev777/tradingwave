"""Strategy, Version, Backtest, and Paper Session database models."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from services.api.database import Base
from services.api.models.types import GUID, JSONType


class Strategy(Base):
    """Strategy container entity within a tenant workspace."""

    __tablename__ = "strategies"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID,
        primary_key=True,
        default=uuid.uuid4,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        GUID,
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        GUID,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default="draft",
        nullable=False,  # "draft", "published", "archived"
    )
    current_version_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    workspace = relationship("Workspace", back_populates="strategies")
    versions = relationship(
        "StrategyVersion",
        back_populates="strategy",
        cascade="all, delete-orphan",
    )


class StrategyVersion(Base):
    """Immutable published strategy version with canonical hash."""

    __tablename__ = "strategy_versions"
    __table_args__ = (
        UniqueConstraint("strategy_id", "version_number", name="uq_strategy_version_number"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        GUID,
        primary_key=True,
        default=uuid.uuid4,
    )
    strategy_id: Mapped[uuid.UUID] = mapped_column(
        GUID,
        ForeignKey("strategies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    specification: Mapped[dict] = mapped_column(
        JSONType,
        nullable=False,
    )
    specification_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
    )
    compiler_version: Mapped[str] = mapped_column(
        String(20),
        default="1.0.0",
        nullable=False,
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        GUID,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    strategy = relationship("Strategy", back_populates="versions")


class BacktestJob(Base):
    """Backtest job record for asynchronous simulation execution."""

    __tablename__ = "backtest_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID,
        primary_key=True,
        default=uuid.uuid4,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        GUID,
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    strategy_version_id: Mapped[uuid.UUID] = mapped_column(
        GUID,
        ForeignKey("strategy_versions.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default="QUEUED",
        nullable=False,  # "QUEUED", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )


class PaperSession(Base):
    """Simulated paper trading session."""

    __tablename__ = "paper_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID,
        primary_key=True,
        default=uuid.uuid4,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        GUID,
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    strategy_version_id: Mapped[uuid.UUID] = mapped_column(
        GUID,
        ForeignKey("strategy_versions.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default="RUNNING",
        nullable=False,  # "RUNNING", "STOPPED", "FAILED"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
