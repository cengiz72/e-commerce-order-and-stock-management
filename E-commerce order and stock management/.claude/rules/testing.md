---
paths:
  - "backend/**/src/test/**/*.java"
  - "frontend/src/**/*.test.ts"
  - "frontend/src/**/*.test.tsx"
---

# Testing Rules

- Add or update tests for every behavior change; prefer tests that describe behavior, not implementation.
- Backend: `./mvnw test` (single test: `./mvnw test -Dtest=ClassName#methodName`).
- Frontend: `npm run test` (inside `frontend/`).
- Run only the affected module's tests after a change, not the full suite.
- Kafka consumers must have tests proving idempotency (processing the same event twice must not corrupt data).
- When diagnosing a bug, add a regression test before or alongside the fix.
- Do not suppress or skip failing tests to make a change look complete.
