/**
 * Every URL the app answers to, in one place (docs/frontend-architecture.md §3.8, A10).
 *
 * Route *paths* are kept apart from the route *table* (`routes.tsx`) and from page content so
 * that a link can name a destination without importing a page component — and so the router
 * library stays an implementation detail of `routes/` (OQ3 is still open; only `routes.tsx`
 * and `guards.tsx` touch react-router).
 */
export const ROUTE_PATHS = {
  /** Storefront entry; redirects to the product list rather than owning a page of its own. */
  home: '/',
  products: '/products',
  productDetail: '/products/:productId',
  cart: '/cart',
  checkout: '/checkout',
  orders: '/orders',
  adminInventory: '/admin/inventory',
  login: '/login',
  register: '/register',
} as const

export type RoutePathKey = keyof typeof ROUTE_PATHS

/**
 * Build a product-detail URL.
 *
 * `productId` is an opaque backend-owned string (docs/mongodb-schema.md §3.1) — never a number
 * and never minted here — so it is encoded rather than interpolated raw.
 */
export function productDetailPath(productId: string): string {
  return `${ROUTE_PATHS.products}/${encodeURIComponent(productId)}`
}
