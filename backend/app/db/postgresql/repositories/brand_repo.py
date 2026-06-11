from __future__ import annotations

from typing import Any, Sequence

import structlog
from pgvector.sqlalchemy import Vector
from sqlalchemy import Select, and_, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.db.postgresql.models import Brand, CarModel

logger = structlog.get_logger(__name__)


class BrandRepository:
    """Async repository for Brand CRUD and vector search operations."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # ── Queries ───────────────────────────────────────────────────────────────

    async def get_by_id(self, brand_id: int) -> Brand | None:
        result = await self._session.get(Brand, brand_id)
        return result

    async def get_by_slug(self, slug: str) -> Brand | None:
        stmt = select(Brand).where(Brand.slug == slug)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_with_models(self, brand_id: int) -> Brand | None:
        stmt = (
            select(Brand)
            .options(joinedload(Brand.models))
            .where(Brand.id == brand_id)
        )
        result = await self._session.execute(stmt)
        return result.unique().scalar_one_or_none()

    async def get_with_embeddings(self, brand_id: int) -> Brand | None:
        """Return a brand with the dna_embedding loaded (not deferred)."""
        stmt = select(Brand).where(Brand.id == brand_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_with_filters(
        self,
        *,
        country: str | None = None,
        search: str | None = None,
        founded_year_min: int | None = None,
        founded_year_max: int | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[Sequence[Brand], int]:
        """Return a paginated list of brands and the total count."""
        conditions: list[Any] = []

        if country:
            conditions.append(Brand.country == country)
        if search:
            conditions.append(
                or_(
                    Brand.name.ilike(f"%{search}%"),
                    Brand.description.ilike(f"%{search}%"),
                )
            )
        if founded_year_min is not None:
            conditions.append(Brand.founded_year >= founded_year_min)
        if founded_year_max is not None:
            conditions.append(Brand.founded_year <= founded_year_max)

        base_stmt: Select[tuple[Brand]] = select(Brand)
        if conditions:
            base_stmt = base_stmt.where(and_(*conditions))

        # Total count
        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        total: int = (await self._session.execute(count_stmt)).scalar_one()

        # Paginated rows
        rows_stmt = base_stmt.order_by(Brand.name.asc()).offset(offset).limit(limit)
        rows = (await self._session.execute(rows_stmt)).scalars().all()

        return rows, total

    # ── Vector search ─────────────────────────────────────────────────────────

    async def search_by_vector(
        self,
        embedding: list[float],
        limit: int = 10,
        min_score: float = 0.0,
    ) -> list[tuple[Brand, float]]:
        """
        Find brands whose dna_embedding is closest (cosine distance) to *embedding*.
        Returns (brand, similarity_score) pairs.
        """
        # 1 - cosine_distance == cosine_similarity
        distance_expr = Brand.dna_embedding.cosine_distance(embedding)

        stmt = (
            select(Brand, (1 - distance_expr).label("similarity"))
            .where(Brand.dna_embedding.is_not(None))
            .order_by(distance_expr.asc())
            .limit(limit)
        )

        result = await self._session.execute(stmt)
        rows = result.all()
        return [(brand, float(sim)) for brand, sim in rows if float(sim) >= min_score]

    # ── Mutations ─────────────────────────────────────────────────────────────

    async def create(self, data: dict[str, Any]) -> Brand:
        brand = Brand(**data)
        self._session.add(brand)
        await self._session.flush()
        await self._session.refresh(brand)
        return brand

    async def update(self, brand_id: int, data: dict[str, Any]) -> Brand | None:
        stmt = (
            update(Brand)
            .where(Brand.id == brand_id)
            .values(**data)
            .returning(Brand)
        )
        result = await self._session.execute(stmt)
        updated = result.scalar_one_or_none()
        return updated

    async def delete(self, brand_id: int) -> bool:
        brand = await self._session.get(Brand, brand_id)
        if brand is None:
            return False
        await self._session.delete(brand)
        await self._session.flush()
        return True

    async def update_embedding(
        self, brand_id: int, embedding: list[float]
    ) -> None:
        stmt = (
            update(Brand)
            .where(Brand.id == brand_id)
            .values(dna_embedding=embedding)
        )
        await self._session.execute(stmt)
        await self._session.flush()

    async def get_all_without_embedding(self) -> Sequence[Brand]:
        stmt = select(Brand).where(Brand.dna_embedding.is_(None))
        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def count(self) -> int:
        result = await self._session.execute(select(func.count(Brand.id)))
        return result.scalar_one()
