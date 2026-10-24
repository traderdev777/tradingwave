"""Integration tests for the system health and readiness API endpoints."""

from fastapi.testclient import TestClient


def test_health_liveness(client: TestClient):
    """Test that the liveness endpoint responds with healthy status and metadata."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200

    payload = response.json()
    assert "data" in payload
    assert "meta" in payload
    assert payload["data"]["status"] == "healthy"
    assert "X-Correlation-ID" in response.headers
    assert payload["meta"]["request_id"] == response.headers["X-Correlation-ID"]


def test_health_readiness(client: TestClient):
    """Test that readiness checks reflect strict compliance and safety defaults."""
    response = client.get("/api/v1/health/ready")
    assert response.status_code == 200

    payload = response.json()
    data = payload["data"]
    assert data["status"] == "ready"
    assert data["live_trading_enabled"] is False, "Live trading must be reported disabled"
    assert data["sebi_gate_active"] is True, "SEBI gate must be reported active"
    assert "emergency_kill_switch_active" in data


def test_correlation_id_propagation(client: TestClient):
    """Test that client-supplied X-Correlation-ID is preserved in headers and meta."""
    custom_cid = "test-correlation-uuid-9999"
    response = client.get("/api/v1/health", headers={"X-Correlation-ID": custom_cid})
    assert response.status_code == 200

    assert response.headers["X-Correlation-ID"] == custom_cid
    payload = response.json()
    assert payload["meta"]["request_id"] == custom_cid
