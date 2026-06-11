"""
Evolution Detection Model.

Detects facelifts, full redesigns, platform sharing, and computes probabilistic
evolution trees and cross-brand influence graphs from generation embeddings.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import networkx as nx
import numpy as np
import structlog
from scipy.spatial.distance import cosine as cosine_distance

log = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class GenerationEmbedding:
    generation_id: int
    embedding: np.ndarray       # Combined embedding (2048,) or any fixed dim
    brand: str
    model: str
    year_start: int
    year_end: int
    code_name: str = ""
    platform: str = ""


@dataclass
class FaceliftResult:
    is_facelift: bool
    confidence: float           # 0-1
    changed_elements: List[str] = field(default_factory=list)
    similarity_score: float = 0.0
    notes: str = ""


@dataclass
class RedesignResult:
    is_redesign: bool
    confidence: float
    similarity_score: float = 0.0
    generation_gap: int = 0     # years
    notes: str = ""


@dataclass
class ContinuityScore:
    score: float                # 0-1, 1 = perfect continuity
    weak_links: List[Tuple[int, int]] = field(default_factory=list)  # (gen_id_a, gen_id_b)
    break_points: List[int] = field(default_factory=list)             # generation_ids


@dataclass
class PlatformCluster:
    cluster_id: int
    generation_ids: List[int]
    centroid_embedding: np.ndarray
    intra_cluster_similarity: float
    suspected_platform: str = ""


@dataclass
class EvolutionTree:
    graph: nx.DiGraph                   # Nodes = generation_id, edge weight = probability
    root_ids: List[int]
    lineage_chains: List[List[int]]     # Each inner list is one continuous lineage
    metadata: dict = field(default_factory=dict)


@dataclass
class InfluenceEdge:
    source_brand: str
    target_brand: str
    source_generation_id: int
    target_generation_id: int
    influence_score: float       # 0-1
    direction: str               # "source_to_target" / "bidirectional"
    notes: str = ""


# ---------------------------------------------------------------------------
# Thresholds (tunable)
# ---------------------------------------------------------------------------

FACELIFT_SIM_LOW    = 0.80   # minimum cosine similarity to consider facelift
FACELIFT_SIM_HIGH   = 0.92   # above this = likely just a minor update
REDESIGN_SIM_HIGH   = 0.70   # above this = probably not a full redesign
LINEAGE_MIN_SIM     = 0.60   # minimum to draw a lineage edge
PLATFORM_SIM        = 0.82   # similarity to cluster as same platform
CROSS_BRAND_SIM     = 0.75   # threshold for cross-brand influence


# ---------------------------------------------------------------------------
# Detector
# ---------------------------------------------------------------------------

class EvolutionDetector:
    """
    Detects automotive evolution patterns from generation embeddings.

    All methods operate on L2-normalised embedding vectors. Cosine similarity
    is the primary distance metric; temporal gap (years) is used as a prior.
    """

    def __init__(
        self,
        facelift_sim_low: float = FACELIFT_SIM_LOW,
        facelift_sim_high: float = FACELIFT_SIM_HIGH,
        redesign_sim_high: float = REDESIGN_SIM_HIGH,
        lineage_min_sim: float = LINEAGE_MIN_SIM,
        platform_sim: float = PLATFORM_SIM,
        cross_brand_sim: float = CROSS_BRAND_SIM,
    ) -> None:
        self.facelift_sim_low = facelift_sim_low
        self.facelift_sim_high = facelift_sim_high
        self.redesign_sim_high = redesign_sim_high
        self.lineage_min_sim = lineage_min_sim
        self.platform_sim = platform_sim
        self.cross_brand_sim = cross_brand_sim

    # ------------------------------------------------------------------
    # Core similarity
    # ------------------------------------------------------------------

    @staticmethod
    def _cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
        """Safe cosine similarity."""
        d = cosine_distance(a.astype(np.float64), b.astype(np.float64))
        return float(np.clip(1.0 - d, -1.0, 1.0))

    # ------------------------------------------------------------------
    # Lineage probability
    # ------------------------------------------------------------------

    def compute_lineage_probability(
        self,
        gen1_emb: np.ndarray,
        gen2_emb: np.ndarray,
        year_delta: int,
        brand_same: bool,
    ) -> float:
        """
        Estimate the probability that gen2 is a direct successor of gen1.

        Combines embedding similarity with a temporal Gaussian prior:
          - P(lineage) = sigmoid(alpha * sim + beta * brand_same + gamma * temporal_score)

        Args:
            gen1_emb:   Embedding of the earlier generation.
            gen2_emb:   Embedding of the later generation.
            year_delta: Number of years between generation releases.
            brand_same: Whether both generations belong to the same brand.

        Returns:
            Probability in [0, 1].
        """
        sim = self._cosine_sim(gen1_emb, gen2_emb)

        # Temporal prior: peak at 4-8 years (typical automotive cycle)
        temporal_score = math.exp(-((year_delta - 6) ** 2) / (2 * 4**2))

        brand_bonus = 0.3 if brand_same else -0.2

        alpha, beta, gamma = 2.5, 1.0, 0.8
        logit = alpha * sim + beta * brand_bonus + gamma * temporal_score - 2.5
        prob = 1.0 / (1.0 + math.exp(-logit))
        return float(np.clip(prob, 0.0, 1.0))

    # ------------------------------------------------------------------
    # Facelift detection
    # ------------------------------------------------------------------

    def detect_facelift(
        self, gen1_emb: np.ndarray, gen2_emb: np.ndarray
    ) -> FaceliftResult:
        """
        Determine whether gen2 is a facelift of gen1.

        A facelift is characterised by:
          - High visual similarity (same architecture, updated details)
          - Similarity range: [0.80, 0.92]

        Changed elements are inferred from the difference vector's attention
        to sub-regions (approximated from embedding sub-spaces).

        Args:
            gen1_emb: Embedding of original generation.
            gen2_emb: Embedding of potential facelift.

        Returns:
            FaceliftResult.
        """
        sim = self._cosine_sim(gen1_emb, gen2_emb)
        diff = gen2_emb - gen1_emb

        is_facelift = self.facelift_sim_low <= sim <= self.facelift_sim_high
        confidence = self._facelift_confidence(sim)

        changed_elements = self._infer_changed_elements(diff, sim)

        notes = (
            f"Cosine similarity {sim:.3f} suggests "
            + ("a light refresh." if sim > 0.90 else "a mid-cycle facelift." if is_facelift else "a more substantial change.")
        )

        return FaceliftResult(
            is_facelift=is_facelift,
            confidence=confidence,
            changed_elements=changed_elements,
            similarity_score=sim,
            notes=notes,
        )

    def _facelift_confidence(self, sim: float) -> float:
        """Map similarity to facelift confidence using a trapezoidal membership function."""
        if sim < self.facelift_sim_low - 0.05:
            return 0.0
        if sim < self.facelift_sim_low:
            return (sim - (self.facelift_sim_low - 0.05)) / 0.05
        if sim <= self.facelift_sim_high:
            mid = (self.facelift_sim_low + self.facelift_sim_high) / 2
            return 1.0 - abs(sim - mid) / (mid - self.facelift_sim_low)
        return max(0.0, 1.0 - (sim - self.facelift_sim_high) / 0.05)

    @staticmethod
    def _infer_changed_elements(diff: np.ndarray, sim: float) -> List[str]:
        """
        Infer which design elements changed based on embedding diff magnitude
        in heuristic sub-spaces.

        The combined 2048-dim embedding is assumed to have rough feature locality:
          [0:512]     -> body shape / silhouette
          [512:768]   -> front face / grille / headlights
          [768:1024]  -> rear styling
          [1024:1280] -> side profile
          [1280:1536] -> colour / surface texture
          [1536:2048] -> semantic / descriptor features
        """
        segments = {
            "front_face_grille_headlights": (512, 768),
            "rear_styling": (768, 1024),
            "side_profile": (1024, 1280),
            "body_silhouette": (0, 512),
            "colour_surface_texture": (1280, 1536),
        }
        changed = []
        total_energy = np.sum(diff ** 2) + 1e-10
        for name, (start, end) in segments.items():
            if end <= diff.shape[0]:
                seg_energy = np.sum(diff[start:end] ** 2) / total_energy
                if seg_energy > 0.15:
                    changed.append(name)
        if not changed and sim < 0.95:
            changed = ["minor_trim_updates"]
        return changed

    # ------------------------------------------------------------------
    # Full redesign detection
    # ------------------------------------------------------------------

    def detect_full_redesign(
        self, gen1_emb: np.ndarray, gen2_emb: np.ndarray
    ) -> RedesignResult:
        """
        Determine whether gen2 represents a completely new design.

        Args:
            gen1_emb: Embedding of previous generation.
            gen2_emb: Embedding of new generation.

        Returns:
            RedesignResult.
        """
        sim = self._cosine_sim(gen1_emb, gen2_emb)
        is_redesign = sim < self.redesign_sim_high

        # Confidence increases as similarity drops further below threshold
        if is_redesign:
            confidence = float(np.clip(1.0 - sim / self.redesign_sim_high, 0.0, 1.0))
        else:
            confidence = float(np.clip((self.redesign_sim_high - sim) / 0.1, 0.0, 1.0))

        notes = (
            "Full redesign: embeddings share little structural similarity."
            if is_redesign
            else "Insufficient evidence of full redesign; more of an evolution."
        )

        return RedesignResult(
            is_redesign=is_redesign,
            confidence=confidence,
            similarity_score=sim,
            notes=notes,
        )

    # ------------------------------------------------------------------
    # Mutation score
    # ------------------------------------------------------------------

    def compute_mutation_score(self, gen_sequence: List[np.ndarray]) -> List[float]:
        """
        Compute per-step mutation scores along a generational sequence.

        A mutation score of 0 means identical, 1 means completely different.

        Args:
            gen_sequence: Ordered list of embeddings (oldest first).

        Returns:
            List of length len(gen_sequence)-1 with mutation scores.
        """
        if len(gen_sequence) < 2:
            return []
        scores = []
        for i in range(len(gen_sequence) - 1):
            sim = self._cosine_sim(gen_sequence[i], gen_sequence[i + 1])
            scores.append(float(1.0 - sim))
        return scores

    # ------------------------------------------------------------------
    # Design continuity
    # ------------------------------------------------------------------

    def find_design_continuity(
        self, generations: List[GenerationEmbedding]
    ) -> ContinuityScore:
        """
        Assess design continuity across an ordered sequence of generations.

        Args:
            generations: Temporally ordered GenerationEmbedding objects.

        Returns:
            ContinuityScore with overall score, weak links, and break points.
        """
        if len(generations) < 2:
            return ContinuityScore(score=1.0)

        sims = []
        weak_links: List[Tuple[int, int]] = []
        break_points: List[int] = []

        for i in range(len(generations) - 1):
            g1, g2 = generations[i], generations[i + 1]
            sim = self._cosine_sim(g1.embedding, g2.embedding)
            sims.append(sim)
            if sim < self.lineage_min_sim:
                break_points.append(g2.generation_id)
            elif sim < self.lineage_min_sim + 0.1:
                weak_links.append((g1.generation_id, g2.generation_id))

        overall = float(np.mean(sims)) if sims else 1.0
        return ContinuityScore(
            score=overall,
            weak_links=weak_links,
            break_points=break_points,
        )

    # ------------------------------------------------------------------
    # Platform sharing
    # ------------------------------------------------------------------

    def detect_platform_sharing(
        self, gen_embeddings: List[GenerationEmbedding]
    ) -> List[PlatformCluster]:
        """
        Cluster generations by structural similarity to detect platform sharing.

        Uses a greedy agglomerative approach: seed with the most central
        embedding, then grow clusters by similarity threshold.

        Args:
            gen_embeddings: List of GenerationEmbedding objects (any brand/model).

        Returns:
            List of PlatformCluster objects.
        """
        if not gen_embeddings:
            return []

        embeddings = np.stack([g.embedding for g in gen_embeddings])
        n = len(gen_embeddings)
        assigned = [False] * n
        clusters: List[PlatformCluster] = []
        cluster_id = 0

        for i in range(n):
            if assigned[i]:
                continue
            members = [i]
            assigned[i] = True
            for j in range(i + 1, n):
                if assigned[j]:
                    continue
                sim = self._cosine_sim(embeddings[i], embeddings[j])
                if sim >= self.platform_sim:
                    members.append(j)
                    assigned[j] = True

            member_embs = embeddings[members]
            centroid = member_embs.mean(axis=0)
            norm = np.linalg.norm(centroid)
            centroid = centroid / (norm + 1e-8)

            intra_sims = [
                self._cosine_sim(member_embs[a], member_embs[b])
                for a in range(len(members))
                for b in range(a + 1, len(members))
            ]
            intra_avg = float(np.mean(intra_sims)) if intra_sims else 1.0

            gen_ids = [gen_embeddings[m].generation_id for m in members]
            suspected = self._guess_platform_name(
                [gen_embeddings[m] for m in members]
            )

            clusters.append(
                PlatformCluster(
                    cluster_id=cluster_id,
                    generation_ids=gen_ids,
                    centroid_embedding=centroid.astype(np.float32),
                    intra_cluster_similarity=intra_avg,
                    suspected_platform=suspected,
                )
            )
            cluster_id += 1

        return clusters

    @staticmethod
    def _guess_platform_name(gens: List[GenerationEmbedding]) -> str:
        platforms = [g.platform for g in gens if g.platform]
        if platforms:
            from collections import Counter
            return Counter(platforms).most_common(1)[0][0]
        brands = list({g.brand for g in gens})
        return f"shared_platform_{'_'.join(sorted(brands))}"

    # ------------------------------------------------------------------
    # Evolution tree
    # ------------------------------------------------------------------

    def compute_evolution_tree(self, generations: List[dict]) -> EvolutionTree:
        """
        Build a directed evolution tree from a collection of generation records.

        Algorithm:
          1. Sort generations by year_start.
          2. For each generation, find the most probable predecessor (highest
             lineage probability, same brand preferred, year_delta in [2, 12]).
          3. Draw directed edge predecessor -> successor with lineage probability.
          4. Use code_name prefix matching as an additional signal.

        Args:
            generations: List of dicts with keys:
                id, brand, model, year_start, embedding, code_name (optional)

        Returns:
            EvolutionTree with a NetworkX DiGraph.
        """
        if not generations:
            return EvolutionTree(graph=nx.DiGraph(), root_ids=[], lineage_chains=[])

        # Sort by year
        gens = sorted(generations, key=lambda g: g.get("year_start", 0))
        graph = nx.DiGraph()

        for g in gens:
            graph.add_node(
                g["id"],
                brand=g.get("brand", ""),
                model=g.get("model", ""),
                year_start=g.get("year_start", 0),
                code_name=g.get("code_name", ""),
            )

        # Connect edges
        for i, g2 in enumerate(gens):
            best_pred = None
            best_prob = 0.0

            for j in range(i):
                g1 = gens[j]
                year_delta = g2.get("year_start", 0) - g1.get("year_start", 0)
                if year_delta <= 0 or year_delta > 15:
                    continue

                brand_same = g1.get("brand") == g2.get("brand") and \
                             g1.get("model") == g2.get("model")

                emb1 = np.array(g1["embedding"], dtype=np.float32)
                emb2 = np.array(g2["embedding"], dtype=np.float32)

                prob = self.compute_lineage_probability(emb1, emb2, year_delta, brand_same)

                # Boost for code name prefix match (e.g. "F30" -> "G20")
                cn1 = g1.get("code_name", "")
                cn2 = g2.get("code_name", "")
                if cn1 and cn2 and cn1[0] != cn2[0] and brand_same:
                    prob = min(prob * 1.1, 1.0)

                if prob > best_prob:
                    best_prob = prob
                    best_pred = g1["id"]

            if best_pred is not None and best_prob > 0.35:
                graph.add_edge(best_pred, g2["id"], probability=best_prob)

        root_ids = [n for n in graph.nodes if graph.in_degree(n) == 0]
        lineage_chains = self._extract_chains(graph)

        return EvolutionTree(
            graph=graph,
            root_ids=root_ids,
            lineage_chains=lineage_chains,
            metadata={"n_generations": len(gens), "n_edges": graph.number_of_edges()},
        )

    @staticmethod
    def _extract_chains(graph: nx.DiGraph) -> List[List[int]]:
        """Extract longest path chains from the evolution graph."""
        chains: List[List[int]] = []
        visited = set()
        roots = [n for n in graph.nodes if graph.in_degree(n) == 0]
        for root in roots:
            for path in nx.all_simple_paths(graph, root, target=None):
                key = tuple(path)
                if key not in visited:
                    visited.add(key)
                    chains.append(list(path))
        if not chains:
            chains = [[n] for n in graph.nodes]
        return chains

    # ------------------------------------------------------------------
    # Cross-brand influence
    # ------------------------------------------------------------------

    def find_cross_brand_influences(
        self,
        brand_a_gens: List[GenerationEmbedding],
        brand_b_gens: List[GenerationEmbedding],
    ) -> List[InfluenceEdge]:
        """
        Identify design influence relationships between two brands.

        An influence edge is drawn when:
          - brand A generation precedes brand B generation in time
          - Their embeddings exceed the cross-brand similarity threshold
          - The similarity is higher than the temporal baseline

        Args:
            brand_a_gens: Generations from brand A, temporally sorted.
            brand_b_gens: Generations from brand B, temporally sorted.

        Returns:
            List of InfluenceEdge objects.
        """
        edges: List[InfluenceEdge] = []

        for a_gen in brand_a_gens:
            for b_gen in brand_b_gens:
                year_diff = b_gen.year_start - a_gen.year_start
                if abs(year_diff) > 12:
                    continue

                sim = self._cosine_sim(a_gen.embedding, b_gen.embedding)
                if sim < self.cross_brand_sim:
                    continue

                if year_diff > 0:
                    direction = "source_to_target"
                    source_id, target_id = a_gen.generation_id, b_gen.generation_id
                    source_brand, target_brand = a_gen.brand, b_gen.brand
                elif year_diff < 0:
                    direction = "source_to_target"
                    source_id, target_id = b_gen.generation_id, a_gen.generation_id
                    source_brand, target_brand = b_gen.brand, a_gen.brand
                else:
                    direction = "bidirectional"
                    source_id, target_id = a_gen.generation_id, b_gen.generation_id
                    source_brand, target_brand = a_gen.brand, b_gen.brand

                edges.append(
                    InfluenceEdge(
                        source_brand=source_brand,
                        target_brand=target_brand,
                        source_generation_id=source_id,
                        target_generation_id=target_id,
                        influence_score=sim,
                        direction=direction,
                        notes=f"Similarity {sim:.3f}, year delta {year_diff}",
                    )
                )

        return sorted(edges, key=lambda e: e.influence_score, reverse=True)
