---
paths:
  - "backend/**/*.java"
  - "frontend/src/**/*.ts"
  - "frontend/src/**/*.tsx"
---

# Code Style Rules

- Backend: layered architecture (Controller → Service → Repository); keep DTOs separate from entities.
- Backend: prefer Lombok `@Getter`/`@Setter` over `@Data` for mutability control.
- Frontend: functional components and hooks only, no class components.
- Frontend: API calls live under `services/`, never inside components.
- Keep business logic separate from UI/framework glue.
- Commit messages use Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`.
