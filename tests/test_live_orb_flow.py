"""Live server verification script for Dynamic ORB Strategy Builder workflow."""

import httpx


def test_live_dynamic_orb_workflow():
    client = httpx.Client(base_url="http://localhost:8000/api/v1")

    # 1. Get demo session
    demo_resp = client.post("/auth/demo-session")
    assert demo_resp.status_code == 200, f"Demo session failed: {demo_resp.text}"
    session_data = demo_resp.json()["data"]
    token = session_data["token"]["access_token"]
    user = session_data["user"]
    ws_id = str(session_data["active_workspace"]["id"])
    headers = {"Authorization": f"Bearer {token}"}
    print("Authenticated as:", user["email"], "Workspace:", ws_id)

    # 2. Prompt 1: ORB Intent
    chat1 = client.post(
        f"/workspaces/{ws_id}/ai-studio/chat",
        headers=headers,
        json={"prompt": "I want to build an ORB strategy for NIFTY."},
    )
    assert chat1.status_code == 200, f"Chat 1 failed: {chat1.text}"
    data1 = chat1.json()["data"]
    spec1 = data1["spec"]
    print("\nPrompt 1: 'I want to build an ORB strategy for NIFTY.'")
    print("  Category:", spec1["category"])
    print("  Name:", spec1["name"])
    print("  ORB Enabled:", spec1["orb_settings"]["enabled"])
    print("  ORB Range:", spec1["orb_settings"]["range_start_time"], "-", spec1["orb_settings"]["range_end_time"])
    print("  Entry Cutoff:", spec1["orb_settings"]["entry_cutoff_time"])
    print("  Entry Timeframe:", spec1["entry_timeframe"])
    print("  Exit Timeframe:", spec1["exit_timeframe"])
    call_groups = (spec1.get("call_entry_rules") or {}).get("nested_groups", [])
    print(f"  CALL Entry Groups: {len(call_groups)} (Root Logic: {(spec1.get('call_entry_rules') or {}).get('logic')})")
    for idx, grp in enumerate(call_groups):
        rules_str = f" {grp.get('logic')} ".join(r.get("description", "") for r in grp.get("conditions", []))
        print(f"    Group {chr(65 + idx)} ({grp.get('logic')}): {rules_str}")

    put_groups = (spec1.get("put_entry_rules") or {}).get("nested_groups", [])
    print(f"  PUT Entry Groups: {len(put_groups)} (Root Logic: {(spec1.get('put_entry_rules') or {}).get('logic')})")
    for idx, grp in enumerate(put_groups):
        rules_str = f" {grp.get('logic')} ".join(r.get("description", "") for r in grp.get("conditions", []))
        print(f"    Group {chr(65 + idx)} ({grp.get('logic')}): {rules_str}")

    print("  Can backtest:", data1["validation"]["can_backtest"])

    # 3. Prompt 2: Conversational refinement for TSL
    chat2 = client.post(
        f"/workspaces/{ws_id}/ai-studio/chat",
        headers=headers,
        json={
            "prompt": "Make the exit timeframe 1 minute and activate TSL after 20 points profit, trail 10 points",
            "conversation_id": data1["conversation_id"],
            "current_spec": spec1,
        },
    )
    assert chat2.status_code == 200, f"Chat 2 failed: {chat2.text}"
    data2 = chat2.json()["data"]
    spec2 = data2["spec"]
    print("\nPrompt 2: 'Make the exit timeframe 1 minute and activate TSL after 20 points profit, trail 10 points'")
    print("  TSL Enabled:", spec2["tsl_settings"]["enabled"])
    print("  TSL Activation:", spec2["tsl_settings"]["activation_value"], spec2["tsl_settings"]["activation_type"])
    print("  TSL Trail Distance:", spec2["tsl_settings"]["distance_value"], spec2["tsl_settings"]["distance_type"])
    print("  Exit Timeframe:", spec2["exit_timeframe"])
    print("  ORB Range Still Preserved:", spec2["orb_settings"]["range_start_time"], "-", spec2["orb_settings"]["range_end_time"])

    # 4. Save Strategy
    save_resp = client.post(f"/workspaces/{ws_id}/ai-studio/save-strategy", headers=headers, json={"spec": spec2})
    assert save_resp.status_code == 200, f"Save failed: {save_resp.text}"
    save_data = save_resp.json()["data"]
    print("\nSave Strategy:")
    print("  Strategy ID:", save_data["strategy_id"])
    print("  Version Number:", save_data["version_number"])
    print("  Status:", save_data["status"])
    print("  Version ID:", save_data["version_id"])

    # 5. Backtest Trigger
    bt_resp = client.post(
        f"/workspaces/{ws_id}/ai-studio/backtest",
        headers=headers,
        json={"strategy_id": save_data["strategy_id"], "version_id": save_data["version_id"]},
    )
    assert bt_resp.status_code == 200, f"Backtest failed: {bt_resp.text}"
    print("\nBacktest Trigger:")
    print("  Status:", bt_resp.status_code)
    print("  Message:", bt_resp.json()["data"]["message"])
    print("  Job ID:", bt_resp.json()["data"]["job_id"])


if __name__ == "__main__":
    test_live_dynamic_orb_workflow()
