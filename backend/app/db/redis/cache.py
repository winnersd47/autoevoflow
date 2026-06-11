from __future__ import annotations

import asyncio
import contextlib
import json
import time
import uuid
from collections.abc import AsyncGenerator
from typing import Any

import structlog
from redis.asyncio import Redis, ConnectionPool
from redis.exceptions import LockError, RedisError

from app.core.config import settings

logger = structlog.get_logger(__name__)

_DEFAULT_TTL = 300  # 5 minutes


class RedisCache:
    """Async Redis wrapper with caching, pub/sub, queues, rate limiting, and distributed locks."""

    def __init__(self) -> None:
        self._pool: ConnectionPool | None = None
        self._client: Redis | None = None

    async def connect(self) -> None:
        self._pool = ConnectionPool.from_url(
            settings.REDIS_URL,
            max_connections=settings.REDIS_POOL_SIZE,
            decode_responses=True,
        )
        self._client = Redis(connection_pool=self._pool)
        await self._client.ping()
        logger.info("Redis connected", url=settings.REDIS_URL)

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
        if self._pool:
            await self._pool.aclose()

    def _r(self) -> Redis:
        if self._client is None:
            raise RuntimeError("Redis client not initialised. Call connect() first.")
        return self._client

    # ── Key / value ───────────────────────────────────────────────────────────

    async def get(self, key: str) -> Any | None:
        """Return the deserialised value for *key*, or None if missing."""
        raw = await self._r().get(key)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return raw

    async def set(
        self,
        key: str,
        value: Any,
        ttl: int | None = _DEFAULT_TTL,
    ) -> None:
        """Serialise *value* to JSON and store it with an optional TTL (seconds)."""
        serialised = json.dumps(value, default=str)
        if ttl:
            await self._r().setex(key, ttl, serialised)
        else:
            await self._r().set(key, serialised)

    async def delete(self, *keys: str) -> int:
        """Delete one or more keys. Returns the number of keys deleted."""
        return await self._r().delete(*keys)

    async def exists(self, key: str) -> bool:
        return bool(await self._r().exists(key))

    async def expire(self, key: str, ttl: int) -> None:
        await self._r().expire(key, ttl)

    async def get_or_set(
        self,
        key: str,
        factory: Any,  # async callable returning the value
        ttl: int | None = _DEFAULT_TTL,
    ) -> Any:
        """Return cached value if present, otherwise call *factory* and cache the result."""
        cached = await self.get(key)
        if cached is not None:
            return cached
        value = await factory() if asyncio.iscoroutinefunction(factory) else factory()
        await self.set(key, value, ttl)
        return value

    async def mget(self, keys: list[str]) -> list[Any | None]:
        """Fetch multiple keys in one round-trip."""
        raw_values = await self._r().mget(keys)
        result = []
        for raw in raw_values:
            if raw is None:
                result.append(None)
            else:
                try:
                    result.append(json.loads(raw))
                except (json.JSONDecodeError, TypeError):
                    result.append(raw)
        return result

    async def incr(self, key: str, amount: int = 1) -> int:
        return await self._r().incrby(key, amount)

    async def keys_by_pattern(self, pattern: str) -> list[str]:
        """SCAN for keys matching *pattern* (avoids KEYS in production)."""
        found: list[str] = []
        async for key in self._r().scan_iter(match=pattern, count=100):
            found.append(key)
        return found

    async def delete_by_pattern(self, pattern: str) -> int:
        """Delete all keys matching *pattern*. Returns count deleted."""
        keys = await self.keys_by_pattern(pattern)
        if not keys:
            return 0
        return await self._r().delete(*keys)

    # ── Pub / Sub ─────────────────────────────────────────────────────────────

    async def publish(self, channel: str, message: Any) -> int:
        """Publish a JSON-serialised message to *channel*."""
        payload = json.dumps(message, default=str)
        return await self._r().publish(channel, payload)

    @contextlib.asynccontextmanager
    async def subscribe(self, *channels: str) -> AsyncGenerator[Any, None]:
        """Async context manager that yields a PubSub object subscribed to *channels*."""
        pubsub = self._r().pubsub()
        await pubsub.subscribe(*channels)
        try:
            yield pubsub
        finally:
            await pubsub.unsubscribe(*channels)
            await pubsub.aclose()

    # ── Queue operations ──────────────────────────────────────────────────────

    async def enqueue(self, queue_name: str, item: Any) -> int:
        """Push *item* to the right end of a list queue."""
        return await self._r().rpush(queue_name, json.dumps(item, default=str))

    async def dequeue(
        self, queue_name: str, timeout: int = 0
    ) -> Any | None:
        """Blocking pop from the left end of the queue. Returns None on timeout."""
        result = await self._r().blpop(queue_name, timeout=timeout)
        if result is None:
            return None
        _, raw = result
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return raw

    async def queue_length(self, queue_name: str) -> int:
        return await self._r().llen(queue_name)

    # ── Rate limiter (sliding window) ─────────────────────────────────────────

    async def is_rate_limited(
        self,
        identifier: str,
        limit: int,
        window_seconds: int,
    ) -> tuple[bool, int]:
        """
        Sliding-window rate limiter.
        Returns (is_limited, current_count).
        """
        key = f"rate:{identifier}"
        now = time.time()
        window_start = now - window_seconds

        pipe = self._r().pipeline()
        pipe.zremrangebyscore(key, "-inf", window_start)
        pipe.zadd(key, {str(uuid.uuid4()): now})
        pipe.zcard(key)
        pipe.expire(key, window_seconds + 1)
        results = await pipe.execute()

        current_count: int = results[2]
        return current_count > limit, current_count

    # ── Distributed lock ──────────────────────────────────────────────────────

    @contextlib.asynccontextmanager
    async def lock(
        self,
        name: str,
        timeout: float = 10.0,
        blocking_timeout: float = 5.0,
    ) -> AsyncGenerator[None, None]:
        """
        Async distributed lock via Redis SET NX PX.
        Raises LockError if the lock cannot be acquired within *blocking_timeout*.
        """
        lock_key = f"lock:{name}"
        token = str(uuid.uuid4())
        acquired = False
        deadline = time.monotonic() + blocking_timeout

        while time.monotonic() < deadline:
            acquired = await self._r().set(
                lock_key, token, nx=True, px=int(timeout * 1000)
            )
            if acquired:
                break
            await asyncio.sleep(0.05)

        if not acquired:
            raise LockError(f"Could not acquire lock '{name}' within {blocking_timeout}s")

        try:
            yield
        finally:
            # Release only if we still own the lock (Lua script for atomicity)
            release_script = """
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
            """
            await self._r().eval(release_script, 1, lock_key, token)  # type: ignore[arg-type]

    # ── Cache invalidation helpers ────────────────────────────────────────────

    async def invalidate_brand(self, brand_id: int | None = None, slug: str | None = None) -> None:
        patterns = ["cache:brands:*"]
        if brand_id:
            patterns.append(f"cache:brand:{brand_id}*")
        if slug:
            patterns.append(f"cache:brand:slug:{slug}*")
        for pattern in patterns:
            await self.delete_by_pattern(pattern)

    async def invalidate_generation(self, generation_id: int) -> None:
        await self.delete_by_pattern(f"cache:generation:{generation_id}*")
        await self.delete_by_pattern("cache:search:*")


# Module-level singleton
redis_cache = RedisCache()
