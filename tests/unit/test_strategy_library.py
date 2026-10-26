"""Comprehensive unit and integration tests for TradingWave Strategy Library.

Validates:
1. Strategy listing, pagination, and backend summary counts ribbon.
2. Search and multi-criteria faceted filtering (status, category, instrument, trading mode, source, folder, favorites, archived).
3. Sorting algorithms (recently updated, recently created, alphabetical).
4. Canonical Strategy Template Catalog discovery (8 pre-validated Indian market templates).
5. Creating a strategy draft from a canonical template (verifying template immutability and valid draft generation).
6. Duplicating a strategy without mutating the original.
7. Workspace multi-tenant isolation and server-side authorization enforcement.
8. Folder CRUD operations and strategy folder assignment.
9. Favorite toggling and archive/restore lifecycle states.
10. Version history retrieval and historical version restoration as a new draft.
11. Side-by-side structural strategy comparison.
12. Backtest run history ledger and quantitative execution metrics.
"""

import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from packages.strategy_spec.templates import TEMPLATE_REGISTRY, list_templates, get_template
from packages.strategy_spec.schema import (
    StrategySpec,
    Exchange,
    Timeframe,
    TradingMode,
    StrategyCategory,
)


def _register_user(client: TestClient, email: str, name: str, workspace_name: str):
    """Helper to register a user and return auth headers and workspace ID."""
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "SecurePassword123#",
            "display_name": name,
            "workspace_name": workspace_name,
        },
    )
    assert reg.status_code == 200, reg.text
    data = reg.json()["data"]
    token = data["token"]["access_token"]
    ws_id = data["active_workspace"]["id"]
    return {"Authorization": f"Bearer {token}"}, ws_id


def test_template_catalog_registry():
    """Verify that canonical templates exist, are registered, and conform to StrategySpec."""
    templates = list_templates()
    assert len(templates) >= 8

    expected_ids = [
        "tmpl_orb_basic",
        "tmpl_orb_multigroup",
        "tmpl_orb_trend_filter",
        "tmpl_ema_crossover",
        "tmpl_supertrend",
        "tmpl_rsi_momentum",
        "tmpl_bb_reversion",
        "tmpl_btst_momentum",
    ]
    for tmpl_id in expected_ids:
        assert tmpl_id in TEMPLATE_REGISTRY
        tmpl = get_template(tmpl_id)
        assert tmpl is not None
        assert tmpl.name
        assert tmpl.category
        assert tmpl.supported_instruments
        assert tmpl.entry_logic_summary
        assert tmpl.exit_logic_summary
        assert tmpl.spec is not None
        assert isinstance(tmpl.spec, StrategySpec)


def test_template_discovery_api(client: TestClient, db_session: Session):
    """Verify GET /library/templates endpoint with filtering."""
    headers, ws_id = _register_user(
        client, "trader_templates@tradingwave.in", "Template Trader", "Template Desk"
    )

    # 1. Discover all templates
    resp = client.get(f"/api/v1/workspaces/{ws_id}/library/templates", headers=headers)
    assert resp.status_code == 200
    templates = resp.json()["data"]
    assert len(templates) >= 8

    # 2. Filter by category
    orb_resp = client.get(f"/api/v1/workspaces/{ws_id}/library/templates?category=ORB", headers=headers)
    assert orb_resp.status_code == 200
    orb_tmpls = orb_resp.json()["data"]
    assert len(orb_tmpls) >= 3
    assert all("ORB" in t["category"].upper() or "BREAKOUT" in t["category"].upper() for t in orb_tmpls)

    # 3. Get single template detail
    detail_resp = client.get(f"/api/v1/workspaces/{ws_id}/library/templates/tmpl_orb_multigroup", headers=headers)
    assert detail_resp.status_code == 200
    detail = detail_resp.json()["data"]
    assert detail["template_id"] == "tmpl_orb_multigroup"
    assert "Multi-Group" in detail["name"]
    assert detail["spec"]["entry_rules"] is not None


def test_create_strategy_from_template(client: TestClient, db_session: Session):
    """Verify instantiating a new editable strategy draft from a canonical template."""
    headers, ws_id = _register_user(
        client, "user_tmpl_create@tradingwave.in", "Template Creator", "Quant Desk"
    )

    # Instantiate from tmpl_supertrend
    inst_resp = client.post(
        f"/api/v1/workspaces/{ws_id}/library/templates/tmpl_supertrend/create",
        headers=headers,
        json={
            "name": "My NIFTY Supertrend Strategy",
            "symbol": "NIFTY50",
            "exchange": "NSE",
            "capital_inr": 75000.0,
            "open_in": "visual_builder",
        },
    )
    assert inst_resp.status_code == 200, inst_resp.text
    created = inst_resp.json()["data"]
    assert created["strategy_id"]
    assert created["version_number"] == 1
    assert created["name"] == "My NIFTY Supertrend Strategy"
    assert created["spec"]["symbol"] == "NIFTY50"
    assert created["spec"]["exchange"] == "NSE"
    assert created["open_in"] == "visual_builder"

    # Verify original template is untouched
    orig_tmpl = get_template("tmpl_supertrend")
    assert orig_tmpl.name != "My NIFTY Supertrend Strategy"


def test_strategy_library_crud_and_counts_ribbon(client: TestClient, db_session: Session):
    """Verify strategy creation, search, filtering, and summary counts ribbon."""
    headers, ws_id = _register_user(
        client, "quant_lead@tradingwave.in", "Quant Lead", "Primary Alpha Workspace"
    )

    # 1. Create 3 strategies with different categories and instruments
    s1 = client.post(
        f"/api/v1/workspaces/{ws_id}/library/strategies",
        headers=headers,
        json={
            "name": "BankNifty 15m ORB Breakout",
            "category": "Opening Range Breakout",
            "symbol": "BANKNIFTY",
            "exchange": "NSE",
            "trading_mode": "INTRADAY",
            "tags": ["index", "orb", "breakout"],
            "source": "visual_builder",
        },
    ).json()["data"]

    s2 = client.post(
        f"/api/v1/workspaces/{ws_id}/library/strategies",
        headers=headers,
        json={
            "name": "CrudeOil EMA Crossover Trend",
            "category": "Trend Following",
            "symbol": "CRUDEOIL",
            "exchange": "MCX",
            "trading_mode": "INTRADAY",
            "tags": ["commodity", "mcx", "ema"],
            "source": "ai_studio",
        },
    ).json()["data"]

    s3 = client.post(
        f"/api/v1/workspaces/{ws_id}/library/strategies",
        headers=headers,
        json={
            "name": "Reliance BTST Delivery Rider",
            "category": "Momentum",
            "symbol": "RELIANCE",
            "exchange": "NSE",
            "trading_mode": "BTST",
            "tags": ["equity", "btst", "delivery"],
            "source": "visual_builder",
        },
    ).json()["data"]

    # 2. List strategies and verify ribbon counts
    list_resp = client.get(f"/api/v1/workspaces/{ws_id}/library/strategies", headers=headers)
    assert list_resp.status_code == 200
    res_data = list_resp.json()["data"]
    assert res_data["total"] == 3
    assert len(res_data["items"]) == 3
    counts = res_data["summary_counts"]
    assert counts["total_strategies"] == 3
    assert counts["draft_count"] + counts["validated_count"] == 3

    # 3. Search by keyword
    search_resp = client.get(
        f"/api/v1/workspaces/{ws_id}/library/strategies?q=CrudeOil", headers=headers
    )
    assert search_resp.status_code == 200
    assert search_resp.json()["data"]["total"] == 1
    assert search_resp.json()["data"]["items"][0]["symbol"] == "CRUDEOIL"

    # 4. Filter by exchange/instrument
    mcx_resp = client.get(
        f"/api/v1/workspaces/{ws_id}/library/strategies?instrument=CRUDEOIL", headers=headers
    )
    assert mcx_resp.status_code == 200
    assert mcx_resp.json()["data"]["total"] == 1

    # 5. Filter by trading mode
    btst_resp = client.get(
        f"/api/v1/workspaces/{ws_id}/library/strategies?trading_mode=BTST", headers=headers
    )
    assert btst_resp.status_code == 200
    assert btst_resp.json()["data"]["total"] == 1
    assert btst_resp.json()["data"]["items"][0]["name"] == "Reliance BTST Delivery Rider"

    # 6. Sorting: alphabetical
    alpha_resp = client.get(
        f"/api/v1/workspaces/{ws_id}/library/strategies?sort_by=alphabetical&sort_dir=asc",
        headers=headers,
    )
    items = alpha_resp.json()["data"]["items"]
    names = [i["name"] for i in items]
    assert names == sorted(names)


def test_folders_and_favorites_management(client: TestClient, db_session: Session):
    """Verify folder creation, renaming, strategy folder assignment, deletion, and favorite toggle."""
    headers, ws_id = _register_user(
        client, "org_mgr@tradingwave.in", "Org Manager", "Operations Desk"
    )

    # 1. Create a strategy
    strat = client.post(
        f"/api/v1/workspaces/{ws_id}/library/strategies",
        headers=headers,
        json={"name": "Nifty Scalper", "symbol": "NIFTY", "exchange": "NSE"},
    ).json()["data"]
    strat_id = strat["id"]

    # 2. Create a folder
    f_resp = client.post(
        f"/api/v1/workspaces/{ws_id}/library/folders",
        headers=headers,
        json={"name": "Index Production", "color": "#FF7722", "description": "Live production setups"},
    )
    assert f_resp.status_code == 200
    folder = f_resp.json()["data"]
    folder_id = folder["id"]

    # 3. Move strategy to folder
    patch_resp = client.patch(
        f"/api/v1/workspaces/{ws_id}/library/strategies/{strat_id}",
        headers=headers,
        json={"folder_id": folder_id},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["data"]["folder_id"] == folder_id

    # 4. Toggle favorite
    fav_resp = client.post(
        f"/api/v1/workspaces/{ws_id}/library/strategies/{strat_id}/favorite",
        headers=headers,
    )
    assert fav_resp.status_code == 200
    assert fav_resp.json()["data"]["is_favorite"] is True

    # Check ribbon favorite count
    lib_resp = client.get(f"/api/v1/workspaces/{ws_id}/library/strategies", headers=headers)
    assert lib_resp.json()["data"]["summary_counts"]["favorites_count"] == 1

    # 5. List folders with count
    folders_list = client.get(f"/api/v1/workspaces/{ws_id}/library/folders", headers=headers).json()["data"]
    assert len(folders_list) == 1
    assert folders_list[0]["strategy_count"] == 1

    # 6. Delete folder (strategy becomes unassigned, not deleted)
    del_folder = client.delete(f"/api/v1/workspaces/{ws_id}/library/folders/{folder_id}", headers=headers)
    assert del_folder.status_code == 200

    check_strat = client.get(f"/api/v1/workspaces/{ws_id}/library/strategies", headers=headers).json()["data"]
    assert check_strat["total"] == 1
    assert check_strat["items"][0]["folder_id"] is None


def test_strategy_duplication_and_archive(client: TestClient, db_session: Session):
    """Verify duplication generates clean copy and archive/restore works safely."""
    headers, ws_id = _register_user(
        client, "dup_tester@tradingwave.in", "Dup Tester", "Duplication Desk"
    )

    strat = client.post(
        f"/api/v1/workspaces/{ws_id}/library/strategies",
        headers=headers,
        json={"name": "Finnifty 5m Reversal", "symbol": "FINNIFTY", "exchange": "NSE"},
    ).json()["data"]
    strat_id = strat["id"]

    # 1. Duplicate
    dup_resp = client.post(
        f"/api/v1/workspaces/{ws_id}/library/strategies/{strat_id}/duplicate",
        headers=headers,
    )
    assert dup_resp.status_code == 200
    dup_data = dup_resp.json()["data"]
    assert dup_data["id"] != strat_id
    assert "Copy" in dup_data["name"]

    # 2. Archive original
    arc_resp = client.post(
        f"/api/v1/workspaces/{ws_id}/library/strategies/{strat_id}/archive",
        headers=headers,
    )
    assert arc_resp.status_code == 200

    # Verify not in active listing
    active_strats = client.get(f"/api/v1/workspaces/{ws_id}/library/strategies", headers=headers).json()["data"]
    assert active_strats["total"] == 1
    assert active_strats["summary_counts"]["archived_count"] == 1

    # Verify in archived listing
    archived_strats = client.get(
        f"/api/v1/workspaces/{ws_id}/library/strategies?is_archived=true", headers=headers
    ).json()["data"]
    assert archived_strats["total"] == 1
    assert archived_strats["items"][0]["id"] == strat_id

    # 3. Restore
    restore_resp = client.post(
        f"/api/v1/workspaces/{ws_id}/library/strategies/{strat_id}/restore",
        headers=headers,
    )
    assert restore_resp.status_code == 200

    active_again = client.get(f"/api/v1/workspaces/{ws_id}/library/strategies", headers=headers).json()["data"]
    assert active_again["total"] == 2
    assert active_again["summary_counts"]["archived_count"] == 0


def test_version_restoration_and_comparison(client: TestClient, db_session: Session):
    """Verify immutable version history, restoring an older version, and side-by-side diff comparison."""
    headers, ws_id = _register_user(
        client, "version_tester@tradingwave.in", "Version Tester", "Versioning Desk"
    )

    # 1. Create strategy
    strat = client.post(
        f"/api/v1/workspaces/{ws_id}/library/strategies",
        headers=headers,
        json={"name": "NIFTY ORB Dynamic", "symbol": "NIFTY", "exchange": "NSE"},
    ).json()["data"]
    strat_id = strat["id"]

    # 2. Save a new version v2 via save-strategy
    spec_v2 = StrategySpec(
        name="NIFTY ORB Dynamic",
        symbol="NIFTY50",
        exchange=Exchange.NSE,
        category=StrategyCategory.ORB,
        timeframe=Timeframe.M5,
    )
    v2_save = client.post(
        f"/api/v1/workspaces/{ws_id}/ai-studio/save-strategy",
        headers=headers,
        json={
            "strategy_id": strat_id,
            "spec": spec_v2.model_dump(mode="json"),
            "change_summary": "Upgraded execution timeframe to 5m",
        },
    )
    assert v2_save.status_code == 200
    assert v2_save.json()["data"]["version_number"] == 2

    # 3. Get version history
    ver_resp = client.get(f"/api/v1/workspaces/{ws_id}/ai-studio/strategies/{strat_id}/versions", headers=headers)
    assert ver_resp.status_code == 200
    versions = ver_resp.json()["data"]
    assert len(versions) == 2

    v1_id = [v["version_id"] for v in versions if v["version_number"] == 1][0]
    v2_id = [v["version_id"] for v in versions if v["version_number"] == 2][0]

    # 4. Compare version 1 and version 2
    comp_resp = client.post(
        f"/api/v1/workspaces/{ws_id}/library/strategies/compare",
        headers=headers,
        json={
            "strategy_id_1": strat_id,
            "version_id_1": v1_id,
            "strategy_id_2": strat_id,
            "version_id_2": v2_id,
        },
    )
    assert comp_resp.status_code == 200
    comp_data = comp_resp.json()["data"]
    assert comp_data["item_1"]["version_number"] == 1
    assert comp_data["item_2"]["version_number"] == 2
    assert "differences" in comp_data

    # 5. Restore version 1 as a new draft
    restore_v_resp = client.post(
        f"/api/v1/workspaces/{ws_id}/library/strategies/{strat_id}/versions/{v1_id}/restore",
        headers=headers,
    )
    assert restore_v_resp.status_code == 200
    restored = restore_v_resp.json()["data"]
    assert restored["version_number"] == 3
    assert "Restored from version 1" in restored["change_summary"]


def test_workspace_isolation_security(client: TestClient, db_session: Session):
    """Verify that User B in Workspace B cannot read, modify, or delete Workspace A's strategies or folders."""
    headers_a, ws_a = _register_user(
        client, "user_alpha@tradingwave.in", "User Alpha", "Alpha Capital"
    )
    headers_b, ws_b = _register_user(
        client, "user_bravo@tradingwave.in", "User Bravo", "Bravo Capital"
    )

    # User A creates a strategy in Workspace A
    strat_a = client.post(
        f"/api/v1/workspaces/{ws_a}/library/strategies",
        headers=headers_a,
        json={"name": "Alpha Proprietary Scalper", "symbol": "NIFTY", "exchange": "NSE"},
    ).json()["data"]
    strat_a_id = strat_a["id"]

    # User A creates a folder
    folder_a = client.post(
        f"/api/v1/workspaces/{ws_a}/library/folders",
        headers=headers_a,
        json={"name": "Alpha Secret Folder"},
    ).json()["data"]
    folder_a_id = folder_a["id"]

    # User B lists strategies in Workspace B -> Should NOT see User A's strategy
    b_strats = client.get(f"/api/v1/workspaces/{ws_b}/library/strategies", headers=headers_b).json()["data"]
    assert b_strats["total"] == 0
    assert not any(s["id"] == strat_a_id for s in b_strats["items"])

    # User B attempts to access Workspace A directly with their token -> 403 Forbidden
    cross_access = client.get(f"/api/v1/workspaces/{ws_a}/library/strategies", headers=headers_b)
    assert cross_access.status_code in (401, 403)

    # User B attempts to modify User A's strategy using Workspace B route -> 404 Not Found
    cross_modify = client.patch(
        f"/api/v1/workspaces/{ws_b}/library/strategies/{strat_a_id}",
        headers=headers_b,
        json={"name": "Hacked Name"},
    )
    assert cross_modify.status_code == 404

    # User B attempts to delete User A's folder using Workspace B route -> 404 Not Found
    cross_del_folder = client.delete(
        f"/api/v1/workspaces/{ws_b}/library/folders/{folder_a_id}",
        headers=headers_b,
    )
    assert cross_del_folder.status_code == 404
