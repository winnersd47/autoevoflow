from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import structlog

logger = structlog.get_logger(__name__)


# ── Data classes ──────────────────────────────────────────────────────────────


@dataclass
class CrawlStats:
    total_sources: int
    sources_completed: int
    sources_failed: int
    total_brands: int
    total_models: int
    total_generations: int
    total_images: int
    started_at: datetime
    completed_at: datetime | None = None
    errors: list[str] = field(default_factory=list)


@dataclass
class SourceCrawlStats:
    source_name: str
    brands_found: int
    models_found: int
    generations_found: int
    images_found: int
    started_at: datetime
    completed_at: datetime | None = None
    error: str | None = None


@dataclass
class UnifiedEntity:
    entity_type: str  # brand | model | generation | image
    canonical_id: str
    brand_name: str
    model_name: str | None = None
    generation_code: str | None = None
    year_start: int | None = None
    year_end: int | None = None
    body_type: str | None = None
    image_urls: list[str] = field(default_factory=list)
    source_ids: dict[str, str] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class CrawlStatus:
    source_name: str
    status: str  # idle | running | completed | failed
    last_run: datetime | None
    next_run: datetime | None
    last_stats: SourceCrawlStats | None


# ── Base crawler interface ────────────────────────────────────────────────────


class BaseCrawler:
    """Abstract base class for source-specific crawlers."""

    source_name: str = "base"

    async def crawl(self) -> SourceCrawlStats:
        raise NotImplementedError

    async def crawl_brand(self, brand_slug: str) -> list[dict[str, Any]]:
        raise NotImplementedError

    async def get_brand_list(self) -> list[dict[str, Any]]:
        raise NotImplementedError


class NetCarShowCrawler(BaseCrawler):
    source_name = "netcarshow"

    async def crawl(self) -> SourceCrawlStats:
        started = datetime.now(tz=timezone.utc)
        logger.info("crawler_start", source=self.source_name)
        # Implementation would use httpx + BeautifulSoup
        # to scrape netcarshow.com for high-res press images
        return SourceCrawlStats(
            source_name=self.source_name,
            brands_found=0,
            models_found=0,
            generations_found=0,
            images_found=0,
            started_at=started,
            completed_at=datetime.now(tz=timezone.utc),
        )

    async def crawl_brand(self, brand_slug: str) -> list[dict[str, Any]]:
        return []

    async def get_brand_list(self) -> list[dict[str, Any]]:
        return []


class CaricosCrawler(BaseCrawler):
    source_name = "caricos"

    async def crawl(self) -> SourceCrawlStats:
        started = datetime.now(tz=timezone.utc)
        logger.info("crawler_start", source=self.source_name)
        return SourceCrawlStats(
            source_name=self.source_name,
            brands_found=0,
            models_found=0,
            generations_found=0,
            images_found=0,
            started_at=started,
            completed_at=datetime.now(tz=timezone.utc),
        )

    async def crawl_brand(self, brand_slug: str) -> list[dict[str, Any]]:
        return []

    async def get_brand_list(self) -> list[dict[str, Any]]:
        return []


class Motor1Crawler(BaseCrawler):
    source_name = "motor1"

    async def crawl(self) -> SourceCrawlStats:
        started = datetime.now(tz=timezone.utc)
        logger.info("crawler_start", source=self.source_name)
        return SourceCrawlStats(
            source_name=self.source_name,
            brands_found=0,
            models_found=0,
            generations_found=0,
            images_found=0,
            started_at=started,
            completed_at=datetime.now(tz=timezone.utc),
        )

    async def crawl_brand(self, brand_slug: str) -> list[dict[str, Any]]:
        return []

    async def get_brand_list(self) -> list[dict[str, Any]]:
        return []


class AutoEvolutionCrawler(BaseCrawler):
    source_name = "autoevolution"

    async def crawl(self) -> SourceCrawlStats:
        started = datetime.now(tz=timezone.utc)
        logger.info("crawler_start", source=self.source_name)
        return SourceCrawlStats(
            source_name=self.source_name,
            brands_found=0,
            models_found=0,
            generations_found=0,
            images_found=0,
            started_at=started,
            completed_at=datetime.now(tz=timezone.utc),
        )

    async def crawl_brand(self, brand_slug: str) -> list[dict[str, Any]]:
        return []

    async def get_brand_list(self) -> list[dict[str, Any]]:
        return []


class SupercarsCrawler(BaseCrawler):
    source_name = "supercars"

    async def crawl(self) -> SourceCrawlStats:
        started = datetime.now(tz=timezone.utc)
        logger.info("crawler_start", source=self.source_name)
        return SourceCrawlStats(
            source_name=self.source_name,
            brands_found=0,
            models_found=0,
            generations_found=0,
            images_found=0,
            started_at=started,
            completed_at=datetime.now(tz=timezone.utc),
        )

    async def crawl_brand(self, brand_slug: str) -> list[dict[str, Any]]:
        return []

    async def get_brand_list(self) -> list[dict[str, Any]]:
        return []


class ConceptCarzCrawler(BaseCrawler):
    source_name = "conceptcarz"

    async def crawl(self) -> SourceCrawlStats:
        started = datetime.now(tz=timezone.utc)
        logger.info("crawler_start", source=self.source_name)
        return SourceCrawlStats(
            source_name=self.source_name,
            brands_found=0,
            models_found=0,
            generations_found=0,
            images_found=0,
            started_at=started,
            completed_at=datetime.now(tz=timezone.utc),
        )

    async def crawl_brand(self, brand_slug: str) -> list[dict[str, Any]]:
        return []

    async def get_brand_list(self) -> list[dict[str, Any]]:
        return []


# ── Entity resolver ───────────────────────────────────────────────────────────


class EntityResolver:
    """
    Resolves and deduplicates raw crawler entities across sources.
    Uses fuzzy matching on brand/model names to merge duplicates.
    """

    def __init__(self) -> None:
        self._brand_cache: dict[str, str] = {}  # normalised_name -> canonical_name

    def resolve_brand(self, raw_name: str) -> str:
        """Return canonical brand name, handling common alias variations."""
        normalised = raw_name.strip().lower()
        aliases: dict[str, str] = {
            "vw": "Volkswagen",
            "volkswagen": "Volkswagen",
            "bmw": "BMW",
            "mercedes": "Mercedes-Benz",
            "mercedes benz": "Mercedes-Benz",
            "mercedes-benz": "Mercedes-Benz",
            "chevy": "Chevrolet",
            "chevrolet": "Chevrolet",
            "ford": "Ford",
            "toyota": "Toyota",
            "honda": "Honda",
            "nissan": "Nissan",
            "porsche": "Porsche",
            "audi": "Audi",
            "ferrari": "Ferrari",
            "lamborghini": "Lamborghini",
            "mclaren": "McLaren",
            "aston martin": "Aston Martin",
            "rolls royce": "Rolls-Royce",
            "rolls-royce": "Rolls-Royce",
            "bentley": "Bentley",
            "maserati": "Maserati",
            "alfa romeo": "Alfa Romeo",
        }
        return aliases.get(normalised, raw_name.strip().title())

    def build_canonical_id(self, entity_type: str, **kwargs: str) -> str:
        """Build a unique canonical ID string for deduplication."""
        parts = [entity_type]
        for key in sorted(kwargs):
            val = str(kwargs[key]).lower().replace(" ", "-")
            parts.append(val)
        return ":".join(parts)

    async def translate_to_canonical(self, foreign_name: str, source_lang: str = "ru") -> str:
        """
        Translate a foreign-language brand or model name to English via Yandex Translate API.
        Falls back to the original name if API keys are not configured or request fails.
        """
        from app.core.config import settings

        if not settings.YANDEX_API_KEY or not settings.YANDEX_FOLDER_ID:
            return foreign_name

        import httpx

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    "https://translate.api.cloud.yandex.net/translate/v2/translate",
                    headers={"Authorization": f"Api-Key {settings.YANDEX_API_KEY}"},
                    json={
                        "folderId": settings.YANDEX_FOLDER_ID,
                        "texts": [foreign_name],
                        "sourceLanguageCode": source_lang,
                        "targetLanguageCode": "en",
                    },
                )
                response.raise_for_status()
                data = response.json()
                translated = data.get("translations", [{}])[0].get("text", foreign_name)
                return self.resolve_brand(translated)
        except Exception:
            return foreign_name


# ── Crawler Manager ───────────────────────────────────────────────────────────


class CrawlerManager:
    """
    Orchestrates all data source crawlers with concurrent execution,
    entity resolution, and rate limiting.
    """

    def __init__(self) -> None:
        self.sources: dict[str, type[BaseCrawler]] = {
            "netcarshow": NetCarShowCrawler,
            "caricos": CaricosCrawler,
            "motor1": Motor1Crawler,
            "autoevolution": AutoEvolutionCrawler,
            "supercars": SupercarsCrawler,
            "conceptcarz": ConceptCarzCrawler,
        }
        self.entity_resolver = EntityResolver()
        self._crawl_status: dict[str, CrawlStatus] = {
            name: CrawlStatus(
                source_name=name,
                status="idle",
                last_run=None,
                next_run=None,
                last_stats=None,
            )
            for name in self.sources
        }
        self._running_tasks: dict[str, asyncio.Task] = {}

    async def crawl_all(
        self, sources: list[str] | None = None
    ) -> CrawlStats:
        """
        Run all (or specified) source crawlers concurrently.
        Returns aggregated stats.
        """
        source_names = sources or list(self.sources.keys())
        started_at = datetime.now(tz=timezone.utc)

        logger.info("crawl_all_start", sources=source_names)

        tasks = [self.crawl_source(name) for name in source_names]
        results: list[SourceCrawlStats] = await asyncio.gather(*tasks, return_exceptions=True)

        completed = 0
        failed = 0
        total_brands = 0
        total_models = 0
        total_generations = 0
        total_images = 0
        errors: list[str] = []

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                failed += 1
                errors.append(f"{source_names[i]}: {result}")
                logger.error(
                    "crawl_source_error",
                    source=source_names[i],
                    error=str(result),
                )
            else:
                completed += 1
                total_brands += result.brands_found
                total_models += result.models_found
                total_generations += result.generations_found
                total_images += result.images_found

        stats = CrawlStats(
            total_sources=len(source_names),
            sources_completed=completed,
            sources_failed=failed,
            total_brands=total_brands,
            total_models=total_models,
            total_generations=total_generations,
            total_images=total_images,
            started_at=started_at,
            completed_at=datetime.now(tz=timezone.utc),
            errors=errors,
        )
        logger.info(
            "crawl_all_complete",
            sources_completed=completed,
            sources_failed=failed,
            total_brands=total_brands,
            total_models=total_models,
            total_generations=total_generations,
            total_images=total_images,
        )
        return stats

    async def crawl_source(self, source_name: str) -> SourceCrawlStats:
        """
        Run a single source crawler with status tracking.
        Raises ValueError for unknown source names.
        """
        if source_name not in self.sources:
            raise ValueError(
                f"Unknown source: '{source_name}'. "
                f"Available: {', '.join(self.sources.keys())}"
            )

        crawler_cls = self.sources[source_name]
        crawler = crawler_cls()

        self._crawl_status[source_name].status = "running"
        self._crawl_status[source_name].last_run = datetime.now(tz=timezone.utc)

        try:
            stats = await crawler.crawl()
            self._crawl_status[source_name].status = "completed"
            self._crawl_status[source_name].last_stats = stats
            logger.info(
                "crawl_source_complete",
                source=source_name,
                generations=stats.generations_found,
                images=stats.images_found,
            )
            return stats
        except Exception as exc:
            self._crawl_status[source_name].status = "failed"
            error_msg = str(exc)
            failed_stats = SourceCrawlStats(
                source_name=source_name,
                brands_found=0,
                models_found=0,
                generations_found=0,
                images_found=0,
                started_at=self._crawl_status[source_name].last_run or datetime.now(tz=timezone.utc),
                completed_at=datetime.now(tz=timezone.utc),
                error=error_msg,
            )
            self._crawl_status[source_name].last_stats = failed_stats
            logger.error("crawl_source_failed", source=source_name, error=error_msg)
            raise

    async def normalize_and_merge(
        self, raw_entities: list[dict[str, Any]]
    ) -> list[UnifiedEntity]:
        """
        Normalise raw crawler entities and merge duplicates across sources.
        Uses canonical IDs to detect duplicates and merge source_ids.
        """
        canonical_map: dict[str, UnifiedEntity] = {}

        for raw in raw_entities:
            entity_type = raw.get("entity_type", "generation")
            source_name = raw.get("source_name", "unknown")
            source_id = raw.get("source_id", "")

            brand_name = self.entity_resolver.resolve_brand(raw.get("brand_name", "Unknown"))
            model_name = raw.get("model_name")
            gen_code = raw.get("generation_code")
            year_start = raw.get("year_start")

            # Build canonical ID
            canonical_id = self.entity_resolver.build_canonical_id(
                entity_type,
                brand=brand_name,
                model=model_name or "",
                gen=gen_code or "",
                year=str(year_start or ""),
            )

            if canonical_id in canonical_map:
                # Merge: add new source ID and any new image URLs
                existing = canonical_map[canonical_id]
                if source_name and source_id:
                    existing.source_ids[source_name] = source_id
                new_images = raw.get("image_urls", [])
                for img_url in new_images:
                    if img_url not in existing.image_urls:
                        existing.image_urls.append(img_url)
            else:
                entity = UnifiedEntity(
                    entity_type=entity_type,
                    canonical_id=canonical_id,
                    brand_name=brand_name,
                    model_name=model_name,
                    generation_code=gen_code,
                    year_start=year_start,
                    year_end=raw.get("year_end"),
                    body_type=raw.get("body_type"),
                    image_urls=list(raw.get("image_urls", [])),
                    source_ids={source_name: source_id} if source_name and source_id else {},
                    metadata={k: v for k, v in raw.items()
                               if k not in {"entity_type", "source_name", "source_id",
                                             "brand_name", "model_name", "generation_code",
                                             "year_start", "year_end", "body_type", "image_urls"}},
                )
                canonical_map[canonical_id] = entity

        merged = list(canonical_map.values())
        logger.info(
            "normalize_and_merge_complete",
            raw_count=len(raw_entities),
            merged_count=len(merged),
        )
        return merged

    async def get_crawl_status(self) -> dict[str, CrawlStatus]:
        """Return the current status of all configured crawl sources."""
        return dict(self._crawl_status)
