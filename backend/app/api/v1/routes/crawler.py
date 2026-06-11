"""
Crawler management router.
Provides admin-only endpoints for starting, monitoring, and stopping
web-crawl jobs that populate the automotive database.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select
from enum import Enum

from app.core.deps import (
    AdminUser,
    CacheClient,
    DBSession,
    OptionalUser,
    get_current_user,
    require_admin,
)
from app.db.postgresql.models import (
    AIAnalysis,
    Brand,
    CarModel,
    CrawlerJob,
    CrawlerStatus,
    Generation,
    VehicleImage,
)

logger = structlog.get_logger(__name__)

router = APIRouter()

# ── Redis key constants ───────────────────────────────────────────────────────

_CRAWLER_STATUS_PREFIX = "crawler:status:"
_CRAWLER_PROGRESS_PREFIX = "crawler:progress:"
_CRAWLER_STOP_FLAG_PREFIX = "crawler:stop:"
_STATUS_TTL = 3600  # 1 hour
_JOB_QUEUE = "crawler:job_queue"


# ── Request / Response schemas ────────────────────────────────────────────────


class CrawlSourceEnum(str, Enum):
    netcarshow = "netcarshow"
    caricos = "caricos"
    motor1 = "motor1"
    autoevolution = "autoevolution"
    supercars = "supercars"
    conceptcarz = "conceptcarz"
    all = "all"


class StartCrawlRequest(BaseModel):
    sources: list[CrawlSourceEnum] = Field(
        default=[CrawlSourceEnum.all],
        description="List of sources to crawl. Use 'all' to crawl every registered source.",
    )
    brands: Optional[list[str]] = Field(
        default=None,
        description="Limit crawl to specific brand slugs. None = crawl all brands.",
    )
    full_refresh: bool = Field(
        default=False,
        description="When True, re-crawl items that have already been processed.",
    )


class CrawlJobResponse(BaseModel):
    job_id: str
    source: str
    status: str
    progress: float
    total_items: int
    items_crawled: int
    started_at: Optional[str]
    completed_at: Optional[str]
    error: Optional[str]

    class Config:
        from_attributes = True


class CrawlStatsResponse(BaseModel):
    total_brands: int
    total_models: int
    total_generations: int
    total_images: int
    total_crawl_jobs: int
    last_crawl_at: Optional[str]
    sources_status: dict[str, Any]


# ── Internal helpers ──────────────────────────────────────────────────────────


def _source_list(sources: list[CrawlSourceEnum]) -> list[str]:
    """Expand 'all' into the full source list; otherwise return unique sources."""
    all_sources = [s.value for s in CrawlSourceEnum if s != CrawlSourceEnum.all]
    if CrawlSourceEnum.all in sources or "all" in sources:
        return all_sources
    # Deduplicate while preserving order
    seen: set[str] = set()
    result: list[str] = []
    for s in sources:
        v = s.value if isinstance(s, CrawlSourceEnum) else s
        if v not in seen:
            seen.add(v)
            result.append(v)
    return result


def _job_to_response(job: CrawlerJob) -> CrawlJobResponse:
    """Convert ORM CrawlerJob to the API response schema."""
    return CrawlJobResponse(
        job_id=str(job.id),
        source=job.source,
        status=job.status.value if isinstance(job.status, CrawlerStatus) else job.status,
        progress=job.progress,
        total_items=job.total_items,
        items_crawled=job.items_crawled,
        started_at=job.started_at.isoformat() if job.started_at else None,
        completed_at=job.completed_at.isoformat() if job.completed_at else None,
        error=job.error,
    )


async def _run_crawl_job(
    job_id: int,
    source: str,
    brands: Optional[list[str]],
    full_refresh: bool,
) -> None:
    """
    Background task: runs the appropriate crawler for *source* and updates the
    CrawlerJob record + Redis status as it progresses.
    """
    from app.db.postgresql.database import async_session_factory
    from app.db.redis.cache import redis_cache
    from app.services.crawler.manager import (
        AutoEvolutionCrawler,
        BaseCrawler,
        CaricosCrawler,
        ConceptCarzCrawler,
        Motor1Crawler,
        NetCarShowCrawler,
        SupercarsCrawler,
    )

    crawler_map: dict[str, type[BaseCrawler]] = {
        "netcarshow": NetCarShowCrawler,
        "caricos": CaricosCrawler,
        "motor1": Motor1Crawler,
        "autoevolution": AutoEvolutionCrawler,
        "supercars": SupercarsCrawler,
        "conceptcarz": ConceptCarzCrawler,
    }

    CrawlerClass = crawler_map.get(source)
    if CrawlerClass is None:
        logger.error("unknown_crawler_source", source=source, job_id=job_id)
        return

    status_key = f"{_CRAWLER_STATUS_PREFIX}{job_id}"
    stop_key = f"{_CRAWLER_STOP_FLAG_PREFIX}{job_id}"

    async def _update_job(
        db_session: Any,
        new_status: CrawlerStatus,
        progress: float = 0.0,
        items_crawled: int = 0,
        total_items: int = 0,
        error: Optional[str] = None,
        started_at: Optional[datetime] = None,
        completed_at: Optional[datetime] = None,
    ) -> None:
        result = await db_session.execute(
            select(CrawlerJob).where(CrawlerJob.id == job_id)
        )
        job = result.scalar_one_or_none()
        if job is None:
            return
        job.status = new_status
        job.progress = progress
        job.items_crawled = items_crawled
        job.total_items = total_items
        if error is not None:
            job.error = error
        if started_at is not None:
            job.started_at = started_at
        if completed_at is not None:
            job.completed_at = completed_at
        await db_session.commit()

        # Mirror to Redis for low-latency status queries
        await redis_cache.set(
            status_key,
            {
                "job_id": job_id,
                "source": source,
                "status": new_status.value,
                "progress": progress,
                "items_crawled": items_crawled,
                "total_items": total_items,
                "error": error,
            },
            ttl=_STATUS_TTL,
        )

    async with async_session_factory() as session:
        try:
            # Mark as running
            started = datetime.now(tz=timezone.utc)
            await _update_job(
                session,
                CrawlerStatus.running,
                started_at=started,
            )

            crawler = CrawlerClass()

            # Check stop flag before starting
            should_stop = await redis_cache.exists(stop_key)
            if should_stop:
                await _update_job(
                    session,
                    CrawlerStatus.cancelled,
                    completed_at=datetime.now(tz=timezone.utc),
                )
                return

            if brands:
                # Targeted crawl for specific brands
                total = len(brands)
                await _update_job(session, CrawlerStatus.running, total_items=total)
                for i, brand_slug in enumerate(brands):
                    should_stop = await redis_cache.exists(stop_key)
                    if should_stop:
                        await _update_job(
                            session,
                            CrawlerStatus.cancelled,
                            progress=round(i / total, 4),
                            items_crawled=i,
                            total_items=total,
                            completed_at=datetime.now(tz=timezone.utc),
                        )
                        return
                    await crawler.crawl_brand(brand_slug)
                    pct = round((i + 1) / total, 4)
                    await _update_job(
                        session,
                        CrawlerStatus.running,
                        progress=pct,
                        items_crawled=i + 1,
                        total_items=total,
                    )
            else:
                # Full source crawl
                stats = await crawler.crawl()
                total = stats.generations_found or stats.models_found or 1
                await _update_job(
                    session,
                    CrawlerStatus.running,
                    progress=1.0,
                    items_crawled=total,
                    total_items=total,
                )

            await _update_job(
                session,
                CrawlerStatus.completed,
                progress=1.0,
                completed_at=datetime.now(tz=timezone.utc),
            )
            logger.info(
                "crawl_job_completed",
                job_id=job_id,
                source=source,
            )

        except Exception as exc:
            logger.exception("crawl_job_failed", job_id=job_id, source=source, error=str(exc))
            try:
                await _update_job(
                    session,
                    CrawlerStatus.failed,
                    error=str(exc)[:2048],
                    completed_at=datetime.now(tz=timezone.utc),
                )
            except Exception:
                pass
        finally:
            await redis_cache.delete(stop_key)


# ── Routes ────────────────────────────────────────────────────────────────────


@router.post(
    "/start",
    response_model=list[CrawlJobResponse],
    status_code=status.HTTP_202_ACCEPTED,
    summary="Start one or more crawler jobs (admin only)",
)
async def start_crawl(
    request: StartCrawlRequest,
    background_tasks: BackgroundTasks,
    db: DBSession,
    cache: CacheClient,
    current_user: AdminUser,
) -> list[CrawlJobResponse]:
    """
    Create CrawlerJob records in PostgreSQL, enqueue them in Redis, and
    launch background tasks for each requested source.
    Returns the list of created job objects.
    """
    sources = _source_list(request.sources)
    if not sources:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid crawl sources provided.",
        )

    created_jobs: list[CrawlerJob] = []

    for source in sources:
        job = CrawlerJob(
            source=source,
            job_type="full" if not request.brands else "targeted",
            status=CrawlerStatus.pending,
            progress=0.0,
            total_items=0,
            items_crawled=0,
            metadata={
                "brands": request.brands,
                "full_refresh": request.full_refresh,
                "requested_by": current_user.id,
            },
        )
        db.add(job)
        await db.flush()  # populate job.id before background task
        await db.refresh(job)
        created_jobs.append(job)

        # Enqueue to Redis (lightweight queue entry)
        await cache.enqueue(
            _JOB_QUEUE,
            {
                "job_id": job.id,
                "source": source,
                "brands": request.brands,
                "full_refresh": request.full_refresh,
            },
        )

        # Fire background task
        background_tasks.add_task(
            _run_crawl_job,
            job_id=job.id,
            source=source,
            brands=request.brands,
            full_refresh=request.full_refresh,
        )

        logger.info(
            "crawl_job_created",
            job_id=job.id,
            source=source,
            brands=request.brands,
            requested_by=current_user.id,
        )

    await db.commit()
    return [_job_to_response(j) for j in created_jobs]


@router.get(
    "/status",
    summary="Get live status of all crawlers",
)
async def get_crawler_status(
    cache: CacheClient,
    current_user: AdminUser,
) -> dict[str, Any]:
    """
    Return the real-time status of every registered crawler source,
    sourced from Redis (falls back to 'idle' when no record exists).
    """
    all_sources = _source_list([CrawlSourceEnum.all])
    result: dict[str, Any] = {}

    for source in all_sources:
        # Scan Redis for the most recent job status for this source
        pattern = f"{_CRAWLER_STATUS_PREFIX}*"
        keys = await cache.keys_by_pattern(pattern)

        latest: dict[str, Any] | None = None
        for key in keys:
            data = await cache.get(key)
            if isinstance(data, dict) and data.get("source") == source:
                if latest is None or data.get("job_id", 0) > latest.get("job_id", 0):
                    latest = data

        result[source] = latest or {
            "source": source,
            "status": "idle",
            "progress": 0.0,
            "items_crawled": 0,
            "total_items": 0,
            "error": None,
        }

    return result


@router.get(
    "/jobs",
    response_model=list[CrawlJobResponse],
    summary="List crawl jobs with optional filters (admin only)",
)
async def list_crawler_jobs(
    db: DBSession,
    current_user: AdminUser,
    source: Optional[str] = Query(default=None, description="Filter by source name"),
    job_status: Optional[str] = Query(default=None, alias="status", description="Filter by status"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[CrawlJobResponse]:
    """
    Return a paginated list of CrawlerJob records, optionally filtered by
    source and/or status. Ordered newest first.
    """
    stmt = select(CrawlerJob).order_by(desc(CrawlerJob.created_at)).limit(limit).offset(offset)

    if source:
        stmt = stmt.where(CrawlerJob.source == source)

    if job_status:
        try:
            status_enum = CrawlerStatus(job_status)
            stmt = stmt.where(CrawlerJob.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Invalid status value '{job_status}'. "
                    f"Valid values: {[s.value for s in CrawlerStatus]}"
                ),
            )

    result = await db.execute(stmt)
    jobs = result.scalars().all()
    return [_job_to_response(j) for j in jobs]


@router.post(
    "/stop/{job_id}",
    summary="Request cancellation of a running crawl job (admin only)",
)
async def stop_crawl_job(
    job_id: str,
    db: DBSession,
    cache: CacheClient,
    current_user: AdminUser,
) -> dict[str, Any]:
    """
    Set a Redis stop-flag for the given job. The background worker polls
    this flag and will gracefully stop on its next iteration.
    Also marks the DB record as 'cancelled' if the job is still pending.
    """
    try:
        job_pk = int(job_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="job_id must be an integer.",
        )

    result = await db.execute(select(CrawlerJob).where(CrawlerJob.id == job_pk))
    job = result.scalar_one_or_none()

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Crawl job '{job_id}' not found.",
        )

    if job.status in (CrawlerStatus.completed, CrawlerStatus.failed, CrawlerStatus.cancelled):
        return {
            "job_id": job_id,
            "message": f"Job is already in terminal state: {job.status.value}",
            "status": job.status.value,
        }

    # Set the stop flag; background task will pick it up
    stop_key = f"{_CRAWLER_STOP_FLAG_PREFIX}{job_pk}"
    await cache.set(stop_key, {"requested_by": current_user.id}, ttl=600)

    # For jobs still pending (not yet started) cancel immediately
    if job.status == CrawlerStatus.pending:
        job.status = CrawlerStatus.cancelled
        job.completed_at = datetime.now(tz=timezone.utc)
        await db.commit()

    logger.info(
        "crawl_job_stop_requested",
        job_id=job_pk,
        source=job.source,
        requested_by=current_user.id,
    )

    return {
        "job_id": job_id,
        "message": "Stop signal sent. The job will terminate on its next checkpoint.",
        "status": job.status.value,
    }


@router.get(
    "/stats",
    response_model=CrawlStatsResponse,
    summary="Aggregated crawl statistics",
)
async def get_crawl_stats(
    db: DBSession,
    cache: CacheClient,
) -> CrawlStatsResponse:
    """
    Return high-level counts from PostgreSQL plus a live-status snapshot
    for each crawler source from Redis. No authentication required — useful
    for dashboard widgets.
    """
    cache_key = "cache:crawler:stats"
    cached = await cache.get(cache_key)
    if cached:
        return CrawlStatsResponse(**cached)

    # Parallel count queries
    brand_result = await db.execute(select(func.count()).select_from(Brand))
    model_result = await db.execute(select(func.count()).select_from(CarModel))
    gen_result = await db.execute(select(func.count()).select_from(Generation))
    img_result = await db.execute(select(func.count()).select_from(VehicleImage))
    job_result = await db.execute(select(func.count()).select_from(CrawlerJob))
    last_job_result = await db.execute(
        select(CrawlerJob.completed_at)
        .where(CrawlerJob.status == CrawlerStatus.completed)
        .order_by(desc(CrawlerJob.completed_at))
        .limit(1)
    )

    total_brands = brand_result.scalar() or 0
    total_models = model_result.scalar() or 0
    total_generations = gen_result.scalar() or 0
    total_images = img_result.scalar() or 0
    total_jobs = job_result.scalar() or 0
    last_job_row = last_job_result.scalar_one_or_none()
    last_crawl_at = last_job_row.isoformat() if last_job_row else None

    # Build per-source status map from Redis
    all_sources = _source_list([CrawlSourceEnum.all])
    sources_status: dict[str, Any] = {}
    for source in all_sources:
        pattern = f"{_CRAWLER_STATUS_PREFIX}*"
        keys = await cache.keys_by_pattern(pattern)
        latest: dict[str, Any] | None = None
        for key in keys:
            data = await cache.get(key)
            if isinstance(data, dict) and data.get("source") == source:
                if latest is None or data.get("job_id", 0) > latest.get("job_id", 0):
                    latest = data
        sources_status[source] = (latest or {}).get("status", "idle")

    response = CrawlStatsResponse(
        total_brands=total_brands,
        total_models=total_models,
        total_generations=total_generations,
        total_images=total_images,
        total_crawl_jobs=total_jobs,
        last_crawl_at=last_crawl_at,
        sources_status=sources_status,
    )

    await cache.set(cache_key, response.model_dump(), ttl=60)
    return response


@router.get(
    "/jobs/{job_id}",
    response_model=CrawlJobResponse,
    summary="Get details for a specific crawl job (admin only)",
)
async def get_job_detail(
    job_id: str,
    db: DBSession,
    cache: CacheClient,
    current_user: AdminUser,
) -> CrawlJobResponse:
    """
    Return full details for a crawl job. For running jobs, the progress
    field reflects the latest value from Redis (updated in real time by
    the background worker).
    """
    try:
        job_pk = int(job_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="job_id must be an integer.",
        )

    result = await db.execute(select(CrawlerJob).where(CrawlerJob.id == job_pk))
    job = result.scalar_one_or_none()

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Crawl job '{job_id}' not found.",
        )

    response = _job_to_response(job)

    # For running jobs, augment progress from Redis (more up-to-date than DB)
    if job.status == CrawlerStatus.running:
        status_key = f"{_CRAWLER_STATUS_PREFIX}{job_pk}"
        live = await cache.get(status_key)
        if isinstance(live, dict):
            response.progress = live.get("progress", response.progress)
            response.items_crawled = live.get("items_crawled", response.items_crawled)
            response.total_items = live.get("total_items", response.total_items)

    return response
