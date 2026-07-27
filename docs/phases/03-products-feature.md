# Phase 3 — Products Feature

## Goal

Build `features/products`: the storefront product list, search, category filtering, and product
detail view. This is the first real vertical slice — it exercises the shell (Phase 1) and
`productService` (Phase 2) end-to-end with no auth dependency, so it's the natural first feature
to ship.

## Depends on

Phase 2 (`productService`, DTOs, shared HTTP client).

## Backend surfaces touched

product-service only (Mongo-backed catalog, text-index search, category filter).

## Scope

Per frontend-architecture.md §3.1:

- Product **list** and **search** (debounced input, A12) — calls product-service's existing
  Mongo text-index-backed search endpoint (`docs/mongodb-schema.md` §3.2 index
  `{name:"text", description:"text"}`). Do not invent a new search endpoint or a client-side
  full-text index.
- Category **filter**, using the `{categoryId, status}` index.
- Product **detail** view, including reviews (Mongo `product_reviews`) if in scope for this pass.
- Server-state: product pages/results, product detail, categories (cached per A1). Client-state:
  current search text (debounced), active filters, pagination cursor.
- "Add to cart" affordance on list/detail that hands off `productId` + quantity — this phase
  wires the UI control only; the actual cart write happens in Phase 4 via `cartService`.
- Route: public, no auth guard (per Phase 1's route table).

## Open questions to resolve in/before this phase

None blocking. Note from the spec: catalog `stock` shown here is a **display/available
counter**, not a live reservation guarantee (`docs/mongodb-schema.md` A4) — the UI must not
promise "in stock" as a firm commitment, since the real reserve/reject decision happens
asynchronously after order placement (Phase 5 territory, OQ4).

## Out of scope

- Cart mutations (Phase 4) — "add to cart" here only prepares the call, doesn't require
  `cartService` to be wired yet if Phase 4 hasn't landed; coordinate order if built in parallel.
- Auth — this feature is fully public.
- Admin catalog editing (Phase 6) — this phase is read-only against product-service.

## Exit criteria

- Product list, search, category filter, and detail page render live data from product-service
  through `productService`.
- Money values render via the shared `<Money>` component (A11) — no ad hoc formatting.
- `productId` handled as opaque string throughout (no numeric coercion, no arithmetic on it).
- `npm run typecheck`, `npm run lint`, and `npm run test` pass for `features/products` and any
  touched `services/`/`components/` code.
