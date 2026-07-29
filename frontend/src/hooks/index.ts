/**
 * `hooks/` — cross-feature hooks (docs/frontend-architecture.md §3.7).
 *
 * Today it exposes the auth/session module and the toast module; feature-specific hooks stay
 * inside their own feature folder and never land here.
 *
 * Both modules ship a provider next to their hook, for the same reason: the state is
 * app-wide, so the shell (`App.tsx`) mounts one provider and every feature reads it through a
 * hook. Nothing else mounts them.
 */
export * from './auth'
export * from './toast'
