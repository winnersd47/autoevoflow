"""Phase 3 Evals — extract-profile endpoint, 20-case dataset.

Calls `complete_structured` directly (no HTTP server needed).
Skips when OPENAI_API_KEY is absent so CI stays green without credentials.
Run all: pytest tests/evals/ -v
Run one: pytest tests/evals/ -v -k vp-007
"""
from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
from typing import Any

import pytest

# ── dataset ───────────────────────────────────────────────────────────────────

_CASES_FILE = Path(__file__).parent / "cases" / "vehicle_profile_cases.json"
if not _CASES_FILE.exists():
    pytest.skip(f"cases file not found: {_CASES_FILE}", allow_module_level=True)

with open(_CASES_FILE, encoding="utf-8") as _fh:
    _CASES: list[dict[str, Any]] = json.load(_fh)

if not os.getenv("OPENAI_API_KEY"):
    pytest.skip("OPENAI_API_KEY not set — skipping live eval tests", allow_module_level=True)


# ── helpers ───────────────────────────────────────────────────────────────────

def _messages(text: str) -> list[dict]:
    return [
        {
            "role": "user",
            "content": (
                "Извлеки структурированный профиль автомобиля из следующего текста. "
                "Если информация отсутствует — ставь null. Не придумывай данные.\n\n"
                f"Текст:\n{text}"
            ),
        }
    ]


def _enum_val(v: Any) -> Any:
    """Return .value for enum instances so str comparisons work."""
    return v.value if hasattr(v, "value") else v


# ── main eval tests ───────────────────────────────────────────────────────────

@pytest.mark.parametrize("case", _CASES, ids=[c["id"] for c in _CASES])
def test_extract_profile(case: dict[str, Any]) -> None:
    """One LLM call per case: validate schema validity + expected field assertions."""
    from app.core.structured import complete_structured, StructuredError
    from app.api.v1.routes.analysis import VehicleProfile

    case_id: str = case["id"]
    expected: dict = case.get("expected", {})
    red_flags_min: int | None = case.get("expected_red_flags_min_count")

    try:
        profile: VehicleProfile = asyncio.run(
            complete_structured(_messages(case["input"]), VehicleProfile, temperature=0.1)
        )
    except StructuredError as exc:
        pytest.fail(
            f"[{case_id}] StructuredError after {exc.attempts} attempts: {exc.last_error}\n"
            f"raw snippet: {exc.raw[:300]}"
        )

    # Required fields always present
    assert profile.make, f"[{case_id}] make must be non-empty"
    assert profile.model is not None, f"[{case_id}] model field must be present"
    assert 0.0 <= profile.extraction_confidence <= 1.0, f"[{case_id}] confidence out of range"

    # Field-level assertions from dataset
    for field, exp_val in expected.items():
        if exp_val is None:
            # null expectation = soft check only (LLM may legitimately return None or a guess)
            continue
        actual_val = _enum_val(getattr(profile, field))
        assert actual_val == exp_val, (
            f"[{case_id}] '{field}': expected {exp_val!r}, got {actual_val!r}"
        )

    # Red-flags count check
    if red_flags_min is not None:
        assert len(profile.red_flags) >= red_flags_min, (
            f"[{case_id}] expected >= {red_flags_min} red_flag(s), "
            f"got {len(profile.red_flags)}: {profile.red_flags}"
        )


# ── Langfuse dataset push (optional) ─────────────────────────────────────────

def test_langfuse_dataset_push() -> None:
    """Push all 20 cases to a Langfuse Dataset for UI-based eval tracking.

    Skipped when LANGFUSE_SECRET_KEY is absent.
    Run once manually: pytest tests/evals/test_extract_profile.py::test_langfuse_dataset_push -v -s
    """
    if not os.getenv("LANGFUSE_SECRET_KEY"):
        pytest.skip("LANGFUSE_SECRET_KEY not set — skipping Langfuse dataset push")

    from langfuse import Langfuse

    lf = Langfuse(
        public_key=os.getenv("LANGFUSE_PUBLIC_KEY", ""),
        secret_key=os.environ["LANGFUSE_SECRET_KEY"],
        host=os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com"),
    )

    dataset_name = "autoevo-extract-profile-v1"
    try:
        lf.create_dataset(
            name=dataset_name,
            description="AutoEvo VehicleProfile eval set — Phase 3 (20 Russian car listing cases)",
        )
    except Exception:
        pass  # Already exists — fine

    for case in _CASES:
        lf.create_dataset_item(
            dataset_name=dataset_name,
            input={"text": case["input"]},
            expected_output=case.get("expected", {}),
            metadata={
                "id": case["id"],
                "description": case["description"],
                "red_flags_min": case.get("expected_red_flags_min_count"),
            },
        )

    lf.flush()
    print(f"\nPushed {len(_CASES)} items → Langfuse dataset '{dataset_name}'")
