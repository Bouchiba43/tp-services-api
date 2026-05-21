ROOT_DIR := $(shell pwd)
LOG_DIR  := $(ROOT_DIR)/.logs
PID_DIR  := $(ROOT_DIR)/.pids

SERVICES := catalog-service stock-service order-service notification-service query-service

.PHONY: up down stop start build logs status restart clean docker-up wait-kafka

# ── Main targets ─────────────────────────────────────────────────────────────

up: docker-up wait-kafka build start
	@echo ""
	@echo "  catalog-service   →  http://localhost:3001/products  (Swagger: /api)"
	@echo "  order-service     →  http://localhost:3002/orders    (Swagger: /api)"
	@echo "  query-service     →  http://localhost:3005/graphql"
	@echo "  stock-service     →  gRPC localhost:5001"
	@echo "  notification-svc  →  Kafka consumer (order.created)"
	@echo ""
	@echo "  Run 'make logs' to follow all service output."
	@echo "  Run 'make stop' to stop services (keeps Docker up)."
	@echo "  Run 'make down' to stop everything including Docker."

down: stop
	docker compose down

restart: stop start

# ── Docker ───────────────────────────────────────────────────────────────────

docker-up:
	@echo "Starting Docker services..."
	@docker compose up -d postgres kafka

wait-kafka:
	@echo "Waiting for Kafka broker..."
	@until docker exec tp-kafka kafka-topics \
		--bootstrap-server localhost:9092 --list >/dev/null 2>&1; do \
		printf '.'; sleep 2; \
	done
	@echo " ready"

# ── Build ─────────────────────────────────────────────────────────────────────

build:
	@for svc in $(SERVICES); do \
		echo "→ Building $$svc..."; \
		npm run build --prefix $$svc --silent 2>&1 || exit 1; \
	done
	@echo "Build complete."

# ── Start / Stop ─────────────────────────────────────────────────────────────

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

stop:
	@for svc in catalog stock order notification query; do \
		if [ -f $(PID_DIR)/$$svc.pid ]; then \
			kill $$(cat $(PID_DIR)/$$svc.pid) 2>/dev/null || true; \
			rm -f $(PID_DIR)/$$svc.pid; \
			echo "  [stopped] $$svc"; \
		fi; \
	done

# ── Observability ─────────────────────────────────────────────────────────────

logs:
	@tail -f $(LOG_DIR)/catalog.log \
	         $(LOG_DIR)/stock.log \
	         $(LOG_DIR)/order.log \
	         $(LOG_DIR)/notification.log \
	         $(LOG_DIR)/query.log

status:
	@echo "Docker:"
	@docker compose ps --format "  {{.Name}}  {{.Status}}"
	@echo ""
	@echo "Services:"
	@for svc in catalog stock order notification query; do \
		if [ -f $(PID_DIR)/$$svc.pid ] && \
		   kill -0 $$(cat $(PID_DIR)/$$svc.pid) 2>/dev/null; then \
			echo "  [up]   $$svc  (PID=$$(cat $(PID_DIR)/$$svc.pid))"; \
		else \
			echo "  [down] $$svc"; \
		fi; \
	done

# ── Clean ─────────────────────────────────────────────────────────────────────

clean: down
	@rm -rf $(LOG_DIR) $(PID_DIR)
	@for svc in $(SERVICES); do rm -rf $$svc/dist; done
	@echo "Cleaned dist/, .logs/, .pids/"

# ── Directory targets ─────────────────────────────────────────────────────────

$(LOG_DIR) $(PID_DIR):
	@mkdir -p $@
