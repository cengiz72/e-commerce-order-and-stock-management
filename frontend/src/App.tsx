import { RouterProvider } from 'react-router'
import type { DataRouter } from 'react-router'
import type { ErrorInfo, ReactNode } from 'react'
import { ErrorBoundary } from './components'
import { AuthProvider, ToastProvider } from './hooks'

/**
 * The application shell (docs/frontend-architecture.md §3.8).
 *
 * Providers and routes, nothing else. Every Phase 1 piece was built to be mounted from here and
 * from nowhere else: the HTTP client (SCRUM-2) reaches the session through `AuthProvider`, the
 * route guards (SCRUM-4) read it through `useAuth()`, and the design system (SCRUM-5) supplies
 * the error fallback and the toast this file stacks. No business logic lives in the shell
 * (CLAUDE.md — "keep business logic separate from UI/framework glue").
 *
 * ## Provider order, and why
 *
 * ```
 * <ErrorBoundary>        ← outermost: catches a render error anywhere below, including in the
 *   <ToastProvider>         providers themselves, instead of leaving a blank page
 *     <AuthProvider>     ← must sit ABOVE the router (ADR 0002): every guard calls useAuth(),
 *       <RouterProvider>    which throws when no provider is present
 * ```
 *
 * The boundary being outermost means its fallback also replaces the toast stack when it trips.
 * That is the intended trade: a crashed app should show one clear recovery affordance, not a
 * half-rendered shell with stale toasts floating over it.
 *
 * ## Two error paths, two catchers
 *
 * The boundary here does **not** see a page blowing up: React Router catches route render errors
 * in its own boundary first, and with no `errorElement` it renders a built-in stack-trace screen.
 * So route errors are handled by `routes/routeError.tsx` (mounted on a pathless wrapper route in
 * `routes/routes.tsx`), and this boundary covers everything the router cannot see — the
 * providers, the router mount itself, and anything else rendered beside it in the shell.
 *
 * ## Deferred: the server-state / data-fetching cache provider
 *
 * docs/phases/01-app-shell-and-core-infrastructure.md lists a **server-state cache provider**
 * (frontend-architecture.md A1/OQ1) as part of this bootstrap. It is deliberately **not wired
 * here**: OQ1 ("which server-state cache — TanStack Query / RTK Query / SWR / hand-rolled")
 * has no accepted ADR. Phase 0 produced only ADR 0002 (routing); the OQ1 and OQ2 ADRs required
 * by docs/phases/00-foundation-decisions.md were never written. Adding a cache library here
 * would silently make that decision and pull in an unjustified dependency (CLAUDE.md — "Do not
 * introduce new dependencies without explaining why").
 *
 * Nothing needs it yet — Phase 1 renders placeholder pages and fetches no feature data — so the
 * gap costs nothing today. It becomes blocking for Phase 2 (`services/` consumers) and Phase 5,
 * where order status has to be re-read over time (A6/OQ4). **Next step: accept an OQ1 ADR under
 * `docs/adr/`, per `docs/phases/00-foundation-decisions.md`, then mount its provider directly
 * above `<AuthProvider>` here.**
 *
 * ## Router library
 *
 * ADR 0002 confines `react-router` to `src/routes/`. This file is the documented exception the
 * ADR itself anticipated ("the app-shell work only has to wire
 * `<AuthProvider><RouterProvider router={createAppRouter()} /></AuthProvider>`") — it mounts the
 * router but knows nothing about the routes, which stay in `routes/routes.tsx`.
 */

/**
 * Last-resort reporting for a caught render error. `console` is the only sink that exists today;
 * real telemetry is a later concern, which is exactly why `ErrorBoundary` takes this as a prop
 * instead of logging on its own.
 */
function reportRenderError(error: Error, info: ErrorInfo) {
  console.error('Unhandled render error', error, info.componentStack)
}

export interface AppShellProps {
  children?: ReactNode
}

/**
 * The provider stack on its own, without a router.
 *
 * Exported so the router can be supplied by the caller: `main.tsx` mounts the real browser
 * router and tests mount a memory router, and both get the identical provider composition
 * rather than a test-only approximation of it.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <ErrorBoundary onError={reportRenderError}>
      <ToastProvider>
        <AuthProvider>{children}</AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export interface AppProps {
  /**
   * The router to mount. Passed in rather than created here: `createAppRouter()` touches
   * `window.history`, and doing that during render would run twice under `StrictMode` and build
   * a throwaway browser router in every test.
   */
  router: DataRouter
}

export default function App({ router }: AppProps) {
  return (
    <AppShell>
      <RouterProvider router={router} />
    </AppShell>
  )
}
