from __future__ import annotations

from typing import Any

import structlog
from fastapi import APIRouter, HTTPException, Query, status

from app.core.deps import AdminUser, CacheClient, DBSession, GraphClient
from app.db.postgresql.repositories.brand_repo import BrandRepository
from app.db.postgresql.repositories.generation_repo import GenerationRepository
from app.schemas.automotive import (
    DesignDNA,
    EvolutionEdge,
    EvolutionPath,
    LineageTree,
)

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/evolution", tags=["evolution"])

_LINEAGE_TTL = 600
_GRAPH_TTL = 900


# ── Evolution tree ────────────────────────────────────────────────────────────


@router.get("/tree/{generation_id}", response_model=dict)
async def get_evolution_tree(
    generation_id: int,
    db: DBSession,
    cache: CacheClient,
    graph: GraphClient,
    max_depth: int = Query(6, ge=1, le=15),
) -> dict[str, Any]:
    cache_key = f"cache:evolution:tree:{generation_id}:{max_depth}"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    gen_repo = GenerationRepository(db)
    generation = await gen_repo.get_by_id(generation_id)
    if generation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Generation {generation_id} not found",
        )

    tree = await graph.get_lineage(generation_id, max_depth=max_depth)
    chain = await gen_repo.get_evolution_chain(generation_id)

    result: dict[str, Any] = {
        "generation_id": generation_id,
        "graph_lineage": tree,
        "db_chain": [
            {
                "id": g.id,
                "code_name": g.code_name,
                "year_start": g.year_start,
                "year_end": g.year_end,
                "generation_number": g.generation_number,
            }
            for g in chain
        ],
    }
    await cache.set(cache_key, result, ttl=_LINEAGE_TTL)
    return result


# ── Evolution path ────────────────────────────────────────────────────────────


@router.get("/path/{from_id}/{to_id}")
async def get_evolution_path(
    from_id: int,
    to_id: int,
    db: DBSession,
    cache: CacheClient,
    graph: GraphClient,
) -> dict[str, Any]:
    if from_id == to_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="from_id and to_id must be different",
        )

    cache_key = f"cache:evolution:path:{from_id}:{to_id}"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    gen_repo = GenerationRepository(db)
    from_gen = await gen_repo.get_by_id(from_id)
    to_gen = await gen_repo.get_by_id(to_id)

    if from_gen is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Generation {from_id} not found")
    if to_gen is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Generation {to_id} not found")

    steps = await graph.get_evolution_path(from_id, to_id)

    result: dict[str, Any] = {
        "from_generation_id": from_id,
        "to_generation_id": to_id,
        "steps": steps,
        "total_steps": len(steps),
        "path_found": len(steps) > 0,
    }
    await cache.set(cache_key, result, ttl=_LINEAGE_TTL)
    return result


# ── Cross-brand connections ───────────────────────────────────────────────────


@router.get("/cross-brand/{brand_id}")
async def get_cross_brand_connections(
    brand_id: int,
    db: DBSession,
    cache: CacheClient,
    graph: GraphClient,
) -> dict[str, Any]:
    cache_key = f"cache:evolution:cross-brand:{brand_id}"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    brand_repo = BrandRepository(db)
    brand = await brand_repo.get_by_id(brand_id)
    if brand is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Brand {brand_id} not found")

    connections = await graph.find_cross_brand_connections(brand_id)

    result: dict[str, Any] = {
        "brand_id": brand_id,
        "brand_name": brand.name,
        "cross_brand_influences": connections,
        "total": len(connections),
    }
    await cache.set(cache_key, result, ttl=_GRAPH_TTL)
    return result


# ── Analyze (create new evolution edge) ───────────────────────────────────────


@router.post("/analyze")
async def analyze_evolution(
    payload: EvolutionEdge,
    db: DBSession,
    graph: GraphClient,
    _admin: AdminUser,
) -> dict[str, Any]:
    gen_repo = GenerationRepository(db)

    from_gen = await gen_repo.get_by_id(payload.from_generation_id)
    to_gen = await gen_repo.get_by_id(payload.to_generation_id)

    if from_gen is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"From-generation {payload.from_generation_id} not found",
        )
    if to_gen is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"To-generation {payload.to_generation_id} not found",
        )

    await graph.create_evolution_edge(
        from_generation_id=payload.from_generation_id,
        to_generation_id=payload.to_generation_id,
        similarity_score=payload.similarity_score,
        year_delta=payload.year_delta,
    )

    logger.info(
        "Evolution edge created",
        from_id=payload.from_generation_id,
        to_id=payload.to_generation_id,
        score=payload.similarity_score,
    )
    return {
        "status": "created",
        "edge": payload.model_dump(),
    }


# ── Design DNA per brand ──────────────────────────────────────────────────────


@router.get("/design-dna/{brand_id}", response_model=DesignDNA)
async def get_design_dna(
    brand_id: int,
    db: DBSession,
    cache: CacheClient,
    graph: GraphClient,
) -> DesignDNA:
    cache_key = f"cache:evolution:dna:{brand_id}"
    cached = await cache.get(cache_key)
    if cached:
        return DesignDNA(**cached)

    brand_repo = BrandRepository(db)
    brand = await brand_repo.get_by_id(brand_id)
    if brand is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Brand {brand_id} not found")

    graph_data = await graph.get_brand_dna_graph(brand_id)

    # Attempt to generate key_design_traits via YandexGPT Pro
    from app.core.config import settings as _s
    key_design_traits: list[str] = []
    if _s.YANDEX_API_KEY and _s.YANDEX_FOLDER_ID:
        try:
            import json as _json
            from app.services.ai.analysis_service import AnalysisService

            _ai = AnalysisService()
            _gens = graph_data.get("generations", [])[:10]
            _gens_ctx = "\n".join(
                f"  - {g.get('code_name') or 'Gen'} ({g.get('year_start', '?')}): "
                f"{g.get('description') or ''}"
                for g in _gens
            ) or "  нет данных"
            _prompt = (
                f"Перечисли 5-7 ключевых дизайн-черт и стилистических принципов бренда {brand.name}. "
                f"Поколения:\n{_gens_ctx}\n\n"
                f"Верни JSON-массив коротких строк (до 10 слов каждая): "
                f'["черта 1", "черта 2", ...]'
            )
            _text, _ = await _ai._call_yandexgpt(_prompt, max_tokens=300, temperature=0.3)
            _clean = _text.replace("```json", "").replace("```", "").strip()
            _s_idx = _clean.find("[")
            _e_idx = _clean.rfind("]")
            if _s_idx != -1 and _e_idx > _s_idx:
                _parsed = _json.loads(_clean[_s_idx:_e_idx + 1])
                if isinstance(_parsed, list):
                    key_design_traits = [str(t) for t in _parsed]
        except Exception as _exc:
            logger.warning("yandex_key_design_traits_failed", brand=brand.name, error=str(_exc))

    dna = DesignDNA(
        brand_id=brand_id,
        brand_name=brand.name,
        nodes=graph_data.get("generations", []),
        edges=graph_data.get("edges", []),
        key_design_traits=key_design_traits,
        visual_cohesion_score=None,
    )
    await cache.set(cache_key, dna.model_dump(mode="json"), ttl=_GRAPH_TTL)
    return dna
