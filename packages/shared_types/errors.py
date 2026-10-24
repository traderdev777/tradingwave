"""Standard error schemas and domain exceptions for TradingWave."""

from typing import Any

from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    """Detailed context for a field-level or condition-level failure."""

    field: str | None = None
    reason: str


class ErrorEnvelope(BaseModel):
    """Standardized API error envelope."""

    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable summary of the error")
    request_id: str = Field(..., description="Server-generated correlation UUID")
    details: list[ErrorDetail] = Field(
        default_factory=list,
        description="Sub-field or condition error details",
    )


class StandardErrorResponse(BaseModel):
    """Wrapper matching the global error response contract."""

    error: ErrorEnvelope


class TradingWaveError(Exception):
    """Base exception for all domain errors within TradingWave."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = 500,
        details: list[dict[str, Any]] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or []


# Alias for backward compatibility
TradingWaveException = TradingWaveError


class ComplianceGateError(TradingWaveError):
    """Raised when blocked by Indian market regulatory rules or missing approvals."""

    def __init__(self, message: str, details: list[dict[str, Any]] | None = None) -> None:
        super().__init__(
            message=message,
            code="COMPLIANCE_GATE_BLOCKED",
            status_code=403,
            details=details,
        )


class StrategyValidationError(TradingWaveError):
    """Raised when strategy logic, indicators, or parameters violate deterministic rules."""

    def __init__(self, message: str, details: list[dict[str, Any]] | None = None) -> None:
        super().__init__(
            message=message,
            code="STRATEGY_VALIDATION_FAILED",
            status_code=400,
            details=details,
        )


class TenantAccessDeniedError(TradingWaveError):
    """Raised when cross-workspace or unauthorized tenant resource access is attempted."""

    def __init__(
        self,
        message: str = "Access to the requested workspace resource is denied.",
    ) -> None:
        super().__init__(
            message=message,
            code="WORKSPACE_ACCESS_DENIED",
            status_code=403,
        )


class ResourceNotFoundError(TradingWaveError):
    """Raised when a requested resource does not exist in the tenant's workspace."""

    def __init__(self, resource_type: str, resource_id: str) -> None:
        super().__init__(
            message=f"{resource_type} with ID '{resource_id}' was not found.",
            code="RESOURCE_NOT_FOUND",
            status_code=404,
        )
