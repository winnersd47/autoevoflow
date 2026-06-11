"""
FastAPI ML Inference Microservice.

Provides REST endpoints for all ML pipeline operations with GPU memory management,
request batching, model caching, and Prometheus metrics.
"""

from __future__ import annotations

import asyncio
import io
import os
import time
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

import numpy as np
import structlog
import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image
from prometheus_client import (
    Counter,
    Gauge,
    Histogram,
    generate_latest,
    CONTENT_TYPE_LATEST,
)
from pydantic import BaseModel, Field
from starlette.responses import Response

log = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Lazy model registry (loaded once, reused)
# ---------------------------------------------------------------------------

_models: Dict[str, Any] = {}
_batch_queue: asyncio.Queue = asyncio.Queue()
_batch_lock = asyncio.Lock()

# ---------------------------------------------------------------------------
# Prometheus metrics
# ---------------------------------------------------------------------------

REQUEST_COUNT = Counter(
    "ml_requests_total", "Total ML inference requests", ["endpoint", "status"]
)
REQUEST_LATENCY = Histogram(
    "ml_request_latency_seconds", "ML request latency", ["endpoint"],
    buckets=[0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
)
GPU_MEMORY_USED = Gauge("gpu_memory_used_bytes", "GPU memory used", ["device"])
GPU_MEMORY_FREE = Gauge("gpu_memory_free_bytes", "GPU memory free", ["device"])
BATCH_SIZE_HIST = Histogram(
    "ml_batch_size", "Processed batch sizes", buckets=[1, 4, 8, 16, 32, 64]
)

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class VisualEmbedRequest(BaseModel):
    image_urls: List[str] = Field(..., description="List of image URLs or file paths")


class SemanticEmbedRequest(BaseModel):
    text: str = Field(..., description="Text to embed")


class CombinedEmbedRequest(BaseModel):
    image_urls: List[str]
    text: str
    description: str = ""


class ClassifyRequest(BaseModel):
    embedding: List[float] = Field(..., description="Flat embedding vector")
    task: str = Field(default="all", description="body_type|era|segment|language|concept|year|all")


class EvolveDetectRequest(BaseModel):
    embedding1: List[float]
    embedding2: List[float]
    year_delta: int = 6
    brand_same: bool = True
    detect: str = Field(default="all", description="facelift|redesign|lineage|all")


class DNAExtractRequest(BaseModel):
    image_urls: List[str]
    brand: str = ""


class SearchSimilarRequest(BaseModel):
    query_embedding: List[float]
    k: int = 20
    min_similarity: float = 0.7


class BatchProcessRequest(BaseModel):
    image_urls: List[str]
    batch_size: int = 32


# ---------------------------------------------------------------------------
# Model loader
# ---------------------------------------------------------------------------

def _get_or_load_vision_pipeline():
    if "vision" not in _models:
        from ml.pipelines.vision_pipeline import AutomotiveVisionPipeline
        _models["vision"] = AutomotiveVisionPipeline()
    return _models["vision"]


def _get_or_load_embedding_pipeline():
    if "embedding" not in _models:
        from ml.pipelines.embedding_pipeline import EmbeddingPipeline
        _models["embedding"] = EmbeddingPipeline(
            vision_pipeline=_get_or_load_vision_pipeline(),
            faiss_index_path=os.getenv("FAISS_INDEX_PATH", "/app/data/faiss/index"),
        )
    return _models["embedding"]


def _get_or_load_classifier():
    if "classifier" not in _models:
        from ml.models.automotive_classifier import AutomotiveClassifier
        _models["classifier"] = AutomotiveClassifier()
    return _models["classifier"]


def _get_or_load_evolution_detector():
    if "evolution" not in _models:
        from ml.models.evolution_detector import EvolutionDetector
        _models["evolution"] = EvolutionDetector()
    return _models["evolution"]


def _get_or_load_dna_analyzer():
    if "dna" not in _models:
        from ml.models.design_dna import DesignDNAAnalyzer
        _models["dna"] = DesignDNAAnalyzer()
    return _models["dna"]


# ---------------------------------------------------------------------------
# GPU memory utilities
# ---------------------------------------------------------------------------

def _update_gpu_metrics() -> None:
    if not torch.cuda.is_available():
        return
    for i in range(torch.cuda.device_count()):
        mem = torch.cuda.mem_get_info(i)
        GPU_MEMORY_FREE.labels(device=f"cuda:{i}").set(mem[0])
        GPU_MEMORY_USED.labels(device=f"cuda:{i}").set(mem[1] - mem[0])


def _clear_gpu_cache() -> None:
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


def _load_image_from_url(url: str) -> Image.Image:
    """Load PIL image from URL or file path."""
    if url.startswith(("http://", "https://")):
        import urllib.request
        with urllib.request.urlopen(url, timeout=10) as resp:
            return Image.open(io.BytesIO(resp.read())).convert("RGB")
    return Image.open(url).convert("RGB")


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Warm up all models on startup."""
    log.info("warming_up_ml_models")
    try:
        _get_or_load_vision_pipeline()
        _get_or_load_embedding_pipeline()
        _get_or_load_classifier()
        _get_or_load_evolution_detector()
        _get_or_load_dna_analyzer()
        log.info("all_models_loaded")
    except Exception as exc:
        log.warning("model_warmup_partial_failure", error=str(exc))
    yield
    _clear_gpu_cache()
    log.info("ml_server_shutdown")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Automotive ML Inference API",
    version="1.0.0",
    description="Production ML microservice for automotive visual evolution platform",
    lifespan=lifespan,
)


def _track(endpoint: str):
    """Context manager for timing and metric tracking."""
    class _Tracker:
        def __enter__(self):
            self._start = time.perf_counter()
            return self

        def __exit__(self, exc_type, *_):
            elapsed = time.perf_counter() - self._start
            REQUEST_LATENCY.labels(endpoint=endpoint).observe(elapsed)
            status = "error" if exc_type else "success"
            REQUEST_COUNT.labels(endpoint=endpoint, status=status).inc()
            _update_gpu_metrics()

    return _Tracker()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health", tags=["ops"])
async def health_check() -> dict:
    """Health check with GPU statistics."""
    gpu_info: List[dict] = []
    if torch.cuda.is_available():
        for i in range(torch.cuda.device_count()):
            mem = torch.cuda.mem_get_info(i)
            gpu_info.append({
                "device": f"cuda:{i}",
                "name": torch.cuda.get_device_name(i),
                "free_gb": round(mem[0] / 1e9, 2),
                "total_gb": round(mem[1] / 1e9, 2),
                "utilisation_pct": round((1 - mem[0] / mem[1]) * 100, 1),
            })
    return {
        "status": "healthy",
        "models_loaded": list(_models.keys()),
        "gpu": gpu_info or [{"device": "cpu", "name": "CPU-only"}],
        "torch_version": torch.__version__,
    }


@app.get("/metrics", tags=["ops"])
async def prometheus_metrics():
    """Prometheus metrics endpoint."""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/embed/visual", tags=["embedding"])
async def embed_visual(request: VisualEmbedRequest) -> dict:
    """Generate average-pooled visual embedding across provided images."""
    with _track("/embed/visual"):
        try:
            pipeline = _get_or_load_embedding_pipeline()
            emb = pipeline.generate_visual_embedding(request.image_urls)
            return {"embedding": emb.tolist(), "dim": len(emb), "image_count": len(request.image_urls)}
        except Exception as exc:
            log.error("embed_visual_failed", error=str(exc))
            raise HTTPException(status_code=500, detail=str(exc))


@app.post("/embed/semantic", tags=["embedding"])
async def embed_semantic(request: SemanticEmbedRequest) -> dict:
    """Generate semantic text embedding via OpenAI text-embedding-3-large."""
    with _track("/embed/semantic"):
        try:
            pipeline = _get_or_load_embedding_pipeline()
            emb = pipeline.generate_semantic_embedding(request.text)
            return {"embedding": emb.tolist(), "dim": len(emb)}
        except Exception as exc:
            log.error("embed_semantic_failed", error=str(exc))
            raise HTTPException(status_code=500, detail=str(exc))


@app.post("/embed/combined", tags=["embedding"])
async def embed_combined(request: CombinedEmbedRequest) -> dict:
    """Generate fused visual + semantic combined embedding."""
    with _track("/embed/combined"):
        try:
            pipeline = _get_or_load_embedding_pipeline()
            result = pipeline.generate_combined_embedding(
                request.image_urls, request.text, request.description
            )
            return {
                "visual_embedding": result.visual_embedding.tolist(),
                "semantic_embedding": result.semantic_embedding.tolist(),
                "design_dna": result.design_dna.tolist(),
                "combined": result.combined.tolist(),
                "image_count": result.image_count,
            }
        except Exception as exc:
            log.error("embed_combined_failed", error=str(exc))
            raise HTTPException(status_code=500, detail=str(exc))


@app.post("/classify", tags=["classification"])
async def classify(request: ClassifyRequest) -> dict:
    """Classify an embedding along body type, era, segment, design language axes."""
    with _track("/classify"):
        try:
            clf = _get_or_load_classifier()
            emb = np.array(request.embedding, dtype=np.float32)
            task = request.task
            result: dict = {}

            if task in ("body_type", "all"):
                r = clf.classify_body_type(emb)
                result["body_type"] = {"label": r.body_type, "confidence": r.confidence,
                                        "probabilities": r.probabilities}
            if task in ("era", "all"):
                r = clf.classify_era(emb)
                result["era"] = {"label": r.era, "confidence": r.confidence,
                                  "decade_start": r.decade_start}
            if task in ("segment", "all"):
                r = clf.classify_segment(emb)
                result["segment"] = {"label": r.segment, "confidence": r.confidence}
            if task in ("language", "all"):
                r = clf.classify_design_language(emb)
                result["design_language"] = {"label": r.language, "confidence": r.confidence}
            if task in ("concept", "all"):
                result["concept_probability"] = clf.classify_concept_vs_production(emb)
            if task in ("year", "all"):
                r = clf.predict_generation_year(emb)
                result["year_prediction"] = {
                    "min": r.estimated_year_min,
                    "max": r.estimated_year_max,
                    "most_likely": r.most_likely_year,
                    "confidence": r.confidence,
                }

            return result
        except Exception as exc:
            log.error("classify_failed", error=str(exc))
            raise HTTPException(status_code=500, detail=str(exc))


@app.post("/evolve/detect", tags=["evolution"])
async def evolve_detect(request: EvolveDetectRequest) -> dict:
    """Detect evolution type (facelift / full redesign / lineage probability)."""
    with _track("/evolve/detect"):
        try:
            detector = _get_or_load_evolution_detector()
            emb1 = np.array(request.embedding1, dtype=np.float32)
            emb2 = np.array(request.embedding2, dtype=np.float32)
            result: dict = {}
            detect = request.detect

            if detect in ("facelift", "all"):
                r = detector.detect_facelift(emb1, emb2)
                result["facelift"] = {
                    "is_facelift": r.is_facelift,
                    "confidence": r.confidence,
                    "changed_elements": r.changed_elements,
                    "similarity_score": r.similarity_score,
                    "notes": r.notes,
                }
            if detect in ("redesign", "all"):
                r = detector.detect_full_redesign(emb1, emb2)
                result["redesign"] = {
                    "is_redesign": r.is_redesign,
                    "confidence": r.confidence,
                    "similarity_score": r.similarity_score,
                    "notes": r.notes,
                }
            if detect in ("lineage", "all"):
                prob = detector.compute_lineage_probability(
                    emb1, emb2, request.year_delta, request.brand_same
                )
                result["lineage_probability"] = prob

            return result
        except Exception as exc:
            log.error("evolve_detect_failed", error=str(exc))
            raise HTTPException(status_code=500, detail=str(exc))


@app.post("/dna/extract", tags=["dna"])
async def dna_extract(request: DNAExtractRequest) -> dict:
    """Extract brand DNA from a list of car images."""
    with _track("/dna/extract"):
        try:
            vision = _get_or_load_vision_pipeline()
            dna_analyzer = _get_or_load_dna_analyzer()
            embedding_pipe = _get_or_load_embedding_pipeline()

            brand_dna_emb = embedding_pipe.generate_brand_dna_embedding(request.image_urls)
            # Extract per-image DNA vectors
            dna_vecs = []
            for url in request.image_urls:
                try:
                    img = _load_image_from_url(url)
                    dna_vecs.append(vision.extract_design_dna_vector(img))
                except Exception:
                    pass

            brand_dna = dna_analyzer.extract_brand_dna(dna_vecs, brand=request.brand)
            return {
                "brand": brand_dna.brand,
                "recognition_score": brand_dna.recognition_score,
                "dominant_style": brand_dna.dominant_style,
                "brand_dna_embedding": brand_dna_emb.tolist(),
                "image_count": len(dna_vecs),
            }
        except Exception as exc:
            log.error("dna_extract_failed", error=str(exc))
            raise HTTPException(status_code=500, detail=str(exc))


@app.post("/search/similar", tags=["search"])
async def search_similar(request: SearchSimilarRequest) -> dict:
    """Find similar generations in the FAISS index."""
    with _track("/search/similar"):
        try:
            pipeline = _get_or_load_embedding_pipeline()
            query = np.array(request.query_embedding, dtype=np.float32)
            results = pipeline.search_similar(query, k=request.k, min_similarity=request.min_similarity)
            return {
                "results": [
                    {
                        "generation_id": r.generation_id,
                        "similarity": r.similarity,
                        "distance": r.distance,
                        "metadata": r.metadata,
                    }
                    for r in results
                ],
                "count": len(results),
            }
        except Exception as exc:
            log.error("search_similar_failed", error=str(exc))
            raise HTTPException(status_code=500, detail=str(exc))


@app.post("/batch/process", tags=["batch"])
async def batch_process(request: BatchProcessRequest) -> dict:
    """
    Batch-process a list of images through the full vision pipeline.
    Collects requests and processes them together up to batch_size=32.
    """
    with _track("/batch/process"):
        try:
            vision = _get_or_load_vision_pipeline()
            images = []
            failed_indices = []
            for i, url in enumerate(request.image_urls):
                try:
                    images.append(_load_image_from_url(url))
                except Exception as exc:
                    log.warning("batch_image_load_failed", url=url, error=str(exc))
                    failed_indices.append(i)
                    images.append(Image.new("RGB", (224, 224)))  # placeholder

            BATCH_SIZE_HIST.observe(len(images))
            results = vision.batch_process(images, batch_size=request.batch_size)

            output = []
            for i, (url, res) in enumerate(zip(request.image_urls, results)):
                output.append({
                    "url": url,
                    "failed": i in failed_indices,
                    "clip_embedding_dim": len(res.clip_embedding),
                    "dino_embedding_dim": len(res.dino_embedding),
                    "design_dna_dim": len(res.design_dna),
                    "body_type": res.body_type.body_type,
                    "body_type_confidence": res.body_type.confidence,
                    "design_elements": {
                        "grille_style": res.design_elements.grille_style,
                        "headlight_style": res.design_elements.headlight_style,
                        "roofline": res.design_elements.roofline,
                        "wheel_arch": res.design_elements.wheel_arch,
                        "overall_style": res.design_elements.overall_style,
                    },
                    "n_detections": len(res.bounding_boxes),
                })

            return {"processed": len(output), "results": output}
        except Exception as exc:
            log.error("batch_process_failed", error=str(exc))
            raise HTTPException(status_code=500, detail=str(exc))


@app.post("/embed/visual/upload", tags=["embedding"])
async def embed_visual_upload(files: List[UploadFile] = File(...)) -> dict:
    """Accept direct image uploads and return visual embeddings."""
    with _track("/embed/visual/upload"):
        try:
            vision = _get_or_load_vision_pipeline()
            embeddings = []
            for f in files:
                data = await f.read()
                img = Image.open(io.BytesIO(data)).convert("RGB")
                emb = vision.extract_clip_embedding(img)
                embeddings.append(emb.tolist())
            avg = np.mean(np.array(embeddings, dtype=np.float32), axis=0) if embeddings else []
            if len(avg):
                avg = avg / (np.linalg.norm(avg) + 1e-8)
            return {"embeddings": embeddings, "average": avg.tolist() if len(avg) else []}
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "ml.inference.server:app",
        host="0.0.0.0",
        port=int(os.getenv("ML_SERVER_PORT", "8001")),
        workers=1,  # Single worker to share GPU memory
        log_level="info",
    )
