"""Workspace and membership database models."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from services.api.database import Base
from services.api.models.types import GUID, JSONType


class Workspace(Base):
    """Tenant workspace entity."""

    __tablename__ = "workspaces"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID,
        primary_key=True,
        default=uuid.uuid4,
    )
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        GUID,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    plan_code: Mapped[str] = mapped_column(
        String(30),
        default="starter",
        nullable=False,
    )
    risk_limits: Mapped[dict] = mapped_column(
        JSONType,
        default=lambda: {
            "max_open_positions": 3,
            "max_exposure_inr": 200000.0,
            "daily_loss_limit_inr": 10000.0,
            "max_drawdown_percent": 15.0,
        },
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    owner = relationship("User", back_populates="owned_workspaces", foreign_keys=[owner_user_id])
    members = relationship(
        "WorkspaceMember",
        back_populates="workspace",
        cascade="all, delete-orphan",
    )
    strategies = relationship(
        "Strategy",
        back_populates="workspace",
        cascade="all, delete-orphan",
    )


class WorkspaceMember(Base):
    """User membership and role within a workspace."""

    __tablename__ = "workspace_members"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        GUID,
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    role: Mapped[str] = mapped_column(
        String(20),
        default="owner",
        nullable=False,  # "owner", "admin", "member", "viewer"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    workspace = relationship("Workspace", back_populates="members")
    user = relationship("User", back_populates="workspace_memberships")
