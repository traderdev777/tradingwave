"""Security tests verifying error sanitization and standard error envelope adherence."""

from fastapi import APIRouter
from fastapi.testclient import TestClient

from packages.shared_types.errors import (
    ComplianceGateError,
    ResourceNotFoundError,
    StrategyValidationError,
    TenantAccessDeniedError,
)
from services.api.main import app

# Temporary test router to trigger specific error scenarios
error_test_router = APIRouter(prefix="/test-errors")


@error_test_router.get("/compliance-blocked")
def raise_compliance_error():
    raise ComplianceGateError(
        "Live broker execution blocked: exchange algo registration reference missing.",
        details=[{"field": "deployment_approvals", "reason": "No approved record found."}],
    )


@error_test_router.get("/strategy-validation-failed")
def raise_strategy_validation_error():
    raise StrategyValidationError(
        "Invalid strategy graph detected.",
        details=[{"field": "nodes[2]", "reason": "Indicator EMA period must be > 0."}],
    )


@error_test_router.get("/tenant-access-denied")
def raise_tenant_error():
    raise TenantAccessDeniedError("Cross-workspace resource access is prohibited.")


@error_test_router.get("/resource-not-found")
def raise_not_found_error():
    raise ResourceNotFoundError("Strategy", "uuid-1234")


@error_test_router.get("/unhandled-server-error")
def raise_unhandled_error():
    raise RuntimeError(
        "Unexpected internal crash with sensitive database connection string db://secret:pass@internal:5432"
    )


app.include_router(error_test_router)


def test_compliance_gate_error_envelope(client: TestClient):
    """Verify that ComplianceGateError produces HTTP 403 and standard structured error."""
    response = client.get("/test-errors/compliance-blocked")
    assert response.status_code == 403

    payload = response.json()
    assert "error" in payload
    error = payload["error"]
    assert error["code"] == "COMPLIANCE_GATE_BLOCKED"
    assert "Live broker execution blocked" in error["message"]
    assert len(error["details"]) == 1
    assert error["details"][0]["field"] == "deployment_approvals"
    assert "request_id" in error


def test_strategy_validation_error_envelope(client: TestClient):
    """Verify that StrategyValidationError produces HTTP 400 with details."""
    response = client.get("/test-errors/strategy-validation-failed")
    assert response.status_code == 400

    payload = response.json()
    assert "error" in payload
    error = payload["error"]
    assert error["code"] == "STRATEGY_VALIDATION_FAILED"
    assert len(error["details"]) == 1


def test_tenant_access_denied_envelope(client: TestClient):
    """Verify that TenantAccessDeniedError produces HTTP 403 WORKSPACE_ACCESS_DENIED."""
    response = client.get("/test-errors/tenant-access-denied")
    assert response.status_code == 403

    payload = response.json()
    assert payload["error"]["code"] == "WORKSPACE_ACCESS_DENIED"


def test_resource_not_found_envelope(client: TestClient):
    """Verify that ResourceNotFoundError produces HTTP 404 RESOURCE_NOT_FOUND."""
    response = client.get("/test-errors/resource-not-found")
    assert response.status_code == 404

    payload = response.json()
    assert payload["error"]["code"] == "RESOURCE_NOT_FOUND"


def test_unhandled_error_does_not_leak_stack_trace_or_credentials():
    """Verify that unhandled exceptions do not leak stack traces or internal secrets."""
    no_raise_client = TestClient(app, raise_server_exceptions=False)
    response = no_raise_client.get("/test-errors/unhandled-server-error")
    assert response.status_code == 500

    payload = response.json()
    assert "error" in payload
    error = payload["error"]
    assert error["code"] == "INTERNAL_SERVER_ERROR"
    # Ensure sensitive crash string is scrubbed
    assert "db://secret:pass" not in error["message"]
    assert "Traceback" not in str(payload)
