from __future__ import annotations

import asyncio
import io
import os
import time
from datetime import datetime, timezone
from typing import Any

import httpx
import structlog
from celery import Celery
from celery.schedules import crontab
from celery.signals import task_failure, task_postrun, task_prerun
from celery.utils.log import get_task_logger

from app.core.config import settings

# ── Celery application ────────────────────────────────────────────────────────

celery_app = Celery(
    "automotive_ai",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer=settings.CELERY_TASK_SERIALIZER,
    result_serializer=settings.CELERY_RESULT_SERIALIZER,
    accept_content=settings.celery_accept_content_list,
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    result_expires=86400,  # 24h
    task_soft_time_limit=600,   # 10 min
    task_time_limit=900,        # 15 min
)

# ── Beat schedule ─────────────────────────────────────────────────────────────

celery_app.conf.beat_schedule = {
    "daily-brand-dna-rebuild": {
        "task": "workers.generate_brand_dna",
        "schedule": crontab(hour=3, minute=0),
        "kwargs": {"brand_id": None},  # None means all brands
    },
    "hourly-description-embeddings": {
        "task": "workers.generate_description_embeddings",
        "schedule": crontab(minute=0),  # every hour, fills any new un-embedded rows
        "kwargs": {"generation_id": None, "batch_size": 100},
    },
}

task_logger = get_task_logger(__name__)
logger = structlog.get_logger(__name__)


# ── Signal handlers ───────────────────────────────────────────────────────────


@task_prerun.connect
def on_task_start(task_id: str, task: Any, args: Any, kwargs: Any, **_: Any) -> None:
    logger.info("task_started", task_id=task_id, task_name=task.name)


@task_postrun.connect
def on_task_done(task_id: str, task: Any, state: str, **_: Any) -> None:
    logger.info("task_finished", task_id=task_id, task_name=task.name, state=state)


@task_failure.connect
def on_task_failure(task_id: str, exception: Exception, **_: Any) -> None:
    logger.error("task_failed", task_id=task_id, error=str(exception), exc_info=True)


# ── DB / model helpers (lazy imports to avoid import-time model loading) ──────


def _get_db_session():
    """Create a sync wrapper around the async session for use in tasks."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    sync_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    engine = create_engine(sync_url, pool_pre_ping=True)
    Session = sessionmaker(bind=engine)
    return Session()


def _run_async(coro):
    """Run an async coroutine from a synchronous Celery task."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(asyncio.run, coro)
                return future.result()
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


def _download_image(url: str, timeout: int = 30) -> bytes:
    import httpx as _httpx
    with _httpx.Client(timeout=timeout, follow_redirects=True) as client:
        resp = client.get(url)
        resp.raise_for_status()
        return resp.content


def _upload_to_s3(image_bytes: bytes, key: str) -> str:
    import boto3
    s3 = boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY,
        aws_secret_access_key=settings.AWS_SECRET_KEY,
        region_name=settings.AWS_REGION,
        endpoint_url=settings.S3_ENDPOINT_URL or None,
    )
    s3.put_object(
        Bucket=settings.S3_BUCKET,
        Key=key,
        Body=image_bytes,
        ContentType="image/jpeg",
    )
    base = settings.S3_ENDPOINT_URL or f"https://{settings.S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com"
    return f"{base.rstrip('/')}/{key}"


def _make_thumbnail(image_bytes: bytes, max_size: int = 512) -> bytes:
    from PIL import Image

    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img.thumbnail((max_size, max_size), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


# ── Tasks ─────────────────────────────────────────────────────────────────────


@celery_app.task(
    name="workers.generate_visual_embeddings",
    bind=True,
    max_retries=5,
    default_retry_delay=60,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
)
def generate_visual_embeddings(self, generation_id: int) -> dict[str, Any]:
    """
    Download all images for a generation, run CLIP + DINOv2 embeddings,
    and save results to the DB and EmbeddingRegistry.
    """
    task_logger.info(f"generate_visual_embeddings: generation_id={generation_id}")

    try:
        import numpy as np
        import open_clip
        import torch
        from PIL import Image
        from transformers import AutoFeatureExtractor, AutoModel
        from sqlalchemy import select, update
        from app.db.postgresql.models import Generation, VehicleImage, EmbeddingRegistry

        # Load CLIP model
        clip_model, _, preprocess = open_clip.create_model_and_transforms(
            settings.CLIP_MODEL_NAME, pretrained="laion2b_s32b_b82k"
        )
        clip_model.eval()
        device = settings.MODEL_DEVICE

        # Load DINOv2 model
        dino_extractor = AutoFeatureExtractor.from_pretrained(settings.DINO_MODEL_NAME)
        dino_model = AutoModel.from_pretrained(settings.DINO_MODEL_NAME)
        dino_model.eval()

        with _get_db_session() as db:
            images = db.execute(
                select(VehicleImage).where(
                    VehicleImage.generation_id == generation_id,
                    VehicleImage.processed == False,  # noqa: E712
                )
            ).scalars().all()

            all_clip_embeddings = []
            all_dino_embeddings = []
            batch_start = time.monotonic()

            for img_record in images:
                try:
                    raw = _download_image(img_record.url)
                    pil_image = Image.open(io.BytesIO(raw)).convert("RGB")

                    # CLIP embedding
                    clip_start = time.monotonic()
                    tensor = preprocess(pil_image).unsqueeze(0)
                    with torch.no_grad():
                        clip_emb = clip_model.encode_image(tensor)
                        clip_emb = clip_emb / clip_emb.norm(dim=-1, keepdim=True)
                    clip_vec = clip_emb.squeeze().cpu().numpy().tolist()
                    clip_duration_ms = (time.monotonic() - clip_start) * 1000

                    # DINOv2 embedding
                    dino_start = time.monotonic()
                    dino_inputs = dino_extractor(images=pil_image, return_tensors="pt")
                    with torch.no_grad():
                        dino_out = dino_model(**dino_inputs)
                    dino_vec = dino_out.last_hidden_state[:, 0].squeeze().cpu().numpy().tolist()
                    dino_duration_ms = (time.monotonic() - dino_start) * 1000

                    logger.info(
                        "embedding_inference",
                        model="clip+dino",
                        device=device,
                        clip_duration_ms=round(clip_duration_ms, 1),
                        dino_duration_ms=round(dino_duration_ms, 1),
                        duration_ms=round(clip_duration_ms + dino_duration_ms, 1),
                        item_count=1,
                        entity_id=generation_id,
                    )

                    # Store per-image embedding
                    db.execute(
                        update(VehicleImage)
                        .where(VehicleImage.id == img_record.id)
                        .values(embedding=clip_vec, processed=True)
                    )
                    all_clip_embeddings.append(clip_vec)
                    all_dino_embeddings.append(dino_vec)

                except Exception as exc:
                    task_logger.warning(
                        f"Failed to process image {img_record.id}: {exc}"
                    )
                    continue

            if images:
                logger.info(
                    "embedding_inference_batch",
                    model="clip+dino",
                    device=device,
                    duration_ms=round((time.monotonic() - batch_start) * 1000, 1),
                    batch_size=len(images),
                    item_count=len(all_clip_embeddings),
                    entity_id=generation_id,
                )

            if all_clip_embeddings:
                # Aggregate: mean of all image embeddings
                mean_clip = np.mean(all_clip_embeddings, axis=0).tolist()
                mean_dino = np.mean(all_dino_embeddings, axis=0).tolist()

                # Pad/truncate to expected dims
                visual_vec = (mean_clip + [0.0] * 1536)[:1536]
                semantic_vec = (mean_dino + [0.0] * 768)[:768]

                db.execute(
                    update(Generation)
                    .where(Generation.id == generation_id)
                    .values(
                        visual_embedding=visual_vec,
                        semantic_embedding=semantic_vec,
                    )
                )

                # EmbeddingRegistry
                for emb_type, vec, model_name in [
                    ("visual_clip", visual_vec, settings.CLIP_MODEL_NAME),
                    ("semantic_dino", semantic_vec, settings.DINO_MODEL_NAME),
                ]:
                    existing = db.execute(
                        select(EmbeddingRegistry).where(
                            EmbeddingRegistry.entity_type == "generation",
                            EmbeddingRegistry.entity_id == generation_id,
                            EmbeddingRegistry.embedding_type == emb_type,
                        )
                    ).scalar_one_or_none()
                    if existing:
                        existing.vector = vec
                        existing.updated_at = datetime.now(tz=timezone.utc)
                    else:
                        db.add(
                            EmbeddingRegistry(
                                entity_type="generation",
                                entity_id=generation_id,
                                embedding_type=emb_type,
                                model_name=model_name,
                                vector=vec,
                            )
                        )

            db.commit()

        return {
            "generation_id": generation_id,
            "images_processed": len(all_clip_embeddings),
            "status": "completed",
        }

    except Exception as exc:
        task_logger.error(f"generate_visual_embeddings failed: {exc}", exc_info=True)
        raise self.retry(exc=exc)


@celery_app.task(
    name="workers.generate_brand_dna",
    bind=True,
    max_retries=3,
    default_retry_delay=120,
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def generate_brand_dna(self, brand_id: int | None = None) -> dict[str, Any]:
    """
    Aggregate all generation embeddings for a brand (or all brands),
    compute the brand DNA vector, and persist it.
    """
    task_logger.info(f"generate_brand_dna: brand_id={brand_id}")

    try:
        import numpy as np
        from sqlalchemy import select, update
        from app.db.postgresql.models import Brand, CarModel, Generation

        with _get_db_session() as db:
            if brand_id is not None:
                brands = db.execute(select(Brand).where(Brand.id == brand_id)).scalars().all()
            else:
                brands = db.execute(select(Brand)).scalars().all()

            processed = 0
            for brand in brands:
                model_ids = [
                    m.id for m in db.execute(
                        select(CarModel).where(CarModel.brand_id == brand.id)
                    ).scalars().all()
                ]
                if not model_ids:
                    continue

                generations = db.execute(
                    select(Generation).where(
                        Generation.model_id.in_(model_ids),
                        Generation.visual_embedding.isnot(None),
                    )
                ).scalars().all()

                if not generations:
                    continue

                all_visual = [g.visual_embedding for g in generations if g.visual_embedding]
                if not all_visual:
                    continue

                dna_vec = np.mean(all_visual, axis=0)
                # Reduce to 512 dims for DNA embedding
                dna_512 = dna_vec[:512].tolist()

                db.execute(
                    update(Brand).where(Brand.id == brand.id).values(dna_embedding=dna_512)
                )
                processed += 1

            db.commit()

        return {"brands_processed": processed, "status": "completed"}

    except Exception as exc:
        task_logger.error(f"generate_brand_dna failed: {exc}", exc_info=True)
        raise self.retry(exc=exc)


@celery_app.task(
    name="workers.process_crawled_images",
    bind=True,
    max_retries=5,
    default_retry_delay=30,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=300,
)
def process_crawled_images(
    self,
    image_urls: list[str],
    generation_id: int,
) -> dict[str, Any]:
    """
    Download images, validate, create thumbnails, upload to S3, run embeddings.
    """
    task_logger.info(
        f"process_crawled_images: generation_id={generation_id}, count={len(image_urls)}"
    )

    try:
        from PIL import Image
        from sqlalchemy import select
        from app.db.postgresql.models import VehicleImage, ViewType

        processed = []
        failed = []

        with _get_db_session() as db:
            for url in image_urls:
                try:
                    raw = _download_image(url)

                    # Validate image
                    img = Image.open(io.BytesIO(raw))
                    width, height = img.size
                    if width < 100 or height < 100:
                        task_logger.warning(f"Image too small, skipping: {url}")
                        failed.append(url)
                        continue

                    # Thumbnail
                    thumb_bytes = _make_thumbnail(raw)

                    # Upload to S3
                    import uuid as _uuid
                    key = f"generations/{generation_id}/{_uuid.uuid4().hex}.jpg"
                    thumb_key = f"generations/{generation_id}/thumbs/{_uuid.uuid4().hex}.jpg"

                    s3_url = _upload_to_s3(raw, key)
                    thumb_url = _upload_to_s3(thumb_bytes, thumb_key)

                    img_record = VehicleImage(
                        generation_id=generation_id,
                        url=s3_url,
                        storage_key=key,
                        source="crawler",
                        view_type=ViewType.other,
                        thumbnail_url=thumb_url,
                        width=width,
                        height=height,
                        processed=False,
                    )
                    db.add(img_record)
                    processed.append(url)

                except Exception as exc:
                    task_logger.warning(f"Failed to process image {url}: {exc}")
                    failed.append(url)

            db.commit()

        # Trigger embedding generation
        if processed:
            generate_visual_embeddings.delay(generation_id)

        return {
            "generation_id": generation_id,
            "processed": len(processed),
            "failed": len(failed),
            "status": "completed",
        }

    except Exception as exc:
        task_logger.error(f"process_crawled_images failed: {exc}", exc_info=True)
        raise self.retry(exc=exc)


@celery_app.task(
    name="workers.generate_description_embeddings",
    bind=True,
    max_retries=3,
    default_retry_delay=120,
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def generate_description_embeddings(
    self,
    generation_id: int | None = None,
    batch_size: int = 50,
) -> dict[str, Any]:
    """
    Generate text-embedding-3-small (1536-dim) embeddings from generation
    descriptions and store them in description_embedding.

    Called after crawl or on-demand to enable semantic text search.
    Passes `dimensions=1536` explicitly so the column always matches.

    If generation_id is None — process all generations without an embedding.
    """
    task_logger.info(
        f"generate_description_embeddings: generation_id={generation_id}, batch={batch_size}"
    )

    _EMBED_MODEL = "text-embedding-3-small"
    _EMBED_DIM = 1536

    try:
        from sqlalchemy import select, update
        from app.db.postgresql.models import Generation, CarModel, Brand

        with _get_db_session() as db:
            if generation_id is not None:
                gens = db.execute(
                    select(Generation).where(Generation.id == generation_id)
                ).scalars().all()
            else:
                gens = db.execute(
                    select(Generation)
                    .where(Generation.description_embedding.is_(None))
                    .limit(batch_size)
                ).scalars().all()

            if not gens:
                return {"processed": 0, "status": "no_work"}

            # Fetch brand + model names in one pass for richer context text
            model_ids = list({g.model_id for g in gens})
            models_map: dict[int, tuple[str, str]] = {}
            car_models = db.execute(
                select(CarModel, Brand)
                .join(Brand, CarModel.brand_id == Brand.id)
                .where(CarModel.id.in_(model_ids))
            ).all()
            for cm, brand in car_models:
                models_map[cm.id] = (brand.name, cm.name)

            import openai as _openai
            client = _openai.OpenAI(api_key=settings.OPENAI_API_KEY)

            texts: list[str] = []
            for gen in gens:
                brand_name, model_name = models_map.get(gen.model_id, ("", ""))
                parts = [brand_name, model_name]
                if gen.code_name:
                    parts.append(gen.code_name)
                if gen.year_start:
                    parts.append(str(gen.year_start))
                if gen.description:
                    parts.append(gen.description[:500])
                texts.append(" ".join(filter(None, parts)))

            start = time.monotonic()
            response = client.embeddings.create(
                model=_EMBED_MODEL,
                input=texts,
                dimensions=_EMBED_DIM,
            )
            duration_ms = (time.monotonic() - start) * 1000
            logger.info(
                "embedding_inference",
                model=_EMBED_MODEL,
                device="api",
                duration_ms=round(duration_ms, 1),
                item_count=len(gens),
                batch_size=batch_size,
            )

            for gen, emb_data in zip(gens, response.data):
                db.execute(
                    update(Generation)
                    .where(Generation.id == gen.id)
                    .values(description_embedding=emb_data.embedding)
                )

            db.commit()

        return {
            "processed": len(gens),
            "model": _EMBED_MODEL,
            "status": "completed",
        }

    except Exception as exc:
        task_logger.error(f"generate_description_embeddings failed: {exc}", exc_info=True)
        raise self.retry(exc=exc)


@celery_app.task(
    name="workers.update_evolution_graph",
    bind=True,
    max_retries=3,
    default_retry_delay=120,
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def update_evolution_graph(self, brand_id: int) -> dict[str, Any]:
    """
    Run the EvolutionEngine for a brand and write resulting edges to Neo4j.
    """
    task_logger.info(f"update_evolution_graph: brand_id={brand_id}")

    async def _run() -> dict[str, Any]:
        from app.db.postgresql.database import async_session_factory
        from app.db.neo4j.graph import neo4j_graph
        from app.db.redis.cache import redis_cache
        from app.services.evolution.engine import EvolutionEngine

        await redis_cache.connect()
        await neo4j_graph.connect()

        async with async_session_factory() as db:
            engine = EvolutionEngine(db=db, neo4j_driver=neo4j_graph, redis=redis_cache)
            tree = await engine.build_evolution_tree(brand_id)

        await redis_cache.close()
        await neo4j_graph.close()
        return {"brand_id": brand_id, "status": "completed", "nodes": tree.total_nodes}

    try:
        return _run_async(_run())
    except Exception as exc:
        task_logger.error(f"update_evolution_graph failed: {exc}", exc_info=True)
        raise self.retry(exc=exc)


@celery_app.task(
    name="workers.generate_ai_analysis",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
)
def generate_ai_analysis(
    self,
    entity_type: str,
    entity_id: int,
    analysis_type: str = "evolution",
    model_provider: str = "yandex",
) -> dict[str, Any]:
    """
    Call YandexGPT/OpenAI to generate an analysis and persist the result.
    """
    task_logger.info(
        f"generate_ai_analysis: entity_type={entity_type}, "
        f"entity_id={entity_id}, analysis_type={analysis_type}"
    )

    async def _run() -> dict[str, Any]:
        from app.db.postgresql.database import async_session_factory
        from app.services.ai.analysis_service import AnalysisService
        from app.db.postgresql.models import AIAnalysis

        async with async_session_factory() as db:
            svc = AnalysisService(db=db)
            content = ""

            if analysis_type == "evolution" and entity_type == "generation":
                content = await svc.generate_evolution_analysis(entity_id)
            elif analysis_type == "brand_dna" and entity_type == "brand":
                content = await svc.generate_brand_dna_report(entity_id)
            elif analysis_type == "future_prediction" and entity_type == "model":
                prediction = await svc.predict_future_generation(entity_id)
                content = prediction.prediction_text
            else:
                content = f"Analysis of type '{analysis_type}' for {entity_type} {entity_id}"

            _model_name = "yandexgpt-pro"
            analysis = AIAnalysis(
                entity_type=entity_type,
                entity_id=entity_id,
                analysis_type=analysis_type,
                content=content,
                model_used=_model_name,
            )
            db.add(analysis)
            await db.commit()
            await db.refresh(analysis)

            return {
                "analysis_id": analysis.id,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "analysis_type": analysis_type,
                "status": "completed",
            }

    try:
        return _run_async(_run())
    except Exception as exc:
        task_logger.error(f"generate_ai_analysis failed: {exc}", exc_info=True)
        raise self.retry(exc=exc)
