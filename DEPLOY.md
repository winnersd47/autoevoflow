# Деплой — AutoEvoFlow

Production-сборка проверена: `cd frontend && npm run build` → 26 маршрутов,
TypeScript-typecheck и lint чисто. Приложение готово к деплою.

## Vercel (рекомендуется для Next.js)

1. Запушить репозиторий на GitHub (git сейчас **локальный** — нужен remote:
   `git remote add origin <url> && git push -u origin main`).
2. На vercel.com → **New Project** → импортировать репозиторий.
3. **Root Directory = `frontend`** ⚠️ (монорепо: Next-приложение в подпапке).
4. Framework Preset: Next.js (автоопределение). Build Command: `next build`.
5. Env vars: пока не требуются — фронт автономен, данные статические в `public/data`.
6. Deploy.

## Self-host (альтернатива)

```
cd frontend
npm ci            # установка зависимостей
npm run build
npm start         # production-сервер на :3000
```
Лучше за reverse-proxy (nginx/Caddy) с HTTPS.

## Заметки

- Граф (`public/data/evolution/graph.json`, ~556 КБ) и каталог брендов/моделей —
  статика, грузятся через `fetch` на клиенте (НЕ через webpack-import — иначе OOM).
- Перед деплоем гонять `npm run validate` (QA-гейт графа).
- Прокси изображений (`/api/car-image`, `/api/netcarshow-image`) — серверные
  route-handlers, работают и на Vercel (Node runtime).
- Скрапер/синк (`npm run update:latest`) — это офлайн-задача (cron/Task Scheduler),
  не часть рантайма сайта.
