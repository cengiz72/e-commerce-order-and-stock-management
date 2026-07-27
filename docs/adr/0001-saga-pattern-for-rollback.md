# 0001. Use the Saga pattern for cross-service rollback

Status: Accepted

## Context

The order flow (order creation → stock check → payment → notification) spans multiple
independently owned services (order-service, product-service, payment-service,
notification-service) communicating asynchronously through Kafka, with no synchronous
calls between them and no shared database transaction. If a later step fails (e.g.
payment fails after stock was already reserved), earlier steps need to be undone
explicitly — there is no distributed transaction to roll back automatically.

## Decision

Use the **Saga pattern** (choreography-based, consistent with the existing
event-driven/Kafka architecture) to handle rollback:

- Each service performs its local step and publishes a success or failure event.
- On failure, downstream/upstream services react to the failure event by executing a
  **compensating action** that undoes their own local step, instead of any service
  reaching into another service's data store.
- Example chain: `order.created` → `stock.reserved` (product-service) → payment
  attempted → on `payment.failed`, product-service consumes it and compensates with
  `stock.released`, order-service consumes it and transitions the order to
  `CANCELLED`.
- Every compensating event follows the same rules as forward events: named
  `{domain}.{event}`, schema defined under `docs/kafka-schemas/`, and consumers must be
  idempotent (see `docs/kafka-topics.md`).

## Consequences

- No new synchronous coupling between services; rollback stays event-driven, matching
  the current architecture.
- Each service must implement and maintain a compensating action for every local step
  that has a side effect worth undoing (stock reservation, payment charge, etc.).
- Failure/compensation events (e.g. `stock.reserved` / `stock.rejected`,
  `payment.failed`) need to be added to `docs/kafka-topics.md` and given schemas under
  `docs/kafka-schemas/` as they are implemented.
- Consistency is eventual, not immediate — there will be a window where the system is
  in a partially-completed state before compensation runs.
