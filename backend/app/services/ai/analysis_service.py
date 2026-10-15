from __future__ import annotations

import json
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any, TypeVar

import structlog
from pydantic import BaseModel, ValidationError
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.services.ai.schemas import ComparisonNarrative, EvolutionNarrative, PredictionNarrative, SourcedFact

logger = structlog.get_logger(__name__)

SchemaT = TypeVar("SchemaT", bound=BaseModel)

# ── LLM generation cost/latency observability ───────────────────────────────
#
# Narrative generation ($/tokens, third-party API) is logged separately from
# embedding inference (GPU/compute-time, see EmbeddingPipeline in
# vector_search.py and generate_visual_embeddings in embedding_worker.py) —
# the two pipelines have fundamentally different cost shapes and shouldn't be
# conflated in one metric.
#
# Prices are USD per 1M tokens, approximate and manually maintained — OpenAI
# publishes these; Yandex's are regional/opaque, so the Yandex figure below
# is a rough placeholder, not billed truth. Treat estimated_cost_usd as a
# ballpark, not an invoice.
_PRICE_PER_1M_TOKENS_USD: dict[str, tuple[float, float]] = {
    # model: (prompt_price, completion_price)
    "gpt-4o": (2.50, 10.00),
    "yandexgpt-pro": (0.60, 0.60),  # placeholder — Yandex doesn't publish a stable USD rate
}


def _estimate_cost_usd(model: str, prompt_tokens: int, completion_tokens: int) -> float | None:
    prices = _PRICE_PER_1M_TOKENS_USD.get(model)
    if prices is None:
        return None
    prompt_price, completion_price = prices
    return round((prompt_tokens * prompt_price + completion_tokens * completion_price) / 1_000_000, 6)


def _log_llm_usage(
    provider: str,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    duration_ms: float,
    entity_id: int | str | None = None,
) -> None:
    logger.info(
        "llm_generation",
        provider=provider,
        model=model,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=prompt_tokens + completion_tokens,
        duration_ms=round(duration_ms, 1),
        estimated_cost_usd=_estimate_cost_usd(model, prompt_tokens, completion_tokens),
        entity_id=entity_id,
    )


# ── Result types ──────────────────────────────────────────────────────────────


@dataclass
class ComparisonResult:
    entity1_id: int
    entity2_id: int
    similarity_score: float | None
    comparison_text: str
    visual_differences: list[str]
    design_continuity: float | None
    facts: list[SourcedFact] = field(default_factory=list)


@dataclass
class FuturePrediction:
    model_id: int
    prediction_text: str
    design_trends: list[str]
    confidence: float
    facts: list[SourcedFact] = field(default_factory=list)


# ── Analysis service ──────────────────────────────────────────────────────────


class AnalysisService:
    """
    AI-powered analysis service using YandexGPT Pro (primary text) and GPT-4o (vision tasks).
    All methods store results in the database and return the analysis text/object.
    """

    def __init__(self, db: AsyncSession | None = None) -> None:
        self._db = db
        self._openai_client = None

    def _get_openai(self):
        if self._openai_client is None:
            import openai
            self._openai_client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        return self._openai_client

    async def _call_yandexgpt(
        self,
        prompt: str,
        system: str = "Ты эксперт-аналитик в области автомобильного дизайна и истории автопромышленности.",
        max_tokens: int = 2048,
        temperature: float = 0.4,
        entity_id: int | str | None = None,
    ) -> tuple[str, int]:
        """Call YandexGPT Pro API and return (content_text, tokens_used)."""
        import httpx

        if not settings.YANDEX_API_KEY or not settings.YANDEX_FOLDER_ID:
            raise RuntimeError("YANDEX_API_KEY or YANDEX_FOLDER_ID not configured")

        start = time.monotonic()
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://llm.api.cloud.yandex.net/foundationModels/v1/completion",
                headers={"Authorization": f"Api-Key {settings.YANDEX_API_KEY}"},
                json={
                    "modelUri": f"gpt://{settings.YANDEX_FOLDER_ID}/yandexgpt-pro/latest",
                    "completionOptions": {
                        "stream": False,
                        "temperature": temperature,
                        "maxTokens": str(max_tokens),
                    },
                    "messages": [
                        {"role": "system", "text": system},
                        {"role": "user", "text": prompt},
                    ],
                },
            )
            response.raise_for_status()
        duration_ms = (time.monotonic() - start) * 1000

        data = response.json()
        text = (
            data.get("result", {})
            .get("alternatives", [{}])[0]
            .get("message", {})
            .get("text", "")
        )
        usage = data.get("result", {}).get("usage", {})
        prompt_tokens = int(usage.get("inputTextTokens", 0))
        completion_tokens = int(usage.get("completionTokens", 0))

        _log_llm_usage("yandex", "yandexgpt-pro", prompt_tokens, completion_tokens, duration_ms, entity_id)
        return text, prompt_tokens + completion_tokens

    async def _call_gpt4_vision_structured(
        self,
        prompt: str,
        image_urls: list[str],
        schema_cls: type[SchemaT],
        max_tokens: int = 2048,
        entity_id: int | str | None = None,
    ) -> tuple[SchemaT, int]:
        """
        Call GPT-4o with native Structured Outputs — schema-guaranteed JSON,
        no manual extraction. Returns (parsed_object, total_tokens_used).
        """
        client = self._get_openai()
        content_parts: list[dict[str, Any]] = [{"type": "text", "text": prompt}]
        for url in image_urls[:4]:  # GPT-4o supports up to 4 images per message
            content_parts.append({"type": "image_url", "image_url": {"url": url, "detail": "high"}})

        start = time.monotonic()
        response = await client.beta.chat.completions.parse(
            model=settings.OPENAI_CHAT_MODEL,
            max_tokens=max_tokens,
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert automotive design historian and analyst. "
                               "Analyse vehicle designs with precision, focusing on styling cues, "
                               "design language evolution, and visual characteristics. Every factual "
                               "claim you make must be listed as a separate fact with the DB field it "
                               "should trace back to, and its own confidence score.",
                },
                {"role": "user", "content": content_parts},
            ],
            response_format=schema_cls,
        )
        duration_ms = (time.monotonic() - start) * 1000

        parsed = response.choices[0].message.parsed
        if parsed is None:
            raise ValueError("GPT-4o structured output refused/failed to parse")

        usage = response.usage
        prompt_tokens = usage.prompt_tokens if usage else 0
        completion_tokens = usage.completion_tokens if usage else 0
        _log_llm_usage("openai", settings.OPENAI_CHAT_MODEL, prompt_tokens, completion_tokens, duration_ms, entity_id)
        return parsed, prompt_tokens + completion_tokens

    async def _call_yandexgpt_structured(
        self,
        prompt: str,
        schema_cls: type[SchemaT],
        fallback_factory: Callable[[str], SchemaT],
        system: str = "Ты эксперт-аналитик в области автомобильного дизайна и истории автопромышленности.",
        max_tokens: int = 2048,
        temperature: float = 0.4,
        entity_id: int | str | None = None,
    ) -> tuple[SchemaT, int]:
        """
        YandexGPT has no native structured-output mode, so the schema is
        described in the system prompt and the response is validated against
        it. On a validation failure, retry once with the error appended to
        the prompt; if that also fails, fall back to a degraded
        thesis/text-only instance via `fallback_factory` rather than
        silently passing raw unstructured text through as if it were valid
        (the old behaviour of _extract_json's silent fallback).
        """
        schema_prompt = (
            f"{prompt}\n\nRespond with ONLY a JSON object matching this schema "
            f"(no markdown fences, no commentary before or after):\n"
            f"{json.dumps(schema_cls.model_json_schema(), ensure_ascii=False)}"
        )

        def _try_parse(raw: str) -> tuple[SchemaT | None, str]:
            """Returns (parsed_instance_or_None, error_description)."""
            parsed_dict = _extract_json(raw)
            if parsed_dict is None:
                return None, "response contained no extractable JSON object"
            try:
                return schema_cls.model_validate(parsed_dict), ""
            except ValidationError as exc:
                return None, str(exc)

        current_prompt = schema_prompt
        total_tokens = 0
        last_raw = ""
        # One initial attempt plus one retry (2 attempts total) — both failure
        # modes (no JSON found at all, or JSON found but schema-invalid) go
        # through the same retry path rather than only retrying on the
        # latter, so a completely unstructured reply still gets one more
        # chance before degrading.
        for attempt in range(2):
            raw, tokens = await self._call_yandexgpt(current_prompt, system=system, max_tokens=max_tokens, temperature=temperature, entity_id=entity_id)
            total_tokens += tokens
            last_raw = raw
            narrative, error = _try_parse(raw)
            if narrative is not None:
                return narrative, total_tokens

            logger.warning(
                "yandexgpt_structured_parse_failed",
                schema=schema_cls.__name__,
                attempt=attempt + 1,
                error=error,
            )
            current_prompt = (
                f"{schema_prompt}\n\nYour previous response did not match the required schema "
                f"({error}). Return ONLY the corrected JSON object, no other text."
            )

        return fallback_factory(last_raw), total_tokens

    # ── Public analysis methods ───────────────────────────────────────────────

    async def generate_evolution_analysis(self, generation_id: int) -> str:
        """
        Analyse the design evolution of a specific generation.
        Fetches parent/child generations and similarity scores as context.

        Returns the JSON-serialised EvolutionNarrative (thesis + individually
        sourced/scored facts), not free text — see schemas.py. Storing JSON
        text in AIAnalysis.content requires no model/migration change.
        """
        from app.db.postgresql.models import Generation, CarModel, Brand, VehicleImage

        assert self._db is not None, "DB session required"

        # Fetch the generation with model and brand
        stmt = (
            select(Generation, CarModel, Brand)
            .join(CarModel, Generation.model_id == CarModel.id)
            .join(Brand, CarModel.brand_id == Brand.id)
            .where(Generation.id == generation_id)
        )
        result = await self._db.execute(stmt)
        row = result.one_or_none()
        if row is None:
            return f"Generation {generation_id} not found."

        gen, model, brand = row

        # Fetch images for context
        img_result = await self._db.execute(
            select(VehicleImage.url)
            .where(VehicleImage.generation_id == generation_id, VehicleImage.processed == True)  # noqa: E712
            .limit(3)
        )
        image_urls = [r[0] for r in img_result.all()]

        # Fetch sibling generations for comparison context
        sibling_stmt = (
            select(Generation)
            .where(
                Generation.model_id == gen.model_id,
                Generation.id != generation_id,
            )
            .order_by(Generation.year_start)
        )
        sib_result = await self._db.execute(sibling_stmt)
        siblings = sib_result.scalars().all()

        sibling_context = ""
        for sib in siblings:
            sibling_context += (
                f"  - {sib.code_name or 'Generation'} "
                f"({sib.year_start or '?'}–{sib.year_end or 'present'})\n"
            )

        prompt = f"""Analyse the design evolution of the {brand.name} {model.name}
Generation: {gen.code_name or f'Gen {gen.generation_number or generation_id}'}
Years: {gen.year_start or 'Unknown'}–{gen.year_end or 'present'}
Description: {gen.description or 'No description available.'}

Other generations of this model:
{sibling_context or '  None recorded.'}

Cover: key design language characteristics of this generation; how it evolved
from the previous generation (if applicable); significant styling changes and
their cultural/market context; technical design innovations introduced;
overall significance in the model's history. Be specific and cite visual
design elements (grille, headlights, body lines, proportions). For every
factual claim (e.g. a specific spec, date, or design detail), record it as a
separate fact naming the field it came from — use 'generation.description' if
it came from the description above, or 'model_inference' if it's your own
visual/design reasoning rather than a restated fact.
"""

        def _fallback(raw: str) -> EvolutionNarrative:
            return EvolutionNarrative(thesis=raw, facts=[], overall_confidence=0.3)

        if image_urls:
            narrative, tokens = await self._call_gpt4_vision_structured(prompt, image_urls, EvolutionNarrative, max_tokens=1500, entity_id=generation_id)
        else:
            narrative, tokens = await self._call_yandexgpt_structured(prompt, EvolutionNarrative, _fallback, max_tokens=1500, entity_id=generation_id)

        logger.info(
            "evolution_analysis_generated",
            generation_id=generation_id,
            brand=brand.name,
            model=model.name,
            tokens=tokens,
            fact_count=len(narrative.facts),
        )
        return narrative.model_dump_json()

    async def generate_brand_dna_report(self, brand_id: int) -> str:
        """
        Produce a comprehensive brand design DNA report covering all generations.

        Returns the JSON-serialised EvolutionNarrative, same as
        generate_evolution_analysis — see schemas.py.
        """
        from app.db.postgresql.models import Brand, CarModel, Generation

        assert self._db is not None, "DB session required"

        result = await self._db.execute(select(Brand).where(Brand.id == brand_id))
        brand = result.scalar_one_or_none()
        if brand is None:
            return f"Brand {brand_id} not found."

        # Fetch all models and their generations
        models_result = await self._db.execute(
            select(CarModel).where(CarModel.brand_id == brand_id).order_by(CarModel.name)
        )
        models = models_result.scalars().all()

        model_context = ""
        total_generations = 0
        for m in models[:10]:  # Limit to top 10 models for prompt length
            gens_result = await self._db.execute(
                select(Generation)
                .where(Generation.model_id == m.id)
                .order_by(Generation.year_start)
                .limit(5)
            )
            gens = gens_result.scalars().all()
            total_generations += len(gens)
            gen_summary = ", ".join(
                f"{g.code_name or 'Gen'}({g.year_start or '?'})"
                for g in gens
            )
            model_context += f"  - {m.name} [{m.body_type or 'N/A'}]: {gen_summary}\n"

        prompt = f"""Create a comprehensive Brand Design DNA Report for {brand.name}.

Brand Info:
- Country: {brand.country or 'Unknown'}
- Founded: {brand.founded_year or 'Unknown'}
- Description: {brand.description or 'No description.'}

Key Models and Generations:
{model_context}
Total generations analysed: {total_generations}

Your report must cover: brand DNA summary (core visual identity elements
across all models); design philosophy; evolutionary patterns decade by
decade; signature elements (grille shapes, headlight signatures, body
proportions); cross-model DNA flow; cultural/regional context; and likely
future design trajectory based on observed trends. Write as a professional
automotive design analysis report — specific, technical, insightful. For
every factual claim, record it as a separate fact naming the field it came
from (e.g. 'brand.description', 'brand.founded_year') or 'model_inference'
for your own reasoning rather than a restated fact.
"""

        def _fallback(raw: str) -> EvolutionNarrative:
            return EvolutionNarrative(thesis=raw, facts=[], overall_confidence=0.3)

        narrative, tokens = await self._call_yandexgpt_structured(
            prompt,
            EvolutionNarrative,
            _fallback,
            system=(
                "You are a senior automotive design analyst with expertise in brand identity, "
                "design history, and vehicle styling. Write detailed, technically accurate reports."
            ),
            max_tokens=3000,
            entity_id=brand_id,
        )
        logger.info(
            "brand_dna_report_generated",
            brand_id=brand_id,
            brand_name=brand.name,
            tokens=tokens,
            fact_count=len(narrative.facts),
        )
        return narrative.model_dump_json()

    async def compare_generations(
        self, gen1_id: int, gen2_id: int
    ) -> ComparisonResult:
        """
        Visual and analytical comparison of two generations.
        Uses GPT-4o Vision if images are available.
        """
        from app.db.postgresql.models import Generation, CarModel, Brand, VehicleImage

        assert self._db is not None, "DB session required"

        async def _fetch_gen_info(gid: int) -> dict[str, Any]:
            stmt = (
                select(Generation, CarModel, Brand)
                .join(CarModel, Generation.model_id == CarModel.id)
                .join(Brand, CarModel.brand_id == Brand.id)
                .where(Generation.id == gid)
            )
            result = await self._db.execute(stmt)
            row = result.one_or_none()
            if row is None:
                raise ValueError(f"Generation {gid} not found")
            gen, model, brand = row
            imgs_result = await self._db.execute(
                select(VehicleImage.url)
                .where(VehicleImage.generation_id == gid, VehicleImage.processed == True)  # noqa: E712
                .limit(2)
            )
            return {
                "gen": gen,
                "model": model,
                "brand": brand,
                "images": [r[0] for r in imgs_result.all()],
            }

        info1 = await _fetch_gen_info(gen1_id)
        info2 = await _fetch_gen_info(gen2_id)

        g1, m1, b1 = info1["gen"], info1["model"], info1["brand"]
        g2, m2, b2 = info2["gen"], info2["model"], info2["brand"]

        image_urls = info1["images"] + info2["images"]

        prompt = f"""Compare these two vehicles in detail:

VEHICLE 1: {b1.name} {m1.name} {g1.code_name or ''} ({g1.year_start or '?'}–{g1.year_end or 'present'})
VEHICLE 2: {b2.name} {m2.name} {g2.code_name or ''} ({g2.year_start or '?'}–{g2.year_end or 'present'})

Cover: front fascia (grille, headlights, bumper); profile (roofline, door
count, proportions, character lines); rear (taillights, trunk/hatch, rear
fascia); overall design language philosophy; top 5 most significant visual
differences; what influenced each design; and a 0.0-1.0 visual-continuity
score. For every factual claim, record it as a separate fact naming the
field it came from (e.g. 'generation.description', 'vehicle_images[0]') or
'model_inference' for your own visual reasoning.
"""

        def _fallback(raw: str) -> ComparisonNarrative:
            return ComparisonNarrative(
                comparison_text=raw or f"Comparison of generation {gen1_id} and {gen2_id}: Analysis unavailable.",
                visual_differences=[],
                similarity_score=0.5,
                design_continuity=0.5,
                facts=[],
            )

        try:
            if image_urls:
                narrative, _tokens = await self._call_gpt4_vision_structured(prompt, image_urls, ComparisonNarrative, max_tokens=2000, entity_id=f"{gen1_id}:{gen2_id}")
            else:
                narrative, _tokens = await self._call_yandexgpt_structured(prompt, ComparisonNarrative, _fallback, max_tokens=2000, entity_id=f"{gen1_id}:{gen2_id}")

            return ComparisonResult(
                entity1_id=gen1_id,
                entity2_id=gen2_id,
                similarity_score=narrative.similarity_score,
                comparison_text=narrative.comparison_text,
                visual_differences=narrative.visual_differences,
                design_continuity=narrative.design_continuity,
                facts=narrative.facts,
            )
        except Exception as exc:
            logger.warning("compare_generations_failed", error=str(exc))
            return ComparisonResult(
                entity1_id=gen1_id,
                entity2_id=gen2_id,
                similarity_score=None,
                comparison_text=f"Comparison of generation {gen1_id} and {gen2_id}: Analysis unavailable.",
                visual_differences=[],
                design_continuity=None,
                facts=[],
            )

    async def predict_future_generation(self, model_id: int) -> FuturePrediction:
        """
        Analyse the last 3 generations of a model and predict the next generation's design.
        """
        from app.db.postgresql.models import Generation, CarModel, Brand, VehicleImage

        assert self._db is not None, "DB session required"

        # Fetch model and brand
        stmt = (
            select(CarModel, Brand)
            .join(Brand, CarModel.brand_id == Brand.id)
            .where(CarModel.id == model_id)
        )
        result = await self._db.execute(stmt)
        row = result.one_or_none()
        if row is None:
            return FuturePrediction(
                model_id=model_id,
                prediction_text=f"Model {model_id} not found.",
                design_trends=[],
                confidence=0.0,
            )

        model, brand = row

        # Fetch last 3 generations
        gens_result = await self._db.execute(
            select(Generation)
            .where(Generation.model_id == model_id)
            .order_by(desc(Generation.year_start))
            .limit(3)
        )
        generations = gens_result.scalars().all()

        if not generations:
            return FuturePrediction(
                model_id=model_id,
                prediction_text="No generation data available for prediction.",
                design_trends=[],
                confidence=0.0,
            )

        gen_details = ""
        all_image_urls: list[str] = []
        for g in reversed(generations):
            imgs_result = await self._db.execute(
                select(VehicleImage.url)
                .where(VehicleImage.generation_id == g.id, VehicleImage.processed == True)  # noqa: E712
                .limit(1)
            )
            img_urls = [r[0] for r in imgs_result.all()]
            all_image_urls.extend(img_urls)

            gen_details += (
                f"  - {g.code_name or 'Generation'} "
                f"({g.year_start or '?'}–{g.year_end or 'present'}): "
                f"{g.description or 'No description.'}\n"
            )

        prompt = f"""Based on the design evolution of the {brand.name} {model.name}, predict the next generation.

Historical Generations (oldest to newest):
{gen_details}

Brand DNA: {brand.description or 'A manufacturer known for quality and design.'}

Analyse the design trends and predict: exterior design; how it advances the
brand's design philosophy; 5 specific design directions to expect; changes
in proportions/stance/silhouette; how EV/tech trends will affect the design;
and your confidence in this prediction (0.0-1.0). For every factual claim
about the PAST generations you're basing this on, record it as a separate
fact naming the field it came from (e.g. 'generation.description') — use
'model_inference' for the forward-looking prediction itself, since that's
inherently speculative rather than a restated fact.
"""

        def _fallback(raw: str) -> PredictionNarrative:
            return PredictionNarrative(
                prediction_text=raw or "Prediction unavailable.",
                design_trends=[],
                confidence=0.5,
                facts=[],
            )

        try:
            if all_image_urls:
                narrative, _tokens = await self._call_gpt4_vision_structured(prompt, all_image_urls, PredictionNarrative, max_tokens=2000, entity_id=model_id)
            else:
                narrative, _tokens = await self._call_yandexgpt_structured(prompt, PredictionNarrative, _fallback, max_tokens=2000, entity_id=model_id)

            return FuturePrediction(
                model_id=model_id,
                prediction_text=narrative.prediction_text,
                design_trends=narrative.design_trends,
                confidence=narrative.confidence,
                facts=narrative.facts,
            )
        except Exception as exc:
            logger.warning("predict_future_generation_failed", error=str(exc))
            return FuturePrediction(
                model_id=model_id,
                prediction_text="Prediction unavailable.",
                design_trends=[],
                confidence=0.5,
                facts=[],
            )


# ── Utilities ─────────────────────────────────────────────────────────────────


def _extract_json(text: str) -> dict[str, Any] | None:
    """
    Try to extract a JSON object from an LLM response.
    Handles code-fenced JSON blocks as well as raw JSON.
    """
    # Remove ```json ... ``` fences
    if "```" in text:
        parts = text.split("```")
        for i, part in enumerate(parts):
            if part.startswith("json"):
                part = part[4:]
            try:
                return json.loads(part.strip())
            except (json.JSONDecodeError, ValueError):
                continue

    # Try raw parse
    try:
        return json.loads(text.strip())
    except (json.JSONDecodeError, ValueError):
        pass

    # Try to find the first {...} block
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except (json.JSONDecodeError, ValueError):
            pass

    return None
