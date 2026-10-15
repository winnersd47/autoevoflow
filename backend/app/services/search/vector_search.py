from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any

import numpy as np
import structlog
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.redis.cache import RedisCache

logger = structlog.get_logger(__name__)


def _log_embedding_inference(model: str, duration_ms: float, item_count: int = 1, batch_size: int = 1) -> None:
    """
    Structured log for embedding inference (CLIP/DINOv2/SAM). Named
    `duration_ms`, not `gpu_seconds`, because MODEL_DEVICE defaults to "cpu"
    in this environment — the field names stay honest about what hardware is
    actually configured rather than presuming a GPU that isn't there yet.
    Kept separate from _log_llm_usage in analysis_service.py: this pipeline
    is self-hosted compute-time, not a per-token $ API cost.
    """
    logger.info(
        "embedding_inference",
        model=model,
        device=settings.MODEL_DEVICE,
        duration_ms=round(duration_ms, 1),
        item_count=item_count,
        batch_size=batch_size,
    )


# ── Result types ──────────────────────────────────────────────────────────────


@dataclass
class SearchResult:
    generation_id: int
    model_id: int
    brand_id: int
    brand_name: str
    model_name: str
    code_name: str | None
    year_start: int | None
    year_end: int | None
    body_type: str | None
    score: float
    image_url: str | None = None
    rank: int = 0


@dataclass
class GraphSearchResult:
    query: str
    nodes: list[dict[str, Any]] = field(default_factory=list)
    edges: list[dict[str, Any]] = field(default_factory=list)
    brands: list[dict[str, Any]] = field(default_factory=list)
    models: list[dict[str, Any]] = field(default_factory=list)
    generations: list[dict[str, Any]] = field(default_factory=list)


# ── Embedding pipeline ────────────────────────────────────────────────────────


class EmbeddingPipeline:
    """Lazy-loaded model pipeline for generating text and image embeddings."""

    def __init__(self) -> None:
        self._openai_client = None
        self._clip_model = None
        self._clip_preprocess = None

    def _get_openai(self):
        if self._openai_client is None:
            import openai
            self._openai_client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        return self._openai_client

    def _get_clip(self):
        if self._clip_model is None:
            import open_clip
            self._clip_model, _, self._clip_preprocess = open_clip.create_model_and_transforms(
                settings.CLIP_MODEL_NAME, pretrained="laion2b_s32b_b82k"
            )
            self._clip_model.eval()
        return self._clip_model, self._clip_preprocess

    async def embed_text(self, text_input: str) -> list[float]:
        """Generate a text embedding via OpenAI text-embedding-3-large (3072-dim)."""
        client = self._get_openai()
        start = time.monotonic()
        response = await client.embeddings.create(
            model=settings.OPENAI_EMBEDDING_MODEL,
            input=text_input,
        )
        _log_embedding_inference(settings.OPENAI_EMBEDDING_MODEL, (time.monotonic() - start) * 1000)
        return response.data[0].embedding

    async def embed_text_yandex(self, text_input: str) -> list[float]:
        """
        Generate a 1024-dim text embedding via Yandex Embeddings API.
        Falls back to OpenAI if Yandex keys are not configured.
        Note: dimension mismatch with OpenAI (1024 vs 3072) requires
        a separate pgvector column if used alongside OpenAI embeddings.
        """
        if not settings.YANDEX_API_KEY or not settings.YANDEX_FOLDER_ID:
            return await self.embed_text(text_input)

        import httpx

        start = time.monotonic()
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                "https://llm.api.cloud.yandex.net/foundationModels/v1/textEmbedding",
                headers={"Authorization": f"Api-Key {settings.YANDEX_API_KEY}"},
                json={
                    "modelUri": f"emb://{settings.YANDEX_FOLDER_ID}/text-search-query/latest",
                    "text": text_input,
                },
            )
            response.raise_for_status()
            data = response.json()
        _log_embedding_inference("yandex-text-search-query", (time.monotonic() - start) * 1000)
        return data["embedding"]

    async def embed_image(self, image_bytes: bytes) -> list[float]:
        """Generate a visual embedding via CLIP."""
        import io
        import torch
        from PIL import Image

        start = time.monotonic()
        model, preprocess = self._get_clip()
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        tensor = preprocess(img).unsqueeze(0)
        with torch.no_grad():
            emb = model.encode_image(tensor)
            emb = emb / emb.norm(dim=-1, keepdim=True)
        _log_embedding_inference(settings.CLIP_MODEL_NAME, (time.monotonic() - start) * 1000)
        return emb.squeeze().cpu().numpy().tolist()


# ── Main service ──────────────────────────────────────────────────────────────


class VectorSearchService:
    """
    Unified search service supporting semantic, visual, multimodal,
    graph-based, and hybrid searches.

    Vector-store rule: pgvector is the only similarity/ANN store used by this
    service. Neo4j (see graph_search below) is queried only for graph
    structure (nodes + typed edges) — never for embeddings. No other index
    (FAISS, in-memory, etc.) gets built "for later" — a FAISS index used to
    be built here and rebuilt daily by a Celery task, but nothing ever
    queried it, so it was deleted rather than wired up.
    """

    def __init__(self, db: AsyncSession, redis: RedisCache) -> None:
        self._db = db
        self._redis = redis
        self._embedding_pipeline = EmbeddingPipeline()

    # ── Semantic search ───────────────────────────────────────────────────────

    async def semantic_search(
        self,
        query: str,
        limit: int = 20,
        filters: dict[str, Any] | None = None,
    ) -> list[SearchResult]:
        """
        Generate a text embedding and search pgvector with cosine similarity.
        """
        cache_key = f"cache:search:semantic:{hash(query)}:{limit}:{hash(str(filters))}"
        cached = await self._redis.get(cache_key)
        if cached:
            return [SearchResult(**r) for r in cached]

        embedding = await self._embedding_pipeline.embed_text(query)
        results = await self._vector_search_pg(embedding, limit=limit, filters=filters, emb_col="visual_embedding")

        await self._redis.set(cache_key, [_sr_to_dict(r) for r in results], ttl=300)
        return results

    # ── Visual search ─────────────────────────────────────────────────────────

    async def visual_search(
        self,
        image: bytes,
        limit: int = 20,
    ) -> list[SearchResult]:
        """Run image through CLIP and search pgvector for visually similar generations."""
        embedding = await self._embedding_pipeline.embed_image(image)
        return await self._vector_search_pg(embedding, limit=limit, emb_col="visual_embedding")

    # ── Multimodal search ─────────────────────────────────────────────────────

    async def multimodal_search(
        self,
        query: str,
        image: bytes | None = None,
        limit: int = 20,
    ) -> list[SearchResult]:
        """
        Fuse text and optional image embeddings (0.6 text + 0.4 visual)
        and search pgvector.
        """
        text_emb = np.array(await self._embedding_pipeline.embed_text(query), dtype=np.float32)

        if image is not None:
            visual_emb = np.array(await self._embedding_pipeline.embed_image(image), dtype=np.float32)
            # Align dimensions
            min_dim = min(len(text_emb), len(visual_emb))
            fused = 0.6 * text_emb[:min_dim] + 0.4 * visual_emb[:min_dim]
        else:
            fused = text_emb

        norm = np.linalg.norm(fused)
        if norm > 0:
            fused = fused / norm

        return await self._vector_search_pg(fused.tolist(), limit=limit, emb_col="visual_embedding")

    # ── Graph search ──────────────────────────────────────────────────────────

    async def graph_search(self, query: str) -> GraphSearchResult:
        """
        Parse the query to extract entities and relationship type,
        then run a Cypher query against Neo4j.
        """
        from app.db.neo4j.graph import neo4j_graph

        # Normalise query for basic entity extraction
        q_lower = query.lower()
        result = GraphSearchResult(query=query)

        # Simple keyword-based entity extraction
        # In production this would use an NLP model or SpaCy
        brand_keywords: list[str] = []
        relationship_type: str | None = None

        for rel_word in ["evolved", "inspired", "facelift", "successor", "predecessor"]:
            if rel_word in q_lower:
                relationship_type = rel_word
                break

        words = [w.strip(".,!?") for w in query.split()]
        for word in words:
            if len(word) > 2 and word[0].isupper():
                brand_keywords.append(word)

        if brand_keywords:
            # Search brands in Neo4j
            cypher = (
                "MATCH (b:Brand) WHERE toLower(b.name) CONTAINS toLower($brand) "
                "OPTIONAL MATCH (b)-[:HAS_MODEL]->(m:Model)-[:HAS_GENERATION]->(g:Generation) "
                "RETURN b, collect(m) AS models, collect(g) AS generations LIMIT 10"
            )
            for brand_kw in brand_keywords[:2]:
                try:
                    records = await neo4j_graph.run_raw(cypher, {"brand": brand_kw})
                    for rec in records:
                        if rec.get("b"):
                            result.brands.append(dict(rec["b"]))
                        for m in rec.get("models", []):
                            result.models.append(dict(m))
                        for g in rec.get("generations", []):
                            result.generations.append(dict(g))
                except Exception as exc:
                    logger.warning("graph_search_neo4j_error", error=str(exc))

        if relationship_type:
            rel_map = {
                "evolved": "EVOLVES_INTO",
                "inspired": "INFLUENCED_BY",
                "facelift": "FACELIFT_OF",
                "successor": "EVOLVES_INTO",
                "predecessor": "EVOLVES_INTO",
            }
            cypher_rel = (
                f"MATCH (a:Generation)-[r:{rel_map[relationship_type]}]->(b:Generation) "
                "RETURN a, r, b LIMIT 20"
            )
            try:
                records = await neo4j_graph.run_raw(cypher_rel)
                for rec in records:
                    result.nodes.append({"from": dict(rec["a"]), "to": dict(rec["b"])})
                    result.edges.append({"type": rel_map[relationship_type], **dict(rec["r"])})
            except Exception as exc:
                logger.warning("graph_search_rel_error", error=str(exc))

        return result

    # ── Hybrid search ─────────────────────────────────────────────────────────

    async def hybrid_search(
        self,
        query: str,
        image: bytes | None = None,
        filters: dict[str, Any] | None = None,
        limit: int = 20,
    ) -> list[SearchResult]:
        """
        Run semantic + full-text keyword search in parallel, merge with
        Reciprocal Rank Fusion (RRF), apply filters, deduplicate, and rank.
        """
        import asyncio

        semantic_task = asyncio.create_task(
            self.semantic_search(query, limit=limit * 2, filters=filters)
        )
        keyword_task = asyncio.create_task(
            self._keyword_search(query, limit=limit * 2, filters=filters)
        )

        if image is not None:
            visual_task = asyncio.create_task(self.visual_search(image, limit=limit))
        else:
            visual_task = None

        semantic_results = await semantic_task
        keyword_results = await keyword_task
        visual_results = await visual_task if visual_task else []

        merged = _reciprocal_rank_fusion(
            [semantic_results, keyword_results, visual_results],
            k=60,
        )

        # Deduplicate and limit
        seen: set[int] = set()
        deduped: list[SearchResult] = []
        for r in merged:
            if r.generation_id not in seen:
                seen.add(r.generation_id)
                deduped.append(r)
            if len(deduped) >= limit:
                break

        for i, r in enumerate(deduped):
            r.rank = i + 1

        return deduped

    # ── Similar generations ───────────────────────────────────────────────────

    async def get_similar_generations(
        self, generation_id: int, limit: int = 10
    ) -> list[dict[str, Any]]:
        """
        Find generations visually similar to the given generation,
        excluding the same model.
        """
        from app.db.postgresql.models import Generation, CarModel

        result = await self._db.execute(
            select(Generation.visual_embedding, Generation.model_id).where(
                Generation.id == generation_id
            )
        )
        row = result.one_or_none()
        if row is None or row[0] is None:
            return []

        embedding, model_id = row

        # Search pgvector excluding same model
        sql = text(
            """
            SELECT
                g.id AS generation_id,
                g.model_id,
                m.brand_id,
                b.name AS brand_name,
                m.name AS model_name,
                g.code_name,
                g.year_start,
                g.year_end,
                m.body_type,
                1 - (g.visual_embedding <=> :embedding) AS score
            FROM generations g
            JOIN car_models m ON m.id = g.model_id
            JOIN brands b ON b.id = m.brand_id
            WHERE g.visual_embedding IS NOT NULL
              AND g.model_id != :model_id
              AND g.id != :generation_id
            ORDER BY g.visual_embedding <=> :embedding
            LIMIT :limit
            """
        )
        res = await self._db.execute(
            sql,
            {
                "embedding": f"[{','.join(str(x) for x in embedding)}]",
                "model_id": model_id,
                "generation_id": generation_id,
                "limit": limit,
            },
        )
        rows = res.mappings().all()
        return [dict(r) for r in rows]

    # ── Private helpers ───────────────────────────────────────────────────────

    async def _vector_search_pg(
        self,
        embedding: list[float],
        limit: int,
        filters: dict[str, Any] | None = None,
        emb_col: str = "visual_embedding",
        min_score: float | None = None,
    ) -> list[SearchResult]:
        """Execute a pgvector cosine-similarity search with optional filters."""
        min_score = min_score if min_score is not None else settings.VECTOR_SEARCH_MIN_SCORE

        filter_clauses = []
        bind_params: dict[str, Any] = {
            "embedding": f"[{','.join(str(x) for x in embedding)}]",
            "limit": limit,
            "min_score": min_score,
        }

        if filters:
            if filters.get("brand_id"):
                filter_clauses.append("m.brand_id = :brand_id")
                bind_params["brand_id"] = filters["brand_id"]
            if filters.get("year_from"):
                filter_clauses.append("g.year_start >= :year_from")
                bind_params["year_from"] = filters["year_from"]
            if filters.get("year_to"):
                filter_clauses.append("(g.year_end IS NULL OR g.year_end <= :year_to)")
                bind_params["year_to"] = filters["year_to"]
            if filters.get("body_type"):
                filter_clauses.append("m.body_type = :body_type")
                bind_params["body_type"] = filters["body_type"]

        where_extra = (" AND " + " AND ".join(filter_clauses)) if filter_clauses else ""

        sql = text(
            f"""
            SELECT
                g.id AS generation_id,
                g.model_id,
                m.brand_id,
                b.name AS brand_name,
                m.name AS model_name,
                g.code_name,
                g.year_start,
                g.year_end,
                m.body_type,
                1 - (g.{emb_col} <=> :embedding::vector) AS score,
                (SELECT vi.url FROM vehicle_images vi
                 WHERE vi.generation_id = g.id AND vi.processed = TRUE
                 ORDER BY vi.id LIMIT 1) AS image_url
            FROM generations g
            JOIN car_models m ON m.id = g.model_id
            JOIN brands b ON b.id = m.brand_id
            WHERE g.{emb_col} IS NOT NULL
              AND (1 - (g.{emb_col} <=> :embedding::vector)) >= :min_score
              {where_extra}
            ORDER BY g.{emb_col} <=> :embedding::vector
            LIMIT :limit
            """
        )

        result = await self._db.execute(sql, bind_params)
        rows = result.mappings().all()

        return [
            SearchResult(
                generation_id=row["generation_id"],
                model_id=row["model_id"],
                brand_id=row["brand_id"],
                brand_name=row["brand_name"],
                model_name=row["model_name"],
                code_name=row["code_name"],
                year_start=row["year_start"],
                year_end=row["year_end"],
                body_type=row["body_type"],
                score=round(float(row["score"]), 4),
                image_url=row["image_url"],
            )
            for row in rows
        ]

    async def _keyword_search(
        self,
        query: str,
        limit: int,
        filters: dict[str, Any] | None = None,
    ) -> list[SearchResult]:
        """Full-text search using PostgreSQL pg_trgm similarity."""
        filter_clauses = []
        bind_params: dict[str, Any] = {"query": query, "limit": limit}

        if filters:
            if filters.get("brand_id"):
                filter_clauses.append("m.brand_id = :brand_id")
                bind_params["brand_id"] = filters["brand_id"]
            if filters.get("body_type"):
                filter_clauses.append("m.body_type = :body_type")
                bind_params["body_type"] = filters["body_type"]

        where_extra = (" AND " + " AND ".join(filter_clauses)) if filter_clauses else ""

        sql = text(
            f"""
            SELECT
                g.id AS generation_id,
                g.model_id,
                m.brand_id,
                b.name AS brand_name,
                m.name AS model_name,
                g.code_name,
                g.year_start,
                g.year_end,
                m.body_type,
                greatest(
                    similarity(b.name, :query),
                    similarity(m.name, :query),
                    coalesce(similarity(g.code_name, :query), 0)
                ) AS score,
                NULL AS image_url
            FROM generations g
            JOIN car_models m ON m.id = g.model_id
            JOIN brands b ON b.id = m.brand_id
            WHERE (
                b.name % :query OR m.name % :query OR
                to_tsvector('english', b.name || ' ' || m.name) @@ plainto_tsquery('english', :query)
            )
            {where_extra}
            ORDER BY score DESC
            LIMIT :limit
            """
        )

        try:
            result = await self._db.execute(sql, bind_params)
            rows = result.mappings().all()
        except Exception as exc:
            logger.warning("keyword_search_failed", error=str(exc))
            return []

        return [
            SearchResult(
                generation_id=row["generation_id"],
                model_id=row["model_id"],
                brand_id=row["brand_id"],
                brand_name=row["brand_name"],
                model_name=row["model_name"],
                code_name=row["code_name"],
                year_start=row["year_start"],
                year_end=row["year_end"],
                body_type=row["body_type"],
                score=round(float(row["score"]), 4),
                image_url=None,
            )
            for row in rows
        ]


# ── Reciprocal Rank Fusion ────────────────────────────────────────────────────


def _reciprocal_rank_fusion(
    result_lists: list[list[SearchResult]],
    k: int = 60,
) -> list[SearchResult]:
    """
    Merge multiple ranked lists using Reciprocal Rank Fusion (RRF).
    Score = sum(1 / (k + rank)) across all lists.
    """
    rrf_scores: dict[int, float] = {}
    result_map: dict[int, SearchResult] = {}

    for result_list in result_lists:
        for rank, sr in enumerate(result_list, start=1):
            gid = sr.generation_id
            rrf_scores[gid] = rrf_scores.get(gid, 0.0) + 1.0 / (k + rank)
            if gid not in result_map:
                result_map[gid] = sr

    sorted_ids = sorted(rrf_scores, key=lambda gid: rrf_scores[gid], reverse=True)
    merged = []
    for gid in sorted_ids:
        sr = result_map[gid]
        sr.score = round(rrf_scores[gid], 6)
        merged.append(sr)

    return merged


def _sr_to_dict(sr: SearchResult) -> dict[str, Any]:
    return {
        "generation_id": sr.generation_id,
        "model_id": sr.model_id,
        "brand_id": sr.brand_id,
        "brand_name": sr.brand_name,
        "model_name": sr.model_name,
        "code_name": sr.code_name,
        "year_start": sr.year_start,
        "year_end": sr.year_end,
        "body_type": sr.body_type,
        "score": sr.score,
        "image_url": sr.image_url,
        "rank": sr.rank,
    }
