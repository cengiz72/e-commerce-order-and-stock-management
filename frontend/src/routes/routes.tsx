import { createBrowserRouter, Navigate } from 'react-router'
import type { RouteObject } from 'react-router'
import { AdminInventoryPage } from '../features/admin'
import { LoginPage, RegisterPage } from '../features/auth'
import { CartPage, CheckoutPage } from '../features/cart'
import { OrderTrackingPage } from '../features/orders'
import { ProductDetailPage, ProductListPage } from '../features/products'
import { RequireAdmin, RequireAuth } from './guards'
import { ROUTE_PATHS } from './paths'

/**
 * The application's route table (docs/frontend-architecture.md §3.8, A10).
 *
 * Route definitions live here; page content lives in the owning `features/*` folder, and the
 * access rules live in `guards.tsx`. This module only says *which URL shows what, behind
 * which guard*.
 *
 * It is exported as data and **not mounted anywhere yet**: `main.tsx`/`App.tsx` are untouched
 * by this ticket. The app-shell ticket mounts it as
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
 * is unresolved. Only this file and `guards.tsx` import it, so switching costs two files.
 */
export const appRoutes: RouteObject[] = [
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
 * Build the browser router for the real app. Kept a factory rather than a module-level
 * constant so importing the route table never touches `window.history` as a side effect
 * (tests build a memory router from {@link appRoutes} instead).
 */
export function createAppRouter() {
  return createBrowserRouter(appRoutes)
}
