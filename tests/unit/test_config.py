"""Unit tests verifying environment settings and safety defaults."""

from services.api.config import Settings


def test_default_safety_flags():
    """Verify that live trading is strictly disabled by default."""
    settings = Settings()
    assert settings.LIVE_TRADING_ENABLED is False, "LIVE_TRADING_ENABLED must default to False"
    assert settings.SEBI_COMPLIANCE_GATE_ACTIVE is True, (
        "SEBI_COMPLIANCE_GATE_ACTIVE must default to True"
    )
    assert settings.EMERGENCY_KILL_SWITCH_ACTIVE is False


def test_environment_override():
    """Verify that environment variables cleanly override defaults."""
    custom_settings = Settings(
        APP_NAME="TradingWaveTest",
        LOG_LEVEL="DEBUG",
        LIVE_TRADING_ENABLED=False,
    )
    assert custom_settings.APP_NAME == "TradingWaveTest"
    assert custom_settings.LOG_LEVEL == "DEBUG"
    assert custom_settings.LIVE_TRADING_ENABLED is False
