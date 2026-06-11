# Automotive AI Evolution Platform

[![CI](https://github.com/your-org/automotive-ai-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/automotive-ai-platform/actions/workflows/ci.yml)
[![Deploy](https://github.com/your-org/automotive-ai-platform/actions/workflows/deploy.yml/badge.svg)](https://github.com/your-org/automotive-ai-platform/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Node 20+](https://img.shields.io/badge/node-20+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](docker/docker-compose.yml)

An AI-powered platform for tracking, visualizing, and analyzing the design evolution of automobiles across brands and decades. It combines computer vision (CLIP, DINOv2), graph databases (Neo4j), vector similarity search (pgvector), and large language models to create an interactive automotive design knowledge graph.

---

## Architecture

```
                          ┌─────────────────────────────────────────────────────┐
                          │                   Browser / Client                  │
                          └─────────────────────────┬───────────────────────────┘
                                                    │ HTTPS
                          ┌─────────────────────────▼───────────────────────────┐
                          │              Nginx Ingress (TLS termination)         │
                          │     yourdomain.com   /api   /ml   grafana.*          │
                          └──────┬──────────────────┬──────────────┬────────────┘
                                 │                  │              │
               ┌─────────────────▼──┐    ┌──────────▼──────┐  ┌───▼──────────────┐
               │  Frontend          │    │  Backend API     │  │  ML Inference    │
               │  (Next.js / React) │    │  (FastAPI 3.11)  │  │  (PyTorch/CLIP)  │
               │  :3200             │    │  :8000           │  │  :8001           │
               └────────────────────┘    └──────┬───────────┘  └───┬──────────────┘
                                                │                  │
                          ┌─────────────────────▼──────────────────▼────────────┐
                          │                  Data Layer                          │
                          │                                                      │
                          │  ┌──────────────┐  ┌──────────┐  ┌───────────────┐  │
                          │  │  PostgreSQL  │  │  Redis   │  │    Neo4j      │  │
                          │  │  + pgvector  │  │  Cache   │  │  Graph DB     │  │
                          │  │  :5432       │  │  :6379   │  │  :7687        │  │
                          │  └──────────────┘  └──────────┘  └───────────────┘  │
                          │                                                      │
                          │  ┌──────────────────────────────────────────────┐   │
                          │  │              MinIO (Object Storage)           │   │
                          │  │  vehicle-images  ml-models  data-exports      │   │
                          │  └──────────────────────────────────────────────┘   │
                          └──────────────────────────────────────────────────────┘
                                                    │
                          ┌─────────────────────────▼────────────────────────────┐
                          │                     Crawlers                         │
                          │  Motor1  AutoBlog  WikiMedia  OfficialPressRooms     │
                          └──────────────────────────────────────────────────────┘
                                                    │
                          ┌─────────────────────────▼────────────────────────────┐
                          │            Monitoring (Prometheus + Grafana)          │
                          └──────────────────────────────────────────────────────┘
```

---

## Features

- **Design Evolution Tracking**: Map how car designs evolve across generations using AI-computed visual similarity scores
- **Design DNA Extraction**: DINOv2 + CLIP-based feature vectors capture unique design characteristics per model
- **Graph Visualization**: Interactive Neo4j-powered evolution trees with cross-brand influence edges
- **Visual Similarity Search**: Find visually similar cars across brands and eras using pgvector cosine search
- **AI-Powered Analysis**: GPT-4o / Claude-3 generated design language narratives and evolution reports
- **Automated Crawling**: Scheduled multi-source web crawlers for continuous data ingestion
- **Vector Embeddings**: 1536-dimensional embeddings stored in PostgreSQL with IVFFlat indexing for sub-100ms search
- **REST API**: Full-featured FastAPI backend with OpenAPI docs
- **Multi-Provider Auth**: JWT + Google + GitHub OAuth
- **Role-Based Access**: guest / user / premium / researcher / admin roles
- **Production Monitoring**: Prometheus metrics + pre-built Grafana dashboards

---

## Tech Stack

| Layer            | Technology                                         |
|------------------|----------------------------------------------------|
| Frontend         | Next.js 14, React 18, TypeScript, Tailwind CSS     |
| Backend API      | FastAPI 0.109, Python 3.11, SQLAlchemy 2 (async)   |
| ML Inference     | PyTorch 2.1, CLIP (ViT-L-14), DINOv2, SAM         |
| Crawler          | Scrapy / httpx + asyncio, Playwright               |
| Primary DB       | PostgreSQL 16 + pgvector 0.5                       |
| Cache            | Redis 7                                            |
| Graph DB         | Neo4j 5                                            |
| Object Storage   | MinIO (S3-compatible)                              |
| Container        | Docker + docker-compose                            |
| Orchestration    | Kubernetes (manifests in `infrastructure/k8s/`)    |
| CI/CD            | GitHub Actions                                     |
| Monitoring       | Prometheus v2.48 + Grafana 10.2                    |
| Reverse Proxy    | Nginx (docker) / ingress-nginx (k8s)               |

---

## Quick Start

### Prerequisites

- Docker 24+ and Docker Compose v2
- Git

### 1. Clone and configure

```bash
git clone https://github.com/your-org/automotive-ai-platform.git
cd automotive-ai-platform
cp .env.example .env
# Edit .env: set passwords, API keys (OPENAI_API_KEY required for AI features)
```

### 2. Start all services

```bash
docker compose -f docker/docker-compose.yml up -d
```

### 3. Initialize databases

```bash
# PostgreSQL – run schema + create tables
docker compose exec postgres psql -U automotive_user -d automotive_ai -f /docker-entrypoint-initdb.d/init_db.sql

# Neo4j – run Cypher init
docker compose exec neo4j cypher-shell -u neo4j -p "$NEO4J_PASSWORD" < scripts/init_neo4j.cypher

# Run Alembic migrations
docker compose exec backend alembic upgrade head

# Seed sample data
docker compose exec backend python /app/scripts/seed_data.py --all
```

### 4. Download ML models

```bash
# Into the container volume (or locally if running backend directly)
docker compose exec ml-inference bash /app/scripts/download_models.sh
```

### 5. Open the app

| Service         | URL                         |
|-----------------|-----------------------------|
| Frontend        | http://localhost:3200       |
| Backend API     | http://localhost:8000/docs  |
| ML Inference    | http://localhost:8001/docs  |
| Grafana         | http://localhost:3001       |
| Prometheus      | http://localhost:9090       |
| MinIO Console   | http://localhost:9001       |
| Neo4j Browser   | http://localhost:7474       |

---

## Development Setup

### Backend only (with external services via Docker)

```bash
# Start infrastructure only
docker compose -f docker/docker-compose.yml up -d postgres redis neo4j minio

# Set up Python virtualenv
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start backend with hot-reload
uvicorn app.main:app --reload --port 8000
```

### Frontend only

```bash
cd frontend
npm install
# Copy API URL to .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

### Running tests

```bash
# Backend
cd backend && pytest tests/ -v --cov=app

# Frontend
cd frontend && npm test -- --watchAll=false
```

---

## Environment Variables Reference

| Variable              | Required | Default       | Description                              |
|-----------------------|----------|---------------|------------------------------------------|
| `DATABASE_URL`        | Yes      | —             | Async PostgreSQL DSN                     |
| `REDIS_URL`           | Yes      | —             | Redis connection URL                     |
| `NEO4J_URI`           | Yes      | —             | Neo4j bolt URI                           |
| `NEO4J_PASSWORD`      | Yes      | —             | Neo4j password                           |
| `SECRET_KEY`          | Yes      | —             | 64-byte JWT signing key                  |
| `OPENAI_API_KEY`      | Yes*     | —             | Required for AI analysis features        |
| `ANTHROPIC_API_KEY`   | No       | —             | Alternative LLM provider                 |
| `MINIO_ENDPOINT`      | Yes      | —             | MinIO / S3 endpoint                      |
| `MINIO_ACCESS_KEY`    | Yes      | —             | MinIO access key                         |
| `MINIO_SECRET_KEY`    | Yes      | —             | MinIO secret key                         |
| `DEVICE`              | No       | `cpu`         | `cpu` or `cuda` for ML inference         |
| `CLIP_MODEL`          | No       | `ViT-L-14`    | OpenCLIP model identifier                |
| `DINO_MODEL`          | No       | `dinov2-large`| HuggingFace model ID for DINOv2          |
| `ENVIRONMENT`         | No       | `development` | `development` / `production`             |
| `LOG_LEVEL`           | No       | `info`        | Python logging level                     |
| `CORS_ORIGINS`        | No       | `localhost`   | Comma-separated allowed origins          |
| `SENTRY_DSN`          | No       | —             | Enable Sentry error tracking             |

Full reference: [`.env.example`](.env.example)

---

## API Overview

Base URL: `https://yourdomain.com/api/v1`

| Method | Endpoint                          | Description                               |
|--------|-----------------------------------|-------------------------------------------|
| GET    | `/brands`                         | List all car brands                       |
| GET    | `/brands/{id}`                    | Brand detail                              |
| GET    | `/models`                         | List models (filterable by brand)         |
| GET    | `/models/{id}/generations`        | All generations of a model                |
| GET    | `/evolution/{generation_id}/tree` | Full evolution tree from Neo4j            |
| POST   | `/search/similar`                 | Vector similarity search (upload image)   |
| POST   | `/search/text`                    | Natural language car search               |
| GET    | `/analysis/{generation_id}`       | AI design analysis for a generation       |
| POST   | `/crawler/start`                  | Start a crawl job (admin)                 |
| GET    | `/crawler/status`                 | All crawler statuses                      |
| POST   | `/auth/register`                  | Register new user                         |
| POST   | `/auth/login`                     | Login, get JWT tokens                     |
| GET    | `/auth/google`                    | Google OAuth redirect                     |

Full API docs with curl examples: [`docs/api.md`](docs/api.md)
Interactive docs (dev): http://localhost:8000/docs

---

## Screenshots

> Screenshots will be added as the platform matures.

| Feature                  | Preview |
|--------------------------|---------|
| Evolution Timeline       | *(coming soon)* |
| Design DNA Comparison    | *(coming soon)* |
| Visual Similarity Search | *(coming soon)* |
| Graph Visualization      | *(coming soon)* |

---

## Roadmap

### MVP Stage 1 – Core Platform (current)
- [x] PostgreSQL schema with pgvector
- [x] Neo4j graph schema with evolution edges
- [x] FastAPI backend with auth
- [x] Docker Compose setup
- [x] Kubernetes manifests
- [x] CI/CD pipeline
- [ ] Basic frontend (brand browser + generation timeline)
- [ ] Manual data entry interface

### MVP Stage 2 – AI Pipeline
- [ ] ML inference service (CLIP + DINOv2)
- [ ] Automated embedding generation for all generations
- [ ] Visual similarity search UI
- [ ] AI narrative generation for top-50 models
- [ ] Crawler for Wikipedia + press releases

### MVP Stage 3 – Full Platform
- [ ] Real-time crawler dashboard
- [ ] Premium user features (export, deep analysis)
- [ ] Mobile-responsive design
- [ ] Public API with rate limiting
- [ ] Researcher portal with bulk data export
- [ ] Embedding re-indexing pipeline with version tracking

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes with tests
4. Run the test suite: `pytest backend/tests/ && npm test --prefix frontend`
5. Commit: `git commit -m "feat: describe your change"`
6. Open a pull request against `develop`

Please follow:
- [Conventional Commits](https://www.conventionalcommits.org/) for commit messages
- Black + Ruff for Python formatting
- ESLint + Prettier for TypeScript formatting

---

## License

MIT License – see [LICENSE](LICENSE) for details.
