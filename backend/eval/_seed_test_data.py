"""
One-off: seed a small amount of realistic test data (a few real brands/
models/generations, with real-ish descriptions but SYNTHETIC normalized
embeddings — no GPU/CLIP run needed) so the pgvector paths, the eval script,
and the AI analysis endpoints can be exercised end-to-end against real rows
instead of an empty DB. This is data content, not a crawler or a schema
change — deleted after use.

NOTE: the live `generations.visual_embedding` column is currently `text`,
not pgvector's `vector` type (the vector extension isn't installed on this
native Postgres — see the pgvector-install thread). Embeddings are stored
as JSON-encoded text here to match what's actually deployed; once pgvector
is installed and the column is migrated to `vector`, re-run this with the
CAST(:v AS vector) version instead.
"""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

import numpy as np
from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.postgresql.database import async_session_factory  # noqa: E402


def _rand_vec(dim: int, seed: int) -> list[float]:
    rng = np.random.default_rng(seed)
    v = rng.normal(size=dim).astype(np.float32)
    v = v / np.linalg.norm(v)
    return v.tolist()


def _nudged_vec(base: list[float], amount: float, seed: int) -> list[float]:
    """A vector close to `base` (for a deliberately 'similar' pair)."""
    rng = np.random.default_rng(seed)
    v = np.array(base, dtype=np.float32) + rng.normal(scale=amount, size=len(base)).astype(np.float32)
    v = v / np.linalg.norm(v)
    return v.tolist()


ROWS = [
    # (brand, model, code_name, year_start, year_end, description)
    ("Porsche", "911", "992", 2019, None, "Eighth-generation 911, evolutionary styling over the 991 with wider hips and a full-width LED taillight bar."),
    ("Porsche", "911", "991", 2011, 2019, "Seventh-generation 911, first with electric power steering, larger than the 997 it replaced."),
    ("Porsche", "718 Cayman", "982", 2016, None, "Turbocharged flat-four replaces the previous naturally aspirated flat-six, shares the 911's electric steering."),
    ("Lamborghini", "Urus", "Type 1", 2018, None, "Super-SUV on the MLB Evo platform, shares its underpinnings with the Porsche Cayenne and Bentley Bentayga."),
    ("Bentley", "Bentayga", "1", 2015, None, "Luxury SUV on the MLB Evo platform, shares its underpinnings with the Porsche Cayenne and Lamborghini Urus."),
    ("BMW", "Z4", "G29", 2018, None, "Roadster co-developed with Toyota, sharing its platform and powertrains with the A90 Supra."),
    ("Toyota", "Supra", "A90", 2019, None, "Sports coupe co-developed with BMW on a shared platform with the Z4 G29 roadster."),
    ("Toyota", "Prius", "XW30", 2009, 2015, "Third-generation hybrid hatchback, front-wheel drive, focused on fuel efficiency rather than performance."),
]


async def main() -> None:
    async with async_session_factory() as db:
        brand_ids: dict[str, int] = {}
        for name in {r[0] for r in ROWS}:
            row = (await db.execute(text("SELECT id FROM brands WHERE name = :n"), {"n": name})).first()
            if row:
                brand_ids[name] = row[0]
                continue
            slug = name.lower().replace(" ", "-")
            row = (
                await db.execute(
                    text("INSERT INTO brands (name, slug) VALUES (:n, :s) RETURNING id"),
                    {"n": name, "s": slug},
                )
            ).first()
            brand_ids[name] = row[0]

        # Two hand-linked base vectors so the "similar" pairs actually score high
        cayenne_base = _rand_vec(1536, seed=1)
        z4_base = _rand_vec(1536, seed=2)

        model_ids: dict[tuple[str, str], int] = {}
        for brand, model, code_name, year_start, year_end, desc in ROWS:
            key = (brand, model)
            if key not in model_ids:
                slug = f"{brand.lower().replace(' ', '-')}-{model.lower().replace(' ', '-')}"
                row = (await db.execute(text("SELECT id FROM car_models WHERE slug = :s"), {"s": slug})).first()
                if row:
                    model_ids[key] = row[0]
                else:
                    row = (
                        await db.execute(
                            text(
                                "INSERT INTO car_models (brand_id, name, slug, body_type) "
                                "VALUES (:b, :n, :s, 'suv') RETURNING id"
                            ),
                            {"b": brand_ids[brand], "n": model, "s": slug},
                        )
                    ).first()
                    model_ids[key] = row[0]

            if model in ("Urus", "Bentayga"):
                vec = _nudged_vec(cayenne_base, 0.15, seed=hash(code_name) % 1000)
            elif model in ("Z4", "Supra"):
                vec = _nudged_vec(z4_base, 0.1, seed=hash(code_name) % 1000)
            else:
                vec = _rand_vec(1536, seed=hash(code_name) % 1000)

            exists = (
                await db.execute(
                    text("SELECT id FROM generations WHERE model_id = :m AND code_name = :c"),
                    {"m": model_ids[key], "c": code_name},
                )
            ).first()
            if exists:
                continue
            await db.execute(
                text(
                    "INSERT INTO generations (model_id, code_name, year_start, year_end, description, visual_embedding) "
                    "VALUES (:m, :c, :ys, :ye, :d, :v)"
                ),
                {"m": model_ids[key], "c": code_name, "ys": year_start, "ye": year_end, "d": desc, "v": json.dumps(vec)},
            )

        await db.commit()

    async with async_session_factory() as db:
        counts = {}
        for tbl in ("brands", "car_models", "generations"):
            counts[tbl] = (await db.execute(text(f"SELECT COUNT(*) FROM {tbl}"))).scalar()
        print("Seeded. Row counts:", counts)


if __name__ == "__main__":
    asyncio.run(main())
