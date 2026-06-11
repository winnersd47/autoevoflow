from __future__ import annotations

import json
from typing import Annotated, Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status

from app.core.deps import AdminUser, CacheClient, CurrentUser, DBSession, GraphClient, OptionalUser
from app.db.postgresql.models import Brand
from app.db.postgresql.repositories.brand_repo import BrandRepository
from app.schemas.automotive import (
    BrandCreate,
    BrandRead,
    BrandReadWithModels,
    BrandUpdate,
    DesignDNA,
    LineageTree,
    PaginatedResponse,
)

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/brands", tags=["brands"])

# ── Cache TTLs ────────────────────────────────────────────────────────────────
BRAND_LIST_TTL = 120
BRAND_DETAIL_TTL = 300
BRAND_GRAPH_TTL = 600


# ── List ──────────────────────────────────────────────────────────────────────


@router.get("", response_model=PaginatedResponse)
async def list_brands(
    db: DBSession,
    cache: CacheClient,
    country: str | None = Query(None),
    search: str | None = Query(None, max_length=255),
    founded_year_min: int | None = Query(None, ge=1769),
    founded_year_max: int | None = Query(None, le=2100),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedResponse:
    cache_key = (
        f"cache:brands:list:{country}:{search}:{founded_year_min}:{founded_year_max}:{page}:{page_size}"
    )
    cached = await cache.get(cache_key)
    if cached:
        return PaginatedResponse(**cached)

    repo = BrandRepository(db)
    offset = (page - 1) * page_size
    brands, total = await repo.list_with_filters(
        country=country,
        search=search,
        founded_year_min=founded_year_min,
        founded_year_max=founded_year_max,
        offset=offset,
        limit=page_size,
    )

    response = PaginatedResponse.from_list(
        items=[BrandRead.model_validate(b) for b in brands],
        total=total,
        page=page,
        page_size=page_size,
    )
    await cache.set(cache_key, response.model_dump(mode="json"), ttl=BRAND_LIST_TTL)
    return response


# ── Detail ────────────────────────────────────────────────────────────────────


@router.get("/{slug}", response_model=BrandRead)
async def get_brand(
    slug: Annotated[str, Path(max_length=255)],
    db: DBSession,
    cache: CacheClient,
) -> BrandRead:
    cache_key = f"cache:brand:slug:{slug}"
    cached = await cache.get(cache_key)
    if cached:
        return BrandRead(**cached)

    repo = BrandRepository(db)
    brand = await repo.get_by_slug(slug)
    if brand is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Brand '{slug}' not found")

    result = BrandRead.model_validate(brand)
    await cache.set(cache_key, result.model_dump(mode="json"), ttl=BRAND_DETAIL_TTL)
    return result


# ── Create ────────────────────────────────────────────────────────────────────


@router.post("", response_model=BrandRead, status_code=status.HTTP_201_CREATED)
async def create_brand(
    payload: BrandCreate,
    db: DBSession,
    cache: CacheClient,
    _admin: AdminUser,
) -> BrandRead:
    repo = BrandRepository(db)
    existing = await repo.get_by_slug(payload.slug)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Brand with slug '{payload.slug}' already exists",
        )

    brand = await repo.create(payload.model_dump())
    await cache.invalidate_brand()
    logger.info("Brand created", brand_id=brand.id, slug=brand.slug)
    return BrandRead.model_validate(brand)


# ── Update ────────────────────────────────────────────────────────────────────


@router.put("/{slug}", response_model=BrandRead)
async def update_brand(
    slug: Annotated[str, Path(max_length=255)],
    payload: BrandUpdate,
    db: DBSession,
    cache: CacheClient,
    _admin: AdminUser,
) -> BrandRead:
    repo = BrandRepository(db)
    brand = await repo.get_by_slug(slug)
    if brand is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Brand '{slug}' not found")

    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updated = await repo.update(brand.id, updates)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Update failed")

    await cache.invalidate_brand(brand_id=brand.id, slug=slug)
    logger.info("Brand updated", brand_id=brand.id, slug=slug)
    return BrandRead.model_validate(updated)


# ── Models ────────────────────────────────────────────────────────────────────


@router.get("/{slug}/models", response_model=BrandReadWithModels)
async def get_brand_models(
    slug: Annotated[str, Path(max_length=255)],
    db: DBSession,
    cache: CacheClient,
) -> BrandReadWithModels:
    cache_key = f"cache:brand:slug:{slug}:models"
    cached = await cache.get(cache_key)
    if cached:
        return BrandReadWithModels(**cached)

    repo = BrandRepository(db)
    brand = await repo.get_by_slug(slug)
    if brand is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Brand '{slug}' not found")

    brand_with_models = await repo.get_with_models(brand.id)
    result = BrandReadWithModels.model_validate(brand_with_models)
    await cache.set(cache_key, result.model_dump(mode="json"), ttl=BRAND_DETAIL_TTL)
    return result


# ── Design DNA ────────────────────────────────────────────────────────────────


@router.get("/{slug}/dna", response_model=DesignDNA)
async def get_brand_dna(
    slug: Annotated[str, Path(max_length=255)],
    db: DBSession,
    cache: CacheClient,
    graph: GraphClient,
) -> DesignDNA:
    cache_key = f"cache:brand:slug:{slug}:dna"
    cached = await cache.get(cache_key)
    if cached:
        return DesignDNA(**cached)

    repo = BrandRepository(db)
    brand = await repo.get_by_slug(slug)
    if brand is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Brand '{slug}' not found")

    graph_data = await graph.get_brand_dna_graph(brand.id)
    result = DesignDNA(
        brand_id=brand.id,
        brand_name=brand.name,
        nodes=graph_data.get("generations", []),
        edges=graph_data.get("edges", []),
        key_design_traits=[],
        visual_cohesion_score=None,
    )
    await cache.set(cache_key, result.model_dump(mode="json"), ttl=BRAND_GRAPH_TTL)
    return result


# ── Lineage graph ─────────────────────────────────────────────────────────────


@router.get("/{slug}/lineage-graph")
async def get_brand_lineage_graph(
    slug: Annotated[str, Path(max_length=255)],
    db: DBSession,
    cache: CacheClient,
    graph: GraphClient,
) -> dict[str, Any]:
    cache_key = f"cache:brand:slug:{slug}:lineage"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    repo = BrandRepository(db)
    brand = await repo.get_by_slug(slug)
    if brand is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Brand '{slug}' not found")

    lineage = await graph.get_brand_dna_graph(brand.id)
    cross_brand = await graph.find_cross_brand_connections(brand.id)

    result: dict[str, Any] = {
        "brand_id": brand.id,
        "brand_name": brand.name,
        "lineage": lineage,
        "cross_brand_influences": cross_brand,
    }
    await cache.set(cache_key, result, ttl=BRAND_GRAPH_TTL)
    return result


# ── AI Analysis ───────────────────────────────────────────────────────────────


@router.get("/{slug}/analysis")
async def get_brand_analysis(
    slug: Annotated[str, Path(max_length=255)],
    db: DBSession,
    cache: CacheClient,
    analysis_type: str = Query("brand_overview"),
) -> dict[str, Any]:
    from sqlalchemy import select
    from app.db.postgresql.models import AIAnalysis

    repo = BrandRepository(db)
    brand = await repo.get_by_slug(slug)
    if brand is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Brand '{slug}' not found")

    stmt = (
        select(AIAnalysis)
        .where(
            AIAnalysis.entity_type == "brand",
            AIAnalysis.entity_id == brand.id,
            AIAnalysis.analysis_type == analysis_type,
        )
        .order_by(AIAnalysis.created_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    analysis = result.scalar_one_or_none()

    if analysis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No {analysis_type} analysis found for brand '{slug}'",
        )

    return {
        "brand_id": brand.id,
        "brand_name": brand.name,
        "analysis_type": analysis.analysis_type,
        "content": analysis.content,
        "model_used": analysis.model_used,
        "created_at": analysis.created_at.isoformat(),
    }
