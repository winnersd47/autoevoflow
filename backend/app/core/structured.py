"""Structured output (Фаза 2) — Pydantic-validated LLM calls for AutoEvo.

Two entry points:
  • `complete_structured`  — text-only chat (analysis, extraction from listing text)
  • `vision_structured`    — GPT-4o Vision (image + text → schema)

Both retry on ValidationError: re-send the error message so the model can
self-correct. Raise `StructuredError` when all attempts are exhausted.
"""
from __future__ import annotations

import json
import re
from typing import TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from app.core.config import settings

T = TypeVar("T", bound=BaseModel)

_CHAT_URL = "https://api.openai.com/v1/chat/completions"
_TIMEOUT = 90


class StructuredError(Exception):
    def __init__(self, attempts: int, last_error: str, raw: str) -> None:
        super().__init__(f"structured output failed after {attempts} attempts: {last_error}")
        self.attempts = attempts
        self.last_error = last_error
        self.raw = raw


def _extract_json(text: str) -> dict | list | None:
    """Strip code fences, return first balanced {…} or […]."""
    t = re.sub(r"```(?:json)?", "", text or "").strip()
    start = next((i for i, c in enumerate(t) if c in "{["), -1)
    if start < 0:
        return None
    open_c, close_c = t[start], ("}" if t[start] == "{" else "]")
    depth = 0
    for i in range(start, len(t)):
        if t[i] == open_c:
            depth += 1
        elif t[i] == close_c:
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(t[start : i + 1])
                except json.JSONDecodeError:
                    return None
    return None


def _schema_instruction(schema: type[T]) -> str:
    return (
        "Верни ТОЛЬКО валидный JSON строго по схеме без markdown и пояснений:\n"
        + json.dumps(schema.model_json_schema(), ensure_ascii=False)
    )


def _api_key() -> str:
    return getattr(settings, "OPENAI_API_KEY", "") or getattr(settings, "openai_api_key", "")


async def complete_structured(
    messages: list[dict[str, str]],
    schema: type[T],
    *,
    model: str | None = None,
    temperature: float = 0.2,
    max_tokens: int = 2048,
    retries: int = 2,
) -> T:
    """Text-only structured call. Returns a validated `schema` instance."""
    _model = model or settings.OPENAI_CHAT_MODEL
    instruction = {"role": "system", "content": _schema_instruction(schema)}
    base = [instruction, *messages]
    msgs = base
    last_err, raw = "", ""

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        for attempt in range(retries + 1):
            resp = await client.post(
                _CHAT_URL,
                headers={"Authorization": f"Bearer {_api_key()}", "Content-Type": "application/json"},
                json={
                    "model": _model,
                    "messages": msgs,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "response_format": {"type": "json_object"},
                },
            )
            resp.raise_for_status()
            raw = resp.json()["choices"][0]["message"]["content"] or ""

            data = _extract_json(raw)
            if data is not None:
                try:
                    return schema.model_validate(data)
                except ValidationError as exc:
                    last_err = "; ".join(
                        f"{'.'.join(map(str, e['loc']))}: {e['msg']}" for e in exc.errors()[:5]
                    )
            else:
                last_err = "ответ не содержит валидного JSON"

            msgs = [
                *base,
                {"role": "assistant", "content": raw[:800]},
                {"role": "user", "content": f"Ошибка валидации: {last_err}. "
                                            "Верни ИСПРАВЛЕННЫЙ JSON строго по схеме."},
            ]

    raise StructuredError(retries + 1, last_err, raw)


async def vision_structured(
    image_b64: str,
    prompt: str,
    schema: type[T],
    *,
    model: str = "gpt-4o",
    temperature: float = 0.1,
    max_tokens: int = 1024,
    retries: int = 2,
) -> T:
    """Multimodal (image + text) structured call. Returns a validated `schema` instance."""
    schema_note = _schema_instruction(schema)
    base_content = [
        {"type": "text", "text": f"{schema_note}\n\n{prompt}"},
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}", "detail": "high"}},
    ]
    base = [{"role": "user", "content": base_content}]
    msgs = base
    last_err, raw = "", ""

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        for attempt in range(retries + 1):
            resp = await client.post(
                _CHAT_URL,
                headers={"Authorization": f"Bearer {_api_key()}", "Content-Type": "application/json"},
                json={
                    "model": model,
                    "messages": msgs,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "response_format": {"type": "json_object"},
                },
            )
            resp.raise_for_status()
            raw = resp.json()["choices"][0]["message"]["content"] or ""

            data = _extract_json(raw)
            if data is not None:
                try:
                    return schema.model_validate(data)
                except ValidationError as exc:
                    last_err = "; ".join(
                        f"{'.'.join(map(str, e['loc']))}: {e['msg']}" for e in exc.errors()[:5]
                    )
            else:
                last_err = "ответ не содержит валидного JSON"

            # On retry: text-only correction (no image re-send — cheaper)
            msgs = [
                *base,
                {"role": "assistant", "content": raw[:800]},
                {"role": "user", "content": [
                    {"type": "text", "text": f"Ошибка валидации: {last_err}. "
                                             "Верни ИСПРАВЛЕННЫЙ JSON строго по схеме."},
                ]},
            ]

    raise StructuredError(retries + 1, last_err, raw)
