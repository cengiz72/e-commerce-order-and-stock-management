import { Navigate, useLocation } from 'react-router'
import type { ReactNode } from 'react'
import { useAdminAccess, useAuth } from '../hooks'
import type { AccessDeniedReason } from '../hooks'
import { toLoginRedirectState } from './loginRedirect'
import { ROUTE_PATHS } from './paths'

/**
 * Route guards — the layer that turns SCRUM-3's `AccessDecision` **value** into an actual
 * navigation (docs/frontend-architecture.md A5).
 *
 * `hooks/auth` deliberately reports a decision and never redirects, because redirecting is a
 * router concern and no router existed until this ticket. That split is kept here: the hooks
 * stay router-agnostic, and every "…so go somewhere else" answer lives in this file.
 *
 * This is **UX gating only**. It hides UI the current session may not use; it is never a
 * security boundary. Every protected endpoint is authorized server-side regardless of what
 * these components render.
 */

interface GuardProps {
  children?: ReactNode
}

/**
 * Where a denial sends the visitor, by reason:
 *
 * - `UNAUTHENTICATED` → the login page, remembering where they were headed (AC2/AC4).
 * - `INSUFFICIENT_ROLE` → the public storefront (AC3). Signing in again would not help — they
 *   already are signed in, just not as an `ADMIN` — so bouncing them to the login form would
 *   be a dead end.
 */
function DenialRedirect({ reason }: { reason: AccessDeniedReason }) {
  const location = useLocation()

  if (reason === 'UNAUTHENTICATED') {
    // `replace`: the blocked URL must not sit in history, or Back-after-login loops through it.
    return <Navigate to={ROUTE_PATHS.login} replace state={toLoginRedirectState(location)} />
  }
  return <Navigate to={ROUTE_PATHS.products} replace />
}

/**
 * Signed-in-only routes (cart, checkout, order tracking).
 *
 * Note on `isAuthenticating`: it is true only while a `login()` call is in flight, which today
 * can only happen on `/login` — a public route — so there is no "still deciding" state to wait
 * for here. When OQ2 (session bootstrap from a refresh cookie) lands, a reload will start in a
 * genuinely unknown state and this guard must wait for it before redirecting.
 */
export function RequireAuth({ children }: GuardProps) {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) return <DenialRedirect reason="UNAUTHENTICATED" />
  return <>{children}</>
}

/**
 * `ADMIN`-only routes (the inventory panel).
 *
 * Covers the anonymous case too — `useAdminAccess()` reports `UNAUTHENTICATED` rather than
 * `INSUFFICIENT_ROLE` for a visitor with no session — so admin routes need this guard alone,
 * not this one nested inside {@link RequireAuth}.
 */
export function RequireAdmin({ children }: GuardProps) {
  const decision = useAdminAccess()

  if (!decision.allowed) return <DenialRedirect reason={decision.reason} />
  return <>{children}</>
}
