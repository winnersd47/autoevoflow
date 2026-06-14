# CLAUDE.md — AutoEvoFlow

> AI-платформа эволюции автомобильного дизайна. Часть экосистемы AIGrowth.
> Общие принципы: `../AIGROWTH.md` | Shared-модули: `../shared/`

---

## Проект

**Назначение:** Трекинг и визуализация дизайн-эволюции автомобилей через ML-embeddings (CLIP, DINOv2) и граф Neo4j.
**Корень:** `C:\Users\v.serdyuk\Documents\AIGrowth\AutoEvoFlow\`
**Frontend:** http://localhost:3000 | **Backend:** http://localhost:8000 | **ML Service:** http://localhost:8001

---

## Стек

| Слой | Технология |
|------|-----------|
| Backend | Python 3.11 + FastAPI 0.115 |
| ORM | SQLAlchemy 2.0 async + asyncpg |
| БД | PostgreSQL 16 + pgvector + Neo4j 5 + Redis 7 + MinIO |
| ML | PyTorch + CLIP (ViT-L-14) + DINOv2 + YOLOv8 + SAM |
| LLM | OpenAI GPT-4o → Anthropic Claude |
| Task Queue | Celery 5 (broker: Redis) |
| Frontend | Next.js 14 + TypeScript + Tailwind + Zustand + React Query |
| Graph UI | Cytoscape.js + D3.js |
| Infra | Docker Compose + Kubernetes + Nginx + Prometheus + Grafana |

---

## Ключевые файлы

| Файл | Назначение |
|------|-----------|
| `backend/app/main.py` | FastAPI app factory, все роутеры |
| `backend/app/core/config.py` | 150+ настроек (pydantic-settings) |
| `backend/app/core/security.py` | JWT, bcrypt, OAuth2 (Google/GitHub) |
| `backend/app/db/postgresql/models.py` | 11 ORM-моделей (Brand, Generation, User, ...) |
| `backend/app/api/v1/router.py` | Главный роутер v1 |
| `backend/app/api/v1/routes/auth.py` | Auth: local + Google + GitHub OAuth2 |
| `backend/app/services/ai/analysis_service.py` | AI-анализ дизайна через LLM |
| `backend/app/services/evolution/engine.py` | Алгоритмы Neo4j-графа |
| `backend/app/services/search/vector_search.py` | Поиск по pgvector embeddings |
| `ml/inference/server.py` | ML-микросервис (CLIP/DINOv2/GPT-4V) |
| `frontend/src/lib/api.ts` | HTTP-клиент (Axios + React Query) |
| `frontend/src/store/index.ts` | Zustand (UI state, graph settings) |
| `frontend/src/lib/graph-utils.ts` | Cytoscape.js хелперы |
| `frontend/CLAUDE.md` | **Детальная документация graph-компонента** |
| `docker/docker-compose.yml` | Полный стек |

---

## Команды

```bash
# Полный стек
docker compose -f docker/docker-compose.yml up -d

# Backend (dev, hot-reload)
cd backend && uvicorn app.main:app --reload --port 8000

# ML Service
cd ml/inference && uvicorn server:app --reload --port 8001

# Frontend
cd frontend && npm run dev

# Celery worker
cd backend && celery -A app.workers.celery worker --loglevel=info

# Миграции PostgreSQL
cd backend && alembic upgrade head

# Тесты
cd backend && pytest tests/ -v --cov=app
```

---

## Архитектура данных

### Поток обработки
```
Crawler → MinIO (raw images)
         → ML Inference → CLIP/DINOv2 embeddings
         → PostgreSQL (pgvector) + Neo4j (граф)
         → Redis (кэш hot-queries)
         → Frontend (Cytoscape.js визуализация)
```

### Embeddings
- `visual_embedding` (768-dim) — DINOv2
- `semantic_embedding` (1536-dim) — CLIP
- `dna_embedding` (512-dim) — Design DNA (кастомная голова)
- Все индексируются через HNSW в pgvector

### Neo4j граф
- Ноды: `(:Brand)`, `(:Model)`, `(:Generation)`, `(:Vehicle)`
- Рёбра: `EVOLVED_FROM`, `INFLUENCED_BY`, `COMPETITOR_OF`, `RELATED_TO`
- Запрос дерева: `/api/v1/evolution/{generation_id}/tree`

---

## Критические замечания

### ⚠️ Отсутствует Subscription-модель
Роль `premium` в User существует, но нет:
- `Subscription` таблицы (план, дата истечения)
- `Payment` таблицы (история платежей)
- Payment-роутера

### ⚠️ Нет middleware.ts на фронтенде
Auth-защита только на уровне компонентов. Нужен `frontend/src/middleware.ts` для Edge-защиты маршрутов.

---

## Правила при разработке

1. **Векторные операции** — всегда через `services/search/vector_search.py`, не напрямую к pgvector
2. **Graph queries** — только через `services/evolution/engine.py` с Cypher
3. **ML вызовы** — только через ML-микросервис (port 8001), не инлайн в backend
4. **Celery tasks** — для любых операций >2 сек (embedding generation, bulk crawl)
5. **Кэш** — Redis обязателен для graph traversal запросов (TTL 5 мин)
6. **Frontend graph** — см. `frontend/CLAUDE.md` для деталей Cytoscape.js

---

## Частые задачи

### Добавить новый тип embedding
1. Добавить поле в `backend/app/db/postgresql/models.py`
2. Создать Alembic-миграцию
3. Добавить pipeline в `ml/pipelines/embedding_pipeline.py`
4. Обновить `services/search/vector_search.py`

### Добавить новое Neo4j-отношение
1. Обновить `services/evolution/engine.py`
2. Обновить `frontend/src/lib/graph-utils.ts` (edge rendering)
3. Документировать в `frontend/CLAUDE.md`

### Добавить новый API эндпоинт
1. Схема → `backend/app/schemas/`
2. Логика → `backend/app/services/`
3. Роутер → `backend/app/api/v1/routes/`
4. Подключить в `backend/app/api/v1/router.py`
