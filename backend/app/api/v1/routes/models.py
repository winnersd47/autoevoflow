from __future__ import annotations

from typing import Annotated, Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy import select

from app.core.deps import CacheClient, DBSession, GraphClient
from app.db.postgresql.models import AIAnalysis, CarModel
from app.db.postgresql.repositories.generation_repo import GenerationRepository
from app.schemas.automotive import (
    GenerationRead,
    ModelRead,
    ModelReadWithGenerations,
    PaginatedResponse,
    SearchResult,
)

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/models", tags=["models"])

_MODEL_TTL = 300
_EVOLUTION_TTL = 600


# ── List ──────────────────────────────────────────────────────────────────────


@router.get("", response_model=PaginatedResponse)
async def list_models(
    db: DBSession,
    cache: CacheClient,
    brand_id: int | None = Query(None),
    body_type: str | None = Query(None),
    is_concept: bool | None = Query(None),
    search: str | None = Query(None, max_length=255),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedResponse:
    from sqlalchemy import and_, func, or_

    cache_key = f"cache:models:list:{brand_id}:{body_type}:{is_concept}:{search}:{page}:{page_size}"
    cached = await cache.get(cache_key)
    if cached:
        return PaginatedResponse(**cached)

    conditions = []
    if brand_id is not None:
        conditions.append(CarModel.brand_id == brand_id)
    if body_type is not None:
        conditions.append(CarModel.body_type == body_type)
    if is_concept is not None:
        conditions.append(CarModel.is_concept == is_concept)
    if search:
        conditions.append(CarModel.name.ilike(f"%{search}%"))

    base_stmt = select(CarModel)
    if conditions:
        base_stmt = base_stmt.where(and_(*conditions))

    count_stmt = select(func.count()).select_from(base_stmt.subquery())
    total: int = (await db.execute(count_stmt)).scalar_one()

    offset = (page - 1) * page_size
    rows_stmt = base_stmt.order_by(CarModel.name.asc()).offset(offset).limit(page_size)
    models = (await db.execute(rows_stmt)).scalars().all()

    response = PaginatedResponse.from_list(
        items=[ModelRead.model_validate(m) for m in models],
        total=total,
        page=page,
        page_size=page_size,
    )
    await cache.set(cache_key, response.model_dump(mode="json"), ttl=_MODEL_TTL)
    return response


# ── Detail ────────────────────────────────────────────────────────────────────


@router.get("/{slug}", response_model=ModelRead)
async def get_model(
    slug: Annotated[str, Path(max_length=512)],
    db: DBSession,
    cache: CacheClient,
) -> ModelRead:
    cache_key = f"cache:model:slug:{slug}"
    cached = await cache.get(cache_key)
    if cached:
        return ModelRead(**cached)

    stmt = select(CarModel).where(CarModel.slug == slug)
    result = await db.execute(stmt)
    model = result.scalar_one_or_none()
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Model '{slug}' not found")

    out = ModelRead.model_validate(model)
    await cache.set(cache_key, out.model_dump(mode="json"), ttl=_MODEL_TTL)
    return out


# ── Generations ───────────────────────────────────────────────────────────────


@router.get("/{slug}/generations", response_model=list[GenerationRead])
async def get_model_generations(
    slug: Annotated[str, Path(max_length=512)],
    db: DBSession,
    cache: CacheClient,
    include_facelifts: bool = Query(True),
) -> list[GenerationRead]:
    cache_key = f"cache:model:slug:{slug}:generations:{include_facelifts}"
    cached = await cache.get(cache_key)
    if cached:
        return [GenerationRead(**g) for g in cached]

    stmt = select(CarModel).where(CarModel.slug == slug)
    result = await db.execute(stmt)
    model = result.scalar_one_or_none()
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Model '{slug}' not found")

    gen_repo = GenerationRepository(db)
    gens = await gen_repo.list_by_model(model.id, include_facelifts=include_facelifts)
    out = [GenerationRead.model_validate(g) for g in gens]
    await cache.set(cache_key, [g.model_dump(mode="json") for g in out], ttl=_MODEL_TTL)
    return out


# ── Evolution ─────────────────────────────────────────────────────────────────


@router.get("/{slug}/evolution")
async def get_model_evolution(
    slug: Annotated[str, Path(max_length=512)],
    db: DBSession,
    cache: CacheClient,
    graph: GraphClient,
) -> dict[str, Any]:
    cache_key = f"cache:model:slug:{slug}:evolution"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    stmt = select(CarModel).where(CarModel.slug == slug)
    result = await db.execute(stmt)
    model = result.scalar_one_or_none()
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Model '{slug}' not found")

    gen_repo = GenerationRepository(db)
    gens = await gen_repo.list_by_model(model.id)

    evolution_data: dict[str, Any] = {
        "model_id": model.id,
        "model_name": model.name,
        "generations": [GenerationRead.model_validate(g).model_dump(mode="json") for g in gens],
        "evolution_graph": None,
    }

    if gens:
        try:
            # Use first gen to anchor the lineage query
            evolution_data["evolution_graph"] = await graph.get_lineage(gens[0].id)
        except Exception as exc:
            logger.warning("Failed to fetch Neo4j lineage", model_id=model.id, error=str(exc))

    await cache.set(cache_key, evolution_data, ttl=_EVOLUTION_TTL)
    return evolution_data


# ── Similar models ────────────────────────────────────────────────────────────


@router.get("/{slug}/similar", response_model=list[SearchResult])
async def get_similar_models(
    slug: Annotated[str, Path(max_length=512)],
    db: DBSession,
    cache: CacheClient,
    limit: int = Query(10, ge=1, le=50),
    min_score: float = Query(0.6, ge=0.0, le=1.0),
) -> list[SearchResult]:
    stmt = select(CarModel).where(CarModel.slug == slug)
    result = await db.execute(stmt)
    model = result.scalar_one_or_none()
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Model '{slug}' not found")

    # Find generations with embeddings, then find similar ones
    gen_repo = GenerationRepository(db)
    gens = await gen_repo.list_by_model(model.id)
    if not gens or gens[0].visual_embedding is None:
        return []

    # Use the first generation with a visual embedding
    anchor_gen = next((g for g in gens if g.visual_embedding is not None), None)
    if anchor_gen is None:
        return []

    similar = await gen_repo.find_cross_brand_similar(
        brand_id=model.brand_id,
        embedding=list(anchor_gen.visual_embedding),
        limit=limit,
        min_score=min_score,
    )

    return [
        SearchResult(
            entity_type="generation",
            entity_id=gen.id,
            score=score,
            data={"model_id": gen.model_id, "code_name": gen.code_name, "year_start": gen.year_start},
        )
        for gen, score in similar
    ]


# ── Analysis ──────────────────────────────────────────────────────────────────


@router.get("/{slug}/analysis")
async def get_model_analysis(
    slug: Annotated[str, Path(max_length=512)],
    db: DBSession,
    analysis_type: str = Query("model_overview"),
) -> dict[str, Any]:
    stmt = select(CarModel).where(CarModel.slug == slug)
    result = await db.execute(stmt)
    model = result.scalar_one_or_none()
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Model '{slug}' not found")

    analysis_stmt = (
        select(AIAnalysis)
        .where(
            AIAnalysis.entity_type == "model",
            AIAnalysis.entity_id == model.id,
            AIAnalysis.analysis_type == analysis_type,
        )
        .order_by(AIAnalysis.created_at.desc())
        .limit(1)
    )
    analysis_result = await db.execute(analysis_stmt)
    analysis = analysis_result.scalar_one_or_none()

    if analysis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No {analysis_type} analysis found for model '{slug}'",
        )

    return {
        "model_id": model.id,
        "model_name": model.name,
        "analysis_type": analysis.analysis_type,
        "content": analysis.content,
        "model_used": analysis.model_used,
        "created_at": analysis.created_at.isoformat(),
    }
