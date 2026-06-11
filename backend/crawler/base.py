"""
Abstract base crawler class for the automotive AI platform.

Provides async session management, rate limiting, retry logic,
proxy rotation, user-agent rotation, cookie management, response
caching, metrics tracking, structured logging, and a Playwright
browser pool.
"""

from __future__ import annotations

import asyncio
import hashlib
import random
import re
import time
from abc import ABC, abstractmethod
from collections import defaultdict
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse

import aiohttp
import structlog
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright, Browser, BrowserContext, Page, Playwright
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
    before_sleep_log,
    RetryError,
)

logger = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class CrawlerMetrics:
    requests_made: int = 0
    errors: int = 0
    items_scraped: int = 0
    cache_hits: int = 0
    retries: int = 0
    bytes_downloaded: int = 0

    def as_dict(self) -> Dict[str, int]:
        return {
            "requests_made": self.requests_made,
            "errors": self.errors,
            "items_scraped": self.items_scraped,
            "cache_hits": self.cache_hits,
            "retries": self.retries,
            "bytes_downloaded": self.bytes_downloaded,
        }


@dataclass
class CrawlerConfig:
    source_name: str
    base_url: str
    rate_limit_rps: float = 1.0          # requests per second per domain
    max_retries: int = 5
    retry_min_wait: float = 1.0
    retry_max_wait: float = 60.0
    request_timeout: int = 30
    playwright_timeout: int = 45_000     # ms
    max_concurrent_requests: int = 5
    cache_ttl: int = 3600                # seconds
    proxies: List[str] = field(default_factory=list)
    use_playwright: bool = False
    browser_pool_size: int = 3
    cookies: Dict[str, str] = field(default_factory=dict)
    extra_headers: Dict[str, str] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Token-bucket rate limiter (per domain)
# ---------------------------------------------------------------------------

class TokenBucket:
    """Thread-safe async token bucket for rate limiting."""

    def __init__(self, rate: float, capacity: float | None = None) -> None:
        self._rate = rate                          # tokens per second
        self._capacity = capacity or max(rate, 1.0)
        self._tokens = self._capacity
        self._last_refill = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self._last_refill
            self._tokens = min(self._capacity, self._tokens + elapsed * self._rate)
            self._last_refill = now
            if self._tokens < 1.0:
                wait = (1.0 - self._tokens) / self._rate
                await asyncio.sleep(wait)
                self._tokens = 0.0
            else:
                self._tokens -= 1.0


# ---------------------------------------------------------------------------
# Browser pool
# ---------------------------------------------------------------------------

class BrowserPool:
    """Pool of Playwright browser contexts for concurrent scraping."""

    def __init__(self, size: int = 3, headless: bool = True) -> None:
        self._size = size
        self._headless = headless
        self._playwright: Optional[Playwright] = None
        self._browser: Optional[Browser] = None
        self._contexts: asyncio.Queue[BrowserContext] = asyncio.Queue()
        self._initialized = False

    async def initialize(self, user_agents: List[str]) -> None:
        if self._initialized:
            return
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(
            headless=self._headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
        )
        for i in range(self._size):
            ua = user_agents[i % len(user_agents)]
            ctx = await self._browser.new_context(
                user_agent=ua,
                viewport={"width": 1920, "height": 1080},
                locale="en-US",
                timezone_id="America/New_York",
            )
            await self._contexts.put(ctx)
        self._initialized = True
        logger.info("browser_pool_initialized", size=self._size)

    @asynccontextmanager
    async def acquire(self) -> AsyncIterator[BrowserContext]:
        ctx = await self._contexts.get()
        try:
            yield ctx
        finally:
            await self._contexts.put(ctx)

    async def close(self) -> None:
        while not self._contexts.empty():
            ctx = await self._contexts.get()
            await ctx.close()
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()
        self._initialized = False
        logger.info("browser_pool_closed")


# ---------------------------------------------------------------------------
# User-agent pool
# ---------------------------------------------------------------------------

USER_AGENTS: List[str] = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1",
]


# ---------------------------------------------------------------------------
# Simple in-process response cache
# ---------------------------------------------------------------------------

class ResponseCache:
    def __init__(self, ttl: int = 3600) -> None:
        self._store: Dict[str, Tuple[float, str]] = {}
        self._ttl = ttl

    def get(self, key: str) -> Optional[str]:
        entry = self._store.get(key)
        if entry is None:
            return None
        ts, content = entry
        if time.monotonic() - ts > self._ttl:
            del self._store[key]
            return None
        return content

    def set(self, key: str, content: str) -> None:
        self._store[key] = (time.monotonic(), content)

    def cache_key(self, url: str) -> str:
        return hashlib.md5(url.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Abstract base crawler
# ---------------------------------------------------------------------------

class BaseCrawler(ABC):
    """
    Abstract base class for all automotive source crawlers.

    Subclasses must implement:
        crawl_brands()
        crawl_models(brand)
        crawl_generations(model)
        crawl_images(generation)
    """

    def __init__(self, config: CrawlerConfig) -> None:
        self.config = config
        self.metrics = CrawlerMetrics()
        self._cache = ResponseCache(ttl=config.cache_ttl)
        self._browser_pool = BrowserPool(size=config.browser_pool_size)
        self._rate_limiters: Dict[str, TokenBucket] = defaultdict(
            lambda: TokenBucket(rate=config.rate_limit_rps)
        )
        self._semaphore = asyncio.Semaphore(config.max_concurrent_requests)
        self._session: Optional[aiohttp.ClientSession] = None
        self._proxy_index = 0
        self._log = structlog.get_logger(source=config.source_name)

    # ------------------------------------------------------------------
    # Abstract interface
    # ------------------------------------------------------------------

    @abstractmethod
    async def crawl_brands(self) -> List[Dict[str, Any]]:
        """Return list of brand dicts: {name, slug, url}"""

    @abstractmethod
    async def crawl_models(self, brand: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Return list of model dicts for a brand."""

    @abstractmethod
    async def crawl_generations(self, model: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Return list of generation dicts for a model."""

    @abstractmethod
    async def crawl_images(self, generation: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Return list of image dicts for a generation."""

    # ------------------------------------------------------------------
    # Session & lifecycle
    # ------------------------------------------------------------------

    async def start(self) -> None:
        """Initialize HTTP session and browser pool."""
        headers = {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            **self.config.extra_headers,
        }
        connector = aiohttp.TCPConnector(limit=self.config.max_concurrent_requests, ssl=False)
        timeout = aiohttp.ClientTimeout(total=self.config.request_timeout)
        self._session = aiohttp.ClientSession(
            headers=headers,
            connector=connector,
            timeout=timeout,
            cookie_jar=aiohttp.CookieJar(),
        )
        if self.config.cookies:
            for k, v in self.config.cookies.items():
                self._session.cookie_jar.update_cookies({k: v})

        if self.config.use_playwright:
            await self._browser_pool.initialize(USER_AGENTS)

        self._log.info("crawler_started", base_url=self.config.base_url)

    async def stop(self) -> None:
        """Cleanup resources."""
        if self._session and not self._session.closed:
            await self._session.close()
        if self.config.use_playwright:
            await self._browser_pool.close()
        self._log.info("crawler_stopped", metrics=self.metrics.as_dict())

    @asynccontextmanager
    async def managed(self) -> AsyncIterator["BaseCrawler"]:
        await self.start()
        try:
            yield self
        finally:
            await self.stop()

    # ------------------------------------------------------------------
    # Rate limiting & proxy helpers
    # ------------------------------------------------------------------

    def _domain_of(self, url: str) -> str:
        return urlparse(url).netloc

    def _next_proxy(self) -> Optional[str]:
        if not self.config.proxies:
            return None
        proxy = self.config.proxies[self._proxy_index % len(self.config.proxies)]
        self._proxy_index += 1
        return proxy

    def _random_user_agent(self) -> str:
        return random.choice(USER_AGENTS)

    async def _rate_limit(self, url: str) -> None:
        domain = self._domain_of(url)
        await self._rate_limiters[domain].acquire()

    # ------------------------------------------------------------------
    # Core HTTP fetch with retry
    # ------------------------------------------------------------------

    async def fetch_html(
        self,
        url: str,
        *,
        method: str = "GET",
        params: Optional[Dict] = None,
        data: Optional[Dict] = None,
        extra_headers: Optional[Dict] = None,
        bypass_cache: bool = False,
    ) -> str:
        """Fetch a URL and return HTML text. Applies rate limiting and retry."""
        cache_key = self._cache.cache_key(url)
        if not bypass_cache:
            cached = self._cache.get(cache_key)
            if cached is not None:
                self.metrics.cache_hits += 1
                return cached

        await self._rate_limit(url)

        async with self._semaphore:
            return await self._fetch_with_retry(
                url,
                method=method,
                params=params,
                data=data,
                extra_headers=extra_headers,
                cache_key=cache_key,
            )

    async def _fetch_with_retry(
        self,
        url: str,
        *,
        method: str,
        params: Optional[Dict],
        data: Optional[Dict],
        extra_headers: Optional[Dict],
        cache_key: str,
        _attempt: int = 0,
    ) -> str:
        max_retries = self.config.max_retries
        for attempt in range(max_retries + 1):
            try:
                headers = {"User-Agent": self._random_user_agent()}
                if extra_headers:
                    headers.update(extra_headers)
                proxy = self._next_proxy()
                async with self._session.request(
                    method,
                    url,
                    params=params,
                    data=data,
                    headers=headers,
                    proxy=proxy,
                    allow_redirects=True,
                ) as resp:
                    resp.raise_for_status()
                    content = await resp.text(errors="replace")
                    self.metrics.requests_made += 1
                    self.metrics.bytes_downloaded += len(content.encode())
                    self._cache.set(cache_key, content)
                    self._log.debug("fetch_ok", url=url, status=resp.status)
                    return content

            except aiohttp.ClientResponseError as exc:
                self._log.warning(
                    "http_error",
                    url=url,
                    status=exc.status,
                    attempt=attempt,
                )
                if exc.status in (403, 404, 410):
                    self.metrics.errors += 1
                    raise
                if attempt >= max_retries:
                    self.metrics.errors += 1
                    raise
                wait = min(
                    self.config.retry_min_wait * (2 ** attempt),
                    self.config.retry_max_wait,
                )
                self.metrics.retries += 1
                await asyncio.sleep(wait + random.uniform(0, 1))

            except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
                self._log.warning(
                    "network_error",
                    url=url,
                    error=str(exc),
                    attempt=attempt,
                )
                if attempt >= max_retries:
                    self.metrics.errors += 1
                    raise
                wait = min(
                    self.config.retry_min_wait * (2 ** attempt),
                    self.config.retry_max_wait,
                )
                self.metrics.retries += 1
                await asyncio.sleep(wait + random.uniform(0, 1))

        # Should not be reached
        raise RuntimeError(f"Exceeded retries for {url}")

    # ------------------------------------------------------------------
    # Playwright fetch
    # ------------------------------------------------------------------

    async def fetch_with_playwright(
        self,
        url: str,
        *,
        wait_selector: Optional[str] = None,
        wait_ms: int = 2000,
        scroll_to_bottom: bool = False,
        bypass_cache: bool = False,
    ) -> str:
        """Render page with Playwright and return HTML content."""
        cache_key = self._cache.cache_key(f"pw:{url}")
        if not bypass_cache:
            cached = self._cache.get(cache_key)
            if cached is not None:
                self.metrics.cache_hits += 1
                return cached

        await self._rate_limit(url)

        async with self._browser_pool.acquire() as ctx:
            page: Page = await ctx.new_page()
            try:
                await page.set_extra_http_headers(
                    {"User-Agent": self._random_user_agent()}
                )
                await page.goto(
                    url,
                    wait_until="domcontentloaded",
                    timeout=self.config.playwright_timeout,
                )
                if wait_selector:
                    await page.wait_for_selector(
                        wait_selector,
                        timeout=self.config.playwright_timeout,
                    )
                else:
                    await page.wait_for_timeout(wait_ms)

                if scroll_to_bottom:
                    await self._scroll_to_bottom(page)

                content = await page.content()
                self.metrics.requests_made += 1
                self.metrics.bytes_downloaded += len(content.encode())
                self._cache.set(cache_key, content)
                self._log.debug("playwright_fetch_ok", url=url)
                return content

            except Exception as exc:
                self.metrics.errors += 1
                self._log.error("playwright_fetch_error", url=url, error=str(exc))
                raise
            finally:
                await page.close()

    async def _scroll_to_bottom(self, page: Page) -> None:
        """Scroll to the bottom of the page to trigger lazy-loading."""
        prev_height = 0
        max_scrolls = 20
        for _ in range(max_scrolls):
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await page.wait_for_timeout(800)
            curr_height = await page.evaluate("document.body.scrollHeight")
            if curr_height == prev_height:
                break
            prev_height = curr_height

    # ------------------------------------------------------------------
    # Parsing helpers
    # ------------------------------------------------------------------

    def parse_soup(self, html: str, parser: str = "lxml") -> BeautifulSoup:
        return BeautifulSoup(html, parser)

    def parse_image_urls(
        self,
        soup: BeautifulSoup,
        base_url: str = "",
        min_width_hint: int = 0,
    ) -> List[str]:
        """
        Extract image URLs from a BeautifulSoup document.

        Checks <img src>, <img data-src>, <img data-lazy-src>,
        <a href> pointing to image files, and srcset attributes.
        """
        urls: List[str] = []
        seen: set = set()
        image_exts = {".jpg", ".jpeg", ".png", ".webp", ".avif"}

        def add(url: str) -> None:
            if not url or url.startswith("data:"):
                return
            full = urljoin(base_url, url) if base_url else url
            full = full.split("?")[0]  # strip query
            if full not in seen and any(full.lower().endswith(e) for e in image_exts):
                seen.add(full)
                urls.append(full)

        for img in soup.find_all("img"):
            for attr in ("src", "data-src", "data-lazy-src", "data-original", "data-full-size"):
                val = img.get(attr)
                if val:
                    add(val)
            srcset = img.get("srcset", "")
            if srcset:
                for part in srcset.split(","):
                    part = part.strip().split(" ")[0]
                    add(part)

        for a in soup.find_all("a", href=True):
            href = a["href"]
            if any(href.lower().endswith(e) for e in image_exts):
                add(href)

        for source in soup.find_all("source"):
            srcset = source.get("srcset", "")
            for part in srcset.split(","):
                part = part.strip().split(" ")[0]
                add(part)

        return urls

    def normalize_text(self, text: str) -> str:
        """Strip, collapse whitespace, and remove zero-width characters."""
        if not text:
            return ""
        text = re.sub(r"[​‌‍﻿]", "", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def extract_year(self, text: str) -> Optional[int]:
        """Extract the first 4-digit year (1886-2030) from text."""
        if not text:
            return None
        match = re.search(r"\b(1[89]\d{2}|20[0-2]\d)\b", text)
        return int(match.group(1)) if match else None

    def extract_year_range(self, text: str) -> Tuple[Optional[int], Optional[int]]:
        """Extract a year range like '2010-2015' or '2010–present'."""
        text = text.replace("–", "-").replace("—", "-")
        m = re.search(
            r"\b(1[89]\d{2}|20[0-2]\d)\s*[-–]\s*(1[89]\d{2}|20[0-2]\d|present|now)\b",
            text,
            re.IGNORECASE,
        )
        if m:
            start = int(m.group(1))
            end_str = m.group(2).lower()
            end = None if end_str in ("present", "now") else int(end_str)
            return start, end
        single = self.extract_year(text)
        return single, None

    def absolute_url(self, url: str, base: str | None = None) -> str:
        b = base or self.config.base_url
        return urljoin(b, url)

    def slug_from_url(self, url: str) -> str:
        """Return the last non-empty path segment of a URL as a slug."""
        parts = urlparse(url).path.rstrip("/").split("/")
        return parts[-1] if parts else ""
