from __future__ import annotations

from typing import Any

import structlog
from neo4j import AsyncDriver, AsyncGraphDatabase, AsyncSession
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings

logger = structlog.get_logger(__name__)


class Neo4jGraph:
    """Async Neo4j driver wrapper with domain-specific graph operations."""

    def __init__(self) -> None:
        self._driver: AsyncDriver | None = None

    async def connect(self) -> None:
        self._driver = AsyncGraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASS),
            max_connection_pool_size=settings.NEO4J_MAX_CONNECTION_POOL_SIZE,
        )
        # Verify connectivity
        await self._driver.verify_connectivity()
        await self._ensure_constraints()
        logger.info("Neo4j connected", uri=settings.NEO4J_URI)

    async def close(self) -> None:
        if self._driver:
            await self._driver.close()
            self._driver = None

    def _get_driver(self) -> AsyncDriver:
        if self._driver is None:
            raise RuntimeError("Neo4j driver not initialised. Call connect() first.")
        return self._driver

    async def _ensure_constraints(self) -> None:
        queries = [
            "CREATE CONSTRAINT IF NOT EXISTS FOR (b:Brand) REQUIRE b.brand_id IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (m:Model) REQUIRE m.model_id IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (g:Generation) REQUIRE g.generation_id IS UNIQUE",
        ]
        async with self._get_driver().session(database=settings.NEO4J_DATABASE) as session:
            for q in queries:
                await session.run(q)

    # ── Node creation ─────────────────────────────────────────────────────────

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=4))
    async def create_brand_node(
        self,
        brand_id: int,
        name: str,
        slug: str,
        country: str | None = None,
        founded_year: int | None = None,
    ) -> dict[str, Any]:
        query = """
        MERGE (b:Brand {brand_id: $brand_id})
        SET b.name = $name,
            b.slug = $slug,
            b.country = $country,
            b.founded_year = $founded_year,
            b.updated_at = timestamp()
        RETURN b
        """
        async with self._get_driver().session(database=settings.NEO4J_DATABASE) as session:
            result = await session.run(
                query,
                brand_id=brand_id,
                name=name,
                slug=slug,
                country=country,
                founded_year=founded_year,
            )
            record = await result.single()
            return dict(record["b"]) if record else {}

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=4))
    async def create_model_node(
        self,
        model_id: int,
        brand_id: int,
        name: str,
        slug: str,
        body_type: str | None = None,
        is_concept: bool = False,
    ) -> dict[str, Any]:
        query = """
        MATCH (b:Brand {brand_id: $brand_id})
        MERGE (m:Model {model_id: $model_id})
        SET m.name = $name,
            m.slug = $slug,
            m.body_type = $body_type,
            m.is_concept = $is_concept,
            m.updated_at = timestamp()
        MERGE (b)-[:HAS_MODEL]->(m)
        RETURN m
        """
        async with self._get_driver().session(database=settings.NEO4J_DATABASE) as session:
            result = await session.run(
                query,
                model_id=model_id,
                brand_id=brand_id,
                name=name,
                slug=slug,
                body_type=body_type,
                is_concept=is_concept,
            )
            record = await result.single()
            return dict(record["m"]) if record else {}

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=4))
    async def create_generation_node(
        self,
        generation_id: int,
        model_id: int,
        code_name: str | None = None,
        year_start: int | None = None,
        year_end: int | None = None,
        generation_number: int | None = None,
    ) -> dict[str, Any]:
        query = """
        MATCH (m:Model {model_id: $model_id})
        MERGE (g:Generation {generation_id: $generation_id})
        SET g.code_name = $code_name,
            g.year_start = $year_start,
            g.year_end = $year_end,
            g.generation_number = $generation_number,
            g.updated_at = timestamp()
        MERGE (m)-[:HAS_GENERATION]->(g)
        RETURN g
        """
        async with self._get_driver().session(database=settings.NEO4J_DATABASE) as session:
            result = await session.run(
                query,
                generation_id=generation_id,
                model_id=model_id,
                code_name=code_name,
                year_start=year_start,
                year_end=year_end,
                generation_number=generation_number,
            )
            record = await result.single()
            return dict(record["g"]) if record else {}

    # ── Edge creation ─────────────────────────────────────────────────────────

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=4))
    async def create_evolution_edge(
        self,
        from_generation_id: int,
        to_generation_id: int,
        similarity_score: float,
        year_delta: int,
    ) -> None:
        query = """
        MATCH (a:Generation {generation_id: $from_id})
        MATCH (b:Generation {generation_id: $to_id})
        MERGE (a)-[r:EVOLVES_INTO]->(b)
        SET r.similarity_score = $similarity_score,
            r.year_delta = $year_delta,
            r.updated_at = timestamp()
        """
        async with self._get_driver().session(database=settings.NEO4J_DATABASE) as session:
            await session.run(
                query,
                from_id=from_generation_id,
                to_id=to_generation_id,
                similarity_score=similarity_score,
                year_delta=year_delta,
            )

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=4))
    async def create_influence_edge(
        self,
        from_generation_id: int,
        to_generation_id: int,
        strength: float,
    ) -> None:
        query = """
        MATCH (a:Generation {generation_id: $from_id})
        MATCH (b:Generation {generation_id: $to_id})
        MERGE (a)-[r:INFLUENCED_BY]->(b)
        SET r.strength = $strength,
            r.updated_at = timestamp()
        """
        async with self._get_driver().session(database=settings.NEO4J_DATABASE) as session:
            await session.run(
                query,
                from_id=from_generation_id,
                to_id=to_generation_id,
                strength=strength,
            )

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=4))
    async def create_platform_edge(
        self,
        generation_id_a: int,
        generation_id_b: int,
        platform_name: str | None = None,
    ) -> None:
        query = """
        MATCH (a:Generation {generation_id: $id_a})
        MATCH (b:Generation {generation_id: $id_b})
        MERGE (a)-[r:SHARES_PLATFORM]-(b)
        SET r.platform_name = $platform_name,
            r.updated_at = timestamp()
        """
        async with self._get_driver().session(database=settings.NEO4J_DATABASE) as session:
            await session.run(
                query,
                id_a=generation_id_a,
                id_b=generation_id_b,
                platform_name=platform_name,
            )

    # ── Graph queries ─────────────────────────────────────────────────────────

    async def get_lineage(self, generation_id: int, max_depth: int = 10) -> dict[str, Any]:
        """Return the full forward and backward evolution tree."""
        query = """
        MATCH (root:Generation {generation_id: $generation_id})
        OPTIONAL MATCH path = (ancestor:Generation)-[:EVOLVES_INTO*1..{max_depth}]->(root)
        WITH root, collect(path) AS ancestor_paths
        OPTIONAL MATCH path2 = (root)-[:EVOLVES_INTO*1..{max_depth}]->(descendant:Generation)
        RETURN root,
               ancestor_paths,
               collect(path2) AS descendant_paths
        """.replace("{max_depth}", str(max_depth))

        async with self._get_driver().session(database=settings.NEO4J_DATABASE) as session:
            result = await session.run(query, generation_id=generation_id)
            record = await result.single()
            if not record:
                return {"generation_id": generation_id, "ancestors": [], "descendants": []}

            ancestors = []
            for path in record["ancestor_paths"] or []:
                if path:
                    nodes = [dict(n) for n in path.nodes]
                    rels = [{"type": r.type, **dict(r)} for r in path.relationships]
                    ancestors.append({"nodes": nodes, "relationships": rels})

            descendants = []
            for path in record["descendant_paths"] or []:
                if path:
                    nodes = [dict(n) for n in path.nodes]
                    rels = [{"type": r.type, **dict(r)} for r in path.relationships]
                    descendants.append({"nodes": nodes, "relationships": rels})

            return {
                "generation": dict(record["root"]),
                "ancestors": ancestors,
                "descendants": descendants,
            }

    async def get_brand_dna_graph(self, brand_id: int) -> dict[str, Any]:
        """Return the full design lineage for a brand."""
        query = """
        MATCH (b:Brand {brand_id: $brand_id})-[:HAS_MODEL]->(m:Model)-[:HAS_GENERATION]->(g:Generation)
        OPTIONAL MATCH (g)-[r:EVOLVES_INTO|INFLUENCED_BY]->(g2:Generation)
        RETURN b, collect(DISTINCT m) AS models,
               collect(DISTINCT g) AS generations,
               collect(DISTINCT {from: g.generation_id, to: g2.generation_id, type: type(r), props: properties(r)}) AS edges
        """
        async with self._get_driver().session(database=settings.NEO4J_DATABASE) as session:
            result = await session.run(query, brand_id=brand_id)
            record = await result.single()
            if not record:
                return {"brand_id": brand_id, "models": [], "generations": [], "edges": []}

            return {
                "brand": dict(record["b"]),
                "models": [dict(m) for m in record["models"]],
                "generations": [dict(g) for g in record["generations"]],
                "edges": [e for e in record["edges"] if e["to"] is not None],
            }

    async def find_cross_brand_connections(self, brand_id: int) -> list[dict[str, Any]]:
        """Find influence edges coming from other brands."""
        query = """
        MATCH (b:Brand {brand_id: $brand_id})-[:HAS_MODEL]->(m:Model)-[:HAS_GENERATION]->(g:Generation)
        MATCH (g2:Generation)-[r:INFLUENCED_BY]->(g)
        MATCH (m2:Model)-[:HAS_GENERATION]->(g2)
        MATCH (b2:Brand)-[:HAS_MODEL]->(m2)
        WHERE b2.brand_id <> $brand_id
        RETURN b2, m2, g2, r, g
        ORDER BY r.strength DESC
        LIMIT 50
        """
        async with self._get_driver().session(database=settings.NEO4J_DATABASE) as session:
            result = await session.run(query, brand_id=brand_id)
            records = await result.data()
            return [
                {
                    "influencing_brand": dict(r["b2"]),
                    "influencing_model": dict(r["m2"]),
                    "influencing_generation": dict(r["g2"]),
                    "influenced_generation": dict(r["g"]),
                    "strength": dict(r["r"])["strength"],
                }
                for r in records
            ]

    async def get_evolution_path(
        self, from_generation_id: int, to_generation_id: int
    ) -> list[dict[str, Any]]:
        """Shortest path between two generations via EVOLVES_INTO edges."""
        query = """
        MATCH (a:Generation {generation_id: $from_id}),
              (b:Generation {generation_id: $to_id}),
              path = shortestPath((a)-[:EVOLVES_INTO*]->(b))
        RETURN path
        """
        async with self._get_driver().session(database=settings.NEO4J_DATABASE) as session:
            result = await session.run(
                query, from_id=from_generation_id, to_id=to_generation_id
            )
            record = await result.single()
            if not record:
                return []
            path = record["path"]
            steps = []
            for i, node in enumerate(path.nodes):
                step: dict[str, Any] = {"generation": dict(node)}
                if i < len(path.relationships):
                    rel = path.relationships[i]
                    step["edge"] = {"type": rel.type, **dict(rel)}
                steps.append(step)
            return steps

    async def get_concept_influence_tree(
        self, concept_id: int, max_depth: int = 5
    ) -> dict[str, Any]:
        """Traverse influence edges starting from a concept generation."""
        query = (
            "MATCH (c:Generation {generation_id: $concept_id}) "
            "OPTIONAL MATCH tree = (c)-[:INFLUENCED_BY*1.."
            + str(max_depth)
            + "]->(influenced:Generation) "
            "RETURN c, collect(tree) AS influence_paths"
        )
        async with self._get_driver().session(database=settings.NEO4J_DATABASE) as session:
            result = await session.run(query, concept_id=concept_id)
            record = await result.single()
            if not record:
                return {"concept_id": concept_id, "influences": []}

            influences = []
            for path in record["influence_paths"] or []:
                if path:
                    nodes = [dict(n) for n in path.nodes]
                    rels = [{"type": r.type, **dict(r)} for r in path.relationships]
                    influences.append({"nodes": nodes, "relationships": rels})

            return {
                "concept": dict(record["c"]),
                "influences": influences,
            }

    async def run_raw(
        self, query: str, parameters: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        """Execute a raw Cypher query and return records as dicts."""
        async with self._get_driver().session(database=settings.NEO4J_DATABASE) as session:
            result = await session.run(query, parameters or {})
            return await result.data()


# Module-level singleton — initialised in app lifespan
neo4j_graph = Neo4jGraph()
