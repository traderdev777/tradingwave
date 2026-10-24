"""Audit event ledger database model."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from services.api.database import Base
from services.api.models.types import GUID, JSONType


class AuditEvent(Base):
    """Immutable audit event log for regulatory compliance and dispute resolution."""

    __tablename__ = "audit_events"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID,
        primary_key=True,
        default=uuid.uuid4,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        GUID,
        nullable=False,
        index=True,
    )
    actor_user_id: Mapped[uuid.UUID] = mapped_column(
        GUID,
        nullable=False,
        index=True,
    )
    event_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    resource_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    resource_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID,
        nullable=True,
    )
    correlation_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    metadata_payload: Mapped[dict] = mapped_column(
        JSONType,
        default=dict,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )
