"""
Evaluation Script for Automotive CLIP Embeddings.

Compares the fine-tuned automotive CLIP model against the baseline
(stock OpenCLIP) across four axes:
  1. Same-generation retrieval accuracy (R@1, R@5, R@10)
  2. Cross-brand influence detection AUC (ROC-AUC)
  3. UMAP embedding-space visualisation (saved as PNG)
  4. Comprehensive evaluation report (saved as JSON + printed summary)

Usage:
    python -m ml.training.evaluate_embeddings \\
        --finetuned checkpoints/clip_automotive_best.pt \\
        --data-dir /path/to/eval/dataset \\
        --output-dir reports/
"""

from __future__ import annotations

import argparse
import json
import os
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import open_clip
import structlog
import torch
import torch.nn.functional as F
from PIL import Image
from sklearn.metrics import (
    average_precision_score,
    roc_auc_score,
    roc_curve,
)
from torch.utils.data import DataLoader, Dataset

log = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass
class EmbeddingEvalResult:
    """Retrieval metrics for one model (baseline or fine-tuned)."""

    model_label: str
    r_at_1: float
    r_at_5: float
    r_at_10: float
    mean_average_precision: float
    mean_rank: float
    median_rank: float


@dataclass
class InfluenceDetectionResult:
    """Cross-brand influence detection metrics."""

    model_label: str
    roc_auc: float
    average_precision: float
    optimal_threshold: float
    optimal_f1: float
    tpr_at_fpr_10pct: float  # True positive rate when FPR ≤ 10%


@dataclass
class EvaluationReport:
    """Full evaluation report comparing baseline vs fine-tuned models."""

    timestamp: str
    finetuned_path: str
    baseline_label: str
    retrieval_baseline: EmbeddingEvalResult
    retrieval_finetuned: EmbeddingEvalResult
    influence_baseline: InfluenceDetectionResult
    influence_finetuned: InfluenceDetectionResult
    umap_plot_path: Optional[str]
    summary: str
    improvement_pct: Dict[str, float] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Evaluation dataset
# ---------------------------------------------------------------------------


class EvalDataset(Dataset):
    """
    Simple dataset for evaluation: loads (image_path, label) pairs.

    Args:
        samples: List of (image_path, group_label) where group_label is an
                 integer identifying which 'positive group' the image belongs to
                 (e.g. generation ID or model ID).
        transform: Image transform compatible with the model.
    """

    def __init__(
        self,
        samples: List[Tuple[str, int]],
        transform=None,
    ) -> None:
        self.samples = samples
        self.transform = transform

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int]:
        path, label = self.samples[idx]
        try:
            img = Image.open(path).convert("RGB")
        except Exception:
            img = Image.new("RGB", (224, 224), (128, 128, 128))
        if self.transform:
            img = self.transform(img)
        return img, label


# ---------------------------------------------------------------------------
# Embedding extractor
# ---------------------------------------------------------------------------


class EmbeddingExtractor:
    """
    Extracts L2-normalised visual embeddings from a CLIP model.

    Args:
        model: The CLIP model (open_clip).
        preprocess: Image preprocessing transform.
        device: Torch device.
        batch_size: Batch size for inference.
    """

    def __init__(
        self,
        model: torch.nn.Module,
        preprocess,
        device: str = "cpu",
        batch_size: int = 64,
    ) -> None:
        self.model = model.eval().to(device)
        self.preprocess = preprocess
        self.device = device
        self.batch_size = batch_size

    @torch.no_grad()
    def extract(self, image_paths: List[str]) -> np.ndarray:
        """
        Extract embeddings for a list of image paths.

        Returns:
            np.ndarray of shape (N, D), L2-normalised.
        """
        dataset = EvalDataset(
            [(p, i) for i, p in enumerate(image_paths)],
            transform=self.preprocess,
        )
        loader = DataLoader(
            dataset, batch_size=self.batch_size, shuffle=False, num_workers=2
        )

        all_embs: List[torch.Tensor] = []
        for imgs, _ in loader:
            imgs = imgs.to(self.device)
            emb = self.model.encode_image(imgs)
            emb = F.normalize(emb, dim=-1)
            all_embs.append(emb.cpu())

        return torch.cat(all_embs).numpy()

    @torch.no_grad()
    def extract_with_labels(
        self, samples: List[Tuple[str, int]]
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Extract embeddings alongside their integer labels.

        Returns:
            Tuple of (embeddings: np.ndarray (N,D), labels: np.ndarray (N,))
        """
        dataset = EvalDataset(samples, transform=self.preprocess)
        loader = DataLoader(
            dataset, batch_size=self.batch_size, shuffle=False, num_workers=2
        )

        all_embs: List[torch.Tensor] = []
        all_labels: List[int] = []
        for imgs, labels in loader:
            imgs = imgs.to(self.device)
            emb = F.normalize(self.model.encode_image(imgs), dim=-1)
            all_embs.append(emb.cpu())
            all_labels.extend(labels.tolist())

        return torch.cat(all_embs).numpy(), np.array(all_labels)


# ---------------------------------------------------------------------------
# Retrieval metrics
# ---------------------------------------------------------------------------


def compute_retrieval_metrics(
    embeddings: np.ndarray, labels: np.ndarray, model_label: str
) -> EmbeddingEvalResult:
    """
    Compute R@1, R@5, R@10, mAP, mean rank, and median rank for retrieval.

    Each embedding is used as a query; the other embeddings in the same
    label group are the positives.

    Args:
        embeddings: (N, D) float32 array of L2-normalised embeddings.
        labels: (N,) integer array of group labels.
        model_label: Display name for the model being evaluated.

    Returns:
        EmbeddingEvalResult with all metrics.
    """
    N = len(embeddings)
    sim_matrix = embeddings @ embeddings.T  # (N, N)

    # Exclude self-similarity (set diagonal to -inf)
    np.fill_diagonal(sim_matrix, -np.inf)

    r1 = r5 = r10 = 0
    ap_sum = 0.0
    ranks: List[float] = []

    for i in range(N):
        positives = np.where((labels == labels[i]) & (np.arange(N) != i))[0]
        if len(positives) == 0:
            continue

        sorted_indices = np.argsort(sim_matrix[i])[::-1]

        # Find rank of first positive
        positive_set = set(positives.tolist())
        first_rank = None
        for rank_0indexed, idx in enumerate(sorted_indices):
            if idx in positive_set:
                first_rank = rank_0indexed + 1  # 1-indexed
                break
        if first_rank is None:
            continue

        ranks.append(first_rank)
        r1 += int(first_rank <= 1)
        r5 += int(first_rank <= 5)
        r10 += int(first_rank <= 10)

        # Average precision
        n_pos_found = 0
        ap = 0.0
        for rank_0indexed, idx in enumerate(sorted_indices):
            if idx in positive_set:
                n_pos_found += 1
                precision_at_k = n_pos_found / (rank_0indexed + 1)
                ap += precision_at_k
        ap /= len(positives)
        ap_sum += ap

    valid = len(ranks)
    if valid == 0:
        return EmbeddingEvalResult(
            model_label=model_label, r_at_1=0, r_at_5=0, r_at_10=0,
            mean_average_precision=0, mean_rank=0, median_rank=0,
        )

    return EmbeddingEvalResult(
        model_label=model_label,
        r_at_1=r1 / valid,
        r_at_5=r5 / valid,
        r_at_10=r10 / valid,
        mean_average_precision=ap_sum / valid,
        mean_rank=float(np.mean(ranks)),
        median_rank=float(np.median(ranks)),
    )


# ---------------------------------------------------------------------------
# Cross-brand influence detection
# ---------------------------------------------------------------------------


def compute_influence_detection_auc(
    embeddings: np.ndarray,
    brands: np.ndarray,
    years: np.ndarray,
    influence_pairs: List[Tuple[int, int]],  # (idx_source, idx_target)
    non_influence_pairs: List[Tuple[int, int]],
    model_label: str,
    similarity_threshold: float = 0.70,
) -> InfluenceDetectionResult:
    """
    Compute ROC-AUC for cross-brand design influence detection.

    Positive pairs: known cross-brand influences (from ground truth DB).
    Negative pairs: randomly sampled cross-brand pairs with no known influence.

    The predictor score is the cosine similarity between the two generation embeddings.

    Args:
        embeddings:           (N, D) array of L2-normalised embeddings.
        brands:               (N,) array of integer brand IDs.
        years:                (N,) array of integer years.
        influence_pairs:      List of (i, j) index pairs with known influence.
        non_influence_pairs:  List of (i, j) index pairs without influence.
        model_label:          Display name.
        similarity_threshold: Threshold for F1 computation.

    Returns:
        InfluenceDetectionResult.
    """
    scores: List[float] = []
    gt_labels: List[int] = []

    for i, j in influence_pairs:
        sim = float(embeddings[i] @ embeddings[j])
        scores.append(sim)
        gt_labels.append(1)

    for i, j in non_influence_pairs:
        sim = float(embeddings[i] @ embeddings[j])
        scores.append(sim)
        gt_labels.append(0)

    scores_arr = np.array(scores)
    labels_arr = np.array(gt_labels)

    if len(np.unique(labels_arr)) < 2:
        return InfluenceDetectionResult(
            model_label=model_label,
            roc_auc=0.5, average_precision=0.0,
            optimal_threshold=similarity_threshold,
            optimal_f1=0.0, tpr_at_fpr_10pct=0.0,
        )

    roc_auc = float(roc_auc_score(labels_arr, scores_arr))
    avg_prec = float(average_precision_score(labels_arr, scores_arr))

    fpr_vals, tpr_vals, thresholds = roc_curve(labels_arr, scores_arr)

    # Optimal F1 threshold (Youden's J)
    j_scores = tpr_vals - fpr_vals
    best_idx = int(np.argmax(j_scores))
    opt_thresh = float(thresholds[best_idx])
    preds = (scores_arr >= opt_thresh).astype(int)
    tp = int(((preds == 1) & (labels_arr == 1)).sum())
    fp = int(((preds == 1) & (labels_arr == 0)).sum())
    fn = int(((preds == 0) & (labels_arr == 1)).sum())
    denom = 2 * tp + fp + fn
    opt_f1 = (2 * tp / denom) if denom > 0 else 0.0

    # TPR at FPR ≤ 10%
    tpr_at_10 = float(
        tpr_vals[np.searchsorted(fpr_vals, 0.10, side="right") - 1]
        if np.any(fpr_vals <= 0.10)
        else 0.0
    )

    return InfluenceDetectionResult(
        model_label=model_label,
        roc_auc=roc_auc,
        average_precision=avg_prec,
        optimal_threshold=opt_thresh,
        optimal_f1=opt_f1,
        tpr_at_fpr_10pct=tpr_at_10,
    )


# ---------------------------------------------------------------------------
# UMAP visualisation
# ---------------------------------------------------------------------------


def visualise_embedding_space(
    embeddings_baseline: np.ndarray,
    embeddings_finetuned: np.ndarray,
    labels: np.ndarray,
    brand_names: Optional[Dict[int, str]] = None,
    output_path: str = "umap_embeddings.png",
    n_neighbors: int = 15,
    min_dist: float = 0.1,
) -> str:
    """
    Produce a side-by-side UMAP visualisation of baseline vs fine-tuned embeddings.

    Each point represents one generation; colours encode brand identity.
    The left panel shows baseline CLIP, the right shows the fine-tuned model.

    Args:
        embeddings_baseline:  (N, D) baseline embeddings.
        embeddings_finetuned: (N, D) fine-tuned embeddings.
        labels:               (N,) integer brand/group labels.
        brand_names:          Optional dict mapping label int -> brand name string.
        output_path:          File path to save the PNG.
        n_neighbors:          UMAP n_neighbors parameter.
        min_dist:             UMAP min_dist parameter.

    Returns:
        Absolute path to the saved PNG file.
    """
    try:
        import matplotlib
        matplotlib.use("Agg")  # Non-interactive backend
        import matplotlib.pyplot as plt
        import umap

        reducer = umap.UMAP(
            n_neighbors=n_neighbors,
            min_dist=min_dist,
            n_components=2,
            metric="cosine",
            random_state=42,
        )

        log.info("computing_umap_baseline", n_samples=len(embeddings_baseline))
        proj_baseline = reducer.fit_transform(embeddings_baseline)

        log.info("computing_umap_finetuned", n_samples=len(embeddings_finetuned))
        # Re-fit on fine-tuned (same structure for comparison)
        reducer2 = umap.UMAP(
            n_neighbors=n_neighbors,
            min_dist=min_dist,
            n_components=2,
            metric="cosine",
            random_state=42,
        )
        proj_finetuned = reducer2.fit_transform(embeddings_finetuned)

        unique_labels = np.unique(labels)
        cmap = plt.get_cmap("tab20", len(unique_labels))
        label_to_color = {lbl: cmap(i) for i, lbl in enumerate(unique_labels)}

        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(20, 9))
        fig.suptitle("Automotive CLIP Embedding Space: Baseline vs Fine-tuned", fontsize=15)

        for ax, proj, title in [
            (ax1, proj_baseline, "Baseline CLIP (ViT-L/14)"),
            (ax2, proj_finetuned, "Fine-tuned Automotive CLIP"),
        ]:
            for lbl in unique_labels:
                mask = labels == lbl
                color = label_to_color[lbl]
                name = brand_names.get(int(lbl), str(lbl)) if brand_names else str(lbl)
                ax.scatter(
                    proj[mask, 0], proj[mask, 1],
                    c=[color], label=name, alpha=0.7, s=18, linewidths=0,
                )
            ax.set_title(title, fontsize=12)
            ax.set_xlabel("UMAP-1")
            ax.set_ylabel("UMAP-2")
            ax.set_xticks([])
            ax.set_yticks([])

        # Shared legend (max 20 brands visible)
        handles, lbl_texts = ax1.get_legend_handles_labels()
        if len(handles) <= 20:
            fig.legend(handles, lbl_texts, loc="lower center", ncol=5, fontsize=8,
                       bbox_to_anchor=(0.5, -0.04))

        plt.tight_layout()
        plt.savefig(output_path, dpi=150, bbox_inches="tight")
        plt.close(fig)

        log.info("umap_plot_saved", path=output_path)
        return str(Path(output_path).resolve())

    except ImportError as exc:
        log.warning("umap_visualisation_skipped", reason=str(exc))
        return ""


# ---------------------------------------------------------------------------
# Report generation
# ---------------------------------------------------------------------------


def generate_evaluation_report(
    retrieval_baseline: EmbeddingEvalResult,
    retrieval_finetuned: EmbeddingEvalResult,
    influence_baseline: InfluenceDetectionResult,
    influence_finetuned: InfluenceDetectionResult,
    finetuned_path: str,
    umap_plot_path: Optional[str] = None,
    output_dir: str = "reports/",
) -> EvaluationReport:
    """
    Compile all metrics into a structured evaluation report.

    Saves the report as JSON and prints a human-readable summary.

    Args:
        retrieval_baseline:    Retrieval metrics for the baseline model.
        retrieval_finetuned:   Retrieval metrics for the fine-tuned model.
        influence_baseline:    Influence detection metrics for baseline.
        influence_finetuned:   Influence detection metrics for fine-tuned.
        finetuned_path:        File path of the fine-tuned checkpoint used.
        umap_plot_path:        Path to the UMAP PNG, or None.
        output_dir:            Directory to save the JSON report.

    Returns:
        EvaluationReport dataclass.
    """
    from datetime import datetime

    Path(output_dir).mkdir(parents=True, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")

    # Compute relative improvements
    def pct_delta(a: float, b: float) -> float:
        """% improvement of b over a."""
        return ((b - a) / (abs(a) + 1e-10)) * 100

    improvements = {
        "R@1": pct_delta(retrieval_baseline.r_at_1, retrieval_finetuned.r_at_1),
        "R@5": pct_delta(retrieval_baseline.r_at_5, retrieval_finetuned.r_at_5),
        "R@10": pct_delta(retrieval_baseline.r_at_10, retrieval_finetuned.r_at_10),
        "mAP": pct_delta(retrieval_baseline.mean_average_precision,
                         retrieval_finetuned.mean_average_precision),
        "influence_AUC": pct_delta(influence_baseline.roc_auc,
                                   influence_finetuned.roc_auc),
    }

    # Build narrative summary
    r1_imp = improvements["R@1"]
    auc_imp = improvements["influence_AUC"]
    summary_lines = [
        f"Evaluation: {timestamp}",
        f"Fine-tuned checkpoint: {finetuned_path}",
        "",
        "=== Retrieval Performance ===",
        f"  R@1  : baseline={retrieval_baseline.r_at_1:.3f}  "
        f"finetuned={retrieval_finetuned.r_at_1:.3f}  "
        f"(Δ {r1_imp:+.1f}%)",
        f"  R@5  : baseline={retrieval_baseline.r_at_5:.3f}  "
        f"finetuned={retrieval_finetuned.r_at_5:.3f}  "
        f"(Δ {improvements['R@5']:+.1f}%)",
        f"  R@10 : baseline={retrieval_baseline.r_at_10:.3f}  "
        f"finetuned={retrieval_finetuned.r_at_10:.3f}  "
        f"(Δ {improvements['R@10']:+.1f}%)",
        f"  mAP  : baseline={retrieval_baseline.mean_average_precision:.3f}  "
        f"finetuned={retrieval_finetuned.mean_average_precision:.3f}  "
        f"(Δ {improvements['mAP']:+.1f}%)",
        "",
        "=== Cross-Brand Influence Detection ===",
        f"  ROC-AUC  : baseline={influence_baseline.roc_auc:.3f}  "
        f"finetuned={influence_finetuned.roc_auc:.3f}  "
        f"(Δ {auc_imp:+.1f}%)",
        f"  Avg Prec : baseline={influence_baseline.average_precision:.3f}  "
        f"finetuned={influence_finetuned.average_precision:.3f}",
        f"  TPR@10%FPR: baseline={influence_baseline.tpr_at_fpr_10pct:.3f}  "
        f"finetuned={influence_finetuned.tpr_at_fpr_10pct:.3f}",
        "",
        f"UMAP plot: {umap_plot_path or 'not generated'}",
        "",
        "=== Verdict ===",
        (
            f"Fine-tuning improved R@1 by {r1_imp:+.1f}% and influence detection AUC "
            f"by {auc_imp:+.1f}%."
            if r1_imp > 0
            else "Fine-tuned model did not outperform baseline — consider more data or epochs."
        ),
    ]
    summary = "\n".join(summary_lines)

    report = EvaluationReport(
        timestamp=timestamp,
        finetuned_path=finetuned_path,
        baseline_label=retrieval_baseline.model_label,
        retrieval_baseline=retrieval_baseline,
        retrieval_finetuned=retrieval_finetuned,
        influence_baseline=influence_baseline,
        influence_finetuned=influence_finetuned,
        umap_plot_path=umap_plot_path,
        summary=summary,
        improvement_pct=improvements,
    )

    # Save JSON report
    report_path = Path(output_dir) / f"eval_report_{timestamp}.json"
    with open(report_path, "w") as f:
        json.dump(
            {
                "timestamp": report.timestamp,
                "finetuned_path": report.finetuned_path,
                "baseline_label": report.baseline_label,
                "retrieval": {
                    "baseline": asdict(retrieval_baseline),
                    "finetuned": asdict(retrieval_finetuned),
                },
                "influence_detection": {
                    "baseline": asdict(influence_baseline),
                    "finetuned": asdict(influence_finetuned),
                },
                "improvement_pct": improvements,
                "umap_plot": umap_plot_path,
                "summary": summary,
            },
            f,
            indent=2,
        )

    print(summary)
    log.info("evaluation_report_saved", path=str(report_path))
    return report


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------


def _load_clip_model(
    checkpoint_path: Optional[str],
    model_name: str = "ViT-L-14",
    pretrained: str = "openai",
    device: str = "cpu",
) -> Tuple[torch.nn.Module, object]:
    """Load a CLIP model, optionally from a fine-tuned checkpoint."""
    model, _, preprocess = open_clip.create_model_and_transforms(
        model_name, pretrained=pretrained
    )
    if checkpoint_path and Path(checkpoint_path).exists():
        checkpoint = torch.load(checkpoint_path, map_location=device)
        state = checkpoint.get("model_state_dict", checkpoint)
        model.load_state_dict(state, strict=False)
        log.info("finetuned_checkpoint_loaded", path=checkpoint_path)
    model = model.to(device).eval()
    return model, preprocess


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate automotive CLIP embeddings.")
    parser.add_argument(
        "--finetuned",
        type=str,
        required=True,
        help="Path to fine-tuned checkpoint (.pt)",
    )
    parser.add_argument(
        "--model-name",
        type=str,
        default="ViT-L-14",
        help="OpenCLIP model architecture name",
    )
    parser.add_argument(
        "--pretrained",
        type=str,
        default="openai",
        help="Base pretrained weights for the baseline model",
    )
    parser.add_argument(
        "--eval-manifest",
        type=str,
        required=True,
        help=(
            "Path to a JSON file listing evaluation samples. "
            "Expected format: list of {path, brand_id, generation_id, year}."
        ),
    )
    parser.add_argument(
        "--influence-manifest",
        type=str,
        default=None,
        help=(
            "Path to JSON file listing known influence pairs: "
            "list of {source_idx, target_idx, is_influence (bool)}."
        ),
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="reports/",
        help="Directory to save report and UMAP plots",
    )
    parser.add_argument(
        "--batch-size", type=int, default=64, help="Inference batch size"
    )
    parser.add_argument(
        "--no-umap", action="store_true", help="Skip UMAP visualisation"
    )
    args = parser.parse_args()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    log.info("evaluation_start", device=device, finetuned=args.finetuned)

    # Load evaluation manifest
    with open(args.eval_manifest) as f:
        eval_samples_raw: List[dict] = json.load(f)

    samples: List[Tuple[str, int]] = [
        (s["path"], s["generation_id"]) for s in eval_samples_raw
    ]
    brand_labels = np.array([s["brand_id"] for s in eval_samples_raw])
    brands_map: Dict[int, str] = {
        s["brand_id"]: s.get("brand_name", str(s["brand_id"]))
        for s in eval_samples_raw
    }

    # Load models
    log.info("loading_baseline_model")
    model_baseline, preprocess_b = _load_clip_model(
        None, model_name=args.model_name, pretrained=args.pretrained, device=device
    )
    log.info("loading_finetuned_model")
    model_finetuned, preprocess_f = _load_clip_model(
        args.finetuned, model_name=args.model_name, pretrained=args.pretrained, device=device
    )

    # Extract embeddings
    extractor_b = EmbeddingExtractor(model_baseline, preprocess_b, device, args.batch_size)
    extractor_f = EmbeddingExtractor(model_finetuned, preprocess_f, device, args.batch_size)

    log.info("extracting_baseline_embeddings", n=len(samples))
    emb_b, gen_labels = extractor_b.extract_with_labels(samples)

    log.info("extracting_finetuned_embeddings", n=len(samples))
    emb_f, _ = extractor_f.extract_with_labels(samples)

    # Retrieval evaluation
    log.info("computing_retrieval_metrics")
    ret_b = compute_retrieval_metrics(emb_b, gen_labels, model_label="Baseline CLIP")
    ret_f = compute_retrieval_metrics(emb_f, gen_labels, model_label="Fine-tuned Automotive CLIP")

    # Influence detection
    if args.influence_manifest and Path(args.influence_manifest).exists():
        with open(args.influence_manifest) as f:
            inf_data: List[dict] = json.load(f)
        pos_pairs = [(d["source_idx"], d["target_idx"]) for d in inf_data if d["is_influence"]]
        neg_pairs = [(d["source_idx"], d["target_idx"]) for d in inf_data if not d["is_influence"]]
    else:
        # Build synthetic influence pairs: cross-brand pairs within 8 years
        years = np.array([s.get("year", 2000) for s in eval_samples_raw])
        rng = np.random.default_rng(42)
        pos_pairs, neg_pairs = [], []
        for i in range(len(emb_b)):
            for j in range(i + 1, len(emb_b)):
                if brand_labels[i] == brand_labels[j]:
                    continue
                if abs(int(years[i]) - int(years[j])) > 8:
                    continue
                sim = float(emb_f[i] @ emb_f[j])
                if sim >= 0.78:
                    pos_pairs.append((i, j))
                elif sim <= 0.40:
                    neg_pairs.append((i, j))
        # Sample for balance
        n = min(len(pos_pairs), len(neg_pairs), 500)
        if n > 0:
            pos_pairs = rng.choice(pos_pairs, size=n, replace=False).tolist()  # type: ignore
            neg_pairs = rng.choice(neg_pairs, size=n, replace=False).tolist()  # type: ignore

    infl_b = compute_influence_detection_auc(
        emb_b, brand_labels, np.zeros_like(brand_labels),
        pos_pairs, neg_pairs, model_label="Baseline CLIP",
    )
    infl_f = compute_influence_detection_auc(
        emb_f, brand_labels, np.zeros_like(brand_labels),
        pos_pairs, neg_pairs, model_label="Fine-tuned Automotive CLIP",
    )

    # UMAP
    umap_path: Optional[str] = None
    if not args.no_umap:
        umap_output = str(Path(args.output_dir) / "umap_embedding_space.png")
        umap_path = visualise_embedding_space(
            emb_b, emb_f, brand_labels,
            brand_names=brands_map,
            output_path=umap_output,
        ) or None

    # Compile and save report
    generate_evaluation_report(
        retrieval_baseline=ret_b,
        retrieval_finetuned=ret_f,
        influence_baseline=infl_b,
        influence_finetuned=infl_f,
        finetuned_path=args.finetuned,
        umap_plot_path=umap_path,
        output_dir=args.output_dir,
    )


if __name__ == "__main__":
    main()
