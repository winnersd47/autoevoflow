"""
Brand Design DNA Analyser.

Extracts, quantifies, and compares brand design DNA across automotive generations
using embedding-space analysis. Includes pre-defined DNA profiles for major brands.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np
import structlog
from scipy.spatial.distance import cosine as cosine_distance

log = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class BrandDNA:
    brand: str
    core_embedding: np.ndarray          # Centroid of all brand embeddings (512,)
    grille_signature: np.ndarray        # Sub-space projection (128,)
    light_signature: np.ndarray         # Sub-space projection (128,)
    silhouette_signature: np.ndarray    # Sub-space projection (128,)
    recognition_score: float            # 0-1: how recognisable/consistent the DNA is
    generation_count: int = 0
    dominant_style: str = ""            # e.g. "sporty", "luxury", "aggressive"
    metadata: dict = field(default_factory=dict)


@dataclass
class DNAContinuityScore:
    score: float                        # 0-1, 1 = perfect continuity
    per_generation_scores: List[float] = field(default_factory=list)
    weakest_link_idx: int = -1
    trend: str = "stable"               # "stable" / "improving" / "declining"


@dataclass
class IdentityLossScore:
    score: float                        # 0-1, 1 = total identity loss
    grille_loss: float = 0.0
    light_loss: float = 0.0
    silhouette_loss: float = 0.0
    explanation: str = ""


@dataclass
class EvolutionaryJump:
    from_generation_idx: int
    to_generation_idx: int
    jump_magnitude: float               # 0-1
    affected_elements: List[str] = field(default_factory=list)
    is_radical: bool = False


@dataclass
class BorrowingEdge:
    source_brand: str
    target_brand: str
    element: str                        # Which design element was borrowed
    similarity: float
    direction: str = "source_to_target"


# ---------------------------------------------------------------------------
# Pre-defined brand DNA profiles (heuristic centroid vectors)
# ---------------------------------------------------------------------------

# These are 512-dim seed vectors generated deterministically from brand names.
# In production, they would be replaced by embeddings computed from real images.

def _seed_brand_vector(brand_name: str, dim: int = 512) -> np.ndarray:
    """Generate a deterministic unit vector seeded from brand name."""
    rng = np.random.default_rng(seed=hash(brand_name) % (2**32))
    v = rng.standard_normal(dim).astype(np.float32)
    return v / (np.linalg.norm(v) + 1e-8)


BRAND_DNA_PROFILES: Dict[str, dict] = {
    "BMW": {
        "dominant_style": "sporty",
        "signature_traits": ["kidney_grille", "hofmeister_kink", "angular_headlights"],
        "era_continuity": 0.82,
        "recognition_score": 0.90,
    },
    "Audi": {
        "dominant_style": "elegant",
        "signature_traits": ["single_frame_grille", "full_led_signature", "clean_lines"],
        "era_continuity": 0.85,
        "recognition_score": 0.88,
    },
    "Porsche": {
        "dominant_style": "classic_modern",
        "signature_traits": ["round_headlights", "fastback_silhouette", "wide_fenders"],
        "era_continuity": 0.91,
        "recognition_score": 0.94,
    },
    "Mercedes": {
        "dominant_style": "luxury",
        "signature_traits": ["star_grille", "sweep_tail_lights", "three_box_proportion"],
        "era_continuity": 0.80,
        "recognition_score": 0.87,
    },
    "Ferrari": {
        "dominant_style": "aggressive",
        "signature_traits": ["prancing_horse", "air_intakes", "low_roofline"],
        "era_continuity": 0.78,
        "recognition_score": 0.95,
    },
    "Lamborghini": {
        "dominant_style": "futuristic",
        "signature_traits": ["angular_design", "scissor_doors", "y_motif_lights"],
        "era_continuity": 0.75,
        "recognition_score": 0.96,
    },
    "Toyota": {
        "dominant_style": "modern",
        "signature_traits": ["keen_look", "spindle_grille", "functional_design"],
        "era_continuity": 0.77,
        "recognition_score": 0.83,
    },
    "Honda": {
        "dominant_style": "clean_modern",
        "signature_traits": ["solid_wing_grille", "led_strip_lights", "cab_forward"],
        "era_continuity": 0.79,
        "recognition_score": 0.81,
    },
}


# ---------------------------------------------------------------------------
# Analyser
# ---------------------------------------------------------------------------

class DesignDNAAnalyzer:
    """
    Analyses and compares brand design DNA from automotive generation embeddings.

    All embedding inputs are expected to be 512-dim Design DNA vectors as
    produced by AutomotiveVisionPipeline.extract_design_dna_vector().
    """

    # Sub-space slices within 512-dim DNA vector (heuristic locality assumption)
    _GRILLE_SLICE    = slice(0, 128)
    _LIGHT_SLICE     = slice(128, 256)
    _SILHOUETTE_SLICE = slice(256, 384)
    _TEXTURE_SLICE   = slice(384, 512)

    # Thresholds
    RADICAL_REDESIGN_THRESHOLD = 0.35   # similarity below this = radical
    IDENTITY_LOSS_THRESHOLD    = 0.30
    JUMP_THRESHOLD             = 0.25   # mutation magnitude above this = jump

    def __init__(self) -> None:
        self._profile_cache: Dict[str, BrandDNA] = {}
        self._preload_known_brands()

    def _preload_known_brands(self) -> None:
        for brand, profile in BRAND_DNA_PROFILES.items():
            seed_emb = _seed_brand_vector(brand, 512)
            dna = BrandDNA(
                brand=brand,
                core_embedding=seed_emb,
                grille_signature=seed_emb[self._GRILLE_SLICE].copy(),
                light_signature=seed_emb[self._LIGHT_SLICE].copy(),
                silhouette_signature=seed_emb[self._SILHOUETTE_SLICE].copy(),
                recognition_score=profile["recognition_score"],
                generation_count=0,
                dominant_style=profile["dominant_style"],
                metadata=profile,
            )
            self._profile_cache[brand] = dna

    # ------------------------------------------------------------------
    # Core extraction
    # ------------------------------------------------------------------

    def extract_brand_dna(self, brand_images: List[np.ndarray], brand: str = "") -> BrandDNA:
        """
        Extract brand DNA from a list of 512-dim design DNA embeddings.

        The brand DNA centroid is computed as the mean of all input vectors.
        Sub-signatures are extracted from fixed embedding sub-spaces.
        Recognition score is derived from intra-brand cosine similarity spread.

        Args:
            brand_images: List of 512-dim design DNA vectors.
            brand: Brand name (used for caching and pre-seeding).

        Returns:
            BrandDNA dataclass.
        """
        if not brand_images:
            seed = _seed_brand_vector(brand or "unknown")
            return BrandDNA(
                brand=brand,
                core_embedding=seed,
                grille_signature=seed[self._GRILLE_SLICE].copy(),
                light_signature=seed[self._LIGHT_SLICE].copy(),
                silhouette_signature=seed[self._SILHOUETTE_SLICE].copy(),
                recognition_score=0.0,
            )

        embeddings = np.stack([e.astype(np.float32) for e in brand_images])  # (N, 512)

        # Apply pre-seed if known brand
        if brand in self._profile_cache:
            seed_emb = self._profile_cache[brand].core_embedding.reshape(1, -1)
            embeddings = np.vstack([seed_emb, embeddings])

        centroid = embeddings.mean(axis=0)
        norm = np.linalg.norm(centroid)
        centroid /= (norm + 1e-8)

        # Recognition score: mean pairwise cosine similarity (spread)
        if len(embeddings) >= 2:
            sims = []
            for i in range(min(len(embeddings), 20)):
                for j in range(i + 1, min(len(embeddings), 20)):
                    d = cosine_distance(embeddings[i].astype(np.float64),
                                        embeddings[j].astype(np.float64))
                    sims.append(1.0 - float(d))
            recognition_score = float(np.mean(sims)) if sims else 0.5
        else:
            recognition_score = 0.5

        # Pull dominant style from profile cache
        dominant_style = self._profile_cache.get(brand, BrandDNA(
            brand=brand, core_embedding=centroid,
            grille_signature=centroid[self._GRILLE_SLICE].copy(),
            light_signature=centroid[self._LIGHT_SLICE].copy(),
            silhouette_signature=centroid[self._SILHOUETTE_SLICE].copy(),
            recognition_score=recognition_score
        )).dominant_style

        dna = BrandDNA(
            brand=brand,
            core_embedding=centroid.astype(np.float32),
            grille_signature=centroid[self._GRILLE_SLICE].astype(np.float32),
            light_signature=centroid[self._LIGHT_SLICE].astype(np.float32),
            silhouette_signature=centroid[self._SILHOUETTE_SLICE].astype(np.float32),
            recognition_score=recognition_score,
            generation_count=len(brand_images),
            dominant_style=dominant_style,
        )
        self._profile_cache[brand] = dna
        return dna

    # ------------------------------------------------------------------
    # Continuity
    # ------------------------------------------------------------------

    def compute_dna_continuity(
        self, gen_sequence: List[np.ndarray]
    ) -> DNAContinuityScore:
        """
        Compute DNA continuity across an ordered sequence of generation embeddings.

        Args:
            gen_sequence: Temporally ordered list of 512-dim DNA vectors.

        Returns:
            DNAContinuityScore.
        """
        if len(gen_sequence) < 2:
            return DNAContinuityScore(score=1.0, trend="stable")

        scores = []
        for i in range(len(gen_sequence) - 1):
            a = gen_sequence[i].astype(np.float64)
            b = gen_sequence[i + 1].astype(np.float64)
            sim = 1.0 - float(cosine_distance(a, b))
            scores.append(sim)

        overall = float(np.mean(scores))
        weakest_idx = int(np.argmin(scores)) if scores else -1

        # Trend: linear regression slope on scores
        if len(scores) >= 3:
            x = np.arange(len(scores), dtype=np.float64)
            slope = float(np.polyfit(x, scores, 1)[0])
            trend = "improving" if slope > 0.01 else "declining" if slope < -0.01 else "stable"
        else:
            trend = "stable"

        return DNAContinuityScore(
            score=overall,
            per_generation_scores=scores,
            weakest_link_idx=weakest_idx,
            trend=trend,
        )

    # ------------------------------------------------------------------
    # Identity loss
    # ------------------------------------------------------------------

    def detect_identity_loss(
        self, gen1_dna: BrandDNA, gen2_dna: BrandDNA
    ) -> IdentityLossScore:
        """
        Measure how much brand identity was lost between two generations.

        Compares each sub-signature (grille, lights, silhouette) separately.

        Args:
            gen1_dna: BrandDNA of the reference/earlier generation.
            gen2_dna: BrandDNA of the potentially changed generation.

        Returns:
            IdentityLossScore.
        """
        def _loss(a: np.ndarray, b: np.ndarray) -> float:
            return float(cosine_distance(a.astype(np.float64), b.astype(np.float64)))

        grille_loss = _loss(gen1_dna.grille_signature, gen2_dna.grille_signature)
        light_loss  = _loss(gen1_dna.light_signature, gen2_dna.light_signature)
        sil_loss    = _loss(gen1_dna.silhouette_signature, gen2_dna.silhouette_signature)
        overall_loss = _loss(gen1_dna.core_embedding, gen2_dna.core_embedding)

        explanation_parts = []
        if grille_loss > self.IDENTITY_LOSS_THRESHOLD:
            explanation_parts.append(f"grille signature changed significantly ({grille_loss:.2f})")
        if light_loss > self.IDENTITY_LOSS_THRESHOLD:
            explanation_parts.append(f"lighting signature changed ({light_loss:.2f})")
        if sil_loss > self.IDENTITY_LOSS_THRESHOLD:
            explanation_parts.append(f"silhouette departed from brand DNA ({sil_loss:.2f})")
        explanation = "; ".join(explanation_parts) or "No major identity loss detected."

        return IdentityLossScore(
            score=overall_loss,
            grille_loss=grille_loss,
            light_loss=light_loss,
            silhouette_loss=sil_loss,
            explanation=explanation,
        )

    # ------------------------------------------------------------------
    # Evolutionary jumps
    # ------------------------------------------------------------------

    def find_evolutionary_jumps(
        self, generation_dnas: List[BrandDNA]
    ) -> List[EvolutionaryJump]:
        """
        Identify generations where the design made a large evolutionary jump.

        Args:
            generation_dnas: Temporally ordered list of BrandDNA objects.

        Returns:
            List of EvolutionaryJump objects ordered by jump magnitude.
        """
        jumps: List[EvolutionaryJump] = []
        for i in range(len(generation_dnas) - 1):
            g1, g2 = generation_dnas[i], generation_dnas[i + 1]
            loss = self.detect_identity_loss(g1, g2)
            magnitude = loss.score

            if magnitude > self.JUMP_THRESHOLD:
                affected = []
                if loss.grille_loss > self.IDENTITY_LOSS_THRESHOLD:
                    affected.append("grille")
                if loss.light_loss > self.IDENTITY_LOSS_THRESHOLD:
                    affected.append("lights")
                if loss.silhouette_loss > self.IDENTITY_LOSS_THRESHOLD:
                    affected.append("silhouette")

                jumps.append(
                    EvolutionaryJump(
                        from_generation_idx=i,
                        to_generation_idx=i + 1,
                        jump_magnitude=magnitude,
                        affected_elements=affected,
                        is_radical=magnitude > self.RADICAL_REDESIGN_THRESHOLD,
                    )
                )

        return sorted(jumps, key=lambda j: j.jump_magnitude, reverse=True)

    # ------------------------------------------------------------------
    # Radical redesign detection
    # ------------------------------------------------------------------

    def detect_radical_redesign(
        self, before: np.ndarray, after: np.ndarray
    ) -> bool:
        """
        Return True if the change between two DNA vectors is radical.

        Args:
            before: 512-dim DNA vector of earlier design.
            after:  512-dim DNA vector of later design.

        Returns:
            True if cosine distance exceeds RADICAL_REDESIGN_THRESHOLD.
        """
        distance = float(cosine_distance(before.astype(np.float64), after.astype(np.float64)))
        return distance > self.RADICAL_REDESIGN_THRESHOLD

    # ------------------------------------------------------------------
    # Brand similarity matrix
    # ------------------------------------------------------------------

    def compute_brand_similarity_matrix(
        self, brands: Dict[str, BrandDNA]
    ) -> np.ndarray:
        """
        Compute an N x N cosine similarity matrix across brand DNA centroids.

        Args:
            brands: Dict mapping brand name -> BrandDNA.

        Returns:
            numpy array of shape (N, N) where entry [i, j] is the cosine
            similarity between brand i and brand j. Diagonal is 1.0.
        """
        brand_names = list(brands.keys())
        n = len(brand_names)
        matrix = np.zeros((n, n), dtype=np.float32)

        for i, name_i in enumerate(brand_names):
            for j, name_j in enumerate(brand_names):
                if i == j:
                    matrix[i, j] = 1.0
                elif j > i:
                    sim = 1.0 - float(
                        cosine_distance(
                            brands[name_i].core_embedding.astype(np.float64),
                            brands[name_j].core_embedding.astype(np.float64),
                        )
                    )
                    matrix[i, j] = sim
                    matrix[j, i] = sim

        return matrix

    # ------------------------------------------------------------------
    # Design borrowing detection
    # ------------------------------------------------------------------

    def find_design_borrowing(
        self,
        source_dna: BrandDNA,
        target_dnas: Dict[str, BrandDNA],
        threshold: float = 0.78,
    ) -> List[BorrowingEdge]:
        """
        Find design elements that target brands may have borrowed from source.

        Checks each sub-signature independently.

        Args:
            source_dna:  BrandDNA of the potential influencing brand.
            target_dnas: Dict of other brand BrandDNA objects.
            threshold:   Minimum sub-signature similarity to flag borrowing.

        Returns:
            List of BorrowingEdge objects.
        """
        edges: List[BorrowingEdge] = []

        sub_sigs = {
            "grille": lambda d: d.grille_signature,
            "lights": lambda d: d.light_signature,
            "silhouette": lambda d: d.silhouette_signature,
        }

        for target_brand, target_dna in target_dnas.items():
            if target_brand == source_dna.brand:
                continue
            for element, accessor in sub_sigs.items():
                src_sig = accessor(source_dna).astype(np.float64)
                tgt_sig = accessor(target_dna).astype(np.float64)
                sim = 1.0 - float(cosine_distance(src_sig, tgt_sig))
                if sim >= threshold:
                    edges.append(
                        BorrowingEdge(
                            source_brand=source_dna.brand,
                            target_brand=target_brand,
                            element=element,
                            similarity=sim,
                        )
                    )

        return sorted(edges, key=lambda e: e.similarity, reverse=True)

    # ------------------------------------------------------------------
    # Utility: retrieve known brand DNA
    # ------------------------------------------------------------------

    def get_known_brand_dna(self, brand: str) -> Optional[BrandDNA]:
        """Return pre-loaded brand DNA for known brands, or None."""
        return self._profile_cache.get(brand)

    def list_known_brands(self) -> List[str]:
        return list(self._profile_cache.keys())

    def to_dict(self, dna: BrandDNA) -> dict:
        """Serialise BrandDNA to JSON-compatible dict (excludes numpy arrays)."""
        return {
            "brand": dna.brand,
            "recognition_score": dna.recognition_score,
            "generation_count": dna.generation_count,
            "dominant_style": dna.dominant_style,
            "metadata": dna.metadata,
            "core_embedding_norm": float(np.linalg.norm(dna.core_embedding)),
        }
