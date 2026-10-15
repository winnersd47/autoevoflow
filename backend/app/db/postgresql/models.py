from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utcnow() -> datetime:
    return datetime.now(tz=timezone.utc)


# ── Base ──────────────────────────────────────────────────────────────────────


class Base(DeclarativeBase):
    pass


# ── Enums ─────────────────────────────────────────────────────────────────────


class BodyType(str, enum.Enum):
    sedan = "sedan"
    hatchback = "hatchback"
    wagon = "wagon"
    coupe = "coupe"
    convertible = "convertible"
    suv = "suv"
    crossover = "crossover"
    pickup = "pickup"
    van = "van"
    minivan = "minivan"
    roadster = "roadster"
    other = "other"


class EngineType(str, enum.Enum):
    petrol = "petrol"
    diesel = "diesel"
    hybrid = "hybrid"
    plug_in_hybrid = "plug_in_hybrid"
    electric = "electric"
    hydrogen = "hydrogen"
    other = "other"


class Drivetrain(str, enum.Enum):
    fwd = "fwd"
    rwd = "rwd"
    awd = "awd"
    fourwd = "4wd"


class Transmission(str, enum.Enum):
    manual = "manual"
    automatic = "automatic"
    cvt = "cvt"
    dct = "dct"
    amt = "amt"


class ViewType(str, enum.Enum):
    front = "front"
    rear = "rear"
    side = "side"
    three_quarter_front = "three_quarter_front"
    three_quarter_rear = "three_quarter_rear"
    interior = "interior"
    dashboard = "dashboard"
    detail = "detail"
    aerial = "aerial"
    other = "other"


class CrawlerStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class UserRole(str, enum.Enum):
    user = "user"
    premium = "premium"
    admin = "admin"


class OAuthProvider(str, enum.Enum):
    local = "local"
    google = "google"
    github = "github"


# ── Models ────────────────────────────────────────────────────────────────────


class Brand(Base):
    __tablename__ = "brands"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    country: Mapped[str | None] = mapped_column(String(100))
    founded_year: Mapped[int | None] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(Text)
    logo_url: Mapped[str | None] = mapped_column(String(2048))
    dna_embedding: Mapped[Any | None] = mapped_column(Vector(1536))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    models: Mapped[list[CarModel]] = relationship("CarModel", back_populates="brand", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_brands_name_trgm", "name", postgresql_using="gin", postgresql_ops={"name": "gin_trgm_ops"}),
        Index("ix_brands_dna_embedding", "dna_embedding", postgresql_using="hnsw", postgresql_with={"m": 16, "ef_construction": 64}, postgresql_ops={"dna_embedding": "vector_cosine_ops"}),
    )


class CarModel(Base):
    __tablename__ = "car_models"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    brand_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("brands.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(512), nullable=False, unique=True, index=True)
    body_type: Mapped[BodyType | None] = mapped_column(Enum(BodyType, name="body_type_enum"))
    is_concept: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    brand: Mapped[Brand] = relationship("Brand", back_populates="models")
    generations: Mapped[list[Generation]] = relationship("Generation", back_populates="model", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_car_models_brand_name", "brand_id", "name"),
    )


class Generation(Base):
    __tablename__ = "generations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    model_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("car_models.id", ondelete="CASCADE"), nullable=False, index=True)
    code_name: Mapped[str | None] = mapped_column(String(255))
    year_start: Mapped[int | None] = mapped_column(Integer)
    year_end: Mapped[int | None] = mapped_column(Integer)
    facelift_of_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("generations.id", ondelete="SET NULL"), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    generation_number: Mapped[int | None] = mapped_column(Integer)
    visual_embedding: Mapped[Any | None] = mapped_column(Vector(1536))
    semantic_embedding: Mapped[Any | None] = mapped_column(Vector(768))
    design_dna_embedding: Mapped[Any | None] = mapped_column(Vector(512))
    description_embedding: Mapped[Any | None] = mapped_column(Vector(1536))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    model: Mapped[CarModel] = relationship("CarModel", back_populates="generations")
    facelift_of: Mapped[Generation | None] = relationship("Generation", remote_side="Generation.id", foreign_keys=[facelift_of_id])
    trims: Mapped[list[Trim]] = relationship("Trim", back_populates="generation", cascade="all, delete-orphan")
    images: Mapped[list[VehicleImage]] = relationship("VehicleImage", back_populates="generation", cascade="all, delete-orphan")
    analyses: Mapped[list[AIAnalysis]] = relationship(
        "AIAnalysis",
        primaryjoin="and_(AIAnalysis.entity_type == 'generation', foreign(AIAnalysis.entity_id) == Generation.id)",
        viewonly=True,
    )

    __table_args__ = (
        Index("ix_generations_model_year", "model_id", "year_start"),
        Index(
            "ix_generations_visual_embedding",
            "visual_embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"visual_embedding": "vector_cosine_ops"},
        ),
        Index(
            "ix_generations_semantic_embedding",
            "semantic_embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"semantic_embedding": "vector_cosine_ops"},
        ),
        Index(
            "ix_generations_dna_embedding",
            "design_dna_embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"design_dna_embedding": "vector_cosine_ops"},
        ),
        Index(
            "ix_generations_description_embedding",
            "description_embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"description_embedding": "vector_cosine_ops"},
        ),
    )


class Trim(Base):
    __tablename__ = "trims"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    generation_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("generations.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    engine_type: Mapped[EngineType | None] = mapped_column(Enum(EngineType, name="engine_type_enum"))
    displacement_cc: Mapped[int | None] = mapped_column(Integer)
    power_hp: Mapped[int | None] = mapped_column(Integer)
    torque_nm: Mapped[int | None] = mapped_column(Integer)
    weight_kg: Mapped[int | None] = mapped_column(Integer)
    drivetrain: Mapped[Drivetrain | None] = mapped_column(Enum(Drivetrain, name="drivetrain_enum"))
    transmission: Mapped[Transmission | None] = mapped_column(Enum(Transmission, name="transmission_enum"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    generation: Mapped[Generation] = relationship("Generation", back_populates="trims")

    __table_args__ = (
        UniqueConstraint("generation_id", "name", name="uq_trims_generation_name"),
    )


class VehicleImage(Base):
    __tablename__ = "vehicle_images"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    generation_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("generations.id", ondelete="CASCADE"), nullable=False, index=True)
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    storage_key: Mapped[str | None] = mapped_column(String(1024))
    source: Mapped[str | None] = mapped_column(String(255))
    view_type: Mapped[ViewType] = mapped_column(
        Enum(ViewType, name="view_type_enum"), default=ViewType.other, nullable=False
    )
    processed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    embedding: Mapped[Any | None] = mapped_column(Vector(1536))
    thumbnail_url: Mapped[str | None] = mapped_column(String(2048))
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    generation: Mapped[Generation] = relationship("Generation", back_populates="images")

    __table_args__ = (
        Index("ix_vehicle_images_generation_view", "generation_id", "view_type"),
        Index("ix_vehicle_images_processed", "processed"),
        Index(
            "ix_vehicle_images_embedding",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )


class SourceMapping(Base):
    __tablename__ = "source_mappings"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    source_name: Mapped[str] = mapped_column(String(255), nullable=False)
    source_id: Mapped[str | None] = mapped_column(String(1024))
    source_url: Mapped[str | None] = mapped_column(String(2048))
    last_crawled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Not "metadata" — that name is reserved on every Declarative model (it's
    # SQLAlchemy's own MetaData registry attribute).
    extra_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSONB)

    __table_args__ = (
        UniqueConstraint("entity_type", "entity_id", "source_name", name="uq_source_mappings"),
        Index("ix_source_mappings_entity", "entity_type", "entity_id"),
        Index("ix_source_mappings_source", "source_name", "source_id"),
    )


class CrawlerJob(Base):
    __tablename__ = "crawler_jobs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(String(255), nullable=False)
    job_type: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[CrawlerStatus] = mapped_column(
        Enum(CrawlerStatus, name="crawler_status_enum"),
        default=CrawlerStatus.pending,
        nullable=False,
    )
    progress: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_items: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    items_crawled: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Not "metadata" — reserved on every Declarative model (SQLAlchemy's own
    # MetaData registry attribute).
    extra_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_crawler_jobs_status", "status"),
        Index("ix_crawler_jobs_source_type", "source", "job_type"),
    )


class AIAnalysis(Base):
    __tablename__ = "ai_analyses"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    analysis_type: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    model_used: Mapped[str | None] = mapped_column(String(255))
    tokens_used: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_ai_analyses_entity", "entity_type", "entity_id"),
        Index("ix_ai_analyses_type", "analysis_type"),
    )


class ReferralStatus(str, enum.Enum):
    pending = "pending"
    credited = "credited"
    cancelled = "cancelled"


class NotificationType(str, enum.Enum):
    info = "info"
    success = "success"
    warning = "warning"
    error = "error"
    referral = "referral"
    payment = "payment"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True, index=True)
    hashed_password: Mapped[str | None] = mapped_column(String(1024))
    name: Mapped[str | None] = mapped_column(String(255))
    avatar_url: Mapped[str | None] = mapped_column(String(2048))
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role_enum"), default=UserRole.user, nullable=False
    )
    oauth_provider: Mapped[OAuthProvider] = mapped_column(
        Enum(OAuthProvider, name="oauth_provider_enum"),
        default=OAuthProvider.local,
        nullable=False,
    )
    oauth_id: Mapped[str | None] = mapped_column(String(512))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Plan / subscription
    plan: Mapped[str] = mapped_column(String(20), nullable=False, default="free")
    plan_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    referral_code: Mapped[str | None] = mapped_column(String(12), unique=True, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Referral relationships
    referrals_given: Mapped[list[Referral]] = relationship(
        "Referral", foreign_keys="Referral.referrer_id", back_populates="referrer", lazy="select"
    )
    referral_received: Mapped[list[Referral]] = relationship(
        "Referral", foreign_keys="Referral.referred_id", back_populates="referred", lazy="select"
    )
    notifications: Mapped[list[Notification]] = relationship(
        "Notification", back_populates="user", lazy="select"
    )

    __table_args__ = (
        UniqueConstraint("oauth_provider", "oauth_id", name="uq_users_oauth"),
        Index("ix_users_oauth", "oauth_provider", "oauth_id"),
    )


class Referral(Base):
    __tablename__ = "referrals"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    referrer_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    referred_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    level: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    reward_days: Mapped[int] = mapped_column(Integer, nullable=False, default=7)
    status: Mapped[ReferralStatus] = mapped_column(
        Enum(ReferralStatus, name="referral_status_enum"), nullable=False, default=ReferralStatus.pending
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    referrer: Mapped[User] = relationship("User", foreign_keys=[referrer_id], back_populates="referrals_given")
    referred: Mapped[User] = relationship("User", foreign_keys=[referred_id], back_populates="referral_received")

    __table_args__ = (
        Index("ix_referrals_referrer", "referrer_id"),
    )


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType, name="notification_type_enum"), nullable=False, default=NotificationType.info
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    action_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped[User] = relationship("User", back_populates="notifications")

    __table_args__ = (
        Index("ix_notifications_user_read", "user_id", "is_read"),
    )


class EmbeddingRegistry(Base):
    __tablename__ = "embedding_registry"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    embedding_type: Mapped[str] = mapped_column(String(255), nullable=False)
    model_name: Mapped[str] = mapped_column(String(255), nullable=False)
    vector: Mapped[Any | None] = mapped_column(Vector(1536))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("entity_type", "entity_id", "embedding_type", "model_name", name="uq_embedding_registry"),
        Index("ix_embedding_registry_entity", "entity_type", "entity_id"),
        Index(
            "ix_embedding_registry_vector",
            "vector",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"vector": "vector_cosine_ops"},
        ),
    )
