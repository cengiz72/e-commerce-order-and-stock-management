# PostgreSQL Database Design Spec

Design-only specification for the PostgreSQL tables in this system. No entities,
repositories, or Flyway SQL are produced here — this document is the input to that
later work. When tables are implemented, migrations follow the Flyway convention
`V{n}__description.sql` under each service's `src/main/resources/db/migration/`.

Related docs: [architecture.md](architecture.md), [kafka-topics.md](kafka-topics.md),
[kafka-schemas/](kafka-schemas/), [adr/0001-saga-pattern-for-rollback.md](adr/0001-saga-pattern-for-rollback.md).

---

## 1. Facts, Assumptions, Open Questions

### Facts (grounded in CLAUDE.md, architecture.md, kafka schemas, ADR-0001)
- Three services own PostgreSQL data: **user-service** (users/auth/JWT),
  **order-service** (order lifecycle), **payment-service** (payment records).
- **product-service** uses MongoDB and owns products, categories, and stock levels
  per `docs/architecture.md`.
- Each service is a separate deployable; services do **not** share a database. There
  is therefore no shared-transaction and no enforced cross-service foreign key.
- Kafka is the integration mechanism. Two event schemas already exist and constrain
  which fields must be derivable from these tables:
  - `order.created`: `orderId` (uuid), `userId` (uuid), `items[{productId, quantity, unitPrice}]`,
    `totalAmount`, `createdAt`.
  - `payment.completed`: `paymentId` (uuid), `orderId` (uuid), `amount`,
    `status` (`SUCCESS`|`FAILED`), `completedAt`.
- ADR-0001 (choreography Saga) states the compensation chain transitions an order to
  `CANCELLED` on `payment.failed`, and product-service compensates stock with
  `stock.released`. This implies an order-status lifecycle including a cancelled state.
- Repo is greenfield: only empty `package-info.java` stubs exist; no entities, no
  migrations.

### Assumptions (clearly marked — verify before implementing)
- **A1 — Inventory in Postgres (disputed, see OQ1).** ASSUMPTION: a Postgres-side
  **stock reservation ledger** lives in a service on the transactional side (modelled
  below under order-service as `stock_reservations`), separate from MongoDB's
  catalog-level stock display. Rationale: the Saga needs a durable, transactional record
  of "quantity reserved for order X" so that `stock.reserved` / `stock.released`
  compensations are idempotent and auditable; MongoDB catalog counters are not the right
  place for financial/transactional integrity per the Database Rules. This is an
  assumption, not a resolved fact.
- **A2 — Per-service schema isolation.** Each service owns its own database/schema; the
  ID types below (uuid) are chosen so cross-service references remain stable logical
  references without needing shared sequences.
- **A3 — UUID primary keys** for order, payment, user, reservation rows (matches the
  uuid fields already present in the Kafka schemas). `order_items` uses a surrogate
  bigserial PK plus a FK to `orders` (same DB, so a real FK is allowed here).
- **A4 — Money as `NUMERIC(12,2)`** (not floating point) for all amounts/prices, despite
  the Kafka schemas typing them as JSON `number`.
- **A5 — Timestamps as `TIMESTAMPTZ`**, UTC. Event fields like `createdAt`/`completedAt`
  map directly to these columns.
- **A6 — Order status lifecycle**: `PENDING → PAID → CANCELLED` plus intermediate
  `STOCK_RESERVED` / `STOCK_REJECTED`, derived from the flow (order → stock check →
  payment) and ADR-0001's `CANCELLED` compensation. Exact set is an assumption (OQ2).

### Open Questions (need answers before/at implementation)
- **OQ1 — Where does authoritative stock live?** CLAUDE.md Database Rules list
  "inventory" among Postgres transactional tables; architecture.md says product-service
  (MongoDB) owns stock levels. Is there a Postgres stock reservation/ledger table for the
  Saga's compensating transactions, distinct from Mongo's catalog stock? If yes, which
  service owns it (order-service vs a Postgres slice of product-service)? See A1 for the
  proposed resolution. **This warrants an ADR (see section 4).**
- **OQ2 — Canonical order status set** and legal transitions (see A6). Needs to be pinned
  down alongside the `stock.reserved`/`stock.rejected` schemas once those topics are
  implemented (currently a TODO in kafka-topics.md).
- **OQ3 — Payment ret/idempotency**: can an order have more than one payment row (retry
  after `FAILED`)? Affects whether `payments.order_id` is UNIQUE or merely indexed.
- **OQ4 — Soft delete / auditing**: are `deleted_at` / audit columns required
  system-wide? Not assumed below to avoid over-design.

---

## 2. Cross-service reference rule

Per architecture, services do not share a database, so **no cross-service foreign keys
are enforced**. Columns such as `orders.user_id` (→ user-service `users`),
`order_items.product_id` (→ product-service Mongo `products`), and
`payments.order_id` (→ order-service `orders`) are **logical references only**.
Referential integrity across services is maintained by events + Saga compensation, not by
the database. Foreign keys are used **only** within a single service's own schema
(e.g. `order_items.order_id → orders.id`). This convention should be captured in an ADR
(section 4).

---

## 3. Table Designs

### 3.1 user-service (`user-service` schema/DB)

#### `users`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK. Referenced logically by `orders.user_id`. |
| `email` | VARCHAR(320) | NOT NULL | — | Login identifier. |
| `password_hash` | VARCHAR(255) | NOT NULL | — | BCrypt/Argon2 hash; never plaintext. |
| `display_name` | VARCHAR(100) | NULL | — | |
| `role` | VARCHAR(20) | NOT NULL | `'CUSTOMER'` | Enum-like: `CUSTOMER`, `ADMIN` (admin panel access). |
| `enabled` | BOOLEAN | NOT NULL | `true` | Account active flag. |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | |

- **PK**: `id`.
- **Unique**: `email` (case-insensitive — implement via `LOWER(email)` unique index or `CITEXT`).
- **Indexes**: unique index on `email` covers login lookups.
- **Enum-like**: `role` ∈ {`CUSTOMER`, `ADMIN`}.
- **Relationships**: logical target of `orders.user_id` (no enforced FK).

> JWT itself is stateless and not stored. If refresh tokens/sessions are later required,
> a separate `refresh_tokens` table would be added (out of scope, flagged as future work).

---

### 3.2 order-service (`order-service` schema/DB)

#### `orders`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK. Maps to `order.created.orderId`. |
| `user_id` | UUID | NOT NULL | — | Logical ref to user-service `users.id`. Maps to `order.created.userId`. No FK. |
| `status` | VARCHAR(20) | NOT NULL | `'PENDING'` | Enum-like, see below. |
| `total_amount` | NUMERIC(12,2) | NOT NULL | — | Maps to `order.created.totalAmount`. Should equal Σ(order_items.quantity × unit_price). |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | Maps to `order.created.createdAt`. |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | Bumped on each status transition. |

- **PK**: `id`.
- **Indexes**: `(user_id)` for "my orders" lookups; `(status)` for admin/ops filtering;
  optionally `(user_id, created_at DESC)` for paginated order history.
- **Enum-like `status`** (ASSUMPTION A6 / OQ2): `PENDING`, `STOCK_RESERVED`,
  `STOCK_REJECTED`, `PAID`, `CANCELLED`. `CANCELLED` is required by ADR-0001's
  compensation path; `STOCK_RESERVED`/`STOCK_REJECTED` track the stock-check step whose
  Kafka topics are still a TODO.
- **Kafka-driven fields**: `id`, `user_id`, `total_amount`, `created_at` all map 1:1 to
  `order.created`. `status` is updated by consuming `payment.completed`
  (`SUCCESS` → `PAID`, `FAILED` → `CANCELLED`) and the future `stock.*` events.
- **Relationships**: parent of `order_items` (real FK, same DB).

#### `order_items`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | BIGSERIAL | NOT NULL | identity | PK (surrogate). |
| `order_id` | UUID | NOT NULL | — | **FK → `orders.id`** (same service, enforced). |
| `product_id` | VARCHAR(64) | NOT NULL | — | Logical ref to product-service Mongo `products` (`_id` is a string). Maps to `order.created.items[].productId`. No FK. |
| `quantity` | INTEGER | NOT NULL | — | CHECK (`quantity >= 1`). Maps to `items[].quantity`. |
| `unit_price` | NUMERIC(12,2) | NOT NULL | — | Price captured at order time (snapshot, not live catalog price). Maps to `items[].unitPrice`. |

- **PK**: `id`.
- **Unique**: `(order_id, product_id)` — one line per product per order (revisit if the
  UX allows duplicate lines).
- **Indexes**: `(order_id)` for loading an order's lines (covered by the FK usage / unique).
- **Kafka-driven fields**: the entire row materialises `order.created.items[]`.
- **Relationships**: child of `orders`; `product_id` logical ref to product-service.

#### `stock_reservations` — ASSUMPTION A1 / OQ1 (may not belong here)
Included to support Saga compensation with a durable, transactional record. **Confirm via
ADR before implementing.**

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK. |
| `order_id` | UUID | NOT NULL | — | Logical/real ref to `orders.id` (same service → can be FK). |
| `product_id` | VARCHAR(64) | NOT NULL | — | Logical ref to product-service catalog. |
| `quantity` | INTEGER | NOT NULL | — | CHECK (`quantity >= 1`). Reserved amount. |
| `status` | VARCHAR(20) | NOT NULL | `'RESERVED'` | Enum-like: `RESERVED`, `RELEASED`, `REJECTED`. |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | |

- **PK**: `id`. **Unique**: `(order_id, product_id)` for idempotent reservation on event replay.
- **Indexes**: `(order_id)`, `(status)`.
- **Enum-like `status`** ∈ {`RESERVED`, `RELEASED`, `REJECTED`}, tracking the future
  `stock.reserved` / `stock.rejected` / `stock.released` (compensation) events.
- **NOTE**: If OQ1 resolves that stock stays solely in MongoDB, this table is dropped and
  reservation state moves onto the product-service side; the `orders.status` transitions
  still stand.

---

### 3.3 payment-service (`payment-service` schema/DB)

#### `payments`
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK. Maps to `payment.completed.paymentId`. |
| `order_id` | UUID | NOT NULL | — | Logical ref to order-service `orders.id`. Maps to `payment.completed.orderId`. No FK. |
| `amount` | NUMERIC(12,2) | NOT NULL | — | Maps to `payment.completed.amount`. |
| `status` | VARCHAR(20) | NOT NULL | `'PENDING'` | Enum-like, see below. |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | When the payment attempt row was created. |
| `completed_at` | TIMESTAMPTZ | NULL | — | Set when terminal. Maps to `payment.completed.completedAt`. |

- **PK**: `id`.
- **Unique / index on `order_id`**: depends on OQ3. If a single terminal payment per
  order → UNIQUE(`order_id`). If retries create multiple rows → non-unique index and a
  partial unique index on `(order_id) WHERE status = 'SUCCESS'` to guarantee at most one
  successful payment.
- **Indexes**: `(status)` for reconciliation queries.
- **Enum-like `status`**: `PENDING` (attempt created, not yet resolved), plus the two
  values the Kafka schema pins — `SUCCESS`, `FAILED` — from `payment.completed.status`.
- **Kafka-driven fields**: `id`, `order_id`, `amount`, `status`, `completed_at` map 1:1
  to `payment.completed`. The row is the source of that event.
- **Relationships**: `order_id` logical ref to order-service (no enforced FK).

---

## 4. Items that likely need an ADR

1. **Inventory/stock placement in Postgres vs MongoDB (OQ1/A1).** The tension between
   CLAUDE.md's Database Rules ("...payments, inventory" in Postgres) and architecture.md
   (product-service/MongoDB owns stock) is an architectural decision, not a schema detail.
   An ADR should decide whether a Postgres `stock_reservations` ledger exists, and which
   service owns it. The `stock_reservations` table above is a proposal pending that ADR.
2. **"Logical FK, no cross-service enforcement" convention (section 2).** This is implied
   by the microservice split but not yet written down as a decision. Recommend an ADR (or
   an addition to ADR-0001) stating that cross-service references are logical, integrity
   is maintained by Saga/events, and enforced FKs are intra-service only.

(Per task scope, ADRs are flagged here, not authored.)
