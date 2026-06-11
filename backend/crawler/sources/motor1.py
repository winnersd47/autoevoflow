"""
Motor1 crawler — https://www.motor1.com/

Crawls articles, news, reviews, concept cars, and spy shots.
Uses Playwright for JS-rendered pages.

Extracts:
  title, year_mentioned, model_mentioned, brand_mentioned,
  article_type (review/news/concept/spy), content, images,
  rating, launch_date
"""

from __future__ import annotations

import asyncio
import re
from datetime import datetime
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin, urlparse

import structlog
from bs4 import BeautifulSoup

from ..base import BaseCrawler, CrawlerConfig

logger = structlog.get_logger(__name__)

BASE_URL = "https://www.motor1.com"

# Article type URL patterns
ARTICLE_TYPE_PATTERNS: Dict[str, str] = {
    "review": r"/reviews/",
    "news": r"/news/",
    "concept": r"/(news|features)/.*concept",
    "spy": r"/(news|spy-shots?)/.*spy|/spy-shots?/",
    "feature": r"/features/",
}

RATING_RE = re.compile(r"(\d+(?:\.\d+)?)\s*/\s*10|\b(\d+(?:\.\d+)?)\s*out\s*of\s*10\b", re.I)
LAUNCH_DATE_RE = re.compile(
    r"\b(?:goes?\s+on\s+sale|launch(?:es|ed)?|available|debut(?:s|ed)?)\s+(?:in\s+)?"
    r"((?:January|February|March|April|May|June|July|August|September|October|November|December)"
    r"\s+\d{4}|\d{4})",
    re.I,
)


def _make_config() -> CrawlerConfig:
    return CrawlerConfig(
        source_name="motor1",
        base_url=BASE_URL,
        rate_limit_rps=0.5,     # be gentle with news sites
        max_retries=4,
        request_timeout=30,
        playwright_timeout=60_000,
        max_concurrent_requests=2,
        cache_ttl=3600,
        use_playwright=True,
        browser_pool_size=2,
    )


# Sections to crawl per article type
SECTION_CONFIGS = [
    {
        "type": "review",
        "url": f"{BASE_URL}/reviews/",
        "article_selector": "article, .article-card, .review-card",
        "pages": 20,
    },
    {
        "type": "news",
        "url": f"{BASE_URL}/news/",
        "article_selector": "article, .article-card",
        "pages": 30,
    },
    {
        "type": "spy",
        "url": f"{BASE_URL}/spy-shots/",
        "article_selector": "article, .article-card",
        "pages": 10,
    },
]


class Motor1Crawler(BaseCrawler):
    """Crawler for https://www.motor1.com/"""

    def __init__(self) -> None:
        super().__init__(_make_config())

    # ------------------------------------------------------------------
    # BaseCrawler abstract interface implementation
    # ------------------------------------------------------------------

    async def crawl_brands(self) -> List[Dict[str, Any]]:
        """
        Motor1 is article-based; 'brands' are derived from the article index.
        Returns distinct brands extracted from the home page navigation.
        """
        self._log.info("crawl_brands_start")
        html = await self.fetch_with_playwright(BASE_URL, wait_ms=3000)
        soup = self.parse_soup(html)
        brands: List[Dict[str, Any]] = []
        seen: set = set()

        # Brand dropdown / navigation links
        for a in soup.select("nav a, .brand-nav a, .makes-list a, header a"):
            href = a.get("href", "")
            if not href or "make" not in href and "brand" not in href:
                continue
            name = self.normalize_text(a.get_text())
            if not name or name.lower() in ("cars", "news", "reviews", "home"):
                continue
            slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
            if slug in seen:
                continue
            seen.add(slug)
            brands.append(
                {
                    "name": name,
                    "slug": slug,
                    "url": self.absolute_url(href),
                    "source": "motor1",
                }
            )

        self.metrics.items_scraped += len(brands)
        self._log.info("crawl_brands_done", count=len(brands))
        return brands

    async def crawl_models(self, brand: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Not used for Motor1 — article site returns empty."""
        return []

    async def crawl_generations(self, model: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Not used for Motor1 — article site returns empty."""
        return []

    async def crawl_images(self, generation: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract images from an article page."""
        url = generation.get("url", "")
        if not url:
            return []
        try:
            html = await self.fetch_with_playwright(url, wait_ms=2000)
            soup = self.parse_soup(html)
            imgs = self.parse_image_urls(soup, url)
            # Filter out icons/logos (very small images in URLs)
            imgs = [u for u in imgs if not any(x in u.lower() for x in ("icon", "logo", "sprite", "pixel"))]
            return [
                {
                    "url": img_url,
                    "is_press_photo": False,
                    "image_type": "article",
                    "article_url": url,
                    "source": "motor1",
                    "raw_data": {},
                }
                for img_url in imgs
            ]
        except Exception as exc:
            self._log.warning("article_images_error", url=url, error=str(exc))
            return []

    # ------------------------------------------------------------------
    # Main article crawling entry points
    # ------------------------------------------------------------------

    async def crawl_articles(self) -> List[Dict[str, Any]]:
        """
        Public method: crawl all article sections and return article dicts.
        Called by the worker or orchestrator directly (not via the abstract interface).
        """
        all_articles: List[Dict[str, Any]] = []

        for section in SECTION_CONFIGS:
            articles = await self._crawl_section(
                section_url=section["url"],
                article_type=section["type"],
                article_selector=section["article_selector"],
                max_pages=section["pages"],
            )
            all_articles.extend(articles)

        self.metrics.items_scraped += len(all_articles)
        self._log.info("crawl_articles_done", total=len(all_articles))
        return all_articles

    # ------------------------------------------------------------------
    # Section crawling
    # ------------------------------------------------------------------

    async def _crawl_section(
        self,
        section_url: str,
        article_type: str,
        article_selector: str,
        max_pages: int = 10,
    ) -> List[Dict[str, Any]]:
        self._log.info("crawl_section_start", url=section_url, type=article_type)
        article_links: List[str] = []
        page = 1

        while page <= max_pages:
            page_url = self._build_page_url(section_url, page)
            try:
                html = await self.fetch_with_playwright(page_url, wait_ms=2500)
            except Exception as exc:
                self._log.warning("section_page_error", url=page_url, error=str(exc))
                break

            soup = self.parse_soup(html)
            new_links = self._extract_article_links(soup, article_selector, section_url)
            if not new_links:
                break
            article_links.extend(new_links)

            if not self._has_next_page(soup):
                break
            page += 1

        # De-duplicate
        article_links = list(dict.fromkeys(article_links))
        self._log.info(
            "section_links_collected",
            section=section_url,
            count=len(article_links),
        )

        # Fetch and parse each article (limited concurrency)
        sem = asyncio.Semaphore(2)
        tasks = [
            self._fetch_article_with_sem(sem, url, article_type)
            for url in article_links
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        articles: List[Dict[str, Any]] = [
            r for r in results if isinstance(r, dict)
        ]
        return articles

    async def _fetch_article_with_sem(
        self, sem: asyncio.Semaphore, url: str, article_type: str
    ) -> Optional[Dict[str, Any]]:
        async with sem:
            return await self._fetch_article(url, article_type)

    def _build_page_url(self, base: str, page: int) -> str:
        if page == 1:
            return base
        base = base.rstrip("/")
        return f"{base}/page/{page}/"

    def _extract_article_links(
        self,
        soup: BeautifulSoup,
        selector: str,
        base_url: str,
    ) -> List[str]:
        links: List[str] = []
        for card in soup.select(selector):
            a = card.find("a", href=True)
            if not a:
                continue
            href = a["href"]
            full = self.absolute_url(href, base_url)
            if BASE_URL in full:
                links.append(full)
        # Also grab <a> inside headings that look like article titles
        for heading_a in soup.select("h2 a[href], h3 a[href]"):
            href = heading_a.get("href", "")
            full = self.absolute_url(href, base_url)
            if BASE_URL in full and full not in links:
                links.append(full)
        return links

    def _has_next_page(self, soup: BeautifulSoup) -> bool:
        return bool(
            soup.select_one(
                "a.next, a[rel='next'], .pagination .next, [aria-label='Next page']"
            )
        )

    # ------------------------------------------------------------------
    # Article parsing
    # ------------------------------------------------------------------

    async def _fetch_article(
        self, url: str, article_type: str
    ) -> Optional[Dict[str, Any]]:
        try:
            html = await self.fetch_with_playwright(
                url,
                wait_selector="article, main",
                wait_ms=2000,
            )
        except Exception as exc:
            self._log.warning("article_fetch_error", url=url, error=str(exc))
            return None

        soup = self.parse_soup(html)
        return self._parse_article(soup, url, article_type)

    def _parse_article(
        self, soup: BeautifulSoup, url: str, article_type: str
    ) -> Dict[str, Any]:
        # Override article_type from URL pattern if possible
        detected_type = self._detect_article_type(url) or article_type

        # Title
        title = ""
        for sel in ("h1", ".article-title", ".post-title", "meta[property='og:title']"):
            el = soup.select_one(sel)
            if el:
                if el.name == "meta":
                    title = el.get("content", "")
                else:
                    title = self.normalize_text(el.get_text())
                if title:
                    break

        # Publication date
        pub_date = self._extract_pub_date(soup)

        # Author
        author = ""
        for sel in (".author-name", ".byline", '[rel="author"]', "span.author"):
            el = soup.select_one(sel)
            if el:
                author = self.normalize_text(el.get_text())
                break

        # Body content
        content = self._extract_content(soup)

        # Images
        images = self.parse_image_urls(soup, url)
        images = [
            u for u in images
            if not any(x in u.lower() for x in ("icon", "logo", "sprite", "avatar", "pixel"))
        ]

        # Ratings (reviews)
        rating = self._extract_rating(soup, content)

        # Year, brand, model extraction from title + content
        year = self.extract_year(title) or self.extract_year(content[:500])
        brand = self._extract_brand_mention(title)
        model = self._extract_model_mention(title, brand)

        # Launch date
        launch_date = self._extract_launch_date(content)

        return {
            "url": url,
            "title": title,
            "article_type": detected_type,
            "pub_date": pub_date,
            "author": author,
            "content": content[:10_000],    # cap to 10 KB
            "images": images[:50],
            "year_mentioned": year,
            "brand_mentioned": brand,
            "model_mentioned": model,
            "rating": rating,
            "launch_date": launch_date,
            "source": "motor1",
            "raw_data": {},
        }

    # ------------------------------------------------------------------
    # Extraction helpers
    # ------------------------------------------------------------------

    def _detect_article_type(self, url: str) -> Optional[str]:
        for atype, pattern in ARTICLE_TYPE_PATTERNS.items():
            if re.search(pattern, url, re.I):
                return atype
        return None

    def _extract_pub_date(self, soup: BeautifulSoup) -> Optional[str]:
        for sel in (
            "time[datetime]",
            "meta[property='article:published_time']",
            ".publish-date",
            ".post-date",
        ):
            el = soup.select_one(sel)
            if el:
                dt = el.get("datetime") or el.get("content") or self.normalize_text(el.get_text())
                if dt:
                    return dt
        return None

    def _extract_content(self, soup: BeautifulSoup) -> str:
        # Remove nav, header, footer, ads
        for tag in soup(["nav", "header", "footer", "aside", "script", "style"]):
            tag.decompose()

        for sel in (
            "article .content",
            "div.article-body",
            "div.post-content",
            ".article-text",
            "main",
            "article",
        ):
            el = soup.select_one(sel)
            if el:
                return self.normalize_text(el.get_text(separator=" "))

        return self.normalize_text(soup.get_text(separator=" "))

    def _extract_rating(
        self, soup: BeautifulSoup, content: str
    ) -> Optional[float]:
        # Structured rating
        for sel in (
            "[itemprop='ratingValue']",
            ".rating-score",
            ".review-score",
            ".score",
        ):
            el = soup.select_one(sel)
            if el:
                try:
                    return float(re.sub(r"[^\d.]", "", el.get_text()))
                except ValueError:
                    pass

        # Text-based rating
        m = RATING_RE.search(content)
        if m:
            try:
                return float(m.group(1) or m.group(2))
            except (ValueError, TypeError):
                pass

        return None

    def _extract_brand_mention(self, text: str) -> Optional[str]:
        """
        Very lightweight brand extraction — checks against a known list.
        Full resolution is handled by EntityResolver.
        """
        KNOWN_BRANDS = [
            "Aston Martin", "Alfa Romeo", "Audi", "Bentley", "BMW", "Bugatti",
            "Cadillac", "Chevrolet", "Chrysler", "Citroen", "Dodge", "Ferrari",
            "Fiat", "Ford", "Genesis", "Honda", "Hyundai", "Infiniti", "Jaguar",
            "Jeep", "Kia", "Lamborghini", "Land Rover", "Lexus", "Lincoln",
            "Lotus", "Lucid", "Maserati", "Mazda", "McLaren", "Mercedes-Benz",
            "Mercedes", "MINI", "Mitsubishi", "Nissan", "Peugeot", "Polestar",
            "Porsche", "Ram", "Renault", "Rivian", "Rolls-Royce", "Subaru",
            "Tesla", "Toyota", "Volkswagen", "Volvo",
        ]
        for brand in KNOWN_BRANDS:
            if brand.lower() in text.lower():
                return brand
        return None

    def _extract_model_mention(
        self, text: str, brand: Optional[str]
    ) -> Optional[str]:
        """
        Extract model name following the brand in the title.
        E.g. "2025 BMW M5 First Drive Review" -> "M5"
        """
        if not brand:
            return None
        # Match brand followed by a likely model name token
        pattern = re.compile(
            re.escape(brand) + r"\s+([\w\d]+(?:\s[\w\d]+)?)",
            re.I,
        )
        m = pattern.search(text)
        if m:
            candidate = m.group(1).strip()
            # Filter out generic words
            if candidate.lower() not in (
                "says", "the", "a", "an", "is", "are", "will", "has", "to", "and",
                "for", "in", "of",
            ):
                return candidate
        return None

    def _extract_launch_date(self, content: str) -> Optional[str]:
        m = LAUNCH_DATE_RE.search(content)
        return m.group(1) if m else None
