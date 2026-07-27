# Phase 1 — App Shell & Core Infrastructure

## Goal

Stand up the application skeleton everything else plugs into: `frontend/src/main.tsx`, global
providers, the shared typed HTTP client, the routing skeleton, auth bootstrap, and the
presentational `components/` design system. After this phase the app boots to an empty routed
shell with no real features yet.

## Depends on

Phase 0 (the state/data-fetching library, JWT storage posture, and routing library must already
be decided by ADR).

## Backend surfaces touched

user-service, indirectly (auth bootstrap reads/attaches the JWT chosen in Phase 0; no feature
calls yet).

## Scope

- **`main.tsx` bootstrap** (frontend-architecture.md §3.8): mount React, wire the server-state
  cache provider (A1/OQ1), auth/session provider (A4/OQ2), router (A10/OQ3), a top-level error
  boundary, and theme/toaster provider.
- **Shared HTTP client (A3)**: single wrapper around `fetch`/`axios` (per Phase 0 ADR) that
  attaches the JWT, sets per-service base URLs, and normalizes error shapes. No component or
  feature imports it directly — only `services/` modules will (Phase 2).
- **Auth bootstrap (A4/A5)**: session provider + `useAuth` hook skeleton reading the token
  posture decided in Phase 0; route guard primitive for `role === 'ADMIN'` (used by Phase 6, not
  wired to a real route yet).
- **Routing skeleton (A10)**: route table with placeholder pages for products list/detail
  (public), cart (auth), checkout (auth), order tracking (auth), admin inventory (auth + ADMIN),
  login/register (public). No feature logic behind the placeholders yet.
- **Shared `components/` design system (A8, §3.5)**: button, input/select, modal/dialog, data
  table, `<Money>`/price display (A11 — centralizes fixed-precision money formatting), status
  badge, spinner/skeleton, empty-state, error-boundary fallback, toast. Presentational only — no
  `services/` imports, no business logic.

## Open questions to resolve in/before this phase

None new — this phase consumes the Phase 0 ADRs. OQ9 (error/empty/loading UX conventions) is a
good-to-settle-here question since `components/` is being built, but is not blocking.

## Out of scope

- No real data fetching — routed pages render placeholders, not live product/cart/order data.
- No `services/` modules yet (Phase 2) — the HTTP client exists but nothing calls it end-to-end.
- Admin route guard exists as a primitive but is not exercised by a real admin screen until
  Phase 6.

## Exit criteria

- App builds and runs (`npm run dev`), all placeholder routes reachable, login/logout flips the
  auth-gated routes' accessibility using the Phase 0 token posture.
- `npm run typecheck` and `npm run lint` pass.
- `components/` modules have no imports from `services/` (verifiable by grep/lint rule).
