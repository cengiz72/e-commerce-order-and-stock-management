# Phase 5 — Orders Feature

## Goal

Build `features/orders`: the "my orders" list and order detail/status timeline. This is the
primary surface for the async, Kafka-driven order flow as seen by the user, and the phase that
finally answers how the browser observes state it cannot subscribe to directly.

## Depends on

Phase 2 (`orderService`, `paymentService`, `productService` for composition), Phase 4 (checkout
hands off here with a freshly created order id).

## Backend surfaces touched

order-service (Postgres order lifecycle/status) primarily; product-service for product
names/images on order lines (cross-service composition, done in a feature-level hook per the
Phase 2 boundary, not inside a service module); payment-service only per the OQ8 resolution
below.

## Scope

Per frontend-architecture.md §3.3:

- "My orders" list and single-order detail/status timeline.
- **Async-flow observation (A6)**: re-fetch `orders.status` over time as Kafka events propagate
  (`PENDING → STOCK_RESERVED/STOCK_REJECTED → PAID → CANCELLED`, per
  `docs/postgre-schema.md` A6). Build the shared `usePolling`/refetch hook (A9, §3.7) here since
  this is its first and primary consumer; stop re-fetching on terminal states (`PAID`,
  `CANCELLED`).
- Render whatever status order-service returns **without hardcoding the transition graph** — the
  status set/transitions are server-owned and still open (`docs/postgre-schema.md` OQ2).
  Rendering must degrade gracefully to an unrecognized status rather than assume a fixed enum.
- Cross-service composition: order lines' `productId` (order-service) joined client-side with
  product name/image (product-service) via a feature-level hook, per the OQ7 boundary from
  Phase 2.
- No direct display of notification-service content — it's unreachable from the browser (Fact).
  The only in-app progress signal is order-service status.

## Open questions to resolve in/before this phase

- **OQ4 — How the UI observes the async Kafka-driven flow.** This is the primary ADR candidate
  in the whole spec (§4 item 1). Ship this phase against the **polling stopgap** (A6) as
  explicitly documented — do not block the phase on the ADR landing, but track it: if the ADR
  later picks SSE/websockets, only the `usePolling` hook and its service touchpoint change, not
  every order screen (that isolation is why the hook exists as a separate module).
- **OQ8 — Payment interaction shape.** Decide here whether the browser calls `paymentService`
  directly to initiate/confirm payment, or only observes payment outcome via order-service status
  (since completion arrives via Kafka `payment.completed`, per `docs/kafka-topics.md`). This
  phase cannot finish order tracking's payment-status display without this answer.

## Out of scope

- Building a new websocket/SSE gateway service — that's a backend surface change, out of scope
  for a frontend phase; if OQ4's ADR calls for it, it becomes its own cross-team phase.
- Admin-side order/fulfilment views (not in this feature's scope per the spec; confirm with
  Phase 6 if that need surfaces).

## Exit criteria

- Order list and detail render live order-service data; status updates visibly as the backend
  Saga progresses (verified against a real or seeded order moving through
  `PENDING → STOCK_RESERVED → PAID`, and separately a rejected/cancelled path).
- Polling stops on terminal states; no runaway intervals on unmount (cleanup verified).
- Order line product names/images render via the composed product-service lookup.
- `npm run typecheck`, `npm run lint`, `npm run test` pass for `features/orders`, `hooks/`, and
  touched `services/` code.
