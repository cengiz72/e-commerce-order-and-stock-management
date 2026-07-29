/**
 * `routes/` — the cross-cutting route table, its URL vocabulary, and the guards that enforce
 * access (docs/frontend-architecture.md §3.8).
 *
 * Cross-cutting rather than feature-owned, like `services/` and `hooks/`: it wires every
 * feature's pages to URLs and is the only place that knows the router library (OQ3).
 *
 * Consumers (the app shell, and later any navigation UI) import from here. Pages inside
 * `features/*` import the leaf modules (`./paths`, `./loginRedirect`) directly, since this
 * barrel pulls in the route table that imports them.
 */
export { RequireAdmin, RequireAuth } from './guards'
export { readLoginRedirect, toLoginRedirectState } from './loginRedirect'
export type { LoginRedirectState } from './loginRedirect'
export { productDetailPath, ROUTE_PATHS } from './paths'
export type { RoutePathKey } from './paths'
export { RouteErrorFallback } from './routeError'
export { appRoutes, createAppRouter } from './routes'
