"""
NetCarShow crawler — https://www.netcarshow.com/

Crawls all brands, models, generations, and high-res gallery images.
Extracts generation code names, press vs regular photos, specs, body types,
year ranges, and handles pagination.

Rate limit: 1 req/s with token-bucket.
"""

from __future__ import annotations

import asyncio
import re
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin, urlparse

import structlog
from bs4 import BeautifulSoup, Tag

from ..base import BaseCrawler, CrawlerConfig

logger = structlog.get_logger(__name__)

BASE_URL = "https://www.netcarshow.com"
CARS_INDEX = "https://www.netcarshow.com/cars/"

# Maps common body-type strings found on the site to canonical forms
BODY_TYPE_MAP: Dict[str, str] = {
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
    "mpv": "minivan",
    "pickup": "pickup",
    "truck": "pickup",
    "limousine": "limousine",
    "spider": "convertible",
    "targa": "targa",
}

# Well-known generation code patterns
GEN_CODE_RE = re.compile(
    r"\b([A-Z]\d{2,3}|[A-Z]{1,3}\d{2,3}|[A-Z]\d{3,4}[A-Z]?|\d{3})\b"
)


def _make_config() -> CrawlerConfig:
    return CrawlerConfig(
        source_name="netcarshow",
        base_url=BASE_URL,
        rate_limit_rps=1.0,
        max_retries=5,
        request_timeout=30,
        max_concurrent_requests=3,
        cache_ttl=7200,
        use_playwright=False,
    )


class NetCarShowCrawler(BaseCrawler):
    """Crawler for https://www.netcarshow.com/"""

    def __init__(self) -> None:
        super().__init__(_make_config())

    # ------------------------------------------------------------------
    # Brand crawling
    # ------------------------------------------------------------------

    async def crawl_brands(self) -> List[Dict[str, Any]]:
        """
        Fetch /cars/ index page and extract all brand links.
        Returns list of brand dicts: {name, slug, url, logo_url}
        """
        self._log.info("crawl_brands_start")
        html = await self.fetch_html(CARS_INDEX)
        soup = self.parse_soup(html)
        brands: List[Dict[str, Any]] = []

        # The brand index is a grid of <a> elements inside .brand-list or similar
        for a in soup.select("div.carlist a, ul.brand-list a, .brands-grid a, .cars-index a"):
            href = a.get("href", "")
            if not href or href == "#":
                continue
            full_url = self.absolute_url(href)
            name = self.normalize_text(a.get_text())
            if not name:
                img = a.find("img")
                if img:
                    name = self.normalize_text(img.get("alt", ""))
            if not name:
                continue
            slug = self.slug_from_url(full_url)
            logo = ""
            img_tag = a.find("img")
            if img_tag:
                logo = self.absolute_url(img_tag.get("src", "") or img_tag.get("data-src", ""))

            brands.append(
                {
                    "name": name,
                    "slug": slug,
                    "url": full_url,
                    "logo_url": logo,
                    "source": "netcarshow",
                }
            )

        # Fallback: look for any links whose path matches /cars/<brand>/
        if not brands:
            for a in soup.find_all("a", href=True):
                href: str = a["href"]
                m = re.match(r"^/cars/([^/]+)/?$", href)
                if m:
                    slug = m.group(1)
                    name = self.normalize_text(a.get_text()) or slug.replace("-", " ").title()
                    full_url = self.absolute_url(href)
                    brands.append(
                        {
                            "name": name,
                            "slug": slug,
                            "url": full_url,
                            "logo_url": "",
                            "source": "netcarshow",
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
        self._log.info("crawl_models_start", brand=brand["name"], url=brand_url)
        html = await self.fetch_html(brand_url)
        soup = self.parse_soup(html)
        models: List[Dict[str, Any]] = []

        for a in soup.select("div.model a, ul.model-list a, .models-grid a, h2 a, h3 a"):
            href = a.get("href", "")
            if not href:
                continue
            # Must be under /cars/<brand>/<model>/
            if brand["slug"] not in href:
                continue
            full_url = self.absolute_url(href)
            name = self.normalize_text(a.get_text())
            if not name:
                continue
            slug = self.slug_from_url(full_url)
            thumb = ""
            parent = a.parent
            if parent:
                img = parent.find("img")
                if img:
                    thumb = self.absolute_url(img.get("src", "") or img.get("data-src", ""))

            models.append(
                {
                    "name": name,
                    "slug": slug,
                    "url": full_url,
                    "brand_name": brand["name"],
                    "brand_slug": brand["slug"],
                    "thumbnail_url": thumb,
                    "source": "netcarshow",
                }
            )

        # De-duplicate by slug
        seen: set = set()
        unique_models: List[Dict[str, Any]] = []
        for m in models:
            if m["slug"] not in seen:
                seen.add(m["slug"])
                unique_models.append(m)

        self.metrics.items_scraped += len(unique_models)
        self._log.info("crawl_models_done", brand=brand["name"], count=len(unique_models))
        return unique_models

    # ------------------------------------------------------------------
    # Generation crawling
    # ------------------------------------------------------------------

    async def crawl_generations(self, model: Dict[str, Any]) -> List[Dict[str, Any]]:
        model_url = model["url"]
        self._log.info("crawl_generations_start", model=model["name"], url=model_url)
        html = await self.fetch_html(model_url)
        soup = self.parse_soup(html)
        generations: List[Dict[str, Any]] = []

        # Generations are typically listed as blocks with year ranges and names
        gen_blocks = soup.select(
            ".generation, .gen-block, article.generation, div[class*='generation']"
        )

        # Fallback: any link that follows the /cars/brand/model/YEAR/ or /cars/brand/model/gen/ pattern
        if not gen_blocks:
            pattern = re.compile(
                rf"/cars/{re.escape(model.get('brand_slug', ''))}/{re.escape(model.get('slug', ''))}/[^/]+/?$"
            )
            seen_urls: set = set()
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if pattern.search(href) and href not in seen_urls:
                    seen_urls.add(href)
                    full_url = self.absolute_url(href)
                    title = self.normalize_text(a.get_text())
                    year_start, year_end = self.extract_year_range(title or href)
                    gen_code = self._extract_gen_code(title or href)
                    slug = self.slug_from_url(full_url)
                    body_type = self._infer_body_type(title or "")
                    generations.append(
                        {
                            "name": title or slug,
                            "slug": slug,
                            "url": full_url,
                            "generation_code": gen_code,
                            "year_start": year_start,
                            "year_end": year_end,
                            "body_type": body_type,
                            "model_name": model["name"],
                            "brand_name": model.get("brand_name", ""),
                            "specs": {},
                            "raw_data": {},
                            "source": "netcarshow",
                        }
                    )
            self.metrics.items_scraped += len(generations)
            return generations

        for block in gen_blocks:
            a = block.find("a", href=True)
            if not a:
                continue
            full_url = self.absolute_url(a["href"])
            heading = block.find(["h2", "h3", "h4"])
            name = self.normalize_text(heading.get_text() if heading else a.get_text())
            year_text = self.normalize_text(block.get_text())
            year_start, year_end = self.extract_year_range(year_text)
            gen_code = self._extract_gen_code(name or year_text)
            slug = self.slug_from_url(full_url)
            body_type = self._infer_body_type(name or "")

            # Fetch detail page for specs
            specs = await self._fetch_generation_specs(full_url)

            generations.append(
                {
                    "name": name,
                    "slug": slug,
                    "url": full_url,
                    "generation_code": gen_code,
                    "year_start": year_start,
                    "year_end": year_end,
                    "body_type": body_type,
                    "model_name": model["name"],
                    "brand_name": model.get("brand_name", ""),
                    "specs": specs,
                    "raw_data": {},
                    "source": "netcarshow",
                }
            )

        self.metrics.items_scraped += len(generations)
        self._log.info(
            "crawl_generations_done", model=model["name"], count=len(generations)
        )
        return generations

    async def _fetch_generation_specs(self, url: str) -> Dict[str, Any]:
        """Extract basic specs from a generation detail page."""
        try:
            html = await self.fetch_html(url)
            soup = self.parse_soup(html)
            return self._parse_specs_table(soup)
        except Exception as exc:
            self._log.warning("spec_fetch_error", url=url, error=str(exc))
            return {}

    def _parse_specs_table(self, soup: BeautifulSoup) -> Dict[str, Any]:
        specs: Dict[str, Any] = {}
        for row in soup.select("table.specs tr, .spec-table tr, .specifications tr"):
            cells = row.find_all(["td", "th"])
            if len(cells) >= 2:
                key = self.normalize_text(cells[0].get_text()).lower().replace(" ", "_")
                val = self.normalize_text(cells[1].get_text())
                if key and val:
                    specs[key] = val
        # Also look for dl/dt/dd patterns
        for dt in soup.find_all("dt"):
            dd = dt.find_next_sibling("dd")
            if dd:
                key = self.normalize_text(dt.get_text()).lower().replace(" ", "_")
                val = self.normalize_text(dd.get_text())
                if key and val:
                    specs[key] = val
        return specs

    # ------------------------------------------------------------------
    # Image crawling
    # ------------------------------------------------------------------

    async def crawl_images(self, generation: Dict[str, Any]) -> List[Dict[str, Any]]:
        gen_url = generation["url"]
        self._log.info("crawl_images_start", generation=generation["name"], url=gen_url)

        all_image_urls: List[str] = []
        page = 1

        while True:
            page_url = self._build_gallery_url(gen_url, page)
            try:
                html = await self.fetch_html(page_url)
            except Exception as exc:
                self._log.warning("gallery_page_error", url=page_url, error=str(exc))
                break

            soup = self.parse_soup(html)
            page_images = self._extract_gallery_images(soup, page_url)

            if not page_images:
                break

            all_image_urls.extend(page_images)

            # Check for next page
            next_page = soup.select_one("a.next, a[rel='next'], .pagination .next a")
            if not next_page:
                # Check if there are more pages by looking at pagination numbers
                last_page = self._get_last_page_number(soup)
                if last_page and page < last_page:
                    page += 1
                else:
                    break
            else:
                page += 1

            # Safety cap
            if page > 50:
                break

        # Build image dicts
        images: List[Dict[str, Any]] = []
        for url in dict.fromkeys(all_image_urls):  # deduplicate preserving order
            is_press = self._is_press_photo(url)
            images.append(
                {
                    "url": url,
                    "is_press_photo": is_press,
                    "image_type": "press" if is_press else "gallery",
                    "generation_url": gen_url,
                    "brand_name": generation.get("brand_name", ""),
                    "model_name": generation.get("model_name", ""),
                    "generation_name": generation.get("name", ""),
                    "source": "netcarshow",
                    "raw_data": {},
                }
            )

        self.metrics.items_scraped += len(images)
        self._log.info(
            "crawl_images_done", generation=generation["name"], count=len(images)
        )
        return images

    def _build_gallery_url(self, base: str, page: int) -> str:
        if page == 1:
            return base
        # NetCarShow pagination pattern: /cars/brand/model/gen/page-N/
        base = base.rstrip("/")
        return f"{base}/page-{page}/"

    def _extract_gallery_images(self, soup: BeautifulSoup, base_url: str) -> List[str]:
        images: List[str] = []
        seen: set = set()

        # High-res links: <a href="...jpg"> wrapping thumbnails
        for a in soup.select("a.fancybox, a[href$='.jpg'], a[href$='.jpeg'], a.gallery-link"):
            href = a.get("href", "")
            if href and href not in seen:
                seen.add(href)
                images.append(self.absolute_url(href, base_url))

        # Gallery grid items
        for img in soup.select(".gallery img, .photo-gallery img, figure img"):
            # Prefer full-size src over thumbnail
            src = (
                img.get("data-full")
                or img.get("data-large")
                or img.get("data-src")
                or img.get("src", "")
            )
            if src and src not in seen:
                seen.add(src)
                images.append(self.absolute_url(src, base_url))

        # Fallback: any image URL that looks like a car photo (contains year/car pattern)
        if not images:
            for url in self.parse_image_urls(soup, base_url):
                if url not in seen:
                    seen.add(url)
                    images.append(url)

        return images

    def _get_last_page_number(self, soup: BeautifulSoup) -> Optional[int]:
        """Parse the last page number from pagination."""
        last = None
        for a in soup.select(".pagination a, nav.pager a"):
            try:
                n = int(re.sub(r"\D", "", a.get_text()))
                if n > (last or 0):
                    last = n
            except (ValueError, TypeError):
                pass
        return last

    def _is_press_photo(self, url: str) -> bool:
        """Heuristic: press photos often contain 'press' or 'official' in the URL."""
        low = url.lower()
        return any(kw in low for kw in ("press", "official", "pr_", "_pr", "media"))

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _extract_gen_code(self, text: str) -> Optional[str]:
        """
        Extract BMW/Porsche-style generation codes (E30, F10, G20, 992, etc.)
        from arbitrary text.
        """
        m = GEN_CODE_RE.search(text or "")
        return m.group(0) if m else None

    def _infer_body_type(self, text: str) -> Optional[str]:
        lower = text.lower()
        for keyword, canonical in BODY_TYPE_MAP.items():
            if keyword in lower:
                return canonical
        return None
