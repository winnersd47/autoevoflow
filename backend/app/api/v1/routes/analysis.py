from __future__ import annotations

from typing import Any, Literal

import structlog
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, desc

from app.core.deps import CurrentUser, DBSession, CacheClient, OptionalUser
from app.core.structured import complete_structured, StructuredError
from app.db.postgresql.models import AIAnalysis, BodyType, EngineType, Drivetrain, Transmission

logger = structlog.get_logger(__name__)
router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────


class AnalysisResponse(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    analysis_type: str
    content: str
    model_used: str | None
    tokens_used: int | None

    class Config:
        from_attributes = True


class CompareRequest(BaseModel):
    entity1_type: str = Field(..., description="'generation' or 'model'")
    entity1_id: int
    entity2_type: str = Field(..., description="'generation' or 'model'")
    entity2_id: int


class ComparisonResponse(BaseModel):
    entity1_id: int
    entity2_id: int
    similarity_score: float | None
    comparison_text: str
    visual_differences: list[str]
    design_continuity: float | None


class PredictFutureRequest(BaseModel):
    model_id: int
    context: str | None = Field(None, description="Optional design brief or context")


class FuturePredictionResponse(BaseModel):
    model_id: int
    prediction_text: str
    design_trends: list[str]
    confidence: float


class BrandDNARequest(BaseModel):
    include_concepts: bool = True
    years_range: tuple[int, int] | None = None


class AnalysisTypeInfo(BaseModel):
    type: str
    description: str
    supported_entities: list[str]


ANALYSIS_TYPES: list[AnalysisTypeInfo] = [
    AnalysisTypeInfo(
        type="evolution",
        description="Analyse design evolution between generations",
        supported_entities=["generation"],
    ),
    AnalysisTypeInfo(
        type="brand_dna",
        description="Comprehensive brand design DNA report",
        supported_entities=["brand"],
    ),
    AnalysisTypeInfo(
        type="comparison",
        description="Side-by-side comparison of two entities",
        supported_entities=["generation", "model"],
    ),
    AnalysisTypeInfo(
        type="future_prediction",
        description="Predict design direction for next generation",
        supported_entities=["model"],
    ),
    AnalysisTypeInfo(
        type="visual_summary",
        description="Describe visual design language and styling cues",
        supported_entities=["generation"],
    ),
]

VALID_ENTITY_TYPES = {"generation", "model", "brand"}


# ── Helpers ───────────────────────────────────────────────────────────────────


def _get_analysis_service():
    from app.services.ai.analysis_service import AnalysisService
    return AnalysisService()


def _get_celery_app():
    from app.workers.embedding_worker import celery_app
    return celery_app


# ── Routes ────────────────────────────────────────────────────────────────────


@router.post(
    "/generate/{entity_type}/{entity_id}",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger async AI analysis generation",
)
async def trigger_analysis(
    entity_type: str,
    entity_id: int,
    analysis_type: str = "evolution",
    current_user: CurrentUser = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    """Queue an AI analysis generation task via Celery."""
    if entity_type not in VALID_ENTITY_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid entity_type. Must be one of: {', '.join(VALID_ENTITY_TYPES)}",
        )
    known_types = {a.type for a in ANALYSIS_TYPES}
    if analysis_type not in known_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid analysis_type. Must be one of: {', '.join(known_types)}",
        )

    task = _get_celery_app().send_task(
        "workers.generate_ai_analysis",
        kwargs={
            "entity_type": entity_type,
            "entity_id": entity_id,
            "analysis_type": analysis_type,
        },
    )
    logger.info(
        "analysis_task_queued",
        task_id=task.id,
        entity_type=entity_type,
        entity_id=entity_id,
        analysis_type=analysis_type,
    )
    return {
        "task_id": task.id,
        "status": "queued",
        "entity_type": entity_type,
        "entity_id": entity_id,
        "analysis_type": analysis_type,
    }


@router.get(
    "/{entity_type}/{entity_id}",
    response_model=list[AnalysisResponse],
    summary="List all analyses for an entity",
)
async def list_analyses(
    entity_type: str,
    entity_id: int,
    db: DBSession,
    analysis_type: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> list[AnalysisResponse]:
    """Return all stored AI analyses for the given entity."""
    if entity_type not in VALID_ENTITY_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid entity_type. Must be one of: {', '.join(VALID_ENTITY_TYPES)}",
        )
    stmt = (
        select(AIAnalysis)
        .where(
            AIAnalysis.entity_type == entity_type,
            AIAnalysis.entity_id == entity_id,
        )
        .order_by(desc(AIAnalysis.created_at))
        .limit(limit)
        .offset(offset)
    )
    if analysis_type:
        stmt = stmt.where(AIAnalysis.analysis_type == analysis_type)

    result = await db.execute(stmt)
    analyses = result.scalars().all()
    return [AnalysisResponse.model_validate(a) for a in analyses]


@router.get(
    "/{entity_type}/{entity_id}/latest",
    response_model=AnalysisResponse,
    summary="Get most recent analysis for an entity",
)
async def get_latest_analysis(
    entity_type: str,
    entity_id: int,
    db: DBSession,
    analysis_type: str = "evolution",
) -> AnalysisResponse:
    """Return the most recently created analysis for the given entity and type."""
    if entity_type not in VALID_ENTITY_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid entity_type. Must be one of: {', '.join(VALID_ENTITY_TYPES)}",
        )
    stmt = (
        select(AIAnalysis)
        .where(
            AIAnalysis.entity_type == entity_type,
            AIAnalysis.entity_id == entity_id,
            AIAnalysis.analysis_type == analysis_type,
        )
        .order_by(desc(AIAnalysis.created_at))
        .limit(1)
    )
    result = await db.execute(stmt)
    analysis = result.scalar_one_or_none()
    if analysis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No {analysis_type} analysis found for {entity_type} {entity_id}",
        )
    return AnalysisResponse.model_validate(analysis)


@router.post(
    "/compare",
    response_model=ComparisonResponse,
    summary="Compare two entities with AI analysis",
)
async def compare_entities(
    body: CompareRequest,
    db: DBSession,
    cache: CacheClient,
) -> ComparisonResponse:
    """Generate a comparison analysis between two generations or models."""
    if body.entity1_type not in VALID_ENTITY_TYPES or body.entity2_type not in VALID_ENTITY_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid entity_type values",
        )

    cache_key = (
        f"cache:analysis:compare:{body.entity1_type}:{body.entity1_id}"
        f":{body.entity2_type}:{body.entity2_id}"
    )
    cached = await cache.get(cache_key)
    if cached:
        return ComparisonResponse(**cached)

    svc = _get_analysis_service()
    result = await svc.compare_generations(body.entity1_id, body.entity2_id)

    response = ComparisonResponse(
        entity1_id=body.entity1_id,
        entity2_id=body.entity2_id,
        similarity_score=result.similarity_score,
        comparison_text=result.comparison_text,
        visual_differences=result.visual_differences,
        design_continuity=result.design_continuity,
    )
    await cache.set(cache_key, response.model_dump(), ttl=3600)
    return response


@router.post(
    "/predict-future",
    response_model=FuturePredictionResponse,
    summary="Predict next generation design for a model",
)
async def predict_future_generation(
    body: PredictFutureRequest,
    db: DBSession,
    cache: CacheClient,
) -> FuturePredictionResponse:
    """Use AI to predict the next generation's design based on historical trends."""
    cache_key = f"cache:analysis:predict:{body.model_id}"
    cached = await cache.get(cache_key)
    if cached:
        return FuturePredictionResponse(**cached)

    svc = _get_analysis_service()
    prediction = await svc.predict_future_generation(body.model_id)

    response = FuturePredictionResponse(
        model_id=body.model_id,
        prediction_text=prediction.prediction_text,
        design_trends=prediction.design_trends,
        confidence=prediction.confidence,
    )
    await cache.set(cache_key, response.model_dump(), ttl=86400)
    return response


@router.post(
    "/design-dna/{brand_slug}",
    response_model=AnalysisResponse,
    summary="Generate brand design DNA report",
)
async def generate_brand_dna(
    brand_slug: str,
    body: BrandDNARequest,
    db: DBSession,
    cache: CacheClient,
) -> AnalysisResponse:
    """Generate a comprehensive brand design DNA report using AI analysis."""
    from sqlalchemy import select as sql_select
    from app.db.postgresql.models import Brand

    stmt = sql_select(Brand).where(Brand.slug == brand_slug)
    result = await db.execute(stmt)
    brand = result.scalar_one_or_none()
    if brand is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brand '{brand_slug}' not found",
        )

    cache_key = f"cache:analysis:dna:{brand.id}"
    cached = await cache.get(cache_key)
    if cached:
        return AnalysisResponse(**cached)

    svc = _get_analysis_service()
    content = await svc.generate_brand_dna_report(brand.id)

    analysis = AIAnalysis(
        entity_type="brand",
        entity_id=brand.id,
        analysis_type="brand_dna",
        content=content,
        model_used="yandexgpt-pro",
    )
    db.add(analysis)
    await db.flush()
    await db.refresh(analysis)

    response = AnalysisResponse.model_validate(analysis)
    await cache.set(cache_key, response.model_dump(), ttl=86400)
    return response


@router.get(
    "/types",
    response_model=list[AnalysisTypeInfo],
    summary="List available analysis types",
)
async def list_analysis_types() -> list[AnalysisTypeInfo]:
    """Return all supported analysis types and their descriptions."""
    return ANALYSIS_TYPES


# ── VehicleProfile extraction (Фаза 2 — Structured output) ───────────────────


class VehicleProfile(BaseModel):
    """Structured profile extracted from a free-form car listing or history text."""
    make: str = Field(..., description="Марка автомобиля, e.g. Toyota")
    model: str = Field(..., description="Модель, e.g. Camry")
    year: int | None = Field(None, ge=1900, le=2030)
    body_type: BodyType | None = None
    engine_type: EngineType | None = None
    engine_volume_l: float | None = Field(None, ge=0.1, le=20.0, description="Объём двигателя в литрах")
    power_hp: int | None = Field(None, ge=1, le=3000)
    drivetrain: Drivetrain | None = None
    transmission: Transmission | None = None
    mileage_km: int | None = Field(None, ge=0)
    color: str | None = None
    price_rub: int | None = Field(None, ge=0, description="Цена в рублях")
    condition: Literal["excellent", "good", "fair", "poor"] | None = None
    notable_features: list[str] = Field(default_factory=list, max_length=10)
    red_flags: list[str] = Field(default_factory=list, max_length=10,
                                  description="Настораживающие моменты в описании")
    extraction_confidence: float = Field(..., ge=0.0, le=1.0,
                                         description="Уверенность в извлечённых данных")


class ExtractProfileRequest(BaseModel):
    text: str = Field(..., min_length=20, max_length=8000,
                      description="Текст объявления, истории ТО или описания автомобиля")


@router.post(
    "/extract-profile",
    response_model=VehicleProfile,
    summary="Extract structured VehicleProfile from listing or history text",
)
async def extract_vehicle_profile(body: ExtractProfileRequest) -> VehicleProfile:
    """Parse a free-form car listing or maintenance history into a validated VehicleProfile.

    Uses GPT-4o with Pydantic validation + auto-retry on schema mismatch.
    Returns null fields where information is absent — never hallucinated values.
    """
    messages = [
        {
            "role": "user",
            "content": (
                "Извлеки структурированный профиль автомобиля из следующего текста. "
                "Если информация отсутствует — ставь null. Не придумывай данные.\n\n"
                f"Текст:\n{body.text}"
            ),
        }
    ]
    try:
        profile = await complete_structured(messages, VehicleProfile, temperature=0.1)
    except StructuredError as exc:
        logger.error("extract-profile structured output failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI extraction failed — try again or simplify the input text",
        )
    return profile
