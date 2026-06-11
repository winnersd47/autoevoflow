"""
ML Pipelines — vision, embedding, and generative pipelines.
"""

from ml.pipelines.vision_pipeline import AutomotiveVisionPipeline
from ml.pipelines.embedding_pipeline import EmbeddingPipeline
from ml.pipelines.generative_pipeline import GenerativeEvolutionPipeline

__all__ = [
    "AutomotiveVisionPipeline",
    "EmbeddingPipeline",
    "GenerativeEvolutionPipeline",
]
