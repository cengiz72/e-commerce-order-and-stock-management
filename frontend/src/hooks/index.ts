/**
 * `hooks/` — cross-feature hooks (docs/frontend-architecture.md §3.7).
 *
 * Today it exposes the auth/session module; feature-specific hooks stay inside their own
 * feature folder and never land here.
 */
export * from './auth'
