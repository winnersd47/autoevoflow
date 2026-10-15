from __future__ import annotations

from typing import Annotated, Any

import httpx
import structlog
from authlib.integrations.starlette_client import OAuth, OAuthError
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import CurrentUser, DBSession, CacheClient
from app.core.security import (
    TOKEN_TYPE_REFRESH,
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
    verify_oauth_state_token,
    create_oauth_state_token,
    verify_refresh_token,
)
from app.db.postgresql.models import OAuthProvider, User, UserRole

logger = structlog.get_logger(__name__)
router = APIRouter()

# ── OAuth2 setup ──────────────────────────────────────────────────────────────

oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)
oauth.register(
    name="github",
    client_id=settings.GITHUB_CLIENT_ID,
    client_secret=settings.GITHUB_CLIENT_SECRET,
    access_token_url="https://github.com/login/oauth/access_token",
    authorize_url="https://github.com/login/oauth/authorize",
    api_base_url="https://api.github.com/",
    client_kwargs={"scope": "read:user user:email"},
)


# ── Schemas ───────────────────────────────────────────────────────────────────


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    name: str | None = Field(None, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserProfileResponse(BaseModel):
    id: int
    email: str
    name: str | None
    avatar_url: str | None
    role: UserRole
    oauth_provider: OAuthProvider

    class Config:
        from_attributes = True


class UpdateProfileRequest(BaseModel):
    name: str | None = Field(None, max_length=255)
    avatar_url: str | None = Field(None, max_length=2048)


# ── Helpers ───────────────────────────────────────────────────────────────────

REFRESH_TOKEN_BLACKLIST_PREFIX = "blacklist:refresh:"


async def _blacklist_token(jti: str, cache: Any) -> None:
    ttl = settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
    try:
        await cache.set(f"{REFRESH_TOKEN_BLACKLIST_PREFIX}{jti}", "1", ttl=ttl)
    except Exception:
        # Redis unavailable (e.g. no local virtualization) — logout still
        # succeeds client-side (cookies get cleared regardless); the token
        # just won't be server-side revoked until it expires naturally.
        logger.warning("Could not blacklist refresh token — Redis unavailable", jti=jti)


async def _is_token_blacklisted(jti: str, cache: Any) -> bool:
    try:
        return await cache.exists(f"{REFRESH_TOKEN_BLACKLIST_PREFIX}{jti}")
    except Exception:
        logger.warning("Could not check refresh token blacklist — Redis unavailable", jti=jti)
        return False


def _build_token_pair(user: User) -> TokenResponse:
    extra = {"role": user.role.value}
    access = create_access_token(str(user.id), extra_claims=extra)
    refresh = create_refresh_token(str(user.id), extra_claims=extra)
    return TokenResponse(access_token=access, refresh_token=refresh)


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: DBSession) -> TokenResponse:
    """Create a new local account and return JWT token pair."""
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        name=body.name,
        role=UserRole.user,
        oauth_provider=OAuthProvider.local,
        is_active=True,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    logger.info("user_registered", user_id=user.id, email=user.email)
    return _build_token_pair(user)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: DBSession) -> TokenResponse:
    """Authenticate with email/password and return JWT token pair."""
    result = await db.execute(select(User).where(User.email == body.email))
    user: User | None = result.scalar_one_or_none()

    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account disabled",
        )
    logger.info("user_login", user_id=user.id)
    return _build_token_pair(user)


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh_token(body: RefreshRequest, cache: CacheClient) -> AccessTokenResponse:
    """Exchange a valid refresh token for a new access token."""
    token_payload = verify_refresh_token(body.refresh_token)

    if await _is_token_blacklisted(token_payload.jti, cache):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked",
        )

    extra = {"role": token_payload.role} if token_payload.role else {}
    new_access = create_access_token(token_payload.sub, extra_claims=extra)
    return AccessTokenResponse(access_token=new_access)


@router.get("/me", response_model=UserProfileResponse)
async def get_me(current_user: CurrentUser) -> UserProfileResponse:
    """Return the current user's profile."""
    return UserProfileResponse.model_validate(current_user)


@router.put("/me", response_model=UserProfileResponse)
async def update_me(
    body: UpdateProfileRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> UserProfileResponse:
    """Update name and/or avatar for the current user."""
    if body.name is not None:
        current_user.name = body.name
    if body.avatar_url is not None:
        current_user.avatar_url = body.avatar_url
    db.add(current_user)
    await db.flush()
    await db.refresh(current_user)
    return UserProfileResponse.model_validate(current_user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def logout(body: RefreshRequest, cache: CacheClient) -> None:
    """Blacklist the provided refresh token."""
    try:
        token_payload = verify_refresh_token(body.refresh_token)
        await _blacklist_token(token_payload.jti, cache)
    except HTTPException:
        pass  # Already expired or invalid — treat as logged out


# ── Google OAuth2 ─────────────────────────────────────────────────────────────


@router.get("/google")
async def google_login(request: Request) -> RedirectResponse:
    """Redirect to Google OAuth2 consent screen."""
    state = create_oauth_state_token("google")
    redirect_uri = settings.GOOGLE_REDIRECT_URI
    return await oauth.google.authorize_redirect(request, redirect_uri, state=state)  # type: ignore[attr-defined]


@router.get("/google/callback", response_model=TokenResponse)
async def google_callback(request: Request, db: DBSession) -> TokenResponse:
    """Handle Google OAuth2 callback and return JWT tokens."""
    state = request.query_params.get("state", "")
    if not verify_oauth_state_token(state, "google"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state")

    try:
        token = await oauth.google.authorize_access_token(request)  # type: ignore[attr-defined]
    except OAuthError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    user_info = token.get("userinfo") or {}
    google_id = user_info.get("sub")
    email = user_info.get("email")

    if not google_id or not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incomplete Google profile")

    result = await db.execute(
        select(User).where(User.oauth_provider == OAuthProvider.google, User.oauth_id == google_id)
    )
    user: User | None = result.scalar_one_or_none()

    if user is None:
        # Check if email already exists (link accounts)
        email_result = await db.execute(select(User).where(User.email == email))
        user = email_result.scalar_one_or_none()

    if user is None:
        user = User(
            email=email,
            name=user_info.get("name"),
            avatar_url=user_info.get("picture"),
            oauth_provider=OAuthProvider.google,
            oauth_id=google_id,
            role=UserRole.user,
            is_active=True,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
        logger.info("google_user_created", user_id=user.id, email=user.email)
    else:
        user.oauth_provider = OAuthProvider.google
        user.oauth_id = google_id
        if not user.avatar_url and user_info.get("picture"):
            user.avatar_url = user_info["picture"]
        db.add(user)

    return _build_token_pair(user)


# ── GitHub OAuth2 ─────────────────────────────────────────────────────────────


@router.get("/github")
async def github_login(request: Request) -> RedirectResponse:
    """Redirect to GitHub OAuth2 consent screen."""
    state = create_oauth_state_token("github")
    redirect_uri = settings.GITHUB_REDIRECT_URI
    return await oauth.github.authorize_redirect(request, redirect_uri, state=state)  # type: ignore[attr-defined]


@router.get("/github/callback", response_model=TokenResponse)
async def github_callback(request: Request, db: DBSession) -> TokenResponse:
    """Handle GitHub OAuth2 callback and return JWT tokens."""
    state = request.query_params.get("state", "")
    if not verify_oauth_state_token(state, "github"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state")

    try:
        token = await oauth.github.authorize_access_token(request)  # type: ignore[attr-defined]
    except OAuthError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {token['access_token']}"}
        profile_resp = await client.get("https://api.github.com/user", headers=headers)
        profile_resp.raise_for_status()
        profile = profile_resp.json()

        emails_resp = await client.get("https://api.github.com/user/emails", headers=headers)
        emails_resp.raise_for_status()
        emails = emails_resp.json()

    primary_email = next(
        (e["email"] for e in emails if e.get("primary") and e.get("verified")),
        profile.get("email"),
    )
    if not primary_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verified email on GitHub account",
        )

    github_id = str(profile["id"])

    result = await db.execute(
        select(User).where(User.oauth_provider == OAuthProvider.github, User.oauth_id == github_id)
    )
    user: User | None = result.scalar_one_or_none()

    if user is None:
        email_result = await db.execute(select(User).where(User.email == primary_email))
        user = email_result.scalar_one_or_none()

    if user is None:
        user = User(
            email=primary_email,
            name=profile.get("name") or profile.get("login"),
            avatar_url=profile.get("avatar_url"),
            oauth_provider=OAuthProvider.github,
            oauth_id=github_id,
            role=UserRole.user,
            is_active=True,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
        logger.info("github_user_created", user_id=user.id, email=user.email)
    else:
        user.oauth_provider = OAuthProvider.github
        user.oauth_id = github_id
        if not user.avatar_url and profile.get("avatar_url"):
            user.avatar_url = profile["avatar_url"]
        db.add(user)

    return _build_token_pair(user)
