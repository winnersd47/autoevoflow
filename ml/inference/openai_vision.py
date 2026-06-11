"""
OpenAI GPT-4 Vision Integration.

Provides rich natural-language analysis of automotive images and generation
comparisons via GPT-4 Vision (gpt-4-vision-preview / gpt-4o).
"""

from __future__ import annotations

import base64
import io
import os
from dataclasses import dataclass, field
from typing import List, Optional

import structlog
from openai import OpenAI
from PIL import Image

log = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class CarImageAnalysis:
    brand: str
    model: str
    approximate_year: str
    body_type: str
    design_language: str
    notable_features: List[str]
    raw_description: str
    confidence: float = 0.0


@dataclass
class GenerationComparison:
    image1_summary: str
    image2_summary: str
    shared_design_elements: List[str]
    changed_elements: List[str]
    evolution_type: str          # "facelift" / "full_redesign" / "minor_refresh"
    narrative: str
    similarity_assessment: str   # "very_similar" / "similar" / "different" / "very_different"


@dataclass
class DesignElementsReport:
    grille: str
    headlights: str
    taillights: str
    roofline: str
    wheel_arches: str
    bumpers: str
    overall_character: str
    brand_signature_elements: List[str]
    raw_report: str


@dataclass
class InfluenceReport:
    concept_elements_retained: List[str]
    concept_elements_dropped: List[str]
    production_additions: List[str]
    fidelity_score: str          # "high" / "medium" / "low"
    narrative: str


# ---------------------------------------------------------------------------
# Analyser
# ---------------------------------------------------------------------------

class OpenAIVisionAnalyzer:
    """
    Uses GPT-4 Vision to provide deep qualitative automotive analysis.

    Images are passed as base64-encoded data URIs for URL independence.
    All methods include structured parsing of the model's JSON output
    with a plain-text fallback when JSON parsing fails.
    """

    DEFAULT_MODEL = "gpt-4o"                # falls back gracefully from gpt-4-vision-preview
    MAX_TOKENS = 1500

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = DEFAULT_MODEL,
        max_tokens: int = MAX_TOKENS,
    ) -> None:
        self.client = OpenAI(api_key=api_key or os.environ["OPENAI_API_KEY"])
        self.model = model
        self.max_tokens = max_tokens

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def analyze_car_image(self, image_url: str) -> CarImageAnalysis:
        """
        Perform comprehensive analysis of a single car image.

        Args:
            image_url: URL or local file path to a car image.

        Returns:
            CarImageAnalysis with structured fields.
        """
        system = (
            "You are an expert automotive designer and historian. "
            "Analyse the provided car image and return a JSON object with these exact keys: "
            "brand, model, approximate_year (string like '2019-2022'), body_type, "
            "design_language, notable_features (list of strings), raw_description (string), confidence (0-1 float)."
        )
        user = "Analyse this car image carefully. Return only valid JSON."

        response_text = self._vision_call(system, user, [image_url])

        try:
            import json
            data = json.loads(response_text)
            return CarImageAnalysis(
                brand=data.get("brand", "Unknown"),
                model=data.get("model", "Unknown"),
                approximate_year=data.get("approximate_year", "Unknown"),
                body_type=data.get("body_type", "Unknown"),
                design_language=data.get("design_language", "Unknown"),
                notable_features=data.get("notable_features", []),
                raw_description=data.get("raw_description", response_text),
                confidence=float(data.get("confidence", 0.5)),
            )
        except Exception:
            return CarImageAnalysis(
                brand="Unknown",
                model="Unknown",
                approximate_year="Unknown",
                body_type="Unknown",
                design_language="Unknown",
                notable_features=[],
                raw_description=response_text,
            )

    def compare_generations(
        self, img1_url: str, img2_url: str
    ) -> GenerationComparison:
        """
        Compare two car generation images and identify design evolution.

        Args:
            img1_url: URL/path to the earlier generation image.
            img2_url: URL/path to the later generation image.

        Returns:
            GenerationComparison with shared/changed elements and evolution type.
        """
        system = (
            "You are an automotive design expert. Compare these two car generation images. "
            "Identify what changed and what stayed the same. Return JSON with keys: "
            "image1_summary, image2_summary, shared_design_elements (list), "
            "changed_elements (list), evolution_type (facelift/full_redesign/minor_refresh), "
            "narrative (2-3 sentences), similarity_assessment (very_similar/similar/different/very_different)."
        )
        user = "Image 1 is the earlier generation. Image 2 is the later. Compare them carefully. Return only valid JSON."

        response_text = self._vision_call(system, user, [img1_url, img2_url])

        try:
            import json
            data = json.loads(response_text)
            return GenerationComparison(
                image1_summary=data.get("image1_summary", ""),
                image2_summary=data.get("image2_summary", ""),
                shared_design_elements=data.get("shared_design_elements", []),
                changed_elements=data.get("changed_elements", []),
                evolution_type=data.get("evolution_type", "unknown"),
                narrative=data.get("narrative", response_text),
                similarity_assessment=data.get("similarity_assessment", "unknown"),
            )
        except Exception:
            return GenerationComparison(
                image1_summary="", image2_summary="",
                shared_design_elements=[], changed_elements=[],
                evolution_type="unknown", narrative=response_text,
                similarity_assessment="unknown",
            )

    def extract_design_elements(self, image_url: str) -> DesignElementsReport:
        """
        Extract detailed design element descriptions from a car image.

        Args:
            image_url: URL or path to the car image.

        Returns:
            DesignElementsReport with per-element descriptions.
        """
        system = (
            "You are an expert in automotive design language analysis. "
            "Describe each design element in detail. Return JSON with keys: "
            "grille, headlights, taillights, roofline, wheel_arches, bumpers, "
            "overall_character, brand_signature_elements (list), raw_report."
        )
        user = "Analyse all visible design elements of this car. Return only valid JSON."

        response_text = self._vision_call(system, user, [image_url])

        try:
            import json
            data = json.loads(response_text)
            return DesignElementsReport(
                grille=data.get("grille", ""),
                headlights=data.get("headlights", ""),
                taillights=data.get("taillights", ""),
                roofline=data.get("roofline", ""),
                wheel_arches=data.get("wheel_arches", ""),
                bumpers=data.get("bumpers", ""),
                overall_character=data.get("overall_character", ""),
                brand_signature_elements=data.get("brand_signature_elements", []),
                raw_report=data.get("raw_report", response_text),
            )
        except Exception:
            return DesignElementsReport(
                grille="", headlights="", taillights="", roofline="",
                wheel_arches="", bumpers="", overall_character="",
                brand_signature_elements=[], raw_report=response_text,
            )

    def generate_evolution_description(
        self,
        gen1: dict,
        gen2: dict,
        similarity_score: float,
    ) -> str:
        """
        Generate a rich, expert-level textual description of the evolution
        between two generations, referencing real design cues.

        Args:
            gen1: Dict with keys brand, model, code_name, year_start, image_url.
            gen2: Dict with keys brand, model, code_name, year_start, image_url.
            similarity_score: Cosine similarity score (0-1).

        Returns:
            A 150-300 word narrative string.

        Example output:
            "The BMW G20 (2019) represents a refinement of the F30 generation,
            maintaining the signature kidney grille proportion while adopting sharper
            aerodynamic character..."
        """
        context = (
            f"Generation 1: {gen1.get('brand')} {gen1.get('model')} "
            f"{gen1.get('code_name', '')} ({gen1.get('year_start', 'N/A')})\n"
            f"Generation 2: {gen2.get('brand')} {gen2.get('model')} "
            f"{gen2.get('code_name', '')} ({gen2.get('year_start', 'N/A')})\n"
            f"Visual similarity score: {similarity_score:.2f} / 1.0\n\n"
            "Write a 150-300 word expert analysis of the design evolution between "
            "these two generations. Mention specific design elements, brand DNA "
            "continuity, and what changed. Be specific and factual."
        )

        images = []
        if gen1.get("image_url"):
            images.append(gen1["image_url"])
        if gen2.get("image_url"):
            images.append(gen2["image_url"])

        if images:
            return self._vision_call(
                "You are a senior automotive design journalist.",
                context,
                images,
            )
        else:
            return self._text_call(
                "You are a senior automotive design journalist.", context
            )

    def analyze_concept_influence(
        self, concept_img: str, production_img: str
    ) -> InfluenceReport:
        """
        Analyse how much a concept car influenced the production model.

        Args:
            concept_img: URL/path to concept car image.
            production_img: URL/path to production car image.

        Returns:
            InfluenceReport with retained/dropped elements and fidelity score.
        """
        system = (
            "You are an automotive design historian. The first image is a concept car, "
            "the second is the production version. Analyse what was retained, dropped, "
            "or added. Return JSON with keys: concept_elements_retained (list), "
            "concept_elements_dropped (list), production_additions (list), "
            "fidelity_score (high/medium/low), narrative (2-3 sentences)."
        )
        user = "Analyse concept-to-production fidelity. Return only valid JSON."

        response_text = self._vision_call(system, user, [concept_img, production_img])

        try:
            import json
            data = json.loads(response_text)
            return InfluenceReport(
                concept_elements_retained=data.get("concept_elements_retained", []),
                concept_elements_dropped=data.get("concept_elements_dropped", []),
                production_additions=data.get("production_additions", []),
                fidelity_score=data.get("fidelity_score", "medium"),
                narrative=data.get("narrative", response_text),
            )
        except Exception:
            return InfluenceReport(
                concept_elements_retained=[], concept_elements_dropped=[],
                production_additions=[], fidelity_score="unknown",
                narrative=response_text,
            )

    def generate_design_dna_report(self, brand: str, generations: List[dict]) -> str:
        """
        Generate a comprehensive brand design DNA report.

        Args:
            brand: Brand name (e.g. "BMW").
            generations: List of dicts with keys: code_name, year_start, image_url.

        Returns:
            A 400-600 word narrative report as plain text.
        """
        gen_summary = "\n".join(
            f"- {g.get('code_name', 'N/A')} ({g.get('year_start', 'N/A')})"
            for g in generations
        )
        prompt = (
            f"Write a comprehensive 400-600 word report on {brand}'s design DNA "
            f"evolution across these generations:\n{gen_summary}\n\n"
            "Cover: signature design elements, how they evolved, moments of discontinuity, "
            "brand recognition score, and the overall design philosophy trajectory. "
            "Be specific and expert-level."
        )

        # Collect up to 4 representative images
        image_urls = [
            g["image_url"] for g in generations if g.get("image_url")
        ][:4]

        if image_urls:
            return self._vision_call(
                f"You are a leading expert on {brand} automotive design history.",
                prompt,
                image_urls,
            )
        return self._text_call(
            f"You are a leading expert on {brand} automotive design history.",
            prompt,
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _vision_call(
        self, system: str, user_text: str, image_urls: List[str]
    ) -> str:
        """Make a GPT-4 Vision API call with images."""
        content = [{"type": "text", "text": user_text}]
        for url in image_urls:
            if url.startswith(("http://", "https://")):
                content.append({
                    "type": "image_url",
                    "image_url": {"url": url, "detail": "high"},
                })
            else:
                b64 = self._encode_image_b64(url)
                content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{b64}", "detail": "high"},
                })

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": content},
                ],
                max_tokens=self.max_tokens,
                temperature=0.2,
            )
            return response.choices[0].message.content.strip()
        except Exception as exc:
            log.error("openai_vision_call_failed", error=str(exc))
            return f"[OpenAI Vision Error: {exc}]"

    def _text_call(self, system: str, user_text: str) -> str:
        """Text-only GPT-4 call (no images)."""
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_text},
                ],
                max_tokens=self.max_tokens,
                temperature=0.3,
            )
            return response.choices[0].message.content.strip()
        except Exception as exc:
            log.error("openai_text_call_failed", error=str(exc))
            return f"[OpenAI Text Error: {exc}]"

    @staticmethod
    def _encode_image_b64(path: str) -> str:
        """Encode local image file as base64 JPEG string."""
        img = Image.open(path).convert("RGB")
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return base64.b64encode(buf.getvalue()).decode("utf-8")
