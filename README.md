# tp-microservices-nest

A NestJS microservices monorepo demonstrating REST, gRPC, Kafka, and GraphQL working together, fronted by an nginx API gateway and a real-time Vite dashboard.

## Architecture

```
Browser / Client
      │
      ▼
  nginx :8080  (API Gateway)
  ├── /api/catalog/*   → catalog-service :3001  (REST + TypeORM)
  ├── /api/orders/*    → order-service   :3002  (REST + TypeORM + Kafka producer + gRPC client)
  └── /graphql         → query-service   :3005  (GraphQL aggregator)

order-service ──gRPC──► stock-service :5001  (availability check & reservation)
order-service ──Kafka──► notification-service  (event consumer, no HTTP port)

PostgreSQL :5432  (shared by catalog-service and order-service)
Kafka      :9092  (topic: order.created)
```

## Services

| Service              | Protocol | Port | Notes |
|----------------------|----------|------|-------|
| catalog-service      | REST     | 3001 | Products CRUD. Swagger at `/api` |
| order-service        | REST     | 3002 | Orders CRUD. Swagger at `/api` |
| query-service        | GraphQL  | 3005 | Read-only aggregator. Playground at `/graphql` |
| stock-service        | gRPC     | 5001 | `StockService.CheckAndReserve` only |
| notification-service | Kafka    | —    | Consumes `order.created`, no HTTP port |
| nginx (gateway)      | HTTP     | 8080 | Reverse proxy for all REST + GraphQL |
| dashboard            | HTTP     | 5173 | Vite dev server (prod: 4173) |
| PostgreSQL           | TCP      | 5432 | Shared database `tp_microservices` |
| Kafka                | TCP      | 9092 | Single-broker, auto topic creation |

## Prerequisites

- Docker + Docker Compose
- Node.js 22 + npm
- pnpm (`npm install -g pnpm`)

## Quick start

```bash
# Start Docker infrastructure + build + launch all services
make up

# Follow all logs
make logs

# Stop Node services (keeps Docker running)
make stop

# Stop everything including Docker
make down
```

## Individual commands

```bash
make build       # Compile all NestJS services + dashboard
make start       # Launch compiled services as background processes
make stop        # Kill background processes
make restart     # stop + start
make status      # Show which services are running
make clean       # Stop everything and remove dist/, .logs/, .pids/
make dashboard   # Run only the dashboard dev server
```

## Test data

### Create a product

```bash
curl -s -X POST http://localhost:3001/products \
  -H 'Content-Type: application/json' \
  -d '{"name":"Laptop","price":1200,"stock":10}' | jq
```

### List products

```bash
curl -s http://localhost:3001/products | jq
```

### Create an order (triggers gRPC stock check + Kafka event)

```bash
curl -s -X POST http://localhost:3002/orders \
  -H 'Content-Type: application/json' \
  -d '{"productId":1,"quantity":2,"customerEmail":"client@test.com"}' | jq
```

### List orders

```bash
curl -s http://localhost:3002/orders | jq
```

### Via the gateway (same requests, port 8080)

```bash
curl -s http://localhost:8080/api/catalog/products | jq
curl -s -X POST http://localhost:8080/api/orders/orders \
  -H 'Content-Type: application/json' \
  -d '{"productId":1,"quantity":1,"customerEmail":"client@test.com"}' | jq
```

### GraphQL queries

Open the playground at `http://localhost:3005/graphql`, or use curl:

```bash
# List all products
curl -s -X POST http://localhost:3005/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ products { id name price stock } }"}' | jq

# List all orders
curl -s -X POST http://localhost:3005/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ orders { id productId quantity customerEmail } }"}' | jq

# Get a single order by id
curl -s -X POST http://localhost:3005/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ orderById(id: \"1\") { id productId quantity customerEmail } }"}' | jq
```

## Dashboard

The dashboard at `http://localhost:5173` shows:

- **Architecture diagram** — animated SVG of all services and connections with live request flow animations
- **Service status** — health dots per service, auto-refreshed every 5 seconds
- **E2E test buttons** — run full flows and watch packets travel through the diagram in real time
- **Kafka stream** — live feed of Kafka events from `notification-service` and `order-service` logs
- **Activity log** — timestamped trace of every step in each test run

## Why REST, gRPC, Kafka, and GraphQL are not interchangeable

Each protocol is chosen for a different communication need:

**REST** is used for synchronous, resource-oriented external APIs (catalog and order services). It is the right default when the caller needs an immediate response and when the interface is consumed by browsers, mobile apps, or third-party clients that expect standard HTTP semantics and status codes.

**gRPC** is used for synchronous service-to-service calls where performance and strict contracts matter. When `order-service` calls `stock-service` to check and reserve inventory, it needs a low-latency binary protocol, strongly-typed request/response (defined in `stock.proto`), and a guarantee that the call either succeeds or fails before the order is accepted. HTTP/2 multiplexing and protobuf serialization make this significantly faster than REST for internal calls.

**Kafka** is used for asynchronous, fire-and-forget events. Once an order is created, `order-service` publishes `order.created` to a topic and moves on — it does not care when `notification-service` processes it, or whether it is slow, restarting, or temporarily down. Kafka decouples producers from consumers, buffers messages if a consumer lags, and makes it trivial to add more consumers (analytics, billing, etc.) without touching the producer.

**GraphQL** is used for flexible, read-only aggregation. `query-service` fetches data from multiple REST services and exposes a single typed schema. Clients specify exactly which fields they need, eliminating over-fetching. This is the right layer for a frontend that wants a unified view of products and orders without making multiple REST calls and merging them client-side.

## CI/CD

GitHub Actions workflow at `.github/workflows/ci-cd.yml`:

1. **prepare** — generates a tag in the format `YYYYMMDD-HHMMSS-{7-char SHA}`
2. **build** — builds and pushes 6 Docker images to DockerHub in parallel (matrix strategy)
3. **update-compose** — bot-commits updated image tags into `docker-compose.prod.yml` with `[skip ci]`

### Required GitHub secrets

| Secret               | Value |
|----------------------|-------|
| `DOCKERHUB_USERNAME` | Your DockerHub username |
| `DOCKERHUB_TOKEN`    | Your DockerHub access token |

All other configuration (database passwords, Kafka broker address, gRPC URL) is hardcoded in the compose files.

## Production deployment

```bash
# On the target server, pull and start:
docker compose -f docker-compose.prod.yml up -d
```

The dashboard is served as a static Nginx site on port `4173`. The API gateway is on port `80`.
