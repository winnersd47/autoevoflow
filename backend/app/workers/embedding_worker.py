from __future__ import annotations

import asyncio
import io
import os
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
    accept_content=settings.CELERY_ACCEPT_CONTENT,
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
    "daily-faiss-reindex": {
        "task": "workers.reindex_faiss",
        "schedule": crontab(hour=2, minute=0),
        "kwargs": {"index_type": "visual"},
    },
    "daily-brand-dna-rebuild": {
        "task": "workers.generate_brand_dna",
        "schedule": crontab(hour=3, minute=0),
        "kwargs": {"brand_id": None},  # None means all brands
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

            for img_record in images:
                try:
                    raw = _download_image(img_record.url)
                    pil_image = Image.open(io.BytesIO(raw)).convert("RGB")

                    # CLIP embedding
                    tensor = preprocess(pil_image).unsqueeze(0)
                    with torch.no_grad():
                        clip_emb = clip_model.encode_image(tensor)
                        clip_emb = clip_emb / clip_emb.norm(dim=-1, keepdim=True)
                    clip_vec = clip_emb.squeeze().cpu().numpy().tolist()

                    # DINOv2 embedding
                    dino_inputs = dino_extractor(images=pil_image, return_tensors="pt")
                    with torch.no_grad():
                        dino_out = dino_model(**dino_inputs)
                    dino_vec = dino_out.last_hidden_state[:, 0].squeeze().cpu().numpy().tolist()

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
    name="workers.reindex_faiss",
    bind=True,
    max_retries=3,
    default_retry_delay=300,
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def reindex_faiss(self, index_type: str = "visual") -> dict[str, Any]:
    """
    Rebuild the FAISS index from all embeddings stored in the DB.
    Writes the index file to disk for fast in-memory loading.
    """
    task_logger.info(f"reindex_faiss: index_type={index_type}")

    try:
        import faiss
        import numpy as np
        from sqlalchemy import select
        from app.db.postgresql.models import Generation

        embedding_col_map = {
            "visual": "visual_embedding",
            "semantic": "semantic_embedding",
            "dna": "design_dna_embedding",
        }
        if index_type not in embedding_col_map:
            raise ValueError(f"Unknown index_type: {index_type}")

        col_name = embedding_col_map[index_type]

        with _get_db_session() as db:
            generations = db.execute(
                select(Generation.id, getattr(Generation, col_name)).where(
                    getattr(Generation, col_name).isnot(None)
                )
            ).all()

        if not generations:
            task_logger.warning("No embeddings found for reindex")
            return {"status": "skipped", "reason": "no_embeddings", "index_type": index_type}

        ids = np.array([g[0] for g in generations], dtype=np.int64)
        vectors = np.array([g[1] for g in generations], dtype=np.float32)

        # Normalize for cosine similarity
        faiss.normalize_L2(vectors)
        dim = vectors.shape[1]

        index = faiss.IndexFlatIP(dim)
        id_map = faiss.IndexIDMap(index)
        id_map.add_with_ids(vectors, ids)

        index_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data", "faiss")
        os.makedirs(index_dir, exist_ok=True)
        index_path = os.path.join(index_dir, f"{index_type}.faiss")
        faiss.write_index(id_map, index_path)

        task_logger.info(f"FAISS index written: {index_path} ({len(generations)} vectors)")
        return {
            "status": "completed",
            "index_type": index_type,
            "vectors_indexed": len(generations),
            "dimensions": dim,
            "index_path": index_path,
        }

    except Exception as exc:
        task_logger.error(f"reindex_faiss failed: {exc}", exc_info=True)
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
) -> dict[str, Any]:
    """
    Call Claude/OpenAI to generate an analysis and persist the result.
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

            analysis = AIAnalysis(
                entity_type=entity_type,
                entity_id=entity_id,
                analysis_type=analysis_type,
                content=content,
                model_used=settings.ANTHROPIC_MODEL,
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
