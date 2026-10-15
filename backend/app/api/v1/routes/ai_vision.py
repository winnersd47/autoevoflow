"""AI Vision routes — image generation and damage detection for vehicles."""
from __future__ import annotations

import asyncio
import base64
import json
import logging
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, UploadFile, File, status
from pydantic import BaseModel, Field

from app.core.deps import CurrentUser, DBSession
from app.core.config import settings
from app.core.structured import vision_structured, StructuredError

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _openai_images(prompt: str, size: str = "1024x1024") -> str:
    """Call DALL-E 3 Images API, return URL."""
    api_key = getattr(settings, "OPENAI_API_KEY", "") or getattr(settings, "openai_api_key", "")
    if not api_key:
        return "https://placehold.co/1024x1024/1a1a2e/ffffff?text=AI+Photo"
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            "https://api.openai.com/v1/images/generations",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": "dall-e-3", "prompt": prompt, "n": 1, "size": size, "quality": "hd"},
        )
        resp.raise_for_status()
        return resp.json()["data"][0]["url"]


async def _gpt4o_vision(base64_img: str, prompt: str) -> dict[str, Any]:
    """Call GPT-4o with image input, return parsed JSON analysis."""
    api_key = getattr(settings, "OPENAI_API_KEY", "") or getattr(settings, "openai_api_key", "")
    if not api_key:
        return {
            "damage_detected": True,
            "severity": "minor",
            "areas": ["front bumper"],
            "confidence": 0.85,
            "description": "[STUB] Light surface scratches detected on front bumper.",
            "estimated_repair_cost_usd": {"min": 150, "max": 400},
            "recommendation": "Cosmetic repair recommended before resale.",
        }
    async with httpx.AsyncClient(timeout=90) as client:
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "gpt-4o",
                "max_tokens": 1024,
                "response_format": {"type": "json_object"},
                "messages": [{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_img}", "detail": "high"}},
                    ],
                }],
            },
        )
        resp.raise_for_status()
    raw = resp.json()["choices"][0]["message"]["content"] or "{}"
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"error": "Parse failed", "raw": raw[:500]}


async def _yandex_art(prompt: str, size_ratio: str = "1:1") -> str:
    """YandexART async image generation. Returns base64 JPEG."""
    api_key = getattr(settings, "YANDEX_API_KEY", "") or getattr(settings, "yandex_api_key", "")
    folder_id = getattr(settings, "YANDEX_FOLDER_ID", "") or getattr(settings, "yandex_folder_id", "")
    if not api_key or not folder_id:
        return ""  # caller falls back to DALL-E
    w, h = (1, 1)
    if size_ratio == "16:9": w, h = (16, 9)
    elif size_ratio == "9:16": w, h = (9, 16)
    headers = {"Authorization": f"Api-Key {api_key}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            "https://llm.api.cloud.yandex.net/foundationModels/v1/imageGenerationAsync",
            headers=headers,
            json={
                "modelUri": f"art://{folder_id}/yandex-art/latest",
                "generationOptions": {"seed": 0, "aspectRatio": {"widthRatio": str(w), "heightRatio": str(h)}},
                "messages": [{"weight": "1", "text": prompt}],
            },
        )
        resp.raise_for_status()
        op_id = resp.json()["id"]
        for _ in range(30):
            await asyncio.sleep(2)
            poll = await client.get(f"https://llm.api.cloud.yandex.net/operations/{op_id}", headers=headers)
            data = poll.json()
            if data.get("done"):
                return data.get("response", {}).get("image", "")
    return ""


async def _yandex_ocr(image_bytes: bytes, langs: list[str] | None = None) -> str:
    """Yandex Vision OCR — extracts text from vehicle documents."""
    import base64 as _b64
    api_key = getattr(settings, "YANDEX_API_KEY", "") or getattr(settings, "yandex_api_key", "")
    if not api_key:
        return ""
    b64 = _b64.b64encode(image_bytes).decode()
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            "https://ocr.api.cloud.yandex.net/ocr/v1/recognizeText",
            headers={"Authorization": f"Api-Key {api_key}", "Content-Type": "application/json"},
            json={"mimeType": "JPEG", "languageCodes": langs or ["ru", "en"], "content": b64},
        )
        resp.raise_for_status()
    return resp.json().get("result", {}).get("textAnnotation", {}).get("fullText", "")


# ── Schemas ────────────────────────────────────────────────────────────────────

class PhotoGenRequest(BaseModel):
    car_id: int
    make: str = Field(..., max_length=100)
    model_name: str = Field(..., max_length=100)
    year: int = Field(..., ge=1900, le=2030)
    color: str = Field("silver", max_length=50)
    style: str = Field(
        "Golden Hour lighting, warm tones, studio showroom background",
        max_length=200,
        description="Lighting/style preset from our 20-type library",
    )
    angle: str = Field("3/4 front view", max_length=100)


class PhotoGenResponse(BaseModel):
    car_id: int
    image_url: str
    prompt_used: str
    provider: str = "dall-e-3"


class DamageDetectResponse(BaseModel):
    car_id: int
    damage_detected: bool
    severity: str | None
    areas: list[str]
    confidence: float
    description: str
    estimated_repair_cost_usd: dict[str, int] | None
    recommendation: str


class YandexArtResponse(BaseModel):
    car_id: int
    image_base64: str
    prompt_used: str
    provider: str = "yandex-art"


class YandexOcrResponse(BaseModel):
    car_id: int
    extracted_text: str
    provider: str = "yandex-vision-ocr"


# Internal schema for GPT-4o Vision → Pydantic (not exposed in API response)
class _DamageAnalysis(BaseModel):
    damage_detected: bool
    severity: str | None = None
    areas: list[str] = []
    confidence: float = 0.5
    description: str = ""
    estimated_repair_cost_usd: dict[str, int] | None = None
    recommendation: str = ""


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/{car_id}/generate-photo", response_model=PhotoGenResponse)
async def generate_car_photo(
    car_id: int,
    body: PhotoGenRequest,
    user: CurrentUser,
) -> PhotoGenResponse:
    """Generate a professional AI photo of a vehicle using DALL-E 3."""
    prompt = (
        f"Professional automotive photography of a {body.year} {body.make} {body.model_name}, "
        f"{body.color} color, {body.angle}. "
        f"{body.style}. "
        "Photorealistic, 8K quality, no watermarks, clean background. "
        "Shot with a 85mm telephoto lens, shallow depth of field, bokeh background."
    )

    try:
        url = await _openai_images(prompt)
    except httpx.HTTPStatusError as exc:
        logger.error("DALL-E 3 failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Image generation failed")

    return PhotoGenResponse(car_id=car_id, image_url=url, prompt_used=prompt)


@router.post("/{car_id}/damage-detect", response_model=DamageDetectResponse)
async def detect_car_damage(
    car_id: int,
    user: CurrentUser,
    photo: UploadFile = File(..., description="JPEG/PNG photo of the vehicle"),
) -> DamageDetectResponse:
    """Analyze a vehicle photo for damage using GPT-4o Vision."""
    if photo.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only JPEG, PNG or WebP images are accepted",
        )

    raw = await photo.read()
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Max 10MB")

    b64 = base64.b64encode(raw).decode()

    damage_prompt = (
        "Analyze this vehicle photo for damage. "
        "Be precise and conservative — if uncertain, lower the confidence score."
    )
    try:
        analysis = await vision_structured(b64, damage_prompt, _DamageAnalysis)
    except StructuredError as exc:
        logger.error("damage-detect structured output failed: %s | raw=%s", exc, exc.raw[:200])
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="AI analysis failed")

    return DamageDetectResponse(car_id=car_id, **analysis.model_dump())


@router.post("/{car_id}/yandex-photo", response_model=YandexArtResponse)
async def generate_yandex_car_photo(
    car_id: int,
    body: PhotoGenRequest,
    user: CurrentUser,
) -> YandexArtResponse:
    """Generate car photo using YandexART (free alternative to DALL-E 3)."""
    prompt = (
        f"Профессиональная автомобильная фотография {body.year} {body.make} {body.model_name}, "
        f"цвет {body.color}, {body.angle}. {body.style}. "
        "Фотореализм, 8K, чистый фон, студийное освещение."
    )
    img_b64 = await _yandex_art(prompt)
    if not img_b64:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="YandexART not configured or timed out")
    return YandexArtResponse(car_id=car_id, image_base64=img_b64, prompt_used=prompt)


@router.post("/{car_id}/yandex-ocr", response_model=YandexOcrResponse)
async def ocr_car_document(
    car_id: int,
    user: CurrentUser,
    photo: UploadFile = File(..., description="Photo of VIN plate, registration, or any car document"),
) -> YandexOcrResponse:
    """Extract text from car documents using Yandex Vision OCR."""
    if photo.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Only JPEG, PNG or WebP")
    raw = await photo.read()
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Max 5MB")
    text = await _yandex_ocr(raw)
    if not text:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Yandex Vision OCR not configured")
    return YandexOcrResponse(car_id=car_id, extracted_text=text)
