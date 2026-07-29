import { createBrowserRouter, Navigate, Outlet } from 'react-router'
import type { RouteObject } from 'react-router'
import { AdminInventoryPage } from '../features/admin'
import { LoginPage, RegisterPage } from '../features/auth'
import { CartPage, CheckoutPage } from '../features/cart'
import { OrderTrackingPage } from '../features/orders'
import { ProductDetailPage, ProductListPage } from '../features/products'
import { RequireAdmin, RequireAuth } from './guards'
import { ROUTE_PATHS } from './paths'
import { RouteErrorFallback } from './routeError'

/**
 * The application's route table (docs/frontend-architecture.md §3.8, A10).
 *
 * Route definitions live here; page content lives in the owning `features/*` folder, and the
 * access rules live in `guards.tsx`. This module only says *which URL shows what, behind
 * which guard*.
 *
 * It is exported as data and mounted by the app shell (`App.tsx`) as
 *
 * ```tsx
 * <AuthProvider>
 *   <RouterProvider router={createAppRouter()} />
 * </AuthProvider>
 * ```
 *
 * `<AuthProvider>` must sit **above** the router: every guard here reads the session through
 * `useAuth()`, which throws when no provider is present.
 *
 * Router library: React Router, chosen as the documented fallback while OQ3 (routing approach)
 * is unresolved. Only this file, `guards.tsx` and `routeError.tsx` import it.
 */

/** The pages, in the order a visitor meets them. Wrapped by {@link appRoutes}. */
const pageRoutes: RouteObject[] = [
  // `/` owns no page of its own; the storefront list is the real landing surface.
  { path: ROUTE_PATHS.home, element: <Navigate to={ROUTE_PATHS.products} replace /> },

  // Public.
  { path: ROUTE_PATHS.products, element: <ProductListPage /> },
  { path: ROUTE_PATHS.productDetail, element: <ProductDetailPage /> },
  { path: ROUTE_PATHS.login, element: <LoginPage /> },
  { path: ROUTE_PATHS.register, element: <RegisterPage /> },

  // Signed-in only.
  {
    path: ROUTE_PATHS.cart,
    element: (
      <RequireAuth>
        <CartPage />
      </RequireAuth>
    ),
  },
  {
    path: ROUTE_PATHS.checkout,
    element: (
      <RequireAuth>
        <CheckoutPage />
      </RequireAuth>
    ),
  },
  {
    path: ROUTE_PATHS.orders,
    element: (
      <RequireAuth>
        <OrderTrackingPage />
      </RequireAuth>
    ),
  },

  // ADMIN only. `RequireAdmin` alone is enough — it already denies anonymous visitors, with a
  // distinguishable reason, so nesting it inside `RequireAuth` would be redundant.
  {
    path: ROUTE_PATHS.adminInventory,
    element: (
      <RequireAdmin>
        <AdminInventoryPage />
      </RequireAdmin>
    ),
  },
]

/**
 * The mounted route table: every page above, behind one shared error element.
 *
 * The wrapper is a **pathless layout route** — it matches no URL of its own and renders only an
 * `<Outlet />`, so it changes nothing about which URL shows what. It exists because React Router
 * catches route render errors in its **own** boundary before they can reach the shell's
 * `ErrorBoundary`, and without an `errorElement` it falls back to its built-in "Unexpected
 * Application Error!" stack-trace screen. One wrapper gives every page the app's own fallback;
 * see `routeError.tsx`.
 */
export const appRoutes: RouteObject[] = [
  {
    element: <Outlet />,
    errorElement: <RouteErrorFallback />,
    children: pageRoutes,
  },
]

/**
 * Build the browser router for the real app. Kept a factory rather than a module-level
 * constant so importing the route table never touches `window.history` as a side effect
 * (tests build a memory router from {@link appRoutes} instead).
 */
export function createAppRouter() {
  return createBrowserRouter(appRoutes)
}
