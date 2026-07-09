# Architecture

Event-driven e-commerce order & inventory management system.

## Flow

Order creation → stock check → payment → notification, running asynchronously through Kafka. Each step publishes an event; downstream services consume it independently instead of calling each other synchronously.

## Backend Services

- **product-service** — MongoDB. Owns products, categories, stock levels.
- **order-service** — PostgreSQL. Owns order lifecycle (creation, status transitions).
- **payment-service** — Simulates payment processing.
- **notification-service** — Kafka consumer only; sends notifications on order/payment events.
- **user-service** — PostgreSQL. Auth (JWT), user accounts.

Each service is layered Controller → Service → Repository, with DTOs kept separate from entities.

## Frontend Features

- **features/cart** — Cart, backed by Redis-backed endpoints.
- **features/orders** — Order tracking.
- **features/products** — Product listing/search.
- **features/admin** — Inventory admin panel.

Functional components + hooks only; API calls live under `services/`, never inside components.

## Data Stores

- **PostgreSQL** — Transactional data: users, orders, order_items, payments, inventory counters.
- **MongoDB** — Flexible-schema data only: products, product_reviews. Never transactional/financial data.
- **Redis** — Cart, stock cache, distributed locks. Key format: `cart:{userId}`, `stock:lock:{productId}`, `product:cache:{productId}`.
- **Kafka + Zookeeper** — Event bus between services. See `docs/kafka-topics.md` for topics and `docs/kafka-schemas/` for event schemas.

## Decisions

Meaningful architecture decisions are recorded as ADRs in `docs/adr/`.
