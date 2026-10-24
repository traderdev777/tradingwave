"""Shared types and domain exceptions for TradingWave."""

from packages.shared_types.errors import (
    ComplianceGateError,
    ErrorDetail,
    ErrorEnvelope,
    ResourceNotFoundError,
    StandardErrorResponse,
    StrategyValidationError,
    TenantAccessDeniedError,
    TradingWaveError,
    TradingWaveException,
)

__all__ = [
    "ComplianceGateError",
    "ErrorDetail",
    "ErrorEnvelope",
    "ResourceNotFoundError",
    "StandardErrorResponse",
    "StrategyValidationError",
    "TenantAccessDeniedError",
    "TradingWaveError",
    "TradingWaveException",
]
