# Промт: Информационная архитектура проекта AutoEvoFlow
# Версия: актуальна по состоянию на 2026-06-03

Используй этот промт как шаблон для создания аналогичного проекта.
Замени доменную логику (автомобили/эволюция) на свою, но сохрани структуру, паттерны и связи.

---

## СИСТЕМНЫЙ ПРОМТ

Ты — senior full-stack разработчик. Ты строишь AI-платформу для анализа автомобильной эволюции
со следующей архитектурой.

## 1. СТЕК ТЕХНОЛОГИЙ

```
Backend:    Python 3.12 + FastAPI + SQLAlchemy 2.0 (async) + Pydantic v2
Database:   PostgreSQL 16 + pgvector (эмбеддинги) + Alembic миграции
Graph DB:   Neo4j 5 + APOC — граф эволюции моделей и платформ
Cache:      Redis 7 — кэш API-ответов, очередь задач Celery
Storage:    MinIO (S3-compatible) — изображения автомобилей + ML-артефакты
ML:         CLIP ViT-L/14@336px (визуальные эмбеддинги 1024-dim)
            DINOv2-large (768-dim self-supervised features)
            FAISS — nearest-neighbor поиск по эмбеддингам
AI Free:    Groq API (Llama 3.1 70B) — аналитический анализ, 14400 req/day бесплатно
            Google Gemini Flash — исторический анализ, 1500 req/day бесплатно
AI Paid:    OpenAI GPT-4o — визуальный анализ (сравнение поколений по фото)
            Anthropic Claude — опционально, для максимального качества
Frontend:   Next.js 14 (App Router) + TypeScript + Tailwind CSS
Realtime:   WebSocket (FastAPI → фронтенд) — live обновления графа
i18n:       2 языка (RU/EN), переключатель в header + localStorage
            Цены: EN=EUR (€4.99/€14.99), RU=RUB (₽490/₽1490)
Theme:      Dark только (automotive dark UI) + CSS variables + Tailwind
PWA:        manifest.json — name/theme_color/icons/categories
Crawler:    Playwright + async — парсинг caricos.com, netcarshow.com, autoevolution.com
```

## 2. СТРУКТУРА BACKEND (28 API модулей)

### 2.1 Модели данных (18 моделей SQLAlchemy + pgvector)
```
Каталог автомобилей:
- Brand (id, slug, name, country, founding_year, description, logo_url, tags JSON)
- CarModel (id, slug, brand_id, name, body_type enum, segment enum, start_year, end_year, is_active)
- Generation (id, model_id, code_name, start_year, end_year, is_facelift, is_concept)
- VehicleImage (id, generation_id, url, resolution, is_hero, embedding Vector(1536))

ДНК и аналитика:
- DesignDNA (id, entity_type, entity_id, overall_score, dimensions JSON,
              temporal_evolution JSON, color_palette JSON, dominant_style)
- AIAnalysis (id, entity_type, entity_id, analysis_type, provider, headline,
               summary, full_text, insights JSON, confidence_score, is_cached)
  provider: "groq" | "gemini" | "gpt-4o" | "claude-opus-4-5"
  variant:  "analytical" | "historical" | "deep"
- Embedding (id, entity_id, entity_type, model_name, vector Vector(1536), created_at)

Граф эволюции (дублируется в Neo4j):
- EvolutionEdge (id, source_id, target_id, edge_type enum, strength float,
                 label, year, metadata JSON)
  edge_type: evolves_into | derived_from | shares_platform | influenced_by |
             concept_to_production | variant_of | facelifted_to | rebadged_as

  variant_of ВАЖНО: strength ≥0.9 = тот же класс (911→911 Turbo);
                    strength <0.9  = повышение класса (3 Series→M3)

Пользователи:
- User (email, username, password_hash, role enum, premium_expires_at, locale)
- Comparison (user_id, generation_ids JSON, created_at, is_public)
- UserFavorite (user_id, entity_type, entity_id)
- SearchHistory (user_id, query, search_type, results_count)

Краулер:
- CrawlJob (id, source enum, status, started_at, completed_at, items_found, errors)
- CrawlSource (url, source_name, last_crawled, entity_type, metadata JSON)
```

### 2.2 API роутеры (28 модулей)
```
Каталог:
- brands.py          — CRUD + search + DNA + models list + pagination
- models.py          — CRUD + filter by body_type/segment/year + generations
- generations.py     — CRUD + images + DNA + visual comparison
- images.py          — upload + serve + embeddings generation

Поиск и сравнение:
- search.py          — text search + vector search (cosine similarity pgvector)
                       + image search (CLIP embedding → nearest neighbors)
- compare.py         — multi-generation comparison (up to 4 cars) + AI verdict
- visual_search.py   — загрузи фото → найди похожие автомобили (DINOv2 + FAISS)

AI-аналитика (DUAL варианты):
- analysis.py        — POST /analyze → dual: Groq (analytical) + Gemini (historical)
                       strategy: "dual" | "groq" | "gemini" | "anthropic"
                       Кэш: Redis (TTL 24h) + PostgreSQL (permanent)
- ai_chat.py         — чат-бот по базе знаний платформы (rule-based + LLM)
- dna.py             — DesignDNA CRUD + radar chart data + temporal evolution
- insights.py        — cross-brand инсайты + trend detection

Граф эволюции:
- evolution.py       — граф узлов/рёбер + layout algorithms (dagre/cola/timeline)
                       + shortest path + brand subgraph
- graph.py           — Neo4j Cypher queries + path finding + cluster detection
- lineage.py         — family tree конкретной модели + ancestors + descendants

Монетизация:
- payments.py        — 3 шлюза (checkout, webhook, history, plans)
- premium.py         — is_premium, grant_days, activate promo, check_limits
- subscriptions.py   — brand subscriptions + new model alerts

Социальные:
- notifications.py   — list, mark read, unread count
- favorites.py       — CRUD избранных моделей/брендов
- sharing.py         — публичные ссылки на сравнения + встраиваемые виджеты

Краулер:
- crawler.py         — запуск задач, статус, источники, расписание
- scraper_sources.py — caricos.com, netcarshow.com, autoevolution.com parsers

Аутентификация:
- auth.py            — register, login, me, profile update, password reset
- deps.py            — get_current_user, require_admin, require_premium

Публичное:
- public.py          — stats + featured content (без авторизации)
- ws.py              — WebSocket: live граф + crawler progress
- admin.py           — users list, role management, crawler control, stats
```

### 2.3 ML / AI Сервисы
```
Компьютерное зрение:
- vision_pipeline.py     — VisionPipeline: CLIP + DINOv2 + YOLO + SAM
- embedding_pipeline.py  — 1536-dim (CLIP 1024 + DINOv2 768 → concat+PCA)
- automotive_classifier.py — классификация body_type/segment/generation

Поиск:
- vector_search.py       — text_search(), image_search(), cross_brand_similarity()

AI-аналитика (БЕСПЛАТНЫЕ ПРОВАЙДЕРЫ):
- groq_analysis.py       — GroqAnalyzer: АНАЛИТИЧЕСКИЙ взгляд
                           Модель: llama-3.1-70b-versatile (бесплатно)
                           Фокус: инженерия, платформы, технические данные, цифры
                           14400 req/day бесплатно | console.groq.com
                           OpenAI-compatible API (base_url=api.groq.com/openai/v1)

- gemini_analysis.py     — GeminiAnalyzer: ИСТОРИЧЕСКИЙ взгляд
                           Модель: gemini-1.5-flash (бесплатно)
                           Фокус: история, культура, биографии дизайнеров, эпохи
                           1500 req/day бесплатно | aistudio.google.com/app/apikey
                           Поддерживает response_mime_type="application/json"

- openai_vision.py       — OpenAIVisionAnalyzer: visual_comparison(),
                           describe_design_changes() — ПЛАТНЫЙ, GPT-4o
- anthropic_analysis.py  — ClaudeAnalyzer — ОПЦИОНАЛЬНЫЙ, платный

Эволюционный анализ:
- evolution_detector.py  — detect_lineage(), find_platform_siblings()
- design_dna.py          — DesignDNAExtractor, score_dimensions()
```

### 2.4 Сервисы (бизнес-логика)
```
Ядро:
- evolution_engine.py    — build_brand_graph(), find_influences(), detect_platform_sharing()
- crawler_manager.py     — schedule_crawl(), process_queue(), deduplicate_entities()
- embedding_worker.py    — Celery: generate_embeddings() → pgvector upsert → ws notify

Платежи (3 шлюза — demo mode пока бэкенд не запущен):
- yookassa_service.py    — ЮКасса: РФ рубли, карты, СБП 0.7%, SberPay
- cryptocloud_service.py — CryptoCloud: USDT, BTC, ETH — 0.4% комиссия
- prodamus_service.py    — Продамус: Visa/MC международные карты

Вспомогательные:
- premium.py, notifications.py, cache.py, image_processor.py
```

## 3. СТРУКТУРА FRONTEND (22 страницы)

### 3.1 Публичные страницы
```
/           — Landing (14 секций — см. раздел 5)
/login      — Форма входа (demo: любые данные → /dashboard, сохраняет в localStorage)
/register   — Регистрация (demo: username + email + Terms checkbox → /dashboard)
/brands     — Каталог брендов (grid + фильтры по стране/тегу/сегменту)
/evolution  — Публичный граф эволюции (322 узла, 383 ребра, read-only)
/search     — Поиск (text + visual + AI)
/compare    — Сравнение до 4 моделей (без авторизации)
/terms      — Terms of Service (RU/EN)
/privacy    — Privacy Policy (RU/EN)
```

### 3.2 Основные страницы каталога
```
/brand/[slug]        — Hero + Quick Stats + Description
                       + ModelFamilyGrid (grouped: Supercar/GT/Sedan/SUV/Concept)
                       + AIAnalysisPanel (DUAL: Аналитический + Исторический)
                       + BrandDNA Radar chart
                       + Evolution Graph CTA

/brand/[slug]/models — Все модели: фильтр body_type + search + grouped grid

/model/[slug]        — Tabs: Timeline | Gallery | Graph | Analysis
                       Gallery: WallpaperGallery (FHD/QHD/4K/Portrait)
                       Graph: EvolutionGraph (lineage tree)
                       Analysis: AIAnalysisPanel с dual вариантами
```

### 3.3 Dashboard (авторизованные — demo localStorage auth)
```
/dashboard/layout.tsx  — Sidebar 10 пунктов + auth guard (redirect if no localStorage user)
                         Mobile: hamburger menu

1. /dashboard              — Overview: stats + Recently Viewed + Recommended + Quick Actions
2. /dashboard/favorites    — Избранное (tabs: Models|Brands) — localStorage persistence
3. /dashboard/comparisons  — Сохранённые сравнения — localStorage
4. /dashboard/search       — Расширенный поиск + visual search
5. /dashboard/evolution    — Dashboard-версия графа
6. /dashboard/alerts       — Follow/unfollow брендов + алерты — localStorage
7. /dashboard/store        — ЧЕСТНЫЕ тарифы (см. раздел 4.7)
8. /dashboard/profile      — Настройки + смена языка + Danger Zone
9. /dashboard/admin        — Статистика + crawler control (mock) + AI tasks
10. /dashboard/compliance  — 17-пунктовый чеклист (29% по умолчанию)
```

### 3.4 Компоненты
```
Граф (src/components/graph/):
- EvolutionGraph.tsx   — Cytoscape.js, 3 лэйаута, 8 типов рёбер
                        Timeline: family grouping по modelSlug, greedy sub-rows
                        modelSlug prop: если есть → /model/slug, иначе → /brand/brandId
- BrandDNARadar.tsx    — D3 SVG radar chart (multi-series)
- LineageTree.tsx      — D3 tree layout
- Timeline.tsx         — горизонтальная/вертикальная timeline поколений

Автомобили (src/components/ui/):
- AIAnalysisPanel.tsx  — DUAL VARIANT TABS:
                          props: analysis (main) + analysisAlt (второй вариант)
                          Вкладки: Аналитический (Cpu icon) | Исторический (Scroll icon)
                          Каждая вкладка: typewriter headline + summary + insights + confidence
                          Footer показывает провайдера: "Groq · Llama 3.1" | "Gemini Flash"
                          AnimatePresence fade при переключении вариантов
- WallpaperGallery.tsx — caricos.com URL derivation regex
- GenerationCard.tsx
- SearchBar.tsx

3D/Визуальный слой (src/components/three/):
- CarScene.tsx         — react-three-fiber, low-poly sedan, 60 Sparkles
                         WebGLErrorBoundary → CSS fallback (pulsing rings) если GPU недоступен
                         powerPreference:'low-power', shadows:false, antialias:false
- ParticleBackground.tsx

Layout:
- Navigation.tsx       — Top navbar, locale switcher, notification bell, user dropdown

Библиотеки (src/lib/):
- api.ts          — React Query hooks + JWT interceptor
- demo-data.ts    — useDemoBrand(), useDemoModel() — статичный JSON fallback
- graph-utils.ts  — buildCytoscapeElements(), getEdgeColor(), EDGE_COLORS (9 типов)
- i18n.ts         — translations {en, ru} + useLocale() hook
                   Включает ключи: home.*, brand.*, model.*, evolution.*, aiPanel.*
                   Цены: pricingFreePrice/pricingProPrice/pricingPremiumPrice (разные для RU/EN)
- types.ts        — GraphNode (+ modelSlug?), GraphEdge, EvolutionEdgeType (9 типов),
                   CarModel, Generation, DesignDNA, AIAnalysis, TemporalDNAPoint

Store (src/store/):
- index.ts        — Zustand + localStorage persist: search history, graph settings,
                   comparison slots, preferences, favorites
```

## 4. ПАТТЕРНЫ АРХИТЕКТУРЫ

### 4.1 Demo Fallback (автономная работа без бэкенда)
```
Каждый API hook имеет двойной режим:
1. useBrand(slug)     → GET /api/v1/brands/{slug} (бэкенд)
2. useDemoBrand(slug) → fetch /data/brands/{slug}.json (статика)

Фронтенд auto-fallback:
  const brand     = apiBrand    ?? demoData?.brand;
  const models    = apiModels   ?? demoData?.models;
  const analysis  = apiAnalysis ?? demoData?.analysis;
  const analysisAlt = demoData?.analysisAlt;   // второй AI вариант

Статичные данные в public/data/:
  brands/{slug}.json    — Brand + DNA (6 dims + temporalEvolution) + AIAnalysis + analysisAlt + models[]
  models/{slug}.json    — модель + поколения + изображения
  evolution/graph.json  — {nodes: GraphNode[], edges: GraphEdge[]} — 322+ узла, 383+ ребра

КРИТИЧНО: graph.json загружается КЛИЕНТСКИ через fetch() в useEffect, НЕ импортируется в webpack!
  Причина: инлайн-импорт 322 узлов → webpack OOM (Node.js heap overflow при компиляции)
  Решение: evolution/page.tsx использует fetch('/data/evolution/graph.json')
  Запуск dev-сервера: NODE_OPTIONS="--max-old-space-size=2048" npm run dev -- -p 3200
```

### 4.2 Evolution Graph — Полный набор данных
```
Текущее состояние (2026-06-03):
  322 узла | 383 ребра | 11 брендов

Бренды и количество узлов:
  BMW: 81 (3 Series E21-G20, M3, M4, M5, M6, M8, M2, 4/5/6/7/8 Series, Z3/Z4/Z8,
           X1-X7, i3/i4/i5/i7/iX/iX3, Quattro heritage, 1/2 Series, M1 road)
  Mercedes: 54 (E-Class W123-W213, S-Class W116-W223, C-Class W201-W206,
                SL W198-R232, G-Class, GLE/ML, AMG GT, CLS, EQ, AMG C63, SLK, CLK, A-Class)
  Porsche: 39 (356 Pre-A/A/B/C, 911 901-992, Turbo 930-992, GT3 996-992,
               Boxster/Cayman/718, Cayenne, Panamera, Macan, Carrera GT, 918, Taycan)
  Audi: 37 (80 B1-B3, A4 B5-B10, RS4, A3, A5, A6 C4-C8, A8 D2-D5,
            TT, R8, Q3/Q5/Q7/Q8, e-tron, e-tron GT, Quattro Ur)
  Ferrari: 34 (250 GT, Dino 246, 308-296 mid V8, Daytona-12Cilindri V12,
               288 GTO-F80 hypercars, California/Portofino/Roma, FF/GTC4L, Purosangue, Mondial, 512TR)
  Lamborghini: 18 (350 GT-Revuelto V12, Espada/Jarama, Gallardo-Temerario V10,
                   Urus, LM002, Sesto Elemento, Veneno, Centenario)
  Maserati: 18 (3500 GT-GranTurismo Mk2, Bora/Merak, QP I/V/VI, Ghibli I/II/III,
                MC12/MC20, Levante/Grecale, Alfieri Concept)
  VW: 16 (Golf Mk1-8, Beetle, New Beetle, Passat B1/B3/B6/B8, ID.3, ID.4)
  Lotus: 15 (Elan, Europa, Esprit S1-V8, Elise S1-S3, Exige S1/S3, Evora, Emira, Eletre)
  SEAT: 5 (Ibiza Mk1/3, León Mk1/2/3)
  Škoda: 5 (Octavia Mk1/2/3, Superb Mk1/2)

9 типов рёбер с цветовой кодировкой и толщиной:
  evolves_into        #00d4ff  3.5px сплошная — прямое преемство
  variant_of          #e879f9  3.5px сплошная — M, AMG, RS, GT3, SVJ (официальная модификация)
                                strength ≥0.9 = тот же класс | <0.9 = повышение класса
  concept_to_production #ffd700 3.0px сплошная — концепт → серия
  derived_from        #a78bfa  2.5px сплошная — платформенное заимствование
  shares_platform     #00ff88  2.5px сплошная — общая архитектура (MQB/MLB/J1)
  influenced_by       #ff9500  1.8px пунктир  — дизайнерское/инженерное влияние
  facelifted_to       #38bdf8  2.0px сплошная — рестайлинг
  rebadged_as         #94a3b8  1.5px пунктир  — ребейджинг
  inspired            #f472b6  1.5px пунктир  — вдохновение

Timeline layout algorithm:
  - Group by brand → within brand group by modelSlug (family key)
  - If no modelSlug: 3+ part ID → first 2 parts as family; 2 part → first part
  - Each family gets its OWN dedicated horizontal row (not greedy X-gap)
  - Families sorted by earliest year; brands separated by 24px gap
  - X_SCALE=44px/year, ROW_H=90px, BRAND_GAP=24px
```

### 4.3 Dual AI Analysis — Бесплатные провайдеры
```
Концепция: два угла зрения на один и тот же бренд/поколение.

Вариант 1: АНАЛИТИЧЕСКИЙ (Groq + Llama 3.1 70B)
  Фокус: инженерные решения, платформы, технические достижения, цифры, benchmark
  API: OpenAI-compatible → base_url="https://api.groq.com/openai/v1"
  Бесплатно: 14 400 req/day, 6000 tokens/min
  Ключ: console.groq.com → без карты
  provider field в JSON: "groq"

Вариант 2: ИСТОРИЧЕСКИЙ (Google Gemini 1.5 Flash)
  Фокус: основатели, культура, дизайнеры, эпохи, мифология бренда
  API: google.generativeai + response_mime_type="application/json"
  Бесплатно: 1500 req/day, 1M tokens/min
  Ключ: aistudio.google.com/app/apikey → без карты
  provider field в JSON: "gemini"

Опционально (платный): Anthropic Claude / OpenAI GPT-4o для Premium tier

Структура brand JSON:
  {
    "analysis":    { provider: "groq",   variant: "analytical", ... },
    "analysisAlt": { provider: "gemini", variant: "historical",  ... }
  }

AIAnalysisPanel props:
  <AIAnalysisPanel analysis={analysis} analysisAlt={analysisAlt} />

UI: две вкладки с fade-анимацией, footer показывает "Groq · Llama 3.1" / "Gemini Flash"
```

### 4.4 AI Analysis Caching
```
Двухуровневый кэш:
1. Redis (TTL 24h)        — горячий кэш
2. PostgreSQL (permanent) — постоянное хранение

Поток:
  GET /analysis/{type}/{id}?strategy=dual
    → Check Redis cache → Check PostgreSQL
    → If miss: параллельно Groq + Gemini (asyncio.gather)
    → Save both to PostgreSQL + Redis
    → Return { analysis: GroqResult, analysisAlt: GeminiResult }

Панель AIAnalysisPanel:
  - "Кэшировано" badge если isCached: true
  - Confidence bar (0-100%)
  - 5 инсайтов с importance: critical | high | medium
  - Вкладки: Аналитический (⚙️) | Исторический (📜)
```

### 4.5 Vector Search Pipeline
```
Текстовый поиск:
  query → OpenAI text-embedding-3-large → pgvector cosine search

Визуальный поиск (Pro-функция):
  image upload → CLIP encode → pgvector search → similar generations

Cross-brand similarity:
  brand embeddings → mean pooling → nearest brands (visual DNA)

caricos.com URL derivation:
  regex: /^(https:\/\/images\.caricos\.com\/.+\/images\/)(\d+x\d+)\/(.+?)_(\d+x\d+)(\.jpg.*)$/i
  Замени WxH → FHD(1920×1080) | QHD(2560×1440) | 4K(3840×2160) | Portrait(1080×1920)
```

### 4.6 Crawler Pipeline
```
Источники: caricos.com, netcarshow.com, autoevolution.com, motor1.com

Flow: CrawlJob → Celery → Playwright → scrape → ImageProcessor → EntityResolver
      → PostgreSQL upsert → EmbeddingWorker → Neo4j update → WebSocket broadcast
```

### 4.7 ЧЕСТНЫЕ Тарифы (текущее состояние)
```
Принцип: не продавать нерабочие функции. Иконка ✓ = работает сейчас, 🕐 = скоро.

FREE (₽0 / €0 — навсегда):
  ✓ Граф эволюции 322+ узла, 383+ ребра
  ✓ Каталог 180+ моделей с историей поколений
  ✓ AI-анализ 7 брендов (кэшированный, Groq+Gemini)
  ✓ ДНК-радар брендов (6 осей)
  ✓ Сравнение до 4 моделей
  ✓ Галерея обоев FHD/QHD/4K/Portrait
  🕐 Visual Search   🕐 AI-анализ по запросу

PRO (₽490/мес | €4.99/mo):
  ✓ Всё из Free + безлимитные сохранённые сравнения
  🕐 AI-анализ любого бренда/модели по запросу (Groq+Gemini параллельно)
  🕐 Visual Search — загрузи фото, найди похожие (CLIP)
  🕐 Экспорт графа JSON/PNG
  🕐 Алерты о новых моделях

PREMIUM (₽1490/мес | €14.99/mo):
  ✓ Всё из Pro
  🕐 REST API доступ
  🕐 Встраиваемые виджеты графа
  🕐 Ранний доступ + выделенная поддержка

ВАЖНО: платёжные кнопки показывают demo-уведомление пока бэкенд не запущен.
Страница store показывает секцию "Что появится после запуска бэкенда".
```

### 4.8 Auth Pattern (Demo)
```
Demo-режим (без бэкенда):
  Login: любые email/password → localStorage.setItem('autoevoflow_user', JSON)
  Register: username + email → localStorage

Dashboard layout.tsx:
  useEffect → if (!localStorage.getItem('autoevoflow_user')) → router.push('/login')

Production (с бэкендом):
  JWT access token в localStorage + refresh token в httpOnly cookie
  FastAPI: auth.py → login() → sign JWT с SECRET_KEY → return {access_token}
  Frontend: api.ts → axios interceptor → Authorization: Bearer {token}
```

### 4.9 Multi-Payment Gateway
```
Автовыбор по локали пользователя:
  locale "ru" → ЮКасса (₽)
  locale "en" → Продамус (€/USD)
  Крипто — доступна всем

3 шлюза: yookassa_service.py | cryptocloud_service.py | prodamus_service.py
Каждый: demo mode (нет ключей) → real mode (ключи из .env)
```

## 5. LANDING PAGE — 14 секций

```
1.  Nav: логотип + RUS/ENG + Dark + Login/Register
2.  Hero: animated 3D car scene (react-three-fiber + ErrorBoundary) + live stats + 2 CTA
3.  Brand trust bar: 24 бренда (BMW, Ferrari, Porsche, etc.)
4.  Featured Stories: 3 карточки (BMW 3 Series / Porsche 911 / Honda Civic)
5.  Brand Universe: grid 24 брендов + "Все бренды →"
6.  AI Stack: CLIP + DINOv2 + Neo4j + pgvector + Groq + Gemini карточки
7.  Live Graph Demo: glass card (322 узла | 383 связи | 11 брендов) + "Open Graph →"
8.  How It Works: 3 шага (Откройте | Исследуйте | Анализируйте)
9.  Sample Analysis: превью AIAnalysisPanel (Ferrari, переведён на RU)
10. Pricing: 3 тарифа с ЧЕСТНЫМИ features (✓ живые / 🕐 скоро)
11. Testimonials: 3 стеклянные карточки (RU/EN переведены)
12. FAQ: 6 вопросов (collapsible AnimatePresence)
13. [опционально] Urgency: промокод + дедлайн
14. Footer: логотип + навигация + Legal (Terms/Privacy) + copyright (RU/EN переведено)

Все секции используют t() из useLocale() — НЕТ хардкоженного текста.
FAQSection принимает t как prop т.к. определена вне компонента HomePage.
```

## 6. CSS / ВИЗУАЛЬНЫЙ СЛОЙ

```
:root / .dark — CSS variables:
  --background, --surface, --card, --border,
  --text-primary, --text-secondary, --text-muted,
  --primary (#00d4ff), --gold (#ffd700), --danger (#ff4444)

Ключевые классы:
  .glass         — backdrop-filter:blur(20px) + rgba bg
  .glass-primary — glass + primary border
  .scan-effect   — CSS scanlines (::after)
  .section-label — uppercase tracking-widest text-xs text-primary
  .badge-surface / .badge-primary
  .skeleton      — animate-pulse placeholder
  .btn-primary / .btn-secondary

Cytoscape граф — стили узлов:
  base node:     border-width:3px, border-opacity:0.85, size:58px
  selected:      border-width:4px, border-opacity:1, bg:rgba(0,212,255,0.18)
  hover:         border-width:4px
  concept:       diamond shape, gold border 3px
  brand:         hexagon shape, purple border 3.5px

Cytoscape граф — толщина рёбер:
  evolves_into:  3.5px  variant_of: 3.5px  concept_to: 3px
  derived_from:  2.5px  shares_platform: 2.5px
  influenced_by: 1.8px дунктир  rebadged_as: 1.5px пунктир

3D сцена (CarScene.tsx):
  Low-poly sedan + 4 wheels + grid floor + glow ring
  60 Sparkles (было 220, снижено для слабых GPU)
  powerPreference:'low-power', shadows:false, antialias:false
  WebGLErrorBoundary: CSS fallback (3 pulsing rings) если GPU недоступен
```

## 7. КОНФИГУРАЦИЯ (.env)

```
# Database
DATABASE_URL=postgresql+asyncpg://automotive:PASSWORD@localhost:5432/automotive_ai
POSTGRES_USER=automotive  POSTGRES_PASSWORD=  POSTGRES_DB=automotive_ai

# Graph DB
NEO4J_URI=bolt://localhost:7687  NEO4J_USER=neo4j  NEO4J_PASSWORD=

# Cache / Queue
REDIS_URL=redis://localhost:6379/0  CELERY_BROKER_URL=redis://localhost:6379/1

# Storage
MINIO_ENDPOINT=localhost:9000  MINIO_ACCESS_KEY=  MINIO_SECRET_KEY=
MINIO_BUCKET_IMAGES=vehicle-images  MINIO_BUCKET_MODELS=ml-models

# ── AI Free (ОСНОВНЫЕ) ──────────────────────────────────────────────────────
# Groq — Аналитический анализ (Llama 3.1 70B), 14400 req/day БЕСПЛАТНО
# Ключ: console.groq.com → без карты
GROQ_API_KEY=gsk_CHANGE_ME
GROQ_MODEL=llama-3.1-70b-versatile
GROQ_FALLBACK_MODEL=mixtral-8x7b-32768

# Google Gemini Flash — Исторический анализ, 1500 req/day БЕСПЛАТНО
# Ключ: aistudio.google.com/app/apikey → без карты
GOOGLE_AI_API_KEY=CHANGE_ME
GEMINI_MODEL=gemini-1.5-flash
GEMINI_PRO_MODEL=gemini-1.5-pro

# Стратегия AI: "dual" = Groq+Gemini параллельно (рекомендуется)
AI_ANALYSIS_STRATEGY=dual

# ── AI Paid (ОПЦИОНАЛЬНЫЕ) ──────────────────────────────────────────────────
OPENAI_API_KEY=sk-CHANGE_ME
OPENAI_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-large
ANTHROPIC_API_KEY=sk-ant-CHANGE_ME
ANTHROPIC_MODEL=claude-opus-4-5

# ML
CLIP_MODEL=ViT-L-14  CLIP_PRETRAINED=openai  DINO_MODEL=facebook/dinov2-large
DEVICE=cpu  EMBEDDING_DIM=1536  ML_INFERENCE_URL=http://localhost:8001

# Security
SECRET_KEY=  ENCRYPTION_KEY=

# App
APP_ENV=development
CORS_ORIGINS=http://localhost:3200
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3200

# Payments
YOOKASSA_SHOP_ID=  YOOKASSA_SECRET_KEY=
CRYPTOCLOUD_API_KEY=  CRYPTOCLOUD_SHOP_ID=
PRODAMUS_SECRET_KEY=  PRODAMUS_PAYFORM_URL=

# Promo
PROMO_CODES=LAUNCH30:30,ANNUAL50:365
```

## 8. СТРУКТУРА ФАЙЛОВ DATA (demo-режим — актуально)

```
frontend/public/
├── manifest.json              — PWA: name/theme_color=#00d4ff/icons/categories
└── data/
    ├── brands/
    │   ├── bmw.json           — DNA: overallScore:91, nine11=нет, driving_dynamics:97
    │   │                         analysis (Groq) + analysisAlt (Gemini) — У MASERATI ЕСТЬ
    │   ├── mercedes.json      — DNA: overallScore:92, safety_innovation:98
    │   ├── ferrari.json       — DNA: overallScore:96, v12_theatre:99, racing_dna:99
    │   ├── porsche.json       — DNA: overallScore:95, nine11_heritage:99
    │   ├── audi.json          — DNA: overallScore:90, quattro_awd:98
    │   ├── lamborghini.json   — DNA: overallScore:94, design_provocation:97
    │   ├── maserati.json      — DNA: overallScore:89, engine_sound:97
    │   │                         analysis (Groq analytical) + analysisAlt (Gemini historical)
    │   ├── lotus.json, volkswagen.json, seat.json, skoda.json
    │   └── ... (37 брендов всего)
    │
    ├── models/
    │   ├── bmw-3-series.json, bmw-m3.json, bmw-6-series.json
    │   ├── mercedes-e-class.json, mercedes-s-class.json, mercedes-c-class.json
    │   ├── mercedes-sl.json, mercedes-g-class.json, mercedes-gle.json
    │   ├── mercedes-amg-gt.json, mercedes-eqs.json, mercedes-amg-c63.json
    │   ├── mercedes-slk.json, mercedes-clk.json, mercedes-a-class.json
    │   ├── ferrari-f40.json, ferrari-enzo.json, ferrari-250-gt.json
    │   ├── ferrari-308-gtb.json, ferrari-f355.json, ferrari-360-modena.json
    │   ├── porsche-356.json, porsche-carrera-gt.json
    │   ├── maserati-mc12.json, maserati-ghibli-i.json, maserati-bora.json
    │   ├── lamborghini-countach.json, lamborghini-urus.json
    │   ├── audi-a4.json, audi-r8.json, audi-quattro.json, audi-e-tron-gt.json
    │   ├── lotus-elan.json, lotus-europa.json
    │   ├── vw-beetle.json, vw-passat.json, vw-id3.json
    │   ├── seat-ibiza.json, seat-leon.json
    │   ├── skoda-octavia.json, skoda-superb.json
    │   └── ... (200+ файлов)
    │
    └── evolution/
        └── graph.json         — {nodes: GraphNode[], edges: GraphEdge[]}
                                  322+ узла | 383+ ребра | 11 брендов
                                  ЗАГРУЖАЕТСЯ КЛИЕНТСКИ через fetch() в useEffect!
                                  (НЕ импортировать в webpack — OOM)

Структура brand JSON (полная):
{
  id, slug, name, fullName, country, countryCode, foundingYear,
  logoUrl, logoWhiteUrl, headerImageUrl, description,
  parentCompany, headquarters, modelCount, generationCount,
  tags[], aiAnalysisAvailable, createdAt, updatedAt,
  dna: {
    id, brandId, entityType:"brand", entityId, overallScore,
    dominantStyle, colorPalette[], keyElements[], influencedBy[], hasInfluenced[],
    dimensions: [{ key, label, score, description, trend:"stable|increasing|decreasing" }],
    temporalEvolution: [{ year, score, milestone, dimensionScores:{labelName: score} }],
    createdAt, updatedAt
  },
  analysis: {   // Groq analytical
    id, entityType, entityId, analysisType, provider:"groq",
    headline, summary, fullText,
    insights: [{ id, category, text, confidence, importance:"critical|high|medium" }],
    confidenceScore, processingTimeMs, createdAt, isCached:true
  },
  analysisAlt: {  // Gemini historical (опционально — есть у Maserati)
    // те же поля, provider:"gemini", variant:"historical"
  },
  models: [{ id, slug, name, fullName, brandId, bodyType, segment,
             startYear, endYear, isActive, description, generationCount,
             thumbnailUrl, heroImageUrl, aiAnalysisAvailable, createdAt, updatedAt }]
}
```

## 9. ТЕСТИРОВАНИЕ

```
Модули тестов:
- test_brands.py    (6)  - test_models.py    (8)  - test_search.py    (5)
- test_evolution.py (6)  - test_analysis.py  (5)  - test_auth.py      (8)
- test_payments.py  (4)  - test_crawler.py   (4)  - test_embeddings.py(3)
- test_security.py  (12) — XSS, SQL injection, auth bypass, rate limits

Fixtures: PostgreSQL in-memory + AsyncClient + brand/model factories
ML mocks: фиктивные эмбеддинги (torch.randn) для unit-тестов без GPU
AI mocks: предустановленные JSON-ответы для Groq/Gemini (не требуют API ключей)
```

## 10. DEPLOY

```
docker/docker-compose.yml:
  services: postgres(pgvector:pg16) + neo4j:5.15 + redis:7.2 +
            minio + backend + ml-inference + frontend + prometheus + grafana

Dockerfiles:
  Dockerfile.backend  — python:3.12-slim + pip install groq google-generativeai
  Dockerfile.frontend — node:20-alpine (multi-stage: install → build → serve)
  Dockerfile.ml       — python:3.12 + torch + open-clip-torch + transformers
  Dockerfile.crawler  — python:3.12 + playwright install chromium

next.config.mjs критичные настройки:
  typescript.ignoreBuildErrors: true  (cytoscape plugins не имеют TypeScript типов)
  remotePatterns: images.caricos.com, netcarshow.com, unsplash.com
  rewrites: /api/v1/* → backend:8000
  experimental.optimizePackageImports: [lucide-react, framer-motion]

Node.js heap для dev (ОБЯЗАТЕЛЬНО):
  NODE_OPTIONS="--max-old-space-size=2048" npm run dev -- -p 3200
  Без этого: heap overflow при компиляции evolution/page.tsx

PWA:
  public/manifest.json — name:"AutoEvoFlow", theme_color:"#00d4ff"
  (service worker опционален — manifest достаточен для "Add to homescreen")

TypeScript declarations:
  src/typings/cytoscape-cola.d.ts — declare module для cola/dagre/react-cytoscapejs
```

## 11. ИЗВЕСТНЫЕ ПРОБЛЕМЫ И РЕШЕНИЯ

```
1. OOM при компиляции → graph.json:
   Причина: инлайн-массив 322 узлов в webpack-bundle
   Решение: fetch('/data/evolution/graph.json') в useEffect + graphLoading state
   Dev heap: NODE_OPTIONS="--max-old-space-size=2048"

2. WebGL crash на слабых GPU:
   Причина: react-three-fiber + antialias + high-performance GPU hint
   Решение: WebGLErrorBoundary + powerPreference:'low-power' + shadows:false
   Fallback: CSS pulsing rings (animated div) вместо 3D сцены

3. Stale .next chunks после build:
   Причина: prod build меняет chunk IDs, dev server использует старые
   Решение: rm -rf .next перед запуском dev после prod build

4. 911 Carrera G-Body вместо "G-Series":
   Нода p911-g переименована в "911 Carrera G-Body" (1973–1989)
   codeName: "G-Body 73-89"

5. Двойной порт в package.json:
   "dev": "next dev -p 3200" + запуск с -- -p 3200 = дублирование флага
   Безвредно, но лучше убрать порт из package.json scripts.dev
```

---

## КАК ИСПОЛЬЗОВАТЬ

1. Замени доменную логику (автомобили → вино/архитектура/музыка/кино...)
2. Сохрани паттерны: demo fallback, dual AI analysis, evolution graph, honest pricing
3. Используй бесплатные AI: Groq (analytics) + Gemini Flash (historical) — $0/day
4. graph.json клиентский fetch — обязателен при >100 узлах (иначе OOM)
5. Адаптируй landing: замени контент, сохрани 14-секционную структуру
6. CSS-система: variables + glass + scan-effect + dark theme — копируй целиком
7. Тарифы: не продавай нерабочие функции — добавляй 🕐 "скоро" badge
8. Demo auth (localStorage) → заменить JWT при запуске бэкенда
9. 3 платёжных шлюза: ЮKassa + CryptoCloud + Prodamus для РФ рынка
10. ErrorBoundary для WebGL/3D — обязателен на слабых машинах
