from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

import structlog
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings

logger = structlog.get_logger(__name__)


# ── Result types ──────────────────────────────────────────────────────────────


@dataclass
class ComparisonResult:
    entity1_id: int
    entity2_id: int
    similarity_score: float | None
    comparison_text: str
    visual_differences: list[str]
    design_continuity: float | None


@dataclass
class FuturePrediction:
    model_id: int
    prediction_text: str
    design_trends: list[str]
    confidence: float


# ── Analysis service ──────────────────────────────────────────────────────────


class AnalysisService:
    """
    AI-powered analysis service using Claude (primary) and GPT-4o (vision tasks).
    All methods store results in the database and return the analysis text/object.
    """

    def __init__(self, db: AsyncSession | None = None) -> None:
        self._db = db
        self._anthropic_client = None
        self._openai_client = None

    def _get_anthropic(self):
        if self._anthropic_client is None:
            import anthropic
            self._anthropic_client = anthropic.AsyncAnthropic(
                api_key=settings.ANTHROPIC_API_KEY
            )
        return self._anthropic_client

    def _get_openai(self):
        if self._openai_client is None:
            import openai
            self._openai_client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        return self._openai_client

    async def _call_claude(
        self,
        prompt: str,
        system: str = "You are an expert automotive design historian and analyst.",
        max_tokens: int = 2048,
    ) -> tuple[str, int]:
        """Call Claude API and return (content_text, tokens_used)."""
        client = self._get_anthropic()
        response = await client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        content = response.content[0].text if response.content else ""
        tokens = response.usage.input_tokens + response.usage.output_tokens
        return content, tokens

    async def _call_gpt4_vision(
        self,
        prompt: str,
        image_urls: list[str],
        max_tokens: int = 2048,
    ) -> str:
        """Call GPT-4o with image URLs for vision-based comparison."""
        client = self._get_openai()
        content_parts: list[dict[str, Any]] = [{"type": "text", "text": prompt}]
        for url in image_urls[:4]:  # GPT-4o supports up to 4 images per message
            content_parts.append({
                "type": "image_url",
                "image_url": {"url": url, "detail": "high"},
            })

        response = await client.chat.completions.create(
            model=settings.OPENAI_CHAT_MODEL,
            max_tokens=max_tokens,
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert automotive design historian and analyst. "
                               "Analyse vehicle designs with precision, focusing on styling cues, "
                               "design language evolution, and visual characteristics.",
                },
                {"role": "user", "content": content_parts},
            ],
        )
        return response.choices[0].message.content or ""

    # ── Public analysis methods ───────────────────────────────────────────────

    async def generate_evolution_analysis(self, generation_id: int) -> str:
        """
        Analyse the design evolution of a specific generation.
        Fetches parent/child generations and similarity scores as context.
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

Please provide:
1. Key design language characteristics of this generation
2. How it evolved from the previous generation (if applicable)
3. Significant styling changes and their cultural/market context
4. Technical design innovations introduced
5. Overall significance in the model's history

Be specific and cite visual design elements (grille, headlights, body lines, proportions).
"""

        if image_urls:
            content = await self._call_gpt4_vision(prompt, image_urls, max_tokens=1500)
        else:
            content, _ = await self._call_claude(prompt, max_tokens=1500)

        logger.info(
            "evolution_analysis_generated",
            generation_id=generation_id,
            brand=brand.name,
            model=model.name,
        )
        return content

    async def generate_brand_dna_report(self, brand_id: int) -> str:
        """
        Produce a comprehensive brand design DNA report covering all generations.
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

Your report must cover:
1. BRAND DNA SUMMARY: Core visual identity elements that appear across all models
2. DESIGN PHILOSOPHY: The underlying aesthetic principles and design language
3. EVOLUTIONARY PATTERNS: How the brand's design has evolved decade by decade
4. SIGNATURE ELEMENTS: Recurring design cues (grille shapes, headlight signatures, body proportions)
5. CROSS-MODEL DNA: How DNA flows between different model lines
6. CULTURAL CONTEXT: How regional/market factors shaped the brand's design choices
7. FUTURE DIRECTION: Based on observed trends, the likely design trajectory

Write as a professional automotive design analysis report. Be specific, technical, and insightful.
"""

        content, tokens = await self._call_claude(
            prompt,
            system=(
                "You are a senior automotive design analyst with expertise in brand identity, "
                "design history, and vehicle styling. Write detailed, technically accurate reports."
            ),
            max_tokens=3000,
        )
        logger.info(
            "brand_dna_report_generated",
            brand_id=brand_id,
            brand_name=brand.name,
            tokens=tokens,
        )
        return content

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

Provide a structured comparison covering:
1. FRONT FASCIA: Grille, headlights, bumper design
2. PROFILE: Roofline, door count, body proportions, character lines
3. REAR: Taillights, trunk/hatch, rear fascia
4. OVERALL DESIGN LANGUAGE: Philosophy comparison
5. KEY DIFFERENCES: Top 5 most significant visual differences
6. DESIGN INFLUENCES: What influenced each design
7. CONTINUITY SCORE: Rate the visual similarity from 0.0 to 1.0

Return the response as JSON with keys:
comparison_text, visual_differences (array of strings), similarity_score (float), design_continuity (float)
"""

        try:
            if image_urls:
                raw = await self._call_gpt4_vision(prompt, image_urls, max_tokens=2000)
            else:
                raw, _ = await self._call_claude(prompt, max_tokens=2000)

            # Try to parse JSON from the response
            parsed = _extract_json(raw)
            if parsed:
                return ComparisonResult(
                    entity1_id=gen1_id,
                    entity2_id=gen2_id,
                    similarity_score=float(parsed.get("similarity_score", 0.5)),
                    comparison_text=parsed.get("comparison_text", raw),
                    visual_differences=parsed.get("visual_differences", []),
                    design_continuity=float(parsed.get("design_continuity", 0.5)),
                )
        except Exception as exc:
            logger.warning("compare_generations_parse_failed", error=str(exc))
            raw = f"Comparison of generation {gen1_id} and {gen2_id}: Analysis unavailable."

        return ComparisonResult(
            entity1_id=gen1_id,
            entity2_id=gen2_id,
            similarity_score=None,
            comparison_text=raw,
            visual_differences=[],
            design_continuity=None,
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

Analyse the design trends and predict:
1. EXTERIOR DESIGN: What will the next generation look like?
2. DESIGN LANGUAGE EVOLUTION: How will it advance the brand's design philosophy?
3. KEY DESIGN TRENDS: List 5 specific design directions to expect
4. PROPORTIONS: Changes in dimensions, stance, and silhouette
5. TECHNOLOGY INTEGRATION: How will EV/tech trends affect the design?
6. CONFIDENCE LEVEL: How confident are you in this prediction? (0.0–1.0)

Return as JSON with keys:
prediction_text (string), design_trends (array of strings), confidence (float 0-1)
"""

        try:
            if all_image_urls:
                raw = await self._call_gpt4_vision(prompt, all_image_urls, max_tokens=2000)
            else:
                raw, _ = await self._call_claude(prompt, max_tokens=2000)

            parsed = _extract_json(raw)
            if parsed:
                return FuturePrediction(
                    model_id=model_id,
                    prediction_text=parsed.get("prediction_text", raw),
                    design_trends=parsed.get("design_trends", []),
                    confidence=float(parsed.get("confidence", 0.7)),
                )
        except Exception as exc:
            logger.warning("predict_future_generation_parse_failed", error=str(exc))

        return FuturePrediction(
            model_id=model_id,
            prediction_text=raw if "raw" in dir() else "Prediction unavailable.",
            design_trends=[],
            confidence=0.5,
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
