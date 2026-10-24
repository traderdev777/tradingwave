"""Pydantic request and response schemas for authentication and workspaces."""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserRegisterRequest(BaseModel):
    """User account registration payload."""

    email: EmailStr
    password: str = Field(..., min_length=8, description="Minimum 8 characters")
    display_name: str = Field(..., min_length=2, max_length=100)
    workspace_name: str = Field(default="Personal Workspace", max_length=100)


class UserLoginRequest(BaseModel):
    """User login payload."""

    email: EmailStr
    password: str


class WorkspaceResponse(BaseModel):
    """Workspace representation."""

    id: uuid.UUID
    name: str
    plan_code: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UserResponse(BaseModel):
    """Public user profile."""

    id: uuid.UUID
    email: EmailStr
    display_name: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """JWT bearer token structure."""

    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int


class SessionResponse(BaseModel):
    """Full session response including user, active workspace, and token."""

    user: UserResponse
    active_workspace: WorkspaceResponse
    token: TokenResponse
    workspaces: list[WorkspaceResponse]


class WorkspaceCreateRequest(BaseModel):
    """Payload to create an additional tenant workspace."""

    name: str = Field(..., min_length=2, max_length=100)
    plan_code: str = Field(default="starter")


class DashboardSummaryResponse(BaseModel):
    """Real persisted statistics for the active workspace."""

    workspace_id: uuid.UUID
    workspace_name: str
    plan_code: str
    saved_strategies_count: int
    published_versions_count: int
    recent_backtests_count: int
    running_paper_sessions_count: int
    risk_limits: dict
    live_broker_connected: bool
    live_broker_message: str
