/**
 * Placeholder for the inventory admin panel (docs/frontend-architecture.md §3.4).
 *
 * Routing skeleton only (SCRUM-4): nothing is listed or edited yet. Reachable only by an
 * `ADMIN` session — client-side gating for UX, with the real authorization server-side (A5).
 *
 * When it is built it edits the **catalog stock display counter**, not the transactional
 * reservation ledger; what exactly it may change depends on the still-open inventory-placement
 * decision (docs/postgre-schema.md §4 item 1).
 */
export function AdminInventoryPage() {
  return (
    <section>
      <h1>Inventory admin</h1>
      <p>Catalog and stock administration arrives in Phase 2.</p>
    </section>
  )
}
