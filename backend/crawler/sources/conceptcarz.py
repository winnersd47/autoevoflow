"""
ConceptCarz crawler — https://www.conceptcarz.com/

Crawls concept cars, show cars, and prototype vehicles:
  - Brand/manufacturer index
  - Per-brand concept car listings
  - Individual concept detail pages:
      - name, year shown, auto show name
      - designer name
      - body style
      - high-resolution gallery images
      - full description / design story
      - influenced production model relationships
      - full specs when available

Rate limit: 1 req / 2 sec (respectful).
Playwright is used as fallback when aiohttp encounters JS-heavy pages.
"""

from __future__ import annotations

import asyncio
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin, urlparse

import structlog
from bs4 import BeautifulSoup

from ..base import BaseCrawler, CrawlerConfig

logger = structlog.get_logger(__name__)

BASE_URL = "https://www.conceptcarz.com"
BRAND_INDEX_URL = "https://www.conceptcarz.com/s-manufacturer/index.aspx"
CONCEPT_LIST_URL = "https://www.conceptcarz.com/s-manufacturer/{slug}.aspx"

# Regex helpers
YEAR_RE = re.compile(r"\b(1[89]\d{2}|20[0-2]\d)\b")
DESIGNER_RE = re.compile(
    r"(?:designed?\s+by|designer[:\s]+|styled?\s+by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})",
    re.IGNORECASE,
)
BODY_STYLE_KEYWORDS: Dict[str, str] = {
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
    "station wagon": "wagon",
    "wagon": "wagon",
    "estate": "wagon",
    "pickup": "pickup",
    "truck": "pickup",
    "van": "van",
    "minivan": "minivan",
    "mpv": "minivan",
    "sports car": "sports_car",
    "supercar": "supercar",
    "hypercar": "hypercar",
    "prototype": "prototype",
    "show car": "show_car",
    "concept": "concept",
}

# Auto-show name fragments useful for normalisation
SHOW_NAME_RE = re.compile(
    r"((?:Geneva|Detroit|Tokyo|Frankfurt|Paris|Los Angeles|New York|Chicago|"
    r"Beijing|Shanghai|Seoul|London|Dubai|Goodwood)\s+(?:Motor\s+)?(?:Auto\s+)?Show"
    r"|(?:SEMA|CES|IAA|NAIAs|Mondial de l[\'']Automobile)"
    r"|\d{4}\s+(?:Geneva|Detroit|Tokyo|Frankfurt|Paris|LA|NY)\b)",
    re.IGNORECASE,
)

# Influence relationship keywords
INFLUENCE_RE = re.compile(
    r"(?:influenced?|inspired?|led\s+to|became|evolved\s+into|basis\s+for|"
    r"previewed?|production\s+version\s+(?:of|is)|went\s+on\s+to)\s+(?:the\s+)?"
    r"([A-Z][A-Za-z0-9\s\-]{2,40})",
    re.IGNORECASE,
)


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class ConceptData:
    """Unified concept-car data extracted from ConceptCarz."""

    source: str = "conceptcarz"
    source_url: str = ""

    # Identity
    name: str = ""
    brand: str = ""
    brand_slug: str = ""

    # Show/event info
    year_shown: Optional[int] = None
    auto_show: str = ""

    # Design info
    designer: str = ""
    body_style: str = ""

    # Relationships
    influenced_models: List[str] = field(default_factory=list)

    # Media
    images: List[str] = field(default_factory=list)

    # Text
    description: str = ""
    design_story: str = ""

    # Full specs (when available)
    specs: Dict[str, Any] = field(default_factory=dict)

    # Raw metadata for downstream processing
    raw_data: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source": self.source,
            "source_url": self.source_url,
            "name": self.name,
            "brand": self.brand,
            "brand_slug": self.brand_slug,
            "year_shown": self.year_shown,
            "auto_show": self.auto_show,
            "designer": self.designer,
            "body_style": self.body_style,
            "influenced_models": self.influenced_models,
            "images": self.images,
            "description": self.description,
            "design_story": self.design_story,
            "specs": self.specs,
            "raw_data": self.raw_data,
        }


# ---------------------------------------------------------------------------
# Config factory
# ---------------------------------------------------------------------------

def _make_config() -> CrawlerConfig:
    return CrawlerConfig(
        source_name="conceptcarz",
        base_url=BASE_URL,
        rate_limit_rps=0.5,          # 1 request every 2 seconds
        max_retries=4,
        retry_min_wait=2.0,
        retry_max_wait=60.0,
        request_timeout=30,
        playwright_timeout=45_000,
        max_concurrent_requests=2,
        cache_ttl=7200,
        use_playwright=True,
        browser_pool_size=2,
    )


# ---------------------------------------------------------------------------
# ConceptCarzCrawler
# ---------------------------------------------------------------------------

class ConceptCarzCrawler(BaseCrawler):
    """
    Crawler for https://www.conceptcarz.com/

    Implements the BaseCrawler interface plus concept-specific methods:
        crawl_brands()          – brand index (satisfies abstract method)
        crawl_models()          – concept listings per brand
        crawl_generations()     – no-op (concepts don't have generations)
        crawl_images()          – image gallery per concept
        crawl_concepts()        – combined brand+detail crawl
        crawl_concept_detail()  – detailed concept page parse
    """

    def __init__(self) -> None:
        super().__init__(_make_config())

    # ------------------------------------------------------------------
    # BaseCrawler abstract interface implementation
    # ------------------------------------------------------------------

    async def crawl_brands(self) -> List[Dict[str, Any]]:
        """
        Fetch the manufacturer index and return a list of brand dicts.
        Each dict: {name, slug, url, source}
        """
        self._log.info("crawl_brands_start", url=BRAND_INDEX_URL)

        html = await self._fetch_page(BRAND_INDEX_URL)
        soup = self.parse_soup(html)
        brands: List[Dict[str, Any]] = []
        seen: set = set()

        # Primary: manufacturer link grid
        for a in soup.select(
            "a[href*='s-manufacturer'], a[href*='/make/'], "
            "div.manufacturer-list a, ul.brand-list a, .makes-grid a"
        ):
            href = a.get("href", "")
            if not href or href == "#":
                continue
            full_url = self.absolute_url(href)
            slug = self._extract_manufacturer_slug(href)
            if not slug or slug in seen:
                continue
            seen.add(slug)

            name = self.normalize_text(a.get_text())
            if not name:
                img = a.find("img")
                name = self.normalize_text(img.get("alt", "")) if img else ""
            if not name:
                name = slug.replace("-", " ").title()

            brands.append(
                {
                    "name": name,
                    "slug": slug,
                    "url": full_url,
                    "source": "conceptcarz",
                }
            )

        # Fallback: any /s-manufacturer/<slug>.aspx links
        if not brands:
            for a in soup.find_all("a", href=True):
                href = a["href"]
                m = re.search(r"s-manufacturer/([^/\.]+)", href)
                if m:
                    slug = m.group(1)
                    if slug in seen:
                        continue
                    seen.add(slug)
                    name = self.normalize_text(a.get_text()) or slug.replace("-", " ").title()
                    brands.append(
                        {
                            "name": name,
                            "slug": slug,
                            "url": self.absolute_url(href),
                            "source": "conceptcarz",
                        }
                    )

        self.metrics.items_scraped += len(brands)
        self._log.info("crawl_brands_done", count=len(brands))
        return brands

    async def crawl_models(self, brand: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Return concept car listings for a brand as lightweight model-like dicts.
        Each dict: {name, slug, url, brand_name, brand_slug, year_shown, source}
        """
        concepts = await self.crawl_concepts(brand["slug"])
        return [
            {
                "name": c.name,
                "slug": self.slug_from_url(c.source_url),
                "url": c.source_url,
                "brand_name": c.brand,
                "brand_slug": c.brand_slug,
                "year_shown": c.year_shown,
                "source": "conceptcarz",
            }
            for c in concepts
        ]

    async def crawl_generations(self, model: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Concepts don't have generational variants — return single-item list from detail page."""
        detail = await self.crawl_concept_detail(model["url"])
        if detail is None:
            return []
        return [
            {
                "name": detail.name,
                "slug": self.slug_from_url(detail.source_url),
                "url": detail.source_url,
                "year_start": detail.year_shown,
                "year_end": detail.year_shown,
                "body_type": detail.body_style or None,
                "generation_code": None,
                "specs": detail.specs,
                "raw_data": detail.to_dict(),
                "source": "conceptcarz",
            }
        ]

    async def crawl_images(self, generation: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Return image dicts for a concept page."""
        url = generation.get("url", "")
        if not url:
            return []
        detail = await self.crawl_concept_detail(url)
        if detail is None:
            return []
        images = []
        for img_url in detail.images:
            images.append(
                {
                    "url": img_url,
                    "image_type": "concept_render",
                    "is_press_photo": False,
                    "generation_url": url,
                    "brand_name": detail.brand,
                    "model_name": detail.name,
                    "generation_name": detail.name,
                    "source": "conceptcarz",
                    "raw_data": {},
                }
            )
        return images

    # ------------------------------------------------------------------
    # Concept-specific public methods
    # ------------------------------------------------------------------

    async def crawl_concepts(self, brand_slug: str) -> List[ConceptData]:
        """
        Fetch all concept cars for a given brand slug.

        Returns a list of ConceptData objects with partial data
        (name, year, url).  Full detail is populated by crawl_concept_detail().
        """
        brand_url = f"{BASE_URL}/s-manufacturer/{brand_slug}.aspx"
        self._log.info("crawl_concepts_start", brand_slug=brand_slug, url=brand_url)

        html = await self._fetch_page(brand_url)
        soup = self.parse_soup(html)

        brand_name = self._extract_page_brand_name(soup) or brand_slug.replace("-", " ").title()

        concepts: List[ConceptData] = []
        seen_urls: set = set()

        # Primary selector: concept car card links
        for a in soup.select(
            "div.vehicle-card a, .concept-list a, article.car-item a, "
            "div.car-thumb a, ul.vehicle-list li a"
        ):
            href = a.get("href", "")
            if not href or not self._is_concept_detail_url(href):
                continue
            full_url = self.absolute_url(href)
            if full_url in seen_urls:
                continue
            seen_urls.add(full_url)

            parent = a.find_parent(["div", "li", "article"]) or a
            name = self._extract_concept_name_from_card(a, parent)
            year = self._extract_year_from_card(a, parent)

            concept = ConceptData(
                name=name,
                brand=brand_name,
                brand_slug=brand_slug,
                year_shown=year,
                source_url=full_url,
            )
            concepts.append(concept)
            self._log.debug(
                "concept_found",
                brand=brand_slug,
                name=name,
                year=year,
                url=full_url,
            )

        # Fallback: any link that looks like a concept detail
        if not concepts:
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if self._is_concept_detail_url(href):
                    full_url = self.absolute_url(href)
                    if full_url in seen_urls:
                        continue
                    seen_urls.add(full_url)
                    name = self.normalize_text(a.get_text()) or self.slug_from_url(full_url)
                    year = self.extract_year(name)
                    concepts.append(
                        ConceptData(
                            name=name,
                            brand=brand_name,
                            brand_slug=brand_slug,
                            year_shown=year,
                            source_url=full_url,
                        )
                    )

        self.metrics.items_scraped += len(concepts)
        self._log.info(
            "crawl_concepts_done",
            brand=brand_slug,
            count=len(concepts),
        )
        return concepts

    async def crawl_concept_detail(self, url: str) -> Optional[ConceptData]:
        """
        Parse an individual concept detail page.

        Extracts:
            - full name, brand, year shown
            - auto show name
            - designer name (if mentioned)
            - body style
            - high-res gallery images
            - description text and design story
            - production model influence relationships
            - full specs table
        """
        self._log.info("crawl_concept_detail_start", url=url)
        try:
            html = await self._fetch_page(url)
        except Exception as exc:
            self._log.error("concept_detail_fetch_error", url=url, error=str(exc))
            return None

        soup = self.parse_soup(html)

        name = self._parse_concept_name(soup, url)
        brand, brand_slug = self._parse_concept_brand(soup, url)
        year_shown = self._parse_year_shown(soup)
        auto_show = self._parse_auto_show(soup)
        designer = self._parse_designer(soup)
        body_style = self._parse_body_style(soup)
        images = self._parse_gallery_images(soup, url)
        description, design_story = self._parse_description(soup)
        influenced_models = self._parse_influenced_models(soup, description + " " + design_story)
        specs = self._parse_specs(soup)

        concept = ConceptData(
            source_url=url,
            name=name,
            brand=brand,
            brand_slug=brand_slug,
            year_shown=year_shown,
            auto_show=auto_show,
            designer=designer,
            body_style=body_style,
            images=images,
            description=description,
            design_story=design_story,
            influenced_models=influenced_models,
            specs=specs,
            raw_data={
                "page_title": self._parse_page_title(soup),
                "canonical_url": url,
            },
        )

        self.metrics.items_scraped += 1
        self._log.info(
            "concept_detail_done",
            url=url,
            name=name,
            brand=brand,
            images=len(images),
        )
        return concept

    # ------------------------------------------------------------------
    # Page fetch with Playwright fallback
    # ------------------------------------------------------------------

    async def _fetch_page(self, url: str) -> str:
        """
        Try aiohttp first; fall back to Playwright on failures or JS-heavy pages.
        """
        try:
            html = await self.fetch_html(url)
            # Heuristic: if page body is very small it may be a JS challenge
            if len(html) < 2000 or self._is_js_challenge(html):
                raise ValueError("JS-rendered or challenge page detected, retrying with Playwright")
            return html
        except Exception as exc:
            self._log.debug(
                "falling_back_to_playwright",
                url=url,
                reason=str(exc),
            )
            return await self.fetch_with_playwright(
                url,
                wait_selector="div.vehicle-card, .concept-detail, #main-content, article",
                wait_ms=3000,
            )

    @staticmethod
    def _is_js_challenge(html: str) -> bool:
        signals = [
            "Checking your browser",
            "cf-browser-verification",
            "Enable JavaScript",
            "Please enable JavaScript",
            "__cf_chl",
        ]
        lower = html.lower()
        return sum(1 for s in signals if s.lower() in lower) >= 2

    # ------------------------------------------------------------------
    # Parsing helpers — detail page
    # ------------------------------------------------------------------

    def _parse_page_title(self, soup: BeautifulSoup) -> str:
        title = soup.find("title")
        return self.normalize_text(title.get_text()) if title else ""

    def _parse_concept_name(self, soup: BeautifulSoup, url: str) -> str:
        # Priority: H1, then OG title, then page title, then URL slug
        for selector in ("h1.concept-title", "h1.vehicle-name", "h1#page-title", "h1"):
            tag = soup.select_one(selector)
            if tag:
                return self.normalize_text(tag.get_text())
        og_title = soup.find("meta", property="og:title")
        if og_title:
            return self.normalize_text(og_title.get("content", ""))
        title_tag = soup.find("title")
        if title_tag:
            raw = self.normalize_text(title_tag.get_text())
            # Strip " - ConceptCarz.com" suffix
            raw = re.sub(r"\s*[-|]\s*ConceptCarz.*$", "", raw, flags=re.IGNORECASE)
            return raw
        return self.slug_from_url(url).replace("-", " ").title()

    def _parse_concept_brand(self, soup: BeautifulSoup, url: str) -> tuple[str, str]:
        # Breadcrumb: first meaningful link after home
        breadcrumb = soup.select(
            "nav.breadcrumb a, ol.breadcrumb a, .breadcrumbs a, #breadcrumb a"
        )
        if len(breadcrumb) >= 2:
            brand_tag = breadcrumb[1]
            brand_name = self.normalize_text(brand_tag.get_text())
            href = brand_tag.get("href", "")
            slug = self._extract_manufacturer_slug(href) or brand_name.lower().replace(" ", "-")
            if brand_name:
                return brand_name, slug

        # Meta property
        meta_brand = soup.find("meta", {"name": "author"}) or soup.find(
            "meta", {"itemprop": "brand"}
        )
        if meta_brand:
            name = self.normalize_text(meta_brand.get("content", ""))
            if name:
                return name, name.lower().replace(" ", "-")

        # Infer from URL path: /vehicle/<brand>-<model>-<year>.aspx
        slug_guess = self.slug_from_url(url)
        m = re.match(r"([a-z]+)[-_]", slug_guess)
        if m:
            brand = m.group(1).title()
            return brand, m.group(1)

        return "Unknown", "unknown"

    def _parse_year_shown(self, soup: BeautifulSoup) -> Optional[int]:
        # 1. Structured data
        for tag in soup.find_all("span", {"itemprop": "datePublished"}):
            y = self.extract_year(tag.get_text())
            if y:
                return y
        # 2. Spec table "year" / "introduced"
        for row in soup.select("table.specs tr, .spec-table tr, .vehicle-specs tr"):
            cells = row.find_all(["td", "th"])
            if len(cells) >= 2:
                label = cells[0].get_text().strip().lower()
                if label in ("year", "year introduced", "model year", "shown"):
                    y = self.extract_year(cells[1].get_text())
                    if y:
                        return y
        # 3. First 4-digit year in H1/H2
        for tag in soup.find_all(["h1", "h2"]):
            y = self.extract_year(tag.get_text())
            if y:
                return y
        # 4. Scan description block
        for desc in soup.select(".description, .concept-description, #description, article p"):
            y = self.extract_year(desc.get_text())
            if y:
                return y
        return None

    def _parse_auto_show(self, soup: BeautifulSoup) -> str:
        text_blocks = []
        for sel in (".description", ".concept-description", "#description", "article", ".vehicle-info"):
            tag = soup.select_one(sel)
            if tag:
                text_blocks.append(tag.get_text(" ", strip=True))
        full_text = " ".join(text_blocks)

        # Specific show field
        for row in soup.select("table.specs tr, .spec-table tr"):
            cells = row.find_all(["td", "th"])
            if len(cells) >= 2:
                label = cells[0].get_text().strip().lower()
                if "show" in label or "debut" in label or "event" in label:
                    return self.normalize_text(cells[1].get_text())

        m = SHOW_NAME_RE.search(full_text)
        return self.normalize_text(m.group(0)) if m else ""

    def _parse_designer(self, soup: BeautifulSoup) -> str:
        # Spec table first
        for row in soup.select("table.specs tr, .spec-table tr, .vehicle-specs tr, dl dt"):
            if row.name == "dt":
                label = row.get_text().strip().lower()
                if "designer" in label or "design" in label:
                    dd = row.find_next_sibling("dd")
                    if dd:
                        return self.normalize_text(dd.get_text())
            else:
                cells = row.find_all(["td", "th"])
                if len(cells) >= 2:
                    label = cells[0].get_text().strip().lower()
                    if "designer" in label or "designed by" in label:
                        return self.normalize_text(cells[1].get_text())

        # Free text scan
        for sel in (".description", "article", ".vehicle-info", ".concept-description"):
            tag = soup.select_one(sel)
            if tag:
                text = tag.get_text(" ", strip=True)
                m = DESIGNER_RE.search(text)
                if m:
                    return self.normalize_text(m.group(1))
        return ""

    def _parse_body_style(self, soup: BeautifulSoup) -> str:
        # Spec table
        for row in soup.select("table.specs tr, .spec-table tr, .vehicle-specs tr"):
            cells = row.find_all(["td", "th"])
            if len(cells) >= 2:
                label = cells[0].get_text().strip().lower()
                if label in ("body style", "body type", "body", "style", "type"):
                    return self.normalize_text(cells[1].get_text())

        # Meta keywords / description tag
        meta_desc = soup.find("meta", {"name": "description"})
        if meta_desc:
            content = meta_desc.get("content", "").lower()
            for kw, canonical in BODY_STYLE_KEYWORDS.items():
                if kw in content:
                    return canonical

        # Free text
        for sel in ("h1", "h2", ".description", "article"):
            tag = soup.select_one(sel)
            if tag:
                text = tag.get_text().lower()
                for kw, canonical in BODY_STYLE_KEYWORDS.items():
                    if kw in text:
                        return canonical
        return ""

    def _parse_gallery_images(self, soup: BeautifulSoup, page_url: str) -> List[str]:
        urls: List[str] = []
        seen: set = set()

        def add(raw: str) -> None:
            if not raw or raw.startswith("data:"):
                return
            full = urljoin(page_url, raw).split("?")[0]
            ext = full.lower().split(".")[-1] if "." in full else ""
            if ext in ("jpg", "jpeg", "png", "webp") and full not in seen:
                seen.add(full)
                urls.append(full)

        # High-res linked thumbnails (typical pattern on concept sites)
        for a in soup.select("a.fancybox, a.gallery-item, a[data-lightbox], a.zoom-link"):
            add(a.get("href", ""))

        # Lightbox / data-src variants
        for img in soup.select(
            ".gallery img, .photo-gallery img, .concept-gallery img, figure img, .vehicle-images img"
        ):
            for attr in ("data-full", "data-large", "data-src", "src"):
                val = img.get(attr, "")
                if val:
                    add(val)
                    break

        # Anchors pointing directly to image files
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if re.search(r"\.(jpg|jpeg|png|webp)$", href, re.IGNORECASE):
                add(href)

        # og:image
        og = soup.find("meta", property="og:image")
        if og:
            add(og.get("content", ""))

        # Generic parse_image_urls fallback
        if len(urls) < 3:
            for u in self.parse_image_urls(soup, page_url):
                if u not in seen:
                    seen.add(u)
                    urls.append(u)

        # Upgrade thumbnail URLs to full-size (ConceptCarz pattern)
        urls = [self._upgrade_to_fullsize(u) for u in urls]
        return list(dict.fromkeys(urls))  # deduplicate preserving order

    def _upgrade_to_fullsize(self, url: str) -> str:
        """
        ConceptCarz stores thumbnails with suffixes like _t, _s, _m.
        Replace with _l or remove suffix for full-size.
        """
        url = re.sub(r"_(?:t|s|m|thumb|small|med)(\.\w+)$", r"_l\1", url, flags=re.IGNORECASE)
        url = re.sub(r"/thumbs?/", "/images/", url, flags=re.IGNORECASE)
        return url

    def _parse_description(self, soup: BeautifulSoup) -> tuple[str, str]:
        desc_parts: List[str] = []
        story_parts: List[str] = []

        # Look for labelled sections
        for tag in soup.find_all(["h2", "h3", "h4"]):
            heading = self.normalize_text(tag.get_text()).lower()
            content_tag = tag.find_next_sibling(["p", "div"])
            if not content_tag:
                continue
            text = self.normalize_text(content_tag.get_text())
            if not text:
                continue
            if any(w in heading for w in ("design story", "design", "story", "history")):
                story_parts.append(text)
            elif any(w in heading for w in ("description", "overview", "about")):
                desc_parts.append(text)

        # Fallback: grab all paragraphs from main content
        if not desc_parts and not story_parts:
            for sel in (
                ".concept-description", ".vehicle-description",
                "#description", "#overview", "article .content",
                "div.main-content", "section.description",
            ):
                block = soup.select_one(sel)
                if block:
                    paras = [self.normalize_text(p.get_text()) for p in block.find_all("p")]
                    paras = [p for p in paras if len(p) > 40]
                    if paras:
                        desc_parts.extend(paras)
                        break

        return " ".join(desc_parts), " ".join(story_parts)

    def _parse_influenced_models(self, soup: BeautifulSoup, full_text: str) -> List[str]:
        models: List[str] = []
        seen: set = set()

        # 1. Explicit "influenced" sections
        for tag in soup.find_all(["h2", "h3", "h4", "strong", "b"]):
            heading = self.normalize_text(tag.get_text()).lower()
            if any(
                w in heading
                for w in ("influenced", "production model", "went into production", "inspired")
            ):
                next_tag = tag.find_next_sibling(["p", "ul", "div"])
                if next_tag:
                    for m in INFLUENCE_RE.finditer(next_tag.get_text()):
                        name = self.normalize_text(m.group(1))
                        if name and name not in seen:
                            seen.add(name)
                            models.append(name)

        # 2. Inline text scan
        for m in INFLUENCE_RE.finditer(full_text):
            name = self.normalize_text(m.group(1))
            # Filter noise: must be capitalised and at least 2 words OR known car pattern
            if (
                name
                and name not in seen
                and re.match(r"[A-Z]", name)
                and (len(name.split()) >= 2 or re.search(r"\d", name))
            ):
                seen.add(name)
                models.append(name)

        return models[:20]  # cap at 20 to avoid runaway matches

    def _parse_specs(self, soup: BeautifulSoup) -> Dict[str, Any]:
        specs: Dict[str, Any] = {}

        # Table rows: label / value pairs
        for row in soup.select(
            "table.specs tr, .spec-table tr, .vehicle-specs tr, "
            ".specifications tr, table.technical-data tr"
        ):
            cells = row.find_all(["td", "th"])
            if len(cells) >= 2:
                key = self.normalize_text(cells[0].get_text()).lower().replace(" ", "_").rstrip(":")
                val = self.normalize_text(cells[1].get_text())
                if key and val and key not in ("", "specification", "value"):
                    specs[key] = val

        # Definition list pattern
        dl = soup.find("dl", class_=re.compile(r"spec|vehicle|technical", re.I))
        if dl:
            for dt in dl.find_all("dt"):
                dd = dt.find_next_sibling("dd")
                if dd:
                    key = self.normalize_text(dt.get_text()).lower().replace(" ", "_").rstrip(":")
                    val = self.normalize_text(dd.get_text())
                    if key and val:
                        specs.setdefault(key, val)

        return specs

    # ------------------------------------------------------------------
    # Listing-page helpers
    # ------------------------------------------------------------------

    def _extract_concept_name_from_card(
        self, anchor: Any, parent: Any
    ) -> str:
        # 1. Heading inside card
        for tag_name in ("h2", "h3", "h4", "span.name", "span.title", ".vehicle-name"):
            tag = parent.select_one(tag_name) if hasattr(parent, "select_one") else None
            if tag:
                name = self.normalize_text(tag.get_text())
                if name:
                    return name
        # 2. Image alt
        img = parent.find("img") if hasattr(parent, "find") else None
        if img:
            alt = self.normalize_text(img.get("alt", ""))
            if alt:
                return alt
        # 3. Anchor text
        text = self.normalize_text(anchor.get_text())
        if text:
            return text
        # 4. Slug
        href = anchor.get("href", "")
        return self.slug_from_url(href).replace("-", " ").title()

    def _extract_year_from_card(self, anchor: Any, parent: Any) -> Optional[int]:
        # Try parent text first, then anchor text, then href
        for source in (
            parent.get_text() if hasattr(parent, "get_text") else "",
            anchor.get_text() if hasattr(anchor, "get_text") else "",
            anchor.get("href", ""),
        ):
            y = self.extract_year(source)
            if y:
                return y
        return None

    def _extract_page_brand_name(self, soup: BeautifulSoup) -> str:
        # H1 on manufacturer index page
        h1 = soup.select_one("h1.manufacturer-name, h1.brand-title, h1.page-title, h1")
        if h1:
            name = self.normalize_text(h1.get_text())
            # Remove trailing "Concept Cars" or similar noise
            name = re.sub(r"\s*(concept\s*cars?|vehicles?|models?)\s*$", "", name, flags=re.I)
            if name:
                return name
        return ""

    @staticmethod
    def _is_concept_detail_url(href: str) -> bool:
        """
        ConceptCarz detail pages follow patterns like:
            /vehicle/3523/concept-name.aspx
            /v/3523/some-concept.aspx
            /s-vehicle/name.aspx
        """
        return bool(
            re.search(
                r"/(vehicle|v|s-vehicle)/[\w\-]+(?:/[\w\-]+)?\.aspx",
                href,
                re.IGNORECASE,
            )
        )

    @staticmethod
    def _extract_manufacturer_slug(href: str) -> str:
        m = re.search(r"s-manufacturer/([^/\.]+)", href)
        return m.group(1) if m else ""
