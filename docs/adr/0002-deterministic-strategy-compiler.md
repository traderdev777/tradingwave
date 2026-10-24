# ADR-0002: Deterministic Strategy Specification & Canonical AST Hashing

## Status
Accepted

## Context
In quantitative trading, backtests and simulations must be 100% reproducible. In addition, when AI models generate strategy suggestions or users modify nodes visually, slight ordering variations in JSON keys or parameter formatting could produce spurious differences, cache misses, or non-deterministic executions.

Furthermore, published strategies must be immutable for audit and compliance purposes.

## Decision
1. We define a strict, typed strategy schema in `packages/strategy_spec` using Pydantic v2.
2. All strategies undergo a deterministic compilation pipeline:
   - Schema validation and boundary range verification.
   - Indicator identifier resolution and cycle detection (Directed Acyclic Graph check).
   - Normalization into a canonical Abstract Syntax Tree (AST) where dictionary keys and condition arrays are deterministically sorted.
   - Generation of a canonical SHA-256 hash (`specification_hash`).
3. Strategy versions are stored as immutable records (`strategy_versions` table). A change in logic always yields a new version with a new hash.
4. The backtest engine and paper-trading runtime consume only the compiled canonical AST.

## Consequences
### Positive
- Strict reproducibility: Identical data + identical specification hash = identical backtest results.
- AI drafts cannot bypass schema rules; invalid models are rejected before reaching database persistence.
- Eliminates look-ahead bias and cyclic execution loops at compile time.

### Negative / Trade-offs
- Additional validation step on every save and execution.
- Visual editor state must map cleanly to/from canonical AST without losing visual positioning.
