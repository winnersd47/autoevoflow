"""
file_hosting.py — Temporary file hosting via f2u-cli or MinIO fallback.

Priority:
  1. f2u.sh  — if F2U_API_KEY is set, uploads via CLI subprocess (f2u upload <file>)
               or via REST API POST https://f2u.sh/upload (for bytes payloads).
  2. MinIO   — falls back to S3-compatible presigned URL when f2u is unavailable.

Free tier limits (f2u.sh): files expire in 24 h, max 10 MB per file.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import shutil
import tempfile
from pathlib import Path

import aiohttp

from app.core.config import settings

logger = logging.getLogger(__name__)

_F2U_UPLOAD_URL = "https://f2u.sh/upload"
_F2U_CLI = "f2u"  # must be on PATH


class FileHostingService:
    """Upload files to a temporary public URL for AI agent consumption.

    Usage::

        svc = FileHostingService()

        # From a local file path:
        url = await svc.upload_temp("/tmp/photo.jpg", ttl_hours=24)

        # From raw bytes (e.g. an in-memory image):
        url = await svc.upload_bytes(data, "photo.jpg", "image/jpeg")
    """

    # ── public API ────────────────────────────────────────────────────────────

    async def upload_temp(
        self,
        file_path: str,
        ttl_hours: int = 24,
    ) -> str | None:
        """Upload a local file and return its public URL, or None on failure.

        Args:
            file_path: Absolute or relative path to the file on disk.
            ttl_hours: Desired TTL in hours (informational only for f2u free tier;
                       MinIO presigned URL will honor it).

        Returns:
            Public URL string, or None if both backends fail.
        """
        path = Path(file_path)
        if not path.is_file():
            logger.error("file_hosting: file not found: %s", file_path)
            return None

        if settings.f2u_api_key:
            url = await self._f2u_upload_cli(path)
            if url:
                return url
            # CLI failed — try REST fallback with the same key
            data = path.read_bytes()
            url = await self._f2u_upload_api(
                data,
                filename=path.name,
                content_type=_guess_content_type(path.suffix),
            )
            if url:
                return url
            logger.warning(
                "file_hosting: f2u upload failed for %s, falling back to MinIO",
                file_path,
            )

        return await self._minio_upload(path, ttl_hours=ttl_hours)

    async def upload_bytes(
        self,
        data: bytes,
        filename: str,
        content_type: str,
    ) -> str | None:
        """Upload raw bytes and return a public URL, or None on failure.

        Args:
            data:         Raw file bytes.
            filename:     Name the remote service will see (e.g. ``"chart.png"``).
            content_type: MIME type (e.g. ``"image/png"``).

        Returns:
            Public URL string, or None if both backends fail.
        """
        if not data:
            logger.error("file_hosting: upload_bytes called with empty data")
            return None

        if settings.f2u_api_key:
            url = await self._f2u_upload_api(data, filename=filename, content_type=content_type)
            if url:
                return url
            logger.warning(
                "file_hosting: f2u API upload failed for %s, falling back to MinIO",
                filename,
            )

        # MinIO path: write bytes to a temp file, then reuse _minio_upload
        suffix = Path(filename).suffix or ""
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(data)
            tmp_path = Path(tmp.name)

        try:
            return await self._minio_upload(tmp_path, ttl_hours=24)
        finally:
            try:
                tmp_path.unlink()
            except OSError:
                pass

    # ── f2u backends ──────────────────────────────────────────────────────────

    async def _f2u_upload_cli(self, path: Path) -> str | None:
        """Call the f2u CLI tool via subprocess and parse the JSON response."""
        if not shutil.which(_F2U_CLI):
            logger.debug("file_hosting: f2u CLI not found on PATH, skipping CLI upload")
            return None

        cmd = [_F2U_CLI, "upload", str(path)]
        env = {**os.environ, "F2U_API_KEY": settings.f2u_api_key}

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=60)
        except asyncio.TimeoutError:
            logger.error("file_hosting: f2u CLI timed out for %s", path)
            return None
        except OSError as exc:
            logger.error("file_hosting: failed to launch f2u CLI: %s", exc)
            return None

        if proc.returncode != 0:
            logger.error(
                "file_hosting: f2u CLI exited %d for %s — stderr: %s",
                proc.returncode,
                path,
                stderr.decode(errors="replace").strip(),
            )
            return None

        raw = stdout.decode(errors="replace").strip()
        url = _parse_f2u_response(raw, source="CLI", label=str(path))
        if url:
            logger.info("file_hosting: f2u CLI upload OK — %s", url)
        return url

    async def _f2u_upload_api(
        self,
        data: bytes,
        *,
        filename: str,
        content_type: str,
    ) -> str | None:
        """Upload via the f2u.sh REST API using aiohttp multipart."""
        headers = {"Authorization": settings.f2u_api_key}
        form = aiohttp.FormData()
        form.add_field(
            "file",
            data,
            filename=filename,
            content_type=content_type,
        )

        try:
            async with aiohttp.ClientSession(headers=headers) as session:
                async with session.post(
                    _F2U_UPLOAD_URL,
                    data=form,
                    timeout=aiohttp.ClientTimeout(total=60),
                ) as resp:
                    body = await resp.text()
                    if resp.status not in (200, 201):
                        logger.error(
                            "file_hosting: f2u API HTTP %d for %s — body: %s",
                            resp.status,
                            filename,
                            body[:200],
                        )
                        return None
        except aiohttp.ClientError as exc:
            logger.error("file_hosting: f2u API request error for %s: %s", filename, exc)
            return None

        url = _parse_f2u_response(body, source="API", label=filename)
        if url:
            logger.info("file_hosting: f2u API upload OK — %s", url)
        return url

    # ── MinIO fallback ────────────────────────────────────────────────────────

    async def _minio_upload(
        self,
        path: Path,
        *,
        ttl_hours: int = 24,
    ) -> str | None:
        """Upload to MinIO / S3 and return a presigned URL.

        Requires boto3 / aiobotocore to be installed and AWS_* / S3_ENDPOINT_URL
        settings to be configured.
        """
        try:
            import boto3
            from botocore.exceptions import BotoCoreError, ClientError
        except ImportError:
            logger.error(
                "file_hosting: boto3 not installed; cannot fall back to MinIO. "
                "Install with: pip install boto3"
            )
            return None

        bucket = settings.S3_BUCKET
        key = f"temp/{path.name}"
        extra_args: dict = {"ContentType": _guess_content_type(path.suffix)}

        try:
            client = boto3.client(
                "s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY,
                aws_secret_access_key=settings.AWS_SECRET_KEY,
                region_name=settings.AWS_REGION,
                endpoint_url=settings.S3_ENDPOINT_URL or None,
            )
            await asyncio.to_thread(
                client.upload_file,
                str(path),
                bucket,
                key,
                ExtraArgs=extra_args,
            )
            url: str = await asyncio.to_thread(
                client.generate_presigned_url,
                "get_object",
                Params={"Bucket": bucket, "Key": key},
                ExpiresIn=ttl_hours * 3600,
            )
            logger.info("file_hosting: MinIO upload OK — %s", url)
            return url
        except Exception as exc:  # noqa: BLE001
            logger.error("file_hosting: MinIO upload failed for %s: %s", path, exc)
            return None


# ── helpers ───────────────────────────────────────────────────────────────────

def _parse_f2u_response(raw: str, *, source: str, label: str) -> str | None:
    """Extract URL from f2u JSON response ``{"url": "...", "expires_at": "..."}``.

    Falls back to treating the raw output as a plain URL if JSON parsing fails.
    """
    raw = raw.strip()
    if not raw:
        logger.error("file_hosting: f2u %s returned empty response for %s", source, label)
        return None

    try:
        payload: dict = json.loads(raw)
        url = payload.get("url") or payload.get("link") or payload.get("file_url")
        if url:
            return str(url)
        logger.error(
            "file_hosting: f2u %s JSON has no url key for %s — payload: %s",
            source,
            label,
            raw[:200],
        )
        return None
    except json.JSONDecodeError:
        # Some CLI versions print the URL as a bare string
        if raw.startswith(("http://", "https://")):
            return raw
        logger.error(
            "file_hosting: f2u %s non-JSON response for %s: %s",
            source,
            label,
            raw[:200],
        )
        return None


def _guess_content_type(suffix: str) -> str:
    _map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
        ".pdf": "application/pdf",
        ".json": "application/json",
        ".txt": "text/plain",
        ".csv": "text/csv",
        ".zip": "application/zip",
        ".mp4": "video/mp4",
        ".mp3": "audio/mpeg",
    }
    return _map.get(suffix.lower(), "application/octet-stream")


# ── module-level singleton ────────────────────────────────────────────────────

file_hosting_service = FileHostingService()
