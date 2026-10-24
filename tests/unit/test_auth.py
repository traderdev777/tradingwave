"""Unit tests for authentication service, password hashing, and token handling."""

import uuid
from datetime import timedelta

import pytest

from packages.shared_types.errors import TradingWaveError
from services.api.services.auth_service import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_password_hashing_and_verification():
    """Verify that passwords are securely hashed with bcrypt and verifiable."""
    raw_password = "SuperSecretPassword123!"
    hashed = hash_password(raw_password)

    assert hashed != raw_password
    assert hashed.startswith("$2b$")
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword999", hashed) is False


def test_jwt_token_creation_and_decoding():
    """Verify that JWT tokens encode user UUID and decode correctly."""
    user_id = uuid.uuid4()
    token, expires_in = create_access_token(user_id)

    assert isinstance(token, str)
    assert len(token) > 20
    assert expires_in == 1440

    decoded_id = decode_access_token(token)
    assert decoded_id == user_id


def test_expired_token_raises_unauthenticated():
    """Verify that an expired token is rejected with 401 UNAUTHENTICATED."""
    user_id = uuid.uuid4()
    # Expired 5 minutes ago
    token, _ = create_access_token(user_id, expires_delta=timedelta(minutes=-5))

    with pytest.raises(TradingWaveError) as exc_info:
        decode_access_token(token)

    assert exc_info.value.code == "UNAUTHENTICATED"
    assert exc_info.value.status_code == 401


def test_tampered_token_is_rejected():
    """Verify that tampering with token signature triggers validation failure."""
    user_id = uuid.uuid4()
    token, _ = create_access_token(user_id)
    tampered_token = token[:-4] + "AAAA"

    with pytest.raises(TradingWaveError) as exc_info:
        decode_access_token(tampered_token)

    assert exc_info.value.code == "UNAUTHENTICATED"
