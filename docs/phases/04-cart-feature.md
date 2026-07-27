# Phase 4 — Cart Feature

## Goal

Build `features/cart`: the cart view, cart mutations, and the checkout handoff that creates an
order. The cart is server-authoritative in Redis (`cart:{userId}`) — the frontend never treats
its own state as the source of truth.

## Depends on

Phase 2 (`cartService`, `orderService`), Phase 3 (product data feeding "add to cart" from product
list/detail).

## Backend surfaces touched

Cart HTTP endpoints (Redis-backed, key `cart:{userId}`) via `cartService`; `orderService` to
place the order at checkout; `paymentService` only if OQ8 resolves to a direct browser-initiated
payment call (see Phase 5, where OQ8 is finalized — this phase does not depend on that answer to
ship checkout, since order placement itself doesn't require it).

## Scope

Per frontend-architecture.md §3.2:

- Cart view: list of lines, quantity change, remove line, clear cart.
- **Optimistic UI with server reconciliation (A7)**: mutations update the UI immediately, then
  reconcile against the Redis-backed cart endpoint's authoritative response; roll back on error.
- Checkout action: calls `orderService` to create the order (status starts `PENDING`), then hands
  off to `features/orders` (Phase 5) for status tracking — this feature does not itself poll for
  order outcome.
- Route: authenticated only (per Phase 1's route table).

## Open questions to resolve in/before this phase

- **OQ5 — Cart sync strategy & guest cart** (frontend-architecture.md). Confirm optimistic
  (A7, assumed default) vs server-confirmed-only cart updates, and confirm whether the cart is
  strictly per authenticated `userId` (the Redis key shape suggests yes) or whether a
  guest/anonymous cart is in scope. If guest carts are in scope, this phase's scope grows
  (anonymous cart identity, merge-on-login) — resolve before starting, don't discover mid-phase.

## Out of scope

- Any polling/refetch of order status after checkout — that's Phase 5's job. This phase's
  responsibility ends when `orderService` returns an order id.
- Direct payment-service calls unless OQ8 (Phase 5) says the browser initiates payment
  synchronously at checkout; default assumption is payment outcome is observed asynchronously.

## Exit criteria

- Cart CRUD works against the Redis-backed endpoints with optimistic updates and correct
  rollback on server error.
- Checkout creates an order via `orderService` and navigates to order tracking.
- `npm run typecheck`, `npm run lint`, `npm run test` pass for `features/cart` and touched
  `services/` code.
