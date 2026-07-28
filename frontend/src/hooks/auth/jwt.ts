import type { AuthUser, UserRole } from './types'

/**
 * Minimal JWT claim reader.
 *
 * A JWT payload is base64url-encoded JSON, so reading claims needs no library and no new
 * dependency. This deliberately does **not** verify the signature: signature verification is
 * the backend's job on every request, and the claims read here are used for UX only (A5).
 * Nothing security-relevant may be decided from this output.
 *
 * Expiry (`exp`) is not enforced either — session lifetime/refresh is still an open question
 * (docs/frontend-architecture.md OQ2). An expired token simply fails server-side on the next
 * call.
 */

const KNOWN_ROLES: readonly string[] = ['CUSTOMER', 'ADMIN']

function decodeBase64Url(segment: string): string | null {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  try {
    const binary = atob(padded)
    // `atob` yields one char per byte, so the string must be re-decoded as UTF-8 before it is
    // parsed — otherwise any non-ASCII claim value (e.g. a name) comes back mojibake.
    return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)))
  } catch {
    return null
  }
}

/**
 * Read a JWT's payload claims, or `null` when the token is malformed/unparseable.
 * Never throws: a bad token is an expected input here, not an exceptional one.
 */
export function decodeJwtClaims(token: string): Record<string, unknown> | null {
  const segments = token.split('.')
  if (segments.length !== 3) return null
  const payload = segments[1]
  if (!payload) return null
  const json = decodeBase64Url(payload)
  if (json === null) return null
  try {
    const claims: unknown = JSON.parse(json)
    if (typeof claims !== 'object' || claims === null || Array.isArray(claims)) return null
    return claims as Record<string, unknown>
  } catch {
    return null
  }
}

function readRole(claims: Record<string, unknown>): UserRole | undefined {
  const raw = claims.role
  if (typeof raw !== 'string') return undefined
  const normalized = raw.trim().toUpperCase()
  return KNOWN_ROLES.includes(normalized) ? (normalized as UserRole) : undefined
}

/**
 * Derive the session user from a JWT, or `null` when the token carries no usable subject.
 *
 * ASSUMPTION: the user id is the standard `sub` claim (falling back to `userId`) and the role
 * is a flat `role` claim holding `CUSTOMER`/`ADMIN` — matching the `users.role` values in
 * docs/postgre-schema.md §3.1. The real token layout is unconfirmed (no user-service exists
 * yet); an unrecognized role decodes to `undefined`, which every role check treats as denied.
 */
export function readUserFromToken(token: string): AuthUser | null {
  const claims = decodeJwtClaims(token)
  if (!claims) return null
  const subject = typeof claims.sub === 'string' ? claims.sub : claims.userId
  if (typeof subject !== 'string' || !subject.trim()) return null
  return { id: subject.trim(), role: readRole(claims) }
}
