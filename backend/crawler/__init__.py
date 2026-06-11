"""
Automotive AI Platform — crawler package.

Public exports:
    CrawlerWorker           Orchestrates job dispatch across source crawlers
    CrawlerJobQueue         Redis-backed priority job queue
    EntityResolver          Brand/model normalisation and entity merging
    DeduplicationEngine     Image deduplication utilities
    ImageProcessor          Async image download / resize / upload pipeline
    *Crawler                Per-source crawler implementations
"""

from .worker import CrawlerWorker
from .queue import CrawlerJobQueue
from .entity_resolver import EntityResolver, DeduplicationEngine
from .image_processor import ImageProcessor
from .sources.netcarshow import NetCarShowCrawler
from .sources.caricos import CaricosCrawler
from .sources.motor1 import Motor1Crawler
from .sources.autoevolution import AutoEvolutionCrawler
from .sources.supercars import SupercarsCrawler
from .sources.conceptcarz import ConceptCarzCrawler

__all__ = [
    "CrawlerWorker",
    "CrawlerJobQueue",
    "EntityResolver",
    "DeduplicationEngine",
    "ImageProcessor",
    "NetCarShowCrawler",
    "CaricosCrawler",
    "Motor1Crawler",
    "AutoEvolutionCrawler",
    "SupercarsCrawler",
    "ConceptCarzCrawler",
]
