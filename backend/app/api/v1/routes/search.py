from __future__ import annotations

import io
import time
from typing import Any

import structlog
from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from PIL import Image

from app.core.deps import CacheClient, DBSession, OptionalUser
from app.db.postgresql.repositories.brand_repo import BrandRepository
from app.db.postgresql.repositories.generation_repo import GenerationRepository
from app.schemas.automotive import (
    AutocompleteSuggestion,
    GraphSearchQuery,
    SearchQuery,
    SearchResponse,
    SearchResult,
    VectorSearchQuery,
)

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/search", tags=["search"])

_SEARCH_TTL = 60
_SUGGESTION_TTL = 120

# Max upload size: 20 MB
_MAX_IMAGE_BYTES = 20 * 1024 * 1024


def _get_clip_embedding(image: Image.Image) -> list[float]:
    """Generate a CLIP embedding for a PIL image. Lazy-imports torch."""
    import open_clip
    import torch

    model, _, preprocess = open_clip.create_model_and_transforms("ViT-L-14", pretrained="openai")
    model.eval()
    device = torch.device("cpu")
    model.to(device)

    img_tensor = preprocess(image).unsqueeze(0).to(device)
    with torch.no_grad():
        features = model.encode_image(img_tensor)
        features = features / features.norm(dim=-1, keepdim=True)
    return features[0].cpu().tolist()


# ── Semantic search ───────────────────────────────────────────────────────────


@router.post("/semantic", response_model=SearchResponse)
async def semantic_search(
    payload: SearchQuery,
    db: DBSession,
    cache: CacheClient,
) -> SearchResponse:
    import openai as openai_sdk
    from app.core.config import settings

    t0 = time.perf_counter()
    cache_key = f"cache:search:semantic:{hash(payload.query)}:{payload.limit}:{payload.min_score}"
    cached = await cache.get(cache_key)
    if cached:
        return SearchResponse(**cached)

    # Generate text embedding via OpenAI
    client = openai_sdk.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    embed_response = await client.embeddings.create(
        model=settings.OPENAI_EMBEDDING_MODEL,
        input=payload.query,
    )
    embedding: list[float] = embed_response.data[0].embedding

    results: list[SearchResult] = []

    if "generation" in payload.entity_types:
        gen_repo = GenerationRepository(db)
        similar_gens = await gen_repo.find_similar_by_vector(
            embedding=embedding,
            embedding_column="semantic_embedding",
            limit=payload.limit,
            min_score=payload.min_score,
        )
        for gen, score in similar_gens:
            results.append(
                SearchResult(
                    entity_type="generation",
                    entity_id=gen.id,
                    score=score,
                    data={
                        "model_id": gen.model_id,
                        "code_name": gen.code_name,
                        "year_start": gen.year_start,
                        "year_end": gen.year_end,
                    },
                )
            )

    if "brand" in payload.entity_types:
        brand_repo = BrandRepository(db)
        similar_brands = await brand_repo.search_by_vector(
            embedding=embedding,
            limit=payload.limit,
            min_score=payload.min_score,
        )
        for brand, score in similar_brands:
            results.append(
                SearchResult(
                    entity_type="brand",
                    entity_id=brand.id,
                    score=score,
                    data={"name": brand.name, "slug": brand.slug, "country": brand.country},
                )
            )

    results.sort(key=lambda r: r.score, reverse=True)
    results = results[: payload.limit]

    response = SearchResponse(
        query=payload.query,
        results=results,
        total=len(results),
        took_ms=(time.perf_counter() - t0) * 1000,
    )
    await cache.set(cache_key, response.model_dump(mode="json"), ttl=_SEARCH_TTL)
    return response


# ── Visual search (image upload) ──────────────────────────────────────────────


@router.post("/visual", response_model=SearchResponse)
async def visual_search(
    db: DBSession,
    cache: CacheClient,
    file: UploadFile = File(..., description="Vehicle image (JPEG/PNG/WebP)"),
    limit: int = Query(10, ge=1, le=50),
    min_score: float = Query(0.6, ge=0.0, le=1.0),
) -> SearchResponse:
    t0 = time.perf_counter()

    # Validate content type
    if file.content_type not in {"image/jpeg", "image/png", "image/webp", "image/jpg"}:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Supported image types: JPEG, PNG, WebP",
        )

    content = await file.read()
    if len(content) > _MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image exceeds 20 MB limit",
        )

    try:
        image = Image.open(io.BytesIO(content)).convert("RGB")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not decode image: {exc}",
        )

    embedding = _get_clip_embedding(image)

    gen_repo = GenerationRepository(db)
    similar = await gen_repo.find_similar_by_vector(
        embedding=embedding,
        embedding_column="visual_embedding",
        limit=limit,
        min_score=min_score,
    )

    results = [
        SearchResult(
            entity_type="generation",
            entity_id=gen.id,
            score=score,
            data={
                "model_id": gen.model_id,
                "code_name": gen.code_name,
                "year_start": gen.year_start,
            },
        )
        for gen, score in similar
    ]

    return SearchResponse(
        query=f"visual_search:{file.filename}",
        results=results,
        total=len(results),
        took_ms=(time.perf_counter() - t0) * 1000,
    )


# ── Multimodal search ─────────────────────────────────────────────────────────


@router.post("/multimodal", response_model=SearchResponse)
async def multimodal_search(
    db: DBSession,
    cache: CacheClient,
    query: str = Query(..., min_length=1, max_length=512),
    file: UploadFile | None = File(None),
    limit: int = Query(10, ge=1, le=50),
    min_score: float = Query(0.55, ge=0.0, le=1.0),
    text_weight: float = Query(0.5, ge=0.0, le=1.0),
) -> SearchResponse:
    import numpy as np
    import openai as openai_sdk
    from app.core.config import settings

    t0 = time.perf_counter()

    client = openai_sdk.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    embed_response = await client.embeddings.create(
        model=settings.OPENAI_EMBEDDING_MODEL,
        input=query,
    )
    text_embedding = np.array(embed_response.data[0].embedding, dtype=np.float32)

    combined_embedding: list[float]

    if file is not None:
        content = await file.read()
        image = Image.open(io.BytesIO(content)).convert("RGB")
        visual_emb = np.array(_get_clip_embedding(image), dtype=np.float32)

        # Pad or truncate to match dimensions
        min_len = min(len(text_embedding), len(visual_emb))
        text_part = text_embedding[:min_len] * text_weight
        visual_part = visual_emb[:min_len] * (1.0 - text_weight)
        combined = text_part + visual_part
        combined = combined / (np.linalg.norm(combined) + 1e-8)
        combined_embedding = combined.tolist()
    else:
        combined_embedding = text_embedding.tolist()

    gen_repo = GenerationRepository(db)
    similar = await gen_repo.find_similar_by_vector(
        embedding=combined_embedding,
        embedding_column="visual_embedding",
        limit=limit,
        min_score=min_score,
    )

    results = [
        SearchResult(
            entity_type="generation",
            entity_id=gen.id,
            score=score,
            data={"model_id": gen.model_id, "code_name": gen.code_name, "year_start": gen.year_start},
        )
        for gen, score in similar
    ]

    return SearchResponse(
        query=query,
        results=results,
        total=len(results),
        took_ms=(time.perf_counter() - t0) * 1000,
    )


# ── Suggestions / autocomplete ────────────────────────────────────────────────


@router.get("/suggestions", response_model=list[AutocompleteSuggestion])
async def get_suggestions(
    db: DBSession,
    cache: CacheClient,
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(8, ge=1, le=20),
) -> list[AutocompleteSuggestion]:
    from rapidfuzz import fuzz, process
    from sqlalchemy import or_, select
    from app.db.postgresql.models import Brand, CarModel

    cache_key = f"cache:search:suggest:{q.lower()}:{limit}"
    cached = await cache.get(cache_key)
    if cached:
        return [AutocompleteSuggestion(**s) for s in cached]

    suggestions: list[AutocompleteSuggestion] = []

    brands_stmt = select(Brand).where(Brand.name.ilike(f"%{q}%")).limit(limit)
    brand_rows = (await db.execute(brands_stmt)).scalars().all()
    for brand in brand_rows:
        score = fuzz.ratio(q.lower(), brand.name.lower()) / 100.0
        suggestions.append(
            AutocompleteSuggestion(
                text=brand.name,
                entity_type="brand",
                entity_id=brand.id,
                score=score,
            )
        )

    models_stmt = select(CarModel).where(CarModel.name.ilike(f"%{q}%")).limit(limit)
    model_rows = (await db.execute(models_stmt)).scalars().all()
    for model in model_rows:
        score = fuzz.ratio(q.lower(), model.name.lower()) / 100.0
        suggestions.append(
            AutocompleteSuggestion(
                text=model.name,
                entity_type="model",
                entity_id=model.id,
                score=score,
            )
        )

    suggestions.sort(key=lambda s: s.score, reverse=True)
    suggestions = suggestions[:limit]

    await cache.set(
        cache_key,
        [s.model_dump(mode="json") for s in suggestions],
        ttl=_SUGGESTION_TTL,
    )
    return suggestions


# ── Graph search ──────────────────────────────────────────────────────────────


@router.post("/graph", response_model=dict)
async def graph_search(
    payload: GraphSearchQuery,
    db: DBSession,
    cache: CacheClient,
) -> dict[str, Any]:
    from app.core.deps import get_neo4j

    cache_key = f"cache:search:graph:{payload.start_entity_type}:{payload.start_entity_id}:{hash(payload.query)}"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    async for graph in get_neo4j():
        if payload.start_entity_type == "brand":
            data = await graph.get_brand_dna_graph(payload.start_entity_id)
        elif payload.start_entity_type == "generation":
            data = await graph.get_lineage(payload.start_entity_id, max_depth=payload.max_depth)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported entity type: {payload.start_entity_type}",
            )

    result: dict[str, Any] = {
        "query": payload.query,
        "start_entity_type": payload.start_entity_type,
        "start_entity_id": payload.start_entity_id,
        "graph_data": data,
    }
    await cache.set(cache_key, result, ttl=_SEARCH_TTL)
    return result
