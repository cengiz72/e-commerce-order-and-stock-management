# Phase 2 — Services Layer

## Goal

Build the `services/` layer: one HTTP-access module per backend service, typed DTOs mirroring
backend contracts, and the documented escape hatch for cross-service composition. This is the
**only** place in the codebase allowed to perform HTTP after this phase (CLAUDE.md: "API calls
live under `services/`, never inside components").

## Depends on

Phase 1 (shared HTTP client, providers).

## Backend surfaces touched

product-service (Mongo), order-service (Postgres), payment-service, user-service (Postgres/JWT),
and the Redis-backed cart endpoints. No notification-service module — it has no HTTP surface and
must not get one invented (frontend-architecture.md, Facts).

## Scope

Per the module table in frontend-architecture.md §2, create (A2):

| Module | Talks to | Frontend-visible surface |
|---|---|---|
| `productService` | product-service | list/search, detail, categories, catalog `stock` reads; admin catalog/stock writes |
| `cartService` | cart endpoints (Redis-backed) | get cart, add/update/remove line, clear |
| `orderService` | order-service | place order, get order, list my orders, read `orders.status` |
| `paymentService` | payment-service | initiate/observe simulated payment (exact shape per OQ8, resolved in Phase 5) |
| `userService` | user-service | login, register, current-user/`role` claim |

- Each module exposes typed request/response DTOs mirroring backend contracts (order/payment
  shapes constrained by the Kafka event schemas via `docs/kafka-schemas/`; product shape by
  `docs/mongodb-schema.md`). DTOs are kept separate from any UI/view model.
- `productId` is handled as an **opaque string** end-to-end (never coerced to a number) — see
  `docs/mongodb-schema.md` §3.1.
- Money fields (`totalAmount`, `unitPrice`, `amount`) are passed through as returned by the
  backend — no client-side float arithmetic on money.
- `services/` modules are stateless: no caching/staleness logic here (that lives in the
  server-state cache from Phase 0/1 and in feature hooks) — keeps each module a small, deep,
  testable surface.
- **Cross-service composition boundary (OQ7)**: confirm and document that a screen needing data
  from two services (e.g. order lines + product names) composes them in a feature-level query
  hook that calls two `services/` modules — composition does **not** live inside a service
  module, since backend references are logical-only (no backend joins).

## Open questions to resolve in/before this phase

- **OQ7** (frontend-architecture.md, `services/` granularity & cross-service composition) —
  confirm the boundary above; flagged as ADR-worthy (§4 item 4) if contested.

## Out of scope

- No feature UI consumes these modules yet — this phase is the data-access layer only, verified
  via unit tests / a thin smoke harness, not through a real screen.
- `paymentService`'s exact call shape (OQ8) is scaffolded per the current spec understanding but
  finalized in Phase 5 alongside order tracking, since payment outcome is mostly observed via
  order-service, not called directly.

## Exit criteria

- All five modules exist with typed functions and DTOs; none import React or any `components/`/
  `features/` code (one-way dependency).
- No component or feature imports `fetch`/`axios`/the HTTP client directly — only `services/`
  does (enforced by lint rule or code review).
- `./mvnw`-equivalent frontend checks pass: `npm run typecheck`, `npm run lint`, and unit tests
  for the new modules (`npm run test`).
