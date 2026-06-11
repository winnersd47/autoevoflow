from __future__ import annotations

from typing import Any, Sequence

import structlog
from sqlalchemy import Select, and_, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.db.postgresql.models import CarModel, Generation, Trim, VehicleImage

logger = structlog.get_logger(__name__)


class GenerationRepository:
    """Async repository for Generation CRUD and vector search operations."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # ── Queries ───────────────────────────────────────────────────────────────

    async def get_by_id(self, generation_id: int) -> Generation | None:
        return await self._session.get(Generation, generation_id)

    async def get_with_details(self, generation_id: int) -> Generation | None:
        """Load generation with trims and images eager-loaded."""
        stmt = (
            select(Generation)
            .options(
                selectinload(Generation.trims),
                selectinload(Generation.images),
                joinedload(Generation.model).joinedload(CarModel.brand),
            )
            .where(Generation.id == generation_id)
        )
        result = await self._session.execute(stmt)
        return result.unique().scalar_one_or_none()

    async def get_with_embeddings(self, generation_id: int) -> Generation | None:
        stmt = select(Generation).where(Generation.id == generation_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_model(
        self,
        model_id: int,
        include_facelifts: bool = True,
        offset: int = 0,
        limit: int = 50,
    ) -> Sequence[Generation]:
        conditions = [Generation.model_id == model_id]
        if not include_facelifts:
            conditions.append(Generation.facelift_of_id.is_(None))

        stmt = (
            select(Generation)
            .where(and_(*conditions))
            .order_by(Generation.year_start.asc().nullsfirst())
            .offset(offset)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def list_by_brand(
        self,
        brand_id: int,
        offset: int = 0,
        limit: int = 100,
    ) -> Sequence[Generation]:
        stmt = (
            select(Generation)
            .join(CarModel, Generation.model_id == CarModel.id)
            .where(CarModel.brand_id == brand_id)
            .order_by(Generation.year_start.asc().nullsfirst())
            .offset(offset)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def get_evolution_chain(self, generation_id: int) -> list[Generation]:
        """
        Walk the facelift_of_id chain upward to find the root generation,
        then collect all generations in the same evolution chain.
        """
        # Find root (walk up)
        current = await self.get_by_id(generation_id)
        if current is None:
            return []

        root = current
        visited: set[int] = {current.id}
        while root.facelift_of_id is not None and root.facelift_of_id not in visited:
            visited.add(root.facelift_of_id)
            parent = await self.get_by_id(root.facelift_of_id)
            if parent is None:
                break
            root = parent

        # Collect all generations in this model that belong to the chain
        stmt = (
            select(Generation)
            .where(Generation.model_id == root.model_id)
            .order_by(Generation.year_start.asc().nullsfirst())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    # ── Vector search ─────────────────────────────────────────────────────────

    async def find_similar_by_vector(
        self,
        embedding: list[float],
        embedding_column: str = "visual_embedding",
        limit: int = 10,
        min_score: float = 0.6,
        exclude_generation_id: int | None = None,
    ) -> list[tuple[Generation, float]]:
        """
        Find generations most similar to *embedding* using cosine similarity.
        *embedding_column* can be 'visual_embedding', 'semantic_embedding', or 'design_dna_embedding'.
        """
        col_map = {
            "visual_embedding": Generation.visual_embedding,
            "semantic_embedding": Generation.semantic_embedding,
            "design_dna_embedding": Generation.design_dna_embedding,
        }
        col = col_map.get(embedding_column)
        if col is None:
            raise ValueError(f"Unknown embedding column: {embedding_column}")

        distance_expr = col.cosine_distance(embedding)
        conditions = [col.is_not(None)]
        if exclude_generation_id is not None:
            conditions.append(Generation.id != exclude_generation_id)

        stmt = (
            select(Generation, (1 - distance_expr).label("similarity"))
            .where(and_(*conditions))
            .order_by(distance_expr.asc())
            .limit(limit)
        )

        result = await self._session.execute(stmt)
        rows = result.all()
        return [(gen, float(sim)) for gen, sim in rows if float(sim) >= min_score]

    async def find_cross_brand_similar(
        self,
        brand_id: int,
        embedding: list[float],
        limit: int = 10,
        min_score: float = 0.65,
    ) -> list[tuple[Generation, float]]:
        """Find visually similar generations from OTHER brands."""
        distance_expr = Generation.visual_embedding.cosine_distance(embedding)

        stmt = (
            select(Generation, (1 - distance_expr).label("similarity"))
            .join(CarModel, Generation.model_id == CarModel.id)
            .where(
                and_(
                    CarModel.brand_id != brand_id,
                    Generation.visual_embedding.is_not(None),
                )
            )
            .order_by(distance_expr.asc())
            .limit(limit)
        )

        result = await self._session.execute(stmt)
        rows = result.all()
        return [(gen, float(sim)) for gen, sim in rows if float(sim) >= min_score]

    # ── Mutations ─────────────────────────────────────────────────────────────

    async def create(self, data: dict[str, Any]) -> Generation:
        generation = Generation(**data)
        self._session.add(generation)
        await self._session.flush()
        await self._session.refresh(generation)
        return generation

    async def update(self, generation_id: int, data: dict[str, Any]) -> Generation | None:
        stmt = (
            update(Generation)
            .where(Generation.id == generation_id)
            .values(**data)
            .returning(Generation)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def update_embeddings(
        self,
        generation_id: int,
        *,
        visual_embedding: list[float] | None = None,
        semantic_embedding: list[float] | None = None,
        design_dna_embedding: list[float] | None = None,
    ) -> None:
        values: dict[str, Any] = {}
        if visual_embedding is not None:
            values["visual_embedding"] = visual_embedding
        if semantic_embedding is not None:
            values["semantic_embedding"] = semantic_embedding
        if design_dna_embedding is not None:
            values["design_dna_embedding"] = design_dna_embedding
        if not values:
            return

        stmt = update(Generation).where(Generation.id == generation_id).values(**values)
        await self._session.execute(stmt)
        await self._session.flush()

    async def delete(self, generation_id: int) -> bool:
        gen = await self._session.get(Generation, generation_id)
        if gen is None:
            return False
        await self._session.delete(gen)
        await self._session.flush()
        return True

    async def get_all_without_visual_embedding(self) -> Sequence[Generation]:
        stmt = select(Generation).where(Generation.visual_embedding.is_(None))
        result = await self._session.execute(stmt)
        return result.scalars().all()

    async def count(self) -> int:
        result = await self._session.execute(select(func.count(Generation.id)))
        return result.scalar_one()
