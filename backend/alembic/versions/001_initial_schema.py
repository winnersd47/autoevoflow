"""Initial database schema

Revision ID: 001
Revises:
Create Date: 2026-01-01 00:00:00.000000

Creates all tables for the Automotive AI Platform including:
- PostgreSQL extensions: vector, pg_trgm
- Core tables: brands, car_models, generations, trims, vehicle_images
- Supporting tables: source_mappings, crawler_jobs, ai_analyses
- Auth tables: users
- ML tables: embedding_registry
- All indexes: GIN trgm, ivfflat/hnsw vector, standard btree
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: str | None = None
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None


def upgrade() -> None:
    # ── Extensions ─────────────────────────────────────────────────────────────
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gin")

    # ── Enum types ─────────────────────────────────────────────────────────────
    body_type_enum = postgresql.ENUM(
        "sedan", "hatchback", "wagon", "coupe", "convertible",
        "suv", "crossover", "pickup", "van", "minivan", "roadster", "other",
        name="body_type_enum",
    )
    engine_type_enum = postgresql.ENUM(
        "petrol", "diesel", "hybrid", "plug_in_hybrid", "electric", "hydrogen", "other",
        name="engine_type_enum",
    )
    drivetrain_enum = postgresql.ENUM(
        "fwd", "rwd", "awd", "4wd",
        name="drivetrain_enum",
    )
    transmission_enum = postgresql.ENUM(
        "manual", "automatic", "cvt", "dct", "amt",
        name="transmission_enum",
    )
    view_type_enum = postgresql.ENUM(
        "front", "rear", "side", "three_quarter_front", "three_quarter_rear",
        "interior", "dashboard", "detail", "aerial", "other",
        name="view_type_enum",
    )
    crawler_status_enum = postgresql.ENUM(
        "pending", "running", "completed", "failed", "cancelled",
        name="crawler_status_enum",
    )
    user_role_enum = postgresql.ENUM(
        "user", "premium", "admin",
        name="user_role_enum",
    )
    oauth_provider_enum = postgresql.ENUM(
        "local", "google", "github",
        name="oauth_provider_enum",
    )

    for enum_type in [
        body_type_enum, engine_type_enum, drivetrain_enum, transmission_enum,
        view_type_enum, crawler_status_enum, user_role_enum, oauth_provider_enum,
    ]:
        enum_type.create(op.get_bind(), checkfirst=True)

    # ── brands ─────────────────────────────────────────────────────────────────
    op.create_table(
        "brands",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), nullable=False),
        sa.Column("country", sa.String(100), nullable=True),
        sa.Column("founded_year", sa.Integer(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("logo_url", sa.String(2048), nullable=True),
        sa.Column("dna_embedding", sa.Text(), nullable=True),  # vector(1536) via raw SQL below
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )

    # Add vector column via raw DDL (pgvector type)
    op.execute("ALTER TABLE brands ALTER COLUMN dna_embedding TYPE vector(1536) USING NULL::vector(1536)")
    op.execute("ALTER TABLE brands ALTER COLUMN dna_embedding DROP NOT NULL")

    op.create_index("ix_brands_slug", "brands", ["slug"], unique=True)
    op.create_index("ix_brands_name", "brands", ["name"])
    op.execute(
        "CREATE INDEX ix_brands_name_trgm ON brands USING gin (name gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX ix_brands_dna_embedding ON brands "
        "USING hnsw (dna_embedding vector_cosine_ops) "
        "WITH (m = 16, ef_construction = 64)"
    )

    # ── car_models ─────────────────────────────────────────────────────────────
    op.create_table(
        "car_models",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "brand_id",
            sa.BigInteger(),
            sa.ForeignKey("brands.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(512), nullable=False),
        sa.Column("body_type", body_type_enum, nullable=True),
        sa.Column("is_concept", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )

    op.create_index("ix_car_models_slug", "car_models", ["slug"], unique=True)
    op.create_index("ix_car_models_brand_id", "car_models", ["brand_id"])
    op.create_index("ix_car_models_brand_name", "car_models", ["brand_id", "name"])
    op.execute(
        "CREATE INDEX ix_car_models_name_trgm ON car_models USING gin (name gin_trgm_ops)"
    )

    # ── generations ────────────────────────────────────────────────────────────
    op.create_table(
        "generations",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "model_id",
            sa.BigInteger(),
            sa.ForeignKey("car_models.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("code_name", sa.String(255), nullable=True),
        sa.Column("year_start", sa.Integer(), nullable=True),
        sa.Column("year_end", sa.Integer(), nullable=True),
        sa.Column(
            "facelift_of_id",
            sa.BigInteger(),
            sa.ForeignKey("generations.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("generation_number", sa.Integer(), nullable=True),
        sa.Column("visual_embedding", sa.Text(), nullable=True),      # vector(1536)
        sa.Column("semantic_embedding", sa.Text(), nullable=True),    # vector(768)
        sa.Column("design_dna_embedding", sa.Text(), nullable=True),  # vector(512)
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )

    # Retype to pgvector columns
    op.execute(
        "ALTER TABLE generations "
        "ALTER COLUMN visual_embedding TYPE vector(1536) USING NULL::vector(1536), "
        "ALTER COLUMN semantic_embedding TYPE vector(768) USING NULL::vector(768), "
        "ALTER COLUMN design_dna_embedding TYPE vector(512) USING NULL::vector(512)"
    )

    op.create_index("ix_generations_model_id", "generations", ["model_id"])
    op.create_index("ix_generations_facelift_of_id", "generations", ["facelift_of_id"])
    op.create_index("ix_generations_model_year", "generations", ["model_id", "year_start"])
    op.execute(
        "CREATE INDEX ix_generations_visual_embedding ON generations "
        "USING hnsw (visual_embedding vector_cosine_ops) "
        "WITH (m = 16, ef_construction = 64)"
    )
    op.execute(
        "CREATE INDEX ix_generations_semantic_embedding ON generations "
        "USING hnsw (semantic_embedding vector_cosine_ops) "
        "WITH (m = 16, ef_construction = 64)"
    )
    op.execute(
        "CREATE INDEX ix_generations_dna_embedding ON generations "
        "USING hnsw (design_dna_embedding vector_cosine_ops) "
        "WITH (m = 16, ef_construction = 64)"
    )
    op.execute(
        "CREATE INDEX ix_generations_code_name_trgm ON generations USING gin (code_name gin_trgm_ops)"
    )

    # ── trims ──────────────────────────────────────────────────────────────────
    op.create_table(
        "trims",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "generation_id",
            sa.BigInteger(),
            sa.ForeignKey("generations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("engine_type", engine_type_enum, nullable=True),
        sa.Column("displacement_cc", sa.Integer(), nullable=True),
        sa.Column("power_hp", sa.Integer(), nullable=True),
        sa.Column("torque_nm", sa.Integer(), nullable=True),
        sa.Column("weight_kg", sa.Integer(), nullable=True),
        sa.Column("drivetrain", drivetrain_enum, nullable=True),
        sa.Column("transmission", transmission_enum, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )

    op.create_index("ix_trims_generation_id", "trims", ["generation_id"])
    op.create_unique_constraint("uq_trims_generation_name", "trims", ["generation_id", "name"])

    # ── vehicle_images ─────────────────────────────────────────────────────────
    op.create_table(
        "vehicle_images",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "generation_id",
            sa.BigInteger(),
            sa.ForeignKey("generations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("url", sa.String(2048), nullable=False),
        sa.Column("storage_key", sa.String(1024), nullable=True),
        sa.Column("source", sa.String(255), nullable=True),
        sa.Column("view_type", view_type_enum, server_default="other", nullable=False),
        sa.Column("processed", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("embedding", sa.Text(), nullable=True),  # vector(1536)
        sa.Column("thumbnail_url", sa.String(2048), nullable=True),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )

    op.execute(
        "ALTER TABLE vehicle_images "
        "ALTER COLUMN embedding TYPE vector(1536) USING NULL::vector(1536)"
    )

    op.create_index("ix_vehicle_images_generation_id", "vehicle_images", ["generation_id"])
    op.create_index(
        "ix_vehicle_images_generation_view", "vehicle_images", ["generation_id", "view_type"]
    )
    op.create_index("ix_vehicle_images_processed", "vehicle_images", ["processed"])
    op.execute(
        "CREATE INDEX ix_vehicle_images_embedding ON vehicle_images "
        "USING hnsw (embedding vector_cosine_ops) "
        "WITH (m = 16, ef_construction = 64)"
    )

    # ── source_mappings ────────────────────────────────────────────────────────
    op.create_table(
        "source_mappings",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("entity_type", sa.String(100), nullable=False),
        sa.Column("entity_id", sa.BigInteger(), nullable=False),
        sa.Column("source_name", sa.String(255), nullable=False),
        sa.Column("source_id", sa.String(1024), nullable=True),
        sa.Column("source_url", sa.String(2048), nullable=True),
        sa.Column("last_crawled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
    )

    op.create_unique_constraint(
        "uq_source_mappings",
        "source_mappings",
        ["entity_type", "entity_id", "source_name"],
    )
    op.create_index(
        "ix_source_mappings_entity", "source_mappings", ["entity_type", "entity_id"]
    )
    op.create_index(
        "ix_source_mappings_source", "source_mappings", ["source_name", "source_id"]
    )

    # ── crawler_jobs ───────────────────────────────────────────────────────────
    op.create_table(
        "crawler_jobs",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("source", sa.String(255), nullable=False),
        sa.Column("job_type", sa.String(255), nullable=False),
        sa.Column("status", crawler_status_enum, server_default="pending", nullable=False),
        sa.Column("progress", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("total_items", sa.Integer(), server_default="0", nullable=False),
        sa.Column("items_crawled", sa.Integer(), server_default="0", nullable=False),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )

    op.create_index("ix_crawler_jobs_status", "crawler_jobs", ["status"])
    op.create_index("ix_crawler_jobs_source_type", "crawler_jobs", ["source", "job_type"])

    # ── ai_analyses ────────────────────────────────────────────────────────────
    op.create_table(
        "ai_analyses",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("entity_type", sa.String(100), nullable=False),
        sa.Column("entity_id", sa.BigInteger(), nullable=False),
        sa.Column("analysis_type", sa.String(255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("model_used", sa.String(255), nullable=True),
        sa.Column("tokens_used", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )

    op.create_index("ix_ai_analyses_entity", "ai_analyses", ["entity_type", "entity_id"])
    op.create_index("ix_ai_analyses_type", "ai_analyses", ["analysis_type"])

    # ── users ──────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("hashed_password", sa.String(1024), nullable=True),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column("avatar_url", sa.String(2048), nullable=True),
        sa.Column("role", user_role_enum, server_default="user", nullable=False),
        sa.Column("oauth_provider", oauth_provider_enum, server_default="local", nullable=False),
        sa.Column("oauth_id", sa.String(512), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )

    op.create_unique_constraint("uq_users_email", "users", ["email"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_unique_constraint("uq_users_oauth", "users", ["oauth_provider", "oauth_id"])
    op.create_index("ix_users_oauth", "users", ["oauth_provider", "oauth_id"])

    # ── embedding_registry ─────────────────────────────────────────────────────
    op.create_table(
        "embedding_registry",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("entity_type", sa.String(100), nullable=False),
        sa.Column("entity_id", sa.BigInteger(), nullable=False),
        sa.Column("embedding_type", sa.String(255), nullable=False),
        sa.Column("model_name", sa.String(255), nullable=False),
        sa.Column("vector", sa.Text(), nullable=True),  # vector(1536)
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )

    op.execute(
        "ALTER TABLE embedding_registry "
        "ALTER COLUMN vector TYPE vector(1536) USING NULL::vector(1536)"
    )

    op.create_unique_constraint(
        "uq_embedding_registry",
        "embedding_registry",
        ["entity_type", "entity_id", "embedding_type", "model_name"],
    )
    op.create_index(
        "ix_embedding_registry_entity",
        "embedding_registry",
        ["entity_type", "entity_id"],
    )
    op.execute(
        "CREATE INDEX ix_embedding_registry_vector ON embedding_registry "
        "USING hnsw (vector vector_cosine_ops) "
        "WITH (m = 16, ef_construction = 64)"
    )


def downgrade() -> None:
    # Drop tables in reverse order (respecting foreign keys)
    op.drop_table("embedding_registry")
    op.drop_table("users")
    op.drop_table("ai_analyses")
    op.drop_table("crawler_jobs")
    op.drop_table("source_mappings")
    op.drop_table("vehicle_images")
    op.drop_table("trims")
    op.drop_table("generations")
    op.drop_table("car_models")
    op.drop_table("brands")

    # Drop enum types
    for enum_name in [
        "oauth_provider_enum",
        "user_role_enum",
        "crawler_status_enum",
        "view_type_enum",
        "transmission_enum",
        "drivetrain_enum",
        "engine_type_enum",
        "body_type_enum",
    ]:
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")

    # Drop extensions (optional — only drop if you own them)
    # op.execute("DROP EXTENSION IF EXISTS vector")
    # op.execute("DROP EXTENSION IF EXISTS pg_trgm")
