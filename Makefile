ROOT_DIR      := $(shell pwd)
LOG_DIR       := $(ROOT_DIR)/.logs
PID_DIR       := $(ROOT_DIR)/.pids
DASHBOARD_DIR := $(ROOT_DIR)/dashboard

SERVICES := catalog-service stock-service order-service notification-service query-service

.PHONY: up down stop start build logs status restart clean docker-up wait-kafka dashboard

up: docker-up wait-kafka build start
	@echo ""
	@echo "  catalog-service   →  http://localhost:3001  (Swagger: /api)"
	@echo "  order-service     →  http://localhost:3002  (Swagger: /api)"
	@echo "  query-service     →  http://localhost:3005/graphql"
	@echo "  stock-service     →  gRPC :5001"
	@echo "  notification-svc  →  Kafka consumer"
	@echo "  dashboard         →  http://localhost:5173"
	@echo "  nginx gateway     →  http://localhost:8080"
	@echo ""
	@echo "  make logs    follow all output"
	@echo "  make stop    stop services (keeps Docker)"
	@echo "  make down    stop everything"

down: stop
	docker compose down

restart: stop start

docker-up:
	@echo "Starting Docker services..."
	@docker compose up -d postgres kafka nginx

wait-kafka:
	@echo "Waiting for Kafka broker..."
	@until docker exec tp-kafka kafka-topics \
		--bootstrap-server localhost:9092 --list >/dev/null 2>&1; do \
		printf '.'; sleep 2; \
	done
	@echo " ready"

build:
	@for svc in $(SERVICES); do \
		echo "→ Building $$svc..."; \
		npm run build --prefix $$svc --silent 2>&1 || exit 1; \
	done
	@echo "→ Building dashboard..."
	@cd $(DASHBOARD_DIR) && pnpm --silent build 2>&1 || exit 1
	@echo "Build complete."

start: $(LOG_DIR) $(PID_DIR)
	@echo "Starting services..."

	@nohup node $(ROOT_DIR)/stock-service/dist/main.js \
		> $(LOG_DIR)/stock.log 2>&1 & echo $$! > $(PID_DIR)/stock.pid
	@echo "  [started] stock-service        gRPC :5001"

	@nohup node $(ROOT_DIR)/catalog-service/dist/main.js \
		> $(LOG_DIR)/catalog.log 2>&1 & echo $$! > $(PID_DIR)/catalog.pid
	@echo "  [started] catalog-service      HTTP :3001"

	@sleep 1

	@nohup node $(ROOT_DIR)/order-service/dist/main.js \
		> $(LOG_DIR)/order.log 2>&1 & echo $$! > $(PID_DIR)/order.pid
	@echo "  [started] order-service        HTTP :3002"

	@nohup node $(ROOT_DIR)/notification-service/dist/main.js \
		> $(LOG_DIR)/notification.log 2>&1 & echo $$! > $(PID_DIR)/notification.pid
	@echo "  [started] notification-service Kafka consumer"

	@nohup node $(ROOT_DIR)/query-service/dist/main.js \
		> $(LOG_DIR)/query.log 2>&1 & echo $$! > $(PID_DIR)/query.pid
	@echo "  [started] query-service        HTTP :3005"

	@cd $(DASHBOARD_DIR) && nohup pnpm dev \
		> $(LOG_DIR)/dashboard.log 2>&1 & echo $$! > $(PID_DIR)/dashboard.pid
	@echo "  [started] dashboard            HTTP :5173"

stop:
	@for svc in catalog stock order notification query dashboard; do \
		if [ -f $(PID_DIR)/$$svc.pid ]; then \
			kill $$(cat $(PID_DIR)/$$svc.pid) 2>/dev/null || true; \
			rm -f $(PID_DIR)/$$svc.pid; \
			echo "  [stopped] $$svc"; \
		fi; \
	done

logs:
	@tail -f $(LOG_DIR)/catalog.log \
	         $(LOG_DIR)/stock.log \
	         $(LOG_DIR)/order.log \
	         $(LOG_DIR)/notification.log \
	         $(LOG_DIR)/query.log \
	         $(LOG_DIR)/dashboard.log

status:
	@echo "Docker:"
	@docker compose ps --format "  {{.Name}}  {{.Status}}"
	@echo ""
	@echo "Services:"
	@for svc in catalog stock order notification query dashboard; do \
		if [ -f $(PID_DIR)/$$svc.pid ] && \
		   kill -0 $$(cat $(PID_DIR)/$$svc.pid) 2>/dev/null; then \
			echo "  [up]   $$svc  (PID=$$(cat $(PID_DIR)/$$svc.pid))"; \
		else \
			echo "  [down] $$svc"; \
		fi; \
	done

dashboard:
	@cd $(DASHBOARD_DIR) && pnpm dev

clean: down
	@rm -rf $(LOG_DIR) $(PID_DIR)
	@for svc in $(SERVICES); do rm -rf $$svc/dist; done
	@rm -rf $(DASHBOARD_DIR)/dist
	@echo "Cleaned dist/, .logs/, .pids/"

$(LOG_DIR) $(PID_DIR):
	@mkdir -p $@
