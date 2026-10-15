from __future__ import annotations

import time
from contextlib import asynccontextmanager
from typing import Any

import sentry_sdk
import structlog
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    Counter,
    Histogram,
    generate_latest,
)
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings

logger = structlog.get_logger(__name__)

# ── Prometheus metrics ────────────────────────────────────────────────────────

REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "path", "status_code"],
)
REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "path"],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
)


# ── Middlewares ───────────────────────────────────────────────────────────────


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log method, path, status code, and duration for every request."""

    async def dispatch(self, request: Request, call_next: Any) -> Response:
        start = time.perf_counter()
        response: Response = await call_next(request)
        duration = time.perf_counter() - start
        logger.info(
            "http_request",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=round(duration * 1000, 2),
            client=request.client.host if request.client else None,
        )
        return response


class PrometheusMiddleware(BaseHTTPMiddleware):
    """Track request counts and latency in Prometheus."""

    async def dispatch(self, request: Request, call_next: Any) -> Response:
        path = request.url.path
        method = request.method
        start = time.perf_counter()
        response: Response = await call_next(request)
        duration = time.perf_counter() - start
        REQUEST_COUNT.labels(method=method, path=path, status_code=response.status_code).inc()
        REQUEST_LATENCY.labels(method=method, path=path).observe(duration)
        return response


# ── Lifespan ──────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle manager."""
    # Sentry
    if settings.SENTRY_DSN:
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
            environment=settings.ENVIRONMENT,
            release=f"automotive-ai-platform@{settings.APP_VERSION}",
        )
        logger.info("Sentry initialised")

    # PostgreSQL
    from app.db.postgresql.database import engine
    logger.info("PostgreSQL engine ready", url=settings.DATABASE_URL.split("@")[-1])

    # Redis — best-effort. Not required for auth (register/login/me); only used
    # for the refresh-token logout blacklist and misc caching. If unreachable
    # (e.g. no local virtualization for Docker), skip rather than crash so the
    # rest of the API — including auth — still comes up.
    from app.db.redis.cache import redis_cache
    try:
        await redis_cache.connect()
    except Exception as exc:
        logger.warning("Redis unavailable — continuing without it", error=str(exc))

    # Neo4j — best-effort, same reasoning. Only used by the graph-relationship
    # routes, never by auth.
    from app.db.neo4j.graph import neo4j_graph
    try:
        await neo4j_graph.connect()
    except Exception as exc:
        logger.warning("Neo4j unavailable — continuing without it", error=str(exc))

    # FAISS index (non-blocking: load in background)
    try:
        from app.services.search.vector_search import VectorSearchService
        _search_svc = VectorSearchService.__new__(VectorSearchService)
        logger.info("FAISS index loading deferred to first search request")
    except Exception as exc:
        logger.warning("FAISS init skipped", error=str(exc))

    logger.info(
        "Application started",
        env=settings.ENVIRONMENT,
        version=settings.APP_VERSION,
    )

    yield

    # Shutdown
    await redis_cache.close()
    await neo4j_graph.close()
    await engine.dispose()
    logger.info("Application shutdown complete")


# ── App factory ───────────────────────────────────────────────────────────────


def create_app() -> FastAPI:
    app = FastAPI(
        title="Automotive AI Platform",
        version="1.0.0",
        description=(
            "AI-powered Automotive Evolution Platform — explore brand DNA, "
            "track design lineage across generations, and discover hidden "
            "cross-brand visual connections using vector embeddings and graph analytics."
        ),
        openapi_url="/api/openapi.json",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        lifespan=lifespan,
    )

    # ── CORS ──────────────────────────────────────────────────────────────────
    origins = (
        ["*"]
        if settings.is_development
        else settings.allowed_origins_list
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=settings.allowed_methods_list,
        allow_headers=settings.allowed_headers_list,
    )

    # ── Logging + Prometheus ──────────────────────────────────────────────────
    app.add_middleware(PrometheusMiddleware)
    app.add_middleware(RequestLoggingMiddleware)

    # ── Routers ───────────────────────────────────────────────────────────────
    from app.api.v1.router import api_router
    app.include_router(api_router, prefix="/api/v1")

    # ── Built-in routes ───────────────────────────────────────────────────────

    @app.get("/health", tags=["Ops"])
    async def health_check() -> dict[str, Any]:
        from app.db.redis.cache import redis_cache
        from app.db.neo4j.graph import neo4j_graph
        from app.db.postgresql.database import engine
        from sqlalchemy import text

        db_ok = False
        redis_ok = False
        neo4j_ok = False

        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            db_ok = True
        except Exception as exc:
            logger.warning("DB health check failed", error=str(exc))

        try:
            await redis_cache._r().ping()
            redis_ok = True
        except Exception as exc:
            logger.warning("Redis health check failed", error=str(exc))

        try:
            await neo4j_graph._get_driver().verify_connectivity()
            neo4j_ok = True
        except Exception as exc:
            logger.warning("Neo4j health check failed", error=str(exc))

        overall = "ok" if all([db_ok, redis_ok, neo4j_ok]) else "degraded"
        return {
            "status": overall,
            "db": "ok" if db_ok else "error",
            "redis": "ok" if redis_ok else "error",
            "neo4j": "ok" if neo4j_ok else "error",
            "version": settings.APP_VERSION,
        }

    @app.get("/metrics", tags=["Ops"], include_in_schema=False)
    async def metrics() -> Response:
        return Response(
            content=generate_latest(),
            media_type=CONTENT_TYPE_LATEST,
        )

    # ── Exception handlers ────────────────────────────────────────────────────

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        logger.warning(
            "http_exception",
            status_code=exc.status_code,
            detail=exc.detail,
            path=request.url.path,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=exc.headers or {},
        )

    @app.exception_handler(ValidationError)
    async def validation_exception_handler(request: Request, exc: ValidationError) -> JSONResponse:
        logger.warning("validation_error", errors=exc.errors(), path=request.url.path)
        return JSONResponse(
            status_code=422,
            content={"detail": exc.errors()},
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error(
            "unhandled_exception",
            error=str(exc),
            error_type=type(exc).__name__,
            path=request.url.path,
            exc_info=True,
        )
        if settings.SENTRY_DSN:
            sentry_sdk.capture_exception(exc)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )

    # ── Static files ──────────────────────────────────────────────────────────
    static_dir = getattr(settings, "STATIC_DIR", None)
    if static_dir:
        import os
        if os.path.isdir(static_dir):
            app.mount("/static", StaticFiles(directory=static_dir), name="static")
            logger.info("Static files mounted", directory=static_dir)

    return app


app = create_app()
