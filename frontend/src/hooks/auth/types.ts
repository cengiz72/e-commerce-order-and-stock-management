import { AuthErrorCode } from '../../services'
import type { ApiError, AuthErrorCodeValue, LoginCredentials } from '../../services'

/**
 * Public types of the auth/session module (docs/frontend-architecture.md §3.8, A4, A5).
 *
 * `LoginCredentials` and `AuthErrorCode` are defined in `services/userService` (they describe
 * the login request/error contract, not session state) and re-exported here so the rest of
 * `hooks/auth` — and this module's own public barrel — keep importing from `./types` unchanged.
 */
export { AuthErrorCode }
export type { AuthErrorCodeValue, LoginCredentials }

/**
 * Roles defined by the backend `users.role` column (docs/postgre-schema.md §3.1).
 * `ADMIN` is what gates `features/admin` in the UI (A5).
 */
export type UserRole = 'CUSTOMER' | 'ADMIN'

/**
 * The authenticated user as far as the browser is concerned: whatever could be read from the
 * JWT's claims. It is intentionally tiny — profile data belongs to the real `userService`
 * (Phase 2), not to the session.
 *
 * `role` is `undefined` when the token carries no recognizable role claim; consumers must
 * treat that as "not an admin" rather than assuming a default.
 */
export interface AuthUser {
  id: string
  role: UserRole | undefined
}

/**
 * Outcome of {@link AuthContextValue.login}. Failures reuse the HTTP client's normalized
 * `ApiError` so callers (SCRUM-4's login page) branch on one error shape, whether the request
 * failed or the returned token was unusable.
 */
export type LoginResult = { ok: true; user: AuthUser } | { ok: false; error: ApiError }

/** Everything the provider exposes; read through `useAuth()`, never from the context directly. */
export interface AuthContextValue {
  /** The signed-in user, or `null` when nobody is signed in. */
  user: AuthUser | null
  /** Convenience mirror of `user?.role`; `undefined` when anonymous (AC1). */
  role: UserRole | undefined
  isAuthenticated: boolean
  /** True while a `login()` call is in flight. */
  isAuthenticating: boolean
  login: (credentials: LoginCredentials) => Promise<LoginResult>
  logout: () => void
}

/** Why a role check said no. Lets callers distinguish "sign in" from "you may not". */
export type AccessDeniedReason = 'UNAUTHENTICATED' | 'INSUFFICIENT_ROLE'

/**
 * The result of a role check. Deliberately a value, not an action: this module never
 * navigates or redirects (no router exists yet — OQ3), it only reports the decision.
 */
export type AccessDecision = { allowed: true } | { allowed: false; reason: AccessDeniedReason }
