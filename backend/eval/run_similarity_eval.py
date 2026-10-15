"""
Diagnostic eval for visual-similarity search.

This is a human-read diagnostic, not a CI gate: there's no historical
baseline yet to gate a pass/fail threshold against, and the underlying
dataset (crawled + embedded generations) may simply be too sparse for some
pairs to resolve. Read the printed table; don't wire this into CI as a hard
check until the dataset is dense enough that a "skipped" result would be
surprising rather than expected.

Usage:
    python eval/run_similarity_eval.py [--pairs eval/similarity_pairs.json]
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.postgresql.database import async_session_factory  # noqa: E402
from app.db.redis.cache import RedisCache  # noqa: E402
from app.services.search.vector_search import VectorSearchService  # noqa: E402


@dataclass
class PairResult:
    car_a: str
    car_b: str
    expected: str
    reason: str
    status: str  # "pass" | "fail" | "skipped"
    detail: str
    score: float | None = None


RESOLVE_SQL = text(
    """
    SELECT
        g.id AS generation_id,
        g.model_id,
        g.visual_embedding IS NOT NULL AS has_embedding,
        greatest(
            similarity(b.name, :query),
            similarity(m.name, :query),
            coalesce(similarity(g.code_name, :query), 0)
        ) AS match_score
    FROM generations g
    JOIN car_models m ON m.id = g.model_id
    JOIN brands b ON b.id = m.brand_id
    WHERE b.name % :query OR m.name % :query
       OR to_tsvector('english', b.name || ' ' || m.name || ' ' || coalesce(g.code_name, ''))
          @@ plainto_tsquery('english', :query)
    ORDER BY match_score DESC
    LIMIT 1
    """
)

PAIR_SCORE_SQL = text(
    """
    SELECT 1 - (g1.visual_embedding <=> g2.visual_embedding) AS score
    FROM generations g1, generations g2
    WHERE g1.id = :id_a AND g2.id = :id_b
    """
)


async def resolve_car(db, name: str) -> dict | None:
    """Fuzzy-resolve a free-text car name to a generation row."""
    result = await db.execute(RESOLVE_SQL, {"query": name})
    row = result.mappings().first()
    return dict(row) if row else None


async def evaluate_pair(
    db, search: VectorSearchService, pair: dict, top_k: int, dissimilar_ceiling: float
) -> PairResult:
    car_a, car_b, expected, reason = pair["car_a"], pair["car_b"], pair["expected"], pair["reason"]

    ra = await resolve_car(db, car_a)
    rb = await resolve_car(db, car_b)

    if ra is None:
        return PairResult(car_a, car_b, expected, reason, "skipped", f"could not resolve '{car_a}' to any generation")
    if rb is None:
        return PairResult(car_a, car_b, expected, reason, "skipped", f"could not resolve '{car_b}' to any generation")
    if not ra["has_embedding"] or not rb["has_embedding"]:
        missing = car_a if not ra["has_embedding"] else car_b
        return PairResult(car_a, car_b, expected, reason, "skipped", f"no visual_embedding for '{missing}' (generation_id={ra['generation_id'] if missing == car_a else rb['generation_id']})")

    score_row = (await db.execute(PAIR_SCORE_SQL, {"id_a": ra["generation_id"], "id_b": rb["generation_id"]})).mappings().first()
    pair_score = round(float(score_row["score"]), 4) if score_row else None

    if expected == "similar":
        top_matches = await search.get_similar_generations(ra["generation_id"], limit=top_k)
        found = any(m["generation_id"] == rb["generation_id"] for m in top_matches)
        status = "pass" if found else "fail"
        detail = (
            f"'{car_b}' {'found' if found else 'NOT found'} in top-{top_k} of '{car_a}' "
            f"(pairwise cosine score={pair_score})"
        )
    else:  # dissimilar
        below_ceiling = pair_score is not None and pair_score <= dissimilar_ceiling
        status = "pass" if below_ceiling else "fail"
        detail = f"pairwise cosine score={pair_score} (ceiling={dissimilar_ceiling})"

    return PairResult(car_a, car_b, expected, reason, status, detail, pair_score)


async def main(pairs_path: Path) -> None:
    spec = json.loads(pairs_path.read_text(encoding="utf-8"))
    top_k = spec.get("top_k", 10)
    dissimilar_ceiling = spec.get("dissimilar_score_ceiling", 0.55)
    pairs = spec["pairs"]

    redis = RedisCache()  # not connected — get_similar_generations doesn't touch Redis

    results: list[PairResult] = []
    async with async_session_factory() as db:
        search = VectorSearchService(db=db, redis=redis)
        for pair in pairs:
            try:
                res = await evaluate_pair(db, search, pair, top_k, dissimilar_ceiling)
            except Exception as exc:  # surfaces a bad pair without killing the whole run
                res = PairResult(pair["car_a"], pair["car_b"], pair["expected"], pair["reason"], "skipped", f"error: {exc}")
            results.append(res)

    _print_report(results)


def _print_report(results: list[PairResult]) -> None:
    passed = sum(1 for r in results if r.status == "pass")
    failed = sum(1 for r in results if r.status == "fail")
    skipped = sum(1 for r in results if r.status == "skipped")

    print(f"\n{'STATUS':<8} {'EXPECTED':<11} {'CAR A':<28} {'CAR B':<28} DETAIL")
    print("-" * 130)
    for r in results:
        marker = {"pass": "PASS", "fail": "FAIL", "skipped": "SKIP"}[r.status]
        print(f"{marker:<8} {r.expected:<11} {r.car_a:<28} {r.car_b:<28} {r.detail}")

    print("-" * 130)
    print(f"Total: {len(results)}  |  Pass: {passed}  |  Fail: {failed}  |  Skipped: {skipped}")
    if skipped:
        print(
            f"\n{skipped} pair(s) skipped - this means the dataset doesn't have "
            "resolvable/embedded generations for them yet, NOT that similarity "
            "search is broken. Re-run once those cars are crawled and embedded."
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--pairs",
        type=Path,
        default=Path(__file__).parent / "similarity_pairs.json",
        help="Path to the similarity_pairs.json file",
    )
    args = parser.parse_args()
    asyncio.run(main(args.pairs))
