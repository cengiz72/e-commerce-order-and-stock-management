/**
 * The "where was I going?" hand-off between a guard and the login page (AC2 + AC4).
 *
 * A guard that bounces an anonymous visitor stores the blocked location in history state; the
 * login page reads it back and returns the user there after a successful sign-in, instead of
 * stranding them on the form.
 *
 * Deliberately router-agnostic and dependency-free (plain data in, plain string out), so both
 * `guards.tsx` and the login page can use it without either importing the other.
 */

export interface LoginRedirectState {
  /** In-app path (with query string) the visitor was blocked from. */
  from: string
}

/** Capture the current location as the post-login destination. */
export function toLoginRedirectState(location: { pathname: string; search: string }): LoginRedirectState {
  return { from: `${location.pathname}${location.search}` }
}

/**
 * Read a post-login destination back out of history state, or `null` when there isn't a usable
 * one (direct visit to `/login`, hand-edited state, wrong shape).
 *
 * History state is attacker-influenceable, so this only ever yields a **relative in-app path**:
 * anything protocol-relative (`//evil.example`) or absolute (`https://…`) is rejected rather
 * than turned into an open redirect.
 */
export function readLoginRedirect(state: unknown): string | null {
  if (typeof state !== 'object' || state === null) return null
  const { from } = state as { from?: unknown }
  if (typeof from !== 'string') return null
  if (!from.startsWith('/') || from.startsWith('//')) return null
  return from
}
