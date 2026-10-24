"""Shared pytest configuration and test fixtures for TradingWave."""

import os

import pytest
from fastapi.testclient import TestClient

# Ensure test environment settings are active
os.environ["APP_ENV"] = "test"
os.environ["LIVE_TRADING_ENABLED"] = "false"
os.environ["SEBI_COMPLIANCE_GATE_ACTIVE"] = "true"
os.environ["STORAGE_LOCAL_ROOT"] = "./storage"

from services.api.config import get_settings
from services.api.main import app


@pytest.fixture(autouse=True)
def reset_settings_cache():
    """Clear cached settings before each test."""
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def client() -> TestClient:
    """Create test client for FastAPI application."""
    return TestClient(app)
