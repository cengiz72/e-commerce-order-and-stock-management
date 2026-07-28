/**
 * In-memory JWT storage.
 *
 * No ADR has settled the storage posture yet (docs/frontend-architecture.md OQ2: in-memory vs
 * localStorage vs httpOnly cookie + refresh), so this follows the same conservative default
 * SCRUM-2 used: a module-scoped variable, never `localStorage`, `sessionStorage` or a cookie.
 * A raw JWT in web storage is XSS-exfiltratable; memory is not readable by injected script
 * that lacks a reference to this module.
 *
 * Consequence, by design: **a full page reload ends the session** — the module is
 * re-evaluated and the token is gone. That is the accepted trade-off of this default, not a
 * bug, and it is asserted by a test. It changes only when OQ2 is decided (e.g. a refresh
 * cookie + bootstrap call), and then only this file plus the provider's bootstrap change.
 *
 * The token lives here rather than in React state because the HTTP client reads it
 * synchronously, per request, from outside React (`setAuthTokenProvider`).
 */

let currentToken: string | null = null

/** The current JWT, or `null` when nobody is signed in. */
export function readStoredToken(): string | null {
  return currentToken
}

/** Replace the current JWT; pass `null` to clear it on logout. */
export function setStoredToken(token: string | null): void {
  currentToken = token
}
