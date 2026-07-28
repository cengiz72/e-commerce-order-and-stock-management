// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { http, setAuthTokenProvider } from '../../services'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './context'
import { decodeJwtClaims, readUserFromToken } from './jwt'
import { evaluateRoleAccess, useAdminAccess } from './roleGuard'
import { readStoredToken, setStoredToken } from './tokenStore'
import type { AuthContextValue, LoginResult } from './types'

/**
 * No user-service exists yet (backend/user-service holds only package-info.java files), so
 * every login here runs against a stubbed global `fetch`, the same way SCRUM-2's client tests
 * do. The JWTs are hand-built, unsigned tokens — this module never verifies signatures.
 */

const fetchMock = vi.fn<typeof fetch>()

function base64Url(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function makeJwt(claims: Record<string, unknown>): string {
  return `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url(claims)}.not-a-real-signature`
}

const CUSTOMER_TOKEN = makeJwt({ sub: 'user-1', role: 'CUSTOMER' })
const ADMIN_TOKEN = makeJwt({ sub: 'user-2', role: 'ADMIN' })

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

function lastRequestHeaders(): Record<string, string> {
  const call = fetchMock.mock.calls.at(-1)
  if (!call) throw new Error('fetch was never called')
  return ((call[1] ?? {}).headers ?? {}) as Record<string, string>
}

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper })
}

/** One provider, reading both the session and the admin guard, so they cannot disagree. */
function renderAuthWithAdminGuard() {
  return renderHook(() => ({ auth: useAuth(), guard: useAdminAccess() }), { wrapper })
}

async function signIn(getAuth: () => AuthContextValue, token: string): Promise<LoginResult> {
  fetchMock.mockResolvedValueOnce(jsonResponse({ token }))
  let result: LoginResult | undefined
  await act(async () => {
    result = await getAuth().login({ email: 'user@example.com', password: 'pw' })
  })
  if (!result) throw new Error('login did not resolve')
  return result
}

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(jsonResponse({ ok: true }))
  vi.stubGlobal('fetch', fetchMock)
  setStoredToken(null)
  setAuthTokenProvider(null)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  setStoredToken(null)
  setAuthTokenProvider(null)
})

describe('anonymous session (AC1)', () => {
  it('reports no user and no role before login', () => {
    const { result } = renderAuth()

    expect(result.current.user).toBeNull()
    expect(result.current.role).toBeUndefined()
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.isAuthenticating).toBe(false)
  })

  it('sends no Authorization header while anonymous', async () => {
    renderAuth()

    await http.get('product', '/api/v1/products')

    expect(lastRequestHeaders().Authorization).toBeUndefined()
  })

  it('fails loudly when read outside the provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/)
    } finally {
      consoleError.mockRestore()
    }
  })
})

describe('login (AC2)', () => {
  it('reports the authenticated user and role claim decoded from the JWT', async () => {
    const { result } = renderAuth()

    const outcome = await signIn(() => result.current, ADMIN_TOKEN)

    expect(outcome).toEqual({ ok: true, user: { id: 'user-2', role: 'ADMIN' } })
    expect(result.current.user).toEqual({ id: 'user-2', role: 'ADMIN' })
    expect(result.current.role).toBe('ADMIN')
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.isAuthenticating).toBe(false)
  })

  it('posts the credentials to user-service', async () => {
    const { result } = renderAuth()

    await signIn(() => result.current, CUSTOMER_TOKEN)

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toBe('http://localhost:8084/api/v1/auth/login')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({
      email: 'user@example.com',
      password: 'pw',
    })
  })

  it('hands the token to the HTTP client for later requests', async () => {
    const { result } = renderAuth()
    await signIn(() => result.current, CUSTOMER_TOKEN)

    await http.get('order', '/api/v1/orders')

    expect(lastRequestHeaders().Authorization).toBe(`Bearer ${CUSTOMER_TOKEN}`)
  })

  it('reports a rejected login and stays anonymous', async () => {
    const { result } = renderAuth()
    fetchMock.mockResolvedValueOnce(jsonResponse({ code: 'BAD_CREDENTIALS', message: 'Nope' }, 401))

    let outcome: LoginResult | undefined
    await act(async () => {
      outcome = await result.current.login({ email: 'user@example.com', password: 'wrong' })
    })

    expect(outcome).toEqual({
      ok: false,
      error: { status: 401, code: 'BAD_CREDENTIALS', message: 'Nope' },
    })
    expect(result.current.user).toBeNull()
    expect(result.current.role).toBeUndefined()
    expect(readStoredToken()).toBeNull()
  })

  it('refuses a 200 response whose token cannot be used as a session', async () => {
    const { result } = renderAuth()
    fetchMock.mockResolvedValueOnce(jsonResponse({ token: 'not-a-jwt' }))

    let outcome: LoginResult | undefined
    await act(async () => {
      outcome = await result.current.login({ email: 'user@example.com', password: 'pw' })
    })

    expect(outcome?.ok).toBe(false)
    expect(outcome?.ok === false && outcome.error.code).toBe('INVALID_AUTH_TOKEN')
    expect(result.current.isAuthenticated).toBe(false)
    expect(readStoredToken()).toBeNull()
  })

  it('leaves the role undefined when the token carries no recognizable role claim', async () => {
    const { result } = renderAuth()

    await signIn(() => result.current, makeJwt({ sub: 'user-3', role: 'SUPERUSER' }))

    expect(result.current.user).toEqual({ id: 'user-3', role: undefined })
    expect(result.current.role).toBeUndefined()
  })
})

describe('logout', () => {
  it('drops the session and stops sending the token', async () => {
    const { result } = renderAuth()
    await signIn(() => result.current, ADMIN_TOKEN)

    act(() => {
      result.current.logout()
    })

    expect(result.current.user).toBeNull()
    expect(result.current.role).toBeUndefined()
    expect(result.current.isAuthenticated).toBe(false)
    expect(readStoredToken()).toBeNull()

    await http.get('order', '/api/v1/orders')
    expect(lastRequestHeaders().Authorization).toBeUndefined()
  })
})

describe('admin role guard (AC3)', () => {
  it('denies a non-ADMIN user without navigating anywhere', async () => {
    const { result } = renderAuthWithAdminGuard()
    const locationBefore = window.location.href

    await signIn(() => result.current.auth, CUSTOMER_TOKEN)

    expect(result.current.auth.role).toBe('CUSTOMER')
    expect(result.current.guard).toEqual({ allowed: false, reason: 'INSUFFICIENT_ROLE' })
    expect(window.location.href).toBe(locationBefore)
  })

  it('denies an anonymous visitor with a distinguishable reason', () => {
    const { result } = renderHook(() => useAdminAccess(), { wrapper })

    expect(result.current).toEqual({ allowed: false, reason: 'UNAUTHENTICATED' })
  })

  it('allows an ADMIN user', async () => {
    const { result } = renderAuthWithAdminGuard()

    await signIn(() => result.current.auth, ADMIN_TOKEN)

    expect(result.current.guard).toEqual({ allowed: true })
  })

  it('denies again once that ADMIN logs out', async () => {
    const { result } = renderAuthWithAdminGuard()
    await signIn(() => result.current.auth, ADMIN_TOKEN)

    act(() => {
      result.current.auth.logout()
    })

    expect(result.current.guard).toEqual({ allowed: false, reason: 'UNAUTHENTICATED' })
  })

  it('denies a user whose role claim was unreadable', () => {
    expect(evaluateRoleAccess({ id: 'user-4', role: undefined }, 'ADMIN')).toEqual({
      allowed: false,
      reason: 'INSUFFICIENT_ROLE',
    })
  })
})

describe('page reload (AC4)', () => {
  it('does not persist the token where a reload could read it back', async () => {
    const { result } = renderAuth()

    await signIn(() => result.current, ADMIN_TOKEN)

    expect(readStoredToken()).toBe(ADMIN_TOKEN)
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
    expect(document.cookie).toBe('')
  })

  it('starts anonymous after a reload — the in-memory default, not a gap', async () => {
    const first = renderAuth()
    await signIn(() => first.result.current, ADMIN_TOKEN)
    expect(first.result.current.isAuthenticated).toBe(true)

    // A reload re-evaluates every module, which is exactly what empties the module-scoped
    // token store. Re-importing it with a reset registry reproduces that boot state.
    cleanup()
    vi.resetModules()
    const reloadedStore = await import('./tokenStore')
    expect(reloadedStore.readStoredToken()).toBeNull()

    // Mount a provider against that same fresh (empty) store: no session is restored.
    setStoredToken(null)
    const afterReload = renderAuth()

    expect(afterReload.result.current.user).toBeNull()
    expect(afterReload.result.current.role).toBeUndefined()
    expect(afterReload.result.current.isAuthenticated).toBe(false)
  })
})

describe('jwt claim decoding', () => {
  it('reads claims from a well-formed token', () => {
    expect(decodeJwtClaims(ADMIN_TOKEN)).toEqual({ sub: 'user-2', role: 'ADMIN' })
  })

  it('returns null for malformed tokens instead of throwing', () => {
    expect(decodeJwtClaims('')).toBeNull()
    expect(decodeJwtClaims('a.b')).toBeNull()
    expect(decodeJwtClaims('not-a-jwt')).toBeNull()
    expect(decodeJwtClaims('aaa.!!!!.bbb')).toBeNull()
    expect(decodeJwtClaims(`${base64Url({})}.${base64Url([1, 2])}.sig`)).toBeNull()
  })

  it('has no user when the token carries no subject', () => {
    expect(readUserFromToken(makeJwt({ role: 'ADMIN' }))).toBeNull()
    expect(readUserFromToken(makeJwt({ sub: '   ' }))).toBeNull()
  })

  it('accepts the userId claim as a fallback subject', () => {
    expect(readUserFromToken(makeJwt({ userId: 'user-9', role: 'customer' }))).toEqual({
      id: 'user-9',
      role: 'CUSTOMER',
    })
  })
})
