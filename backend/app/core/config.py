from __future__ import annotations

import secrets
from functools import lru_cache
from typing import Any, Literal

from pydantic import AnyHttpUrl, EmailStr, Field, PostgresDsn, RedisDsn, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ───────────────────────────────────────────────────────────
    APP_NAME: str = "Automotive AI Evolution Platform"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = False
    SECRET_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(64))

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/automotive_ai"
    )
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 40
    DATABASE_POOL_TIMEOUT: int = 30
    DATABASE_POOL_RECYCLE: int = 1800

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = Field(default="redis://localhost:6379/0")
    REDIS_POOL_SIZE: int = 20
    REDIS_DECODE_RESPONSES: bool = True

    # ── Neo4j ─────────────────────────────────────────────────────────────────
    NEO4J_URI: str = Field(default="bolt://localhost:7687")
    NEO4J_USER: str = Field(default="neo4j")
    NEO4J_PASS: str = Field(default="password")
    NEO4J_DATABASE: str = "neo4j"
    NEO4J_MAX_CONNECTION_POOL_SIZE: int = 50

    # ── AI / LLM ──────────────────────────────────────────────────────────────
    OPENAI_API_KEY: str = Field(default="")
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-large"
    OPENAI_CHAT_MODEL: str = "gpt-4o"

    # ── Yandex AI (YandexGPT, SpeechKit, Vision OCR, YandexART) ──────────────
    YANDEX_API_KEY: str = Field(default="")
    YANDEX_FOLDER_ID: str = Field(default="")

    # ── Vision Models ─────────────────────────────────────────────────────────
    CLIP_MODEL_NAME: str = "ViT-L-14"
    DINO_MODEL_NAME: str = "facebook/dinov2-large"
    EMBEDDING_BATCH_SIZE: int = 32
    MODEL_DEVICE: str = "cpu"

    # ── JWT ───────────────────────────────────────────────────────────────────
    JWT_SECRET: str = Field(default_factory=lambda: secrets.token_urlsafe(64))
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── OAuth2 ────────────────────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = Field(default="")
    GOOGLE_CLIENT_SECRET: str = Field(default="")
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"

    GITHUB_CLIENT_ID: str = Field(default="")
    GITHUB_CLIENT_SECRET: str = Field(default="")
    GITHUB_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/github/callback"

    # ── AWS / S3 ──────────────────────────────────────────────────────────────
    S3_BUCKET: str = Field(default="automotive-ai-assets")
    AWS_ACCESS_KEY: str = Field(default="")
    AWS_SECRET_KEY: str = Field(default="")
    AWS_REGION: str = "us-east-1"
    S3_ENDPOINT_URL: str | None = None  # For MinIO / custom endpoints

    # ── Observability ─────────────────────────────────────────────────────────
    SENTRY_DSN: str | None = None
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1
    OTEL_ENDPOINT: str | None = None

    # ── CORS ──────────────────────────────────────────────────────────────────
    # Plain comma-separated strings, not list[str]: pydantic-settings 2.6's
    # env source tries to json.loads() any field typed as a complex/list type
    # before field_validator ever runs, so a plain ".env" value like
    # "http://a,http://b" (not JSON) fails Settings() construction outright.
    # NoDecode (which fixes this properly) only landed in a later
    # pydantic-settings release. Split into a list at the point of use instead
    # — see allowed_origins_list / allowed_methods_list / allowed_headers_list.
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001"
    ALLOWED_METHODS: str = "*"
    ALLOWED_HEADERS: str = "*"

    # ── Crawler ───────────────────────────────────────────────────────────────
    MAX_CRAWL_WORKERS: int = 10
    CRAWL_RATE_LIMIT_RPS: float = 2.0
    CRAWL_REQUEST_TIMEOUT: int = 30

    # ── Celery ────────────────────────────────────────────────────────────────
    CELERY_BROKER_URL: str = Field(default="redis://localhost:6379/1")
    CELERY_RESULT_BACKEND: str = Field(default="redis://localhost:6379/2")
    CELERY_TASK_SERIALIZER: str = "json"
    CELERY_RESULT_SERIALIZER: str = "json"
    CELERY_ACCEPT_CONTENT: str = "json"

    # ── Pagination ────────────────────────────────────────────────────────────
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    # ── Search ────────────────────────────────────────────────────────────────
    VECTOR_SEARCH_LIMIT: int = 20
    VECTOR_SEARCH_MIN_SCORE: float = 0.6

    # ── f2u-cli Temp File Hosting ─────────────────────────────────────────────
    F2U_API_KEY: str = ""  # f2u.sh API key for temp file hosting (free: 24h, 10MB)

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        if v and not v.startswith("postgresql+asyncpg://"):
            # Auto-convert sync URL to async
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
            v = v.replace("postgres://", "postgresql+asyncpg://", 1)
        return v

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if self.ENVIRONMENT == "production":
            if not self.SENTRY_DSN:
                import warnings
                warnings.warn("SENTRY_DSN not set in production", stacklevel=2)
            if self.JWT_SECRET == self.SECRET_KEY:
                pass  # Fine, they can be the same
        return self

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def allowed_methods_list(self) -> list[str]:
        return [m.strip() for m in self.ALLOWED_METHODS.split(",") if m.strip()]

    @property
    def allowed_headers_list(self) -> list[str]:
        return [h.strip() for h in self.ALLOWED_HEADERS.split(",") if h.strip()]

    @property
    def celery_accept_content_list(self) -> list[str]:
        return [c.strip() for c in self.CELERY_ACCEPT_CONTENT.split(",") if c.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
