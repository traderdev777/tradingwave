"""Security and boundary isolation tests for AI Strategy Studio endpoints.

Verifies:
1. Cross-workspace isolation: Users cannot access or modify strategies/conversations in another workspace.
2. IDOR prevention: Passing a foreign strategy ID or version ID returns 404.
3. Pre-flight execution gate: Strategies with blocking validation errors cannot be backtested or paper traded.
4. Audit trail persistence for all lifecycle events (STRATEGY_SAVED, BACKTEST_QUEUED, PAPER_SESSION_STARTED).
"""

import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from packages.strategy_spec.schema import Exchange, StrategySpec
from services.api.models.audit import AuditEvent


def _register_user_and_workspace(client: TestClient, email: str, name: str, ws_name: str) -> tuple[str, str]:
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Password123#",
            "display_name": name,
            "workspace_name": ws_name,
        },
    )
    assert resp.status_code == 200
    token = resp.json()["data"]["token"]["access_token"]
    ws_id = resp.json()["data"]["active_workspace"]["id"]
    return token, ws_id


def test_cross_workspace_ai_studio_isolation(client: TestClient, db_session: Session):
    """Verify that User B cannot access or modify User A's strategy, version, or conversation."""
    token_a, ws_a = _register_user_and_workspace(client, "user_a@tradingwave.in", "User A", "Workspace A")
    token_b, ws_b = _register_user_and_workspace(client, "user_b@tradingwave.in", "User B", "Workspace B")

    # 1. User A saves a strategy in Workspace A
    spec = StrategySpec(
        name="User A Proprietary Alpha",
        symbol="NIFTY50",
        exchange=Exchange.NSE,
    )
    save_resp_a = client.post(
        f"/api/v1/workspaces/{ws_a}/ai-studio/save-strategy",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"spec": spec.model_dump(mode="json")},
    )
    assert save_resp_a.status_code == 200
    strategy_a_id = save_resp_a.json()["data"]["strategy_id"]
    version_a_id = save_resp_a.json()["data"]["version_id"]

    # 2. User B attempts to overwrite User A's strategy via Workspace B -> Must return 404
    hack_save = client.post(
        f"/api/v1/workspaces/{ws_b}/ai-studio/save-strategy",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"strategy_id": strategy_a_id, "spec": spec.model_dump(mode="json")},
    )
    assert hack_save.status_code == 404

    # 3. User B attempts to trigger a backtest using User A's strategy ID in Workspace B -> Must return 404
    hack_bt = client.post(
        f"/api/v1/workspaces/{ws_b}/ai-studio/backtest",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"strategy_id": strategy_a_id, "version_id": version_a_id},
    )
    assert hack_bt.status_code == 404

    # 4. User B attempts to launch paper trading on User A's strategy ID in Workspace B -> Must return 404
    hack_paper = client.post(
        f"/api/v1/workspaces/{ws_b}/ai-studio/paper-session",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"strategy_id": strategy_a_id, "version_id": version_a_id},
    )
    assert hack_paper.status_code == 404


def test_cross_strategy_version_idor_prevention(client: TestClient, db_session: Session):
    """Verify that a user cannot backtest or paper-trade a version ID from a different strategy."""
    token, ws_id = _register_user_and_workspace(client, "idor_test@tradingwave.in", "IDOR Tester", "Test Lab")

    # Save Strategy 1
    spec1 = StrategySpec(name="Strategy 1 Alpha", symbol="NIFTY50", exchange=Exchange.NSE)
    s1 = client.post(
        f"/api/v1/workspaces/{ws_id}/ai-studio/save-strategy",
        headers={"Authorization": f"Bearer {token}"},
        json={"spec": spec1.model_dump(mode="json")},
    ).json()["data"]

    # Save Strategy 2
    spec2 = StrategySpec(name="Strategy 2 Beta", symbol="BANKNIFTY", exchange=Exchange.NSE)
    s2 = client.post(
        f"/api/v1/workspaces/{ws_id}/ai-studio/save-strategy",
        headers={"Authorization": f"Bearer {token}"},
        json={"spec": spec2.model_dump(mode="json")},
    ).json()["data"]

    # Attempt to backtest Strategy 1 using Strategy 2's version ID -> Must return 404
    bt_resp = client.post(
        f"/api/v1/workspaces/{ws_id}/ai-studio/backtest",
        headers={"Authorization": f"Bearer {token}"},
        json={"strategy_id": s1["strategy_id"], "version_id": s2["version_id"]},
    )
    assert bt_resp.status_code == 404

    # Attempt to paper trade Strategy 1 using Strategy 2's version ID -> Must return 404
    paper_resp = client.post(
        f"/api/v1/workspaces/{ws_id}/ai-studio/paper-session",
        headers={"Authorization": f"Bearer {token}"},
        json={"strategy_id": s1["strategy_id"], "version_id": s2["version_id"]},
    )
    assert paper_resp.status_code == 404


def test_blocking_validation_errors_prevent_execution(client: TestClient, db_session: Session):
    """Verify that strategies with blocking validation errors cannot be backtested or paper traded."""
    token, ws_id = _register_user_and_workspace(client, "block_test@tradingwave.in", "Block Tester", "Safety Lab")

    # Create invalid spec (lookahead / MCX session mismatch)
    spec = StrategySpec(
        name="Invalid Session Alpha",
        symbol="CRUDEOIL",
        exchange=Exchange.MCX,
        trading_session="10:00-11:00 IST",  # Mismatch with MCX evening session
    )

    save_resp = client.post(
        f"/api/v1/workspaces/{ws_id}/ai-studio/save-strategy",
        headers={"Authorization": f"Bearer {token}"},
        json={"spec": spec.model_dump(mode="json")},
    )
    assert save_resp.status_code == 200
    strat_id = save_resp.json()["data"]["strategy_id"]
    ver_id = save_resp.json()["data"]["version_id"]

    # Attempt backtest -> Must return 400 with VALIDATION_ERRORS_BLOCK_TESTING
    bt_resp = client.post(
        f"/api/v1/workspaces/{ws_id}/ai-studio/backtest",
        headers={"Authorization": f"Bearer {token}"},
        json={"strategy_id": strat_id, "version_id": ver_id},
    )
    assert bt_resp.status_code == 400
    assert bt_resp.json()["error"]["code"] == "VALIDATION_ERRORS_BLOCK_TESTING"

    # Attempt paper trade -> Must return 400 with VALIDATION_ERRORS_BLOCK_TESTING
    paper_resp = client.post(
        f"/api/v1/workspaces/{ws_id}/ai-studio/paper-session",
        headers={"Authorization": f"Bearer {token}"},
        json={"strategy_id": strat_id, "version_id": ver_id},
    )
    assert paper_resp.status_code == 400
    assert paper_resp.json()["error"]["code"] == "VALIDATION_ERRORS_BLOCK_TESTING"


def test_audit_trail_events_persisted(client: TestClient, db_session: Session):
    """Verify that saving, backtesting, and paper trading emit persisted audit trail records."""
    token, ws_id = _register_user_and_workspace(client, "audit_test@tradingwave.in", "Auditor", "Compliance Desk")

    spec = StrategySpec(name="Compliant Alpha", symbol="NIFTY50", exchange=Exchange.NSE)

    # 1. Save
    save_resp = client.post(
        f"/api/v1/workspaces/{ws_id}/ai-studio/save-strategy",
        headers={"Authorization": f"Bearer {token}"},
        json={"spec": spec.model_dump(mode="json")},
    )
    strat_id = save_resp.json()["data"]["strategy_id"]
    ver_id = save_resp.json()["data"]["version_id"]

    # 2. Backtest
    client.post(
        f"/api/v1/workspaces/{ws_id}/ai-studio/backtest",
        headers={"Authorization": f"Bearer {token}"},
        json={"strategy_id": strat_id, "version_id": ver_id},
    )

    # 3. Paper session
    client.post(
        f"/api/v1/workspaces/{ws_id}/ai-studio/paper-session",
        headers={"Authorization": f"Bearer {token}"},
        json={"strategy_id": strat_id, "version_id": ver_id},
    )

    # Verify audit events in DB
    ws_uuid = uuid.UUID(ws_id)
    audit_events = db_session.query(AuditEvent).filter(AuditEvent.workspace_id == ws_uuid).all()
    event_types = {e.event_type for e in audit_events}

    assert "STRATEGY_SAVED" in event_types
    assert "BACKTEST_QUEUED" in event_types
    assert "PAPER_SESSION_STARTED" in event_types
