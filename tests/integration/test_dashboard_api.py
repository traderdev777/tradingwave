"""Integration tests for the real persisted dashboard summary."""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from services.api.models.strategy import Strategy


def test_dashboard_summary_reflects_persisted_data(client: TestClient, db_session: Session):
    """Verify dashboard metrics are derived strictly from real persisted database records."""
    # 1. Register a user
    reg_payload = {
        "email": "dashboard_test@tradingwave.in",
        "password": "Password123#",
        "display_name": "Dashboard Tester",
        "workspace_name": "Quant Workspace",
    }
    reg_resp = client.post("/api/v1/auth/register", json=reg_payload)
    token = reg_resp.json()["data"]["token"]["access_token"]
    ws_id = reg_resp.json()["data"]["active_workspace"]["id"]
    user_id = reg_resp.json()["data"]["user"]["id"]

    # 2. Check initial empty state
    summary_resp = client.get(
        f"/api/v1/workspaces/{ws_id}/dashboard-summary",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert summary_resp.status_code == 200
    summary = summary_resp.json()["data"]

    assert summary["saved_strategies_count"] == 0
    assert summary["published_versions_count"] == 0
    assert summary["recent_backtests_count"] == 0
    assert summary["running_paper_sessions_count"] == 0
    assert summary["live_broker_connected"] is False
    assert "Live trading is disabled" in summary["live_broker_message"]

    # 3. Insert real strategy record into database
    strategy = Strategy(
        workspace_id=uuid.UUID(ws_id),
        owner_user_id=uuid.UUID(user_id),
        name="Nifty Supertrend Breakout",
        description="Real strategy inserted for verification",
        status="draft",
    )
    db_session.add(strategy)
    db_session.commit()

    # 4. Re-query dashboard summary to verify count increments to 1 without fabrication
    updated_resp = client.get(
        f"/api/v1/workspaces/{ws_id}/dashboard-summary",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert updated_resp.status_code == 200
    updated_summary = updated_resp.json()["data"]
    assert updated_summary["saved_strategies_count"] == 1
    assert updated_summary["published_versions_count"] == 0
