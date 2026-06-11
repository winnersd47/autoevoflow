-- =============================================================================
-- PostgreSQL initialization script – automotive-ai-platform
-- Run as superuser or with CREATE EXTENSION privilege.
-- =============================================================================

-- =============================================================================
-- Extensions
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS vector;       -- pgvector: vector similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- trigram text similarity for fuzzy search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS btree_gin;    -- GIN index support for composite queries
CREATE EXTENSION IF NOT EXISTS pg_stat_statements; -- query performance monitoring

-- =============================================================================
-- Enumerations
-- =============================================================================
DO $$
BEGIN
    -- Body types
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'body_type') THEN
        CREATE TYPE body_type AS ENUM (
            'sedan', 'coupe', 'hatchback', 'wagon',
            'suv', 'crossover', 'convertible',
            'pickup', 'van', 'minivan',
            'hypercar', 'supercar', 'concept', 'other'
        );
    END IF;

    -- Drivetrain configurations
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'drivetrain') THEN
        CREATE TYPE drivetrain AS ENUM ('fwd', 'rwd', 'awd', '4wd');
    END IF;

    -- User roles
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM (
            'guest', 'user', 'premium', 'researcher', 'admin'
        );
    END IF;

    -- Crawler job statuses
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crawl_status') THEN
        CREATE TYPE crawl_status AS ENUM (
            'pending', 'running', 'completed', 'failed', 'paused', 'cancelled'
        );
    END IF;

    -- Vehicle image view angles
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'image_view') THEN
        CREATE TYPE image_view AS ENUM (
            'exterior_front', 'exterior_side', 'exterior_rear',
            'exterior_3q_front', 'exterior_3q_rear',
            'interior', 'detail', 'studio',
            'concept_render', 'unknown'
        );
    END IF;

    -- AI analysis types
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'analysis_type') THEN
        CREATE TYPE analysis_type AS ENUM (
            'design_dna', 'evolution_trace', 'similarity_cluster',
            'style_period', 'brand_language', 'full_report'
        );
    END IF;
END $$;

-- =============================================================================
-- Tables
-- =============================================================================

-- -----------------------------------------------------------------------------
-- brands
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brands (
    id              BIGSERIAL PRIMARY KEY,
    uuid            UUID        NOT NULL DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL,
    name_slug       VARCHAR(100) NOT NULL,
    country         VARCHAR(100),
    founded_year    SMALLINT,
    logo_url        TEXT,
    description     TEXT,
    wikipedia_url   TEXT,
    is_active       BOOLEAN     NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT brands_uuid_unique      UNIQUE (uuid),
    CONSTRAINT brands_name_unique      UNIQUE (name),
    CONSTRAINT brands_name_slug_unique UNIQUE (name_slug),
    CONSTRAINT brands_founded_year_check CHECK (founded_year BETWEEN 1800 AND 2100)
);

-- -----------------------------------------------------------------------------
-- car_models
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS car_models (
    id              BIGSERIAL PRIMARY KEY,
    uuid            UUID         NOT NULL DEFAULT uuid_generate_v4(),
    brand_id        BIGINT       NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    name_slug       VARCHAR(200) NOT NULL,
    body_type       body_type,
    segment         VARCHAR(50),     -- A / B / C / D / E / F / SUV-A etc.
    description     TEXT,
    is_active       BOOLEAN      NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT car_models_uuid_unique          UNIQUE (uuid),
    CONSTRAINT car_models_brand_name_unique    UNIQUE (brand_id, name_slug)
);

-- -----------------------------------------------------------------------------
-- generations
-- Core entity: each row = one generation of a model.
-- Embeddings: 1536-dim (OpenAI ada-002 compatible / CLIP ViT-L-14 projected).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS generations (
    id                      BIGSERIAL    PRIMARY KEY,
    uuid                    UUID         NOT NULL DEFAULT uuid_generate_v4(),
    model_id                BIGINT       NOT NULL REFERENCES car_models(id) ON DELETE CASCADE,
    code_name               VARCHAR(50),
    name                    VARCHAR(300) NOT NULL,
    year_start              SMALLINT     NOT NULL,
    year_end                SMALLINT,
    facelift                BOOLEAN      NOT NULL DEFAULT false,
    description             TEXT,
    design_language         VARCHAR(200),  -- e.g. "Flame Surfacing", "Sensual Purity"
    designer_name           VARCHAR(200),

    -- Drivetrains offered in this generation
    drivetrain_options      drivetrain[],

    -- Representative image (hero shot)
    hero_image_url          TEXT,

    -- Vector embeddings (1536-dim, stored as pgvector)
    visual_embedding        vector(1536),  -- Mean of CLIP embeddings for hero images
    semantic_embedding      vector(1536),  -- Text embedding of description + specs
    design_dna_embedding    vector(1536),  -- DINOv2-based design feature vector

    -- Similarity scores (precomputed / cached)
    prev_generation_id      BIGINT REFERENCES generations(id),
    prev_gen_similarity     FLOAT,

    -- Metadata
    source_url              TEXT,
    data_quality_score      FLOAT CHECK (data_quality_score BETWEEN 0.0 AND 1.0),
    is_active               BOOLEAN      NOT NULL DEFAULT true,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT generations_uuid_unique        UNIQUE (uuid),
    CONSTRAINT generations_year_start_check   CHECK (year_start BETWEEN 1900 AND 2100),
    CONSTRAINT generations_year_end_check     CHECK (year_end IS NULL OR year_end >= year_start)
);

-- -----------------------------------------------------------------------------
-- trims
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trims (
    id              BIGSERIAL    PRIMARY KEY,
    uuid            UUID         NOT NULL DEFAULT uuid_generate_v4(),
    generation_id   BIGINT       NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    engine_cc       INTEGER,
    horsepower      INTEGER,
    torque_nm       INTEGER,
    top_speed_kmh   INTEGER,
    acceleration_0_100 FLOAT,
    fuel_type       VARCHAR(50),
    transmission    VARCHAR(50),
    drivetrain      drivetrain,
    curb_weight_kg  INTEGER,
    price_usd       INTEGER,
    price_year      SMALLINT,
    is_active       BOOLEAN      NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT trims_uuid_unique UNIQUE (uuid)
);

-- -----------------------------------------------------------------------------
-- vehicle_images
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicle_images (
    id              BIGSERIAL    PRIMARY KEY,
    uuid            UUID         NOT NULL DEFAULT uuid_generate_v4(),
    generation_id   BIGINT       NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
    trim_id         BIGINT       REFERENCES trims(id) ON DELETE SET NULL,
    url             TEXT         NOT NULL,
    storage_key     TEXT,            -- MinIO / S3 object key after ingestion
    view_angle      image_view   NOT NULL DEFAULT 'unknown',
    width_px        INTEGER,
    height_px       INTEGER,
    file_size_bytes INTEGER,
    color           VARCHAR(100),
    year_taken      SMALLINT,
    is_hero         BOOLEAN      NOT NULL DEFAULT false,
    quality_score   FLOAT        CHECK (quality_score BETWEEN 0.0 AND 1.0),
    embedding       vector(1536),
    metadata        JSONB        NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT vehicle_images_uuid_unique UNIQUE (uuid),
    CONSTRAINT vehicle_images_url_unique  UNIQUE (url)
);

-- -----------------------------------------------------------------------------
-- source_mappings (tracks which URLs have been crawled and mapped to records)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS source_mappings (
    id              BIGSERIAL    PRIMARY KEY,
    source_url      TEXT         NOT NULL UNIQUE,
    source_domain   VARCHAR(200),
    entity_type     VARCHAR(50)  NOT NULL,   -- 'brand' | 'model' | 'generation' | 'image'
    entity_id       BIGINT       NOT NULL,
    confidence      FLOAT        CHECK (confidence BETWEEN 0.0 AND 1.0),
    last_crawled_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- crawler_jobs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crawler_jobs (
    id              BIGSERIAL    PRIMARY KEY,
    uuid            UUID         NOT NULL DEFAULT uuid_generate_v4(),
    job_name        VARCHAR(200) NOT NULL,
    source          VARCHAR(100) NOT NULL,
    target_url      TEXT,
    status          crawl_status NOT NULL DEFAULT 'pending',
    priority        SMALLINT     NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    pages_crawled   INTEGER      NOT NULL DEFAULT 0,
    images_found    INTEGER      NOT NULL DEFAULT 0,
    images_saved    INTEGER      NOT NULL DEFAULT 0,
    errors_count    INTEGER      NOT NULL DEFAULT 0,
    last_error      TEXT,
    config          JSONB        NOT NULL DEFAULT '{}',
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_by      BIGINT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT crawler_jobs_uuid_unique UNIQUE (uuid)
);

-- -----------------------------------------------------------------------------
-- ai_analyses
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_analyses (
    id              BIGSERIAL    PRIMARY KEY,
    uuid            UUID         NOT NULL DEFAULT uuid_generate_v4(),
    generation_id   BIGINT       NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
    analysis_type   analysis_type NOT NULL,
    model_used      VARCHAR(100),  -- e.g. "gpt-4o", "claude-3-5-sonnet"
    prompt_version  VARCHAR(20),
    result          JSONB        NOT NULL DEFAULT '{}',
    narrative       TEXT,          -- Human-readable analysis text
    confidence      FLOAT        CHECK (confidence BETWEEN 0.0 AND 1.0),
    tokens_used     INTEGER,
    cost_usd        FLOAT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT ai_analyses_uuid_unique UNIQUE (uuid),
    CONSTRAINT ai_analyses_gen_type_unique UNIQUE (generation_id, analysis_type, model_used)
);

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              BIGSERIAL    PRIMARY KEY,
    uuid            UUID         NOT NULL DEFAULT uuid_generate_v4(),
    email           VARCHAR(320) NOT NULL,
    email_verified  BOOLEAN      NOT NULL DEFAULT false,
    hashed_password TEXT,            -- NULL for OAuth-only users
    display_name    VARCHAR(200),
    avatar_url      TEXT,
    role            user_role    NOT NULL DEFAULT 'user',
    google_id       VARCHAR(200),
    github_id       VARCHAR(200),
    is_active       BOOLEAN      NOT NULL DEFAULT true,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT users_uuid_unique  UNIQUE (uuid),
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_google_id_unique UNIQUE (google_id),
    CONSTRAINT users_github_id_unique UNIQUE (github_id)
);

-- -----------------------------------------------------------------------------
-- embedding_registry
-- Tracks which entities have embeddings and their freshness.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS embedding_registry (
    id              BIGSERIAL    PRIMARY KEY,
    entity_type     VARCHAR(50)  NOT NULL,
    entity_id       BIGINT       NOT NULL,
    embedding_type  VARCHAR(50)  NOT NULL,  -- 'visual' | 'semantic' | 'design_dna'
    model_version   VARCHAR(100) NOT NULL,
    dimension       INTEGER      NOT NULL,
    computed_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    is_stale        BOOLEAN      NOT NULL DEFAULT false,

    CONSTRAINT embedding_registry_unique UNIQUE (entity_type, entity_id, embedding_type, model_version)
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- brands
CREATE INDEX IF NOT EXISTS idx_brands_name_slug   ON brands (name_slug);
CREATE INDEX IF NOT EXISTS idx_brands_country     ON brands (country);

-- car_models
CREATE INDEX IF NOT EXISTS idx_models_brand_id    ON car_models (brand_id);
CREATE INDEX IF NOT EXISTS idx_models_body_type   ON car_models (body_type);
CREATE INDEX IF NOT EXISTS idx_models_name_slug   ON car_models (name_slug);

-- generations (B-tree)
CREATE INDEX IF NOT EXISTS idx_generations_model_id      ON generations (model_id);
CREATE INDEX IF NOT EXISTS idx_generations_year_start    ON generations (year_start);
CREATE INDEX IF NOT EXISTS idx_generations_code_name     ON generations (code_name);
CREATE INDEX IF NOT EXISTS idx_generations_prev_gen      ON generations (prev_generation_id);
CREATE INDEX IF NOT EXISTS idx_generations_updated_at    ON generations (updated_at DESC);

-- generations (vector similarity – IVFFlat)
-- lists = sqrt(row_count); rebuild after bulk loads with REINDEX
CREATE INDEX IF NOT EXISTS idx_generations_visual_emb
    ON generations USING ivfflat (visual_embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_generations_semantic_emb
    ON generations USING ivfflat (semantic_embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_generations_dna_emb
    ON generations USING ivfflat (design_dna_embedding vector_cosine_ops)
    WITH (lists = 50);

-- vehicle_images
CREATE INDEX IF NOT EXISTS idx_vehicle_images_generation_id ON vehicle_images (generation_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_images_view_angle    ON vehicle_images (view_angle);
CREATE INDEX IF NOT EXISTS idx_vehicle_images_is_hero       ON vehicle_images (is_hero) WHERE is_hero = true;

CREATE INDEX IF NOT EXISTS idx_vehicle_images_emb
    ON vehicle_images USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- source_mappings
CREATE INDEX IF NOT EXISTS idx_source_mappings_entity ON source_mappings (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_source_mappings_domain ON source_mappings (source_domain);

-- crawler_jobs
CREATE INDEX IF NOT EXISTS idx_crawler_jobs_status     ON crawler_jobs (status);
CREATE INDEX IF NOT EXISTS idx_crawler_jobs_created_at ON crawler_jobs (created_at DESC);

-- ai_analyses
CREATE INDEX IF NOT EXISTS idx_ai_analyses_generation_id  ON ai_analyses (generation_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_type           ON ai_analyses (analysis_type);

-- Full-text search (trigram GIN for fuzzy brand / model name search)
CREATE INDEX IF NOT EXISTS idx_brands_name_trgm
    ON brands USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_models_name_trgm
    ON car_models USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_generations_name_trgm
    ON generations USING gin (name gin_trgm_ops);

-- =============================================================================
-- Functions
-- =============================================================================

-- Automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to all tables that have updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'brands', 'car_models', 'generations', 'trims',
        'vehicle_images', 'crawler_jobs', 'users'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON %s
             FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()',
            t, t
        );
    END LOOP;
END $$;

-- -----------------------------------------------------------------------
-- find_similar_generations
-- Returns generations whose visual_embedding is within min_score cosine
-- similarity of the query embedding.
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION find_similar_generations(
    query_embedding vector(1536),
    result_limit    int     DEFAULT 20,
    min_score       float   DEFAULT 0.7
)
RETURNS TABLE(
    generation_id   bigint,
    similarity_score float
) AS $$
    SELECT
        id,
        1 - (visual_embedding <=> query_embedding) AS score
    FROM generations
    WHERE visual_embedding IS NOT NULL
      AND 1 - (visual_embedding <=> query_embedding) > min_score
    ORDER BY score DESC
    LIMIT result_limit;
$$ LANGUAGE sql STABLE PARALLEL SAFE;

-- -----------------------------------------------------------------------
-- find_similar_images
-- Cross-image similarity search using per-image embeddings.
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION find_similar_images(
    query_embedding vector(1536),
    result_limit    int     DEFAULT 20,
    min_score       float   DEFAULT 0.75
)
RETURNS TABLE(
    image_id         bigint,
    generation_id    bigint,
    similarity_score float
) AS $$
    SELECT
        vi.id,
        vi.generation_id,
        1 - (vi.embedding <=> query_embedding) AS score
    FROM vehicle_images vi
    WHERE vi.embedding IS NOT NULL
      AND 1 - (vi.embedding <=> query_embedding) > min_score
    ORDER BY score DESC
    LIMIT result_limit;
$$ LANGUAGE sql STABLE PARALLEL SAFE;

-- -----------------------------------------------------------------------
-- get_evolution_chain
-- Recursively walk prev_generation_id to return the full lineage.
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_evolution_chain(start_generation_id bigint)
RETURNS TABLE(
    generation_id   bigint,
    depth           int,
    path            bigint[]
) AS $$
WITH RECURSIVE chain AS (
    -- Base case: start generation
    SELECT id, 0 AS depth, ARRAY[id] AS path
    FROM generations
    WHERE id = start_generation_id

    UNION ALL

    -- Recursive: walk backwards to predecessors
    SELECT g.id, c.depth + 1, c.path || g.id
    FROM generations g
    JOIN chain c ON g.id = c.generation_id
    WHERE g.prev_generation_id IS NOT NULL
      AND c.depth < 20   -- Guard against cycles
)
SELECT generation_id, depth, path FROM chain
ORDER BY depth;
$$ LANGUAGE sql STABLE;

-- =============================================================================
-- Application database user (limited privileges)
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'automotive_user') THEN
        CREATE ROLE automotive_user WITH LOGIN PASSWORD 'CHANGE_ME_IN_PRODUCTION';
    END IF;
END $$;

GRANT CONNECT ON DATABASE automotive_ai TO automotive_user;
GRANT USAGE  ON SCHEMA public             TO automotive_user;
GRANT SELECT, INSERT, UPDATE, DELETE
    ON ALL TABLES    IN SCHEMA public TO automotive_user;
GRANT USAGE, SELECT
    ON ALL SEQUENCES IN SCHEMA public TO automotive_user;
GRANT EXECUTE
    ON ALL FUNCTIONS IN SCHEMA public TO automotive_user;

-- Ensure future tables are also accessible
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES    TO automotive_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT                  ON SEQUENCES TO automotive_user;
