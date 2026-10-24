"""Database connection and session management for TradingWave."""

import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from services.api.config import get_settings

settings = get_settings()

database_url = settings.DATABASE_URL
use_sqlite = (
    settings.APP_ENV == "test" or os.environ.get("USE_SQLITE_FALLBACK", "false").lower() == "true"
)

if use_sqlite:
    database_url = "sqlite:///./storage/tradingwave_dev.db"
elif database_url.startswith("postgresql://"):
    # SQLAlchemy 2 defaults to psycopg3; ensure psycopg2-binary compatibility
    database_url = database_url.replace("postgresql://", "postgresql+psycopg2://", 1)

connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}

engine = create_engine(
    database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency that provides a transactional database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
