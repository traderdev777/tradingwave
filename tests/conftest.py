"""Shared pytest configuration and test fixtures for TradingWave."""

import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

# Ensure test environment settings are active
os.environ["APP_ENV"] = "test"
os.environ["LIVE_TRADING_ENABLED"] = "false"
os.environ["SEBI_COMPLIANCE_GATE_ACTIVE"] = "true"
os.environ["STORAGE_LOCAL_ROOT"] = "./storage"

from services.api.config import get_settings
from services.api.database import Base, get_db
from services.api.main import app

# Isolated SQLite test database
TEST_DB_PATH = "./storage/test_tradingwave.db"
test_engine = create_engine(
    f"sqlite:///{TEST_DB_PATH}",
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(autouse=True)
def reset_settings_cache():
    """Clear cached settings before each test."""
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture(autouse=True)
def setup_test_db() -> Generator[None, None, None]:
    """Create all tables before each test and drop them after."""
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """Provide transactional session bound to test database."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """Create test client with overridden database dependency."""

    def override_get_db() -> Generator[Session, None, None]:
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
