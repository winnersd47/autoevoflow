from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator

from app.db.postgresql.models import (
    BodyType,
    Drivetrain,
    EngineType,
    Transmission,
    ViewType,
)


# ── Shared config ─────────────────────────────────────────────────────────────


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ── Brand ─────────────────────────────────────────────────────────────────────


class BrandCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=255, pattern=r"^[a-z0-9-]+$")
    country: str | None = Field(None, max_length=100)
    founded_year: int | None = Field(None, ge=1769, le=2100)
    description: str | None = None
    logo_url: str | None = Field(None, max_length=2048)


class BrandUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    country: str | None = Field(None, max_length=100)
    founded_year: int | None = Field(None, ge=1769, le=2100)
    description: str | None = None
    logo_url: str | None = Field(None, max_length=2048)


class BrandRead(ORMBase):
    id: int
    name: str
    slug: str
    country: str | None
    founded_year: int | None
    description: str | None
    logo_url: str | None
    created_at: datetime
    updated_at: datetime


class BrandReadWithModels(BrandRead):
    models: list[ModelRead] = []


# ── Car Model ─────────────────────────────────────────────────────────────────


class ModelCreate(BaseModel):
    brand_id: int
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=512, pattern=r"^[a-z0-9-]+$")
    body_type: BodyType | None = None
    is_concept: bool = False
    description: str | None = None


class ModelUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    body_type: BodyType | None = None
    is_concept: bool | None = None
    description: str | None = None


class ModelRead(ORMBase):
    id: int
    brand_id: int
    name: str
    slug: str
    body_type: BodyType | None
    is_concept: bool
    description: str | None
    created_at: datetime
    updated_at: datetime


class ModelReadWithGenerations(ModelRead):
    generations: list[GenerationRead] = []


# ── Generation ────────────────────────────────────────────────────────────────


class GenerationCreate(BaseModel):
    model_id: int
    code_name: str | None = Field(None, max_length=255)
    year_start: int | None = Field(None, ge=1880, le=2100)
    year_end: int | None = Field(None, ge=1880, le=2100)
    facelift_of_id: int | None = None
    description: str | None = None
    generation_number: int | None = Field(None, ge=1)

    @model_validator(mode="after")
    def validate_years(self) -> "GenerationCreate":
        if self.year_start and self.year_end and self.year_start > self.year_end:
            raise ValueError("year_start must be <= year_end")
        return self


class GenerationUpdate(BaseModel):
    code_name: str | None = Field(None, max_length=255)
    year_start: int | None = Field(None, ge=1880, le=2100)
    year_end: int | None = Field(None, ge=1880, le=2100)
    description: str | None = None
    generation_number: int | None = Field(None, ge=1)


class GenerationRead(ORMBase):
    id: int
    model_id: int
    code_name: str | None
    year_start: int | None
    year_end: int | None
    facelift_of_id: int | None
    description: str | None
    generation_number: int | None
    created_at: datetime
    updated_at: datetime


class GenerationReadFull(GenerationRead):
    trims: list[TrimRead] = []
    images: list[ImageRead] = []


# ── Trim ──────────────────────────────────────────────────────────────────────


class TrimCreate(BaseModel):
    generation_id: int
    name: str = Field(..., min_length=1, max_length=255)
    engine_type: EngineType | None = None
    displacement_cc: int | None = Field(None, ge=50, le=20000)
    power_hp: int | None = Field(None, ge=1, le=5000)
    torque_nm: int | None = Field(None, ge=1, le=10000)
    weight_kg: int | None = Field(None, ge=100, le=100000)
    drivetrain: Drivetrain | None = None
    transmission: Transmission | None = None


class TrimRead(ORMBase):
    id: int
    generation_id: int
    name: str
    engine_type: EngineType | None
    displacement_cc: int | None
    power_hp: int | None
    torque_nm: int | None
    weight_kg: int | None
    drivetrain: Drivetrain | None
    transmission: Transmission | None


# ── Vehicle Image ─────────────────────────────────────────────────────────────


class ImageRead(ORMBase):
    id: int
    generation_id: int
    url: str
    storage_key: str | None
    source: str | None
    view_type: ViewType
    processed: bool
    thumbnail_url: str | None
    width: int | None
    height: int | None
    created_at: datetime


# ── Evolution / Graph ─────────────────────────────────────────────────────────


class EvolutionEdge(BaseModel):
    from_generation_id: int
    to_generation_id: int
    similarity_score: float = Field(..., ge=0.0, le=1.0)
    year_delta: int
    edge_type: str = "EVOLVES_INTO"


class InfluenceEdge(BaseModel):
    from_generation_id: int
    to_generation_id: int
    strength: float = Field(..., ge=0.0, le=1.0)
    edge_type: str = "INFLUENCED_BY"


class LineageNode(BaseModel):
    generation_id: int
    code_name: str | None
    year_start: int | None
    year_end: int | None
    model_name: str | None = None
    brand_name: str | None = None


class LineageTree(BaseModel):
    root: LineageNode
    ancestors: list[dict[str, Any]] = []
    descendants: list[dict[str, Any]] = []


class EvolutionPath(BaseModel):
    from_generation_id: int
    to_generation_id: int
    steps: list[dict[str, Any]]
    total_steps: int


class DesignDNA(BaseModel):
    brand_id: int
    brand_name: str
    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []
    key_design_traits: list[str] = []
    visual_cohesion_score: float | None = None


# ── Search ────────────────────────────────────────────────────────────────────


class SearchQuery(BaseModel):
    query: str = Field(..., min_length=1, max_length=512)
    entity_types: list[str] = Field(default=["generation", "model", "brand"])
    limit: int = Field(default=10, ge=1, le=100)
    min_score: float = Field(default=0.6, ge=0.0, le=1.0)
    filters: dict[str, Any] = {}


class VectorSearchQuery(BaseModel):
    embedding: list[float] = Field(..., min_length=1)
    entity_type: str = "generation"
    limit: int = Field(default=10, ge=1, le=100)
    min_score: float = Field(default=0.6, ge=0.0, le=1.0)
    embedding_column: str = "visual_embedding"
    filters: dict[str, Any] = {}


class GraphSearchQuery(BaseModel):
    query: str = Field(..., min_length=1, max_length=512)
    start_entity_type: str = "brand"
    start_entity_id: int
    max_depth: int = Field(default=3, ge=1, le=10)
    relationship_types: list[str] = ["EVOLVES_INTO", "INFLUENCED_BY"]


class SearchResult(BaseModel):
    entity_type: str
    entity_id: int
    score: float
    data: dict[str, Any]
    highlight: str | None = None


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResult]
    total: int
    took_ms: float


class AutocompleteSuggestion(BaseModel):
    text: str
    entity_type: str
    entity_id: int
    score: float


# ── AI Analysis ───────────────────────────────────────────────────────────────


class AIAnalysisRequest(BaseModel):
    entity_type: str = Field(..., pattern=r"^(brand|model|generation|trim)$")
    entity_id: int
    analysis_type: str = Field(..., min_length=1, max_length=255)
    context: dict[str, Any] = {}
    force_refresh: bool = False


class CompareRequest(BaseModel):
    entity_type: str = Field(..., pattern=r"^(generation|model|brand)$")
    entity_ids: list[int] = Field(..., min_length=2, max_length=10)
    comparison_aspects: list[str] = Field(
        default=["design", "performance", "market_positioning"]
    )


class FuturePredictionRequest(BaseModel):
    brand_id: int
    model_id: int | None = None
    target_year: int = Field(..., ge=2024, le=2040)
    context: dict[str, Any] = {}


class AIAnalysisResult(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    analysis_type: str
    content: str
    model_used: str | None
    tokens_used: int | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Pagination ────────────────────────────────────────────────────────────────


class PaginatedResponse(BaseModel):
    items: list[Any]
    total: int
    page: int
    page_size: int
    pages: int

    @classmethod
    def from_list(
        cls, items: list[Any], total: int, page: int, page_size: int
    ) -> "PaginatedResponse":
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            pages=max(1, -(-total // page_size)),  # ceil division
        )


# ── Forward references ────────────────────────────────────────────────────────

BrandReadWithModels.model_rebuild()
ModelReadWithGenerations.model_rebuild()
