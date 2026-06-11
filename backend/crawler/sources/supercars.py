"""
Supercars.net crawler — https://www.supercars.net/

Crawls:
  - Supercar and hypercar sections
  - Rare/limited-edition detection
  - Concept car section
  - Performance metadata: 0-60, top speed, power, torque, lap times
  - Lineage pages (e.g., Ferrari F40 -> F50 -> Enzo)
  - High-quality image gallery extraction
"""

from __future__ import annotations

import asyncio
import re
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse

import structlog
from bs4 import BeautifulSoup

from ..base import BaseCrawler, CrawlerConfig

logger = structlog.get_logger(__name__)

BASE_URL = "https://www.supercars.net"
CARS_INDEX = "https://www.supercars.net/cars/"
CONCEPTS_URL = "https://www.supercars.net/cars/concept/"

# Performance parsing
HP_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:hp|bhp|ps|cv)\b", re.I)
NM_RE = re.compile(r"(\d+(?:\.\d+)?)\s*nm\b", re.I)
LBFT_RE = re.compile(r"(\d+(?:\.\d+)?)\s*lb[·-]?ft\b", re.I)
ZERO60_RE = re.compile(r"(\d+(?:\.\d+)?)\s*s(?:ec(?:ond)?s?)?\s*\(0[-–]60\)", re.I)
ZERO60_ALT = re.compile(r"0[-–]60\s*(?:mph)?\s*(?:in\s*)?(\d+(?:\.\d+)?)\s*s", re.I)
ZERO100_RE = re.compile(r"(\d+(?:\.\d+)?)\s*s(?:ec)?.*?0[-–]100", re.I)
TOPSPEED_MPH_RE = re.compile(r"(\d+(?:\.\d+)?)\s*mph\b", re.I)
TOPSPEED_KPH_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:km/h|kph)\b", re.I)
LAPTIME_RE = re.compile(r"(\d+):(\d{2}(?:\.\d+)?)\s*(?:at|@|,)?\s*(.+)", re.I)
WEIGHT_KG_RE = re.compile(r"(\d+(?:\.\d+)?)\s*kg\b", re.I)
WEIGHT_LBS_RE = re.compile(r"(\d[\d,]+)\s*lbs?\b", re.I)
PROD_NUM_RE = re.compile(r"(\d[\d,]+)\s*(?:units?|cars?|examples?|built|produced|made)\b", re.I)

LIMITED_KEYWORDS = [
    "limited", "special edition", "exclusive", "one-off", "bespoke",
    "ultra-rare", "anniversary", "heritage", "final edition", "last",
    "numbered", "track edition", "homologation",
]


def _make_config() -> CrawlerConfig:
    return CrawlerConfig(
        source_name="supercars",
        base_url=BASE_URL,
        rate_limit_rps=1.0,
        max_retries=5,
        request_timeout=30,
        max_concurrent_requests=3,
        cache_ttl=7200,
        use_playwright=False,
    )


class SupercarsCrawler(BaseCrawler):
    """Crawler for https://www.supercars.net/"""

    def __init__(self) -> None:
        super().__init__(_make_config())

    # ------------------------------------------------------------------
    # Brand crawling
    # ------------------------------------------------------------------

    async def crawl_brands(self) -> List[Dict[str, Any]]:
        self._log.info("crawl_brands_start")
        html = await self.fetch_html(CARS_INDEX)
        soup = self.parse_soup(html)
        brands: List[Dict[str, Any]] = []
        seen: set = set()

        for a in soup.select("a.brand, ul.brands a, .carlist a, div.makes a, td a"):
            href = a.get("href", "")
            m = re.search(r"/cars/([^/]+)/?$", href)
            if not m:
                continue
            slug = m.group(1)
            if slug in seen or slug in ("concept",):
                continue
            seen.add(slug)
            name = self.normalize_text(a.get_text()) or slug.replace("-", " ").title()
            logo_url = ""
            img = a.find("img")
            if img:
                logo_url = self.absolute_url(img.get("src", "") or img.get("data-src", ""))
            brands.append(
                {
                    "name": name,
                    "slug": slug,
                    "url": self.absolute_url(f"/cars/{slug}/"),
                    "logo_url": logo_url,
                    "source": "supercars",
                }
            )

        # Also add a synthetic "Concept" brand entry
        brands.append(
            {
                "name": "Concept",
                "slug": "concept",
                "url": CONCEPTS_URL,
                "logo_url": "",
                "source": "supercars",
                "is_concept_section": True,
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
        html = await self.fetch_html(brand_url)
        soup = self.parse_soup(html)
        models: List[Dict[str, Any]] = []
        seen: set = set()

        model_pattern = re.compile(
            rf"/cars/{re.escape(brand['slug'])}/([^/]+)/?$"
        )
        for a in soup.find_all("a", href=True):
            href: str = a["href"]
            m = model_pattern.search(href)
            if not m:
                continue
            slug = m.group(1)
            if slug in seen:
                continue
            seen.add(slug)
            name = self.normalize_text(a.get_text()) or slug.replace("-", " ").title()
            full_url = self.absolute_url(href)
            is_limited = self._is_limited_edition(name)
            is_concept = "concept" in name.lower() or "concept" in href.lower()
            models.append(
                {
                    "name": name,
                    "slug": slug,
                    "url": full_url,
                    "brand_name": brand["name"],
                    "brand_slug": brand["slug"],
                    "is_limited_edition": is_limited,
                    "is_concept": is_concept,
                    "source": "supercars",
                }
            )

        self.metrics.items_scraped += len(models)
        self._log.info("crawl_models_done", brand=brand["name"], count=len(models))
        return models

    # ------------------------------------------------------------------
    # Generation / variant crawling
    # ------------------------------------------------------------------

    async def crawl_generations(self, model: Dict[str, Any]) -> List[Dict[str, Any]]:
        model_url = model["url"]
        self._log.info("crawl_generations_start", model=model["name"])
        html = await self.fetch_html(model_url)
        soup = self.parse_soup(html)
        generations: List[Dict[str, Any]] = []

        # Try to detect generation or variant listing
        variant_pattern = re.compile(
            rf"/cars/{re.escape(model.get('brand_slug', ''))}/{re.escape(model['slug'])}/([^/]+)/?$"
        )
        seen: set = set()
        for a in soup.find_all("a", href=True):
            href: str = a["href"]
            m = variant_pattern.search(href)
            if not m:
                continue
            var_slug = m.group(1)
            if var_slug in seen:
                continue
            seen.add(var_slug)
            full_url = self.absolute_url(href)
            name = self.normalize_text(a.get_text()) or var_slug.replace("-", " ").title()
            y_start, y_end = self.extract_year_range(name or href)
            is_limited = self._is_limited_edition(name)
            is_concept = "concept" in name.lower()

            specs = await self._fetch_specs(full_url)
            perf = self._parse_performance(specs)
            lineage = await self._fetch_lineage(full_url, soup)

            generations.append(
                {
                    "name": name,
                    "slug": var_slug,
                    "url": full_url,
                    "generation_code": None,
                    "year_start": y_start,
                    "year_end": y_end,
                    "body_type": None,
                    "is_limited_edition": is_limited,
                    "is_concept": is_concept,
                    "model_name": model["name"],
                    "brand_name": model.get("brand_name", ""),
                    "specs": {**specs, **perf},
                    "lineage": lineage,
                    "raw_data": {},
                    "source": "supercars",
                }
            )

        # If no sub-pages, treat the model page itself as the generation
        if not generations:
            specs = await self._fetch_specs(model_url)
            perf = self._parse_performance(specs)
            y_start, y_end = self.extract_year_range(model["name"])
            lineage = await self._fetch_lineage(model_url, soup)
            generations.append(
                {
                    "name": model["name"],
                    "slug": model["slug"],
                    "url": model_url,
                    "generation_code": None,
                    "year_start": y_start,
                    "year_end": y_end,
                    "body_type": None,
                    "is_limited_edition": model.get("is_limited_edition", False),
                    "is_concept": model.get("is_concept", False),
                    "model_name": model["name"],
                    "brand_name": model.get("brand_name", ""),
                    "specs": {**specs, **perf},
                    "lineage": lineage,
                    "raw_data": {},
                    "source": "supercars",
                }
            )

        self.metrics.items_scraped += len(generations)
        self._log.info(
            "crawl_generations_done", model=model["name"], count=len(generations)
        )
        return generations

    # ------------------------------------------------------------------
    # Image crawling
    # ------------------------------------------------------------------

    async def crawl_images(self, generation: Dict[str, Any]) -> List[Dict[str, Any]]:
        gen_url = generation.get("url", "")
        if not gen_url:
            return []
        self._log.info("crawl_images_start", generation=generation.get("name", ""))

        all_urls: List[str] = []
        page = 1

        while True:
            page_url = f"{gen_url.rstrip('/')}/page/{page}/" if page > 1 else gen_url
            try:
                html = await self.fetch_html(page_url)
            except Exception as exc:
                self._log.warning("gallery_page_error", url=page_url, error=str(exc))
                break

            soup = self.parse_soup(html)
            page_imgs = self._extract_gallery_images(soup, page_url)
            if not page_imgs:
                break
            all_urls.extend(page_imgs)

            # High-res direct links
            for a in soup.select("a[href$='.jpg'], a[href$='.jpeg'], a[href$='.png']"):
                u = self.absolute_url(a["href"], page_url)
                if u not in all_urls:
                    all_urls.append(u)

            if not soup.select_one("a.next, a[rel='next'], .pagination .next"):
                break
            page += 1
            if page > 20:
                break

        images = [
            {
                "url": u,
                "is_press_photo": False,
                "image_type": "gallery",
                "generation_url": gen_url,
                "brand_name": generation.get("brand_name", ""),
                "model_name": generation.get("model_name", ""),
                "generation_name": generation.get("name", ""),
                "source": "supercars",
                "raw_data": {},
            }
            for u in dict.fromkeys(all_urls)
        ]
        self.metrics.items_scraped += len(images)
        self._log.info(
            "crawl_images_done", generation=generation.get("name", ""), count=len(images)
        )
        return images

    def _extract_gallery_images(self, soup: BeautifulSoup, base_url: str) -> List[str]:
        urls: List[str] = []
        seen: set = set()

        for img in soup.select(".gallery img, .photo-gallery img, figure img, .car-photo img"):
            src = (
                img.get("data-full")
                or img.get("data-large")
                or img.get("data-original")
                or img.get("data-src")
                or img.get("src", "")
            )
            if src and src not in seen:
                seen.add(src)
                urls.append(self.absolute_url(src, base_url))

        return urls

    # ------------------------------------------------------------------
    # Spec / performance extraction
    # ------------------------------------------------------------------

    async def _fetch_specs(self, url: str) -> Dict[str, Any]:
        try:
            html = await self.fetch_html(url)
            soup = self.parse_soup(html)
            specs: Dict[str, Any] = {}
            for row in soup.select("table.specs tr, .specsbox tr, .car-specs tr"):
                cells = row.find_all(["td", "th"])
                if len(cells) >= 2:
                    k = self.normalize_text(cells[0].get_text()).lower().replace(" ", "_")
                    v = self.normalize_text(cells[1].get_text())
                    if k and v:
                        specs[k] = v
            for dt in soup.find_all("dt"):
                dd = dt.find_next_sibling("dd")
                if dd:
                    k = self.normalize_text(dt.get_text()).lower().replace(" ", "_")
                    v = self.normalize_text(dd.get_text())
                    if k and v:
                        specs[k] = v
            # Lap times
            specs["lap_times"] = self._extract_lap_times(soup.get_text(" "))
            # Production count
            pn = PROD_NUM_RE.search(soup.get_text(" "))
            if pn:
                specs["production_numbers"] = int(pn.group(1).replace(",", ""))
            return specs
        except Exception as exc:
            self._log.warning("spec_fetch_error", url=url, error=str(exc))
            return {}

    def _parse_performance(self, specs: Dict[str, Any]) -> Dict[str, Any]:
        perf: Dict[str, Any] = {}
        text = " ".join(str(v) for v in specs.values())

        m = HP_RE.search(text)
        if m:
            perf["power_hp"] = float(m.group(1))

        m = NM_RE.search(text)
        if m:
            perf["torque_nm"] = float(m.group(1))
        elif not m:
            m = LBFT_RE.search(text)
            if m:
                perf["torque_lbft"] = float(m.group(1))

        m = ZERO60_RE.search(text) or ZERO60_ALT.search(text)
        if m:
            perf["zero_to_60_sec"] = float(m.group(1))

        m = TOPSPEED_MPH_RE.search(text)
        if m:
            perf["top_speed_mph"] = float(m.group(1))

        m = TOPSPEED_KPH_RE.search(text)
        if m:
            perf["top_speed_kph"] = float(m.group(1))

        m = WEIGHT_KG_RE.search(text)
        if m:
            perf["weight_kg"] = float(m.group(1))

        return perf

    def _extract_lap_times(self, text: str) -> List[Dict[str, Any]]:
        """Extract lap time entries like '7:22.34 at Nurburgring'."""
        results: List[Dict[str, Any]] = []
        for m in LAPTIME_RE.finditer(text):
            minutes = int(m.group(1))
            seconds = float(m.group(2))
            circuit = self.normalize_text(m.group(3))[:80]
            total_sec = minutes * 60 + seconds
            results.append(
                {
                    "time_str": f"{m.group(1)}:{m.group(2)}",
                    "time_seconds": total_sec,
                    "circuit": circuit,
                }
            )
        return results

    # ------------------------------------------------------------------
    # Lineage crawling
    # ------------------------------------------------------------------

    async def _fetch_lineage(
        self, url: str, soup: BeautifulSoup
    ) -> List[Dict[str, Any]]:
        """
        Extract model lineage (predecessor/successor) from the page.
        e.g., Ferrari F40 -> F50 -> Enzo -> LaFerrari
        """
        lineage: List[Dict[str, Any]] = []

        for sel in (".lineage a", ".succession a", ".evolution a", ".related-models a"):
            for a in soup.select(sel):
                href = a.get("href", "")
                name = self.normalize_text(a.get_text())
                if name and href:
                    lineage.append({"name": name, "url": self.absolute_url(href, url)})

        # Also look for "predecessor" / "successor" text blocks
        text = soup.get_text(" ")
        for label in ("predecessor", "succeeds", "successor", "followed by", "replaced by"):
            idx = text.lower().find(label)
            if idx >= 0:
                snippet = text[idx : idx + 100]
                # Extract the following model name (typically bold or next word block)
                word_m = re.search(r"[A-Z][A-Za-z0-9 ]{2,30}", snippet[len(label):])
                if word_m:
                    lineage.append({"relation": label, "name": word_m.group(0).strip()})

        return lineage

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _is_limited_edition(self, text: str) -> bool:
        lower = text.lower()
        return any(kw in lower for kw in LIMITED_KEYWORDS)
