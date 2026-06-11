# API Reference

Base URL: `https://api.yourdomain.com/api/v1`

Interactive documentation (Swagger UI) is available at `https://api.yourdomain.com/docs`. ReDoc is available at `https://api.yourdomain.com/redoc`.

---

## Authentication

All non-public endpoints require a Bearer token in the `Authorization` header.

### Obtaining a Token

```bash
curl -X POST https://api.yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "your-password"}'
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

Use the access token in subsequent requests:

```bash
curl -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." \
  https://api.yourdomain.com/api/v1/brands
```

Access tokens expire after 1 hour. Refresh tokens are valid for 30 days. Use `POST /auth/refresh` to get a new access token without re-authenticating.

---

## Endpoints

### Brands

#### GET /brands

List all brands with optional filtering and pagination.

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number (1-indexed) |
| `page_size` | int | 20 | Items per page (max 100) |
| `country` | string | — | Filter by country code (e.g., `DE`, `JP`, `US`) |
| `founded_after` | int | — | Filter brands founded after this year |
| `has_dna` | bool | — | If true, only return brands with computed DNA |
| `sort` | string | `name` | Sort field: `name`, `founded_year`, `model_count` |
| `order` | string | `asc` | Sort order: `asc`, `desc` |

**Request:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.yourdomain.com/api/v1/brands?country=DE&sort=founded_year&order=asc"
```

**Response:**

```json
{
  "items": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "slug": "bmw",
      "name": "BMW",
      "country": "DE",
      "founded_year": 1916,
      "model_count": 42,
      "has_dna": true,
      "brand_thumbnail_url": "https://cdn.yourdomain.com/brands/bmw/logo.jpg"
    },
    {
      "id": "7cb12a84-3e91-4781-d9fa-1b874e22bcd1",
      "slug": "mercedes-benz",
      "name": "Mercedes-Benz",
      "country": "DE",
      "founded_year": 1926,
      "model_count": 58,
      "has_dna": true,
      "brand_thumbnail_url": "https://cdn.yourdomain.com/brands/mercedes-benz/logo.jpg"
    }
  ],
  "total": 87,
  "page": 1,
  "page_size": 20,
  "pages": 5
}
```

---

#### GET /brands/{slug}

Get full brand detail including summary statistics.

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `slug` | string | Brand slug (e.g., `bmw`, `ferrari`) |

**Request:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.yourdomain.com/api/v1/brands/bmw"
```

**Response:**

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "slug": "bmw",
  "name": "BMW",
  "country": "DE",
  "founded_year": 1916,
  "description": "Bayerische Motoren Werke AG, commonly known as BMW...",
  "model_count": 42,
  "generation_count": 187,
  "image_count": 14320,
  "year_range": [1928, 2024],
  "design_dna": {
    "computed_at": "2025-05-20T14:32:00Z",
    "signature": [0.82, 0.71, 0.65, 0.90, 0.44, 0.78, 0.33, 0.61, 0.55, 0.88,
                  0.72, 0.49, 0.67, 0.83, 0.40, 0.76, 0.58, 0.91, 0.37, 0.69],
    "dominant_features": ["kidney_grille", "hofmeister_kink", "flared_wheel_arches"],
    "consistency_score": 0.84
  }
}
```

---

#### GET /brands/{slug}/models

Get all models for a brand with pagination.

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number |
| `page_size` | int | 20 | Items per page (max 100) |
| `body_style` | string | — | Filter by body style: `sedan`, `suv`, `coupe`, `convertible`, `wagon`, `hatchback` |
| `segment` | string | — | Filter by market segment: `compact`, `mid-size`, `full-size`, `luxury`, `supercar` |
| `include_concepts` | bool | false | Include concept/show cars |
| `active_only` | bool | false | Only models currently in production |

**Request:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.yourdomain.com/api/v1/brands/bmw/models?body_style=sedan&active_only=true"
```

**Response:**

```json
{
  "items": [
    {
      "id": "9bc44f21-88ac-4e5d-b1d7-3f72a1c9de45",
      "slug": "bmw-3-series",
      "name": "3 Series",
      "body_style": "sedan",
      "segment": "compact",
      "is_concept": false,
      "generation_count": 7,
      "year_range": [1975, 2024],
      "primary_image_url": "https://cdn.yourdomain.com/models/bmw-3-series/primary.jpg"
    }
  ],
  "total": 12,
  "page": 1,
  "page_size": 20,
  "pages": 1
}
```

---

#### GET /brands/{slug}/dna

Get the computed Design DNA analysis for a brand. This includes the 20-element DNA vector, dominant recurring design features, and a comparison against other brands.

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `compare_to` | string[] | — | Comma-separated list of brand slugs to compare against |
| `include_history` | bool | false | Include DNA evolution over time (one entry per decade) |

**Request:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.yourdomain.com/api/v1/brands/bmw/dna?compare_to=audi,mercedes-benz"
```

**Response:**

```json
{
  "brand_slug": "bmw",
  "computed_at": "2025-05-20T14:32:00Z",
  "dna_vector": [0.82, 0.71, 0.65, 0.90, 0.44, 0.78, 0.33, 0.61, 0.55, 0.88,
                 0.72, 0.49, 0.67, 0.83, 0.40, 0.76, 0.58, 0.91, 0.37, 0.69],
  "dominant_features": [
    { "feature": "kidney_grille_prominence", "score": 0.90, "present_in_pct": 0.94 },
    { "feature": "hofmeister_kink",          "score": 0.88, "present_in_pct": 0.89 },
    { "feature": "shark_nose_hood",          "score": 0.83, "present_in_pct": 0.76 }
  ],
  "consistency_score": 0.84,
  "comparisons": {
    "audi": { "similarity": 0.61, "shared_features": ["flared_wheel_arches", "horizontal_beltline"] },
    "mercedes-benz": { "similarity": 0.55, "shared_features": ["horizontal_beltline"] }
  }
}
```

---

#### GET /brands/{slug}/lineage-graph

Get the full evolution lineage graph for all models of a brand, formatted for direct use with Cytoscape.js or D3-force.

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `format` | string | `cytoscape` | Output format: `cytoscape`, `d3`, `raw` |
| `min_similarity` | float | 0.5 | Minimum edge similarity to include |
| `include_cross_brand` | bool | false | Include cross-brand influence edges |
| `depth` | int | — | Max graph depth from root nodes |

**Request:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.yourdomain.com/api/v1/brands/bmw/lineage-graph?format=cytoscape&include_cross_brand=true"
```

**Response (Cytoscape format):**

```json
{
  "brand_slug": "bmw",
  "node_count": 47,
  "edge_count": 89,
  "elements": {
    "nodes": [
      {
        "data": {
          "id": "gen_7bc...",
          "label": "BMW 3 Series G20",
          "year_start": 2018,
          "year_end": null,
          "generation_number": 7,
          "model_slug": "bmw-3-series",
          "design_dna_score": 0.91,
          "primary_image_url": "https://cdn.yourdomain.com/..."
        }
      }
    ],
    "edges": [
      {
        "data": {
          "id": "edge_abc...",
          "source": "gen_6de...",
          "target": "gen_7bc...",
          "relationship": "EVOLVES_INTO",
          "similarity": 0.87,
          "year_delta": 6,
          "confidence": 0.92
        }
      }
    ]
  }
}
```

---

### Models

#### GET /models

List all models across all brands with filters.

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number |
| `page_size` | int | 20 | Items per page (max 100) |
| `brand` | string | — | Brand slug filter |
| `body_style` | string | — | Body style filter |
| `segment` | string | — | Segment filter |
| `year_from` | int | — | Models with a generation starting from this year |
| `year_to` | int | — | Models with a generation starting before this year |
| `q` | string | — | Free-text search on model name |

**Request:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.yourdomain.com/api/v1/models?brand=ferrari&body_style=coupe&year_from=2000"
```

---

#### GET /models/{slug}

Get full model details including all generations and specifications.

**Request:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.yourdomain.com/api/v1/models/bmw-3-series"
```

**Response:**

```json
{
  "id": "9bc44f21-88ac-4e5d-b1d7-3f72a1c9de45",
  "slug": "bmw-3-series",
  "name": "3 Series",
  "brand": { "slug": "bmw", "name": "BMW" },
  "body_style": "sedan",
  "segment": "compact",
  "is_concept": false,
  "generation_count": 7,
  "year_range": [1975, 2024],
  "generations": [
    {
      "id": "aef12b...",
      "generation_number": 1,
      "code_name": "E21",
      "year_start": 1975,
      "year_end": 1983,
      "design_dna_score": 0.71,
      "primary_image_url": "https://cdn.yourdomain.com/..."
    }
  ]
}
```

---

#### GET /models/{slug}/generations

Get all generations of a model with full specifications.

**Request:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.yourdomain.com/api/v1/models/bmw-3-series/generations"
```

---

#### GET /models/{slug}/evolution

Get the evolutionary chain for a model as an ordered sequence of generations with similarity scores between consecutive generations.

**Request:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.yourdomain.com/api/v1/models/bmw-3-series/evolution"
```

**Response:**

```json
{
  "model_slug": "bmw-3-series",
  "evolution_chain": [
    {
      "generation_id": "aef12b...",
      "code_name": "E21",
      "year_start": 1975,
      "year_end": 1983,
      "next_similarity": 0.72,
      "relationship_to_next": "EVOLVES_INTO",
      "primary_image_url": "https://cdn.yourdomain.com/..."
    },
    {
      "generation_id": "b8c34d...",
      "code_name": "E30",
      "year_start": 1982,
      "year_end": 1994,
      "next_similarity": 0.81,
      "relationship_to_next": "EVOLVES_INTO",
      "primary_image_url": "https://cdn.yourdomain.com/..."
    }
  ]
}
```

---

#### GET /models/{slug}/similar

Find visually similar models using vector similarity search.

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `top_k` | int | 10 | Number of results |
| `min_similarity` | float | 0.5 | Minimum cosine similarity (0-1) |
| `exclude_same_brand` | bool | false | Exclude results from the same brand |
| `year_range` | string | — | Filter results by year, e.g., `1990-2010` |

**Request:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.yourdomain.com/api/v1/models/bmw-3-series/similar?top_k=5&exclude_same_brand=true"
```

**Response:**

```json
{
  "query_model": "bmw-3-series",
  "results": [
    {
      "model_slug": "audi-a4",
      "model_name": "Audi A4",
      "brand_name": "Audi",
      "similarity": 0.89,
      "matching_generation": { "code_name": "B9", "year_start": 2015 },
      "shared_features": ["fastback_roofline", "continuous_shoulder_line"]
    }
  ]
}
```

---

### Evolution

#### GET /evolution/tree/{generation_id}

Get the evolution tree rooted at a specific generation, traversing forward and backward in time.

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `generation_id` | UUID | Generation identifier |

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `depth` | int | 3 | Max hops in each direction |
| `include_cross_brand` | bool | false | Follow cross-brand influence edges |
| `format` | string | `cytoscape` | Output format |

**Request:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.yourdomain.com/api/v1/evolution/tree/aef12b34-5678-90ab-cdef-1234567890ab?depth=2"
```

---

#### GET /evolution/path/{from_id}/{to_id}

Find the shortest evolutionary path between two generations using Neo4j shortest-path algorithm.

**Request:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.yourdomain.com/api/v1/evolution/path/aef12b34.../b8c34d56..."
```

**Response:**

```json
{
  "from_generation": { "id": "aef12b...", "name": "BMW 3 Series E21", "year_start": 1975 },
  "to_generation":   { "id": "gen_7bc...", "name": "BMW 3 Series G20", "year_start": 2018 },
  "path_length": 6,
  "hops": [
    { "generation": "E21", "relationship": "EVOLVES_INTO", "similarity": 0.72 },
    { "generation": "E30", "relationship": "EVOLVES_INTO", "similarity": 0.81 },
    { "generation": "E36", "relationship": "EVOLVES_INTO", "similarity": 0.83 },
    { "generation": "E46", "relationship": "EVOLVES_INTO", "similarity": 0.88 },
    { "generation": "E90", "relationship": "EVOLVES_INTO", "similarity": 0.85 },
    { "generation": "F30", "relationship": "EVOLVES_INTO", "similarity": 0.86 },
    { "generation": "G20", "relationship": null, "similarity": null }
  ],
  "total_similarity_product": 0.51,
  "interpretation": "Strong continuous lineage with consistent DNA preservation across 43 years."
}
```

---

#### GET /evolution/cross-brand/{brand_id}

Find all cross-brand evolutionary influences involving a given brand.

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `direction` | string | `both` | `outgoing` (influenced others), `incoming` (influenced by others), `both` |
| `min_strength` | float | 0.7 | Minimum influence strength |
| `year_from` | int | — | Filter by influence relationship era |

**Request:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.yourdomain.com/api/v1/evolution/cross-brand/3fa85f64...?direction=outgoing"
```

---

#### POST /evolution/analyze

Trigger an on-demand evolution analysis for a brand or generation. This is an async operation that returns a job ID.

**Request Body:**

```json
{
  "entity_type": "brand",
  "entity_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "recompute_embeddings": false,
  "update_graph": true
}
```

**Request:**

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_type": "brand", "entity_id": "3fa85f64...", "update_graph": true}' \
  "https://api.yourdomain.com/api/v1/evolution/analyze"
```

**Response:**

```json
{
  "job_id": "celery-task-uuid-abc123",
  "status": "queued",
  "estimated_duration_seconds": 45,
  "poll_url": "https://api.yourdomain.com/api/v1/crawler/jobs/celery-task-uuid-abc123"
}
```

---

### Search

#### POST /search/semantic

Search for cars using a natural-language text query. Returns generations sorted by semantic similarity.

**Request Body:**

```json
{
  "query": "1990s Japanese sports coupe with pop-up headlights",
  "top_k": 10,
  "filters": {
    "year_range": [1985, 2005],
    "body_style": "coupe",
    "country": "JP"
  },
  "min_similarity": 0.45
}
```

**Request:**

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "1990s Japanese sports coupe with pop-up headlights", "top_k": 5}' \
  "https://api.yourdomain.com/api/v1/search/semantic"
```

**Response:**

```json
{
  "query": "1990s Japanese sports coupe with pop-up headlights",
  "results": [
    {
      "generation_id": "f1a2b3...",
      "model_name": "Mazda MX-5 Miata",
      "code_name": "NA",
      "year_start": 1989,
      "brand_name": "Mazda",
      "similarity": 0.91,
      "primary_image_url": "https://cdn.yourdomain.com/..."
    },
    {
      "generation_id": "g4h5i6...",
      "model_name": "Honda Prelude",
      "code_name": "BB4",
      "year_start": 1991,
      "brand_name": "Honda",
      "similarity": 0.87,
      "primary_image_url": "https://cdn.yourdomain.com/..."
    }
  ],
  "latency_ms": 62
}
```

---

#### POST /search/visual

Search for visually similar cars by uploading an image.

**Request Body (multipart/form-data):**

| Field | Type | Description |
|---|---|---|
| `image` | file | JPEG/PNG image (max 10MB) |
| `top_k` | int | Number of results (default 10) |
| `min_similarity` | float | Minimum similarity threshold |
| `filters` | JSON string | Optional filters (same as semantic search) |

**Request:**

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -F "image=@/path/to/car.jpg" \
  -F "top_k=5" \
  "https://api.yourdomain.com/api/v1/search/visual"
```

**Response:**

```json
{
  "query_embedding_computed_in_ms": 14,
  "results": [
    {
      "generation_id": "abc123...",
      "model_name": "Porsche 911",
      "code_name": "993",
      "year_start": 1993,
      "brand_name": "Porsche",
      "similarity": 0.96,
      "primary_image_url": "https://cdn.yourdomain.com/..."
    }
  ],
  "total_latency_ms": 58
}
```

---

#### POST /search/multimodal

Combined text + image search. The final ranking score is a weighted blend of text and image similarity.

**Request Body (multipart/form-data):**

| Field | Type | Description |
|---|---|---|
| `image` | file | Optional reference image |
| `query` | string | Text description |
| `text_weight` | float | Weight for text similarity (default 0.5) |
| `image_weight` | float | Weight for image similarity (default 0.5) |
| `top_k` | int | Number of results |

**Request:**

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -F "image=@/path/to/car.jpg" \
  -F "query=aggressive front fascia with LED daytime running lights" \
  -F "text_weight=0.4" \
  -F "image_weight=0.6" \
  "https://api.yourdomain.com/api/v1/search/multimodal"
```

---

#### GET /search/suggestions

Get auto-complete suggestions for car names, brands, and body styles.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `q` | string | Partial search string (min 2 chars) |
| `types` | string | Comma-separated: `brand`, `model`, `generation` |
| `limit` | int | Max suggestions per type (default 5) |

**Request:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.yourdomain.com/api/v1/search/suggestions?q=bmw+3&types=model,generation"
```

---

### Analysis

#### POST /analysis/generate/{entity_type}/{entity_id}

Trigger a new AI analysis for a brand, model, or generation. Analysis types include `design_overview`, `evolution_narrative`, `competitive_positioning`, and `future_prediction`.

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `entity_type` | string | `brand`, `model`, or `generation` |
| `entity_id` | UUID | Entity identifier |

**Request Body:**

```json
{
  "analysis_type": "design_overview",
  "model_preference": "claude",
  "language": "en",
  "include_images": true,
  "custom_prompt_context": "Focus on the evolution of the front fascia design."
}
```

**Request:**

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"analysis_type": "design_overview", "model_preference": "claude"}' \
  "https://api.yourdomain.com/api/v1/analysis/generate/brand/3fa85f64..."
```

**Response:**

```json
{
  "analysis_id": "a1b2c3d4-...",
  "entity_type": "brand",
  "entity_id": "3fa85f64...",
  "status": "processing",
  "estimated_seconds": 12,
  "poll_url": "https://api.yourdomain.com/api/v1/analysis/brand/3fa85f64..."
}
```

---

#### GET /analysis/{entity_type}/{entity_id}

Retrieve the most recent analysis result for an entity.

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `analysis_type` | string | `design_overview` | Analysis type to retrieve |
| `language` | string | `en` | Language of the analysis text |

**Response:**

```json
{
  "analysis_id": "a1b2c3d4-...",
  "entity_type": "brand",
  "entity_id": "3fa85f64...",
  "analysis_type": "design_overview",
  "model_used": "claude-opus-4",
  "result": {
    "summary": "BMW's design language has maintained remarkable consistency...",
    "key_elements": ["Kidney grille prominence has grown 340% since 1933", "Hofmeister kink preserved in 94% of models"],
    "evolution_narrative": "The brand's design DNA shows...",
    "sentiment": "premium",
    "confidence": 0.92
  },
  "tokens_used": 1847,
  "cost_usd": 0.055,
  "created_at": "2025-05-20T14:32:00Z"
}
```

---

#### POST /analysis/compare

Compare two entities (brands, models, or generations) side by side.

**Request Body:**

```json
{
  "entity_a": { "type": "brand", "id": "3fa85f64..." },
  "entity_b": { "type": "brand", "id": "7cb12a84..." },
  "comparison_dimensions": ["design_language", "evolution_consistency", "market_positioning"],
  "model_preference": "gpt4v"
}
```

---

#### POST /analysis/predict-future

Generate an AI prediction for a car model's future design direction based on historical DNA.

**Request Body:**

```json
{
  "model_id": "9bc44f21...",
  "horizon_years": 5,
  "consider_ev_transition": true,
  "consider_competitors": true,
  "output_format": "narrative_and_sketch_prompt"
}
```

---

### Crawler (Admin)

> These endpoints require the `admin` role.

#### POST /crawler/start

Start a crawl job for one or more sources.

**Request Body:**

```json
{
  "sources": ["netcarshow", "motor1"],
  "brands": ["bmw", "audi"],
  "force_recrawl": false,
  "max_images_per_generation": 20,
  "priority": "normal"
}
```

**Request:**

```bash
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sources": ["netcarshow"], "brands": ["ferrari"]}' \
  "https://api.yourdomain.com/api/v1/crawler/start"
```

**Response:**

```json
{
  "job_ids": ["crawl-abc123", "crawl-def456"],
  "sources_started": ["netcarshow"],
  "brands_queued": ["ferrari"],
  "estimated_urls": 1240,
  "started_at": "2025-05-25T09:00:00Z"
}
```

---

#### GET /crawler/status

Get aggregated status of all active crawler jobs.

**Response:**

```json
{
  "active_jobs": 2,
  "total_urls_queued": 8420,
  "total_urls_processed": 3217,
  "total_urls_failed": 43,
  "images_downloaded_today": 4891,
  "embeddings_pending": 312,
  "sources": {
    "netcarshow": { "status": "running", "progress_pct": 62, "rate_per_min": 28 },
    "motor1":     { "status": "idle",    "progress_pct": 100, "last_run": "2025-05-25T06:00:00Z" }
  }
}
```

---

#### GET /crawler/jobs

List all crawler jobs (paginated, newest first).

**Query Parameters:** `page`, `page_size`, `status` (`running`, `completed`, `failed`, `stopped`), `source`.

---

#### POST /crawler/stop/{job_id}

Gracefully stop a running crawler job. The crawler will finish its current batch before stopping.

**Request:**

```bash
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  "https://api.yourdomain.com/api/v1/crawler/stop/crawl-abc123"
```

---

#### GET /crawler/stats

Get historical crawler statistics.

**Query Parameters:** `from_date`, `to_date`, `granularity` (`hour`, `day`, `week`).

---

### Auth

#### POST /auth/register

Register a new user account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "full_name": "Jane Smith"
}
```

---

#### POST /auth/login

Authenticate and receive tokens.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

---

#### POST /auth/refresh

Exchange a valid refresh token for a new access token.

**Request Body:**

```json
{
  "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

#### GET /auth/me

Get the currently authenticated user's profile.

**Request:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.yourdomain.com/api/v1/auth/me"
```

**Response:**

```json
{
  "id": "user-uuid-...",
  "email": "user@example.com",
  "full_name": "Jane Smith",
  "role": "analyst",
  "oauth_provider": null,
  "created_at": "2025-01-15T10:00:00Z",
  "usage": {
    "analyses_this_month": 47,
    "analyses_limit": 500
  }
}
```

---

#### GET /auth/google

Initiate Google OAuth2 flow. Redirects to Google's consent page. The `redirect_uri` must be pre-registered in the Google Cloud Console.

**Query Parameters:** `redirect_uri` (your frontend callback URL).

---

#### GET /auth/github

Initiate GitHub OAuth2 flow. Same flow as Google.

---

## Error Codes

All error responses follow a consistent structure:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Generation with ID 'abc123' was not found.",
    "details": {},
    "request_id": "req-xyz-789",
    "documentation_url": "https://docs.yourdomain.com/errors#RESOURCE_NOT_FOUND"
  }
}
```

| HTTP Status | Error Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body or query parameters failed validation |
| 400 | `INVALID_IMAGE_FORMAT` | Uploaded image is not JPEG or PNG |
| 400 | `IMAGE_TOO_LARGE` | Image exceeds 10MB limit |
| 401 | `UNAUTHORIZED` | Missing or malformed Authorization header |
| 401 | `TOKEN_EXPIRED` | Access token has expired; use refresh token |
| 401 | `INVALID_TOKEN` | Token signature is invalid |
| 403 | `FORBIDDEN` | Your role does not permit this action |
| 404 | `RESOURCE_NOT_FOUND` | Requested entity does not exist |
| 409 | `ALREADY_EXISTS` | Duplicate registration or resource conflict |
| 422 | `EMBEDDING_FAILED` | ML inference server could not embed the provided image |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests; see Retry-After header |
| 500 | `INTERNAL_ERROR` | Unexpected server error; contact support with request_id |
| 503 | `ML_INFERENCE_UNAVAILABLE` | ML inference server is temporarily unavailable |

---

## Rate Limiting

Rate limits are enforced per authenticated user using a sliding-window algorithm in Redis. Limits reset every 60 seconds. When a limit is exceeded, the response includes the `Retry-After` header indicating seconds until the next window.

| Plan | Tier | General API | Search | Analysis | Crawler (admin) |
|---|---|---|---|---|---|
| Free | `viewer` | 60 req/min | 10 req/min | 5 req/hour | N/A |
| Pro | `analyst` | 300 req/min | 60 req/min | 50 req/hour | N/A |
| Enterprise | `analyst` | 1000 req/min | 200 req/min | 500 req/hour | N/A |
| Admin | `admin` | Unlimited | Unlimited | Unlimited | 10 jobs |

Response headers for rate limit status:

```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 247
X-RateLimit-Reset: 1716624000
Retry-After: 14
```
