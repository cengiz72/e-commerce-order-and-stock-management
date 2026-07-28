/**
 * Pluggable JWT hook point.
 *
 * The auth/session provider does not exist yet (SCRUM-3). Rather than hardcoding a storage
 * posture here — still an open question (docs/frontend-architecture.md OQ2: in-memory vs
 * localStorage vs httpOnly cookie + refresh) — the client asks an injected provider for the
 * current token on every request. Whatever SCRUM-3 decides, only the provider changes.
 *
 * Until a provider is registered, no `Authorization` header is sent.
 */

export type AuthTokenProvider = () => string | null | undefined

let tokenProvider: AuthTokenProvider | null = null

/**
 * Register (or clear, by passing `null`) the function the client calls to obtain the current
 * JWT. Called once by the auth provider during bootstrap.
 */
export function setAuthTokenProvider(provider: AuthTokenProvider | null): void {
  if (import.meta.env.DEV && tokenProvider !== null && provider !== null) {
    // Not necessarily wrong (e.g. a token-provider identity legitimately changes), but this
    // is also the shape of a bootstrap-ordering bug — two providers registering because the
    // auth provider mounted twice. Dev-only so it never fires in a production bundle.
    console.warn(
      '[services/http] setAuthTokenProvider called again before the previous provider was cleared.',
    )
  }
  tokenProvider = provider
}

/** Current token, or `null` when no provider is registered or it has no token. */
export function getAuthToken(): string | null {
  if (!tokenProvider) return null
  const token = tokenProvider()
  return token ? token : null
}
