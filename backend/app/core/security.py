from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import ExpiredSignatureError, JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# ── Password hashing ──────────────────────────────────────────────────────────

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── OAuth2 scheme ─────────────────────────────────────────────────────────────

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",
    scheme_name="JWT",
)

# ── Token types ───────────────────────────────────────────────────────────────

TOKEN_TYPE_ACCESS = "access"
TOKEN_TYPE_REFRESH = "refresh"

# ── Helpers ───────────────────────────────────────────────────────────────────


def hash_password(plain_password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against its bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


# ── Token creation ────────────────────────────────────────────────────────────


def _build_token(
    subject: str,
    token_type: str,
    extra_claims: dict[str, Any] | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    now = datetime.now(tz=timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=15))

    payload: dict[str, Any] = {
        "sub": str(subject),
        "iat": now,
        "exp": expire,
        "type": token_type,
        "jti": f"{token_type}_{subject}_{int(now.timestamp())}",
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_access_token(
    subject: str,
    extra_claims: dict[str, Any] | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a short-lived JWT access token."""
    delta = expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return _build_token(subject, TOKEN_TYPE_ACCESS, extra_claims, delta)


def create_refresh_token(
    subject: str,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    """Create a long-lived JWT refresh token."""
    delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return _build_token(subject, TOKEN_TYPE_REFRESH, extra_claims, delta)


# ── Token verification ────────────────────────────────────────────────────────


class TokenPayload:
    __slots__ = ("sub", "token_type", "exp", "iat", "jti", "role")

    def __init__(
        self,
        sub: str,
        token_type: str,
        exp: datetime,
        iat: datetime,
        jti: str,
        role: str | None = None,
    ) -> None:
        self.sub = sub
        self.token_type = token_type
        self.exp = exp
        self.iat = iat
        self.jti = jti
        self.role = role


def verify_token(token: str, expected_type: str = TOKEN_TYPE_ACCESS) -> TokenPayload:
    """
    Decode and validate a JWT.  Raises HTTP 401 on any failure.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        raise credentials_exception

    sub: str | None = payload.get("sub")
    token_type: str | None = payload.get("type")

    if sub is None or token_type != expected_type:
        raise credentials_exception

    exp_ts: int | None = payload.get("exp")
    iat_ts: int | None = payload.get("iat")
    if exp_ts is None or iat_ts is None:
        raise credentials_exception

    return TokenPayload(
        sub=sub,
        token_type=token_type,
        exp=datetime.fromtimestamp(exp_ts, tz=timezone.utc),
        iat=datetime.fromtimestamp(iat_ts, tz=timezone.utc),
        jti=payload.get("jti", ""),
        role=payload.get("role"),
    )


def verify_refresh_token(token: str) -> TokenPayload:
    """Convenience wrapper for refresh-token validation."""
    return verify_token(token, expected_type=TOKEN_TYPE_REFRESH)


# ── OAuth state helper ────────────────────────────────────────────────────────


def create_oauth_state_token(provider: str) -> str:
    """Create a short-lived token to protect OAuth2 state parameter."""
    delta = timedelta(minutes=10)
    return _build_token(
        subject=f"oauth_state_{provider}",
        token_type="oauth_state",
        extra_claims={"provider": provider},
        expires_delta=delta,
    )


def verify_oauth_state_token(token: str, provider: str) -> bool:
    """Validate the OAuth2 state token returned by the provider."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return (
            payload.get("type") == "oauth_state"
            and payload.get("provider") == provider
        )
    except JWTError:
        return False
