## Description
<what and why>

## Scope
In scope:
- ...
Out of scope:
- ...

## Affected Components
- Service(s): <order-service / product-service / payment-service / notification-service / user-service / frontend / none>
- Kafka topic(s) involved: <or "none">
- DB migration required: <yes/no>

## Acceptance Criteria
1. Given ..., when ..., then ...
2. ...

## Technical Notes
<constraints, patterns to follow, references to existing code>

## Definition of Done
- [ ] Code implemented following existing layering (Controller → Service → Repository)
- [ ] Unit tests added/updated and passing
- [ ] No unrelated files changed
- [ ] Migration added (if schema changed), named V{n}__description.sql
- [ ] Kafka topic/schema updated in docs/kafka-topics.md (if applicable)
- [ ] Manually verified with docker compose up -d locally