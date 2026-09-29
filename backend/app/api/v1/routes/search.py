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
    """Text-based semantic search using description_embedding (text-embedding-3-small, 1536-dim).

    Uses description_embedding, not semantic_embedding (which is DINOv2 768-dim from images).
    Matching dimensions: text-embedding-3-small → 1536 == description_embedding column.
    """
    import openai as openai_sdk
    from app.core.config import settings

    _TEXT_EMBED_MODEL = "text-embedding-3-small"
    _TEXT_EMBED_DIM = 1536

    t0 = time.perf_counter()
    cache_key = f"cache:search:semantic:{hash(payload.query)}:{payload.limit}:{payload.min_score}"
    cached = await cache.get(cache_key)
    if cached:
        return SearchResponse(**cached)

    # text-embedding-3-small → 1536-dim; matches description_embedding column
    client = openai_sdk.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    embed_response = await client.embeddings.create(
        model=_TEXT_EMBED_MODEL,
        input=payload.query,
        dimensions=_TEXT_EMBED_DIM,
    )
    embedding: list[float] = embed_response.data[0].embedding

    results: list[SearchResult] = []

    if "generation" in payload.entity_types:
        gen_repo = GenerationRepository(db)
        similar_gens = await gen_repo.find_similar_by_vector(
            embedding=embedding,
            embedding_column="description_embedding",
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


# ── Similar generations by ID ─────────────────────────────────────────────────


@router.get("/similar/generation/{generation_id}", response_model=SearchResponse)
async def get_similar_generations(
    generation_id: int,
    db: DBSession,
    cache: CacheClient,
    limit: int = Query(10, ge=1, le=50),
    min_score: float = Query(0.6, ge=0.0, le=1.0),
    strategy: str = Query(
        "visual",
        description="'visual' uses CLIP visual_embedding; 'text' uses description_embedding",
    ),
) -> SearchResponse:
    """Find generations most similar to the given one using pgvector ANN search.

    strategy=visual — cosine distance on CLIP embeddings (default, always populated by worker).
    strategy=text   — cosine distance on text-embedding-3-small description embeddings.
    """
    from app.db.postgresql.models import Generation
    from sqlalchemy import select as sql_select

    if strategy not in ("visual", "text"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="strategy must be 'visual' or 'text'",
        )

    t0 = time.perf_counter()
    cache_key = f"cache:search:similar:gen:{generation_id}:{strategy}:{limit}:{min_score}"
    cached = await cache.get(cache_key)
    if cached:
        return SearchResponse(**cached)

    emb_col = "visual_embedding" if strategy == "visual" else "description_embedding"

    # Load the source generation's embedding
    stmt = sql_select(Generation).where(Generation.id == generation_id)
    result = await db.execute(stmt)
    gen = result.scalar_one_or_none()
    if gen is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generation not found")

    source_emb = getattr(gen, emb_col)
    if source_emb is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Generation {generation_id} has no {emb_col}. "
                   f"Run workers.generate_{'description' if strategy == 'text' else 'visual'}_embeddings first.",
        )

    gen_repo = GenerationRepository(db)
    similar = await gen_repo.find_similar_by_vector(
        embedding=list(source_emb),
        embedding_column=emb_col,
        limit=limit,
        min_score=min_score,
        exclude_generation_id=generation_id,
    )

    search_results = [
        SearchResult(
            entity_type="generation",
            entity_id=g.id,
            score=score,
            data={
                "model_id": g.model_id,
                "code_name": g.code_name,
                "year_start": g.year_start,
                "year_end": g.year_end,
            },
        )
        for g, score in similar
    ]

    response = SearchResponse(
        query=f"similar:generation:{generation_id}:{strategy}",
        results=search_results,
        total=len(search_results),
        took_ms=(time.perf_counter() - t0) * 1000,
    )
    await cache.set(cache_key, response.model_dump(mode="json"), ttl=_SEARCH_TTL)
    return response


# ── Embedding coverage diagnostic ─────────────────────────────────────────────


@router.get("/coverage", response_model=dict)
async def embedding_coverage(db: DBSession) -> dict[str, Any]:
    """Diagnostic: show what % of generations have each embedding type populated.

    Use this to answer 'does similarity search cover 80% of queries?'
    before committing to a full RAG pipeline.
    """
    from sqlalchemy import func, select as sql_select
    from app.db.postgresql.models import Generation, Brand

    total_result = await db.execute(sql_select(func.count(Generation.id)))
    total: int = total_result.scalar_one()

    if total == 0:
        return {"total_generations": 0, "coverage": {}}

    async def _count_non_null(col_name: str) -> int:
        col = getattr(Generation, col_name)
        res = await db.execute(sql_select(func.count(Generation.id)).where(col.is_not(None)))
        return res.scalar_one()

    visual = await _count_non_null("visual_embedding")
    semantic = await _count_non_null("semantic_embedding")
    dna = await _count_non_null("design_dna_embedding")
    description = await _count_non_null("description_embedding")

    def _pct(n: int) -> float:
        return round(n / total * 100, 1)

    total_brands_res = await db.execute(sql_select(func.count(Brand.id)))
    total_brands: int = total_brands_res.scalar_one()

    brands_with_dna_res = await db.execute(
        sql_select(func.count(Brand.id)).where(Brand.dna_embedding.is_not(None))
    )
    brands_with_dna: int = brands_with_dna_res.scalar_one()

    return {
        "total_generations": total,
        "total_brands": total_brands,
        "coverage": {
            "visual_embedding": {"count": visual, "pct": _pct(visual), "model": "CLIP ViT-L-14"},
            "semantic_embedding": {"count": semantic, "pct": _pct(semantic), "model": "DINOv2 (image)"},
            "design_dna_embedding": {"count": dna, "pct": _pct(dna), "model": "aggregated CLIP 512-dim"},
            "description_embedding": {
                "count": description,
                "pct": _pct(description),
                "model": "text-embedding-3-small 1536-dim",
            },
        },
        "brand_dna_coverage": {"count": brands_with_dna, "pct": _pct(brands_with_dna)},
        "advice": (
            "Target: description_embedding >= 80% for text semantic search to be useful. "
            "Run workers.generate_description_embeddings to fill gaps."
        ),
    }


# ── Hybrid search: pgvector ANN + Neo4j graph context ────────────────────────
#
# Phase 4 Step 3 — «образовательный кейс»: зачем два типа БД вместо одного.
#
# ЗАЧЕМ ГИБРИД?
#   • pgvector (ANN) хорошо находит визуально похожие кузова, но не знает,
#     что BMW E30 → E36 — это эволюция, а не случайное сходство.
#   • Neo4j знает граф эволюции (EVOLVES_INTO, INFLUENCED_BY, SHARES_PLATFORM),
#     но не умеет «искать по форме».
#   • Гибрид даёт ответ: «похожие И связанные по дизайн-ДНК».
#
# АЛГОРИТМ:
#   1. pgvector ANN по visual_embedding → top (limit*3) кандидатов
#   2. Neo4j пакетный Cypher: shortestPath для всех кандидатов за 1 запрос
#   3. graph_score:
#        ∞  прямое ребро (1 hop) → 1.0
#        shared platform         → 0.6
#        path_len = 2            → 0.5
#        path_len = k > 2        → 1/k
#        нет пути                → 0.0
#   4. hybrid_score = vector_weight * cos_sim + (1 - vector_weight) * graph_score
#   5. Пересортировать, вернуть top-limit

_GRAPH_ENRICH_CYPHER = """
UNWIND $candidates AS cid
MATCH (src:Generation {generation_id: $source})
OPTIONAL MATCH p_evo = shortestPath(
    (src)-[:EVOLVES_INTO|INFLUENCED_BY*1..6]-(tgt:Generation {generation_id: cid})
)
OPTIONAL MATCH (src)-[:SHARES_PLATFORM]-(plat:Generation {generation_id: cid})
RETURN cid,
       CASE WHEN tgt IS NOT NULL THEN length(p_evo) ELSE null END AS path_len,
       plat IS NOT NULL AS shares_platform
"""


def _graph_score(path_len: int | None, shares_platform: bool) -> float:
    if path_len is not None:
        if path_len == 1:
            return 1.0
        return 1.0 / path_len
    if shares_platform:
        return 0.6
    return 0.0


@router.get("/hybrid/{generation_id}")
async def hybrid_search(
    generation_id: int,
    db: DBSession,
    cache: CacheClient,
    limit: int = Query(10, ge=1, le=50),
    min_vector_score: float = Query(0.55, ge=0.0, le=1.0),
    vector_weight: float = Query(
        0.7, ge=0.0, le=1.0,
        description="Weight of vector similarity vs graph score. 0.7 = 70% vector, 30% graph.",
    ),
) -> dict[str, Any]:
    """Гибридный поиск: pgvector ANN + Neo4j граф → объединённый рейтинг.

    Объясняет, зачем в AutoEvo два типа БД:
    - pgvector ищет «визуально похожие» поколения (CLIP-эмбеддинги)
    - Neo4j добавляет граф эволюции (EVOLVES_INTO, INFLUENCED_BY, SHARES_PLATFORM)
    - Итоговый рейтинг = vector_weight × cos_sim + (1−vector_weight) × graph_score

    graph_score интерпретация:
      1.0  — прямое ребро в Neo4j (1 hop)
      0.5  — через одно поколение (2 hop)
      0.33 — через два (3 hop), и т.д.
      0.6  — общая платформа (SHARES_PLATFORM)
      0.0  — граф не связан

    На выходе каждый результат содержит breakdown: vector_score, graph_score,
    hybrid_score, path_len, shares_platform — для понимания вклада каждой сигнальной системы.
    """
    from app.core.deps import get_neo4j
    from app.db.postgresql.models import Generation
    from sqlalchemy import select as sql_select

    t0 = time.perf_counter()
    cache_key = (
        f"cache:search:hybrid:{generation_id}:{limit}:{min_vector_score}:{vector_weight}"
    )
    cached = await cache.get(cache_key)
    if cached:
        return cached

    # ── 1. Load source generation's visual embedding ──────────────────────────
    result = await db.execute(sql_select(Generation).where(Generation.id == generation_id))
    src_gen = result.scalar_one_or_none()
    if src_gen is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generation not found")

    if src_gen.visual_embedding is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Generation has no visual_embedding. Run workers.generate_visual_embeddings first.",
        )

    # ── 2. pgvector ANN: fetch 3× candidates for re-ranking ──────────────────
    gen_repo = GenerationRepository(db)
    ann_candidates = await gen_repo.find_similar_by_vector(
        embedding=list(src_gen.visual_embedding),
        embedding_column="visual_embedding",
        limit=limit * 3,
        min_score=min_vector_score,
        exclude_generation_id=generation_id,
    )

    if not ann_candidates:
        return {
            "generation_id": generation_id,
            "results": [],
            "total": 0,
            "took_ms": (time.perf_counter() - t0) * 1000,
            "explanation": "No ANN candidates above min_vector_score threshold.",
        }

    # ── 3. Neo4j batch enrichment ─────────────────────────────────────────────
    candidate_ids = [g.id for g, _ in ann_candidates]
    graph_context: dict[int, dict] = {}

    try:
        async for graph in get_neo4j():
            records = await graph.run_raw(
                _GRAPH_ENRICH_CYPHER,
                {"source": generation_id, "candidates": candidate_ids},
            )
            for row in records:
                graph_context[int(row["cid"])] = {
                    "path_len": row["path_len"],
                    "shares_platform": bool(row["shares_platform"]),
                }
    except Exception as exc:
        # Neo4j unavailable — gracefully degrade to vector-only
        logger.warning("hybrid_search: Neo4j unavailable, falling back to vector-only", error=str(exc))

    # ── 4. Score fusion + re-rank ─────────────────────────────────────────────
    graph_weight = 1.0 - vector_weight
    enriched: list[dict] = []

    for gen, vec_score in ann_candidates:
        ctx = graph_context.get(gen.id, {})
        g_score = _graph_score(ctx.get("path_len"), ctx.get("shares_platform", False))
        h_score = vector_weight * vec_score + graph_weight * g_score

        enriched.append({
            "generation_id": gen.id,
            "model_id": gen.model_id,
            "code_name": gen.code_name,
            "year_start": gen.year_start,
            "year_end": gen.year_end,
            "scores": {
                "vector": round(vec_score, 4),
                "graph": round(g_score, 4),
                "hybrid": round(h_score, 4),
            },
            "graph_context": {
                "path_len": ctx.get("path_len"),
                "shares_platform": ctx.get("shares_platform", False),
                "connected": g_score > 0,
            },
        })

    enriched.sort(key=lambda x: x["scores"]["hybrid"], reverse=True)
    enriched = enriched[:limit]

    response = {
        "generation_id": generation_id,
        "results": enriched,
        "total": len(enriched),
        "took_ms": round((time.perf_counter() - t0) * 1000, 1),
        "config": {
            "vector_weight": vector_weight,
            "graph_weight": graph_weight,
            "min_vector_score": min_vector_score,
            "ann_candidates_fetched": len(ann_candidates),
            "neo4j_enriched": len(graph_context),
        },
        "explanation": (
            "hybrid_score = vector_weight × cos_similarity + graph_weight × graph_score. "
            "graph_score: 1.0 (direct edge), 1/path_len (N hops), 0.6 (shared platform), 0.0 (unconnected). "
            "ANN candidates re-ranked after Neo4j enrichment."
        ),
    }
    await cache.set(cache_key, response, ttl=_SEARCH_TTL)
    return response
