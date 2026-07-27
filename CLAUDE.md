# Project Instructions

## Project Context
- Project type: E-commerce order & inventory management system (event-driven architecture)
- Primary language/framework: Java 21 / Spring Boot 3.x (backend), React 18 + Vite + TypeScript (frontend)
- Main entry points: `backend/*/src/main/java/.../Application.java` (per service), `frontend/src/main.tsx`
- Important commands: see "Test Commands" below

Order creation → stock check → payment → notification flow runs asynchronously through Kafka.

## Tech Stack
- **Relational DB**: PostgreSQL (users, orders, order_items, payments, inventory)
- **NoSQL**: MongoDB (products, product_reviews — flexible schema)
- **Cache / Lock**: Redis (cart, stock cache, distributed lock)
- **Messaging**: Apache Kafka + Zookeeper
- **Orchestration**: Docker Compose (local development)

## Workflow
Default development flow is Plan -> Work -> Review.

1. Plan first when requirements are unclear or the task is larger than one small change.
2. Work on one scoped issue/change at a time.
3. Review the diff before considering the task complete.
4. Keep changes small, reversible, and testable.
5. Always run the relevant tests after a code change — only the affected module's tests, not the full suite.

## Architecture Map
```
backend/
├── product-service/    → MongoDB, products/categories/stock
├── order-service/       → PostgreSQL, order lifecycle
├── payment-service/     → payment simulation
├── notification-service/→ Kafka consumer, notifications
└── user-service/        → PostgreSQL, auth (JWT)

frontend/src/
├── features/cart/        → cart (backed by Redis-backed endpoints)
├── features/orders/      → order tracking
├── features/products/    → product listing/search
├── features/admin/       → inventory admin panel
├── components/           → shared presentational UI, no service imports
├── services/             → all HTTP calls, one module per backend service
└── hooks/                → shared cross-feature hooks (auth, polling, etc.)
```
For detailed module descriptions, see: @docs/architecture.md

## Architecture Rules
- Keep business logic separate from UI/framework glue.
- Prefer small public interfaces and deep modules.
- Do not introduce new dependencies without explaining why.
- Do not perform unrelated refactors while implementing an issue.
- Document meaningful architecture decisions in docs/adr/.
- Layered architecture on backend (Controller → Service → Repository); DTOs kept separate from entities.
- Frontend: functional components + hooks only, no class components. API calls live under `services/`, never inside components.

## Database Rules
- **PostgreSQL**: Anything requiring transactional integrity lives here (orders, payments, stock counters). Migrations use Flyway, under `src/main/resources/db/migration/`, named `V{n}__description.sql`.
- **MongoDB**: Only for data that needs a flexible schema (product details, reviews). Never write transactional/financial data to MongoDB.
- **Redis key format**: `cart:{userId}`, `stock:lock:{productId}`, `product:cache:{productId}` — always justify adding a key without a TTL before doing so.

## Kafka Rules
- Topic naming: `{domain}.{event}` (e.g. `order.created`, `payment.completed`)
- Every event must have a schema (Avro/JSON) defined under `docs/kafka-schemas/`; never produce an event without a schema.
- Consumers must be idempotent (processing the same event twice must not corrupt data).
- When adding a new topic, update @docs/kafka-topics.md.

## Code Style
- Lombok is used (prefer `@Getter/@Setter` over `@Data` for mutability control).
- Commit format: `feat:`, `fix:`, `refactor:`, `docs:`

## Test Commands
- Unit tests (backend): `./mvnw test` (single test: `./mvnw test -Dtest=ClassName#methodName`)
- Unit tests (frontend): `npm run test` (inside `frontend/`)
- Typecheck: `npm run typecheck` (frontend)
- Lint: `./mvnw checkstyle:check` (backend), `npm run lint` (frontend)
- Build: `./mvnw clean package` (backend), `npm run build` (frontend)
- Run backend: `./mvnw spring-boot:run`
- Run frontend: `npm run dev`
- All infrastructure (Postgres, Mongo, Redis, Kafka): `docker compose up -d`

## Safety
- Do not delete files without explicit instruction.
- Do not change public behavior outside the active task.
- Ask before large rewrites, schema migrations, or dependency changes.
- If scope grows, stop and propose a new issue.
- Do not touch `legacy/`, `**/generated/`, `.env`, or `docker-compose.override.yml`.

## Additional Resources
- Agent definitions: @.claude/agents/
- Project rules: @.claude/rules/
- Skills: @.claude/skills/
- Architecture details: @docs/architecture.md
- Frontend architecture: @docs/frontend-architecture.md
- Kafka event schemas: @docs/kafka-topics.md
