"""
Structured-output schemas for AI-generated design-evolution narratives.

Every analysis method in analysis_service.py returns one of these shapes
instead of free text, so a claim can be traced back to what the crawler
actually captured rather than just asserted by the model. `source_field`
names the actual DB field/relationship the fact should be attributable to
(e.g. "generation.description", "vehicle_images[2].source_url") — it's a
pointer for a human (or a future automated check) to go verify the claim
against real crawled data, not a free-text citation.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class SourcedFact(BaseModel):
    claim: str = Field(description="A single specific factual claim about the vehicle's design or history.")
    source_field: str = Field(
        description=(
            "The DB field/relationship this claim should be traceable to, e.g. "
            "'generation.description', 'vehicle_images[0].source_url', "
            "'model.body_type'. Use 'model_inference' only when the claim is the "
            "model's own visual/design reasoning rather than a fact restated from "
            "crawled data."
        )
    )
    confidence: float = Field(ge=0.0, le=1.0, description="Model's own confidence in this specific claim, 0-1.")


class EvolutionNarrative(BaseModel):
    """Used by generate_evolution_analysis and generate_brand_dna_report."""

    thesis: str = Field(description="One or two sentence top-line summary of the analysis.")
    facts: list[SourcedFact] = Field(description="The individual factual claims supporting the thesis, each independently sourced and scored.")
    overall_confidence: float = Field(ge=0.0, le=1.0, description="Overall confidence across the whole narrative.")


class ComparisonNarrative(BaseModel):
    """Used by compare_generations — keeps its existing comparison-specific fields, adds sourced facts."""

    comparison_text: str = Field(description="The full structured comparison write-up.")
    visual_differences: list[str] = Field(description="Top visual differences between the two vehicles, most significant first.")
    similarity_score: float = Field(ge=0.0, le=1.0, description="Overall visual similarity, 0-1.")
    design_continuity: float = Field(ge=0.0, le=1.0, description="How much design DNA carries over between the two vehicles, 0-1.")
    facts: list[SourcedFact] = Field(description="Individual factual claims used in the comparison, each independently sourced and scored.")


class PredictionNarrative(BaseModel):
    """Used by predict_future_generation — keeps its existing prediction-specific fields, adds sourced facts."""

    prediction_text: str = Field(description="The full prediction write-up.")
    design_trends: list[str] = Field(description="Specific design directions expected in the next generation.")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence in the prediction overall, 0-1.")
    facts: list[SourcedFact] = Field(description="Individual factual claims (about past generations) the prediction is based on, each independently sourced and scored.")
