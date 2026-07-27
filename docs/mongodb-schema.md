# MongoDB Database Design Spec (product-service)

Design-only specification for the MongoDB collections owned by **product-service**. No
`@Document` classes, Spring Data repositories, or Mongo init/migration scripts are produced
here — this document is the input to that later work. It is the MongoDB sibling of the
PostgreSQL spec in [db-schema.md](db-schema.md) and follows the same structure and rigor.

Related docs: [architecture.md](architecture.md), [db-schema.md](db-schema.md),
[kafka-topics.md](kafka-topics.md), [kafka-schemas/](kafka-schemas/),
[adr/0001-saga-pattern-for-rollback.md](adr/0001-saga-pattern-for-rollback.md).

Scope: catalog-side data only — `products` (incl. categories) and `product_reviews`. The
transactional stock **reservation ledger** is deliberately **out of scope** here; it is
handled (as a proposal pending an ADR) by the Postgres `stock_reservations` table in
[db-schema.md](db-schema.md) §3.2. This spec covers only the catalog-level `stock` field
(available-to-sell quantity as shown/cached), not reservations.

---

## 1. Facts, Assumptions, Open Questions

### Facts (grounded in CLAUDE.md, architecture.md, kafka schemas, db-schema.md)
- **product-service owns MongoDB** and is the authoritative store for products,
  categories, and catalog stock levels (architecture.md, CLAUDE.md Architecture Map).
- CLAUDE.md Database Rules: MongoDB is **only** for flexible-schema data (product details,
  reviews) and must **never** hold transactional/financial data. Financial/transactional
  integrity (orders, payments, stock reservation ledger) lives in PostgreSQL.
- The `document` package (`com.ecommerce.product.document`) confirms Spring Data MongoDB
  `@Document`-mapped classes are the intended mapping style. Repo is greenfield: only empty
  `package-info.java` stubs exist (`controller`, `document`, `dto`, `messaging`,
  `repository`, `service`). No existing schema.
- **Cross-service references are logical only** (established convention, db-schema.md §2):
  no enforced join spans services. A `product_reviews.userId` is a logical reference to
  user-service Postgres `users.id`; a Postgres `order_items.product_id` is a logical
  reference to a product document `_id` here.
- **ID shape is fixed by the Postgres boundary.** db-schema.md types
  `order_items.product_id` as `VARCHAR(64)` and describes product-service `_id` as *a
  string*. The Kafka `order.created` schema types `items[].productId` as a plain JSON
  `string` (no `format` constraint). The Redis cache key `product:cache:{productId}` also
  keys on that same string. Therefore a product's `_id` **must be a string of ≤ 64 chars**.
- **`unitPrice` in `order.created` is a snapshot**, captured by order-service at order time,
  not read live from Mongo when the event is emitted (db-schema.md `order_items` design).
  The catalog price field here is the *source* order-service reads at add-to-cart /
  order-placement time, but the event carries a copy.
- Redis `product:cache:{productId}` is an existing, TTL-bound read cache of product data
  keyed by the product `_id` string — a **consumer** of the ID shape chosen here, not
  redesigned by this spec.

### Assumptions (clearly marked — verify before implementing)
- **A1 — String `_id` chosen deliberately.** Product `_id` is a `string` (BSON `string`),
  not an auto-generated `ObjectId`. Rationale: it must round-trip through Postgres
  `VARCHAR(64)`, the Kafka `productId` string, and the Redis key without lossy conversion,
  and be human-referenceable (e.g. a SKU/slug). An `ObjectId` hex string (24 chars) would
  also fit in `VARCHAR(64)`, so this is a preference, not forced — see **OQ1**.
- **A2 — Categories get their own collection, referenced (not embedded) from products,**
  with a small denormalized category label cached on the product for display/filtering.
  Justification in §3.3. This is a genuine embed-vs-reference call and is flagged
  **ADR-worthy** (§4), not treated as settled.
- **A3 — Reviews are a separate collection, referencing productId** (not embedded in the
  product document). Rationale: reviews are unbounded and write-heavy; embedding them would
  grow the product document without bound (the classic Mongo unbounded-array antipattern)
  and contend with catalog reads. See §3.4.
- **A4 — Catalog `stock` is a display/available-to-sell counter, not the reservation
  ledger.** It reflects "quantity currently shown as available" and is what Redis caches.
  It is **not** the transactional record of "N units reserved for order X" — that is the
  Postgres-side concern (db-schema.md A1/OQ1). How the two stay consistent is **OQ2**.
- **A5 — Money as a fixed-precision type.** `price` is stored as BSON `decimal` (`Decimal128`)
  to avoid binary floating-point rounding, mirroring the Postgres `NUMERIC(12,2)` choice
  (db-schema.md A4). The Kafka schema types `unitPrice` as JSON `number`; the mapping layer
  narrows it to decimal.
- **A6 — Schema validation via Mongo `$jsonSchema` validator** on each collection (enforced
  at the database), **plus** application-level (bean/DTO) validation. Rationale below (§2).
- **A7 — Timestamps stored as BSON `date` (UTC).** `createdAt` / `updatedAt` on documents.

### Open Questions (need answers before/at implementation)
- **OQ1 — Product `_id` scheme.** Is `_id` a business key (SKU/slug, stable, human-readable,
  editable-risk) or a surrogate (`ObjectId`-as-string / UUID string, opaque, stable)?
  Affects whether `_id` can ever change (it must not, since Postgres/Kafka/Redis copy it)
  and whether a separate `sku`/`slug` field is also needed. See A1.
- **OQ2 — Catalog stock vs reservation ledger reconciliation.** Given db-schema.md's
  proposed Postgres `stock_reservations` ledger (its A1/OQ1), how is the Mongo catalog
  `stock` field updated — decremented on `stock.reserved`, restored on the compensating
  `stock.released`, or recomputed from the ledger? This is the **boundary** between the two
  stores and is **ADR-worthy** (§4). This spec does **not** resolve it; it only defines the
  catalog field.
- **OQ3 — Producer/consumer role of product-service for the TODO `stock.reserved` /
  `stock.rejected` topics** (still a TODO in kafka-topics.md). Whether product-service
  *produces* those (it decides availability from catalog stock) or *consumes* them (Postgres
  ledger decides) is tied to OQ2 and to db-schema.md OQ1. Flagged, not resolved here.
- **OQ4 — Category hierarchy depth.** Are categories flat, or a tree (parentId /
  materialized path)? Affects the `categories` shape (§3.3). Assumed shallow/optional-parent
  below to avoid over-design.
- **OQ5 — Soft delete / catalog visibility.** Is a product ever hard-deleted, or only
  marked inactive (kept so historical `order_items.product_id` references still resolve)?
  A `status`/`active` field is included below as the safer default; confirm.

---

## 2. Schema validation & cross-service reference approach

**Validation.** Each collection declares a Mongo `$jsonSchema` validator (`validationLevel:
strict`, `validationAction: error`) covering required fields, BSON types, and enum-like
constraints. This gives a database-level guarantee independent of any single service
instance. Application-level (DTO/bean) validation still runs first for fast feedback and
richer messages. Rationale: Mongo's flexible schema is desirable for *product detail
attributes* (the genuinely variable part), but the *structural* fields (`_id`, `price`,
`stock`, `status`, `categoryId`) benefit from an enforced contract — the validator pins
those while leaving an open `attributes` sub-document unconstrained.

**Cross-service references (same rule as db-schema.md §2).** No reference here is an
enforced join. `product_reviews.userId` → user-service `users.id` and
`product_reviews.productId` → local `products._id` are logical references. Integrity is
maintained by application logic and events, never by the database. (Mongo does not enforce
cross-collection FKs regardless; this restates the system-wide convention.)

---

## 3. Collection Designs

### 3.1 ID shape alignment (applies to all collections)

The product identifier is one string used verbatim in four places:

| Where | Type | Source |
|---|---|---|
| `products._id` (this spec) | BSON `string`, ≤ 64 chars | authoritative |
| Postgres `order_items.product_id` | `VARCHAR(64)` | copy (logical ref) |
| Kafka `order.created.items[].productId` | JSON `string` | copy (snapshot) |
| Redis key `product:cache:{productId}` | key substring | copy (cache) |

Constraint: `_id` is immutable once assigned and always fits `VARCHAR(64)`. This is the
single most important cross-boundary invariant in this spec.

---

### 3.2 `products` — owning service: product-service

Catalog document. The variable-by-design part (specs that differ per product category —
e.g. RAM for a laptop, size for a shirt) lives in an open `attributes` sub-document; the
structural part is validated.

| Field | BSON type | Req? | Default | Notes |
|---|---|---|---|---|
| `_id` | string | required | — | Product id, ≤ 64 chars, immutable. Aligns with §3.1. See A1/OQ1. |
| `name` | string | required | — | Display name. Text-indexed. |
| `description` | string | optional | — | Long text. Text-indexed. |
| `price` | decimal (`Decimal128`) | required | — | Catalog price. **Source** of `order.created.items[].unitPrice` (which is a snapshot copy — A5, db-schema.md `order_items`). |
| `currency` | string | required | `"USD"` | ISO-4217. Enum-like, see below. |
| `categoryId` | string | optional | — | Logical ref to `categories._id` (§3.3). Nullable if uncategorised. |
| `categoryName` | string | optional | — | **Denormalized** label for display/filtering without a join (A2). Refreshed when the category is renamed. |
| `stock` | int (`int32`) | required | `0` | Catalog available-to-sell quantity (A4). Cached by Redis `product:cache:{productId}`. **Not** the reservation ledger — see OQ2. |
| `status` | string | required | `"ACTIVE"` | Enum-like, see below. Supports soft-hide (OQ5). |
| `attributes` | object | optional | `{}` | **Flexible sub-document** — arbitrary per-product specs. Intentionally left unconstrained by the validator (this is *why* the catalog is on Mongo). |
| `images` | array<string> | optional | `[]` | Image URLs/keys. |
| `createdAt` | date | required | now | UTC (A7). |
| `updatedAt` | date | required | now | UTC (A7). Bumped on any change. |

- **`_id`**: string (§3.1).
- **Enum-like `status`** ∈ {`ACTIVE`, `INACTIVE`, `DISCONTINUED`}. `INACTIVE`/`DISCONTINUED`
  hide from the storefront while keeping the document so historical order lines still
  resolve (OQ5).
- **Enum-like `currency`**: ISO-4217 codes; default `USD`. Constrain to the supported set at
  the app layer (list TBD, not a schema concern).
- **Indexes**:
  - `_id` — implicit unique (product lookup; also backs Redis cache miss reload).
  - `{ categoryId: 1, status: 1 }` — compound; category-filtered storefront listings
    restricted to visible products (features/products).
  - `{ name: "text", description: "text" }` — text index for search (features/products
    search box).
  - `{ status: 1, updatedAt: -1 }` — admin panel recent-changes / paginated catalog
    (features/admin).
  - (optional) `{ price: 1 }` — if price-range filtering/sorting is exposed.
- **Validation**: `$jsonSchema` pins `_id, name, price, currency, stock, status, createdAt,
  updatedAt` types + `status`/`currency` enums; `attributes` left open (§2).
- **Kafka-driven fields**: `price` sources `order.created.items[].unitPrice` (snapshot copy,
  not live-read — A5); `_id` sources `items[].productId` (§3.1). `stock` relates to the
  future `stock.reserved`/`stock.rejected` flow via OQ2/OQ3.

---

### 3.3 `categories` — owning service: product-service

**Decision (A2): separate collection, referenced from products** (via `categoryId`), with a
denormalized `categoryName` cached on each product.

**Why reference, not embed the full category into every product:** a category is a shared
entity referenced by many products; embedding the whole category object into each product
would duplicate it N times and make a rename an N-document update. **Why also denormalize
just the name onto the product:** the storefront needs to show/filter by category name
without a second round-trip, and the label is small and rarely changes. This "reference +
denormalized label" split is the close-call part and is **ADR-worthy** (§4) — the contest is
whether the denormalized `categoryName` is worth the rename-fan-out cost versus a lookup.

| Field | BSON type | Req? | Default | Notes |
|---|---|---|---|---|
| `_id` | string | required | — | Category id/slug, ≤ 64 chars, immutable. |
| `name` | string | required | — | Display name; the value denormalized into `products.categoryName`. |
| `slug` | string | optional | — | URL-friendly key (if `_id` is not itself the slug — see OQ1). |
| `parentId` | string | optional | — | Logical self-ref for a category tree (OQ4). Null/absent = top level. |
| `createdAt` | date | required | now | UTC. |
| `updatedAt` | date | required | now | UTC. |

- **Indexes**: unique `_id`; unique `slug` (if used); `{ parentId: 1 }` for subtree listing
  (only if OQ4 resolves to a tree).
- **Enum-like**: none.
- **Validation**: `$jsonSchema` pins `_id, name, createdAt, updatedAt`.
- **Consistency note**: renaming a category requires updating `products.categoryName` for
  matching products (a fan-out write). This maintenance cost is the crux of the ADR in §4.

---

### 3.4 `product_reviews` — owning service: product-service

**Decision (A3): separate collection referencing `productId`,** not embedded in the product.
Reviews are unbounded and write-heavy; embedding would grow the product document without
bound and couple review writes to catalog reads.

| Field | BSON type | Req? | Default | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | required | auto | Surrogate review id (opaque; not cross-referenced by other services, so no string constraint needed). |
| `productId` | string | required | — | Logical ref to `products._id` (§3.1). Indexed. |
| `userId` | string | required | — | **Logical** ref to user-service Postgres `users.id` (a UUID string). No enforced join (§2). |
| `rating` | int (`int32`) | required | — | Enum-like range 1–5 (validator: `minimum:1, maximum:5`). |
| `title` | string | optional | — | |
| `body` | string | optional | — | Review text. |
| `status` | string | required | `"PUBLISHED"` | Enum-like: moderation state, see below. |
| `createdAt` | date | required | now | UTC. |
| `updatedAt` | date | required | now | UTC. |

- **`_id`**: `ObjectId` (surrogate is fine here — unlike products, review ids are never
  copied into Postgres/Kafka/Redis, so the §3.1 string constraint does not apply).
- **Enum-like `rating`** ∈ {1,2,3,4,5}. **Enum-like `status`** ∈ {`PUBLISHED`, `PENDING`,
  `HIDDEN`} (moderation).
- **Indexes**:
  - `{ productId: 1, createdAt: -1 }` — compound; a product's reviews newest-first
    (primary access pattern on a product detail page).
  - `{ userId: 1 }` — a user's own reviews.
  - (optional) unique `{ productId: 1, userId: 1 }` — if the rule is one review per user per
    product; confirm before enforcing.
- **Validation**: `$jsonSchema` pins `productId, userId, rating (1–5), status` enum,
  timestamps; `title`/`body` free-form.
- **Cross-service note**: `userId` resolves against user-service; product-service does not
  and cannot enforce it (§2).

---

## 4. Items that likely need an ADR

1. **Categories: embed vs reference + denormalization (A2, §3.3).** A core MongoDB modeling
   decision with no SQL analogue: whether to (a) reference `categoryId` only and always look
   up the name, (b) reference + denormalize `categoryName` (proposed), or (c) embed the full
   category. The trade-off (read simplicity/filter speed vs rename fan-out) is genuinely
   contestable — recommend an ADR rather than settling it here.
2. **Catalog `stock` (Mongo) vs reservation ledger (Postgres) boundary (A4, OQ2/OQ3).** The
   division between the display/available counter here and the transactional
   `stock_reservations` ledger proposed in db-schema.md (its A1/OQ1), and which store the
   future `stock.reserved`/`stock.rejected` topics are keyed to, is an architectural
   decision spanning both specs. It should be resolved in the **same ADR** that db-schema.md
   §4 item 1 already calls for (inventory placement) — this spec adds the Mongo-side view of
   that same question, it does not open a competing one.
3. **Product `_id` scheme — business key vs surrogate (A1, OQ1).** Because the id is copied
   into Postgres, Kafka, and Redis and must be immutable, the choice of SKU/slug vs
   opaque surrogate is a decision worth recording.

(Per task scope, ADRs are flagged here, not authored, and contestable calls are marked as
recommendations rather than resolved unilaterally.)
