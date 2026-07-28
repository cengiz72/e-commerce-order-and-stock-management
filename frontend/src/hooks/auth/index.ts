/**
 * Public surface of the auth/session module (docs/frontend-architecture.md §3.8, A4, A5).
 *
 * Features and the app shell import from here only — `tokenStore` and the context object
 * itself are internals, so the storage posture (OQ2) can change without touching any consumer.
 * The network call itself lives in `services/userService` (not here), per CLAUDE.md's "API
 * calls live under `services/`" — see that module for the SCRUM-3 stand-in note.
 *
 * Not included, on purpose: `register()` (out of scope for SCRUM-3), any routing/redirect
 * behaviour, and any login/register UI.
 */
export { AuthProvider } from './AuthProvider'
export type { AuthProviderProps } from './AuthProvider'
export { useAuth } from './context'
export { evaluateRoleAccess, useAdminAccess, useRoleAccess } from './roleGuard'
export { decodeJwtClaims, readUserFromToken } from './jwt'
export { AuthErrorCode } from './types'
export type {
  AccessDecision,
  AccessDeniedReason,
  AuthContextValue,
  AuthErrorCodeValue,
  AuthUser,
  LoginCredentials,
  LoginResult,
  UserRole,
} from './types'
