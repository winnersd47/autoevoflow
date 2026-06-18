"""
Crawler for a777aa77.ru — Russian supercar/hypercar ratings portal.

Provides: brand list, model list per brand, technical specs per model
(hp, torque, 0-100, top speed, weight, price).

Limitations compared to other sources:
  - No wheelbase / body dimensions
  - No drivetrain or gearbox info
  - Tuner editions (Mansory, Novitec, Brabus) present — filter via is_tuner()
"""
from __future__ import annotations

import re
from typing import Any, Optional
from bs4 import BeautifulSoup

from crawler.base import BaseCrawler

BASE = "https://www.a777aa77.ru"

# Tuner/aftermarket keywords — skip these models
_TUNER_KEYWORDS = {
    "mansory", "novitec", "brabus", "hamann", "gemballa", "wheelsandmore",
    "oakley", "dmc", "edo", "pogea", "hennessey", "nimrod", "royalty",
    "vivere rwd", "linea vincero", "empire edition",
}


def is_tuner(name: str) -> bool:
    low = name.lower()
    return any(k in low for k in _TUNER_KEYWORDS)


class A777AACrawler(BaseCrawler):
    """Scraper for a777aa77.ru supercar database."""

    source_name = "a777aa"
    base_url = BASE

    # ------------------------------------------------------------------ brands

    async def crawl_brands(self) -> list[dict[str, Any]]:
        html = await self.fetch_html(f"{BASE}/")
        soup = self.parse_soup(html)
        brands = []
        for a in soup.select("a[href*='/cars/']"):
            href = a.get("href", "")
            # normalise: ../cars/ferrari/ → ferrari
            slug = re.sub(r".*?/cars/([^/]+)/?", r"\1", href)
            if not slug or slug == href:
                continue
            label = a.get_text(strip=True)
            if label:
                brands.append({"slug": slug, "name": label, "source_url": f"{BASE}/cars/{slug}/"})
        # deduplicate by slug
        seen: set[str] = set()
        unique = []
        for b in brands:
            if b["slug"] not in seen:
                seen.add(b["slug"])
                unique.append(b)
        return unique

    # ------------------------------------------------------------------ models

    async def crawl_models(self, brand: dict[str, Any]) -> list[dict[str, Any]]:
        slug = brand["slug"]
        html = await self.fetch_html(f"{BASE}/cars/{slug}/")
        if not html:
            return []
        soup = self.parse_soup(html)
        models = []
        for a in soup.select("a[href$='.php']"):
            href = a.get("href", "")
            if not href.startswith(("http", "/")):
                href = f"{BASE}/{href.lstrip('./')}"
            label = a.get_text(strip=True)
            if not label or is_tuner(label):
                continue
            # extract year from label prefix "2023 Bugatti Chiron"
            m = re.match(r"(\d{4})\s+(.+)", label)
            year = int(m.group(1)) if m else None
            name = m.group(2) if m else label
            models.append({
                "brand_slug": slug,
                "name": name,
                "year": year,
                "source_url": href if href.startswith("http") else f"{BASE}/{href}",
                "raw_label": label,
            })
        return models

    # ------------------------------------------------------------------ generations (specs)

    async def crawl_generations(self, model: dict[str, Any]) -> list[dict[str, Any]]:
        url = model.get("source_url", "")
        if not url:
            return []
        html = await self.fetch_html(url)
        if not html:
            return []
        soup = self.parse_soup(html)
        specs = self._parse_specs(soup)
        specs.update({
            "brand_slug": model["brand_slug"],
            "name": model["name"],
            "year": model.get("year"),
            "source_url": url,
        })
        return [specs]

    # ------------------------------------------------------------------ images

    async def crawl_images(self, generation: dict[str, Any]) -> list[dict[str, Any]]:
        url = generation.get("source_url", "")
        if not url:
            return []
        html = await self.fetch_html(url)
        if not html:
            return []
        return self.parse_image_urls(html, base_url=BASE)

    # ------------------------------------------------------------------ helpers

    @staticmethod
    def _parse_specs(soup: BeautifulSoup) -> dict[str, Any]:
        """Extract numeric specs from the page text using regex."""
        text = soup.get_text(" ", strip=True)

        def _first(patterns: list[str]) -> Optional[float]:
            for pat in patterns:
                m = re.search(pat, text, re.IGNORECASE)
                if m:
                    try:
                        return float(m.group(1).replace(",", "."))
                    except ValueError:
                        pass
            return None

        hp = _first([
            r"(\d[\d\s,]+)\s*л\.с",
            r"(\d[\d,]+)\s*hp",
            r"мощность[:\s]+(\d[\d,]+)",
        ])
        torque = _first([
            r"(\d[\d,]+)\s*Нм",
            r"(\d[\d,]+)\s*Nm",
        ])
        accel = _first([
            r"0.100\s*км/ч[:\s]+(\d[\d,.]+)\s*сек",
            r"разгон[:\s]+(\d[\d,.]+)",
        ])
        top_speed = _first([
            r"(\d{3,4})\s*км/ч",
        ])
        weight = _first([
            r"(\d[\d\s]+)\s*кг",
            r"вес[:\s]+(\d[\d,]+)",
        ])

        return {
            "power_hp": int(hp) if hp else None,
            "torque_nm": int(torque) if torque else None,
            "zero_to_100_sec": accel,
            "top_speed_kmh": int(top_speed) if top_speed else None,
            "weight_kg": int(weight) if weight else None,
        }
