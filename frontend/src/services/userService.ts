import { http } from './http'
import type { ApiError } from './http'

/**
 * user-service's HTTP surface (docs/frontend-architecture.md §2 — the `userService` module).
 *
 * TEMPORARY (SCRUM-3): only login exists so far, built as the auth session provider's
 * (`hooks/auth`) one network call before Phase 2 fleshes this module out properly. It lives
 * here — not in `hooks/auth` — so CLAUDE.md's "API calls live under `services/`" holds without
 * exception; `hooks/auth` imports this module, never the HTTP client directly.
 *
 * ASSUMPTION (unverifiable today — backend/user-service holds only package-info.java files):
 * `POST /api/v1/auth/login` with `{ email, password }` returns `200 { token: "<jwt>" }`, and
 * every user-facing claim (id, role) is inside that JWT rather than in sibling response
 * fields. Revisit against the real endpoint; only this file is affected.
 */

const LOGIN_PATH = '/api/v1/auth/login'

/**
 * ASSUMPTION: user-service's login endpoint takes an email + password. No backend contract
 * exists yet (backend/user-service contains only package-info.java files), so this shape is a
 * placeholder to be confirmed when the real endpoint lands.
 */
export interface LoginCredentials {
  email: string
  password: string
}

interface LoginResponse {
  token?: unknown
}

export type LoginTokenResult = { ok: true; token: string } | { ok: false; error: ApiError }

/** Error codes produced by this module rather than by the backend or the HTTP client. */
export const AuthErrorCode = {
  /** Login succeeded over HTTP but the response carried no usable JWT. */
  InvalidToken: 'INVALID_AUTH_TOKEN',
} as const

export type AuthErrorCodeValue = (typeof AuthErrorCode)[keyof typeof AuthErrorCode]

/**
 * Exchange credentials for a JWT. Never throws: transport, HTTP and contract failures all
 * come back as the HTTP client's normalized `ApiError`.
 */
export async function requestLoginToken(credentials: LoginCredentials): Promise<LoginTokenResult> {
  const result = await http.post<LoginResponse>('user', LOGIN_PATH, credentials)
  if (!result.ok) return { ok: false, error: result.error }

  const token = result.data?.token
  if (typeof token !== 'string' || !token.trim()) {
    return {
      ok: false,
      error: {
        status: result.status,
        code: AuthErrorCode.InvalidToken,
        message: 'Login response did not contain a token',
      },
    }
  }
  return { ok: true, token: token.trim() }
}
