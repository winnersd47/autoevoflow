# ARCHITECTURE.md — AutoEvoFlow

> Единственный источник правды по архитектуре. Обновляй при значимых изменениях.

---

## Обзор

**Проект:** AutoEvoFlow — AI-платформа эволюции автомобильного дизайна
**Назначение:** Трекинг дизайн-ДНК автомобилей через vision-embeddings (CLIP, DINOv2) и граф эволюции (Neo4j)
**Версия:** MVP Stage 1
**Статус:** Core infrastructure complete

---

## Технологический стек

| Слой | Технология | Версия |
|------|-----------|--------|
| Backend | FastAPI | 0.115.5 |
| Runtime | Python | 3.11 |
| ORM | SQLAlchemy (async) | 2.0.36 |
| DB driver | asyncpg | 0.30.0 |
| Migrations | Alembic | 1.14.0 |
| Vector DB | PostgreSQL + pgvector | 16 + 0.3.6 |
| Graph DB | Neo4j + APOC | 5 |
| Cache | Redis | 7 |
| Object storage | MinIO (S3-compatible) | latest |
| Task queue | Celery | 5.4.0 |
| ML framework | PyTorch | 2.5.1 |
| Vision models | CLIP (ViT-L-14) + DINOv2 | latest |
| Detection | YOLOv8 + SAM | latest |
| LLM | OpenAI GPT-4o / Anthropic Claude | latest |
| Frontend | Next.js (App Router) | 14.2.5 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS | 3.4.7 |
| UI | Radix UI | latest |
| State | Zustand | 4.5.4 |
| Data fetching | TanStack React Query | 5.51.21 |
| Graph viz | Cytoscape.js | 3.30.1 |
| 3D | Three.js + R3F | 0.167.0 |
| Reverse proxy | Nginx | alpine |
| Monitoring | Prometheus + Grafana | 2.49 + 10.3 |
| CI/CD | GitHub Actions | — |

---

## Структура репозитория

```
AutoEvoFlow/
├── backend/
│   ├── app/
│   │   ├── api/v1/routes/     # Endpoint handlers (auth, brands, models, evolution, search, analysis, crawler)
│   │   ├── core/              # config.py, security.py, deps.py
│   │   ├── db/
│   │   │   └── postgresql/models.py  # 11 ORM-моделей
│   │   ├── schemas/           # Pydantic request/response
│   │   ├── services/
│   │   │   ├── ai/            # LLM analysis, embeddings
│   │   │   ├── crawler/       # Web scraping (Scrapy/Playwright)
│   │   │   ├── evolution/     # Neo4j graph engine
│   │   │   └── search/        # pgvector similarity search
│   │   ├── workers/           # Celery tasks
│   │   └── main.py
│   ├── alembic/
│   ├── crawler/               # Отдельный crawler-модуль
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js App Router (10 маршрутов)
│   │   ├── components/        # UI + graph components
│   │   ├── store/index.ts     # Zustand (UI, graph settings, search)
│   │   ├── lib/               # api.ts, types.ts, graph-utils.ts, i18n.ts
│   │   ├── hooks/             # Custom React hooks
│   │   └── typings/           # TypeScript definitions
│   ├── next.config.mjs
│   ├── Dockerfile
│   └── CLAUDE.md              # Детальная документация graph-компонента
│
├── ml/
│   ├── inference/             # FastAPI ML-сервис (port 8001)
│   ├── models/                # CLIP, DINOv2, classifier
│   ├── pipelines/             # embedding, vision, generative
│   └── training/
│
├── infrastructure/k8s/        # Kubernetes manifests
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── Dockerfile.ml
│   └── nginx.conf
├── .github/workflows/         # CI/CD
├── .env.example
└── ARCHITECTURE.md
```

---

## Архитектурные паттерны

### Поток обработки данных
```
[Web Crawler] ──► [MinIO] ──► [Celery Worker]
                                    │
                         [ML Inference :8001]
                         CLIP + DINOv2 embeddings
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
             [PostgreSQL]      [Neo4j]          [Redis]
             pgvector index    Graph nodes      Hot cache
             (HNSW, 1536-dim)  EVOLVED_FROM     (TTL 5min)
                    │               │
                    └───────────────┘
                           │
                    [FastAPI :8000]
                    REST API + WebSocket
                           │
                    [Next.js :3000]
                    Cytoscape.js graph
```

### Слои backend
```
Route (api/v1/routes/) → Service (services/) → DB (db/) / ML (ml/inference)
```

### ML Pipeline
1. **CLIP ViT-L-14** → visual_embedding (768-dim) — общий облик
2. **DINOv2 large** → semantic_embedding (1536-dim) — семантика формы
3. **Кастомная голова** → dna_embedding (512-dim) — design DNA
4. Все векторы хранятся в pgvector с HNSW-индексами

---

## База данных

### PostgreSQL — таблицы

| Таблица | Назначение | Ключевые поля |
|---------|-----------|--------------|
| `users` | Пользователи | id, email, role (user/premium/admin), oauth_provider |
| `brands` | Бренды (BMW, Toyota, ...) | id, name, slug, logo, dna_embedding |
| `car_models` | Модели (3 Series, Camry, ...) | id, brand_id, name, concept |
| `generations` | Поколения | id, model_id, year_start, year_end, visual/semantic/dna_embedding |
| `trims` | Комплектации | id, gen_id, engine_displacement, power, drivetrain |
| `vehicle_images` | Фото | id, gen_id, view_type, embedding, processed |
| `crawler_jobs` | Задачи краулера | id, status (pending/running/completed/failed) |
| `ai_analyses` | AI-анализы | id, gen_id, content, model, tokens |
| `embedding_registry` | Реестр эмбеддингов | entity_type, entity_id, model_name, vector |
| `source_mappings` | Источники краулера | entity_id, source_url |

**⚠️ Отсутствует:** `subscriptions`, `payments` (роль premium есть, бэкинга нет)

### Neo4j — граф

```cypher
// Узлы
(:Brand {id, name, slug})
(:Model {id, name})
(:Generation {id, year_start, year_end, dna_vector})
(:Vehicle {id, year, trim})

// Рёбра
(g1:Generation)-[:EVOLVED_FROM {confidence: 0.95}]->(g2:Generation)
(g1:Generation)-[:INFLUENCED_BY {source: "design_dna"}]->(g2:Generation)
(g1:Generation)-[:COMPETITOR_OF]->(g2:Generation)
```

---

## API Endpoints

**Base URL:** `/api/v1`

| Метод | Endpoint | Auth | Описание |
|-------|----------|------|---------|
| POST | `/auth/register` | — | Регистрация |
| POST | `/auth/login` | — | JWT token pair |
| POST | `/auth/refresh` | — | Refresh access token |
| GET | `/auth/me` | ✓ | Профиль |
| GET | `/auth/google` | — | Google OAuth2 |
| GET | `/auth/github` | — | GitHub OAuth2 |
| GET | `/brands` | — | Список брендов с фильтрами |
| GET | `/brands/{id}` | — | Бренд + модели |
| GET | `/models` | — | Все модели |
| GET | `/models/{id}/generations` | — | Поколения модели |
| GET | `/evolution/{gen_id}/tree` | — | Neo4j дерево эволюции |
| POST | `/search/similar` | — | Поиск по изображению (pgvector) |
| POST | `/search/text` | — | NLP-поиск |
| GET | `/analysis/{gen_id}` | ✓ | AI-анализ дизайна |
| POST | `/crawler/start` | admin | Запустить краулер |
| GET | `/crawler/status` | admin | Статусы задач |
| GET | `/health` | — | Health check |
| GET | `/metrics` | — | Prometheus metrics |

---

## Frontend: данные и границы доступа (MVP)

MVP-фронтенд работает **автономно**: данные графа и каталога читаются как
**статические JSON из `public/data/`** клиентским `fetch()` (НЕ из бэкенда и НЕ
webpack-import — иначе OOM на 1000+ узлах):
- `/data/evolution/graph.json` — граф эволюции (nodes/edges)
- `/data/brands/{slug}.json`, `/data/models/{slug}.json`, `/data/latest-cars.json`

### ⚠️ Границы auth — КРИТИЧНО для `src/middleware.ts`

Публичная витрина и её **статические данные доступны БЕЗ авторизации**. Любой
server-side auth-middleware ОБЯЗАН их пропускать, иначе `fetch('/data/...')`
редиректится на `/login` → «Нет данных».

| Доступ | Пути |
|--------|------|
| **Public (без auth)** | `/`, `/evolution`, `/brands`, `/brand/*`, `/model/*`, `/models`, `/search`, `/latest`, `/login`, `/register`, **`/data/*`** (статика!), **`/images/*`**, API-прокси `/api/car-image`, `/api/netcarshow-image`, `/api/latest-cars` |
| **Gated (auth)** | `/dashboard/*`, `/compare`, `/account` |

**Правило matcher:** исключать статику по РЕАЛЬНЫМ путям Next — **`/data`,
`/images`** (Next отдаёт `public/` в КОРЕНЬ URL; пути `/public/...` НЕ существует —
исключать его бессмысленно, это и была причина бага «Нет данных»).
Регрессию проверяет `frontend/scripts/check-public-access.js` (`npm run check:access`).

---

## Окружение (.env)

| Переменная | Обязательна | Описание |
|-----------|------------|---------|
| `DATABASE_URL` | ✓ | PostgreSQL async DSN |
| `REDIS_URL` | ✓ | Redis DSN |
| `NEO4J_URI` | ✓ | bolt://... |
| `NEO4J_PASSWORD` | ✓ | — |
| `SECRET_KEY` | ✓ | JWT (мин. 32 символа) |
| `OPENAI_API_KEY` | ✓ | GPT-4o для анализа |
| `ANTHROPIC_API_KEY` | — | Claude fallback |
| `MINIO_ENDPOINT` | ✓ | Хранилище изображений |
| `MINIO_ACCESS_KEY` | ✓ | — |
| `MINIO_SECRET_KEY` | ✓ | — |
| `DEVICE` | — | `cpu` или `cuda` |

---

## Инфраструктура

### Docker Compose (dev)
| Сервис | Image | Port |
|--------|-------|------|
| postgres | postgres:16-alpine | 5432 |
| redis | redis:7-alpine | 6379 |
| neo4j | neo4j:5 | 7474, 7687 |
| minio | minio/minio | 9000, 9001 |
| backend | custom | 8000 |
| ml | custom | 8001 |
| frontend | custom | 3000 |
| nginx | nginx:alpine | 80 |
| prometheus | prom/prometheus | 9090 |
| grafana | grafana/grafana | 3001 |

### Kubernetes (prod)
Манифесты в `infrastructure/k8s/`:
- Deployments, Services, Ingress
- PersistentVolumeClaims для postgres, redis, neo4j, minio
- HorizontalPodAutoscaler для backend и ml

---

## Запуск

```bash
# Полный стек
docker compose -f docker/docker-compose.yml up -d

# Backend только
cd backend && alembic upgrade head
uvicorn app.main:app --reload --port 8000

# ML Service
cd ml/inference && uvicorn server:app --reload --port 8001

# Frontend
cd frontend && npm run dev  # :3000

# Тесты
cd backend && pytest tests/ -v --cov=app
```

---

## Changelog

### v0.2 — 2026-06-15
- Раздел «Frontend: данные и границы доступа» — статика `/data/*` публична
- Зафиксировано правило auth-middleware (исключать `/data`, `/images`, публичные
  API-прокси) — устранён баг, когда `graph.json` редиректился на `/login`
- Регресс-гард `frontend/scripts/check-public-access.js` (`npm run check:access`)

### v0.1 — 2026-06-11
- Инициализация проекта
- PostgreSQL + pgvector схема
- Neo4j граф настроен
- FastAPI backend + auth (local + Google + GitHub OAuth2)
- Docker Compose + Kubernetes манифесты
- CI/CD GitHub Actions
