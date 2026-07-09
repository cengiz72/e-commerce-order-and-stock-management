# Kafka Event Schemas

One schema file per topic, named `{topic}.json` (JSON Schema) or `{topic}.avsc` (Avro), matching the topic name in `docs/kafka-topics.md`.

Rules:
- Never produce an event without a schema defined here.
- Treat schema changes as breaking unless purely additive (new optional field).
- Consumers must be idempotent regardless of schema version.
