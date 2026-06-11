"""
Google Gemini Flash Integration for Automotive History Analysis.

Uses Gemini 1.5 Flash free tier for historical, cultural, and design-language
focused automotive analysis. Complements GroqAnalyzer's technical angle.
Free tier: 1,500 requests/day, 1M tokens/min for Flash.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import List
import google.generativeai as genai

import structlog
log = structlog.get_logger(__name__)


@dataclass
class GeminiAnalysisResult:
    headline: str
    summary: str
    full_text: str
    insights: List[dict]
    confidence_score: float
    model_used: str
    tokens_used: int
    variant: str = "historical"
    provider: str = "gemini"


class GeminiAnalyzer:
    """
    Automotive analysis via Google Gemini Flash (free tier).

    Perspective: HISTORICAL & CULTURAL — focuses on brand identity, design
    language heritage, cultural significance, designer stories, era context,
    and emotional resonance. Pairs with GroqAnalyzer (technical perspective).

    Usage:
        analyzer = GeminiAnalyzer()
        result = analyzer.analyze_brand("Ferrari", dna_data, models_data)
    """

    DEFAULT_MODEL = "gemini-1.5-flash"   # Free: 1500 req/day
    PRO_MODEL     = "gemini-1.5-pro"     # Free: 50 req/day (higher quality)

    SYSTEM_PROMPT = """You are an automotive historian and design critic with expertise
in Italian, German, British, and Japanese car culture. Your analysis is cultural,
narrative-driven, and captures the human stories behind the machines. You focus on:
- The cultural and historical context of design decisions
- Designer biographies and their influence on brand DNA
- How cars reflected or shaped the era they were built in
- Brand mythology, emotional resonance, and collector significance
- The philosophical continuity (or breaks) in a brand's identity
Write with the authority of someone who has driven these cars, not just read about them."""

    def __init__(self, api_key: str | None = None):
        key = api_key or os.getenv("GOOGLE_AI_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not key:
            raise ValueError(
                "GOOGLE_AI_API_KEY not set. "
                "Get free key at aistudio.google.com/app/apikey"
            )
        genai.configure(api_key=key)
        self.model = genai.GenerativeModel(
            self.DEFAULT_MODEL,
            system_instruction=self.SYSTEM_PROMPT,
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                max_output_tokens=1200,
                response_mime_type="application/json",
            ),
        )

    def analyze_brand(
        self,
        brand_name: str,
        dna_summary: str,
        models_summary: str,
    ) -> GeminiAnalysisResult:
        prompt = f"""Write a historical and cultural analysis of {brand_name}.

DNA Summary: {dna_summary}
Key Models: {models_summary}

Provide:
1. A headline (max 15 words) capturing the brand's cultural essence
2. A 2-sentence summary (historical/emotional angle)
3. A 4-paragraph narrative covering:
   - The founding mythology and what made the brand's identity distinct from day one
   - The single car or moment that defined the brand's cultural legacy
   - How external events (oil crisis, regulations, ownership changes) shaped the brand
   - What the brand represents culturally TODAY vs what it represented at its peak
4. Three cultural/historical insights as JSON:
   [{{"category": "...", "text": "...", "confidence": 0.0-1.0, "importance": "critical|high|medium"}}]

Return as JSON:
{{"headline": "...", "summary": "...", "full_text": "...", "insights": [...]}}"""

        try:
            resp = self.model.generate_content(prompt)
            raw = resp.text or "{}"
            data = json.loads(raw)
            log.info("gemini_brand_analysis_ok", brand=brand_name, model=self.DEFAULT_MODEL)
            return GeminiAnalysisResult(
                headline=data.get("headline", f"{brand_name}: Cultural Legacy"),
                summary=data.get("summary", ""),
                full_text=data.get("full_text", ""),
                insights=data.get("insights", []),
                confidence_score=0.85,
                model_used=self.DEFAULT_MODEL,
                tokens_used=resp.usage_metadata.total_token_count if resp.usage_metadata else 0,
            )
        except Exception as exc:
            log.error("gemini_analysis_failed", brand=brand_name, error=str(exc))
            raise
