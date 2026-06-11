"""
Claude AI Integration for Automotive Design Analysis.

Provides deep, expert-level natural-language analysis of automotive design
lineage, brand DNA, cross-brand influences, future predictions, and Q&A
via the Anthropic Claude API.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import List, Optional

import anthropic
import structlog

log = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass
class LineageNarrative:
    """Rich textual narrative describing a brand's design evolution journey."""

    text: str
    key_transitions: List[str]
    design_continuity_score: float
    model_used: str
    tokens_used: int


@dataclass
class BrandDNAReport:
    """Comprehensive analysis of a brand's design DNA across all generations."""

    brand: str
    core_elements: List[str]
    evolution_summary: str
    design_signature: str
    consistency_score: float
    major_design_shifts: List[str]
    full_report: str


@dataclass
class FuturePrediction:
    """Prediction for the next generation design of a vehicle model."""

    model_id: int
    prediction_text: str
    expected_changes: List[str]
    expected_continuities: List[str]
    confidence: float
    predicted_year: int


# ---------------------------------------------------------------------------
# Analyser
# ---------------------------------------------------------------------------


class ClaudeAnalyzer:
    """
    Uses Anthropic Claude to provide expert automotive design analysis.

    All async methods call the Claude API with carefully crafted prompts
    to extract structured and narrative responses. JSON parsing is attempted
    first; plain-text fallbacks are provided for robustness.
    """

    DEFAULT_MODEL = "claude-opus-4-5"
    MAX_TOKENS = 2048

    def __init__(
        self,
        api_key: str,
        model: str = DEFAULT_MODEL,
        max_tokens: int = MAX_TOKENS,
    ) -> None:
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model
        self.max_tokens = max_tokens
        self.logger = structlog.get_logger(__name__)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def generate_lineage_narrative(self, evolution_tree: dict) -> LineageNarrative:
        """
        Generate a compelling narrative about a brand's design evolution.

        Args:
            evolution_tree: Dict with keys:
                - brand (str): Brand name.
                - generations (List[dict]): Each dict has year, code_name, description.
                - similarity_scores (List[float]): Sequential generation similarities.
                - major_design_changes (List[str]): Notable transition events.

        Returns:
            LineageNarrative with full text, key transitions, and continuity score.

        Example output text:
            "The BMW 3-Series represents one of the most consistent evolutionary
            journeys in automotive design. From the angular, driver-focused E30
            of 1982 to the tech-laden G20 of 2019, each generation maintained
            the core kidney grille signature while adapting to the design language
            of its era..."
        """
        brand = evolution_tree.get("brand", "Unknown")
        generations = evolution_tree.get("generations", [])
        similarity_scores = evolution_tree.get("similarity_scores", [])
        major_changes = evolution_tree.get("major_design_changes", [])

        gen_lines = "\n".join(
            f"  - {g.get('code_name', 'N/A')} ({g.get('year', 'N/A')}): "
            f"{g.get('description', '')}"
            for g in generations
        )
        sim_summary = (
            ", ".join(f"{s:.2f}" for s in similarity_scores)
            if similarity_scores
            else "N/A"
        )
        changes_text = "\n".join(f"  - {c}" for c in major_changes) or "  None recorded."

        prompt = (
            f"You are an expert automotive design historian. Write a compelling, expert-level "
            f"lineage narrative for the {brand} brand based on the following generational data.\n\n"
            f"Generations:\n{gen_lines}\n\n"
            f"Sequential visual similarity scores (0-1): {sim_summary}\n\n"
            f"Major design changes:\n{changes_text}\n\n"
            f"Return a JSON object with these exact keys:\n"
            f"  - narrative (str): 250-400 word narrative\n"
            f"  - key_transitions (list of str): 3-6 pivotal transition moments\n"
            f"  - design_continuity_score (float 0-1): overall design continuity\n\n"
            f"Return ONLY valid JSON. Be specific, factual, and use correct automotive terminology."
        )

        response_text, tokens = self._call(self._build_system_prompt(), prompt)

        try:
            data = self._parse_json(response_text)
            return LineageNarrative(
                text=data.get("narrative", response_text),
                key_transitions=data.get("key_transitions", []),
                design_continuity_score=float(data.get("design_continuity_score", 0.75)),
                model_used=self.model,
                tokens_used=tokens,
            )
        except Exception:
            self.logger.warning("lineage_narrative_json_parse_failed", brand=brand)
            return LineageNarrative(
                text=response_text,
                key_transitions=major_changes[:6],
                design_continuity_score=(
                    float(sum(similarity_scores) / len(similarity_scores))
                    if similarity_scores
                    else 0.75
                ),
                model_used=self.model,
                tokens_used=tokens,
            )

    async def analyze_brand_dna(
        self, brand: str, generations_data: List[dict]
    ) -> BrandDNAReport:
        """
        Deep analysis of a brand's design DNA across all generations.

        Identifies signature elements, when they changed, and quantifies
        design consistency versus evolution over time.

        Args:
            brand: Brand name (e.g. "BMW", "Porsche").
            generations_data: List of dicts, each with:
                - code_name, year_start, year_end, description, design_elements (list).

        Returns:
            BrandDNAReport with core elements, summary, and consistency score.
        """
        gen_text = "\n".join(
            f"  [{g.get('code_name', 'N/A')} | {g.get('year_start')}-{g.get('year_end')}] "
            f"{g.get('description', '')}. "
            f"Design elements: {', '.join(g.get('design_elements', []))}"
            for g in generations_data
        )

        prompt = (
            f"Perform a deep design DNA analysis for {brand} based on the following "
            f"generational data:\n\n{gen_text}\n\n"
            f"Return a JSON object with exactly these keys:\n"
            f"  - core_elements (list of str): 4-8 persistent design elements\n"
            f"  - evolution_summary (str): 100-150 word summary of DNA evolution\n"
            f"  - design_signature (str): One-sentence brand identity statement\n"
            f"  - consistency_score (float 0-1): how consistent is the design DNA\n"
            f"  - major_design_shifts (list of str): up to 5 design philosophy changes\n"
            f"  - full_report (str): 400-600 word comprehensive report\n\n"
            f"Return ONLY valid JSON. Use precise automotive design terminology."
        )

        response_text, _ = self._call(self._build_system_prompt(), prompt)

        try:
            data = self._parse_json(response_text)
            return BrandDNAReport(
                brand=brand,
                core_elements=data.get("core_elements", []),
                evolution_summary=data.get("evolution_summary", ""),
                design_signature=data.get("design_signature", ""),
                consistency_score=float(data.get("consistency_score", 0.7)),
                major_design_shifts=data.get("major_design_shifts", []),
                full_report=data.get("full_report", response_text),
            )
        except Exception:
            self.logger.warning("brand_dna_json_parse_failed", brand=brand)
            return BrandDNAReport(
                brand=brand,
                core_elements=[],
                evolution_summary="",
                design_signature="",
                consistency_score=0.7,
                major_design_shifts=[],
                full_report=response_text,
            )

    async def generate_hidden_connections_report(
        self, cross_brand_data: List[dict]
    ) -> str:
        """
        Generate a report on unexpected design connections between brands.

        Args:
            cross_brand_data: List of dicts, each with:
                - brand_a, brand_b, similarity_score, year_a, year_b,
                  shared_elements (list), context (str).

        Returns:
            A 400-600 word narrative report as plain text.

        Example output:
            "The 2004 Hyundai Sonata's headlight design shows striking similarity
            to the Audi A6 C5, likely influenced by Hyundai's hiring of ex-Audi
            designers in the early 2000s..."
        """
        connections_text = "\n".join(
            f"  Connection {i + 1}: {c.get('brand_a')} ({c.get('year_a')}) <-> "
            f"{c.get('brand_b')} ({c.get('year_b')}), "
            f"similarity={c.get('similarity_score', 0):.2f}, "
            f"shared elements: {', '.join(c.get('shared_elements', []))}. "
            f"Context: {c.get('context', '')}"
            for i, c in enumerate(cross_brand_data)
        )

        prompt = (
            f"You are an automotive design historian with expertise in cross-brand "
            f"design influences and industry talent movements.\n\n"
            f"Analyse these cross-brand design similarities and generate a compelling "
            f"400-600 word report revealing hidden connections, potential design "
            f"inspirations, and industry dynamics:\n\n{connections_text}\n\n"
            f"Include: historical context, talent migration, shared suppliers, "
            f"market pressures, and any surprising findings. Be specific and factual."
        )

        response_text, _ = self._call(self._build_system_prompt(), prompt)
        return response_text

    async def explain_design_mutation(
        self,
        before_gen: dict,
        after_gen: dict,
        diff_score: float,
        changed_elements: List[str],
    ) -> str:
        """
        Explain the design transition between two generations.

        Args:
            before_gen: Dict with brand, model, code_name, year_start, description.
            after_gen:  Dict with brand, model, code_name, year_start, description.
            diff_score: Mutation score 0-1 (0=identical, 1=completely different).
            changed_elements: List of design elements that changed (e.g. ["grille", "headlights"]).

        Returns:
            200-350 word expert explanation of the design transition.
        """
        brand = before_gen.get("brand", "Unknown")
        model = before_gen.get("model", "Unknown")

        prompt = (
            f"Explain the design transition between these two generations of the "
            f"{brand} {model}:\n\n"
            f"BEFORE: {before_gen.get('code_name', 'N/A')} ({before_gen.get('year_start', 'N/A')}) — "
            f"{before_gen.get('description', '')}\n\n"
            f"AFTER:  {after_gen.get('code_name', 'N/A')} ({after_gen.get('year_start', 'N/A')}) — "
            f"{after_gen.get('description', '')}\n\n"
            f"Design mutation score: {diff_score:.2f} / 1.0 "
            f"({'minor refresh' if diff_score < 0.15 else 'facelift' if diff_score < 0.30 else 'full redesign'})\n\n"
            f"Changed elements identified: {', '.join(changed_elements) if changed_elements else 'Not specified'}\n\n"
            f"Write a 200-350 word expert analysis covering:\n"
            f"1. What specific design elements changed and how\n"
            f"2. The market/competitive context driving these changes\n"
            f"3. What design philosophy shift (if any) this represents\n"
            f"4. What was preserved to maintain brand continuity\n\n"
            f"Be specific, factual, and use precise automotive design terminology."
        )

        response_text, _ = self._call(self._build_system_prompt(), prompt)
        return response_text

    async def generate_future_prediction(
        self,
        last_generation: dict,
        brand_trends: dict,
        market_context: dict,
    ) -> FuturePrediction:
        """
        Predict the next generation design based on brand trends and market context.

        Args:
            last_generation: Dict with id, brand, model, code_name, year_start,
                             description, design_elements.
            brand_trends: Dict with electrification_pace, design_direction,
                         recent_design_changes, brand_strategy.
            market_context: Dict with segment_trends, competitor_designs,
                           regulatory_changes, consumer_preferences.

        Returns:
            FuturePrediction with text, expected changes/continuities, and confidence.
        """
        brand = last_generation.get("brand", "Unknown")
        model = last_generation.get("model", "Unknown")
        last_year = last_generation.get("year_start", 2020)
        predicted_year = last_year + 6  # typical product cycle

        prompt = (
            f"As an expert automotive design forecaster, predict the next generation "
            f"design of the {brand} {model} based on current trends.\n\n"
            f"CURRENT GENERATION: {last_generation.get('code_name', 'N/A')} "
            f"({last_year}) — {last_generation.get('description', '')}\n"
            f"Design elements: {', '.join(last_generation.get('design_elements', []))}\n\n"
            f"BRAND TRENDS:\n"
            f"  Electrification pace: {brand_trends.get('electrification_pace', 'N/A')}\n"
            f"  Design direction: {brand_trends.get('design_direction', 'N/A')}\n"
            f"  Recent changes: {brand_trends.get('recent_design_changes', 'N/A')}\n"
            f"  Brand strategy: {brand_trends.get('brand_strategy', 'N/A')}\n\n"
            f"MARKET CONTEXT:\n"
            f"  Segment trends: {market_context.get('segment_trends', 'N/A')}\n"
            f"  Competitor designs: {market_context.get('competitor_designs', 'N/A')}\n"
            f"  Regulatory changes: {market_context.get('regulatory_changes', 'N/A')}\n"
            f"  Consumer preferences: {market_context.get('consumer_preferences', 'N/A')}\n\n"
            f"Return JSON with these exact keys:\n"
            f"  - prediction_text (str): 200-300 word prediction narrative\n"
            f"  - expected_changes (list of str): 4-7 specific design changes\n"
            f"  - expected_continuities (list of str): 3-5 elements that will be preserved\n"
            f"  - confidence (float 0-1): prediction confidence\n"
            f"  - predicted_year (int): estimated launch year\n\n"
            f"Return ONLY valid JSON."
        )

        response_text, _ = self._call(self._build_system_prompt(), prompt)

        try:
            data = self._parse_json(response_text)
            return FuturePrediction(
                model_id=last_generation.get("id", 0),
                prediction_text=data.get("prediction_text", response_text),
                expected_changes=data.get("expected_changes", []),
                expected_continuities=data.get("expected_continuities", []),
                confidence=float(data.get("confidence", 0.65)),
                predicted_year=int(data.get("predicted_year", predicted_year)),
            )
        except Exception:
            self.logger.warning("future_prediction_json_parse_failed", brand=brand, model=model)
            return FuturePrediction(
                model_id=last_generation.get("id", 0),
                prediction_text=response_text,
                expected_changes=[],
                expected_continuities=[],
                confidence=0.60,
                predicted_year=predicted_year,
            )

    async def answer_automotive_query(self, question: str, context: dict) -> str:
        """
        Answer any automotive design or evolution question with rich context.

        Used for the AI search / Q&A feature.

        Args:
            question: Natural language question from the user.
            context: Dict with any relevant data: generations, brands, comparisons,
                     similarity_scores, time_range, related_models.

        Returns:
            Expert answer as plain text (150-400 words depending on question complexity).
        """
        context_parts: List[str] = []

        if "brands" in context:
            context_parts.append(f"Relevant brands: {', '.join(context['brands'])}")
        if "generations" in context:
            gens_text = "; ".join(
                f"{g.get('brand')} {g.get('model')} {g.get('code_name')} ({g.get('year_start')})"
                for g in context["generations"][:8]
            )
            context_parts.append(f"Relevant generations: {gens_text}")
        if "similarity_scores" in context:
            context_parts.append(
                f"Similarity scores: {context['similarity_scores']}"
            )
        if "time_range" in context:
            context_parts.append(f"Time range: {context['time_range']}")
        if "related_models" in context:
            context_parts.append(
                f"Related models: {', '.join(context['related_models'])}"
            )

        context_text = "\n".join(context_parts) if context_parts else "No additional context provided."

        prompt = (
            f"Answer the following automotive design question with expert-level accuracy "
            f"and depth. Use real historical facts, specific model names, and design "
            f"terminology where appropriate.\n\n"
            f"QUESTION: {question}\n\n"
            f"CONTEXT:\n{context_text}\n\n"
            f"Provide a clear, informative answer of 150-400 words. If the question "
            f"involves comparisons or evolution, be specific about what changed and when."
        )

        response_text, _ = self._call(self._build_system_prompt(), prompt)
        return response_text

    async def generate_comparison_narrative(
        self, car1: dict, car2: dict, similarity_score: float
    ) -> str:
        """
        Compare two cars or generations in depth.

        Args:
            car1: Dict with brand, model, code_name, year_start, description,
                  design_elements, specs (optional).
            car2: Dict with same structure as car1.
            similarity_score: Cosine similarity 0-1 from the embedding pipeline.

        Returns:
            200-350 word comparison narrative.

        Example:
            "While the BMW E46 M3 and Porsche 996 both defined the sports car
            benchmark of the early 2000s, they represent fundamentally different
            philosophies..."
        """
        def _format_car(car: dict) -> str:
            parts = [
                f"{car.get('brand', 'Unknown')} {car.get('model', 'Unknown')} "
                f"{car.get('code_name', '')} ({car.get('year_start', 'N/A')})",
                f"Description: {car.get('description', 'N/A')}",
            ]
            if car.get("design_elements"):
                parts.append(f"Design elements: {', '.join(car['design_elements'])}")
            if car.get("specs"):
                parts.append(f"Specs: {car['specs']}")
            return "\n  ".join(parts)

        sim_label = (
            "very similar" if similarity_score >= 0.90
            else "similar" if similarity_score >= 0.75
            else "moderately similar" if similarity_score >= 0.55
            else "quite different"
        )

        prompt = (
            f"Write a 200-350 word expert comparison of these two vehicles. "
            f"Visual similarity score: {similarity_score:.2f} ({sim_label}).\n\n"
            f"CAR 1:\n  {_format_car(car1)}\n\n"
            f"CAR 2:\n  {_format_car(car2)}\n\n"
            f"Cover: design philosophy differences, shared influences, which era "
            f"each represents, what makes each distinctive, and any surprising connections. "
            f"Be specific, engaging, and use correct automotive terminology."
        )

        response_text, _ = self._call(self._build_system_prompt(), prompt)
        return response_text

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _build_system_prompt(self) -> str:
        return (
            "You are an expert automotive design historian and analyst with deep knowledge "
            "of car design evolution, brand DNA, and automotive aesthetics across all major "
            "manufacturers from 1950 to present. You provide insightful, accurate, and "
            "engaging analysis of automotive design history and evolution. Your analysis is "
            "precise, uses correct automotive terminology (e.g., Hofmeister kink, DLO, "
            "tumblehome, greenhouse ratio, character lines), and draws on real historical "
            "context including key designers, design studios, and industry events. "
            "Always structure your response clearly and concisely."
        )

    def _call(self, system: str, user_text: str) -> tuple[str, int]:
        """
        Make a synchronous Claude API call and return (response_text, tokens_used).

        The Anthropic SDK's create() is synchronous; async wrappers in the
        public methods are provided for compatibility with async callers.
        """
        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                system=system,
                messages=[{"role": "user", "content": user_text}],
                temperature=0.3,
            )
            text = message.content[0].text.strip()
            tokens = message.usage.input_tokens + message.usage.output_tokens
            self.logger.info(
                "claude_call_success",
                model=self.model,
                tokens=tokens,
            )
            return text, tokens
        except anthropic.APIStatusError as exc:
            self.logger.error("claude_api_error", status=exc.status_code, error=str(exc))
            return f"[Claude API Error {exc.status_code}: {exc.message}]", 0
        except Exception as exc:
            self.logger.error("claude_call_failed", error=str(exc))
            return f"[Claude Error: {exc}]", 0

    @staticmethod
    def _parse_json(text: str) -> dict:
        """
        Parse JSON from a model response, stripping markdown fences if present.

        Raises:
            json.JSONDecodeError: if no valid JSON found.
        """
        # Strip markdown code fences
        cleaned = re.sub(r"```(?:json)?\s*", "", text).replace("```", "").strip()
        # Try direct parse
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass
        # Try extracting first {...} block
        match = re.search(r"\{[\s\S]+\}", cleaned)
        if match:
            return json.loads(match.group())
        raise json.JSONDecodeError("No JSON object found", cleaned, 0)

    def _estimate_tokens(self, text: str) -> int:
        """
        Rough token estimate: ~4 characters per token (English prose).

        This is a heuristic used for pre-flight checks and logging only;
        actual token counts are returned by the API.
        """
        return max(1, len(text) // 4)
