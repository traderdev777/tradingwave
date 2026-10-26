# TradingWave — Visual Strategy Builder Implementation Report

## 1. Executive Summary

TradingWave has been augmented with a fully functional, visual, no-code **Visual Strategy Builder** for Indian financial markets (NSE, BSE, and MCX). Built to professional quantitative trading standards with TradingWave's signature Saffron Orange (`#FF7722`) and midnight navy aesthetic, the Visual Strategy Builder allows users to construct, inspect, modify, validate, save, version, backtest, and paper trade multi-group algorithmic strategies without writing code.

Crucially, this implementation strictly adheres to the core architectural mandate: **it does not introduce a disconnected mockup or duplicate strategy engine**. The Visual Strategy Builder directly reads, mutates, and serializes the exact canonical `StrategySpec` Abstract Syntax Tree (AST) evaluated by TradingWave's backend deterministic validation engine (`StrategyValidationEngine`), rule evaluator (`StrategyRuleEvaluator`), historical backtesting workers, and paper-trading simulation services. Users can seamlessly switch back and forth between the natural-language conversational AI Strategy Studio and the Visual Strategy Builder without losing conditions, indicator parameters, TSL settings, or nested Boolean group structures.

---

## 2. Architecture & File Inventory

### 2.1 Frontend Architecture (`apps/web`)

| Component / File | Role & Implementation Details |
|---|---|
| `components/visual_builder/VisualStrategyBuilder.tsx` | Main orchestrator with top toolbar (strategy title, save/dirty status, undo/redo stack, version selector, validate, save version, duplicate, template loader, backtest, paper trade, and switch to AI Studio toggle). Connects state to real backend endpoints. |
| `components/visual_builder/BlockPalette.tsx` | Searchable, categorized block palette (Strategy, Market Data, Indicators, Logic, Exit & Risk). Supports HTML5 drag-and-drop and instant click-to-add with visual keyboard shortcut indicators. |
| `components/visual_builder/CanvasLogicTree.tsx` | Central logic tree canvas displaying visual nodes: Strategy Context & Instrument Header, Opening Range Breakout (ORB) node, Direction Switcher (CALL Entry, PUT Entry, CALL Exit, PUT Exit), Multi-Group Boolean Logic Cards (`(A1 AND A2) OR (B1 AND B2)`), condition rows with candle offset badges (`[t-2]`, `[t-1]`, `[t-0]`), and Exit/Risk management nodes. Supports group nesting, reordering, condition deletion, and selection. |
| `components/visual_builder/BlockInspector.tsx` | Dedicated right-hand properties inspector. Dynamically renders configuration forms based on the active selection: Strategy & Instrument metadata, ORB parameters (session times, calculation timeframe, confirmation method), Atomic Condition Rules (left/right sources, operator, timeframe, offset), Trailing Stop-Loss monotonic ratchet parameters with plain-English explanation, and Risk Limits. |
| `components/visual_builder/BottomConsoleDrawer.tsx` | Collapsible bottom drawer featuring three tabbed consoles: 1) **Live Strategy Preview** (synthesized plain-English execution summary generated directly from AST), 2) **Validation Console** (color-coded blocking errors, warnings, and informational diagnostics with remediation advice), 3) **Execution Assumptions** (slippage, transaction costs, STT/CTT, exchange turnover, broker fees, and latency margin). |
| `components/visual_builder/types.ts` | Type definitions for block palette items, categories, node selection keys, and undo/redo history snapshots. |
| `lib/api.ts` | Frontend client interfaces and typed API methods for strategy versioning (`getWorkspaceStrategies`, `getStrategyDetails`, `getStrategyVersions`, `duplicateStrategy`), condition AST rules, and default fallback objects (`DEFAULT_ORB_SETTINGS`, `DEFAULT_TSL_SETTINGS`, `DEFAULT_BTST_SETTINGS`). |
| `app/page.tsx` | Main application shell routing with sidebar navigation, supporting bidirectional state synchronization (`sharedSpec`, `sharedStrategyId`) between AI Strategy Studio and Visual Strategy Builder. |
| `components/ai_studio/AiStrategyStudio.tsx` | Integrated "Open in Visual Builder" CTA button with active specification handoff. |

### 2.2 Backend Architecture (`services/api` & `packages`)

| Component / File | Role & Implementation Details |
|---|---|
| `services/api/routes/ai_studio.py` | Added REST endpoints: `GET /strategies` (list saved strategies with metadata), `GET /strategies/{strategy_id}` (fetch specific strategy and version spec), `GET /strategies/{strategy_id}/versions` (list immutable version audit trail), `POST /strategies/{strategy_id}/duplicate` (clone strategy into an editable draft with `(Copy)` naming). |
| `packages/strategy_spec/schema.py` | Canonical Pydantic strategy schema with first-class support for `call_entry_rules`, `put_entry_rules`, `call_exit_rules`, `put_exit_rules`, dynamic ORB price fields (`orb_high`, `orb_low`, `orb_midpoint`, `first_orb_candle_high`, `first_orb_candle_low`), bar offsets (`-50` to `0`), `ORBSettingsSpec`, and `TSLSettingsSpec`. |
| `packages/strategy_spec/evaluator.py` | Deterministic multi-group condition evaluator executing arbitrary nested Boolean trees, candle offsets, and dynamic opening range references without lookahead bias. |
| `services/api/services/validation_engine.py` | Deterministic 20-criteria validation engine enforcing schema correctness, non-future candle offsets, session boundaries, indicator parameter bounds, and pre-trade risk controls. |
| `tests/unit/test_visual_builder_sync.py` | Automated test suite validating visual builder creation, nested Boolean logic, BTST requirements, API duplication, versioning, and cross-workspace isolation. |

---

## 3. Implemented Block Palette

The palette is organized into 5 searchable categories:

### A. Strategy Context Blocks
- **Strategy Start**: Root trigger and execution lifecycle metadata.
- **Instrument & Exchange**: Supports NSE (Indices & Equities), BSE, and MCX (Commodities like CRUDEOIL, GOLD).
- **Trading Mode**: Toggle between Intraday (mandatory auto square-off) and BTST (overnight delivery holding with gap-risk protections).
- **Session Configuration**: Configurable regular market sessions (`09:15-15:30 IST` for equities/F&O; `09:00-23:30/23:55 IST` for MCX).
- **Opening Range (ORB)**: Session breakout parameters with calculation timeframe (`15m`), first-candle timeframe (`3m`), and re-entry limits.
- **Risk Management**: Capital allocation bounds, max open positions, and daily loss limits.

### B. Market Data Blocks
- **Open, High, Low, Close, Volume**: Standard OHLCV candle sources.
- **Typical Price**: `(H + L + C) / 3`.
- **Opening Range High (`orb_high`)**: Dynamically resolved high of the configured opening range window.
- **Opening Range Low (`orb_low`)**: Dynamically resolved low of the opening range window.
- **Opening Range Midpoint (`orb_midpoint`)**: `(orb_high + orb_low) / 2`.
- **First ORB Candle High/Low**: Initial reference boundary (e.g., first 3-minute candle).
- **Historical Candle Reference**: Bar offsets (`-1`, `-2`, `-3`).

### C. Indicator Blocks (Engine-Supported)
- **EMA (Exponential Moving Average)**: Periods 1-500, configurable price source.
- **SMA (Simple Moving Average)**: Periods 1-500.
- **RSI (Relative Strength Index)**: Periods 2-100, standard 30/70 or custom overbought/oversold levels.
- **Supertrend**: Period (1-100) and multiplier (0.5-10.0).
- **VWAP (Volume Weighted Average Price)**: Intraday session cumulative benchmark.
- **ATR (Average True Range)**: Volatility measure for dynamic trailing stops.
- **MACD**: Fast EMA, slow EMA, signal smoothing, and histogram.
- **Bollinger Bands**: Period, standard deviation multiplier, upper/middle/lower band outputs.

### D. Logic & Comparison Blocks
- **AND / OR Condition Groups**: Arbitrary nested groups with local Boolean precedence.
- **Comparison Operators**: `>` (Greater Than), `<` (Less Than), `>=` (Greater Than or Equal), `<=` (Less Than or Equal), `==` (Equal), `CROSSES_ABOVE` (Bullish crossover), `CROSSES_BELOW` (Bearish crossover).
- **Constant Value**: Numeric threshold comparison.

### E. Exit & Risk Blocks
- **Stop-Loss**: Fixed points, percentage, ATR multiplier, or ORB-based buffer.
- **Profit Target**: Fixed points, percentage, Risk:Reward multiple, or multi-leg targets.
- **Trailing Stop-Loss (TSL)**: Monotonic high-water ratchet with activation threshold and distance.
- **Intraday Square-off**: Mandatory intraday time exit (default `15:15 IST`).
- **Opposite-Signal Exit**: Automated position closure on reversal signal.
- **Daily Loss Limit**: Pre-trade circuit breaker halting further entries.

---

## 4. Multi-Group Condition Logic & Evaluation Semantics

### 4.1 Boolean Precedence
The Strategy Builder implements arbitrary nested condition trees with deterministic evaluation:
$$\text{Trigger} = \bigvee_{i=1}^m \left( \bigwedge_{j=1}^{n_i} C_{i, j} \right)$$
where each group $i$ evaluates its internal conditions using `AND` (or `OR`), and root groups are combined using `OR`.

### 4.2 Canonical ORB Example (CALL & PUT Entry)
- **CALL Entry Tree (`call_entry_rules`)**:
  - **Group A (Breakout of ORB High)**:
    - $C_{A1}$: $\text{Close}[t - 2] < \text{ORB High}$
    - **AND** $C_{A2}$: $\text{Close}[t - 1] > \text{ORB High}$
  - **OR Group B (Bounce from ORB Low)**:
    - $C_{B1}$: $\text{Close}[t - 2] < \text{ORB Low}$
    - **AND** $C_{B2}$: $\text{Close}[t - 1] > \text{ORB Low}$
- **PUT Entry Tree (`put_entry_rules`)**:
  - **Group A (Breakdown of ORB Low)**:
    - $C_{A1}$: $\text{Close}[t - 2] > \text{ORB Low}$
    - **AND** $C_{A2}$: $\text{Close}[t - 1] < \text{ORB Low}$
  - **OR Group B (Rejection from ORB High)**:
    - $C_{B1}$: $\text{Close}[t - 2] > \text{ORB High}$
    - **AND** $C_{B2}$: $\text{Close}[t - 1] < \text{ORB High}$

### 4.3 Candle Reference Offset Convention
- `0`: Current active candle (intrabar or completed close based on confirmation setting).
- `-1`: Immediately preceding closed candle.
- `-2`: Two candles prior.
- Positive offsets ($>0$) are strictly rejected by the validator to prevent lookahead bias.

---

## 5. Trailing Stop-Loss (TSL) Configuration

The dedicated TSL configuration block exposes:
- **Enabled / Disabled**: Binary toggle.
- **Activation Type**: `POINTS`, `PERCENTAGE`, or `R_MULTIPLE`.
- **Activation Value**: Favorable profit movement required before trailing begins (e.g., `20.0` points).
- **Trailing Distance Type**: `POINTS`, `PERCENTAGE`, or `ATR_MULTIPLIER`.
- **Trailing Distance Value**: Gap maintained behind the high-water mark (e.g., `10.0` points).
- **Monotonic High-Water Ratchet**: For Long positions, the stop moves strictly upward with peak favorable price and never loosens. For Short positions, it moves strictly downward with the low-water mark.
- **Plain-English Synthesis**:
  > *"Activate trailing stop after 20 points of favorable movement, then trail 10 points behind high-water mark monotonically."*

---

## 6. Intraday vs. BTST Configuration

- **Intraday Mode**:
  - Enforces entry cutoff (e.g. `14:30 IST`).
  - Mandatory auto square-off prior to session close (e.g. `15:15 IST`).
  - Strict prohibition against overnight margin carryforward.
- **BTST Mode**:
  - Requires explicit `gap_risk_acknowledged = True`.
  - Defines entry window in late session (e.g. `15:00 - 15:25 IST`).
  - Defines next-trading-day morning exit window (`09:15 - 09:30 IST`).
  - Validates underlying instrument eligibility (Cash equities or delivery-supported derivatives).

---

## 7. Strategy Persistence, Versioning & Synchronization

### Two-Way Studio Synchronization
- **AI Studio $\rightarrow$ Visual Builder**: When an AI-generated strategy is inspected, clicking "Open in Visual Builder" transfers the complete `StrategySpec` AST directly into the visual editor without data loss.
- **Visual Builder $\rightarrow$ AI Studio**: When edits are made in the Visual Builder, switching back to AI Studio provides the conversational assistant with the exact updated specification.
- **Conflict Prevention**: Save status indicates `Unsaved Changes` or `Saved` with an active version badge (`v1`, `v2`, etc.).

### REST Endpoints Added
- `GET /api/v1/workspaces/{workspace_id}/ai-studio/strategies`: Lists workspace strategies with version numbers and creation timestamps.
- `GET /api/v1/workspaces/{workspace_id}/ai-studio/strategies/{strategy_id}`: Retrieves strategy specification for a specific version or latest draft.
- `GET /api/v1/workspaces/{workspace_id}/ai-studio/strategies/{strategy_id}/versions`: Returns immutable version audit history.
- `POST /api/v1/workspaces/{workspace_id}/ai-studio/strategies/{strategy_id}/duplicate`: Clones strategy into a new draft with `(Copy)` name.

---

## 8. Verification & Test Outcomes

### 8.1 Backend Automated Tests (Pytest)
Command executed:
```bash
./.venv/bin/pytest tests/ -v
```
**Outcome: 66 passed, 0 failed in 19.57s.**

Test coverage highlights:
- `tests/unit/test_visual_builder_sync.py`:
  - `test_visual_builder_canonical_schema_parity`: **PASSED** (Validated visual spec conforms to canonical schema with 0 errors).
  - `test_visual_builder_evaluation_nested_and_or`: **PASSED** (Verified `(A1 AND A2) OR (B1 AND B2)` deterministic evaluation).
  - `test_visual_builder_btst_validation`: **PASSED** (Verified rejection of unacknowledged gap risk in BTST mode).
  - `test_visual_builder_api_endpoints_and_duplication`: **PASSED** (Verified strategy listing, fetching, version history, duplication, and workspace isolation).
- `tests/unit/test_multigroup_rule_evaluator.py`: **7/7 PASSED**.
- `tests/unit/test_validation_engine_comprehensive.py`: **10/10 PASSED**.
- `tests/integration/test_ai_studio_api.py`: **2/2 PASSED**.
- `tests/security/test_workspace_isolation.py`: **2/2 PASSED**.

### 8.2 Frontend Static Analysis & Next.js Build
Commands executed:
```bash
# TypeScript Type Check
npx tsc --noEmit
# Production Build
npm run build
```
**Outcome:**
- `npx tsc --noEmit`: **0 errors** (all 16 previous spread and typing issues resolved).
- `npm run build`: **Compiled successfully**; static pages and optimized bundles generated without warnings.

---

## 9. Operating Constraints & Production Safety

- `LIVE_TRADING_ENABLED=false` remains strictly enforced throughout the codebase.
- Broker execution adapters simulate orders safely in paper trading and backtesting environments; no real money capital is exposed.
- All UI actions (save draft, duplicate, validate, backtest, paper trade) connect directly to verified backend REST endpoints without mock stubs.
