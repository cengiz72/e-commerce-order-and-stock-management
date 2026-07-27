# Phase 6 — Admin Feature

## Goal

Build `features/admin`: the inventory admin panel — create/edit products, adjust catalog
`stock`, manage categories — restricted to `ADMIN` users via the route guard built in Phase 1.

## Depends on

Phase 1 (auth bootstrap, `role`-based route guard primitive), Phase 2 (`productService` writes).

## Backend surfaces touched

product-service (Mongo catalog/stock writes, admin listings via the `{status, updatedAt}` index,
`docs/mongodb-schema.md` §3.2). May read order-service for ops/fulfilment views if confirmed in
scope — not assumed by default.

## Scope

Per frontend-architecture.md §3.4:

- Admin product/category list with search, backed by `productService`.
- Create/edit product form; adjust catalog `stock`; manage categories.
- Wire the `role === 'ADMIN'` route guard (built as a primitive in Phase 1) to the real admin
  routes — this is the guard's first real consumer.
- Client-side gating is **UX only**: every admin write is authorized server-side regardless (A5)
  — do not treat the frontend guard as a security boundary in code comments, docs, or reviews.

## Open questions to resolve in/before this phase

- **OQ6 — Admin form handling.** Decide form library (React Hook Form / Formik / native
  controlled) and validation strategy (mirror the Mongo `$jsonSchema` from
  `docs/mongodb-schema.md` §3.2 client-side, vs. server-only validation with server-error
  display). New dependency if a library is chosen — justify per CLAUDE.md.
- **Inventory placement dependency**: this panel edits the Mongo catalog `stock` **display
  counter only**, not the Postgres transactional reservation ledger
  (`docs/mongodb-schema.md` A4). What the panel is ultimately allowed to change depends on the
  still-open backend inventory-placement decision flagged in `docs/postgre-schema.md` §4 item 1
  and `docs/mongodb-schema.md` §4 item 2. If that backend ADR lands before this phase starts,
  re-check this phase's scope against it — the panel must not present stock edits as editing
  reservations.

## Out of scope

- Editing the Postgres reservation ledger or any transactional stock counter — that's owned by
  order-service/payment flow, not this panel.
- Order/fulfilment ops views, unless separately confirmed in scope.

## Exit criteria

- Non-admin users cannot reach `/admin/*` routes (redirected/blocked by the guard); admin users
  can create/edit products and adjust catalog stock, with writes reflected in
  `features/products`' storefront view after refresh.
- Form validation errors (client and/or server-driven, per the OQ6 decision) surface clearly.
- `npm run typecheck`, `npm run lint`, `npm run test` pass for `features/admin` and touched
  `services/` code.
