/**
 * Placeholder for order tracking (docs/frontend-architecture.md §3.3).
 *
 * Routing skeleton only (SCRUM-4): no order list, no status polling. This is the surface where
 * the async Kafka-driven flow eventually becomes visible, by re-reading `orders.status` from
 * order-service (A6) — how that observation should really work is still open (OQ4).
 */
export function OrderTrackingPage() {
  return (
    <section>
      <h1>My orders</h1>
      <p>Order tracking arrives in Phase 2.</p>
    </section>
  )
}
