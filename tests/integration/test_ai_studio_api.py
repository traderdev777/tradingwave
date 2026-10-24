"""Integration tests for AI Strategy Studio endpoints, validation, and lifecycle."""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from packages.strategy_spec.schema import Exchange, StrategySpec


def test_ai_studio_chat_and_clarification(client: TestClient, db_session: Session):
    """Verify natural-language strategy drafting, clarification questions, and persistence."""
    # 1. Register a user
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "aistudio_test@tradingwave.in",
            "password": "Password123#",
            "display_name": "Quant Strategist",
            "workspace_name": "Alpha Studio",
        },
    )
    assert reg_resp.status_code == 200
    token = reg_resp.json()["data"]["token"]["access_token"]
    ws_id = reg_resp.json()["data"]["active_workspace"]["id"]

    # 2. Chat with AI assistant
    chat_resp = client.post(
        f"/api/v1/workspaces/{ws_id}/ai-studio/chat",
        headers={"Authorization": f"Bearer {token}"},
        json={"prompt": "Build a NIFTY 5-min EMA crossover scalper"},
    )
    assert chat_resp.status_code == 200
    data = chat_resp.json()["data"]

    assert "conversation_id" in data
    assert data["spec"]["symbol"] == "NIFTY50"
    assert data["spec"]["timeframe"] == "5m"
    assert len(data["how_it_works"]) > 0
    assert len(data["failure_modes"]) > 0
    assert len(data["message"]["clarification_questions"]) > 0
    conv_id = data["conversation_id"]

    # 3. Follow-up turn in the same conversation
    chat_resp2 = client.post(
        f"/api/v1/workspaces/{ws_id}/ai-studio/chat",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "prompt": "Set stop loss to 0.5% and apply MCX Crude Oil 30m ORB",
            "conversation_id": conv_id,
            "current_spec": data["spec"],
        },
    )
    assert chat_resp2.status_code == 200
    data2 = chat_resp2.json()["data"]
    assert data2["conversation_id"] == conv_id
    assert data2["spec"]["exchange"] == "MCX"
    assert data2["spec"]["symbol"] == "CRUDEOIL"

    # 4. Check conversation history persistence
    convs_resp = client.get(
        f"/api/v1/workspaces/{ws_id}/ai-studio/conversations",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert convs_resp.status_code == 200
    convs = convs_resp.json()["data"]
    assert len(convs) >= 1
    assert convs[0]["id"] == conv_id
    assert convs[0]["messages_count"] == 4  # 2 user msgs + 2 assistant msgs


def test_ai_studio_validation_and_lifecycle(client: TestClient, db_session: Session):
    """Verify pre-flight validation, save strategy versioning, backtest and paper session triggers."""
    # 1. Register a user
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "lifecycle_test@tradingwave.in",
            "password": "Password123#",
            "display_name": "Risk Officer",
            "workspace_name": "Execution Desk",
        },
    )
    token = reg_resp.json()["data"]["token"]["access_token"]
    ws_id = reg_resp.json()["data"]["active_workspace"]["id"]

    # 2. Compile a strategy spec
    spec = StrategySpec(
        name="NSE NIFTY50 Supertrend Momentum",
        symbol="NIFTY50",
        exchange=Exchange.NSE,
    )

    # 3. Validate spec
    val_resp = client.post(
        f"/api/v1/workspaces/{ws_id}/ai-studio/validate",
        headers={"Authorization": f"Bearer {token}"},
        json={"spec": spec.model_dump(mode="json")},
    )
    assert val_resp.status_code == 200
    report = val_resp.json()["data"]
    assert report["can_backtest"] is True
    assert report["error_count"] == 0

    # 4. Save Strategy
    save_resp = client.post(
        f"/api/v1/workspaces/{ws_id}/ai-studio/save-strategy",
        headers={"Authorization": f"Bearer {token}"},
        json={"spec": spec.model_dump(mode="json")},
    )
    assert save_resp.status_code == 200
    save_data = save_resp.json()["data"]
    strategy_id = save_data["strategy_id"]
    version_id = save_data["version_id"]
    assert save_data["version_number"] == 1
    assert "specification_hash" in save_data

    # 5. Trigger Backtest Job
    bt_resp = client.post(
        f"/api/v1/workspaces/{ws_id}/ai-studio/backtest",
        headers={"Authorization": f"Bearer {token}"},
        json={"strategy_id": strategy_id, "version_id": version_id},
    )
    assert bt_resp.status_code == 200
    bt_data = bt_resp.json()["data"]
    assert bt_data["status"] == "QUEUED"
    assert "job_id" in bt_data

    # 6. Trigger Paper Session
    paper_resp = client.post(
        f"/api/v1/workspaces/{ws_id}/ai-studio/paper-session",
        headers={"Authorization": f"Bearer {token}"},
        json={"strategy_id": strategy_id, "version_id": version_id},
    )
    assert paper_resp.status_code == 200
    paper_data = paper_resp.json()["data"]
    assert paper_data["status"] == "RUNNING"
    assert "SIMULATED EXECUTIONS ONLY" in paper_data["disclaimer"]
