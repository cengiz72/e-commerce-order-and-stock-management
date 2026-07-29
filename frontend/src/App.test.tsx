// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router'
import type { DataRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App, { AppShell } from './App'
import { useAuth, useToast } from './hooks'
// Internal on purpose: seeding the module-scoped token is how a test starts already signed in
// without driving the login form first. Production code never imports it — the barrel does not
// export it. Same hook `routes/routes.test.tsx` uses.
import { setStoredToken } from './hooks/auth/tokenStore'
import { ROUTE_PATHS, appRoutes, createAppRouter } from './routes'
import { setAuthTokenProvider } from './services'

/**
 * The app shell's acceptance criteria, exercised through the **real** provider composition.
 *
 * `routes/routes.test.tsx` already proves the route table and the guards in isolation; this file
 * proves what that ticket could not: that `App`/`AppShell` actually mount them, in the right
 * order, with the error boundary and the toaster active. Every test here therefore renders
 * `App`/`AppShell` rather than re-assembling providers by hand.
 *
 * `npm run dev` cannot be driven from this environment, so "boots with no console errors" (AC1)
 * is asserted by mounting the real browser router in jsdom and failing on any `console.error`.
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

/** Mount the whole app at `path`, under whatever session the caller seeded. */
function renderAppAt(path: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  return { router, ...render(<App router={router} />) }
}

function heading(name: string | RegExp) {
  return screen.findByRole('heading', { name })
}

function currentPath(router: DataRouter): string {
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
  vi.restoreAllMocks()
  setStoredToken(null)
  setAuthTokenProvider(null)
})

describe('the shell boots to the routed app (AC1)', () => {
  it('mounts the real browser router without logging an error', async () => {
    // `createAppRouter()` reads `window.location`, so pin it first: another test may have
    // navigated this jsdom window.
    window.history.replaceState({}, '', ROUTE_PATHS.home)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const router = createAppRouter()

    try {
      render(<App router={router} />)

      // `/` redirects to the storefront, which is the app's real landing surface.
      expect(await heading('Products')).toBeTruthy()
      expect(consoleError).not.toHaveBeenCalled()
    } finally {
      cleanup()
      router.dispose()
    }
  })
})

describe('all eight placeholder routes render inside the shell (AC2)', () => {
  const ROUTES: ReadonlyArray<[path: string, title: string, token: string | null]> = [
    [ROUTE_PATHS.products, 'Products', null],
    ['/products/sku-123', 'Product detail', null],
    [ROUTE_PATHS.login, 'Sign in', null],
    [ROUTE_PATHS.register, 'Create an account', null],
    [ROUTE_PATHS.cart, 'Cart', CUSTOMER_TOKEN],
    [ROUTE_PATHS.checkout, 'Checkout', CUSTOMER_TOKEN],
    [ROUTE_PATHS.orders, 'My orders', CUSTOMER_TOKEN],
    [ROUTE_PATHS.adminInventory, 'Inventory admin', ADMIN_TOKEN],
  ]

  it.each(ROUTES)('renders %s', async (path, title, token) => {
    setStoredToken(token)

    const { router } = renderAppAt(path)

    // No "must be used within a provider" throw: reaching the page at all means `AuthProvider`
    // sits above the router, since every guarded element here calls `useAuth()`.
    expect(await heading(title)).toBeTruthy()
    expect(currentPath(router)).toBe(path)
  })

  it('covers every route the table defines', () => {
    // Guards against this list silently drifting from `routes/routes.tsx`. The table nests every
    // page under one pathless error-handling wrapper, and holds one extra child — `/`, which owns
    // no page and only redirects.
    expect(appRoutes).toHaveLength(1)
    expect(appRoutes[0].children).toHaveLength(ROUTES.length + 1)
  })
})

describe('signing in and out flips access to guarded routes (AC3)', () => {
  /** A stand-in for the sign-out control a later ticket puts in the app chrome. */
  function SignOutButton() {
    const { logout } = useAuth()
    return (
      <button type="button" onClick={logout}>
        Sign out
      </button>
    )
  }

  it('lets a signed-in customer reach order tracking, and bounces them once signed out', async () => {
    setStoredToken(CUSTOMER_TOKEN)
    const router = createMemoryRouter(appRoutes, { initialEntries: [ROUTE_PATHS.orders] })
    // Both children sit under the shell's `AuthProvider`, which is the point: the sign-out
    // control and the guards read one session.
    render(
      <AppShell>
        <SignOutButton />
        <RouterProvider router={router} />
      </AppShell>,
    )
    expect(await heading('My orders')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await heading('Sign in')).toBeTruthy()
    await waitFor(() => expect(currentPath(router)).toBe(ROUTE_PATHS.login))
    expect(screen.queryByRole('heading', { name: 'My orders' })).toBeNull()
  })

  it('lets a login through the shell open the route the visitor was blocked from', async () => {
    const { router } = renderAppAt(ROUTE_PATHS.checkout)
    expect(await heading('Sign in')).toBeTruthy()
    fetchMock.mockResolvedValueOnce(jsonResponse({ token: CUSTOMER_TOKEN }))

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'shopper@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pw' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await heading('Checkout')).toBeTruthy()
    await waitFor(() => expect(currentPath(router)).toBe(ROUTE_PATHS.checkout))
  })
})

describe('the top-level error boundary catches a render error (AC4)', () => {
  function Boom(): never {
    throw new Error('render exploded')
  }

  beforeEach(() => {
    // React logs every caught render error itself; silence it so a passing test stays readable.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('shows the fallback instead of a blank screen', async () => {
    render(
      <AppShell>
        <Boom />
      </AppShell>,
    )

    const fallback = await screen.findByRole('alert')
    expect(fallback.textContent).toContain('Something went wrong')
    expect(fallback.textContent).toContain('render exploded')
  })

  it('reports the error to the console sink rather than swallowing it', async () => {
    render(
      <AppShell>
        <Boom />
      </AppShell>,
    )
    await screen.findByRole('alert')

    expect(console.error).toHaveBeenCalledWith(
      'Unhandled render error',
      expect.objectContaining({ message: 'render exploded' }),
      expect.anything(),
    )
  })

  it('shows the app fallback — not React Router’s stack-trace screen — when a page throws', async () => {
    // React Router catches route render errors in its own boundary before this shell's
    // `ErrorBoundary` can see them, so the route table carries an `errorElement`. Without it a
    // broken page renders React Router's developer screen ("Unexpected Application Error!").
    // The real wrapper route, with its pages swapped for one that blows up — so this exercises
    // the shipped error wiring rather than a replica of it.
    const router = createMemoryRouter(
      [
        {
          element: appRoutes[0].element,
          errorElement: appRoutes[0].errorElement,
          children: [{ path: ROUTE_PATHS.home, element: <Boom /> }],
        },
      ],
      { initialEntries: [ROUTE_PATHS.home] },
    )
    render(<App router={router} />)

    const fallback = await screen.findByRole('alert')
    expect(fallback.textContent).toContain('This page could not be displayed')
    expect(fallback.textContent).toContain('render exploded')
    expect(screen.queryByText(/Unexpected Application Error/)).toBeNull()
    // The way out of a broken page is a navigation, since a route error is not resettable
    // in place.
    expect(screen.getByRole('link', { name: 'Go to the product list' })).toBeTruthy()
  })

  it('recovers when the fallback is retried', async () => {
    let shouldThrow = true
    function Flaky() {
      if (shouldThrow) throw new Error('render exploded')
      return <p>recovered</p>
    }
    render(
      <AppShell>
        <Flaky />
      </AppShell>,
    )
    await screen.findByRole('alert')

    shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('recovered')).toBeTruthy()
  })
})

describe('the toaster is wired into the shell', () => {
  function ToastTrigger() {
    const { showToast } = useToast()
    return (
      <button type="button" onClick={() => showToast({ message: 'Saved' })}>
        Notify
      </button>
    )
  }

  it('lets anything under the shell raise a toast', async () => {
    render(
      <AppShell>
        <ToastTrigger />
      </AppShell>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Notify' }))

    // `toContain`, not equality: the toast's text also carries its dismiss button.
    expect((await screen.findByRole('status')).textContent).toContain('Saved')
  })
})
