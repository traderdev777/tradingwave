"""Pydantic schemas for Strategy Library, folders, templates, and comparison."""

import uuid
from typing import Any
from pydantic import BaseModel, Field


class CreateStrategyRequest(BaseModel):
    """Payload to create a new strategy draft."""

    name: str = Field(..., min_length=2, max_length=150)
    description: str | None = None
    exchange: str = "NSE"
    symbol: str = "NIFTY50"
    timeframe: str = "15m"
    category: str = "ORB"
    trading_mode: str = "INTRADAY"
    folder_id: str | None = None
    tags: list[str] = Field(default_factory=list)
    source: str = "CUSTOM"  # "AI_STUDIO", "VISUAL_BUILDER", "TEMPLATE", "CUSTOM"
    spec: dict[str, Any] | None = None


class UpdateStrategyMetadataRequest(BaseModel):
    """Payload to update strategy metadata."""

    name: str | None = None
    description: str | None = None
    status: str | None = None
    folder_id: str | None = None
    tags: list[str] | None = None
    is_favorite: bool | None = None


class CreateFolderRequest(BaseModel):
    """Payload to create a strategy folder."""

    name: str = Field(..., min_length=1, max_length=100)
    color: str | None = "#FF7722"
    description: str | None = None


class UpdateFolderRequest(BaseModel):
    """Payload to update a strategy folder."""

    name: str | None = None
    color: str | None = None
    description: str | None = None


class CreateCollectionRequest(BaseModel):
    """Payload to create a strategy collection."""

    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    strategy_ids: list[str] = Field(default_factory=list)


class UpdateCollectionRequest(BaseModel):
    """Payload to update a strategy collection."""

    name: str | None = None
    description: str | None = None
    strategy_ids: list[str] | None = None


class CreateFromTemplateRequest(BaseModel):
    """Payload to instantiate a template into a workspace."""

    name: str | None = None
    exchange: str | None = None
    symbol: str | None = None
    capital_inr: float | None = None
    folder_id: str | None = None
    tags: list[str] | None = None
    open_in: str = "visual_builder"  # "visual_builder" or "ai_studio"


class CompareStrategiesRequest(BaseModel):
    """Payload to compare two strategies or two versions."""

    strategy_id_1: str
    version_id_1: str | None = None
    strategy_id_2: str
    version_id_2: str | None = None
