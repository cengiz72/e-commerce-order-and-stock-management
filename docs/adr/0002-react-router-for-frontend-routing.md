# 0002. Use React Router for frontend routing, isolated behind `src/routes/`

Status: Accepted

## Context

`docs/frontend-architecture.md` A10 requires a route table (product list/detail, cart,
checkout, order tracking, admin inventory, login, register) and A5 requires a client-side
guard on the `ADMIN` route, but **OQ3 ("routing approach": React Router vs a file-based Vite
option vs TanStack Router) was never decided**. Routing is also a new runtime dependency, which
CLAUDE.md says must be justified rather than silently adopted.

Two further constraints shaped this:

- `hooks/auth` (the session module) deliberately reports access as a **value**
  (`AccessDecision = { allowed: false, reason: 'UNAUTHENTICATED' | 'INSUFFICIENT_ROLE' }`) and
  never navigates, because no router existed when it was built. Something has to turn that
  value into a redirect.
- CLAUDE.md's Architecture Map names no `routes/` or `pages/` folder, and no `features/auth`,
  yet A10 requires login/register screens.

## Decision

- Adopt **React Router** (`react-router`, v8 — the package the ecosystem consolidated on;
  `react-router-dom` is now a legacy alias) as the routing library. It is the option
  `docs/frontend-architecture.md` OQ3 lists first, it needs no build-time convention (unlike
  file-based routing) so it does not constrain the Vite setup, and its `RouteObject[]` data
  router lets the route table be exported as plain data and tested with a memory router without
  mounting the app.
- **Confine the library to `src/routes/`.** Only the route table (`routes/routes.tsx`) and the
  guards (`routes/guards.tsx`) import `react-router`; feature pages import it only for hooks
  they genuinely need (`useParams`, `useNavigate`, `Link`). Reversing OQ3 later is therefore a
  two-file change plus page-level hook swaps, not an app-wide rewrite.
- **Add `src/routes/` as a cross-cutting folder**, alongside the existing non-feature folders
  `services/` and `hooks/`. It owns the URL vocabulary (`routes/paths.ts`), the route table, and
  the guards. Route definitions stay separate from page content.
- **Guards live in `routes/`, not in `hooks/auth`.** `RequireAuth` (reads
  `useAuth().isAuthenticated`) and `RequireAdmin` (reads `useAdminAccess()`) translate a denial
  into a navigation: `UNAUTHENTICATED` → login, remembering the blocked path in history state so
  sign-in returns the user there; `INSUFFICIENT_ROLE` → the public storefront, since
  re-authenticating as the same non-admin user would be a dead end. `hooks/auth` stays
  router-agnostic.
- **Add `features/auth/`** for the login/register pages, mirroring the existing `features/*`
  pattern rather than putting screens inside the cross-cutting `routes/` folder.

## Consequences

- OQ3 is closed for Phase 1; the route table exists as importable, testable data before anything
  mounts it, so the app-shell work only has to wire
  `<AuthProvider><RouterProvider router={createAppRouter()} /></AuthProvider>`.
- `<AuthProvider>` must sit **above** the router: every guard calls `useAuth()`, which throws
  without a provider.
- Client-side guards remain **UX gating only**. Every protected endpoint is still authorized
  server-side; this ADR does not make the browser a security boundary.
- The Architecture Map in CLAUDE.md and `docs/architecture.md` now has two frontend folders it
  does not list (`routes/`, `features/auth/`); they should be added when those docs are next
  revised.
- Guard behaviour depends on session bootstrap, which is still open (`frontend-architecture.md`
  OQ2). Today a reload starts anonymous, so a guarded route after reload redirects to login.
  When OQ2 lands a refresh-cookie bootstrap, `RequireAuth` must additionally wait for the
  "still deciding" state before redirecting.
