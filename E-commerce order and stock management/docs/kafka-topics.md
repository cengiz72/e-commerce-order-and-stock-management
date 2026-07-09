# Kafka Topics

Naming convention: `{domain}.{event}`

Every topic must have a schema under `docs/kafka-schemas/`, and every consumer must be idempotent.

| Topic | Producer | Consumer(s) | Schema |
|---|---|---|---|
| `order.created` | order-service | product-service, payment-service, notification-service | `docs/kafka-schemas/order.created.json` |
| `payment.completed` | payment-service | order-service, notification-service | `docs/kafka-schemas/payment.completed.json` |

> TODO: add the remaining topics for the stock-check step of the order flow (e.g. `stock.reserved` / `stock.rejected`) once that event is implemented.

Update this table whenever a new topic is added, per the Kafka Rules in `CLAUDE.md`.
