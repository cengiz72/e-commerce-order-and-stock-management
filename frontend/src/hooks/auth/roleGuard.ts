import { useAuth } from './context'
import type { AccessDecision, AuthUser, UserRole } from './types'

/**
 * Role-guard primitive (docs/frontend-architecture.md A5).
 *
 * This reports a decision; it never navigates. No router exists yet (OQ3), and even once one
 * does, redirecting is the route layer's job — keeping the decision as a plain value means
 * SCRUM-4 can redirect, Phase 6 can render a "not allowed" panel, and neither has to fight
 * the other.
 *
 * This is UX gating only. Every admin endpoint is authorized server-side regardless of what
 * this returns, and a token's claims are read here without signature verification (jwt.ts).
 */

const ALLOWED: AccessDecision = { allowed: true }

/** Pure decision, so the rule can be tested and reused without a React tree. */
export function evaluateRoleAccess(user: AuthUser | null, required: UserRole): AccessDecision {
  if (!user) return { allowed: false, reason: 'UNAUTHENTICATED' }
  // A missing/unrecognized role claim denies: the guard never guesses a default role.
  if (user.role !== required) return { allowed: false, reason: 'INSUFFICIENT_ROLE' }
  return ALLOWED
}

/** Whether the current user holds `required`. */
export function useRoleAccess(required: UserRole): AccessDecision {
  const { user } = useAuth()
  return evaluateRoleAccess(user, required)
}

/** `useRoleAccess('ADMIN')` — the guard `features/admin` routes will use. */
export function useAdminAccess(): AccessDecision {
  return useRoleAccess('ADMIN')
}
