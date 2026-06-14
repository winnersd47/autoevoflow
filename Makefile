# ============================================================
# AutoEvoFlow — Makefile
# ============================================================

.PHONY: help up down dev-api dev-ml dev-web migrate rollback test lint seed logs clean

# Переменные
COMPOSE = docker compose -f docker/docker-compose.yml
BACKEND = cd backend &&
FRONTEND = cd frontend &&
ML = cd ml &&

help:
	@echo "AutoEvoFlow — команды разработки"
	@echo ""
	@echo "  make up          Запустить весь стек (Docker)"
	@echo "  make down        Остановить стек"
	@echo "  make dev-api     Backend hot-reload :8000"
	@echo "  make dev-ml      ML-сервис hot-reload :8001"
	@echo "  make dev-web     Frontend dev :3000"
	@echo "  make migrate     alembic upgrade head"
	@echo "  make rollback    alembic downgrade -1"
	@echo "  make test        pytest"
	@echo "  make lint        ruff + mypy"
	@echo "  make seed        Заполнить тестовыми данными"
	@echo "  make logs        Логи всех сервисов"
	@echo "  make clean       Удалить volumes + containers"

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

dev-api:
	$(BACKEND) uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-ml:
	$(ML) inference && uvicorn server:app --reload --host 0.0.0.0 --port 8001

dev-web:
	$(FRONTEND) npm run dev

# Инфраструктура только (без backend/frontend)
infra:
	$(COMPOSE) up -d postgres redis neo4j minio

migrate:
	$(BACKEND) alembic upgrade head

rollback:
	$(BACKEND) alembic downgrade -1

migration:
	$(BACKEND) alembic revision --autogenerate -m "$(msg)"

test:
	$(BACKEND) pytest tests/ -v --cov=app --cov-report=term-missing

lint:
	$(BACKEND) ruff check app/ && mypy app/

lint-fix:
	$(BACKEND) ruff check --fix app/ && ruff format app/

seed:
	$(BACKEND) python scripts/seed_dev_data.py

logs:
	$(COMPOSE) logs -f --tail=100

logs-api:
	$(COMPOSE) logs -f backend

logs-ml:
	$(COMPOSE) logs -f ml

clean:
	$(COMPOSE) down -v --remove-orphans

# Установка зависимостей
install:
	$(BACKEND) pip install -r requirements.txt -r requirements-dev.txt
	$(FRONTEND) npm install

# Сборка Docker-образов
build:
	$(COMPOSE) build

# Полный сброс и пересоздание
reset: clean up migrate seed
	@echo "Стек пересоздан и заполнен данными"

# Проверка здоровья
health:
	@curl -s http://localhost:8000/health | python -m json.tool
