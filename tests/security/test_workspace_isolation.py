"""Security tests proving tenant isolation and cross-workspace access prevention."""

from fastapi.testclient import TestClient


def test_cross_workspace_access_is_strictly_forbidden(client: TestClient):
    """Prove that User A cannot read, access, or query User B's workspace data."""
    # 1. Register User A
    user_a_payload = {
        "email": "user_a@tradingwave.in",
        "password": "Password123#",
        "display_name": "User Alpha",
        "workspace_name": "Workspace Alpha",
    }
    resp_a = client.post("/api/v1/auth/register", json=user_a_payload)
    assert resp_a.status_code == 200
    token_a = resp_a.json()["data"]["token"]["access_token"]
    ws_a_id = resp_a.json()["data"]["active_workspace"]["id"]

    # 2. Register User B
    user_b_payload = {
        "email": "user_b@tradingwave.in",
        "password": "Password123#",
        "display_name": "User Beta",
        "workspace_name": "Workspace Beta",
    }
    resp_b = client.post("/api/v1/auth/register", json=user_b_payload)
    assert resp_b.status_code == 200
    token_b = resp_b.json()["data"]["token"]["access_token"]
    ws_b_id = resp_b.json()["data"]["active_workspace"]["id"]

    # 3. User A attempts to access User B's workspace details directly
    intrude_resp = client.get(
        f"/api/v1/workspaces/{ws_b_id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert intrude_resp.status_code == 403
    assert intrude_resp.json()["error"]["code"] == "WORKSPACE_ACCESS_DENIED"

    # 4. User A attempts to query User B's dashboard summary
    intrude_dashboard = client.get(
        f"/api/v1/workspaces/{ws_b_id}/dashboard-summary",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert intrude_dashboard.status_code == 403
    assert intrude_dashboard.json()["error"]["code"] == "WORKSPACE_ACCESS_DENIED"

    # 5. User A attempts to spoof X-Workspace-ID header with User B's workspace ID
    spoof_resp = client.get(
        f"/api/v1/workspaces/{ws_b_id}",
        headers={
            "Authorization": f"Bearer {token_a}",
            "X-Workspace-ID": ws_b_id,
        },
    )
    assert spoof_resp.status_code == 403
    assert spoof_resp.json()["error"]["code"] == "WORKSPACE_ACCESS_DENIED"

    # 6. User B cannot see User A's workspace in workspace list
    list_b_resp = client.get(
        "/api/v1/workspaces",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert list_b_resp.status_code == 200
    workspaces_b = list_b_resp.json()["data"]
    assert len(workspaces_b) == 1
    assert workspaces_b[0]["id"] == ws_b_id
    assert all(w["id"] != ws_a_id for w in workspaces_b)


def test_unauthenticated_workspace_endpoints_rejected(client: TestClient):
    """Verify that all workspace endpoints reject requests without a valid session token."""
    assert client.get("/api/v1/workspaces").status_code == 401
    assert client.post("/api/v1/workspaces", json={"name": "Hacker WS"}).status_code == 401
