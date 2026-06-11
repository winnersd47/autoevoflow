from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Annotated

import structlog
from fastapi import Depends, HTTPException, status
from neo4j import AsyncDriver
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import oauth2_scheme, verify_token
from app.db.postgresql.database import async_session_factory
from app.db.redis.cache import RedisCache
from app.db.neo4j.graph import Neo4jGraph

logger = structlog.get_logger(__name__)

# ── Database session ──────────────────────────────────────────────────────────


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async SQLAlchemy session, rolling back on exception."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ── Redis ─────────────────────────────────────────────────────────────────────


async def get_redis() -> AsyncGenerator[RedisCache, None]:
    """Yield a RedisCache wrapper (uses the module-level pool)."""
    from app.db.redis.cache import redis_cache
    yield redis_cache


# ── Neo4j ─────────────────────────────────────────────────────────────────────


async def get_neo4j() -> AsyncGenerator[Neo4jGraph, None]:
    """Yield the Neo4jGraph wrapper (module-level driver)."""
    from app.db.neo4j.graph import neo4j_graph
    yield neo4j_graph


# ── Type aliases for injection ────────────────────────────────────────────────

DBSession = Annotated[AsyncSession, Depends(get_db)]
CacheClient = Annotated[RedisCache, Depends(get_redis)]
GraphClient = Annotated[Neo4jGraph, Depends(get_neo4j)]

# ── Current user ──────────────────────────────────────────────────────────────


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: DBSession,
) -> "User":  # type: ignore[name-defined]  # circular import guard
    """Validate JWT and return the active user."""
    from app.db.postgresql.models import User
    from sqlalchemy import select

    token_payload = verify_token(token)

    try:
        user_id = int(token_payload.sub)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    return user


async def get_current_user_optional(
    token: Annotated[str | None, Depends(oauth2_scheme)] = None,
    db: DBSession = Depends(get_db),
) -> "User | None":  # type: ignore[name-defined]
    """Return the current user or None if no token is provided."""
    if token is None:
        return None
    try:
        return await get_current_user(token=token, db=db)
    except HTTPException:
        return None


# ── Role guards ───────────────────────────────────────────────────────────────


async def require_admin(
    current_user: Annotated["User", Depends(get_current_user)],  # type: ignore[name-defined]
) -> "User":  # type: ignore[name-defined]
    """Require the current user to have the 'admin' role."""
    from app.db.postgresql.models import UserRole

    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required",
        )
    return current_user


async def require_premium(
    current_user: Annotated["User", Depends(get_current_user)],  # type: ignore[name-defined]
) -> "User":  # type: ignore[name-defined]
    """Require the current user to have 'premium' or 'admin' role."""
    from app.db.postgresql.models import UserRole

    if current_user.role not in {UserRole.premium, UserRole.admin}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Premium subscription required",
        )
    return current_user


# ── Annotated dependency aliases ──────────────────────────────────────────────

CurrentUser = Annotated["User", Depends(get_current_user)]  # type: ignore[name-defined]
OptionalUser = Annotated["User | None", Depends(get_current_user_optional)]  # type: ignore[name-defined]
AdminUser = Annotated["User", Depends(require_admin)]  # type: ignore[name-defined]
PremiumUser = Annotated["User", Depends(require_premium)]  # type: ignore[name-defined]
