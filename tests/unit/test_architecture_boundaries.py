"""Unit tests enforcing architectural boundaries and monorepo structure integrity."""

import ast
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


def test_repository_core_directories_exist():
    """Verify that all architectural directories mandated by the blueprint exist."""
    required_paths = [
        ROOT_DIR / "apps" / "web",
        ROOT_DIR / "services" / "api",
        ROOT_DIR / "services" / "strategy_engine",
        ROOT_DIR / "services" / "backtest_worker",
        ROOT_DIR / "services" / "paper_trading",
        ROOT_DIR / "services" / "broker_adapters",
        ROOT_DIR / "packages" / "strategy_spec",
        ROOT_DIR / "packages" / "indicator_library",
        ROOT_DIR / "packages" / "shared_types",
        ROOT_DIR / "docs" / "adr",
        ROOT_DIR / "tests" / "unit",
        ROOT_DIR / "tests" / "integration",
        ROOT_DIR / "tests" / "security",
        ROOT_DIR / "tests" / "backtesting",
        ROOT_DIR / "infrastructure" / "docker",
    ]

    for p in required_paths:
        assert p.is_dir(), f"Required architectural directory is missing: {p.relative_to(ROOT_DIR)}"


def test_core_docs_exist():
    """Verify that all core design and compliance documents exist."""
    required_docs = [
        ROOT_DIR / "README.md",
        ROOT_DIR / "docs" / "architecture.md",
        ROOT_DIR / "docs" / "security.md",
        ROOT_DIR / "docs" / "api-contracts.md",
        ROOT_DIR / "docs" / "compliance-gates.md",
        ROOT_DIR / "docs" / "operations-runbook.md",
        ROOT_DIR / "docs" / "adr" / "0001-monorepo-modular-monolith.md",
        ROOT_DIR / "docs" / "adr" / "0002-deterministic-strategy-compiler.md",
        ROOT_DIR / "docs" / "adr" / "0003-isolation-of-simulation-and-execution.md",
        ROOT_DIR / "docs" / "adr" / "0004-sebi-regulatory-gating-architecture.md",
        ROOT_DIR / "docs" / "adr" / "0005-multi-tenant-isolation-and-audit.md",
    ]

    for doc in required_docs:
        assert doc.is_file(), f"Required doc file missing: {doc.relative_to(ROOT_DIR)}"


def test_backtest_worker_does_not_import_broker_adapters():
    """Enforce architectural isolation: simulation workers must not import broker modules."""
    worker_dir = ROOT_DIR / "services" / "backtest_worker"
    for py_file in worker_dir.glob("**/*.py"):
        tree = ast.parse(py_file.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    assert "broker_adapters" not in alias.name, (
                        f"Architecture violation: {py_file} imports '{alias.name}'. "
                        "Backtest workers must be isolated from broker execution!"
                    )
            elif isinstance(node, ast.ImportFrom) and node.module:
                assert "broker_adapters" not in node.module, (
                    f"Architecture violation: {py_file} imports from '{node.module}'. "
                    "Backtest workers must be isolated from broker execution!"
                )
