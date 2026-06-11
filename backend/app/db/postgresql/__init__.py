"""
PostgreSQL async database package.

Exports:
    Base                 SQLAlchemy DeclarativeBase (from models)
    engine               AsyncEngine instance
    async_session_maker  async_sessionmaker factory
    get_db               FastAPI dependency that yields an AsyncSession
"""

from app.db.postgresql.database import engine, async_session_factory, init_db, close_db
from app.db.postgresql.models import Base

from sqlalchemy.ext.asyncio import AsyncSession
from typing import AsyncGenerator


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI / dependency-injection compatible async session generator.

    Usage::

        @router.get("/items")
        async def list_items(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# Convenience alias so callers can do:
#   from app.db.postgresql import async_session_maker
async_session_maker = async_session_factory

__all__ = [
    "Base",
    "engine",
    "async_session_maker",
    "async_session_factory",
    "get_db",
    "init_db",
    "close_db",
]
