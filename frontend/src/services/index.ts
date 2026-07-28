/**
 * `services/` — the only layer allowed to perform HTTP (CLAUDE.md Architecture Rules).
 *
 * Today it exposes just the shared HTTP client; the per-backend service modules
 * (productService, cartService, orderService, paymentService, userService) land in Phase 2.
 */
export * from './http'
