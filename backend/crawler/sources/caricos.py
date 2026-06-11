"""
Caricos crawler — https://www.caricos.com/

Crawls brand index, model gallery pages, high-res images,
trim/variant detection, and specs. Uses Playwright to handle
Cloudflare JS challenges when the plain HTTP request is blocked.
"""

from __future__ import annotations

import asyncio
import re
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin, urlparse

import structlog
from bs4 import BeautifulSoup

from ..base import BaseCrawler, CrawlerConfig

logger = structlog.get_logger(__name__)

BASE_URL = "https://www.caricos.com"
CARS_INDEX = "https://www.caricos.com/cars/"

# Caricos uses /cars/<brand>/ and /cars/<brand>/<model>/<year>/ URL patterns
BRAND_URL_RE = re.compile(r"^/cars/([^/]+)/?$")
MODEL_URL_RE = re.compile(r"^/cars/([^/]+)/([^/]+)/?$")
GALLERY_URL_RE = re.compile(r"^/cars/([^/]+)/([^/]+)/(\d{4})/")

# Cloudflare challenge detection
CF_CHALLENGE_SIGNALS = [
    "Checking your browser",
    "cf-browser-verification",
    "ray id",
    "__cf_chl",
]

TRIM_KEYWORDS = [
    "base", "luxury", "sport", "premium", "limited", "touring",
    "signature", "platinum", "titanium", "elite", "se", "sel", "gle", "amg",
    "m sport", "s-line", "r-line", "nline", "black edition",
]

BODY_TYPE_MAP = {
    "sedan": "sedan",
    "saloon": "sedan",
    "coupe": "coupe",
    "coupé": "coupe",
    "convertible": "convertible",
    "cabriolet": "convertible",
    "roadster": "convertible",
    "suv": "suv",
    "crossover": "suv",
    "hatchback": "hatchback",
    "wagon": "wagon",
    "estate": "wagon",
    "van": "van",
    "minivan": "minivan",
    "pickup": "pickup",
    "truck": "pickup",
}


def _make_config() -> CrawlerConfig:
    return CrawlerConfig(
        source_name="caricos",
        base_url=BASE_URL,
        rate_limit_rps=1.0,
        max_retries=5,
        request_timeout=30,
        playwright_timeout=45_000,
        max_concurrent_requests=3,
        cache_ttl=7200,
        use_playwright=True,   # Playwright fallback for Cloudflare
        browser_pool_size=2,
    )


class CaricosCrawler(BaseCrawler):
    """Crawler for https://www.caricos.com/"""

    def __init__(self) -> None:
        super().__init__(_make_config())

    # ------------------------------------------------------------------
    # Cloudflare-aware fetch
    # ------------------------------------------------------------------

    async def _fetch(self, url: str) -> str:
        """
        Try plain HTTP first; if Cloudflare challenge detected,
        fall back to Playwright rendering.
        """
        try:
            html = await self.fetch_html(url)
            if self._is_cf_challenge(html):
                self._log.info("cf_challenge_detected_using_playwright", url=url)
                html = await self.fetch_with_playwright(
                    url,
                    wait_ms=4000,
                    bypass_cache=True,
                )
        except Exception:
            self._log.info("http_failed_using_playwright", url=url)
            html = await self.fetch_with_playwright(url, wait_ms=4000)
        return html

    def _is_cf_challenge(self, html: str) -> bool:
        low = html.lower()
        return any(sig.lower() in low for sig in CF_CHALLENGE_SIGNALS)

    # ------------------------------------------------------------------
    # Brand crawling
    # ------------------------------------------------------------------

    async def crawl_brands(self) -> List[Dict[str, Any]]:
        self._log.info("crawl_brands_start")
        html = await self._fetch(CARS_INDEX)
        soup = self.parse_soup(html)
        brands: List[Dict[str, Any]] = []
        seen: set = set()

        selectors = [
            "div.carlist a",
            "ul.brands a",
            ".brand-index a",
            "td a",
            "li a",
        ]
        for sel in selectors:
            for a in soup.select(sel):
                href = a.get("href", "")
                m = BRAND_URL_RE.match(href)
                if not m:
                    continue
                slug = m.group(1)
                if slug in seen:
                    continue
                seen.add(slug)
                name = self.normalize_text(a.get_text())
                if not name:
                    img = a.find("img")
                    if img:
                        name = self.normalize_text(img.get("alt", ""))
                if not name:
                    name = slug.replace("-", " ").title()
                full_url = self.absolute_url(href)
                logo_url = ""
                img = a.find("img")
                if img:
                    logo_url = self.absolute_url(img.get("src", "") or img.get("data-src", ""))
                brands.append(
                    {
                        "name": name,
                        "slug": slug,
                        "url": full_url,
                        "logo_url": logo_url,
                        "source": "caricos",
                    }
                )

        self.metrics.items_scraped += len(brands)
        self._log.info("crawl_brands_done", count=len(brands))
        return brands

    # ------------------------------------------------------------------
    # Model crawling
    # ------------------------------------------------------------------

    async def crawl_models(self, brand: Dict[str, Any]) -> List[Dict[str, Any]]:
        brand_url = brand["url"]
        self._log.info("crawl_models_start", brand=brand["name"])
        html = await self._fetch(brand_url)
        soup = self.parse_soup(html)
        models: List[Dict[str, Any]] = []
        seen: set = set()

        for a in soup.find_all("a", href=True):
            href: str = a["href"]
            m = MODEL_URL_RE.match(href)
            if not m or m.group(1) != brand["slug"]:
                continue
            model_slug = m.group(2)
            if model_slug in seen:
                continue
            seen.add(model_slug)
            name = self.normalize_text(a.get_text()) or model_slug.replace("-", " ").title()
            full_url = self.absolute_url(href)
            thumb = ""
            parent = a.parent
            if parent:
                img = parent.find("img")
                if img:
                    thumb = self.absolute_url(img.get("src", "") or img.get("data-src", ""))

            models.append(
                {
                    "name": name,
                    "slug": model_slug,
                    "url": full_url,
                    "brand_name": brand["name"],
                    "brand_slug": brand["slug"],
                    "thumbnail_url": thumb,
                    "source": "caricos",
                }
            )

        self.metrics.items_scraped += len(models)
        self._log.info("crawl_models_done", brand=brand["name"], count=len(models))
        return models

    # ------------------------------------------------------------------
    # Generation crawling
    # ------------------------------------------------------------------

    async def crawl_generations(self, model: Dict[str, Any]) -> List[Dict[str, Any]]:
        model_url = model["url"]
        self._log.info("crawl_generations_start", model=model["name"])
        html = await self._fetch(model_url)
        soup = self.parse_soup(html)
        generations: List[Dict[str, Any]] = []
        seen: set = set()

        # Caricos groups by model year: /cars/<brand>/<model>/<year>/
        year_pattern = re.compile(
            rf"/cars/{re.escape(model['brand_slug'])}/{re.escape(model['slug'])}/(\d{{4}})/"
        )
        for a in soup.find_all("a", href=True):
            href: str = a["href"]
            ym = year_pattern.match(href)
            if not ym:
                continue
            year_str = ym.group(1)
            key = f"{model['slug']}-{year_str}"
            if key in seen:
                continue
            seen.add(key)
            full_url = self.absolute_url(href)
            name = self.normalize_text(a.get_text()) or f"{model['name']} {year_str}"
            year = int(year_str)
            body_type = self._infer_body_type(name)
            trims = self._detect_trims(name)
            specs = await self._fetch_specs(full_url)

            generations.append(
                {
                    "name": name,
                    "slug": f"{model['slug']}-{year_str}",
                    "url": full_url,
                    "generation_code": None,
                    "year_start": year,
                    "year_end": year,
                    "body_type": body_type,
                    "trims": trims,
                    "model_name": model["name"],
                    "brand_name": model.get("brand_name", ""),
                    "specs": specs,
                    "raw_data": {},
                    "source": "caricos",
                }
            )

        self.metrics.items_scraped += len(generations)
        self._log.info(
            "crawl_generations_done", model=model["name"], count=len(generations)
        )
        return generations

    async def _fetch_specs(self, url: str) -> Dict[str, Any]:
        """Fetch and parse specifications from a generation/year page."""
        try:
            html = await self._fetch(url)
            soup = self.parse_soup(html)
            return self._parse_spec_block(soup)
        except Exception as exc:
            self._log.warning("spec_fetch_error", url=url, error=str(exc))
            return {}

    def _parse_spec_block(self, soup: BeautifulSoup) -> Dict[str, Any]:
        specs: Dict[str, Any] = {}
        for table in soup.select("table.specs, table.specifications, .spec-table"):
            for row in table.find_all("tr"):
                cells = row.find_all(["td", "th"])
                if len(cells) >= 2:
                    k = self.normalize_text(cells[0].get_text()).lower().replace(" ", "_")
                    v = self.normalize_text(cells[1].get_text())
                    if k and v:
                        specs[k] = v
        for dl in soup.find_all("dl"):
            terms = dl.find_all("dt")
            descs = dl.find_all("dd")
            for dt, dd in zip(terms, descs):
                k = self.normalize_text(dt.get_text()).lower().replace(" ", "_")
                v = self.normalize_text(dd.get_text())
                if k and v:
                    specs[k] = v
        return specs

    # ------------------------------------------------------------------
    # Image crawling
    # ------------------------------------------------------------------

    async def crawl_images(self, generation: Dict[str, Any]) -> List[Dict[str, Any]]:
        gen_url = generation["url"]
        self._log.info("crawl_images_start", generation=generation["name"])

        all_urls: List[str] = []
        page = 1

        while True:
            page_url = f"{gen_url.rstrip('/')}/page/{page}/" if page > 1 else gen_url
            try:
                html = await self._fetch(page_url)
            except Exception as exc:
                self._log.warning("gallery_page_error", url=page_url, error=str(exc))
                break

            soup = self.parse_soup(html)
            page_imgs = self._extract_images(soup, page_url)
            if not page_imgs:
                break
            all_urls.extend(page_imgs)

            # Check pagination
            next_a = soup.select_one("a.next, a[rel='next'], .pagination .next")
            if not next_a:
                break
            page += 1
            if page > 30:
                break

        images = []
        for url in dict.fromkeys(all_urls):
            images.append(
                {
                    "url": url,
                    "is_press_photo": False,
                    "image_type": "gallery",
                    "generation_url": gen_url,
                    "brand_name": generation.get("brand_name", ""),
                    "model_name": generation.get("model_name", ""),
                    "generation_name": generation.get("name", ""),
                    "source": "caricos",
                    "raw_data": {},
                }
            )

        self.metrics.items_scraped += len(images)
        self._log.info(
            "crawl_images_done", generation=generation["name"], count=len(images)
        )
        return images

    def _extract_images(self, soup: BeautifulSoup, base_url: str) -> List[str]:
        urls: List[str] = []
        seen: set = set()

        def add(url: str) -> None:
            if url and url not in seen:
                seen.add(url)
                urls.append(url)

        # High-res links (Caricos uses <a href="...jpg"> pattern)
        for a in soup.select(
            "a[href$='.jpg'], a[href$='.jpeg'], a[href$='.png'], a[href$='.webp']"
        ):
            add(self.absolute_url(a["href"], base_url))

        # Gallery thumbnails that have data-full or data-original
        for img in soup.select(".gallery img, .photo img, .car-photo img"):
            src = (
                img.get("data-full")
                or img.get("data-large")
                or img.get("data-original")
                or img.get("data-src")
                or img.get("src", "")
            )
            if src:
                add(self.absolute_url(src, base_url))

        return urls

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _infer_body_type(self, text: str) -> Optional[str]:
        lower = text.lower()
        for kw, canonical in BODY_TYPE_MAP.items():
            if kw in lower:
                return canonical
        return None

    def _detect_trims(self, text: str) -> List[str]:
        """Extract trim/variant keywords from a text string."""
        lower = text.lower()
        return [kw for kw in TRIM_KEYWORDS if kw in lower]
