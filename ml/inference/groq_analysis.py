"""
Groq AI Integration for Automotive Design Analysis.

Uses Groq's free tier (Llama 3.1 70B / Mixtral 8x7B) for analytical,
technical-focused automotive brand and generation analysis.
Free tier: 14,400 requests/day, 6,000 tokens/min, ~500 tokens/sec.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import List, Optional
from openai import OpenAI   # Groq API is OpenAI-compatible

import structlog
log = structlog.get_logger(__name__)


@dataclass
class GroqAnalysisResult:
    headline: str
    summary: str
    full_text: str
    insights: List[dict]
    confidence_score: float
    model_used: str
    tokens_used: int
    variant: str = "analytical"
    provider: str = "groq"


class GroqAnalyzer:
    """
    Automotive analysis via Groq's free-tier API.

    Perspective: ANALYTICAL — focuses on engineering decisions, platform
    sharing, powertrain evolution, performance benchmarks, and technical
    achievements. Pairs with GeminiAnalyzer (historical perspective).

    Usage:
        analyzer = GroqAnalyzer()
        result = analyzer.analyze_brand("BMW", dna_data, models_data)
    """

    DEFAULT_MODEL = "llama-3.1-70b-versatile"    # Free tier, best quality
    FAST_MODEL    = "mixtral-8x7b-32768"          # Fallback, even faster

    SYSTEM_PROMPT = """You are a senior automotive engineer and design analyst with 30 years
of experience covering European performance cars. Your analysis is technical, precise,
and evidence-based. You focus on:
- Engineering decisions and their consequences
- Platform sharing strategies and economies of scale
- Powertrain evolution and performance metrics
- Chassis philosophy and handling dynamics
- Manufacturing innovations
Avoid marketing language. Be specific about model codes, years, and technical specs."""

    def __init__(self, api_key: str | None = None):
        key = api_key or os.getenv("GROQ_API_KEY")
        if not key:
            raise ValueError("GROQ_API_KEY not set. Get free key at console.groq.com")
        self.client = OpenAI(
            api_key=key,
            base_url="https://api.groq.com/openai/v1",
        )

    def analyze_brand(
        self,
        brand_name: str,
        dna_summary: str,
        models_summary: str,
        max_tokens: int = 1200,
    ) -> GroqAnalysisResult:
        prompt = f"""Analyze {brand_name}'s automotive engineering and design evolution.

DNA Summary: {dna_summary}
Key Models: {models_summary}

Provide:
1. A punchy headline (max 15 words) focused on an engineering insight
2. A 2-sentence executive summary (technical angle)
3. A 4-paragraph analysis covering:
   - Core engineering philosophy and why it differentiates {brand_name}
   - The most significant technical achievement in their history
   - Platform/powertrain strategy and its impact on the model range
   - The technical challenge they face today (electrification, regulation, etc.)
4. Three specific technical insights as JSON:
   [{{"category": "...", "text": "...", "confidence": 0.0-1.0, "importance": "critical|high|medium"}}]

Return as JSON:
{{"headline": "...", "summary": "...", "full_text": "...", "insights": [...]}}"""

        try:
            resp = self.client.chat.completions.create(
                model=self.DEFAULT_MODEL,
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user",   "content": prompt},
                ],
                max_tokens=max_tokens,
                temperature=0.6,
                response_format={"type": "json_object"},
            )
            raw = resp.choices[0].message.content or "{}"
            data = json.loads(raw)
            log.info("groq_brand_analysis_ok", brand=brand_name, model=self.DEFAULT_MODEL)
            return GroqAnalysisResult(
                headline=data.get("headline", f"{brand_name}: Engineering Analysis"),
                summary=data.get("summary", ""),
                full_text=data.get("full_text", ""),
                insights=data.get("insights", []),
                confidence_score=0.88,
                model_used=self.DEFAULT_MODEL,
                tokens_used=resp.usage.total_tokens if resp.usage else 0,
            )
        except Exception as exc:
            log.error("groq_analysis_failed", brand=brand_name, error=str(exc))
            raise
