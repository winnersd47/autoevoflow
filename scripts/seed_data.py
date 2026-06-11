#!/usr/bin/env python3
"""
Seed script for automotive-ai-platform.

Creates brands, models, generations, evolution edges in Neo4j,
and sample AI analysis records in PostgreSQL.

Usage:
    python scripts/seed_data.py --all
    python scripts/seed_data.py --brands --models
    python scripts/seed_data.py --neo4j
    python scripts/seed_data.py --brands --models --neo4j --analyses
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
import sys
from dataclasses import dataclass, field
from typing import Any

# ---------------------------------------------------------------------------
# Path setup – allow running from repo root
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from neo4j import AsyncGraphDatabase

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("seed")

# ---------------------------------------------------------------------------
# Configuration from environment
# ---------------------------------------------------------------------------
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://automotive_user:dev_password@localhost:5432/automotive_ai",
)
NEO4J_URI      = os.getenv("NEO4J_URI",      "bolt://localhost:7687")
NEO4J_USER     = os.getenv("NEO4J_USER",     "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "dev_password")


# ---------------------------------------------------------------------------
# Seed data definitions
# ---------------------------------------------------------------------------

@dataclass
class GenerationSeed:
    code_name:   str
    year_start:  int
    year_end:    int | None
    design_lang: str = ""
    designer:    str = ""


@dataclass
class ModelSeed:
    name:        str
    body_type:   str
    segment:     str
    generations: list[GenerationSeed] = field(default_factory=list)


@dataclass
class BrandSeed:
    name:         str
    country:      str
    founded_year: int
    models:       list[ModelSeed] = field(default_factory=list)


BRANDS: list[BrandSeed] = [
    BrandSeed(
        name="BMW", country="Germany", founded_year=1916,
        models=[
            ModelSeed(name="3-Series", body_type="sedan", segment="D", generations=[
                GenerationSeed("E21", 1975, 1983, "Classic Hofmeister kink",   "Paul Bracq"),
                GenerationSeed("E30", 1982, 1994, "Classic BMW proportions",   "Claus Luthe"),
                GenerationSeed("E36", 1990, 2000, "Aerodynamic refinement",    "Erik Goplen"),
                GenerationSeed("E46", 1997, 2006, "Flame Surfacing preview",   "Erik Goplen"),
                GenerationSeed("E90", 2005, 2013, "Flame Surfacing",           "Chris Bangle"),
                GenerationSeed("F30", 2011, 2019, "EfficientDynamics design",  "Karim Habib"),
                GenerationSeed("G20", 2018, None, "Sensual Purity",            "Domagoj Dukec"),
            ]),
            ModelSeed(name="5-Series", body_type="sedan", segment="E", generations=[
                GenerationSeed("E28", 1981, 1988, "Classic BMW",    "Claus Luthe"),
                GenerationSeed("E34", 1988, 1996, "Refined classic","Claus Luthe"),
                GenerationSeed("E39", 1995, 2003, "Modern classic", "Chris Bangle"),
                GenerationSeed("E60", 2003, 2010, "Flame Surfacing","Chris Bangle"),
                GenerationSeed("F10", 2009, 2017, "Sensual Purity", "Karim Habib"),
            ]),
        ],
    ),
    BrandSeed(
        name="Audi", country="Germany", founded_year=1909,
        models=[
            ModelSeed(name="A4", body_type="sedan", segment="D", generations=[
                GenerationSeed("B5", 1994, 2001, "Angular Bauhaus",          "Hartmut Warkuss"),
                GenerationSeed("B6", 2000, 2006, "Sleeker refinement",       "Walter de'Silva"),
                GenerationSeed("B7", 2004, 2008, "Facelift – single frame",  "Walter de'Silva"),
                GenerationSeed("B8", 2007, 2016, "Single frame grille era",  "Stefan Sielaff"),
                GenerationSeed("B9", 2015, 2023, "Virtual cockpit generation","Marc Lichte"),
            ]),
            ModelSeed(name="R8", body_type="coupe", segment="supercar", generations=[
                GenerationSeed("Gen1", 2006, 2015, "Sideblades design language", "Walter de'Silva"),
                GenerationSeed("Gen2", 2015, 2023, "Angular evolution",         "Marc Lichte"),
            ]),
        ],
    ),
    BrandSeed(
        name="Mercedes-Benz", country="Germany", founded_year=1926,
        models=[
            ModelSeed(name="C-Class", body_type="sedan", segment="D", generations=[
                GenerationSeed("W202", 1993, 2000, "Sensual compact", "Bruno Sacco"),
                GenerationSeed("W203", 2000, 2007, "Refined elegance", "Peter Pfeiffer"),
                GenerationSeed("W204", 2007, 2014, "Sportier stance", "Peter Pfeiffer"),
                GenerationSeed("W205", 2014, 2021, "Luxury trickle-down", "Gorden Wagener"),
                GenerationSeed("W206", 2021, None, "Sensual Purity EQ era", "Gorden Wagener"),
            ]),
            ModelSeed(name="SL", body_type="convertible", segment="F", generations=[
                GenerationSeed("R107", 1971, 1989, "Classic roadster", "Paul Bracq"),
                GenerationSeed("R129", 1989, 2002, "Modern roadster", "Bruno Sacco"),
                GenerationSeed("R230", 2001, 2012, "Tech-laden refresh", "Peter Pfeiffer"),
                GenerationSeed("R231", 2012, 2022, "AMG-influenced", "Gorden Wagener"),
            ]),
        ],
    ),
    BrandSeed(
        name="Porsche", country="Germany", founded_year=1948,
        models=[
            ModelSeed(name="911", body_type="coupe", segment="supercar", generations=[
                GenerationSeed("901/0", 1963, 1973, "Original Butzi design",     "Ferdinand Alexander Porsche"),
                GenerationSeed("930",   1974, 1989, "Widened arches, whale tail","Anatole Lapine"),
                GenerationSeed("964",   1989, 1994, "Integrated bumpers",        "Harm Lagaay"),
                GenerationSeed("993",   1993, 1998, "Last air-cooled",           "Harm Lagaay"),
                GenerationSeed("996",   1997, 2005, "Water-cooled era",          "Pinky Lai"),
                GenerationSeed("997",   2004, 2012, "Return to round headlights","Michael Mauer"),
                GenerationSeed("991",   2011, 2019, "Stretched wheelbase",       "Michael Mauer"),
                GenerationSeed("992",   2018, None, "Digital flush surfaces",    "Michael Mauer"),
            ]),
        ],
    ),
    BrandSeed(
        name="Ferrari", country="Italy", founded_year=1939,
        models=[
            ModelSeed(name="Testarossa", body_type="coupe", segment="supercar", generations=[
                GenerationSeed("TR",  1984, 1991, "Side strakes, Pininfarina", "Pininfarina"),
                GenerationSeed("512", 1991, 1996, "Evolutionary update",       "Pininfarina"),
            ]),
            ModelSeed(name="488", body_type="coupe", segment="supercar", generations=[
                GenerationSeed("458 Italia", 2009, 2015, "Aerodynamic beauty",  "Pininfarina"),
                GenerationSeed("488 GTB",    2015, 2019, "Functional aero",     "Ferrari Styling"),
                GenerationSeed("F8 Tributo", 2019, 2023, "Heritage homage",     "Ferrari Styling"),
            ]),
        ],
    ),
    BrandSeed(
        name="Lamborghini", country="Italy", founded_year=1963,
        models=[
            ModelSeed(name="Countach", body_type="coupe", segment="hypercar", generations=[
                GenerationSeed("LP400",   1974, 1978, "Marcello Gandini original", "Marcello Gandini"),
                GenerationSeed("LP400S",  1978, 1982, "Wider arches",             "Marcello Gandini"),
                GenerationSeed("LP500S",  1982, 1985, "NACA duct hood",           "Marcello Gandini"),
                GenerationSeed("LPI 800", 2021, None, "50th anniversary revival", "Mitja Borkert"),
            ]),
        ],
    ),
    BrandSeed(
        name="Toyota", country="Japan", founded_year=1937,
        models=[
            ModelSeed(name="Supra", body_type="coupe", segment="sports", generations=[
                GenerationSeed("A40", 1978, 1981, "Japan GT classic",          "Toyota Design"),
                GenerationSeed("A60", 1981, 1986, "Wedge aerodynamic",         "Toyota Design"),
                GenerationSeed("A70", 1986, 1993, "Turbo performance look",    "Toyota Design"),
                GenerationSeed("A80", 1993, 2002, "Pop-up headlights, iconic", "Toyota Design"),
                GenerationSeed("A90", 2019, None, "BMW Z4 co-dev revival",     "Toyota / BMW"),
            ]),
        ],
    ),
    BrandSeed(
        name="Honda", country="Japan", founded_year=1948,
        models=[
            ModelSeed(name="NSX", body_type="coupe", segment="supercar", generations=[
                GenerationSeed("NA1", 1990, 2005, "Aluminum monocoque pioneer",  "Ken Okuyama"),
                GenerationSeed("NC1", 2016, 2022, "Hybrid supercar SH-AWD",      "Honda R&D"),
            ]),
            ModelSeed(name="Civic", body_type="sedan", segment="C", generations=[
                GenerationSeed("Gen6",  1995, 2000, "Egg-shaped design",         "Honda Design"),
                GenerationSeed("Gen7",  2001, 2005, "Two-tier instrument panel",  "Honda Design"),
                GenerationSeed("Gen8",  2005, 2011, "Sporty evolution",           "Honda Design"),
                GenerationSeed("Gen10", 2015, 2021, "Aggressive fastback",        "Honda Design"),
            ]),
        ],
    ),
    BrandSeed(
        name="Ford", country="USA", founded_year=1903,
        models=[
            ModelSeed(name="Mustang", body_type="coupe", segment="pony", generations=[
                GenerationSeed("Gen1",   1964, 1973, "Original pony car",         "Joe Oros"),
                GenerationSeed("Fox",    1979, 1993, "Fox platform",              "Jack Telnack"),
                GenerationSeed("SN95",   1994, 2004, "New Edge design",           "Bud Magaldi"),
                GenerationSeed("S197",   2004, 2014, "Retro-modern revival",      "Sid Ramnarace"),
                GenerationSeed("S550",   2015, 2023, "Global fastback",           "Melvin Betancourt"),
                GenerationSeed("S650",   2023, None, "Dark Horse / electric era", "Ford Design"),
            ]),
        ],
    ),
    BrandSeed(
        name="Tesla", country="USA", founded_year=2003,
        models=[
            ModelSeed(name="Model S", body_type="sedan", segment="E", generations=[
                GenerationSeed("Gen1",    2012, 2021, "Falcon Wing fastback",   "Franz von Holzhausen"),
                GenerationSeed("Plaid",   2021, None, "Refreshed interior yoke","Franz von Holzhausen"),
            ]),
            ModelSeed(name="Model 3", body_type="sedan", segment="D", generations=[
                GenerationSeed("Gen1",       2017, 2023, "Minimalist interior",       "Franz von Holzhausen"),
                GenerationSeed("Highland",   2023, None, "Highland facelift",          "Franz von Holzhausen"),
            ]),
        ],
    ),
]


# ---------------------------------------------------------------------------
# PostgreSQL helpers
# ---------------------------------------------------------------------------

async def create_engine() -> Any:
    engine = create_async_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        echo=False,
    )
    return engine


async def seed_brands_postgres(session: AsyncSession) -> dict[str, int]:
    """Insert brands, return {name: id} mapping."""
    brand_ids: dict[str, int] = {}
    for b in BRANDS:
        result = await session.execute(
            text("""
                INSERT INTO brands (name, name_slug, country, founded_year)
                VALUES (:name, :slug, :country, :founded_year)
                ON CONFLICT (name) DO UPDATE
                    SET country = EXCLUDED.country,
                        founded_year = EXCLUDED.founded_year,
                        updated_at = NOW()
                RETURNING id
            """),
            {
                "name":         b.name,
                "slug":         b.name.lower().replace(" ", "-").replace("-benz", ""),
                "country":      b.country,
                "founded_year": b.founded_year,
            },
        )
        row = result.fetchone()
        brand_ids[b.name] = row[0]
        logger.info("  Brand: %s (id=%d)", b.name, row[0])
    await session.commit()
    return brand_ids


async def seed_models_postgres(
    session: AsyncSession,
    brand_ids: dict[str, int],
) -> dict[tuple[str, str], int]:
    """Insert models, return {(brand_name, model_name): id} mapping."""
    model_ids: dict[tuple[str, str], int] = {}
    for b in BRANDS:
        brand_id = brand_ids[b.name]
        for m in b.models:
            result = await session.execute(
                text("""
                    INSERT INTO car_models (brand_id, name, name_slug, body_type, segment)
                    VALUES (:brand_id, :name, :slug, :body_type::body_type, :segment)
                    ON CONFLICT (brand_id, name_slug) DO UPDATE
                        SET body_type = EXCLUDED.body_type,
                            segment   = EXCLUDED.segment,
                            updated_at = NOW()
                    RETURNING id
                """),
                {
                    "brand_id":  brand_id,
                    "name":      m.name,
                    "slug":      m.name.lower().replace(" ", "-"),
                    "body_type": m.body_type if m.body_type in (
                        "sedan","coupe","hatchback","wagon","suv","crossover",
                        "convertible","pickup","van","minivan",
                        "hypercar","supercar","concept","other"
                    ) else "other",
                    "segment":   m.segment,
                },
            )
            row = result.fetchone()
            model_ids[(b.name, m.name)] = row[0]
            logger.info("    Model: %s / %s (id=%d)", b.name, m.name, row[0])
    await session.commit()
    return model_ids


async def seed_generations_postgres(
    session: AsyncSession,
    model_ids: dict[tuple[str, str], int],
) -> dict[str, int]:
    """Insert generations, return {uuid: id}."""
    gen_ids: dict[str, int] = {}
    for b in BRANDS:
        for m in b.models:
            model_id = model_ids[(b.name, m.name)]
            for g in m.generations:
                slug = f"{b.name.lower()}-{m.name.lower()}-{g.code_name.lower()}".replace(" ", "-")
                result = await session.execute(
                    text("""
                        INSERT INTO generations (
                            model_id, code_name, name,
                            year_start, year_end,
                            design_language, designer_name
                        )
                        VALUES (
                            :model_id, :code_name, :name,
                            :year_start, :year_end,
                            :design_lang, :designer
                        )
                        ON CONFLICT DO NOTHING
                        RETURNING id, uuid
                    """),
                    {
                        "model_id":   model_id,
                        "code_name":  g.code_name,
                        "name":       f"{b.name} {m.name} {g.code_name}",
                        "year_start": g.year_start,
                        "year_end":   g.year_end,
                        "design_lang": g.design_lang,
                        "designer":   g.designer,
                    },
                )
                row = result.fetchone()
                if row:
                    gen_ids[slug] = row[0]
                    logger.info(
                        "      Generation: %s %s %s (id=%d)",
                        b.name, m.name, g.code_name, row[0],
                    )
    await session.commit()
    return gen_ids


async def seed_analyses_postgres(
    session: AsyncSession,
    gen_ids: dict[str, int],
) -> None:
    """Insert sample AI analysis records for a subset of generations."""
    sample_analyses = [
        {
            "slug":       "bmw-3-series-g20",
            "type":       "design_dna",
            "model":      "gpt-4o",
            "narrative":  (
                "The G20 3-Series (2018–) represents the apex of BMW's Sensual Purity design "
                "language. The Hofmeister kink, a BMW trademark since 1961, has been refined "
                "to a subtle crease rather than a graphic element. The kidney grille, while "
                "enlarged, maintains its vertical orientation differentiating it from competitors. "
                "Design DNA continuity score vs E90: 0.82; vs E21 (first ancestor): 0.44."
            ),
            "result": {
                "continuity_score": 0.82,
                "dna_vectors": {"grille_aspect": 0.91, "roofline": 0.87, "greenhouse": 0.79},
                "style_period": "2010s-2020s",
            },
        },
        {
            "slug":       "porsche-911-992",
            "type":       "evolution_trace",
            "model":      "claude-3-5-sonnet-20241022",
            "narrative":  (
                "The 992-generation 911 (2018–) achieves a remarkable 0.88 similarity score "
                "with its predecessor 991, the highest in the model's 60-year history. "
                "Evolutionary pressure: the brand's philosophy of recognizable silhouette "
                "continuity constrains radical change. Key deltas: full-width LED tail strip, "
                "flush door handles, electrically retractable rear spoiler integration. "
                "Ancestry depth: 7 traceable generations. Cross-brand DNA: influenced Audi TT "
                "rounded philosophy in the 2000s."
            ),
            "result": {
                "evolution_depth": 7,
                "avg_generation_similarity": 0.79,
                "design_innovation_index": 0.21,
            },
        },
    ]

    for a in sample_analyses:
        slug = a["slug"]
        # Find a matching generation_id by partial slug match
        gen_id = next(
            (v for k, v in gen_ids.items() if slug in k),
            None,
        )
        if gen_id is None:
            logger.warning("Generation not found for slug: %s – skipping analysis", slug)
            continue

        await session.execute(
            text("""
                INSERT INTO ai_analyses (
                    generation_id, analysis_type, model_used,
                    narrative, result, confidence
                )
                VALUES (
                    :gen_id, :atype::analysis_type, :model,
                    :narrative, :result::jsonb, :confidence
                )
                ON CONFLICT (generation_id, analysis_type, model_used) DO NOTHING
            """),
            {
                "gen_id":     gen_id,
                "atype":      a["type"],
                "model":      a["model"],
                "narrative":  a["narrative"],
                "result":     str(a["result"]).replace("'", '"'),
                "confidence": 0.88,
            },
        )
        logger.info("  Analysis: %s / %s", slug, a["type"])
    await session.commit()


# ---------------------------------------------------------------------------
# Neo4j helpers
# ---------------------------------------------------------------------------

async def seed_neo4j(brand_ids: dict[str, int]) -> None:
    """Create brand + generation nodes and evolution edges in Neo4j."""
    driver = AsyncGraphDatabase.driver(
        NEO4J_URI,
        auth=(NEO4J_USER, NEO4J_PASSWORD),
    )

    async with driver.session() as session:
        for b in BRANDS:
            b_id = brand_ids.get(b.name, 0)
            # Upsert brand
            await session.run(
                """
                MERGE (brand:Brand {name: $name})
                SET brand.id           = $id,
                    brand.country      = $country,
                    brand.founded_year = $fy
                """,
                name=b.name, id=b_id, country=b.country, fy=b.founded_year,
            )

            for m in b.models:
                await session.run(
                    """
                    MERGE (model:Model {name: $mname, brand: $bname})
                    SET model.body_type = $body, model.segment = $segment
                    WITH model
                    MATCH (brand:Brand {name: $bname})
                    MERGE (brand)-[:MAKES]->(model)
                    """,
                    mname=m.name, bname=b.name,
                    body=m.body_type, segment=m.segment,
                )

                prev_code: str | None = None
                for i, g in enumerate(m.generations):
                    full_name = f"{b.name} {m.name} {g.code_name}"
                    await session.run(
                        """
                        MERGE (gen:Generation {
                            code_name: $code,
                            brand: $bname,
                            model: $mname
                        })
                        SET gen.name         = $name,
                            gen.year_start   = $ys,
                            gen.year_end     = $ye,
                            gen.design_lang  = $dl,
                            gen.designer     = $designer
                        WITH gen
                        MATCH (model:Model {name: $mname, brand: $bname})
                        MERGE (model)-[:HAS_GENERATION]->(gen)
                        """,
                        code=g.code_name, bname=b.name, mname=m.name,
                        name=full_name, ys=g.year_start, ye=g.year_end,
                        dl=g.design_lang, designer=g.designer,
                    )

                    if prev_code is not None and i > 0:
                        # Compute a naive similarity score based on year proximity
                        prev_g = m.generations[i - 1]
                        year_delta = g.year_start - prev_g.year_start
                        similarity = max(0.65, min(0.95, 1.0 - (year_delta * 0.01)))
                        await session.run(
                            """
                            MATCH (prev:Generation {code_name: $prev_code, brand: $bname, model: $mname})
                            MATCH (curr:Generation {code_name: $curr_code, brand: $bname, model: $mname})
                            MERGE (prev)-[r:EVOLVES_INTO {brand: $bname, model: $mname}]->(curr)
                            SET r.similarity_score = $sim,
                                r.year_delta       = $delta,
                                r.confidence       = 0.90
                            """,
                            prev_code=prev_code,
                            curr_code=g.code_name,
                            bname=b.name,
                            mname=m.name,
                            sim=round(similarity, 2),
                            delta=year_delta,
                        )

                    prev_code = g.code_name

            logger.info("  Neo4j: seeded brand %s", b.name)

    await driver.close()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def main(args: argparse.Namespace) -> None:
    run_brands    = args.all or args.brands
    run_models    = args.all or args.models
    run_neo4j     = args.all or args.neo4j
    run_analyses  = args.all or args.analyses

    engine = await create_engine()
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    brand_ids:  dict[str, int]                = {}
    model_ids:  dict[tuple[str, str], int]    = {}
    gen_ids:    dict[str, int]                = {}

    async with async_session() as session:
        if run_brands:
            logger.info("Seeding brands (PostgreSQL)...")
            brand_ids = await seed_brands_postgres(session)

        if run_models and brand_ids:
            logger.info("Seeding models (PostgreSQL)...")
            model_ids = await seed_models_postgres(session, brand_ids)

            logger.info("Seeding generations (PostgreSQL)...")
            gen_ids = await seed_generations_postgres(session, model_ids)

        if run_analyses and gen_ids:
            logger.info("Seeding AI analyses (PostgreSQL)...")
            await seed_analyses_postgres(session, gen_ids)

    if run_neo4j and brand_ids:
        logger.info("Seeding Neo4j graph...")
        await seed_neo4j(brand_ids)

    await engine.dispose()
    logger.info("Seed complete.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed the automotive-ai-platform databases.",
    )
    parser.add_argument("--all",      action="store_true", help="Run all seed steps")
    parser.add_argument("--brands",   action="store_true", help="Seed brands (PG)")
    parser.add_argument("--models",   action="store_true", help="Seed models + generations (PG)")
    parser.add_argument("--neo4j",    action="store_true", help="Seed Neo4j graph")
    parser.add_argument("--analyses", action="store_true", help="Seed AI analyses (PG)")
    return parser.parse_args()


if __name__ == "__main__":
    asyncio.run(main(parse_args()))
