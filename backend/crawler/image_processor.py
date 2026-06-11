"""
Async image processing pipeline for the automotive AI platform.

Pipeline per image:
    download → validate → deduplicate → resize → thumbnail → upload → classify

Features:
    - Bounded concurrency via asyncio.Semaphore
    - 3-retry download with exponential back-off
    - JPEG optimisation (max 1920px on the long edge)
    - 400×300 thumbnail with cover-crop
    - Exact deduplication via SHA-256
    - View-type classification from filename keywords + aspect-ratio heuristic
    - S3/MinIO upload with public URL return
    - Structured logging per image
    - Batch processing helper
"""

from __future__ import annotations

import asyncio
import hashlib
import io
import re
from dataclasses import dataclass
from enum import Enum
from typing import List, Optional, Set, Tuple

import aiohttp
import boto3
import structlog
from PIL import Image

logger = structlog.get_logger(__name__)


# ---------------------------------------------------------------------------
# Enums & dataclasses
# ---------------------------------------------------------------------------


class ImageViewType(str, Enum):
    EXTERIOR_FRONT = "exterior_front"
    EXTERIOR_SIDE = "exterior_side"
    EXTERIOR_REAR = "exterior_rear"
    EXTERIOR_3Q_FRONT = "exterior_3q_front"
    EXTERIOR_3Q_REAR = "exterior_3q_rear"
    INTERIOR = "interior"
    DETAIL = "detail"
    STUDIO = "studio"
    CONCEPT_RENDER = "concept_render"
    UNKNOWN = "unknown"


@dataclass
class ProcessedImage:
    url: str                    # public URL of the full-size image
    storage_key: str            # S3/MinIO key for full-size
    thumbnail_key: str          # S3/MinIO key for thumbnail
    width: int
    height: int
    view_type: ImageViewType
    content_hash: str           # SHA-256 of the resized JPEG bytes
    file_size: int              # bytes of the resized JPEG


# ---------------------------------------------------------------------------
# Filename keyword → view type mapping
# ---------------------------------------------------------------------------

_VIEW_KEYWORD_MAP: List[Tuple[ImageViewType, List[str]]] = [
    (ImageViewType.EXTERIOR_FRONT,   ["front", "-front", "_front", "front_view", "frt"]),
    (ImageViewType.EXTERIOR_REAR,    ["rear", "-rear", "_rear", "back", "aft"]),
    (ImageViewType.EXTERIOR_SIDE,    ["side", "-side", "_side", "profile", "lateral"]),
    (ImageViewType.EXTERIOR_3Q_FRONT,["3q-front", "3q_front", "three-quarter-front",
                                      "3quarter_front", "34front"]),
    (ImageViewType.EXTERIOR_3Q_REAR, ["3q-rear", "3q_rear", "three-quarter-rear",
                                      "3quarter_rear", "34rear"]),
    (ImageViewType.INTERIOR,         ["interior", "cabin", "cockpit", "dashboard",
                                      "inside", "seat", "instrument", "dash"]),
    (ImageViewType.DETAIL,           ["detail", "badge", "wheel", "rim", "engine",
                                      "headlight", "taillight", "grille", "emblem",
                                      "exhaust", "brake", "door_handle", "shifter"]),
    (ImageViewType.STUDIO,           ["studio", "white_bg", "white-bg", "cutout",
                                      "isolated", "press_release"]),
    (ImageViewType.CONCEPT_RENDER,   ["render", "concept", "cgi", "3d", "visualisation",
                                      "visualization"]),
]

# Aspect-ratio thresholds for view inference when filename gives no hint
_WIDE_RATIO = 1.6     # width/height — typical exterior side/3-quarter
_SQUARE_RATIO = 1.15  # near-square — common for detail/interior shots


# ---------------------------------------------------------------------------
# ImageProcessor
# ---------------------------------------------------------------------------


class ImageProcessor:
    """
    Full async image processing pipeline.

    Args:
        s3_client:       Boto3 S3 client (or MinIO-compatible).
        bucket:          Target S3 bucket name.
        max_concurrent:  Maximum simultaneous in-flight downloads/uploads.
        base_url:        Optional base URL for generating public image URLs.
                         If empty, constructs using s3_endpoint + bucket.
    """

    MAX_RETRIES = 3
    DOWNLOAD_TIMEOUT = 10          # seconds per attempt
    JPEG_QUALITY = 88
    MAX_DIMENSION = 1920           # px on the long edge
    THUMBNAIL_SIZE = (400, 300)    # (width, height)
    MIN_WIDTH = 300
    MIN_HEIGHT = 200

    def __init__(
        self,
        s3_client,
        bucket: str,
        max_concurrent: int = 10,
        base_url: str = "",
    ) -> None:
        self.s3 = s3_client
        self.bucket = bucket
        self.base_url = base_url.rstrip("/")
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.logger = structlog.get_logger("image_processor")
        self._seen_hashes: Set[str] = set()

    # ------------------------------------------------------------------
    # Download
    # ------------------------------------------------------------------

    async def download_image(
        self,
        url: str,
        session: aiohttp.ClientSession,
    ) -> Optional[bytes]:
        """
        Download image bytes from *url* with up to MAX_RETRIES retries.

        Returns the raw bytes on success, or None on persistent failure.
        """
        timeout = aiohttp.ClientTimeout(total=self.DOWNLOAD_TIMEOUT)
        last_exc: Optional[Exception] = None

        for attempt in range(1, self.MAX_RETRIES + 1):
            try:
                async with session.get(url, timeout=timeout, allow_redirects=True) as resp:
                    if resp.status == 404:
                        self.logger.debug("image_not_found", url=url)
                        return None
                    resp.raise_for_status()
                    data = await resp.read()
                    self.logger.debug(
                        "image_downloaded",
                        url=url,
                        bytes=len(data),
                        attempt=attempt,
                    )
                    return data
            except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
                last_exc = exc
                wait = 2 ** (attempt - 1)  # 1, 2, 4 …
                self.logger.warning(
                    "image_download_retry",
                    url=url,
                    attempt=attempt,
                    wait=wait,
                    error=str(exc),
                )
                await asyncio.sleep(wait)

        self.logger.error(
            "image_download_failed",
            url=url,
            error=str(last_exc),
        )
        return None

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def validate_image(self, data: bytes) -> bool:
        """
        Return True if *data* is a valid image that meets minimum size requirements.

        Checks:
            - PIL can open and verify the file
            - Width ≥ MIN_WIDTH and Height ≥ MIN_HEIGHT
            - Format is JPEG, PNG, or WebP
        """
        if not data:
            return False
        try:
            img = Image.open(io.BytesIO(data))
            img.verify()          # catches truncated / corrupt files
            # Re-open after verify (verify exhausts the buffer)
            img = Image.open(io.BytesIO(data))
            if img.format not in ("JPEG", "PNG", "WEBP"):
                self.logger.debug("image_unsupported_format", format=img.format)
                return False
            w, h = img.size
            if w < self.MIN_WIDTH or h < self.MIN_HEIGHT:
                self.logger.debug("image_too_small", width=w, height=h)
                return False
            return True
        except Exception as exc:
            self.logger.debug("image_validation_error", error=str(exc))
            return False

    # ------------------------------------------------------------------
    # Resize
    # ------------------------------------------------------------------

    def resize_image(self, data: bytes, max_size: int = MAX_DIMENSION) -> bytes:
        """
        Resize *data* so that neither dimension exceeds *max_size*.

        Preserves aspect ratio.  Converts non-JPEG formats to JPEG.
        Returns JPEG bytes.
        """
        img = Image.open(io.BytesIO(data)).convert("RGB")
        w, h = img.size

        if w > max_size or h > max_size:
            img.thumbnail((max_size, max_size), Image.LANCZOS)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=self.JPEG_QUALITY, optimize=True)
        return buf.getvalue()

    # ------------------------------------------------------------------
    # Thumbnail
    # ------------------------------------------------------------------

    def generate_thumbnail(
        self,
        data: bytes,
        size: Tuple[int, int] = THUMBNAIL_SIZE,
    ) -> bytes:
        """
        Generate a cover-cropped thumbnail of the given *size* (width, height).

        Uses a centre-crop strategy:
            1. Scale image so the shorter dimension fits.
            2. Crop the excess from both sides.
        Returns JPEG bytes.
        """
        img = Image.open(io.BytesIO(data)).convert("RGB")
        target_w, target_h = size
        src_w, src_h = img.size

        # Scale factor so the image covers the target box
        scale = max(target_w / src_w, target_h / src_h)
        new_w = int(src_w * scale)
        new_h = int(src_h * scale)
        img = img.resize((new_w, new_h), Image.LANCZOS)

        # Centre crop
        left = (new_w - target_w) // 2
        top = (new_h - target_h) // 2
        img = img.crop((left, top, left + target_w, top + target_h))

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=82, optimize=True)
        return buf.getvalue()

    # ------------------------------------------------------------------
    # S3 upload
    # ------------------------------------------------------------------

    async def upload_to_s3(
        self,
        data: bytes,
        key: str,
        content_type: str = "image/jpeg",
    ) -> str:
        """
        Upload *data* to S3/MinIO under *key*.

        Returns the public URL of the uploaded object.
        Runs the blocking boto3 call in a thread executor to avoid blocking the loop.
        """
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: self.s3.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=data,
                ContentType=content_type,
                ACL="public-read",
            ),
        )
        # Build public URL
        if self.base_url:
            public_url = f"{self.base_url}/{key}"
        else:
            # Default S3 URL pattern
            public_url = f"https://{self.bucket}.s3.amazonaws.com/{key}"

        self.logger.debug("image_uploaded", key=key, size=len(data))
        return public_url

    # ------------------------------------------------------------------
    # View type detection
    # ------------------------------------------------------------------

    def detect_view_type(
        self,
        data: bytes,
        filename: str = "",
    ) -> ImageViewType:
        """
        Classify the image view type.

        Strategy:
            1. Keyword scan of *filename* (path component, case-insensitive).
            2. Aspect-ratio heuristic using PIL.
        """
        if filename:
            lower = filename.lower()
            # Use only the last path segment + extension for keyword matching
            basename = lower.rsplit("/", 1)[-1]
            for view_type, keywords in _VIEW_KEYWORD_MAP:
                if any(kw in basename for kw in keywords):
                    return view_type

        # Aspect-ratio fallback
        try:
            img = Image.open(io.BytesIO(data))
            w, h = img.size
            if h == 0:
                return ImageViewType.UNKNOWN
            ratio = w / h
            if ratio >= _WIDE_RATIO:
                return ImageViewType.EXTERIOR_SIDE
            if ratio >= _SQUARE_RATIO:
                return ImageViewType.EXTERIOR_3Q_FRONT
            return ImageViewType.INTERIOR
        except Exception:
            return ImageViewType.UNKNOWN

    # ------------------------------------------------------------------
    # Hashing & deduplication
    # ------------------------------------------------------------------

    def compute_hash(self, data: bytes) -> str:
        """Return the SHA-256 hex digest of *data*."""
        return hashlib.sha256(data).hexdigest()

    def is_duplicate(self, data: bytes) -> bool:
        """
        Return True if *data* has already been processed in this session.

        Adds the hash to the seen-set if it is new.
        """
        h = self.compute_hash(data)
        if h in self._seen_hashes:
            return True
        self._seen_hashes.add(h)
        return False

    # ------------------------------------------------------------------
    # Single image full pipeline
    # ------------------------------------------------------------------

    async def process_image(
        self,
        url: str,
        session: aiohttp.ClientSession,
        prefix: str = "",
    ) -> Optional[ProcessedImage]:
        """
        Execute the full processing pipeline for a single image URL.

        Steps: download → validate → dedup → resize → thumbnail → upload → classify

        Returns a ProcessedImage or None if any step fails.
        """
        async with self.semaphore:
            log = self.logger.bind(url=url)

            # 1. Download
            data = await self.download_image(url, session)
            if data is None:
                return None

            # 2. Validate
            if not self.validate_image(data):
                log.debug("image_invalid_skipped")
                return None

            # 3. Deduplicate (exact, on original bytes)
            if self.is_duplicate(data):
                log.debug("image_exact_duplicate_skipped")
                return None

            # 4. Resize
            try:
                resized = self.resize_image(data)
            except Exception as exc:
                log.warning("image_resize_error", error=str(exc))
                return None

            # 5. Thumbnail
            try:
                thumbnail = self.generate_thumbnail(data)
            except Exception as exc:
                log.warning("image_thumbnail_error", error=str(exc))
                return None

            # 6. Storage keys
            content_hash = self.compute_hash(resized)
            safe_prefix = prefix.strip("/")
            key = f"{safe_prefix}/{content_hash}.jpg" if safe_prefix else f"{content_hash}.jpg"
            thumb_key = (
                f"{safe_prefix}/thumbnails/{content_hash}.jpg"
                if safe_prefix
                else f"thumbnails/{content_hash}.jpg"
            )

            # 7. Upload
            try:
                url_full = await self.upload_to_s3(resized, key)
                await self.upload_to_s3(thumbnail, thumb_key)
            except Exception as exc:
                log.error("image_upload_error", key=key, error=str(exc))
                return None

            # 8. Classify view type
            view_type = self.detect_view_type(data, filename=url)

            # 9. Dimensions of the resized image
            try:
                img = Image.open(io.BytesIO(resized))
                w, h = img.size
            except Exception:
                w, h = 0, 0

            log.info(
                "image_processed",
                key=key,
                width=w,
                height=h,
                view_type=view_type.value,
                size=len(resized),
            )

            return ProcessedImage(
                url=url_full,
                storage_key=key,
                thumbnail_key=thumb_key,
                width=w,
                height=h,
                view_type=view_type,
                content_hash=content_hash,
                file_size=len(resized),
            )

    # ------------------------------------------------------------------
    # Batch processing
    # ------------------------------------------------------------------

    async def batch_process(
        self,
        urls: List[str],
        prefix: str = "",
    ) -> List[ProcessedImage]:
        """
        Process multiple image URLs concurrently.

        Returns only successfully processed ProcessedImage instances
        (failed images are silently dropped after logging).
        """
        if not urls:
            return []

        self.logger.info("batch_process_start", count=len(urls), prefix=prefix)

        async with aiohttp.ClientSession(
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (compatible; AutomotiveAICrawler/1.0)"
                )
            }
        ) as session:
            tasks = [
                self.process_image(url, session, prefix)
                for url in urls
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        processed: List[ProcessedImage] = []
        for result in results:
            if isinstance(result, ProcessedImage):
                processed.append(result)
            elif isinstance(result, Exception):
                self.logger.warning("batch_image_exception", error=str(result))

        self.logger.info(
            "batch_process_done",
            total=len(urls),
            succeeded=len(processed),
            failed=len(urls) - len(processed),
        )
        return processed
