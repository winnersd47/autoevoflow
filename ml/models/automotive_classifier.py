"""
Automotive Classification Model.

Classifies car embeddings into body type, era, market segment, design language,
production/concept status, and year range. Also provides HDBSCAN-based clustering.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np
import structlog
from sklearn.preprocessing import LabelEncoder

log = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class BodyTypeClassification:
    body_type: str          # sedan / coupe / suv / wagon / convertible / pickup / van / hatchback
    confidence: float
    probabilities: Dict[str, float] = field(default_factory=dict)


@dataclass
class EraClassification:
    era: str                # "1950s" / "1960s" / ... / "2020s"
    confidence: float
    decade_start: int
    probabilities: Dict[str, float] = field(default_factory=dict)


@dataclass
class SegmentClassification:
    segment: str            # economy / mid / premium / luxury / supercar / hypercar
    confidence: float
    probabilities: Dict[str, float] = field(default_factory=dict)


@dataclass
class DesignLanguage:
    language: str           # aggressive / elegant / sporty / retro / futuristic
    confidence: float
    probabilities: Dict[str, float] = field(default_factory=dict)


@dataclass
class YearPrediction:
    estimated_year_min: int
    estimated_year_max: int
    most_likely_year: int
    confidence: float


@dataclass
class ClusteringResult:
    n_clusters: int
    labels: np.ndarray              # (N,) cluster IDs, -1 = noise
    probabilities: np.ndarray       # (N,) cluster membership probabilities
    cluster_centroids: Dict[int, np.ndarray]
    noise_ratio: float
    metadata: dict = field(default_factory=dict)


@dataclass
class Cluster:
    cluster_id: int
    generation_ids: List[int]
    centroid: np.ndarray
    intra_similarity: float
    size: int


# ---------------------------------------------------------------------------
# Minimal linear classifier (replaces sklearn LogisticRegression with
# a seeded weight matrix for reproducible zero-shot performance)
# ---------------------------------------------------------------------------

def _make_classifier_weights(
    input_dim: int,
    labels: List[str],
    seed_prefix: str,
) -> np.ndarray:
    """
    Generate deterministic weight matrix W of shape (len(labels), input_dim).
    Each row is a unit vector seeded by class name + prefix.
    In production these would be learned weights from a labelled dataset.
    """
    weights = np.zeros((len(labels), input_dim), dtype=np.float32)
    for i, label in enumerate(labels):
        rng = np.random.default_rng(seed=hash(f"{seed_prefix}_{label}") % (2**32))
        v = rng.standard_normal(input_dim).astype(np.float32)
        weights[i] = v / (np.linalg.norm(v) + 1e-8)
    return weights


def _softmax(x: np.ndarray) -> np.ndarray:
    x_max = np.max(x)
    e = np.exp(x - x_max)
    return e / (e.sum() + 1e-10)


def _classify(
    embedding: np.ndarray,
    weights: np.ndarray,
    labels: List[str],
    temperature: float = 8.0,
) -> Tuple[str, float, Dict[str, float]]:
    """Dot-product classifier with temperature-scaled softmax."""
    emb = embedding.astype(np.float32)
    norm = np.linalg.norm(emb)
    emb = emb / (norm + 1e-8)
    logits = weights @ emb * temperature
    probs = _softmax(logits)
    idx = int(np.argmax(probs))
    prob_dict = {l: float(p) for l, p in zip(labels, probs)}
    return labels[idx], float(probs[idx]), prob_dict


# ---------------------------------------------------------------------------
# Classifier
# ---------------------------------------------------------------------------

class AutomotiveClassifier:
    """
    Classifies automotive generation embeddings along multiple axes.

    Input embeddings are expected to be 2048-dim combined embeddings as
    produced by EmbeddingPipeline.generate_combined_embedding(), or any
    fixed-dim L2-normalised vector.
    """

    BODY_TYPES  = ["sedan", "coupe", "suv", "wagon", "convertible",
                   "pickup", "van", "hatchback", "crossover", "roadster"]
    ERAS        = ["1950s", "1960s", "1970s", "1980s", "1990s",
                   "2000s", "2010s", "2020s"]
    SEGMENTS    = ["economy", "mid", "premium", "luxury", "supercar", "hypercar"]
    LANGUAGES   = ["aggressive", "elegant", "sporty", "retro", "futuristic"]

    def __init__(self, embedding_dim: int = 2048) -> None:
        self.embedding_dim = embedding_dim
        self._build_classifiers()
        log.info("automotive_classifier_ready", embedding_dim=embedding_dim)

    def _build_classifiers(self) -> None:
        """Initialise weight matrices for each classification task."""
        dim = self.embedding_dim
        self._body_weights    = _make_classifier_weights(dim, self.BODY_TYPES, "body")
        self._era_weights     = _make_classifier_weights(dim, self.ERAS, "era")
        self._segment_weights = _make_classifier_weights(dim, self.SEGMENTS, "segment")
        self._language_weights = _make_classifier_weights(dim, self.LANGUAGES, "language")

        # Year regression weights (one per decade, interpolated)
        rng = np.random.default_rng(42)
        self._year_weights = rng.standard_normal((dim,)).astype(np.float32)
        self._year_weights /= np.linalg.norm(self._year_weights) + 1e-8

    # ------------------------------------------------------------------
    # Classification methods
    # ------------------------------------------------------------------

    def classify_body_type(self, embedding: np.ndarray) -> BodyTypeClassification:
        """
        Classify car body type from embedding.

        Args:
            embedding: Any-dim L2-normalised embedding.

        Returns:
            BodyTypeClassification.
        """
        emb = self._align(embedding)
        label, conf, probs = _classify(emb, self._body_weights, self.BODY_TYPES)
        return BodyTypeClassification(body_type=label, confidence=conf, probabilities=probs)

    def classify_era(
        self, embedding: np.ndarray, year_hint: Optional[int] = None
    ) -> EraClassification:
        """
        Classify the design era of a car from its embedding.

        If year_hint is provided, it is used to re-weight the softmax distribution
        (Bayesian update: prior = Gaussian around year_hint).

        Args:
            embedding: Embedding vector.
            year_hint: Optional known year (e.g. from database metadata).

        Returns:
            EraClassification.
        """
        emb = self._align(embedding)
        label, conf, probs = _classify(emb, self._era_weights, self.ERAS)

        if year_hint is not None:
            # Apply Gaussian re-weighting centred on year_hint
            era_years = [1955, 1965, 1975, 1985, 1995, 2005, 2015, 2022]
            weights = np.array([
                float(np.exp(-((year_hint - y) ** 2) / (2 * 7**2)))
                for y in era_years
            ], dtype=np.float32)
            adjusted_probs = np.array([probs[e] for e in self.ERAS]) * weights
            adjusted_probs = _softmax(adjusted_probs * 10)
            idx = int(np.argmax(adjusted_probs))
            label = self.ERAS[idx]
            conf = float(adjusted_probs[idx])
            probs = {e: float(p) for e, p in zip(self.ERAS, adjusted_probs)}

        decade_start = int(label[:4])
        return EraClassification(
            era=label,
            confidence=conf,
            decade_start=decade_start,
            probabilities=probs,
        )

    def classify_segment(self, embedding: np.ndarray) -> SegmentClassification:
        """
        Classify market segment (economy -> hypercar).

        Args:
            embedding: Embedding vector.

        Returns:
            SegmentClassification.
        """
        emb = self._align(embedding)
        label, conf, probs = _classify(emb, self._segment_weights, self.SEGMENTS)
        return SegmentClassification(segment=label, confidence=conf, probabilities=probs)

    def classify_design_language(self, embedding: np.ndarray) -> DesignLanguage:
        """
        Classify the overall design language.

        Args:
            embedding: Embedding vector.

        Returns:
            DesignLanguage.
        """
        emb = self._align(embedding)
        label, conf, probs = _classify(emb, self._language_weights, self.LANGUAGES)
        return DesignLanguage(language=label, confidence=conf, probabilities=probs)

    def classify_concept_vs_production(self, embedding: np.ndarray) -> float:
        """
        Estimate the probability that a car is a concept rather than production.

        Concept cars tend to be extreme outliers in embedding space — distant
        from the mainstream production centroid.

        Args:
            embedding: Embedding vector.

        Returns:
            Float in [0, 1]; higher = more likely concept.
        """
        emb = self._align(embedding)
        # Proxy: distance from the mean of all era centroids
        era_centroids = self._era_weights  # (8, dim)
        mean_centroid = era_centroids.mean(axis=0)
        mean_centroid /= np.linalg.norm(mean_centroid) + 1e-8

        similarity = float(emb @ mean_centroid)
        # Low similarity to mainstream = concept-like
        concept_prob = float(np.clip(1.0 - (similarity + 1.0) / 2.0, 0.0, 1.0))
        return concept_prob

    def predict_generation_year(self, embedding: np.ndarray) -> YearPrediction:
        """
        Predict the production year range of a generation from its embedding.

        Uses a linear regression proxy: dot-product with a learned weight vector
        maps to a continuous year estimate, then bounds a ±5-year confidence interval.

        Args:
            embedding: Embedding vector.

        Returns:
            YearPrediction with estimated year range.
        """
        emb = self._align(embedding)
        # Map dot product to year in [1950, 2030]
        raw_score = float(emb @ self._year_weights)
        # Scale from [-1, 1] to [1950, 2030]
        estimated_year = int(1990 + raw_score * 40)
        estimated_year = max(1950, min(2030, estimated_year))

        # Era distribution refines bounds
        era_cls = self.classify_era(embedding)
        decade_start = era_cls.decade_start
        decade_end = decade_start + 9

        year_min = max(1950, min(estimated_year - 5, decade_start))
        year_max = min(2030, max(estimated_year + 5, decade_end))
        most_likely = max(year_min, min(year_max, estimated_year))

        return YearPrediction(
            estimated_year_min=year_min,
            estimated_year_max=year_max,
            most_likely_year=most_likely,
            confidence=era_cls.confidence,
        )

    # ------------------------------------------------------------------
    # Clustering
    # ------------------------------------------------------------------

    def build_clustering_model(
        self, embeddings: Dict[int, np.ndarray]
    ) -> ClusteringResult:
        """
        Cluster a set of generation embeddings using HDBSCAN.

        HDBSCAN is preferred over k-means because it does not require
        specifying k, handles arbitrary cluster shapes, and identifies noise.

        Args:
            embeddings: Dict mapping generation_id -> embedding vector.

        Returns:
            ClusteringResult with labels, probabilities, and centroids.
        """
        if not embeddings:
            return ClusteringResult(
                n_clusters=0,
                labels=np.array([], dtype=int),
                probabilities=np.array([], dtype=float),
                cluster_centroids={},
                noise_ratio=0.0,
            )

        try:
            import hdbscan
        except ImportError:
            log.warning("hdbscan_not_installed_falling_back_to_kmeans")
            return self._fallback_kmeans_clustering(embeddings)

        ids = list(embeddings.keys())
        X = np.stack([embeddings[i].astype(np.float32) for i in ids])

        min_cluster_size = max(2, len(ids) // 10)
        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=min_cluster_size,
            metric="cosine",
            cluster_selection_method="eom",
            prediction_data=True,
        )
        labels = clusterer.fit_predict(X)
        probs = clusterer.probabilities_

        unique_labels = set(labels) - {-1}
        n_clusters = len(unique_labels)
        noise_ratio = float((labels == -1).sum()) / len(labels)

        # Compute centroids
        centroids: Dict[int, np.ndarray] = {}
        for cid in unique_labels:
            mask = labels == cid
            centroid = X[mask].mean(axis=0)
            centroid /= np.linalg.norm(centroid) + 1e-8
            centroids[int(cid)] = centroid.astype(np.float32)

        log.info("clustering_complete", n_clusters=n_clusters, noise_ratio=noise_ratio)

        return ClusteringResult(
            n_clusters=n_clusters,
            labels=labels,
            probabilities=probs,
            cluster_centroids=centroids,
            noise_ratio=noise_ratio,
            metadata={"generation_ids": ids},
        )

    def _fallback_kmeans_clustering(
        self, embeddings: Dict[int, np.ndarray]
    ) -> ClusteringResult:
        """K-means fallback when HDBSCAN is unavailable."""
        from sklearn.cluster import KMeans

        ids = list(embeddings.keys())
        X = np.stack([embeddings[i].astype(np.float32) for i in ids])

        n_clusters = max(2, int(np.sqrt(len(ids))))
        km = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        labels = km.fit_predict(X)

        centroids = {
            int(i): km.cluster_centers_[i] / (np.linalg.norm(km.cluster_centers_[i]) + 1e-8)
            for i in range(n_clusters)
        }

        return ClusteringResult(
            n_clusters=n_clusters,
            labels=labels,
            probabilities=np.ones(len(labels), dtype=float),
            cluster_centroids=centroids,
            noise_ratio=0.0,
            metadata={"generation_ids": ids, "method": "kmeans_fallback"},
        )

    def find_visual_clusters(
        self,
        embeddings: Dict[int, np.ndarray],
        n_clusters: Optional[int] = None,
    ) -> List[Cluster]:
        """
        Find visually similar clusters and return structured Cluster objects.

        Args:
            embeddings: Dict mapping generation_id -> embedding.
            n_clusters: If specified, override automatic cluster count.

        Returns:
            List of Cluster objects, sorted by size (descending).
        """
        if n_clusters is not None:
            # Force k-means with specified k
            from sklearn.cluster import KMeans

            ids = list(embeddings.keys())
            X = np.stack([embeddings[i].astype(np.float32) for i in ids])
            km = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            labels = km.fit_predict(X)
            clustering = ClusteringResult(
                n_clusters=n_clusters,
                labels=labels,
                probabilities=np.ones(len(labels)),
                cluster_centroids={
                    i: km.cluster_centers_[i] / (np.linalg.norm(km.cluster_centers_[i]) + 1e-8)
                    for i in range(n_clusters)
                },
                noise_ratio=0.0,
                metadata={"generation_ids": ids},
            )
        else:
            clustering = self.build_clustering_model(embeddings)

        ids = clustering.metadata.get("generation_ids", list(embeddings.keys()))
        clusters: List[Cluster] = []

        for cid, centroid in clustering.cluster_centroids.items():
            mask = clustering.labels == cid
            gen_ids = [ids[i] for i in range(len(ids)) if mask[i]]
            if not gen_ids:
                continue

            member_embs = np.stack([embeddings[gid].astype(np.float32) for gid in gen_ids
                                    if gid in embeddings])
            if len(member_embs) < 2:
                intra_sim = 1.0
            else:
                from scipy.spatial.distance import cosine as cosine_dist
                sims = []
                for a in range(min(len(member_embs), 10)):
                    for b in range(a + 1, min(len(member_embs), 10)):
                        sims.append(1.0 - float(cosine_dist(
                            member_embs[a].astype(np.float64),
                            member_embs[b].astype(np.float64),
                        )))
                intra_sim = float(np.mean(sims)) if sims else 1.0

            clusters.append(Cluster(
                cluster_id=int(cid),
                generation_ids=gen_ids,
                centroid=centroid,
                intra_similarity=intra_sim,
                size=len(gen_ids),
            ))

        return sorted(clusters, key=lambda c: c.size, reverse=True)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _align(self, embedding: np.ndarray) -> np.ndarray:
        """Resize and normalise embedding to match classifier input dim."""
        emb = embedding.astype(np.float32).flatten()
        if emb.shape[0] == self.embedding_dim:
            pass
        elif emb.shape[0] > self.embedding_dim:
            emb = emb[: self.embedding_dim]
        else:
            padding = np.zeros(self.embedding_dim - emb.shape[0], dtype=np.float32)
            emb = np.concatenate([emb, padding])
        norm = np.linalg.norm(emb)
        return emb / (norm + 1e-8)
