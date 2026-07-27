# Frontend Architecture Design Spec

Design-only specification for the React 18 + Vite + TypeScript frontend. No React
components, hooks, `services/` modules, or any other frontend code are produced here — this
document is the input to that later work. It is the frontend sibling of the backend data
specs and follows the same structure and rigor: facts vs assumptions vs open questions,
per-module design tables, and ADR flags. When features are implemented, they follow the
CLAUDE.md rule "functional components + hooks only, no class components; API calls live under
`services/`, never inside components."

Related docs: [architecture.md](architecture.md), [postgre-schema.md](postgre-schema.md),
[mongodb-schema.md](mongodb-schema.md), [kafka-topics.md](kafka-topics.md),
[kafka-schemas/](kafka-schemas/), [adr/0001-saga-pattern-for-rollback.md](adr/0001-saga-pattern-for-rollback.md).

Scope: the browser application only. The frontend talks **exclusively to synchronous HTTP
endpoints** on four backend services (product-, order-, payment-, user-service). It never
consumes Kafka, and it never talks to notification-service (a Kafka consumer with no HTTP
surface). Async, Kafka-driven state must reach the browser indirectly through order-service's
REST state — how, is a real open question (OQ4, §4).

---

## 1. Facts, Assumptions, Open Questions

### Facts (grounded in CLAUDE.md, architecture.md, postgre-schema.md, mongodb-schema.md, kafka-topics.md)
- **Stack is fixed**: React 18 + Vite + TypeScript. Single entry point `frontend/src/main.tsx`
  (CLAUDE.md Project Context / Architecture Map).
- **Hard rule (CLAUDE.md Architecture Rules + architecture.md)**: functional components + hooks
  only, no class components. API calls live under `services/`, **never** inside components.
- **Exactly four features exist** (CLAUDE.md Architecture Map / architecture.md, verbatim
  one-liners):
  - `features/cart/` → cart, backed by Redis-backed endpoints.
  - `features/orders/` → order tracking.
  - `features/products/` → product listing/search.
  - `features/admin/` → inventory admin panel.
- **Callable backend surfaces** are the four services that expose HTTP: **product-service**
  (MongoDB — products/categories/catalog stock), **order-service** (PostgreSQL — order
  lifecycle/status), **payment-service** (payment simulation), **user-service** (PostgreSQL —
  JWT auth, accounts). **notification-service is Kafka-consumer only and has no HTTP surface
  the browser can call** — the frontend never references it.
- **The order flow is asynchronous end-to-end via Kafka**: order creation → stock check →
  payment → notification (CLAUDE.md, architecture.md). The browser cannot observe Kafka. Any
  state produced by that flow (has stock been reserved, has payment completed, was the order
  cancelled by Saga compensation) is only visible to the frontend as **order-service REST
  state** that the browser must re-read over time. The browser never subscribes to Kafka.
- **Order status is the async-flow projection** the UI renders. Per postgre-schema.md the
  `orders.status` lifecycle is (ASSUMPTION A6 there) `PENDING → STOCK_RESERVED /
  STOCK_REJECTED → PAID → CANCELLED`. The frontend treats this set as **read-only and
  server-owned**; it displays it but must not hardcode transitions the backend has not pinned
  (that set is still open — postgre-schema.md OQ2).
- **Auth model is stateless JWT** (postgre-schema.md §3.1: "JWT itself is stateless and not
  stored"). The `users` table defines `role ∈ {CUSTOMER, ADMIN}`; `ADMIN` is described there
  as "admin panel access". So `features/admin` gating is a `role`-based frontend concern
  backed by that claim.
- **The cart is backed by Redis-backed endpoints** (architecture.md), keyed server-side as
  `cart:{userId}` (CLAUDE.md Redis key format). The browser holds no authoritative cart
  state; it calls cart HTTP endpoints that front Redis.
- **Product identity is a string ≤ 64 chars**, immutable, shared verbatim across Mongo `_id`,
  Postgres `order_items.product_id`, Kafka `productId`, and the Redis cache key
  (mongodb-schema.md §3.1). The frontend must treat `productId` as an **opaque string**, never
  a number, and never mint or mutate it.
- **Money is fixed-precision** on the backend (`NUMERIC(12,2)` / `Decimal128`;
  postgre-schema.md A4, mongodb-schema.md A5). The frontend must not do float arithmetic on
  money; it displays server-computed `totalAmount`/`unitPrice`/`amount` and formats them.
- **Cross-service references are logical only** (postgre-schema.md §2, mongodb-schema.md §2).
  This is a backend fact but it has a frontend consequence: a single screen frequently needs
  data from more than one service (e.g. an order line's `productId` from order-service, its
  product name/image from product-service) and the frontend must **compose across services
  client-side** — there is no backend join to lean on.
- **No new dependencies without justification** (CLAUDE.md Architecture Rules). Every library
  named as an option below is flagged as a decision, not silently adopted.
- **Repo is greenfield on the frontend**: the Architecture Map names the folders but no
  components/services exist yet. This spec designs the target, it does not describe code.

### Assumptions (clearly marked — verify before implementing)
- **A1 — Server state and client (UI) state are managed separately.** ASSUMPTION: a
  dedicated **server-state/data-fetching cache** (e.g. TanStack Query, RTK Query, or SWR)
  owns everything fetched from the four backend services (products, cart, orders, payment
  status), while a much smaller **client-only UI state** store (component state / a light
  store) owns things the server never sees (modals, form drafts, filter selections). Rationale:
  the async Kafka flow means order/payment state must be **re-fetched/invalidated over time**,
  which a server-state cache handles natively (staleness, background refetch, retry). **No
  specific library is fixed** — see OQ1. This split is a genuine architectural call and is
  ADR-worthy (§4).
- **A2 — One `services/` module per backend service** (`services/productService.ts`,
  `orderService.ts`, `paymentService.ts`, `userService.ts`, plus `cartService.ts` if cart
  endpoints are hosted separately), rather than per-feature. Rationale: it mirrors the backend
  ownership boundary 1:1, keeps a single place per service for base URL / auth-header / error
  mapping, and prevents two features that both hit product-service from diverging. The tension
  (a feature sometimes wants a task-shaped call, not a service-shaped one) is real — see OQ7.
  Recommendation: service-shaped `services/` layer + optional thin feature-level "query"
  wrappers that call it. ADR-worthy (§4).
- **A3 — A single typed HTTP client wraps `fetch`/`axios`** and is the only place that (a)
  attaches the JWT, (b) sets base URLs per service, (c) normalizes error shapes. The
  per-service modules build on it. **Library (native `fetch` vs `axios`) not fixed** — flagged
  as a dependency decision (OQ1). No component imports the raw client.
- **A4 — Auth token kept in memory, refreshed/bootstrapped from a backend-set httpOnly
  cookie** is the *proposed* posture (see OQ2). Rationale: raw JWT in `localStorage` is XSS-
  exfiltratable; in-memory + httpOnly-cookie bootstrap is the safer default. This is **not
  settled** — the backend has not confirmed a cookie/refresh endpoint exists, so it is an
  assumption pending OQ2 and is ADR-worthy (§4).
- **A5 — `features/admin` is gated on the `role === 'ADMIN'` JWT claim**, enforced by a
  client-side route guard **for UX only**; real authorization is the backend's responsibility
  on every admin endpoint. The guard hides admin UI from non-admins but is never treated as a
  security boundary. Depends on where the token/claims live (A4/OQ2).
- **A6 — The UI reflects async order state by polling order-service** (interval or
  focus/refetch via the server-state cache) as the *default* mechanism, because it needs no
  new backend surface. Rationale: notification-service has no HTTP endpoint, and no websocket
  gateway exists. Polling order-service REST is the only mechanism buildable with today's
  backend. This is explicitly a **stopgap** and the real answer is unresolved — see OQ4; it is
  the strongest ADR candidate here (§4).
- **A7 — Optimistic cart UI with server reconciliation.** ASSUMPTION: cart mutations
  (add/update qty/remove) update the UI optimistically, then reconcile against the Redis-backed
  cart endpoint's authoritative response; on error the optimistic change is rolled back.
  Rationale: cart feels instant while the server (Redis) stays the source of truth. The
  alternative (server-confirmed only, no optimism) is simpler but laggier — see OQ5.
- **A8 — Shared `components/` is a presentational design-system-ish layer** (buttons, inputs,
  modal, table, money/price display, status badge, spinner/skeleton, error boundary fallback)
  with **no service imports and no business logic** — pure props in, UI out. This is the
  "keep business logic separate from UI glue" rule (CLAUDE.md) made concrete.
- **A9 — Shared `hooks/` holds cross-feature reusable hooks** (e.g. `useAuth`,
  `useDebouncedValue` for product search, `usePagination`, a generic `usePolling`/refetch
  helper backing A6). Feature-specific hooks live inside their feature folder, not here.
- **A10 — Routing exists and is code-based**, with at least: product list/search (public),
  product detail (public), cart (auth), checkout/order placement (auth), order tracking (auth),
  admin inventory (auth + ADMIN), login/register (public). **Routing library not fixed** — see
  OQ3.
- **A11 — Money/date formatting is centralized** (a shared formatter util + a `<Money>`/price
  display component, A8) so no feature reimplements currency/decimal rendering. Values arrive
  pre-computed from the backend (Fact: fixed-precision money); the frontend only formats.
- **A12 — Product search uses product-service's existing search** (backed by the Mongo text
  index defined in mongodb-schema.md §3.2). The frontend debounces input and calls
  product-service; it does **not** invent a new search endpoint or client-side full-text index.

### Open Questions (need answers before/at implementation)
- **OQ1 — State-management & data-fetching libraries.** Which server-state cache (TanStack
  Query / RTK Query / SWR / hand-rolled) and which client-state approach (Context + reducer /
  Zustand / Redux Toolkit)? And native `fetch` vs `axios` for A3? All are new dependencies
  requiring justification (CLAUDE.md). Drives A1/A3. **ADR-worthy (§4).**
- **OQ2 — JWT storage & session lifecycle.** In-memory only, `localStorage`, or httpOnly
  cookie + refresh? Does the backend expose a refresh/`/me` endpoint and set a cookie, or does
  it only return a bearer token? Determines A3/A4/A5 and how a page refresh survives (does the
  user get logged out on reload?). Unresolved and security-sensitive. **ADR-worthy (§4).**
- **OQ3 — Routing approach.** React Router vs the Vite/file-based options vs TanStack Router.
  Affects code layout, code-splitting, and the admin route guard (A5/A10). New dependency —
  needs justification.
- **OQ4 — How does the UI observe the async Kafka-driven order flow?** notification-service
  has no HTTP surface, and no websocket/SSE gateway exists. Options: (a) poll order-service
  REST for `orders.status` (A6, buildable today); (b) add a new websocket/SSE gateway service
  (does not exist — new backend surface, out of scope to invent here); (c) long-poll. This is
  **genuinely unresolved architecturally** and is the primary **ADR candidate (§4)**. This spec
  assumes (a) as a stopgap only and does not settle it.
- **OQ5 — Cart sync strategy: optimistic vs server-confirmed** (A7). Also: is the cart tied to
  an authenticated `userId` only (Redis `cart:{userId}`), or is there a guest/anonymous cart?
  The Redis key is per-user, which suggests auth-required carts — confirm whether guest carts
  are in scope.
- **OQ6 — Admin form handling** for inventory/product edits (product-service catalog +
  `stock`). Which form approach (React Hook Form / Formik / native controlled) and validation
  strategy (client-side mirroring Mongo `$jsonSchema` from mongodb-schema.md §3.2 vs
  server-only)? New dependency question. Note: catalog `stock` here is the display counter,
  **not** the transactional reservation ledger (mongodb-schema.md A4) — the admin panel edits
  the catalog field, and must not present itself as editing reservations.
- **OQ7 — `services/` granularity edge cases.** With one module per backend service (A2), where
  do **cross-service composed reads** live (e.g. "order + its product names/images" joining
  order-service and product-service, since there is no backend join)? Proposal: composition
  happens in a feature-level query hook that calls two service modules, not inside a service
  module (services stay 1:1 with one backend). Confirm this boundary.
- **OQ8 — Payment interaction shape.** Does the browser call payment-service directly to
  initiate/confirm the simulated payment, or does it only observe payment outcome via
  order-service status (since payment completion arrives via Kafka)? The four callable
  services include payment-service, but the flow is async — clarify the exact HTTP touchpoint
  vs what is observed through order-service. Ties to OQ4.
- **OQ9 — Error, empty, and loading state conventions.** Standard skeleton/spinner, empty-state,
  and error-boundary patterns are assumed shared (A8) but the exact UX contract (retry,
  toast vs inline) is unspecified. Minor, but pin before implementation for consistency.

---

## 2. The `services/` layer & API-call convention

This section makes the cross-cutting CLAUDE.md rule — *"API calls live under `services/`,
never inside components"* — concrete, because it is the single most load-bearing frontend
convention in this repo.

**What `services/` is.** `services/` is the **only** place in the codebase that performs HTTP.
Components, and even most hooks, never touch `fetch`/`axios` directly. A component that needs
data calls a hook; the hook calls a `services/` function; the `services/` function calls the
shared HTTP client (A3). This keeps business/data-access logic out of UI glue (CLAUDE.md
Architecture Rules: "keep business logic separate from UI/framework glue"; "prefer small
public interfaces and deep modules" — each service module is a deep module with a small typed
surface).

**Organization (A2): one module per backend service, mirroring backend ownership.**

| `services/` module | Backend service | Owns (frontend-visible surface) | Consumed by |
|---|---|---|---|
| `productService` | product-service (Mongo) | product list/search, product detail, categories, catalog `stock` reads; admin catalog/stock writes | features/products, features/admin |
| `cartService` | cart endpoints (Redis-backed) | get cart, add/update/remove line, clear | features/cart |
| `orderService` | order-service (Postgres) | place order, get order, list my orders, **read `orders.status`** (the async-flow projection) | features/orders, features/cart (checkout) |
| `paymentService` | payment-service | initiate/observe simulated payment (exact shape — OQ8) | features/orders (checkout), possibly features/cart |
| `userService` | user-service (JWT) | login, register, current-user/`role` claim | shared `useAuth` hook, route guards |

- **No `notificationService` module exists** — notification-service has no HTTP surface (Fact).
  The absence is intentional and must not be "fixed" by inventing endpoints.
- **Each module exposes typed request/response DTO types** that mirror the backend contracts
  (order/payment shapes are constrained by the Kafka schemas via postgre-schema.md; product
  shape by mongodb-schema.md). Frontend DTO types are kept **separate from any UI/view model**,
  matching the backend's "DTOs kept separate from entities" discipline.
- **One client, one place for auth + errors (A3).** Base URL per service, JWT attachment, and
  error normalization live in the shared client the modules build on — not duplicated per
  module and never in a component.
- **Cross-service composition does NOT live in a service module (OQ7).** Because backend
  references are logical-only (no joins), a screen that needs data from two services (e.g. an
  order's lines from order-service + product names/images from product-service) composes them
  in a **feature-level query hook** that calls both `services/` modules. Service modules stay
  1:1 with a single backend so they remain trivially testable and cache-keyable. This boundary
  is flagged (OQ7) because it is the one place the "per-service" rule needs a documented escape
  hatch.
- **Async-flow reads go through `orderService`, never Kafka.** The only way the browser learns
  that stock was reserved/rejected or payment completed/failed is by reading `orders.status`
  (and related fields) from order-service over HTTP and re-reading over time (A6/OQ4). The
  `services/` layer is where that read lives; the *when/how-often* (poll/refetch) is a hook
  concern (§3.7), and the *right long-term mechanism* is OQ4.

---

## 3. Module & Shared-Concern Designs

Each subsection gives: **owns**, **backend service(s) talked to**, **state managed**, **key
user flows**, and **notable decisions/risks** — the frontend analogue of the per-table/
per-collection rigor in the sibling specs.

### 3.1 `features/products` — product listing & search
- **Owns**: storefront product **list**, **search**, filtering (by category), and product
  **detail** view. Public (no auth required to browse).
- **Backend**: **product-service** only (`productService`). Search hits product-service's
  Mongo text-index-backed endpoint (mongodb-schema.md §3.2 index `{name:"text",
  description:"text"}`). Category filter uses the `{categoryId, status}` index. Reviews (Mongo
  `product_reviews`) surface here on the detail view if in scope.
- **State managed**: server-state — product pages/results, product detail, categories (cached,
  A1). Client-state — current search text (debounced, A12), active filters, pagination cursor.
  Product `_id`/`productId` treated as an **opaque string** (Fact).
- **Key user flows**: browse list → filter by category / type in search (debounced) → open
  product detail → "add to cart" (hands off `productId` + quantity to `features/cart`).
- **Notable**: catalog `stock` shown here is the **display/available counter**
  (mongodb-schema.md A4), not a live reservation guarantee — availability shown at browse time
  can be stale (Redis-cached, `product:cache:{productId}`), and the real reserve/reject
  decision happens asynchronously after order placement (OQ4). The UI must not promise "in
  stock" as a firm commitment. Money fields are display-only, pre-formatted (A11).

### 3.2 `features/cart` — cart
- **Owns**: the cart view and cart mutations; kickoff of checkout/order placement.
- **Backend**: **cartService** (Redis-backed cart endpoints) for cart CRUD; **orderService**
  to place the order at checkout; possibly **paymentService** depending on OQ8.
- **State managed**: the cart is **server-authoritative in Redis** (`cart:{userId}`); the
  frontend holds no authoritative cart. Server-state cache mirrors it; client-state holds only
  transient optimistic deltas (A7).
- **Key user flows**: view cart → change quantity / remove line (optimistic, reconciled — A7)
  → checkout → `orderService` creates the order (status starts `PENDING`) → hand off to
  order-tracking (§3.3) to observe the async flow.
- **Notable**: cart is (assumed) per authenticated user because the Redis key is per-`userId`
  (OQ5 — guest cart unresolved). Checkout is the boundary where the **synchronous** world
  (cart in Redis) meets the **asynchronous** world (order Saga over Kafka): after
  `orderService` returns an order id, the cart UI cannot know payment/stock outcome
  synchronously and must defer to order tracking (A6/OQ4). Optimistic-vs-confirmed is OQ5.

### 3.3 `features/orders` — order tracking
- **Owns**: "my orders" list and a single order's detail/status timeline. This is the
  **primary surface for the async Kafka-driven flow** as seen by the user.
- **Backend**: **orderService** (Postgres order lifecycle/status) primarily; **product-service**
  for product names/images on order lines (cross-service composition — OQ7, done in a
  feature-level hook, not in a service module); **paymentService** only per OQ8.
- **State managed**: server-state — order list, order detail, `orders.status`. This state is
  **re-fetched over time** (A6) because it changes asynchronously as Kafka events flow
  (`STOCK_RESERVED`/`STOCK_REJECTED` → `PAID` → `CANCELLED`). Client-state — expanded/selected
  order UI only.
- **Key user flows**: open "my orders" → open an order → watch status advance
  (`PENDING → ... → PAID`, or `CANCELLED` via Saga compensation) as the frontend re-reads
  order-service. Terminal states (`PAID`, `CANCELLED`) stop the re-fetch.
- **Notable**: status set/transitions are **server-owned and still open** (postgre-schema.md
  A6/OQ2) — the UI must render whatever status the backend returns and **not hardcode** a
  transition graph the backend has not finalized. Notifications themselves (from
  notification-service) are **not** reachable by the browser (Fact); the user's only in-app
  signal of progress is order-service status. **How** that status is observed (poll/SSE/ws) is
  OQ4 — the biggest ADR candidate.

### 3.4 `features/admin` — inventory admin panel
- **Owns**: admin catalog & inventory management — create/edit products, adjust catalog
  `stock`, manage categories. Restricted to `ADMIN` users.
- **Backend**: **product-service** (`productService`) for catalog/stock writes and admin
  listings (Mongo `{status, updatedAt}` index, mongodb-schema.md §3.2). May read order-service
  for ops/fulfilment views if in scope (confirm).
- **State managed**: server-state — admin product/category lists and the edited entity;
  client-state — form draft/dirty state (form approach unresolved — OQ6). Route access gated on
  `role === 'ADMIN'` (A5).
- **Key user flows**: admin logs in → guard checks `ADMIN` claim → lists/searches catalog →
  creates/edits a product or adjusts stock → saves via `productService`.
- **Notable**: the panel edits the **catalog `stock` display counter** (mongodb-schema.md A4),
  **not** the transactional reservation ledger (which is the Postgres-side concern,
  postgre-schema.md A1/OQ1) — the UI must not present stock edits as editing reservations, and
  the ADR on inventory placement (postgre-schema.md §4 item 1) directly affects what this panel
  is allowed to change. Client-side gating is **UX only**; every admin write is authorized
  server-side regardless (A5).

### 3.5 Shared `components/` — presentational design system
- **Owns**: reusable, **presentational-only** UI: button, input/select, modal/dialog, data
  table, `<Money>`/price display (A11), status badge (renders order/payment status), spinner &
  skeleton, empty-state, error-boundary fallback, toast/notification-UI (in-app UI toast — not
  related to notification-service). 
- **Backend**: **none** — components here **never import `services/`** and hold no business
  logic (A8). Props in, UI out.
- **State managed**: local presentational state only (e.g. modal open). No server-state, no
  domain state.
- **Notable**: this is the concrete enforcement of "keep business logic separate from UI glue"
  (CLAUDE.md). A component in `components/` must be usable by any feature without dragging in a
  data dependency. Formatting (money/date) is centralized here (A11) so features don't
  reimplement currency/decimal rendering of the fixed-precision values from the backend.

### 3.6 Shared `services/` — the HTTP/data-access layer
- **Owns**: all HTTP to the four backend services; DTO types mirroring backend contracts; the
  single shared client (auth header + base URLs + error normalization). Fully specified in §2.
- **Backend**: product-, order-, payment-, user-service (+ cart endpoints). **No
  notification-service** (Fact).
- **State managed**: **none of its own** — `services/` returns data; caching/staleness live in
  the server-state layer (A1) and hooks (§3.7). Keeping `services/` stateless keeps it a deep,
  testable module with a small surface.
- **Notable**: 1:1 with backend ownership (A2); cross-service composition is pushed up to
  feature hooks (OQ7). This layer is where the "never call APIs from components" rule is
  physically enforced.

### 3.7 Shared `hooks/` — cross-feature hooks
- **Owns**: reusable hooks used by more than one feature: `useAuth` (current user + `role`
  claim, backing the admin guard — A5), `useDebouncedValue` (product search — A12),
  `usePagination`, and the **refetch/`usePolling` helper** that backs async order-state
  observation (A6). Feature-specific hooks stay inside their feature folder, not here.
- **Backend**: indirectly, via `services/` (hooks call services, never HTTP directly).
- **State managed**: bridges server-state cache (A1) and components; owns subscription/refetch
  timing (e.g. poll interval, refetch-on-focus) for the async order flow.
- **Notable**: the polling/refetch hook is a **stopgap around OQ4** — its very existence is the
  symptom of the unresolved async-observation question. It is isolated here so that if OQ4 later
  resolves to SSE/websockets, only this hook (and a service touchpoint) change, not every
  order screen. Small public interface, deep module (CLAUDE.md).

### 3.8 App shell, routing & global providers (`main.tsx` + app-level setup)
- **Owns**: the application bootstrap at `frontend/src/main.tsx` — mounting React, wiring
  **global providers** (server-state cache provider (A1/OQ1), auth/session provider (A4/OQ2),
  router (A10/OQ3), error boundary, theme/toaster), and top-level **route configuration** with
  code-splitting per feature.
- **Backend**: none directly; it wires the providers that everything else uses.
- **State managed**: global/root providers only — no feature domain logic lives in the shell.
- **Key routes (A10)**: products list/search & product detail (public); cart & checkout (auth);
  order tracking (auth); admin inventory (auth + `ADMIN` guard — A5); login/register (public).
- **Notable**: the **admin route guard** (A5) and the **auth bootstrap on load** both hinge on
  OQ2 (where the token lives / whether a page refresh keeps the session). Routing library is
  unresolved (OQ3). The shell is deliberately thin: providers + routes, no business logic
  (CLAUDE.md "separate business logic from framework glue").

---

## 4. Items that likely need an ADR

1. **Async order-flow observation in the browser (OQ4 / A6) — highest priority.** Because
   notification-service has no HTTP surface and no websocket/SSE gateway exists, the frontend
   currently can only **poll order-service REST** to watch stock/payment outcomes propagate.
   Whether to (a) keep polling, (b) introduce a new SSE/websocket gateway service (a **new
   backend surface**, not to be invented in this spec), or (c) long-poll, is a genuine
   architectural decision spanning frontend and backend. Recommend an ADR; §3.3/§3.7 assume
   polling as an explicit stopgap only.
2. **State-management & data-fetching stack (OQ1 / A1, A3).** The server-state-vs-client-state
   split and the specific libraries (TanStack Query/RTK Query/SWR; Context/Zustand/Redux;
   `fetch` vs `axios`) are new dependencies requiring justification (CLAUDE.md) and shape the
   whole app. Recommend an ADR rather than adopting libraries ad hoc.
3. **JWT storage & session lifecycle (OQ2 / A4, A5).** In-memory vs `localStorage` vs
   httpOnly-cookie+refresh is a security-sensitive decision that also determines whether a page
   reload keeps the user logged in and how the admin guard reads the `role` claim. Recommend an
   ADR; the proposed in-memory + cookie posture (A4) is a recommendation, not a settled call.
4. **`services/` granularity & cross-service composition boundary (OQ7 / A2).** One module per
   backend service (proposed) plus where **client-side cross-service joins** live (feature hooks,
   not service modules) — because backend references are logical-only with no joins
   (postgre-schema.md §2). Contestable enough to record.
5. **Inventory/admin editing scope — dependent on the backend inventory ADR.** The admin panel
   (§3.4) edits the Mongo catalog `stock` display counter, **not** the Postgres reservation
   ledger. What the panel is actually allowed to change depends on the still-open inventory-
   placement decision already flagged in **postgre-schema.md §4 item 1** and **mongodb-schema.md
   §4 item 2**. This is not a new ADR — it is a **frontend consequence** of that existing one and
   should be resolved together with it.

(Per the pattern of the sibling specs, ADRs are flagged here, not authored, and contestable
calls are marked as recommendations rather than resolved unilaterally.)
