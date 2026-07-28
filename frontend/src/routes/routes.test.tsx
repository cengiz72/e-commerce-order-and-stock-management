// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../hooks'
// Internal on purpose: seeding the module-scoped token is how a test starts already signed in
// without driving the login form first, and it is the same reset hook `hooks/auth`'s own tests
// use. Production code never imports it — the barrel does not export it.
import { setStoredToken } from '../hooks/auth/tokenStore'
import { setAuthTokenProvider } from '../services'
import { ROUTE_PATHS, appRoutes, createAppRouter } from './index'

/**
 * The route table is exercised through a memory router because nothing mounts it yet —
 * `main.tsx`/`App.tsx` are wired by the app-shell ticket. `<AuthProvider>` wraps the router
 * exactly as that ticket will wire it, so the guards read a real session rather than a mock.
 *
 * No user-service exists (backend/user-service holds only package-info.java files), so the one
 * test that signs in through the form stubs global `fetch`, like SCRUM-2/SCRUM-3 do. The JWTs
 * are hand-built and unsigned; nothing here verifies signatures.
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

/** Mount the real route table at `path`, under the session the caller seeded. */
function renderRouteAt(path: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  const view = render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
  return { router, ...view }
}

function heading(name: string | RegExp) {
  return screen.findByRole('heading', { name })
}

function currentPath(router: ReturnType<typeof createMemoryRouter>): string {
  return router.state.location.pathname
}

beforeEach(() => {
  fetchMock.mockReset()
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

describe('every route renders its placeholder page (AC1)', () => {
  const PUBLIC_ROUTES: ReadonlyArray<[string, string]> = [
    [ROUTE_PATHS.products, 'Products'],
    ['/products/sku-123', 'Product detail'],
    [ROUTE_PATHS.login, 'Sign in'],
    [ROUTE_PATHS.register, 'Create an account'],
  ]

  it.each(PUBLIC_ROUTES)('renders %s for an anonymous visitor', async (path, title) => {
    renderRouteAt(path)

    expect(await heading(title)).toBeTruthy()
  })

  const CUSTOMER_ROUTES: ReadonlyArray<[string, string]> = [
    [ROUTE_PATHS.cart, 'Cart'],
    [ROUTE_PATHS.checkout, 'Checkout'],
    [ROUTE_PATHS.orders, 'My orders'],
  ]

  it.each(CUSTOMER_ROUTES)('renders %s for a signed-in customer', async (path, title) => {
    setStoredToken(CUSTOMER_TOKEN)

    const { router } = renderRouteAt(path)

    expect(await heading(title)).toBeTruthy()
    expect(currentPath(router)).toBe(path)
  })

  it('renders the admin inventory panel for an ADMIN', async () => {
    setStoredToken(ADMIN_TOKEN)

    const { router } = renderRouteAt(ROUTE_PATHS.adminInventory)

    expect(await heading('Inventory admin')).toBeTruthy()
    expect(currentPath(router)).toBe(ROUTE_PATHS.adminInventory)
  })

  it('passes the product id through as an opaque string', async () => {
    renderRouteAt('/products/SKU-abc_1')

    expect(await screen.findByText('Product: SKU-abc_1')).toBeTruthy()
  })

  it('sends the storefront root to the product list', async () => {
    const { router } = renderRouteAt(ROUTE_PATHS.home)

    expect(await heading('Products')).toBeTruthy()
    await waitFor(() => expect(currentPath(router)).toBe(ROUTE_PATHS.products))
  })
})

describe('auth-only routes redirect an anonymous visitor to login (AC2)', () => {
  const GUARDED: ReadonlyArray<[string, string]> = [
    [ROUTE_PATHS.cart, 'Cart'],
    [ROUTE_PATHS.checkout, 'Checkout'],
    [ROUTE_PATHS.orders, 'My orders'],
  ]

  it.each(GUARDED)('redirects %s to the login page', async (path, blockedTitle) => {
    const { router } = renderRouteAt(path)

    expect(await heading('Sign in')).toBeTruthy()
    await waitFor(() => expect(currentPath(router)).toBe(ROUTE_PATHS.login))
    expect(screen.queryByRole('heading', { name: blockedTitle })).toBeNull()
  })

  it('remembers the blocked destination in history state', async () => {
    const { router } = renderRouteAt(ROUTE_PATHS.orders)

    await heading('Sign in')
    await waitFor(() => expect(router.state.location.state).toEqual({ from: ROUTE_PATHS.orders }))
  })

  it('replaces the blocked entry instead of pushing onto history', async () => {
    const { router } = renderRouteAt(ROUTE_PATHS.cart)

    await heading('Sign in')
    await waitFor(() => expect(currentPath(router)).toBe(ROUTE_PATHS.login))
    // A pushed redirect would leave the blocked URL behind for the Back button to bounce off.
    expect(router.state.historyAction).toBe('REPLACE')
  })

  it('redirects an anonymous visitor to the admin route to login as well', async () => {
    const { router } = renderRouteAt(ROUTE_PATHS.adminInventory)

    expect(await heading('Sign in')).toBeTruthy()
    await waitFor(() => expect(currentPath(router)).toBe(ROUTE_PATHS.login))
  })
})

describe('the admin route denies a signed-in non-ADMIN (AC3)', () => {
  it('sends a CUSTOMER to the storefront, not to the login form', async () => {
    setStoredToken(CUSTOMER_TOKEN)

    const { router } = renderRouteAt(ROUTE_PATHS.adminInventory)

    expect(await heading('Products')).toBeTruthy()
    await waitFor(() => expect(currentPath(router)).toBe(ROUTE_PATHS.products))
    // The distinction that matters: they are already signed in, so re-authenticating would
    // not help — INSUFFICIENT_ROLE must not land them on the login page like AC2 does.
    expect(screen.queryByRole('heading', { name: 'Sign in' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Inventory admin' })).toBeNull()
  })

  it('denies a session whose role claim was unreadable', async () => {
    setStoredToken(makeJwt({ sub: 'user-3', role: 'SUPERUSER' }))

    const { router } = renderRouteAt(ROUTE_PATHS.adminInventory)

    expect(await heading('Products')).toBeTruthy()
    await waitFor(() => expect(currentPath(router)).toBe(ROUTE_PATHS.products))
  })
})

describe('signing in returns the user to the route they were blocked from (AC4)', () => {
  async function submitLogin(email: string, password: string) {
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
  }

  it('lands on the previously blocked page after a successful login', async () => {
    const { router } = renderRouteAt(ROUTE_PATHS.checkout)
    await heading('Sign in')
    fetchMock.mockResolvedValueOnce(jsonResponse({ token: CUSTOMER_TOKEN }))

    await submitLogin('shopper@example.com', 'pw')

    expect(await heading('Checkout')).toBeTruthy()
    await waitFor(() => expect(currentPath(router)).toBe(ROUTE_PATHS.checkout))
    expect(screen.queryByRole('heading', { name: 'Sign in' })).toBeNull()
  })

  it('reaches the admin panel when the blocked route needed ADMIN and the user is one', async () => {
    const { router } = renderRouteAt(ROUTE_PATHS.adminInventory)
    await heading('Sign in')
    fetchMock.mockResolvedValueOnce(jsonResponse({ token: ADMIN_TOKEN }))

    await submitLogin('admin@example.com', 'pw')

    expect(await heading('Inventory admin')).toBeTruthy()
    await waitFor(() => expect(currentPath(router)).toBe(ROUTE_PATHS.adminInventory))
  })

  it('falls back to the storefront when nothing blocked the visitor', async () => {
    const { router } = renderRouteAt(ROUTE_PATHS.login)
    await heading('Sign in')
    fetchMock.mockResolvedValueOnce(jsonResponse({ token: CUSTOMER_TOKEN }))

    await submitLogin('shopper@example.com', 'pw')

    expect(await heading('Products')).toBeTruthy()
    await waitFor(() => expect(currentPath(router)).toBe(ROUTE_PATHS.products))
  })

  it('stays on the form and reports the error when login is rejected', async () => {
    const { router } = renderRouteAt(ROUTE_PATHS.cart)
    await heading('Sign in')
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ code: 'BAD_CREDENTIALS', message: 'Invalid email or password' }, 401),
    )

    await submitLogin('shopper@example.com', 'wrong')

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Invalid email or password',
    )
    expect(currentPath(router)).toBe(ROUTE_PATHS.login)
    expect(screen.queryByRole('heading', { name: 'Cart' })).toBeNull()
  })
})

describe('mounting the route table (app-shell hand-off)', () => {
  it('builds a browser router over the same routes the tests exercise', () => {
    const router = createAppRouter()

    try {
      expect(router.routes).toHaveLength(appRoutes.length)
    } finally {
      router.dispose()
    }
  })
})
