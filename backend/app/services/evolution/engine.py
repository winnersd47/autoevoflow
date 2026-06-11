from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any

import numpy as np
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.neo4j.graph import Neo4jGraph
from app.db.redis.cache import RedisCache

logger = structlog.get_logger(__name__)

# ── Data classes ──────────────────────────────────────────────────────────────


@dataclass
class SimilarityResult:
    gen1_id: int
    gen2_id: int
    visual_score: float
    semantic_score: float
    dna_score: float
    weighted_score: float
    year_delta: int | None = None


@dataclass
class EvolutionEdge:
    from_generation_id: int
    to_generation_id: int
    relationship_type: str  # EVOLVES_INTO | FACELIFT_OF | INFLUENCED_BY
    similarity_score: float
    year_delta: int
    from_brand_id: int
    to_brand_id: int


@dataclass
class EvolutionTree:
    brand_id: int
    total_nodes: int
    total_edges: int
    edges: list[EvolutionEdge] = field(default_factory=list)
    hidden_connections: list[HiddenConnection] = field(default_factory=list)


@dataclass
class HiddenConnection:
    gen1_id: int
    gen2_id: int
    brand1_id: int
    brand2_id: int
    similarity_score: float
    connection_type: str


@dataclass
class LineageSummary:
    generation_id: int
    lineage_depth: int
    branching_factor: float
    design_continuity_score: float
    key_ancestors: list[dict[str, Any]]
    key_descendants: list[dict[str, Any]]


@dataclass
class GraphStats:
    total_nodes: int
    total_edges: int
    brands_processed: int
    hidden_connections_found: int


# ── Evolution Engine ──────────────────────────────────────────────────────────


class EvolutionEngine:
    """
    Core engine for computing design evolution between automotive generations.

    Weights used for similarity scoring:
      - Visual (CLIP):    0.50
      - Semantic (DINO):  0.30
      - Design DNA:       0.20

    Relationship thresholds:
      - EVOLVES_INTO:  weighted_score > 0.75, same brand
      - FACELIFT_OF:   weighted_score > 0.85, year_delta < 5
      - INFLUENCED_BY: weighted_score > 0.80, cross-brand
    """

    WEIGHT_VISUAL = 0.50
    WEIGHT_SEMANTIC = 0.30
    WEIGHT_DNA = 0.20

    THRESHOLD_EVOLVES = 0.75
    THRESHOLD_FACELIFT = 0.85
    THRESHOLD_INFLUENCE = 0.80
    FACELIFT_MAX_YEAR_DELTA = 5

    def __init__(
        self,
        db: AsyncSession,
        neo4j_driver: Neo4jGraph,
        redis: RedisCache,
    ) -> None:
        self._db = db
        self._neo4j = neo4j_driver
        self._redis = redis

    # ── Public API ────────────────────────────────────────────────────────────

    async def build_evolution_tree(self, brand_id: int) -> EvolutionTree:
        """
        Build the complete evolution tree for a brand:
        1. Fetch all generations with embeddings
        2. Detect evolution edges
        3. Write edges to Neo4j
        4. Return tree structure
        """
        from app.db.postgresql.models import CarModel, Generation

        logger.info("build_evolution_tree_start", brand_id=brand_id)

        model_ids_result = await self._db.execute(
            select(CarModel.id).where(CarModel.brand_id == brand_id)
        )
        model_ids = [row[0] for row in model_ids_result.all()]
        if not model_ids:
            logger.warning("build_evolution_tree_no_models", brand_id=brand_id)
            return EvolutionTree(brand_id=brand_id, total_nodes=0, total_edges=0)

        result = await self._db.execute(
            select(Generation).where(Generation.model_id.in_(model_ids))
        )
        generations = result.scalars().all()

        gens_dicts = [
            {
                "id": g.id,
                "model_id": g.model_id,
                "brand_id": brand_id,
                "year_start": g.year_start,
                "year_end": g.year_end,
                "code_name": g.code_name,
                "visual_embedding": g.visual_embedding,
                "semantic_embedding": g.semantic_embedding,
                "design_dna_embedding": g.design_dna_embedding,
            }
            for g in generations
        ]

        edges = await self.detect_evolution_edges(gens_dicts)

        # Write edges to Neo4j
        for edge in edges:
            if edge.relationship_type in ("EVOLVES_INTO", "FACELIFT_OF"):
                await self._neo4j.create_evolution_edge(
                    from_generation_id=edge.from_generation_id,
                    to_generation_id=edge.to_generation_id,
                    similarity_score=edge.similarity_score,
                    year_delta=edge.year_delta,
                )
            elif edge.relationship_type == "INFLUENCED_BY":
                await self._neo4j.create_influence_edge(
                    from_generation_id=edge.from_generation_id,
                    to_generation_id=edge.to_generation_id,
                    strength=edge.similarity_score,
                )

        tree = EvolutionTree(
            brand_id=brand_id,
            total_nodes=len(generations),
            total_edges=len(edges),
            edges=edges,
        )
        logger.info(
            "build_evolution_tree_complete",
            brand_id=brand_id,
            nodes=tree.total_nodes,
            edges=tree.total_edges,
        )
        return tree

    async def compute_generation_similarity(
        self, gen1_id: int, gen2_id: int
    ) -> SimilarityResult:
        """
        Compute weighted cosine similarity between two generations.
        Fetches embeddings from DB (with Redis caching).
        """
        from app.db.postgresql.models import Generation

        async def _fetch_gen(gid: int) -> dict[str, Any]:
            cache_key = f"gen_embeddings:{gid}"
            cached = await self._redis.get(cache_key)
            if cached:
                return cached

            result = await self._db.execute(
                select(
                    Generation.id,
                    Generation.year_start,
                    Generation.visual_embedding,
                    Generation.semantic_embedding,
                    Generation.design_dna_embedding,
                ).where(Generation.id == gid)
            )
            row = result.one_or_none()
            if row is None:
                raise ValueError(f"Generation {gid} not found")
            data = {
                "id": row[0],
                "year_start": row[1],
                "visual": row[2],
                "semantic": row[3],
                "dna": row[4],
            }
            await self._redis.set(cache_key, data, ttl=3600)
            return data

        g1 = await _fetch_gen(gen1_id)
        g2 = await _fetch_gen(gen2_id)

        visual_score = _cosine_similarity(g1["visual"], g2["visual"])
        semantic_score = _cosine_similarity(g1["semantic"], g2["semantic"])
        dna_score = _cosine_similarity(g1["dna"], g2["dna"])

        weighted = (
            self.WEIGHT_VISUAL * visual_score
            + self.WEIGHT_SEMANTIC * semantic_score
            + self.WEIGHT_DNA * dna_score
        )

        year_delta: int | None = None
        if g1["year_start"] is not None and g2["year_start"] is not None:
            year_delta = abs(g2["year_start"] - g1["year_start"])

        return SimilarityResult(
            gen1_id=gen1_id,
            gen2_id=gen2_id,
            visual_score=visual_score,
            semantic_score=semantic_score,
            dna_score=dna_score,
            weighted_score=max(0.0, min(1.0, weighted)),
            year_delta=year_delta,
        )

    async def detect_evolution_edges(
        self, generations: list[dict[str, Any]]
    ) -> list[EvolutionEdge]:
        """
        Detect EVOLVES_INTO, FACELIFT_OF, and INFLUENCED_BY edges
        from a list of generation dicts (sorted by year).
        """
        if len(generations) < 2:
            return []

        # Sort by year_start (None years go last)
        sorted_gens = sorted(
            generations,
            key=lambda g: (g.get("year_start") is None, g.get("year_start") or 0),
        )

        edges: list[EvolutionEdge] = []
        n = len(sorted_gens)

        for i in range(n):
            for j in range(i + 1, min(i + 6, n)):  # Compare with next 5 generations
                g1 = sorted_gens[i]
                g2 = sorted_gens[j]

                visual_score = _cosine_similarity(g1.get("visual_embedding"), g2.get("visual_embedding"))
                semantic_score = _cosine_similarity(
                    g1.get("semantic_embedding"), g2.get("semantic_embedding")
                )
                dna_score = _cosine_similarity(
                    g1.get("design_dna_embedding"), g2.get("design_dna_embedding")
                )

                weighted = (
                    self.WEIGHT_VISUAL * visual_score
                    + self.WEIGHT_SEMANTIC * semantic_score
                    + self.WEIGHT_DNA * dna_score
                )

                y1 = g1.get("year_start") or 0
                y2 = g2.get("year_start") or 0
                year_delta = abs(y2 - y1)

                same_brand = g1.get("brand_id") == g2.get("brand_id")

                rel_type: str | None = None
                if same_brand:
                    if weighted > self.THRESHOLD_FACELIFT and year_delta < self.FACELIFT_MAX_YEAR_DELTA:
                        rel_type = "FACELIFT_OF"
                    elif weighted > self.THRESHOLD_EVOLVES:
                        rel_type = "EVOLVES_INTO"
                elif not same_brand and weighted > self.THRESHOLD_INFLUENCE:
                    rel_type = "INFLUENCED_BY"

                if rel_type:
                    edges.append(
                        EvolutionEdge(
                            from_generation_id=g1["id"],
                            to_generation_id=g2["id"],
                            relationship_type=rel_type,
                            similarity_score=round(weighted, 4),
                            year_delta=year_delta,
                            from_brand_id=g1.get("brand_id", 0),
                            to_brand_id=g2.get("brand_id", 0),
                        )
                    )

        logger.debug("detect_evolution_edges_complete", edges_found=len(edges))
        return edges

    async def compute_design_continuity_score(self, lineage: list[int]) -> float:
        """
        Compute design continuity for an ordered sequence of generation IDs.
        Returns 0.0–1.0. Penalises large similarity drops.
        """
        if len(lineage) < 2:
            return 1.0

        scores: list[float] = []
        for i in range(len(lineage) - 1):
            try:
                result = await self.compute_generation_similarity(lineage[i], lineage[i + 1])
                scores.append(result.weighted_score)
            except ValueError:
                scores.append(0.0)

        if not scores:
            return 0.0

        avg_score = np.mean(scores)
        # Penalise high variance (large design jumps)
        variance_penalty = np.std(scores) * 0.5
        continuity = float(avg_score - variance_penalty)
        return max(0.0, min(1.0, continuity))

    async def find_hidden_connections(
        self, threshold: float = 0.85
    ) -> list[HiddenConnection]:
        """
        Find pairs of generations across different brands with high visual similarity.
        Filters out already-known influence edges.
        """
        from app.db.postgresql.models import CarModel, Generation

        result = await self._db.execute(
            select(
                Generation.id,
                Generation.visual_embedding,
                CarModel.brand_id,
            ).join(CarModel, Generation.model_id == CarModel.id)
            .where(Generation.visual_embedding.isnot(None))
        )
        rows = result.all()

        if len(rows) < 2:
            return []

        hidden: list[HiddenConnection] = []

        # Fetch known cross-brand edges from Neo4j to exclude
        known_pairs: set[tuple[int, int]] = set()
        try:
            known_edges = await self._neo4j.run_raw(
                "MATCH (a:Generation)-[:INFLUENCED_BY]->(b:Generation) "
                "RETURN a.generation_id AS a, b.generation_id AS b"
            )
            for edge in known_edges:
                known_pairs.add((edge["a"], edge["b"]))
                known_pairs.add((edge["b"], edge["a"]))
        except Exception as exc:
            logger.warning("Could not fetch known edges from Neo4j", error=str(exc))

        n = len(rows)
        for i in range(n):
            for j in range(i + 1, n):
                gen1_id, vec1, brand1 = rows[i]
                gen2_id, vec2, brand2 = rows[j]

                if brand1 == brand2:
                    continue
                if (gen1_id, gen2_id) in known_pairs:
                    continue

                score = _cosine_similarity(vec1, vec2)
                if score >= threshold:
                    hidden.append(
                        HiddenConnection(
                            gen1_id=gen1_id,
                            gen2_id=gen2_id,
                            brand1_id=brand1,
                            brand2_id=brand2,
                            similarity_score=round(score, 4),
                            connection_type="unexpected_visual_similarity",
                        )
                    )

        hidden.sort(key=lambda h: h.similarity_score, reverse=True)
        logger.info("hidden_connections_found", count=len(hidden))
        return hidden

    async def build_automotive_knowledge_graph(self) -> GraphStats:
        """
        Process all brands, build all evolution edges, and populate Neo4j.
        Returns stats: total nodes, edges, and brands processed.
        """
        from app.db.postgresql.models import Brand

        result = await self._db.execute(select(Brand.id))
        brand_ids = [row[0] for row in result.all()]

        total_nodes = 0
        total_edges = 0
        brands_processed = 0

        for bid in brand_ids:
            try:
                tree = await self.build_evolution_tree(bid)
                total_nodes += tree.total_nodes
                total_edges += tree.total_edges
                brands_processed += 1
            except Exception as exc:
                logger.error("build_evolution_tree_failed", brand_id=bid, error=str(exc))

        hidden = await self.find_hidden_connections()
        for conn in hidden:
            try:
                await self._neo4j.create_influence_edge(
                    from_generation_id=conn.gen1_id,
                    to_generation_id=conn.gen2_id,
                    strength=conn.similarity_score,
                )
            except Exception as exc:
                logger.warning("create_hidden_edge_failed", error=str(exc))

        logger.info(
            "build_automotive_knowledge_graph_complete",
            nodes=total_nodes,
            edges=total_edges,
            brands=brands_processed,
            hidden=len(hidden),
        )
        return GraphStats(
            total_nodes=total_nodes,
            total_edges=total_edges,
            brands_processed=brands_processed,
            hidden_connections_found=len(hidden),
        )

    async def get_lineage_summary(self, generation_id: int) -> LineageSummary:
        """
        Traverse Neo4j lineage tree and compute summary metrics.
        """
        lineage = await self._neo4j.get_lineage(generation_id, max_depth=15)

        ancestors = lineage.get("ancestors", [])
        descendants = lineage.get("descendants", [])

        # Flatten unique ancestor/descendant nodes
        def _flatten_nodes(paths: list[dict[str, Any]]) -> list[dict[str, Any]]:
            seen: set[int] = set()
            result = []
            for path in paths:
                for node in path.get("nodes", []):
                    gid = node.get("generation_id")
                    if gid and gid not in seen and gid != generation_id:
                        seen.add(gid)
                        result.append(node)
            return result

        ancestor_nodes = _flatten_nodes(ancestors)
        descendant_nodes = _flatten_nodes(descendants)

        lineage_depth = len(ancestor_nodes) + len(descendant_nodes)
        branching_factor = (
            len(descendant_nodes) / max(1, lineage_depth) if lineage_depth > 0 else 0.0
        )

        ancestor_ids = [n.get("generation_id") for n in ancestor_nodes if n.get("generation_id")]
        continuity = await self.compute_design_continuity_score(
            ancestor_ids + [generation_id]
        )

        return LineageSummary(
            generation_id=generation_id,
            lineage_depth=lineage_depth,
            branching_factor=round(branching_factor, 3),
            design_continuity_score=round(continuity, 4),
            key_ancestors=ancestor_nodes[:5],
            key_descendants=descendant_nodes[:5],
        )


# ── Utilities ─────────────────────────────────────────────────────────────────


def _cosine_similarity(
    vec1: list[float] | None,
    vec2: list[float] | None,
) -> float:
    """Compute cosine similarity between two vectors. Returns 0.0 if either is None."""
    if vec1 is None or vec2 is None:
        return 0.0
    v1 = np.array(vec1, dtype=np.float32)
    v2 = np.array(vec2, dtype=np.float32)
    # Pad/truncate to same length
    min_len = min(len(v1), len(v2))
    v1, v2 = v1[:min_len], v2[:min_len]
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0
    return float(np.dot(v1, v2) / (norm1 * norm2))
