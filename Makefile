.PHONY: help install dev build test clean docker-up docker-down

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install all dependencies
	pnpm install
	cd backend/core && python -m venv venv && . venv/bin/activate && pip install -r requirements.txt

dev: ## Start development servers
	@echo "Starting development servers..."
	@make docker-up
	@echo "Start frontend: cd frontend && pnpm dev"
	@echo "Start backend: cd backend/core && . venv/bin/activate && python -m app.main"

build: ## Build for production
	pnpm --filter frontend build
	cd backend && docker build -t devin-clone-api .

test: ## Run tests
	pnpm --filter frontend test
	cd backend/core && . venv/bin/activate && pytest

clean: ## Clean build artifacts
	rm -rf frontend/.next frontend/out
	rm -rf backend/core/__pycache__ backend/core/.pytest_cache
	find . -type d -name "node_modules" -prune -exec rm -rf {} +
	find . -type d -name "venv" -prune -exec rm -rf {} +

docker-up: ## Start Docker services
	docker-compose up -d
	@echo "Waiting for services to be ready..."
	@sleep 5
	@echo "Services are ready!"

docker-down: ## Stop Docker services
	docker-compose down

docker-logs: ## Show Docker logs
	docker-compose logs -f