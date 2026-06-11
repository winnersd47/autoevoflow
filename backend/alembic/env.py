from __future__ import annotations

import asyncio
import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import configure_mappers

# ── Add project root to sys.path ──────────────────────────────────────────────
# This allows `from app.xxx import yyy` imports during migrations.

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# ── Import all models so Alembic can detect them for autogenerate ─────────────

from app.db.postgresql.models import (  # noqa: F401, E402
    Base,
    Brand,
    CarModel,
    Generation,
    Trim,
    VehicleImage,
    SourceMapping,
    CrawlerJob,
    AIAnalysis,
    User,
    EmbeddingRegistry,
)

# Ensure all mappers are configured before autogenerate inspection
configure_mappers()

# ── Alembic config ────────────────────────────────────────────────────────────

config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata for autogenerate support
target_metadata = Base.metadata


def get_url() -> str:
    """
    Resolve the database URL, preferring the DATABASE_URL environment variable
    over the value in alembic.ini. Always returns an asyncpg URL.
    """
    url = os.environ.get("DATABASE_URL") or config.get_main_option("sqlalchemy.url", "")
    # Normalise to asyncpg driver
    url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


# ── Offline migrations ────────────────────────────────────────────────────────


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.

    This configures the context with just a URL and not an Engine.
    Calls to context.execute() emit the given string to the script output.
    """
    url = get_url()
    # Offline mode uses the sync URL (no asyncpg driver)
    sync_url = url.replace("postgresql+asyncpg://", "postgresql://")

    context.configure(
        url=sync_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


# ── Online migrations (async) ─────────────────────────────────────────────────


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
        # Include schemas if needed
        include_schemas=False,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode using an async engine.
    """
    url = get_url()
    connectable = create_async_engine(
        url,
        poolclass=pool.NullPool,
        future=True,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


# ── Entry point ───────────────────────────────────────────────────────────────

if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
