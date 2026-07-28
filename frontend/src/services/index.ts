/**
 * `services/` — the only layer allowed to perform HTTP (CLAUDE.md Architecture Rules).
 *
 * Today it exposes the shared HTTP client and a partial `userService` (login only, SCRUM-3's
 * stand-in for the auth session provider); the rest of the per-backend service modules
 * (productService, cartService, orderService, paymentService) land in Phase 2.
 */
export * from './http'
export { AuthErrorCode, requestLoginToken } from './userService'
export type { AuthErrorCodeValue, LoginCredentials, LoginTokenResult } from './userService'
