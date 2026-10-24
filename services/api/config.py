"""Configuration and Environment Settings for TradingWave API Gateway."""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable fallbacks."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Core Application Settings
    APP_ENV: Literal["development", "test", "staging", "production"] = "development"
    APP_NAME: str = "TradingWave"
    API_V1_PREFIX: str = "/api/v1"
    LOG_LEVEL: str = "INFO"

    # Security & Tokens
    SECRET_KEY: str = Field(
        default="development_insecure_secret_key_32_bytes_min_length_placeholder",
        description="Master secret key for token signing and encryption",
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Database
    DATABASE_URL: str = Field(
        default="postgresql://tradingwave:tradingwave_secret@localhost:5432/tradingwave_dev",
        description="Synchronous database connection string (Alembic / sync tasks)",
    )
    ASYNC_DATABASE_URL: str = Field(
        default="postgresql+asyncpg://tradingwave:tradingwave_secret@localhost:5432/tradingwave_dev",
        description="Async database connection string for FastAPI async engine",
    )

    # Cache & Task Queue
    REDIS_URL: str = "redis://localhost:6379/0"

    # Storage
    STORAGE_DRIVER: Literal["local", "s3"] = "local"
    STORAGE_LOCAL_ROOT: str = "./storage"

    # LLM Settings
    LLM_PROVIDER: str = "openai"
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4o"
    LLM_TEMPERATURE: float = 0.0
    LLM_TIMEOUT_SECONDS: int = 30

    # Regulatory & Operational Hard Gates (SEBI Indian Market Compliance)
    # LIVE TRADING MUST DEFAULT TO FALSE
    LIVE_TRADING_ENABLED: bool = Field(
        default=False,
        description="Master kill-switch gate for real-money broker order routing",
    )
    SEBI_COMPLIANCE_GATE_ACTIVE: bool = True
    EMERGENCY_KILL_SWITCH_ACTIVE: bool = False


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings singleton."""
    return Settings()
