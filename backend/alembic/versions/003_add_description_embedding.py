"""Add description_embedding (1536-dim) to generations for text-based similarity search.

Revision ID: 003
Revises: 002
Create Date: 2026-09-28
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector

revision: str = "003"
down_revision: str | None = "002"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "generations",
        sa.Column("description_embedding", Vector(1536), nullable=True),
    )
    op.execute(
        """
        CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_generations_description_embedding
        ON generations
        USING hnsw (description_embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_generations_description_embedding")
    op.drop_column("generations", "description_embedding")
