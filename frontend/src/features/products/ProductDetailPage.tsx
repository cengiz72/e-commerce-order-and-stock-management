import { useParams } from 'react-router'

/**
 * Placeholder for a single product's detail view (docs/frontend-architecture.md §3.1).
 *
 * Routing skeleton only (SCRUM-4): it reads the route param to prove the URL wiring, and
 * fetches nothing. `productId` is an opaque backend-owned string (docs/mongodb-schema.md
 * §3.1) — never parsed as a number.
 */
export function ProductDetailPage() {
  const { productId } = useParams()

  return (
    <section>
      <h1>Product detail</h1>
      <p>Product: {productId}</p>
      <p>Product details and reviews arrive in Phase 2.</p>
    </section>
  )
}
