import { StrategySpec } from "../../lib/api";

export type PaletteBlockCategory =
  | "strategy"
  | "market_data"
  | "indicators"
  | "logic"
  | "exit_risk";

export interface PaletteBlockItem {
  id: string;
  name: string;
  category: PaletteBlockCategory;
  iconName: string;
  badge?: string;
  description: string;
  isUnsupported?: boolean;
  unsupportedReason?: string;
  blockType:
    | "strategy_start"
    | "instrument"
    | "trading_mode"
    | "session_config"
    | "opening_range"
    | "entry_section"
    | "exit_section"
    | "risk_management"
    | "market_source"
    | "indicator"
    | "and_group"
    | "or_group"
    | "condition"
    | "stop_loss"
    | "profit_target"
    | "trailing_stop"
    | "intraday_squareoff"
    | "btst_overnight";
  payload?: any;
}

export type SelectedNodeType =
  | { type: "strategy_header" }
  | { type: "trading_mode" }
  | { type: "orb_settings" }
  | {
      type: "condition_rule";
      treeKey: "call_entry_rules" | "put_entry_rules" | "call_exit_rules" | "put_exit_rules";
      groupIndex: number;
      ruleIndex: number;
      ruleId: string;
    }
  | {
      type: "condition_group";
      treeKey: "call_entry_rules" | "put_entry_rules" | "call_exit_rules" | "put_exit_rules";
      groupIndex: number;
      groupId: string;
    }
  | { type: "exit_rules" }
  | { type: "tsl_settings" }
  | { type: "risk_limits" }
  | { type: "position_sizing" }
  | { type: "indicator"; indicatorId: string };

export interface HistoryState {
  past: StrategySpec[];
  present: StrategySpec;
  future: StrategySpec[];
}
