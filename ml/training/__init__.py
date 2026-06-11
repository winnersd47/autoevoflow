"""
ML Training — CLIP fine-tuning and embedding evaluation.
"""

from ml.training.train_embeddings import AutomotiveCLIPTrainer, TrainingConfig
from ml.training.evaluate_embeddings import (
    compute_retrieval_metrics,
    compute_influence_detection_auc,
    visualise_embedding_space,
    generate_evaluation_report,
)

__all__ = [
    "AutomotiveCLIPTrainer",
    "TrainingConfig",
    "compute_retrieval_metrics",
    "compute_influence_detection_auc",
    "visualise_embedding_space",
    "generate_evaluation_report",
]
