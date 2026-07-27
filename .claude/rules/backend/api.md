---
paths:
  - "src/main/**/*.java"
---

# API Rules

- Validate request input at the boundary.
- Return the shared error response shape.
- Keep database access behind the repository/service layer.
- Add or update tests for behavior changes.