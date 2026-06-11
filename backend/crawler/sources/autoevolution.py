"""
AutoEvolution crawler — https://www.autoevolution.com/

Crawls:
  - Historical data pages
  - Full technical specs: engine, power, torque, weight, dimensions, 0-60, top speed
  - Generation timelines: production years, facelift years
  - Platform information
  - Body variant extraction
  - Production numbers (when available)
"""

from __future__ import annotations

import asyncio
import re
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse

import structlog
from bs4 import BeautifulSoup, Tag

from ..base import BaseCrawler, CrawlerConfig

logger = structlog.get_logger(__name__)

BASE_URL = "https://www.autoevolution.com"
CARS_INDEX = "https://www.autoevolution.com/cars/"

# ------------------------------------------------------------------
# Unit normalisation helpers
# ------------------------------------------------------------------

HP_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:hp|bhp|ps|cv)\b", re.I)
NM_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:nm|lb[-·]?ft)\b", re.I)
KG_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:kg|lbs?)\b", re.I)
ZERO_60_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:s(?:ec(?:ond)?s?)?)\b.*?(?:0[-–]60|0[-–]100)", re.I)
TOPSPEED_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:mph|km/h|kph)\b", re.I)
DISPLACEMENT_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:cc|cm3|litre?s?|l)\b", re.I)
PROD_NUMBERS_RE = re.compile(r"(\d[\d,]+)\s*(?:units?|cars?|examples?|built|produced|made)", re.I)

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
    "targa": "targa",
    "spider": "convertible",
    "spyder": "convertible",
    "shooting brake": "wagon",
    "fastback": "hatchback",
    "liftback": "hatchback",
    "limousine": "limousine",
}


def _make_config() -> CrawlerConfig:
    return CrawlerConfig(
        source_name="autoevolution",
        base_url=BASE_URL,
        rate_limit_rps=1.0,
        max_retries=5,
        request_timeout=30,
        max_concurrent_requests=3,
        cache_ttl=7200,
        use_playwright=False,
    )


class AutoEvolutionCrawler(BaseCrawler):
    """Crawler for https://www.autoevolution.com/"""

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

        for a in soup.select("ul.carlist a, .cars-index a, div.carlist a, a.brand"):
            href = a.get("href", "")
            m = re.match(r"^/cars/([^/]+)/?$", href)
            if not m:
                # absolute URL case
                m = re.match(r"https?://www\.autoevolution\.com/cars/([^/]+)/?$", href)
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
                    "source": "autoevolution",
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
            models.append(
                {
                    "name": name,
                    "slug": slug,
                    "url": full_url,
                    "brand_name": brand["name"],
                    "brand_slug": brand["slug"],
                    "source": "autoevolution",
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
        html = await self.fetch_html(model_url)
        soup = self.parse_soup(html)
        generations: List[Dict[str, Any]] = []

        # AutoEvolution lists generations with year bands in headings or dedicated blocks
        gen_blocks = soup.select(".gen-block, .generation, div[class*='gen'], .model-gen")
        if not gen_blocks:
            # Fallback: links matching /cars/brand/model-YEAR/ or /cars/brand/model/GEN/
            gen_pattern = re.compile(
                rf"/cars/{re.escape(model.get('brand_slug', ''))}/{re.escape(model['slug'])}"
                r"[-/]([^/]+)/?$"
            )
            seen: set = set()
            for a in soup.find_all("a", href=True):
                href: str = a["href"]
                if gen_pattern.search(href) and href not in seen:
                    seen.add(href)
                    full_url = self.absolute_url(href)
                    title = self.normalize_text(a.get_text())
                    y_start, y_end = self.extract_year_range(title or href)
                    gen_code = self._extract_gen_code(title or href)
                    body_type = self._infer_body_type(title or "")
                    slug = self.slug_from_url(full_url)
                    specs = await self._fetch_specs(full_url)
                    timeline = self._extract_timeline(soup)
                    prod_years = self._extract_production_years(specs)
                    specs["production_years"] = prod_years
                    generations.append(
                        self._build_gen_dict(
                            name=title or slug,
                            slug=slug,
                            url=full_url,
                            gen_code=gen_code,
                            year_start=y_start,
                            year_end=y_end,
                            body_type=body_type,
                            specs=specs,
                            model=model,
                            timeline=timeline,
                        )
                    )
            self.metrics.items_scraped += len(generations)
            return generations

        for block in gen_blocks:
            a = block.find("a", href=True)
            if not a:
                continue
            full_url = self.absolute_url(a["href"])
            heading = block.find(["h2", "h3", "h4", "h5"])
            name = self.normalize_text(heading.get_text() if heading else a.get_text())
            text_block = self.normalize_text(block.get_text())
            y_start, y_end = self.extract_year_range(text_block)
            gen_code = self._extract_gen_code(name or text_block)
            body_type = self._infer_body_type(name or "")
            slug = self.slug_from_url(full_url)
            specs = await self._fetch_specs(full_url)
            timeline = self._extract_timeline(block)
            prod_years = self._extract_production_years(specs)
            specs["production_years"] = prod_years

            generations.append(
                self._build_gen_dict(
                    name=name,
                    slug=slug,
                    url=full_url,
                    gen_code=gen_code,
                    year_start=y_start,
                    year_end=y_end,
                    body_type=body_type,
                    specs=specs,
                    model=model,
                    timeline=timeline,
                )
            )

        self.metrics.items_scraped += len(generations)
        self._log.info(
            "crawl_generations_done", model=model["name"], count=len(generations)
        )
        return generations

    def _build_gen_dict(
        self,
        name: str,
        slug: str,
        url: str,
        gen_code: Optional[str],
        year_start: Optional[int],
        year_end: Optional[int],
        body_type: Optional[str],
        specs: Dict[str, Any],
        model: Dict[str, Any],
        timeline: Dict[str, Any],
    ) -> Dict[str, Any]:
        return {
            "name": name,
            "slug": slug,
            "url": url,
            "generation_code": gen_code,
            "year_start": year_start,
            "year_end": year_end,
            "body_type": body_type,
            "model_name": model["name"],
            "brand_name": model.get("brand_name", ""),
            "specs": specs,
            "timeline": timeline,
            "raw_data": {},
            "source": "autoevolution",
        }

    # ------------------------------------------------------------------
    # Spec fetching
    # ------------------------------------------------------------------

    async def _fetch_specs(self, url: str) -> Dict[str, Any]:
        try:
            html = await self.fetch_html(url)
            soup = self.parse_soup(html)
            return self._parse_full_specs(soup)
        except Exception as exc:
            self._log.warning("spec_fetch_error", url=url, error=str(exc))
            return {}

    def _parse_full_specs(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """
        Extract structured technical specs from an AutoEvolution specs page.
        Returns a flat dict with typed values where possible.
        """
        specs: Dict[str, Any] = {}

        # Table-based specs (most common on autoevolution)
        for table in soup.select("table.specs, table.specsBox, .specsTable, table"):
            for row in table.find_all("tr"):
                cells = row.find_all(["td", "th"])
                if len(cells) >= 2:
                    key = self.normalize_text(cells[0].get_text()).lower().replace(" ", "_")
                    val = self.normalize_text(cells[1].get_text())
                    if key and val:
                        specs[key] = val

        # Named sections (dl/dt/dd)
        for dl in soup.find_all("dl"):
            for dt in dl.find_all("dt"):
                dd = dt.find_next_sibling("dd")
                if dd:
                    k = self.normalize_text(dt.get_text()).lower().replace(" ", "_")
                    v = self.normalize_text(dd.get_text())
                    if k and v:
                        specs[k] = v

        # Parse known numeric fields
        full_text = soup.get_text(" ")
        parsed = self._parse_numeric_specs(full_text, specs)
        specs.update(parsed)

        # Platform / chassis code
        platform = self._extract_platform(soup, full_text)
        if platform:
            specs["platform"] = platform

        # Production numbers
        prod_match = PROD_NUMBERS_RE.search(full_text)
        if prod_match:
            specs["production_numbers"] = int(prod_match.group(1).replace(",", ""))

        return specs

    def _parse_numeric_specs(
        self, text: str, existing: Dict[str, Any]
    ) -> Dict[str, Any]:
        result: Dict[str, Any] = {}

        # Power (hp/bhp)
        hp_m = HP_RE.search(text)
        if hp_m:
            result["power_hp"] = float(hp_m.group(1))

        # Torque (Nm)
        nm_m = NM_RE.search(text)
        if nm_m:
            result["torque_nm"] = float(nm_m.group(1))

        # Weight (kg)
        kg_m = KG_RE.search(text)
        if kg_m:
            result["weight_kg"] = float(kg_m.group(1))

        # 0-60 or 0-100
        zero60_m = ZERO_60_RE.search(text)
        if zero60_m:
            result["zero_to_60_sec"] = float(zero60_m.group(1))

        # Top speed
        speed_m = TOPSPEED_RE.search(text)
        if speed_m:
            result["top_speed"] = float(speed_m.group(1))

        # Displacement
        disp_m = DISPLACEMENT_RE.search(text)
        if disp_m:
            result["displacement"] = float(disp_m.group(1))

        # Dimensions from existing keys
        for dim_key in ("length", "width", "height", "wheelbase"):
            for k in existing:
                if dim_key in k:
                    try:
                        val_str = re.sub(r"[^\d.]", "", str(existing[k]))
                        result[f"dim_{dim_key}_mm"] = float(val_str)
                    except ValueError:
                        pass
                    break

        return result

    def _extract_platform(self, soup: BeautifulSoup, text: str) -> Optional[str]:
        """Extract chassis/platform name (e.g., MLB evo, MQB, RWD platform)."""
        patterns = [
            r"\bplatform[:\s]+([A-Z0-9\- ]{2,20})\b",
            r"\bchassis[:\s]+([A-Z0-9\- ]{2,20})\b",
            r"\b(MLB evo|MQB|MEB|PPE|J1|TNGA|CMF|EMP2|CMP|GE3|RJ1)\b",
        ]
        for pat in patterns:
            m = re.search(pat, text, re.I)
            if m:
                return m.group(1).strip()
        return None

    def _extract_production_years(self, specs: Dict[str, Any]) -> Optional[str]:
        for k in ("production_years", "produced", "years_of_production", "manufactured"):
            if k in specs:
                return str(specs[k])
        return None

    # ------------------------------------------------------------------
    # Images crawling
    # ------------------------------------------------------------------

    async def crawl_images(self, generation: Dict[str, Any]) -> List[Dict[str, Any]]:
        gen_url = generation.get("url", "")
        if not gen_url:
            return []
        self._log.info("crawl_images_start", generation=generation.get("name", ""))
        try:
            html = await self.fetch_html(gen_url)
        except Exception as exc:
            self._log.warning("images_page_error", url=gen_url, error=str(exc))
            return []

        soup = self.parse_soup(html)
        imgs = self.parse_image_urls(soup, gen_url)
        # Filter non-car images
        imgs = [
            u for u in imgs
            if not any(x in u.lower() for x in ("logo", "icon", "banner", "ad", "pixel"))
        ]
        images = [
            {
                "url": u,
                "is_press_photo": False,
                "image_type": "gallery",
                "generation_url": gen_url,
                "brand_name": generation.get("brand_name", ""),
                "model_name": generation.get("model_name", ""),
                "generation_name": generation.get("name", ""),
                "source": "autoevolution",
                "raw_data": {},
            }
            for u in dict.fromkeys(imgs)
        ]
        self.metrics.items_scraped += len(images)
        return images

    # ------------------------------------------------------------------
    # Timeline extraction
    # ------------------------------------------------------------------

    def _extract_timeline(self, soup_or_tag: Any) -> Dict[str, Any]:
        """
        Extract facelift/refresh years and production milestones
        from a generation block or full page soup.
        """
        timeline: Dict[str, Any] = {"events": []}
        text = soup_or_tag.get_text(" ") if hasattr(soup_or_tag, "get_text") else ""

        facelift_re = re.compile(
            r"(facelift|refresh|updated?|revised?|mid[- ]cycle)\s*"
            r"(?:in\s*)?(1[89]\d{2}|20[0-2]\d)",
            re.I,
        )
        for m in facelift_re.finditer(text):
            timeline["events"].append(
                {"type": "facelift", "year": int(m.group(2))}
            )

        production_start = re.search(
            r"production\s+(?:started?|began?)\s+(?:in\s*)?(1[89]\d{2}|20[0-2]\d)",
            text,
            re.I,
        )
        if production_start:
            timeline["production_start"] = int(production_start.group(1))

        production_end = re.search(
            r"production\s+(?:ended?|stopped?|ceased?)\s+(?:in\s*)?(1[89]\d{2}|20[0-2]\d)",
            text,
            re.I,
        )
        if production_end:
            timeline["production_end"] = int(production_end.group(1))

        return timeline

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _extract_gen_code(self, text: str) -> Optional[str]:
        m = re.search(r"\b([A-Z]\d{2,3}|[A-Z]{1,3}\d{2,3}|[A-Z]\d{3,4}[A-Z]?|\d{3})\b", text or "")
        return m.group(0) if m else None

    def _infer_body_type(self, text: str) -> Optional[str]:
        lower = text.lower()
        for kw, canonical in BODY_TYPE_MAP.items():
            if kw in lower:
                return canonical
        return None
