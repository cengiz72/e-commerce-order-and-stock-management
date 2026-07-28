/**
 * Placeholder for the cart view (docs/frontend-architecture.md §3.2).
 *
 * Routing skeleton only (SCRUM-4): no cart lines, no `cartService` call. The cart is
 * server-authoritative in Redis (`cart:{userId}`), which is why this route is signed-in-only.
 */
export function CartPage() {
  return (
    <section>
      <h1>Cart</h1>
      <p>Cart contents arrive in Phase 2.</p>
    </section>
  )
}
