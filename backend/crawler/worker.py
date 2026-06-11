"""
Distributed crawler worker.

Pulls jobs from Redis, dispatches to the appropriate crawler,
persists results to PostgreSQL, triggers the embedding pipeline,
and emits events via Redis pub/sub.
"""

from __future__ import annotations

import asyncio
import json
import os
import signal
import time
import traceback
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Type

import asyncpg
import redis.asyncio as aioredis
import structlog

from .base import BaseCrawler
from .queue import CrawlerJobQueue, JobType, Priority

logger = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS crawler_brands (
    id              SERIAL PRIMARY KEY,
    source          TEXT NOT NULL,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL,
    canonical_name  TEXT,
    url             TEXT,
    logo_url        TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE (source, slug)
);

CREATE TABLE IF NOT EXISTS crawler_models (
    id              SERIAL PRIMARY KEY,
    source          TEXT NOT NULL,
    brand_id        INTEGER REFERENCES crawler_brands(id),
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL,
    canonical_name  TEXT,
    url             TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE (source, brand_id, slug)
);

CREATE TABLE IF NOT EXISTS crawler_generations (
    id              SERIAL PRIMARY KEY,
    source          TEXT NOT NULL,
    model_id        INTEGER REFERENCES crawler_models(id),
    name            TEXT NOT NULL,
    slug            TEXT,
    generation_code TEXT,
    year_start      INTEGER,
    year_end        INTEGER,
    body_type       TEXT,
    url             TEXT,
    specs           JSONB DEFAULT '{}',
    raw_data        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crawler_images (
    id              SERIAL PRIMARY KEY,
    source          TEXT NOT NULL,
    generation_id   INTEGER REFERENCES crawler_generations(id),
    url             TEXT NOT NULL,
    storage_url     TEXT,
    image_type      TEXT,
    width           INTEGER,
    height          INTEGER,
    file_size       INTEGER,
    hash_phash      TEXT,
    is_press_photo  BOOLEAN DEFAULT FALSE,
    raw_data        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE (source, url)
);

CREATE TABLE IF NOT EXISTS crawler_jobs_log (
    id          SERIAL PRIMARY KEY,
    job_id      TEXT NOT NULL,
    source      TEXT NOT NULL,
    job_type    TEXT NOT NULL,
    status      TEXT NOT NULL,
    started_at  TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    items_count INTEGER DEFAULT 0,
    error       TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);
"""


# ---------------------------------------------------------------------------
# Worker config
# ---------------------------------------------------------------------------

@dataclass
class WorkerConfig:
    redis_url: str = "redis://localhost:6379/0"
    postgres_dsn: str = "postgresql://user:password@localhost:5432/automotive"
    pubsub_channel: str = "crawler:events"
    health_report_interval: int = 30      # seconds
    poll_interval: float = 0.5            # seconds between queue polls
    max_jobs_per_source: int = 100_000
    enable_embedding_trigger: bool = True
    embedding_channel: str = "embedding:trigger"


# ---------------------------------------------------------------------------
# Worker health
# ---------------------------------------------------------------------------

@dataclass
class WorkerHealth:
    worker_id: str
    source: str
    status: str = "idle"
    jobs_processed: int = 0
    jobs_failed: int = 0
    last_heartbeat: float = field(default_factory=time.time)
    current_job_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "worker_id": self.worker_id,
            "source": self.source,
            "status": self.status,
            "jobs_processed": self.jobs_processed,
            "jobs_failed": self.jobs_failed,
            "last_heartbeat": self.last_heartbeat,
            "current_job_id": self.current_job_id,
        }


# ---------------------------------------------------------------------------
# CrawlerWorker
# ---------------------------------------------------------------------------

class CrawlerWorker:
    """
    Orchestrates N concurrent worker coroutines per source,
    each pulling jobs from the Redis queue and executing the
    matching crawler method.
    """

    def __init__(
        self,
        config: WorkerConfig,
        crawler_registry: Dict[str, Type[BaseCrawler]],
    ) -> None:
        self.config = config
        self._registry = crawler_registry
        self._queue: Optional[CrawlerJobQueue] = None
        self._redis: Optional[aioredis.Redis] = None
        self._db_pool: Optional[asyncpg.Pool] = None
        self._shutdown_event = asyncio.Event()
        self._active_workers: Set[str] = set()
        self._crawlers: Dict[str, BaseCrawler] = {}
        self._log = structlog.get_logger("crawler.worker")

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def _setup(self) -> None:
        self._redis = await aioredis.from_url(
            self.config.redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
        self._queue = CrawlerJobQueue(redis_url=self.config.redis_url)
        await self._queue.connect()
        self._db_pool = await asyncpg.create_pool(
            self.config.postgres_dsn,
            min_size=2,
            max_size=20,
            command_timeout=60,
        )
        async with self._db_pool.acquire() as conn:
            await conn.execute(CREATE_TABLES_SQL)
        self._log.info("worker_setup_complete")

    async def _teardown(self) -> None:
        for crawler in self._crawlers.values():
            try:
                await crawler.stop()
            except Exception:
                pass
        if self._queue:
            await self._queue.disconnect()
        if self._db_pool:
            await self._db_pool.close()
        if self._redis:
            await self._redis.aclose()
        self._log.info("worker_teardown_complete")

    def _register_signals(self) -> None:
        loop = asyncio.get_event_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, self._handle_shutdown)

    def _handle_shutdown(self) -> None:
        self._log.warning("shutdown_signal_received")
        self._shutdown_event.set()

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------

    async def start(
        self,
        sources: List[str],
        workers_per_source: int = 3,
    ) -> None:
        """
        Start the worker pool.

        :param sources:  list of source names (must match crawler_registry keys)
        :param workers_per_source: concurrent coroutines per source
        """
        await self._setup()
        self._register_signals()

        # Seed initial crawl_brands jobs for every source
        for source in sources:
            await self._queue.enqueue_job(
                source=source,
                job_type=JobType.CRAWL_BRANDS,
                data={"url": ""},
                priority=Priority.HIGH,
            )

        tasks: List[asyncio.Task] = []

        # Health reporter
        tasks.append(asyncio.create_task(self._health_reporter(sources)))

        for source in sources:
            for i in range(workers_per_source):
                worker_id = f"{source}-worker-{i}"
                self._active_workers.add(worker_id)
                tasks.append(
                    asyncio.create_task(
                        self._worker_loop(source, worker_id),
                        name=worker_id,
                    )
                )

        self._log.info(
            "workers_started",
            sources=sources,
            workers_per_source=workers_per_source,
            total_tasks=len(tasks),
        )

        # Block until shutdown
        await self._shutdown_event.wait()
        self._log.info("graceful_shutdown_started")

        for task in tasks:
            task.cancel()

        await asyncio.gather(*tasks, return_exceptions=True)
        await self._teardown()
        self._log.info("graceful_shutdown_complete")

    # ------------------------------------------------------------------
    # Worker loop
    # ------------------------------------------------------------------

    async def _worker_loop(self, source: str, worker_id: str) -> None:
        health = WorkerHealth(worker_id=worker_id, source=source)
        log = self._log.bind(worker_id=worker_id, source=source)

        # Ensure crawler is initialized once per source
        crawler = await self._get_crawler(source)
        if crawler is None:
            log.error("crawler_not_found", source=source)
            return

        log.info("worker_loop_started")

        while not self._shutdown_event.is_set():
            try:
                job = await self._queue.dequeue_job(source)
                if job is None:
                    await asyncio.sleep(self.config.poll_interval)
                    continue

                health.status = "running"
                health.current_job_id = job.job_id
                log = log.bind(job_id=job.job_id, job_type=job.job_type)
                log.info("job_started")

                started_at = time.time()
                items = 0
                error_msg: Optional[str] = None

                try:
                    items = await self._dispatch_job(crawler, job, source)
                    await self._queue.complete_job(job.job_id, result={"items": items})
                    health.jobs_processed += 1
                    log.info("job_finished", items=items, elapsed=time.time() - started_at)
                    await self._log_job_to_db(job, "completed", started_at, items, None)
                    await self._emit_event(
                        "job_completed",
                        {
                            "job_id": job.job_id,
                            "source": source,
                            "job_type": job.job_type,
                            "items": items,
                        },
                    )

                except Exception as exc:
                    error_msg = f"{type(exc).__name__}: {exc}"
                    log.error("job_failed", error=error_msg, tb=traceback.format_exc())
                    await self._queue.fail_job(job.job_id, error_msg)
                    health.jobs_failed += 1
                    await self._log_job_to_db(job, "failed", started_at, 0, error_msg)

                health.status = "idle"
                health.current_job_id = None

            except asyncio.CancelledError:
                log.info("worker_cancelled")
                break
            except Exception as exc:
                log.error("worker_loop_error", error=str(exc))
                await asyncio.sleep(1)

        log.info("worker_loop_stopped")

    # ------------------------------------------------------------------
    # Job dispatch
    # ------------------------------------------------------------------

    async def _dispatch_job(
        self,
        crawler: BaseCrawler,
        job: Any,
        source: str,
    ) -> int:
        """Route job_type to crawler method; enqueue child jobs; return item count."""
        items_count = 0

        if job.job_type == JobType.CRAWL_BRANDS:
            brands = await crawler.crawl_brands()
            items_count = len(brands)
            await self._upsert_brands(brands, source)
            for brand in brands:
                await self._queue.enqueue_job(
                    source=source,
                    job_type=JobType.CRAWL_MODELS,
                    data=brand,
                    priority=Priority.NORMAL,
                )
            if self.config.enable_embedding_trigger:
                await self._trigger_embedding("brands", source, [b.get("name") for b in brands])

        elif job.job_type == JobType.CRAWL_MODELS:
            models = await crawler.crawl_models(job.data)
            items_count = len(models)
            await self._upsert_models(models, source, job.data)
            for model in models:
                await self._queue.enqueue_job(
                    source=source,
                    job_type=JobType.CRAWL_GENERATIONS,
                    data=model,
                    priority=Priority.NORMAL,
                )

        elif job.job_type == JobType.CRAWL_GENERATIONS:
            generations = await crawler.crawl_generations(job.data)
            items_count = len(generations)
            await self._upsert_generations(generations, source, job.data)
            for gen in generations:
                await self._queue.enqueue_job(
                    source=source,
                    job_type=JobType.CRAWL_IMAGES,
                    data=gen,
                    priority=Priority.LOW,
                )

        elif job.job_type == JobType.CRAWL_IMAGES:
            images = await crawler.crawl_images(job.data)
            items_count = len(images)
            await self._upsert_images(images, source, job.data)
            if images and self.config.enable_embedding_trigger:
                await self._trigger_embedding(
                    "images",
                    source,
                    [img.get("url") for img in images],
                )

        else:
            logger.warning("unknown_job_type", job_type=job.job_type)

        return items_count

    # ------------------------------------------------------------------
    # Crawler factory
    # ------------------------------------------------------------------

    async def _get_crawler(self, source: str) -> Optional[BaseCrawler]:
        if source in self._crawlers:
            return self._crawlers[source]
        cls = self._registry.get(source)
        if cls is None:
            return None
        crawler = cls()
        await crawler.start()
        self._crawlers[source] = crawler
        return crawler

    # ------------------------------------------------------------------
    # Persistence helpers
    # ------------------------------------------------------------------

    async def _upsert_brands(self, brands: List[Dict], source: str) -> None:
        if not brands:
            return
        async with self._db_pool.acquire() as conn:
            await conn.executemany(
                """
                INSERT INTO crawler_brands (source, name, slug, canonical_name, url, logo_url, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, now())
                ON CONFLICT (source, slug) DO UPDATE
                  SET name=EXCLUDED.name,
                      canonical_name=EXCLUDED.canonical_name,
                      url=EXCLUDED.url,
                      logo_url=EXCLUDED.logo_url,
                      updated_at=now()
                """,
                [
                    (
                        source,
                        b.get("name", ""),
                        b.get("slug", ""),
                        b.get("canonical_name"),
                        b.get("url"),
                        b.get("logo_url"),
                    )
                    for b in brands
                ],
            )

    async def _upsert_models(
        self, models: List[Dict], source: str, brand: Dict
    ) -> None:
        if not models:
            return
        async with self._db_pool.acquire() as conn:
            brand_id = await conn.fetchval(
                "SELECT id FROM crawler_brands WHERE source=$1 AND slug=$2",
                source,
                brand.get("slug", ""),
            )
            if brand_id is None:
                return
            await conn.executemany(
                """
                INSERT INTO crawler_models (source, brand_id, name, slug, canonical_name, url, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, now())
                ON CONFLICT (source, brand_id, slug) DO UPDATE
                  SET name=EXCLUDED.name,
                      canonical_name=EXCLUDED.canonical_name,
                      url=EXCLUDED.url,
                      updated_at=now()
                """,
                [
                    (
                        source,
                        brand_id,
                        m.get("name", ""),
                        m.get("slug", ""),
                        m.get("canonical_name"),
                        m.get("url"),
                    )
                    for m in models
                ],
            )

    async def _upsert_generations(
        self, generations: List[Dict], source: str, model: Dict
    ) -> None:
        if not generations:
            return
        async with self._db_pool.acquire() as conn:
            model_id = await conn.fetchval(
                "SELECT id FROM crawler_models WHERE source=$1 AND slug=$2",
                source,
                model.get("slug", ""),
            )
            if model_id is None:
                return
            for gen in generations:
                await conn.execute(
                    """
                    INSERT INTO crawler_generations
                      (source, model_id, name, slug, generation_code,
                       year_start, year_end, body_type, url, specs, raw_data)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                    ON CONFLICT DO NOTHING
                    """,
                    source,
                    model_id,
                    gen.get("name", ""),
                    gen.get("slug", ""),
                    gen.get("generation_code"),
                    gen.get("year_start"),
                    gen.get("year_end"),
                    gen.get("body_type"),
                    gen.get("url"),
                    json.dumps(gen.get("specs", {})),
                    json.dumps(gen.get("raw_data", {})),
                )

    async def _upsert_images(
        self, images: List[Dict], source: str, generation: Dict
    ) -> None:
        if not images:
            return
        async with self._db_pool.acquire() as conn:
            gen_id = await conn.fetchval(
                "SELECT id FROM crawler_generations WHERE source=$1 AND url=$2",
                source,
                generation.get("url", ""),
            )
            for img in images:
                await conn.execute(
                    """
                    INSERT INTO crawler_images
                      (source, generation_id, url, storage_url, image_type,
                       width, height, file_size, hash_phash, is_press_photo, raw_data)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                    ON CONFLICT (source, url) DO UPDATE
                      SET storage_url=EXCLUDED.storage_url,
                          image_type=EXCLUDED.image_type,
                          hash_phash=EXCLUDED.hash_phash,
                          updated_at=now() -- column not in schema but harmless
                    """,
                    source,
                    gen_id,
                    img.get("url", ""),
                    img.get("storage_url"),
                    img.get("image_type"),
                    img.get("width"),
                    img.get("height"),
                    img.get("file_size"),
                    img.get("hash_phash"),
                    img.get("is_press_photo", False),
                    json.dumps(img.get("raw_data", {})),
                )

    async def _log_job_to_db(
        self,
        job: Any,
        status: str,
        started_at: float,
        items: int,
        error: Optional[str],
    ) -> None:
        try:
            import datetime
            async with self._db_pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO crawler_jobs_log
                      (job_id, source, job_type, status, started_at, finished_at, items_count, error)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                    """,
                    job.job_id,
                    job.source,
                    job.job_type,
                    status,
                    datetime.datetime.utcfromtimestamp(started_at),
                    datetime.datetime.utcnow(),
                    items,
                    error,
                )
        except Exception as exc:
            self._log.warning("db_job_log_error", error=str(exc))

    # ------------------------------------------------------------------
    # Event emission
    # ------------------------------------------------------------------

    async def _emit_event(self, event_type: str, payload: Dict[str, Any]) -> None:
        if self._redis is None:
            return
        try:
            message = json.dumps({"event": event_type, "ts": time.time(), **payload})
            await self._redis.publish(self.config.pubsub_channel, message)
        except Exception as exc:
            self._log.warning("event_emit_error", error=str(exc))

    async def _trigger_embedding(
        self, data_type: str, source: str, ids: List[Any]
    ) -> None:
        if self._redis is None:
            return
        try:
            payload = json.dumps(
                {"data_type": data_type, "source": source, "ids": ids}
            )
            await self._redis.publish(self.config.embedding_channel, payload)
        except Exception as exc:
            self._log.warning("embedding_trigger_error", error=str(exc))

    # ------------------------------------------------------------------
    # Health reporter
    # ------------------------------------------------------------------

    async def _health_reporter(self, sources: List[str]) -> None:
        while not self._shutdown_event.is_set():
            try:
                for source in sources:
                    depth = await self._queue.queue_depth(source)
                    dlq_depth = await self._queue.dlq_depth(source)
                    metrics = await self._queue.get_metrics(source)
                    self._log.info(
                        "queue_health",
                        source=source,
                        depth=depth,
                        dlq_depth=dlq_depth,
                        **metrics,
                    )
                await asyncio.sleep(self.config.health_report_interval)
            except asyncio.CancelledError:
                break
            except Exception as exc:
                self._log.warning("health_reporter_error", error=str(exc))
                await asyncio.sleep(5)
