"""Integration tests for registration, authentication, sessions, and profile endpoints."""

from fastapi.testclient import TestClient


def test_user_registration_lifecycle(client: TestClient):
    """Test full registration flow: user creation, workspace provisioning, and session response."""
    payload = {
        "email": "quant_trader@tradingwave.in",
        "password": "StrongPassword123#",
        "display_name": "Arjun Sharma",
        "workspace_name": "Nifty Alpha Desk",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 200

    body = response.json()
    assert "data" in body
    data = body["data"]

    # Verify user object
    user = data["user"]
    assert user["email"] == "quant_trader@tradingwave.in"
    assert user["display_name"] == "Arjun Sharma"
    assert user["status"] == "active"

    # Verify workspace object
    active_ws = data["active_workspace"]
    assert active_ws["name"] == "Nifty Alpha Desk"
    assert active_ws["role"] == "owner"

    # Verify token
    token = data["token"]
    assert "access_token" in token
    assert token["token_type"] == "bearer"


def test_duplicate_registration_rejected(client: TestClient):
    """Verify that registering with an already existing email returns 409 RESOURCE_CONFLICT."""
    payload = {
        "email": "duplicate@tradingwave.in",
        "password": "StrongPassword123#",
        "display_name": "Trader One",
    }
    first_resp = client.post("/api/v1/auth/register", json=payload)
    assert first_resp.status_code == 200

    second_resp = client.post("/api/v1/auth/register", json=payload)
    assert second_resp.status_code == 409
    assert second_resp.json()["error"]["code"] == "RESOURCE_CONFLICT"


def test_user_login_success_and_failure(client: TestClient):
    """Verify that valid credentials return session and invalid credentials fail with 401."""
    reg_payload = {
        "email": "login_test@tradingwave.in",
        "password": "Password12345!",
        "display_name": "Login Tester",
    }
    client.post("/api/v1/auth/register", json=reg_payload)

    # Valid login
    login_resp = client.post(
        "/api/v1/auth/session",
        json={"email": "login_test@tradingwave.in", "password": "Password12345!"},
    )
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()["data"]["token"]

    # Invalid password
    bad_resp = client.post(
        "/api/v1/auth/session",
        json={"email": "login_test@tradingwave.in", "password": "WrongPassword999"},
    )
    assert bad_resp.status_code == 401
    assert bad_resp.json()["error"]["code"] == "UNAUTHENTICATED"


def test_protected_users_me_endpoint(client: TestClient):
    """Verify that /api/v1/users/me rejects unauthenticated requests and returns profile."""
    # 1. Unauthenticated request
    unauth_resp = client.get("/api/v1/users/me")
    assert unauth_resp.status_code == 401

    # 2. Register and get token
    reg_payload = {
        "email": "profile_test@tradingwave.in",
        "password": "Password12345!",
        "display_name": "Profile Tester",
    }
    reg_resp = client.post("/api/v1/auth/register", json=reg_payload)
    token = reg_resp.json()["data"]["token"]["access_token"]

    # 3. Authenticated request
    auth_resp = client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert auth_resp.status_code == 200
    user_data = auth_resp.json()["data"]["user"]
    assert user_data["email"] == "profile_test@tradingwave.in"
    workspaces = auth_resp.json()["data"]["workspaces"]
    assert len(workspaces) == 1
    assert workspaces[0]["role"] == "owner"


def test_logout_session(client: TestClient):
    """Verify session termination endpoint."""
    reg_payload = {
        "email": "logout_test@tradingwave.in",
        "password": "Password12345!",
        "display_name": "Logout Tester",
    }
    reg_resp = client.post("/api/v1/auth/register", json=reg_payload)
    token = reg_resp.json()["data"]["token"]["access_token"]

    logout_resp = client.delete(
        "/api/v1/auth/session",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert logout_resp.status_code == 200
    assert logout_resp.json()["data"]["status"] == "session_terminated"
