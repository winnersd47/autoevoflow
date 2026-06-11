"""
Entity resolution and deduplication for the automotive AI platform.

Takes raw scraped entities from multiple sources and:
  - Normalises brand/model names to canonical forms using alias registries
  - Uses fuzzy matching (rapidfuzz) for near-miss brand/model names
  - Parses generation codes (BMW E30, Porsche 992, VW Mk8, etc.)
  - Computes pairwise similarity scores for deduplication
  - Clusters duplicate entities and merges them into unified records
  - Detects duplicate images by URL pattern and perceptual hash
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import structlog
from rapidfuzz import fuzz, process

logger = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------


@dataclass
class RawEntity:
    """A raw automotive entity as scraped from a single source."""

    source: str
    brand: str
    model: str
    year: Optional[int]
    generation_code: Optional[str]
    body_type: Optional[str]
    trim: Optional[str]
    source_url: str
    metadata: dict = field(default_factory=dict)


@dataclass
class UnifiedEntity:
    """A canonical, merged entity resolved from one or more RawEntity records."""

    canonical_brand: str
    canonical_model: str
    year_start: int
    year_end: Optional[int]
    generation_code: Optional[str]
    body_type: str
    source_mappings: List[dict] = field(default_factory=list)
    confidence: float = 1.0


# ---------------------------------------------------------------------------
# Brand alias registry
# ---------------------------------------------------------------------------


class BrandAliasRegistry:
    """
    Mapping of raw (lower-case) brand name variants to canonical brand names.

    Covers the most common automotive brands with their historical, regional,
    and colloquial aliases.
    """

    ALIASES: Dict[str, str] = {
        # ── BMW Group ──────────────────────────────────────────────────────────
        "bmw": "BMW",
        "bmw ag": "BMW",
        "bayerische motoren werke": "BMW",
        "bayerische motoren werke ag": "BMW",
        "b.m.w.": "BMW",
        # ── Mercedes-Benz Group ────────────────────────────────────────────────
        "mercedes": "Mercedes-Benz",
        "mercedes benz": "Mercedes-Benz",
        "mercedes-benz": "Mercedes-Benz",
        "mercedes benz ag": "Mercedes-Benz",
        "daimler": "Mercedes-Benz",
        "daimler ag": "Mercedes-Benz",
        "daimler-benz": "Mercedes-Benz",
        "daimler chrysler": "Mercedes-Benz",
        "daimlerchrysler": "Mercedes-Benz",
        "mb": "Mercedes-Benz",
        # ── Audi ──────────────────────────────────────────────────────────────
        "audi": "Audi",
        "audi ag": "Audi",
        "auto union": "Audi",
        "nsu": "Audi",
        # ── Volkswagen ────────────────────────────────────────────────────────
        "volkswagen": "Volkswagen",
        "vw": "Volkswagen",
        "volkswagen ag": "Volkswagen",
        "volkswagenwerk": "Volkswagen",
        # ── Porsche ───────────────────────────────────────────────────────────
        "porsche": "Porsche",
        "dr. ing. h.c. f. porsche ag": "Porsche",
        "porsche ag": "Porsche",
        # ── Ford ──────────────────────────────────────────────────────────────
        "ford": "Ford",
        "ford motor company": "Ford",
        "ford motor co": "Ford",
        "ford motor co.": "Ford",
        "fomoco": "Ford",
        # ── General Motors ────────────────────────────────────────────────────
        "chevrolet": "Chevrolet",
        "chevy": "Chevrolet",
        "gmc": "GMC",
        "cadillac": "Cadillac",
        "buick": "Buick",
        "oldsmobile": "Oldsmobile",
        "pontiac": "Pontiac",
        "saturn": "Saturn",
        "hummer": "Hummer",
        # ── Stellantis / FCA / PSA ────────────────────────────────────────────
        "dodge": "Dodge",
        "chrysler": "Chrysler",
        "jeep": "Jeep",
        "ram": "Ram",
        "fiat": "Fiat",
        "alfa romeo": "Alfa Romeo",
        "alfa": "Alfa Romeo",
        "lancia": "Lancia",
        "maserati": "Maserati",
        "peugeot": "Peugeot",
        "citroen": "Citroën",
        "citroën": "Citroën",
        "ds": "DS Automobiles",
        "ds automobiles": "DS Automobiles",
        "opel": "Opel",
        "vauxhall": "Vauxhall",
        # ── Renault Group ─────────────────────────────────────────────────────
        "renault": "Renault",
        "dacia": "Dacia",
        "nissan": "Nissan",
        "infiniti": "Infiniti",
        "mitsubishi": "Mitsubishi",
        # ── Toyota Group ──────────────────────────────────────────────────────
        "toyota": "Toyota",
        "toyota motor corporation": "Toyota",
        "lexus": "Lexus",
        "daihatsu": "Daihatsu",
        "scion": "Scion",
        # ── Honda Group ───────────────────────────────────────────────────────
        "honda": "Honda",
        "honda motor co": "Honda",
        "honda motor co.": "Honda",
        "acura": "Acura",
        # ── Hyundai Group ─────────────────────────────────────────────────────
        "hyundai": "Hyundai",
        "hyundai motor company": "Hyundai",
        "kia": "Kia",
        "kia motors": "Kia",
        "genesis": "Genesis",
        # ── Jaguar Land Rover / Tata ──────────────────────────────────────────
        "jaguar": "Jaguar",
        "land rover": "Land Rover",
        "range rover": "Land Rover",
        "jaguar land rover": "Land Rover",
        "jlr": "Land Rover",
        # ── Volvo Group ───────────────────────────────────────────────────────
        "volvo": "Volvo",
        "volvo cars": "Volvo",
        "volvo car corporation": "Volvo",
        # ── Subaru / Fuji ─────────────────────────────────────────────────────
        "subaru": "Subaru",
        "fuji heavy industries": "Subaru",
        # ── Mazda ────────────────────────────────────────────────────────────
        "mazda": "Mazda",
        "mazda motor corporation": "Mazda",
        # ── Suzuki ───────────────────────────────────────────────────────────
        "suzuki": "Suzuki",
        "suzuki motor corporation": "Suzuki",
        # ── Luxury / Supercars ────────────────────────────────────────────────
        "ferrari": "Ferrari",
        "ferrari s.p.a.": "Ferrari",
        "lamborghini": "Lamborghini",
        "automobili lamborghini": "Lamborghini",
        "mclaren": "McLaren",
        "mclaren automotive": "McLaren",
        "bentley": "Bentley",
        "bentley motors": "Bentley",
        "rolls-royce": "Rolls-Royce",
        "rolls royce": "Rolls-Royce",
        "aston martin": "Aston Martin",
        "aston martin lagonda": "Aston Martin",
        "bugatti": "Bugatti",
        "bugatti automobiles": "Bugatti",
        "koenigsegg": "Koenigsegg",
        "pagani": "Pagani",
        "pagani automobili": "Pagani",
        # ── EV newcomers ─────────────────────────────────────────────────────
        "tesla": "Tesla",
        "tesla motors": "Tesla",
        "tesla inc": "Tesla",
        "rivian": "Rivian",
        "lucid": "Lucid",
        "lucid motors": "Lucid",
        "polestar": "Polestar",
        "byd": "BYD",
        "byd auto": "BYD",
        "nio": "NIO",
        "xpeng": "Xpeng",
        "li auto": "Li Auto",
        # ── Japanese ──────────────────────────────────────────────────────────
        "isuzu": "Isuzu",
        "toyota land cruiser": "Toyota",   # model not brand – edge case guard
    }

    # Pre-build a lowered version for fast look-up
    _lower_aliases: Dict[str, str] = {}

    def __init__(self) -> None:
        self._lower_aliases = {k.lower(): v for k, v in self.ALIASES.items()}
        # Known canonical names for fuzzy matching
        self._canonical_names: List[str] = list(set(self.ALIASES.values()))

    def normalize(self, brand_name: str) -> str:
        """
        Normalise a raw brand name to its canonical form.

        Steps:
            1. Strip and lowercase
            2. Exact alias lookup
            3. Fuzzy match against canonical names (threshold 85)
            4. Title-case fallback
        """
        if not brand_name:
            return ""
        cleaned = brand_name.strip()
        lower = cleaned.lower()

        # Exact hit
        if lower in self._lower_aliases:
            return self._lower_aliases[lower]

        # Fuzzy match
        result = process.extractOne(
            lower,
            list(self._lower_aliases.keys()),
            scorer=fuzz.token_sort_ratio,
            score_cutoff=85,
        )
        if result is not None:
            matched_key, score, _ = result
            return self._lower_aliases[matched_key]

        # Fuzzy against canonical names directly
        canonical_result = process.extractOne(
            cleaned,
            self._canonical_names,
            scorer=fuzz.token_sort_ratio,
            score_cutoff=82,
        )
        if canonical_result is not None:
            return canonical_result[0]

        return cleaned.title()


# ---------------------------------------------------------------------------
# Model alias registry
# ---------------------------------------------------------------------------


class ModelAliasRegistry:
    """
    Per-brand model name alias mapping.

    Keys are lower-case variants; values are canonical model names.
    """

    ALIASES: Dict[str, Dict[str, str]] = {
        "BMW": {
            "1 series": "1-Series",
            "1series": "1-Series",
            "e87": "1-Series",
            "2 series": "2-Series",
            "2series": "2-Series",
            "3 series": "3-Series",
            "3series": "3-Series",
            "bmw 3": "3-Series",
            "e30": "3-Series",
            "e36": "3-Series",
            "e46": "3-Series",
            "e90": "3-Series",
            "f30": "3-Series",
            "g20": "3-Series",
            "4 series": "4-Series",
            "4series": "4-Series",
            "5 series": "5-Series",
            "5series": "5-Series",
            "e34": "5-Series",
            "e39": "5-Series",
            "e60": "5-Series",
            "f10": "5-Series",
            "g30": "5-Series",
            "6 series": "6-Series",
            "6series": "6-Series",
            "7 series": "7-Series",
            "7series": "7-Series",
            "e38": "7-Series",
            "e65": "7-Series",
            "f01": "7-Series",
            "g11": "7-Series",
            "8 series": "8-Series",
            "8series": "8-Series",
            "m3": "M3",
            "bmw m3": "M3",
            "m4": "M4",
            "bmw m4": "M4",
            "m5": "M5",
            "bmw m5": "M5",
            "m6": "M6",
            "m8": "M8",
            "x3": "X3",
            "x5": "X5",
            "x6": "X6",
            "x7": "X7",
            "z3": "Z3",
            "z4": "Z4",
            "i3": "i3",
            "i4": "i4",
            "i7": "i7",
            "i8": "i8",
        },
        "Mercedes-Benz": {
            "c class": "C-Class",
            "c-class": "C-Class",
            "c klasse": "C-Class",
            "c klassen": "C-Class",
            "e class": "E-Class",
            "e-class": "E-Class",
            "s class": "S-Class",
            "s-class": "S-Class",
            "a class": "A-Class",
            "a-class": "A-Class",
            "b class": "B-Class",
            "b-class": "B-Class",
            "gle": "GLE",
            "glc": "GLC",
            "gls": "GLS",
            "glb": "GLB",
            "cla": "CLA",
            "cls": "CLS",
            "amg gt": "AMG GT",
            "amg": "AMG",
            "g class": "G-Class",
            "g-class": "G-Class",
            "g wagon": "G-Class",
            "gwagon": "G-Class",
            "sl": "SL",
            "slk": "SLK",
            "slr": "SLR",
            "slc": "SLC",
            "eqs": "EQS",
            "eqe": "EQE",
            "eqc": "EQC",
            "eqb": "EQB",
            "eqa": "EQA",
            "maybach": "Maybach",
            "mercedes maybach": "Maybach",
        },
        "Porsche": {
            "nine eleven": "911",
            "nine-eleven": "911",
            "911": "911",
            "carrera": "911 Carrera",
            "turbo": "911 Turbo",
            "gt3": "911 GT3",
            "gt2": "911 GT2",
            "918": "918 Spyder",
            "918 spyder": "918 Spyder",
            "boxster": "Boxster",
            "718 boxster": "Boxster",
            "cayman": "Cayman",
            "718 cayman": "Cayman",
            "cayenne": "Cayenne",
            "macan": "Macan",
            "panamera": "Panamera",
            "taycan": "Taycan",
            "928": "928",
            "944": "944",
            "968": "968",
            "959": "959",
        },
        "Volkswagen": {
            "golf": "Golf",
            "vw golf": "Golf",
            "rabbit": "Golf",
            "polo": "Polo",
            "passat": "Passat",
            "tiguan": "Tiguan",
            "touareg": "Touareg",
            "arteon": "Arteon",
            "phaeton": "Phaeton",
            "scirocco": "Scirocco",
            "beetle": "Beetle",
            "new beetle": "Beetle",
            "id.3": "ID.3",
            "id.4": "ID.4",
            "id.buzz": "ID.Buzz",
            "touran": "Touran",
            "sharan": "Sharan",
            "jetta": "Jetta",
            "bora": "Jetta",
        },
        "Audi": {
            "a1": "A1",
            "a2": "A2",
            "a3": "A3",
            "a4": "A4",
            "a5": "A5",
            "a6": "A6",
            "a7": "A7",
            "a8": "A8",
            "q3": "Q3",
            "q5": "Q5",
            "q7": "Q7",
            "q8": "Q8",
            "r8": "R8",
            "tt": "TT",
            "tts": "TTS",
            "rs3": "RS3",
            "rs4": "RS4",
            "rs5": "RS5",
            "rs6": "RS6",
            "rs7": "RS7",
            "e-tron": "e-tron",
            "etron": "e-tron",
            "e-tron gt": "e-tron GT",
            "q4 e-tron": "Q4 e-tron",
        },
        "Ford": {
            "mustang": "Mustang",
            "gt": "GT",
            "ford gt": "GT",
            "gt40": "GT40",
            "focus": "Focus",
            "fiesta": "Fiesta",
            "fusion": "Fusion",
            "taurus": "Taurus",
            "explorer": "Explorer",
            "expedition": "Expedition",
            "f-150": "F-150",
            "f150": "F-150",
            "bronco": "Bronco",
            "ranger": "Ranger",
            "edge": "Edge",
            "escape": "Escape",
            "maverick": "Maverick",
            "shelby gt500": "Mustang Shelby GT500",
            "boss 302": "Mustang Boss 302",
        },
        "Chevrolet": {
            "corvette": "Corvette",
            "chevy corvette": "Corvette",
            "c8": "Corvette C8",
            "camaro": "Camaro",
            "impala": "Impala",
            "malibu": "Malibu",
            "silverado": "Silverado",
            "tahoe": "Tahoe",
            "suburban": "Suburban",
            "blazer": "Blazer",
            "equinox": "Equinox",
            "traverse": "Traverse",
            "trailblazer": "Trailblazer",
            "bolt ev": "Bolt EV",
            "bolt": "Bolt EV",
        },
        "Toyota": {
            "camry": "Camry",
            "corolla": "Corolla",
            "prius": "Prius",
            "rav4": "RAV4",
            "rav 4": "RAV4",
            "highlander": "Highlander",
            "4runner": "4Runner",
            "land cruiser": "Land Cruiser",
            "sequoia": "Sequoia",
            "tundra": "Tundra",
            "tacoma": "Tacoma",
            "supra": "Supra",
            "gr supra": "Supra",
            "celica": "Celica",
            "mr2": "MR2",
            "gr86": "GR86",
            "86": "GR86",
            "gt86": "GR86",
            "bz4x": "bZ4X",
        },
        "Ferrari": {
            "f40": "F40",
            "f50": "F50",
            "enzo": "Enzo",
            "laferrari": "LaFerrari",
            "la ferrari": "LaFerrari",
            "488": "488",
            "488 gtb": "488 GTB",
            "488 spider": "488 Spider",
            "sf90": "SF90 Stradale",
            "sf90 stradale": "SF90 Stradale",
            "296 gtb": "296 GTB",
            "roma": "Roma",
            "portofino": "Portofino",
            "812": "812 Superfast",
            "812 superfast": "812 Superfast",
            "f8 tributo": "F8 Tributo",
            "f8": "F8 Tributo",
            "458": "458 Italia",
            "458 italia": "458 Italia",
            "california": "California",
            "testarossa": "Testarossa",
            "308": "308",
            "328": "328",
            "348": "348",
            "360": "360 Modena",
            "430": "F430",
            "f430": "F430",
        },
        "Lamborghini": {
            "huracan": "Huracán",
            "huracán": "Huracán",
            "urus": "Urus",
            "aventador": "Aventador",
            "gallardo": "Gallardo",
            "murcielago": "Murciélago",
            "murciélago": "Murciélago",
            "diablo": "Diablo",
            "countach": "Countach",
            "miura": "Miura",
            "espada": "Espada",
            "revuelto": "Revuelto",
        },
        "Tesla": {
            "model s": "Model S",
            "models": "Model S",
            "model 3": "Model 3",
            "model3": "Model 3",
            "model x": "Model X",
            "modelx": "Model X",
            "model y": "Model Y",
            "modely": "Model Y",
            "cybertruck": "Cybertruck",
            "roadster": "Roadster",
        },
        "Nissan": {
            "gt-r": "GT-R",
            "gtr": "GT-R",
            "skyline": "Skyline",
            "skyline gt-r": "GT-R",
            "r34": "GT-R R34",
            "r33": "GT-R R33",
            "r32": "GT-R R32",
            "370z": "370Z",
            "350z": "350Z",
            "240sx": "240SX",
            "s13": "240SX",
            "s14": "240SX",
            "s15": "Silvia S15",
            "silvia": "Silvia",
            "leaf": "Leaf",
            "ariya": "Ariya",
            "z": "Z",
            "nissan z": "Z",
        },
        "Porsche": {
            "nine eleven": "911",
            "nine-eleven": "911",
            "carrera": "911 Carrera",
            "turbo": "911 Turbo",
            "gt3": "911 GT3",
            "gt2": "911 GT2",
            "918": "918 Spyder",
            "boxster": "Boxster",
            "718 boxster": "Boxster",
            "cayman": "Cayman",
            "718 cayman": "Cayman",
            "cayenne": "Cayenne",
            "macan": "Macan",
            "panamera": "Panamera",
            "taycan": "Taycan",
        },
    }

    def __init__(self) -> None:
        self._lower_map: Dict[str, Dict[str, str]] = {
            brand: {k.lower(): v for k, v in models.items()}
            for brand, models in self.ALIASES.items()
        }

    def normalize(self, brand: str, model: str) -> str:
        """
        Normalise a raw model name under a canonical brand.

        Steps:
            1. Remove brand prefix ("BMW M3" → "M3")
            2. Exact alias lookup for this brand
            3. Fuzzy match within brand alias keys
            4. Original (title-cased) fallback
        """
        if not model:
            return ""

        model_clean = self._strip_brand_prefix(brand, model).strip()
        lower = model_clean.lower()

        brand_map = self._lower_map.get(brand, {})

        # Exact
        if lower in brand_map:
            return brand_map[lower]

        # Fuzzy within brand aliases
        if brand_map:
            result = process.extractOne(
                lower,
                list(brand_map.keys()),
                scorer=fuzz.token_sort_ratio,
                score_cutoff=88,
            )
            if result is not None:
                return brand_map[result[0]]

        # Return cleaned (preserves capitalisation from source)
        return model_clean if model_clean else model

    @staticmethod
    def _strip_brand_prefix(brand: str, model: str) -> str:
        """Remove brand name from start of model string (case-insensitive)."""
        if not brand:
            return model
        escaped = re.escape(brand)
        return re.sub(rf"^{escaped}\s+", "", model, flags=re.I).strip()


# ---------------------------------------------------------------------------
# Generation code parser
# ---------------------------------------------------------------------------


class GenerationCodeParser:
    """
    Extract generation/chassis codes from text.

    Handles patterns like BMW E30, Porsche 992, VW Mk8, Mercedes W204, etc.
    """

    PATTERNS: Dict[str, str] = {
        "BMW": r"\b([EFG]\d{2,3})\b",
        "Porsche": r"\b(9(?:1[0-9]|[2-9]\d|0[2-9])\d?|993|996|997|991|992)\b",
        "Volkswagen": r"\b(Mk\d+|A\d)\b",
        "Mercedes-Benz": r"\b(W\d{3}|C\d{3}|S\d{3}|A\d{3}|E\d{3}|X\d{3}|R\d{3}|V\d{3})\b",
        "Audi": r"\b(B\d|C\d|D\d|Typ\s*\d+)\b",
        "Honda": r"\b(EG\d*|EK\d*|EP\d*|FD\d*|FK\d*|GK\d*)\b",
        "Nissan": r"\b(R\d{2}|S1[34]|Z3[0-9]|B[0-9]{3})\b",
        "Toyota": r"\b(A[EZT]\d{2,3}|ZN\d{3}|GR\d{3})\b",
        "Subaru": r"\b(GC\d*|GD\d*|GE\d*|GV\d*|VA\d*)\b",
        "Ford": r"\b(S[0-9]{3}|Fox|SN95|S197|S550)\b",
    }

    _compiled: Dict[str, re.Pattern] = {}

    def __init__(self) -> None:
        self._compiled = {
            brand: re.compile(pattern, re.IGNORECASE)
            for brand, pattern in self.PATTERNS.items()
        }

    def extract_code(self, brand: str, text: str) -> Optional[str]:
        """
        Try to extract a generation code for the given brand from free text.

        Returns the first match or None.
        """
        if not text:
            return None
        pattern = self._compiled.get(brand)
        if pattern is None:
            # Generic fallback: capital letter(s) followed by digits
            generic = re.search(r"\b([A-Z]{1,2}\d{2,4}[A-Z]?)\b", text)
            return generic.group(1) if generic else None
        m = pattern.search(text)
        return m.group(1) if m else None


# ---------------------------------------------------------------------------
# Entity resolver
# ---------------------------------------------------------------------------


class EntityResolver:
    """
    Main entity normalisation and resolution engine.

    Usage::

        resolver = EntityResolver()
        unified = resolver.resolve_entity(raw)
    """

    def __init__(self, redis_client=None) -> None:
        self.brand_registry = BrandAliasRegistry()
        self.model_registry = ModelAliasRegistry()
        self.gen_parser = GenerationCodeParser()
        self._redis = redis_client
        self._cache: Dict[str, str] = {}
        self._log = structlog.get_logger("entity_resolver")

    # ------------------------------------------------------------------
    # Public normalisation API
    # ------------------------------------------------------------------

    def normalize_brand_name(self, name: str) -> str:
        """
        Fuzzy-normalise a raw brand name to its canonical form.

        1. Check exact alias dictionary.
        2. Fuzzy match against known brands (threshold 85).
        3. Title-case fallback.
        """
        if not name:
            return ""
        key = f"brand:{name.lower()}"
        if key in self._cache:
            return self._cache[key]
        result = self.brand_registry.normalize(name)
        self._cache[key] = result
        return result

    def normalize_model_name(self, brand: str, model: str) -> str:
        """
        Normalise a raw model name to its canonical form for the given brand.

        1. Remove brand prefix if present (e.g. "BMW M3" → "M3").
        2. Check model aliases for the brand.
        3. Fuzzy match within known model names.
        4. Cleaned/title-cased fallback.
        """
        if not model:
            return ""
        key = f"model:{brand.lower()}:{model.lower()}"
        if key in self._cache:
            return self._cache[key]
        result = self.model_registry.normalize(brand, model)
        self._cache[key] = result
        return result

    def resolve_entity(self, raw: RawEntity) -> UnifiedEntity:
        """
        Main resolution method: normalise, enrich, and return a UnifiedEntity.
        """
        canonical_brand = self.normalize_brand_name(raw.brand)
        canonical_model = self.normalize_model_name(canonical_brand, raw.model)

        # Generation code: prefer explicit, fall back to parsing
        gen_code = raw.generation_code or self.gen_parser.extract_code(
            canonical_brand, raw.model
        )

        # Year handling
        year_start = raw.year or 0
        year_end: Optional[int] = None

        # Body type normalisation
        body_type = self._normalize_body_type(raw.body_type or "")

        # Confidence: 1.0 if exact alias hit, slightly lower if fuzzy-matched
        confidence = self._compute_resolution_confidence(raw, canonical_brand, canonical_model)

        source_mapping = {
            "source": raw.source,
            "brand": raw.brand,
            "model": raw.model,
            "year": raw.year,
            "generation_code": raw.generation_code,
            "body_type": raw.body_type,
            "trim": raw.trim,
            "source_url": raw.source_url,
            "metadata": raw.metadata,
        }

        self._log.debug(
            "entity_resolved",
            source=raw.source,
            raw_brand=raw.brand,
            canonical_brand=canonical_brand,
            raw_model=raw.model,
            canonical_model=canonical_model,
            gen_code=gen_code,
            confidence=confidence,
        )

        return UnifiedEntity(
            canonical_brand=canonical_brand,
            canonical_model=canonical_model,
            year_start=year_start,
            year_end=year_end,
            generation_code=gen_code,
            body_type=body_type,
            source_mappings=[source_mapping],
            confidence=confidence,
        )

    # ------------------------------------------------------------------
    # Similarity & deduplication
    # ------------------------------------------------------------------

    def compute_entity_similarity(self, e1: RawEntity, e2: RawEntity) -> float:
        """
        Compute a [0, 1] similarity score between two raw entities.

        Weights:
            brand similarity    30 %
            model similarity    35 %
            year overlap        15 %
            generation code     10 %
            body type           10 %
        """
        # Brand similarity (normalised first)
        b1 = self.normalize_brand_name(e1.brand)
        b2 = self.normalize_brand_name(e2.brand)
        brand_sim = fuzz.token_sort_ratio(b1, b2) / 100.0

        # Model similarity
        m1 = self.normalize_model_name(b1, e1.model)
        m2 = self.normalize_model_name(b2, e2.model)
        model_sim = fuzz.token_sort_ratio(m1, m2) / 100.0

        # Year overlap
        year_sim = self._year_similarity(e1.year, e2.year)

        # Generation code
        gc1 = e1.generation_code or self.gen_parser.extract_code(b1, e1.model)
        gc2 = e2.generation_code or self.gen_parser.extract_code(b2, e2.model)
        gen_sim = 1.0 if (gc1 and gc2 and gc1.upper() == gc2.upper()) else (
            0.5 if (not gc1 and not gc2) else 0.0
        )

        # Body type
        bt1 = self._normalize_body_type(e1.body_type or "")
        bt2 = self._normalize_body_type(e2.body_type or "")
        body_sim = 1.0 if (bt1 == bt2) else (0.5 if (not bt1 or not bt2) else 0.0)

        score = (
            0.30 * brand_sim
            + 0.35 * model_sim
            + 0.15 * year_sim
            + 0.10 * gen_sim
            + 0.10 * body_sim
        )
        return round(score, 4)

    def find_duplicates(
        self, entities: List[RawEntity], threshold: float = 0.90
    ) -> List[List[int]]:
        """
        Find groups of duplicate entities using pairwise similarity.

        Uses union-find to cluster entities with similarity >= threshold.
        Returns a list of groups; each group is a list of indices into `entities`.
        """
        n = len(entities)
        if n == 0:
            return []

        # Union-Find
        parent = list(range(n))

        def find(x: int) -> int:
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x

        def union(x: int, y: int) -> None:
            parent[find(x)] = find(y)

        for i in range(n):
            for j in range(i + 1, n):
                sim = self.compute_entity_similarity(entities[i], entities[j])
                if sim >= threshold:
                    union(i, j)

        # Collect groups
        groups: Dict[int, List[int]] = {}
        for i in range(n):
            root = find(i)
            groups.setdefault(root, []).append(i)

        return [g for g in groups.values() if len(g) > 1]

    def merge_entities(self, entities: List[RawEntity]) -> UnifiedEntity:
        """
        Merge a group of duplicate RawEntity records into one UnifiedEntity.

        Strategy:
            - canonical brand/model: most frequently occurring normalised value
            - year range: min(years) – max(years)
            - generation code: first non-null
            - body type: most common non-null value
            - metadata: merge all dicts (last-write-wins for conflicts)
        """
        if not entities:
            raise ValueError("Cannot merge empty list of entities")

        if len(entities) == 1:
            return self.resolve_entity(entities[0])

        from collections import Counter

        # Canonical brand: majority vote
        brand_counts: Counter = Counter(
            self.normalize_brand_name(e.brand) for e in entities
        )
        canonical_brand = brand_counts.most_common(1)[0][0]

        # Canonical model: majority vote
        model_counts: Counter = Counter(
            self.normalize_model_name(canonical_brand, e.model) for e in entities
        )
        canonical_model = model_counts.most_common(1)[0][0]

        # Year range
        years = [e.year for e in entities if e.year]
        year_start = min(years) if years else 0
        year_end = max(years) if len(years) > 1 else None

        # Generation code
        gen_code: Optional[str] = None
        for e in entities:
            gc = e.generation_code or self.gen_parser.extract_code(canonical_brand, e.model)
            if gc:
                gen_code = gc
                break

        # Body type: most common
        bt_counts: Counter = Counter(
            self._normalize_body_type(e.body_type or "")
            for e in entities
            if e.body_type
        )
        body_type = bt_counts.most_common(1)[0][0] if bt_counts else ""

        # Confidence: average of individual scores
        confidence = sum(
            self._compute_resolution_confidence(
                e,
                self.normalize_brand_name(e.brand),
                self.normalize_model_name(canonical_brand, e.model),
            )
            for e in entities
        ) / len(entities)

        source_mappings = [
            {
                "source": e.source,
                "brand": e.brand,
                "model": e.model,
                "year": e.year,
                "generation_code": e.generation_code,
                "body_type": e.body_type,
                "trim": e.trim,
                "source_url": e.source_url,
                "metadata": e.metadata,
            }
            for e in entities
        ]

        merged_meta: dict = {}
        for e in entities:
            merged_meta.update(e.metadata)

        self._log.info(
            "entities_merged",
            canonical_brand=canonical_brand,
            canonical_model=canonical_model,
            count=len(entities),
        )

        return UnifiedEntity(
            canonical_brand=canonical_brand,
            canonical_model=canonical_model,
            year_start=year_start,
            year_end=year_end,
            generation_code=gen_code,
            body_type=body_type,
            source_mappings=source_mappings,
            confidence=round(confidence, 4),
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _normalize_body_type(raw: str) -> str:
        if not raw:
            return ""
        lower = raw.lower().strip()
        mapping = {
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
            "station wagon": "wagon",
            "van": "van",
            "minivan": "minivan",
            "mpv": "minivan",
            "pickup": "pickup",
            "truck": "pickup",
            "limousine": "limousine",
            "limo": "limousine",
            "targa": "targa",
            "fastback": "fastback",
            "shooting brake": "shooting_brake",
        }
        for key, canonical in mapping.items():
            if key in lower:
                return canonical
        return lower

    @staticmethod
    def _year_similarity(y1: Optional[int], y2: Optional[int]) -> float:
        if y1 is None and y2 is None:
            return 0.5   # both unknown: neutral
        if y1 is None or y2 is None:
            return 0.3   # one unknown: low confidence
        diff = abs(y1 - y2)
        if diff == 0:
            return 1.0
        if diff <= 1:
            return 0.85   # model-year overlap
        if diff <= 3:
            return 0.5
        if diff <= 6:
            return 0.2
        return 0.0

    def _compute_resolution_confidence(
        self, raw: RawEntity, canonical_brand: str, canonical_model: str
    ) -> float:
        """
        Estimate confidence of the resolution on [0, 1].

        Penalise if the brand or model had to be fuzzy-matched.
        """
        brand_lower = raw.brand.lower().strip()
        model_lower = raw.model.lower().strip()

        brand_exact = brand_lower in self.brand_registry._lower_aliases
        model_exact = model_lower in self.model_registry._lower_map.get(canonical_brand, {})

        score = 1.0
        if not brand_exact:
            score -= 0.1
        if not model_exact:
            score -= 0.1
        if not raw.year:
            score -= 0.05
        if not raw.generation_code:
            score -= 0.03
        return round(max(score, 0.0), 4)


# ---------------------------------------------------------------------------
# Deduplication engine
# ---------------------------------------------------------------------------


class DeduplicationEngine:
    """
    Image deduplication via exact hash and perceptual hash (pHash).
    """

    def __init__(self) -> None:
        self._log = structlog.get_logger("dedup_engine")

    # ------------------------------------------------------------------
    # URL-level dedup
    # ------------------------------------------------------------------

    def find_duplicate_images(self, urls: List[str]) -> List[List[str]]:
        """
        Group image URLs that are likely duplicates based on:
            1. Identical canonical URL (after normalisation)
            2. Same base filename with different size suffixes
               e.g. image_800x600.jpg and image_1920x1080.jpg

        Returns a list of groups; each group contains equivalent URLs.
        """
        groups: Dict[str, List[str]] = {}

        for url in urls:
            key = self._url_canonical_key(url)
            groups.setdefault(key, []).append(url)

        return [g for g in groups.values() if len(g) > 1]

    @staticmethod
    def _url_canonical_key(url: str) -> str:
        """
        Produce a canonical key from a URL for grouping.

        Strips:
            - query string
            - common size suffixes (_800x600, _sm, _lg, -300x200, etc.)
            - CDN subdomain variants
        """
        # Drop query string
        base = url.split("?")[0]
        # Normalise protocol
        base = re.sub(r"^https?://", "", base)
        # Strip CDN prefix variants (cdn1, img2, media3 …)
        base = re.sub(r"(?:cdn|img|media|static|assets)\d*\.", "", base, flags=re.I)
        # Remove size suffixes in filename before extension
        base = re.sub(
            r"[-_](?:\d{2,4}x\d{2,4}|\d{2,4}w|[smlt]|thumb|small|medium|large|full)"
            r"(?=\.\w+$)",
            "",
            base,
            flags=re.I,
        )
        return base.lower()

    # ------------------------------------------------------------------
    # Content hash dedup
    # ------------------------------------------------------------------

    def compute_image_hash(self, image_bytes: bytes) -> str:
        """
        Compute a perceptual hash (pHash) for image deduplication.

        Uses PIL + imagehash.  Returns a hex string of the 64-bit pHash.
        Falls back to SHA-256 if imagehash is unavailable.
        """
        try:
            import imagehash
            from PIL import Image
            import io

            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            return str(imagehash.phash(img, hash_size=8))
        except ImportError:
            # Fallback to SHA-256 exact hash
            return hashlib.sha256(image_bytes).hexdigest()
        except Exception as exc:
            self._log.warning("phash_compute_error", error=str(exc))
            return hashlib.sha256(image_bytes).hexdigest()

    def find_near_duplicate_images(
        self, hashes: List[str], max_hamming_distance: int = 8
    ) -> List[List[int]]:
        """
        Find near-duplicate images by Hamming distance between pHash strings.

        Args:
            hashes: list of hex pHash strings (one per image)
            max_hamming_distance: images with hamming distance <= this are duplicates

        Returns:
            List of groups (each group is a list of indices into `hashes`).
        """
        n = len(hashes)
        if n == 0:
            return []

        # Union-Find
        parent = list(range(n))

        def find(x: int) -> int:
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x

        def union(x: int, y: int) -> None:
            parent[find(x)] = find(y)

        for i in range(n):
            for j in range(i + 1, n):
                try:
                    dist = self._hamming_distance(hashes[i], hashes[j])
                    if dist <= max_hamming_distance:
                        union(i, j)
                except Exception:
                    pass

        groups: Dict[int, List[int]] = {}
        for i in range(n):
            root = find(i)
            groups.setdefault(root, []).append(i)

        return [g for g in groups.values() if len(g) > 1]

    @staticmethod
    def _hamming_distance(hash1: str, hash2: str) -> int:
        """
        Compute Hamming distance between two hex hash strings.

        Converts each to an integer and counts differing bits.
        """
        if len(hash1) != len(hash2):
            # Truncate to shortest to handle fallback SHA-256 vs pHash mix
            min_len = min(len(hash1), len(hash2))
            hash1, hash2 = hash1[:min_len], hash2[:min_len]
        try:
            n1 = int(hash1, 16)
        except ValueError:
            n1 = int(hashlib.md5(hash1.encode()).hexdigest(), 16)
        try:
            n2 = int(hash2, 16)
        except ValueError:
            n2 = int(hashlib.md5(hash2.encode()).hexdigest(), 16)
        xor = n1 ^ n2
        return bin(xor).count("1")
