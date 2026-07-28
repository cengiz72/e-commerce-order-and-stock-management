/**
 * Placeholder for checkout / order placement (docs/frontend-architecture.md §3.2).
 *
 * Routing skeleton only (SCRUM-4): it places no order. This route is the boundary where the
 * synchronous world (cart in Redis) hands off to the asynchronous one (the Kafka order Saga),
 * after which progress is only observable through order tracking.
 */
export function CheckoutPage() {
  return (
    <section>
      <h1>Checkout</h1>
      <p>Order placement arrives in Phase 2.</p>
    </section>
  )
}
