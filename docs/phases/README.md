# Frontend Implementation Phases

Implementation roadmap for the React 18 + Vite + TypeScript frontend, derived from
[frontend-architecture.md](../frontend-architecture.md). That document is a design-only spec
(facts, assumptions A1–A12, open questions OQ1–OQ9, per-module designs §3.1–§3.8); these phase
files turn it into an ordered, buildable sequence. `frontend/` is currently empty — this is
greenfield work.

One file per phase, named `NN-short-title.md`. Phases are ordered by build dependency, not by
the module order in the source spec: foundational decisions and shared infrastructure must exist
before any feature; `products` has no auth dependency so it ships first; `cart` and `orders`
need auth plumbing and async-flow observation; `admin` needs the role guard from the shell.

| # | Phase | Depends on |
|---|---|---|
| 0 | [Foundation decisions](00-foundation-decisions.md) — resolve OQ1/OQ2/OQ3 (state/data-fetching libs, JWT storage, routing) | none |
| 1 | [App shell & core infrastructure](01-app-shell-and-core-infrastructure.md) — `main.tsx`, providers, HTTP client, routing skeleton, auth bootstrap, shared `components/` | Phase 0 |
| 2 | [Services layer](02-services-layer.md) — `productService`, `userService`, `orderService`, `paymentService`, `cartService`, DTOs | Phase 1 |
| 3 | [Products feature](03-products-feature.md) — list/search/detail | Phase 2 |
| 4 | [Cart feature](04-cart-feature.md) — cart view/mutations, checkout kickoff | Phase 2, 3 |
| 5 | [Orders feature](05-orders-feature.md) — order tracking, async Kafka-flow observation | Phase 2, 4 |
| 6 | [Admin feature](06-admin-feature.md) — inventory/catalog panel | Phase 1, 2 |

Each phase file states its goal, what backend surfaces it touches, its concrete scope, which
open questions from `frontend-architecture.md` it must resolve, what's explicitly out of scope,
and its exit criteria. Per CLAUDE.md, work one phase at a time, review the diff before moving on,
and run only the affected module's tests after each change.
