"""
Redis-based job queue for the automotive crawler system.

Features:
- Priority queue (ZSET-backed)
- Dead-letter queue for failed jobs
- Job deduplication with configurable TTL
- Atomic state transitions via Lua scripts
- Queue-depth and processing-rate metrics
"""

from __future__ import annotations

import asyncio
import json
import time
import uuid
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import redis.asyncio as aioredis
import structlog

logger = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

QUEUE_PREFIX = "crawler:queue"
JOB_PREFIX = "crawler:job"
DEDUP_PREFIX = "crawler:dedup"
DLQ_PREFIX = "crawler:dlq"
METRICS_PREFIX = "crawler:metrics"

DEFAULT_DEDUP_TTL = 86_400          # 24 h
DEFAULT_JOB_TTL = 604_800           # 7 days
MAX_RETRIES_BEFORE_DLQ = 3


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    DEAD = "dead"


class JobType(str, Enum):
    CRAWL_BRANDS = "crawl_brands"
    CRAWL_MODELS = "crawl_models"
    CRAWL_GENERATIONS = "crawl_generations"
    CRAWL_IMAGES = "crawl_images"
    CRAWL_ARTICLE = "crawl_article"
    CRAWL_SPECS = "crawl_specs"


# ---------------------------------------------------------------------------
# Priority constants (lower = higher priority)
# ---------------------------------------------------------------------------

class Priority(int, Enum):
    CRITICAL = 0
    HIGH = 10
    NORMAL = 50
    LOW = 100


# ---------------------------------------------------------------------------
# Job model
# ---------------------------------------------------------------------------

class CrawlerJob:
    __slots__ = (
        "job_id", "source", "job_type", "data", "status",
        "priority", "created_at", "updated_at", "started_at",
        "completed_at", "progress", "total", "result",
        "error", "retry_count",
    )

    def __init__(
        self,
        source: str,
        job_type: str,
        data: Dict[str, Any],
        priority: int = Priority.NORMAL,
        job_id: Optional[str] = None,
    ) -> None:
        self.job_id = job_id or str(uuid.uuid4())
        self.source = source
        self.job_type = job_type
        self.data = data
        self.status = JobStatus.PENDING
        self.priority = priority
        now = time.time()
        self.created_at = now
        self.updated_at = now
        self.started_at: Optional[float] = None
        self.completed_at: Optional[float] = None
        self.progress: int = 0
        self.total: int = 0
        self.result: Optional[Any] = None
        self.error: Optional[str] = None
        self.retry_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "job_id": self.job_id,
            "source": self.source,
            "job_type": self.job_type,
            "data": self.data,
            "status": self.status,
            "priority": self.priority,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "progress": self.progress,
            "total": self.total,
            "result": self.result,
            "error": self.error,
            "retry_count": self.retry_count,
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "CrawlerJob":
        job = cls.__new__(cls)
        for k in cls.__slots__:
            setattr(job, k, d.get(k))
        return job

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), default=str)

    @classmethod
    def from_json(cls, s: str) -> "CrawlerJob":
        return cls.from_dict(json.loads(s))


# ---------------------------------------------------------------------------
# Lua scripts for atomic operations
# ---------------------------------------------------------------------------

_LUA_ENQUEUE = """
local dedup_key = KEYS[1]
local queue_key = KEYS[2]
local job_key   = KEYS[3]
local job_id    = ARGV[1]
local payload   = ARGV[2]
local score     = tonumber(ARGV[3])
local dedup_ttl = tonumber(ARGV[4])
local job_ttl   = tonumber(ARGV[5])

if redis.call('EXISTS', dedup_key) == 1 then
    return 0
end
redis.call('SET', dedup_key, job_id, 'EX', dedup_ttl)
redis.call('ZADD', queue_key, score, job_id)
redis.call('SET', job_key, payload, 'EX', job_ttl)
return 1
"""

_LUA_DEQUEUE = """
local queue_key = KEYS[1]
local now       = tonumber(ARGV[1])
local results   = redis.call('ZRANGEBYSCORE', queue_key, '-inf', now, 'LIMIT', 0, 1)
if #results == 0 then return nil end
local job_id = results[1]
redis.call('ZREM', queue_key, job_id)
return job_id
"""


# ---------------------------------------------------------------------------
# CrawlerJobQueue
# ---------------------------------------------------------------------------

class CrawlerJobQueue:
    """
    Redis-backed priority job queue for the crawler system.

    Queue key:   crawler:queue:<source>          (sorted set, score = priority + ts_fraction)
    Job key:     crawler:job:<job_id>            (hash/string)
    Dedup key:   crawler:dedup:<source>:<url_hash>
    DLQ key:     crawler:dlq:<source>            (list)
    Metrics key: crawler:metrics:<source>        (hash)
    """

    def __init__(
        self,
        redis_url: str = "redis://localhost:6379/0",
        dedup_ttl: int = DEFAULT_DEDUP_TTL,
        job_ttl: int = DEFAULT_JOB_TTL,
    ) -> None:
        self._redis_url = redis_url
        self._dedup_ttl = dedup_ttl
        self._job_ttl = job_ttl
        self._redis: Optional[aioredis.Redis] = None
        self._enqueue_script: Optional[Any] = None
        self._dequeue_script: Optional[Any] = None
        self._log = structlog.get_logger("crawler.queue")

    async def connect(self) -> None:
        self._redis = await aioredis.from_url(
            self._redis_url,
            encoding="utf-8",
            decode_responses=True,
            max_connections=20,
        )
        self._enqueue_script = self._redis.register_script(_LUA_ENQUEUE)
        self._dequeue_script = self._redis.register_script(_LUA_DEQUEUE)
        self._log.info("queue_connected", url=self._redis_url)

    async def disconnect(self) -> None:
        if self._redis:
            await self._redis.aclose()
            self._log.info("queue_disconnected")

    # ------------------------------------------------------------------
    # Dedup key construction
    # ------------------------------------------------------------------

    def _dedup_key(self, source: str, data: Dict[str, Any]) -> str:
        import hashlib, json as _json
        raw = _json.dumps({"source": source, **data}, sort_keys=True)
        h = hashlib.sha256(raw.encode()).hexdigest()[:16]
        return f"{DEDUP_PREFIX}:{source}:{h}"

    def _queue_key(self, source: str) -> str:
        return f"{QUEUE_PREFIX}:{source}"

    def _job_key(self, job_id: str) -> str:
        return f"{JOB_PREFIX}:{job_id}"

    def _dlq_key(self, source: str) -> str:
        return f"{DLQ_PREFIX}:{source}"

    def _metrics_key(self, source: str) -> str:
        return f"{METRICS_PREFIX}:{source}"

    # ------------------------------------------------------------------
    # Enqueue
    # ------------------------------------------------------------------

    async def enqueue_job(
        self,
        source: str,
        job_type: str,
        data: Dict[str, Any],
        priority: int = Priority.NORMAL,
        dedup_key_override: Optional[str] = None,
    ) -> Optional[CrawlerJob]:
        """
        Enqueue a job. Returns the job if enqueued, None if deduplicated.

        The sorted-set score = priority * 1e12 + unix_timestamp (ms)
        so within the same priority, older jobs are processed first.
        """
        job = CrawlerJob(source=source, job_type=job_type, data=data, priority=priority)
        dedup_k = dedup_key_override or self._dedup_key(source, data)
        queue_k = self._queue_key(source)
        job_k = self._job_key(job.job_id)
        # Score: priority bucket * 1e12 + ms timestamp for FIFO within priority
        score = priority * 1_000_000_000_000 + int(time.time() * 1000)

        result = await self._enqueue_script(
            keys=[dedup_k, queue_k, job_k],
            args=[
                job.job_id,
                job.to_json(),
                score,
                self._dedup_ttl,
                self._job_ttl,
            ],
        )

        if result == 0:
            self._log.debug("job_deduplicated", source=source, job_type=job_type)
            return None

        await self._redis.hincrby(self._metrics_key(source), "enqueued", 1)
        self._log.info(
            "job_enqueued",
            job_id=job.job_id,
            source=source,
            job_type=job_type,
            priority=priority,
        )
        return job

    # ------------------------------------------------------------------
    # Dequeue
    # ------------------------------------------------------------------

    async def dequeue_job(self, source: str) -> Optional[CrawlerJob]:
        """
        Atomically pop the highest-priority (lowest-score) job from the queue.
        """
        queue_k = self._queue_key(source)
        now_score = int(time.time() * 1_000_000_000_000) + Priority.LOW * 1_000_000_000_000

        job_id = await self._dequeue_script(
            keys=[queue_k],
            args=[now_score],
        )
        if not job_id:
            return None

        job_json = await self._redis.get(self._job_key(job_id))
        if not job_json:
            self._log.warning("job_data_missing", job_id=job_id)
            return None

        job = CrawlerJob.from_json(job_json)
        job.status = JobStatus.RUNNING
        job.started_at = time.time()
        job.updated_at = job.started_at
        await self._redis.set(self._job_key(job_id), job.to_json(), ex=self._job_ttl)
        await self._redis.hincrby(self._metrics_key(source), "dequeued", 1)

        self._log.info("job_dequeued", job_id=job_id, source=source, job_type=job.job_type)
        return job

    # ------------------------------------------------------------------
    # Job state updates
    # ------------------------------------------------------------------

    async def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        raw = await self._redis.get(self._job_key(job_id))
        if not raw:
            return None
        return json.loads(raw)

    async def update_job_progress(
        self, job_id: str, progress: int, total: int
    ) -> None:
        raw = await self._redis.get(self._job_key(job_id))
        if not raw:
            return
        job = CrawlerJob.from_json(raw)
        job.progress = progress
        job.total = total
        job.updated_at = time.time()
        await self._redis.set(self._job_key(job_id), job.to_json(), ex=self._job_ttl)

    async def complete_job(self, job_id: str, result: Any = None) -> None:
        raw = await self._redis.get(self._job_key(job_id))
        if not raw:
            return
        job = CrawlerJob.from_json(raw)
        job.status = JobStatus.COMPLETED
        now = time.time()
        job.completed_at = now
        job.updated_at = now
        job.result = result
        await self._redis.set(self._job_key(job_id), job.to_json(), ex=self._job_ttl)
        if job.source:
            await self._redis.hincrby(self._metrics_key(job.source), "completed", 1)
        self._log.info("job_completed", job_id=job_id)

    async def fail_job(self, job_id: str, error: str) -> None:
        raw = await self._redis.get(self._job_key(job_id))
        if not raw:
            return
        job = CrawlerJob.from_json(raw)
        job.retry_count = (job.retry_count or 0) + 1
        job.error = error
        job.updated_at = time.time()

        if job.retry_count > MAX_RETRIES_BEFORE_DLQ:
            await self._move_to_dlq(job)
        else:
            # Re-enqueue with delay (exponential backoff via score)
            delay_sec = min(30 * (2 ** (job.retry_count - 1)), 3600)
            retry_at = time.time() + delay_sec
            score = job.priority * 1_000_000_000_000 + int(retry_at * 1000)
            job.status = JobStatus.PENDING
            await self._redis.set(self._job_key(job_id), job.to_json(), ex=self._job_ttl)
            await self._redis.zadd(self._queue_key(job.source), {job_id: score})
            self._log.warning(
                "job_retry_scheduled",
                job_id=job_id,
                retry_count=job.retry_count,
                delay_sec=delay_sec,
            )

        if job.source:
            await self._redis.hincrby(self._metrics_key(job.source), "failed", 1)

    async def _move_to_dlq(self, job: CrawlerJob) -> None:
        job.status = JobStatus.DEAD
        job.updated_at = time.time()
        await self._redis.set(self._job_key(job.job_id), job.to_json(), ex=self._job_ttl)
        await self._redis.lpush(self._dlq_key(job.source), job.job_id)
        await self._redis.hincrby(self._metrics_key(job.source), "dead", 1)
        self._log.error(
            "job_moved_to_dlq",
            job_id=job.job_id,
            source=job.source,
            error=job.error,
        )

    # ------------------------------------------------------------------
    # Inspection & metrics
    # ------------------------------------------------------------------

    async def queue_depth(self, source: str) -> int:
        return await self._redis.zcard(self._queue_key(source))

    async def dlq_depth(self, source: str) -> int:
        return await self._redis.llen(self._dlq_key(source))

    async def get_metrics(self, source: str) -> Dict[str, int]:
        raw = await self._redis.hgetall(self._metrics_key(source))
        return {k: int(v) for k, v in raw.items()}

    async def peek_queue(self, source: str, count: int = 10) -> List[Dict[str, Any]]:
        """Return up to `count` pending jobs without removing them."""
        job_ids = await self._redis.zrange(self._queue_key(source), 0, count - 1)
        jobs = []
        for job_id in job_ids:
            raw = await self._redis.get(self._job_key(job_id))
            if raw:
                jobs.append(json.loads(raw))
        return jobs

    async def replay_dlq(self, source: str, limit: int = 100) -> int:
        """Move up to `limit` dead jobs back to the pending queue."""
        replayed = 0
        for _ in range(limit):
            job_id = await self._redis.rpoplpush(
                self._dlq_key(source), "__tmp__"
            )
            if not job_id:
                break
            raw = await self._redis.get(self._job_key(job_id))
            if not raw:
                continue
            job = CrawlerJob.from_json(raw)
            job.status = JobStatus.PENDING
            job.retry_count = 0
            job.error = None
            job.updated_at = time.time()
            score = job.priority * 1_000_000_000_000 + int(time.time() * 1000)
            await self._redis.set(self._job_key(job_id), job.to_json(), ex=self._job_ttl)
            await self._redis.zadd(self._queue_key(source), {job_id: score})
            replayed += 1
        # clean temp list if something went wrong
        await self._redis.delete("__tmp__")
        self._log.info("dlq_replayed", source=source, count=replayed)
        return replayed

    async def flush_source(self, source: str) -> None:
        """Remove all pending jobs for a source (admin use)."""
        await self._redis.delete(self._queue_key(source))
        self._log.warning("queue_flushed", source=source)
