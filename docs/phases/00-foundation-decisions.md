# Phase 0 — Foundation Decisions

## Goal

Resolve the three ADR-flagged open questions that every later phase depends on: the
state-management/data-fetching stack, JWT storage & session lifecycle, and the routing library.
No frontend code is written in this phase — its output is one or more accepted ADRs under
`docs/adr/` that phases 1–6 build against.

## Depends on

None. This is the entry point.

## Backend surfaces touched

None directly. OQ2 (JWT storage) requires confirming with user-service whether a
refresh/`/me` endpoint and httpOnly-cookie issuance exist or need to be requested as a backend
change — that confirmation is part of this phase's work, not a code change.

## Scope

- **OQ1 — State-management & data-fetching libraries** (frontend-architecture.md §4 item 2, A1/A3).
  Decide: server-state/data-fetching cache (TanStack Query / RTK Query / SWR / hand-rolled) and
  client-only UI state approach (Context + reducer / Zustand / Redux Toolkit), plus native
  `fetch` vs `axios` for the shared HTTP client. Each is a new dependency and needs justification
  per CLAUDE.md ("Do not introduce new dependencies without explaining why").
- **OQ2 — JWT storage & session lifecycle** (§4 item 3, A4/A5). Decide: in-memory only,
  `localStorage`, or in-memory + httpOnly-cookie/refresh. Confirm with backend whether
  user-service exposes (or should expose) a cookie-setting login/refresh endpoint. Security-
  sensitive — pin the posture before any auth code exists.
- **OQ3 — Routing approach** (A10). Decide: React Router vs a file-based router vs TanStack
  Router. New dependency — needs justification.
- Write one ADR per decision under `docs/adr/` (copy `docs/adr/0000-template.md`), following the
  existing numbering (next available after `0001-saga-pattern-for-rollback.md`).

## Open questions to resolve in/before this phase

- OQ1, OQ2, OQ3 (frontend-architecture.md §1 "Open Questions" and §4 items 2–3) — all three must
  reach an "Accepted" ADR status before Phase 1 starts, since the app shell (providers, HTTP
  client, router, auth bootstrap) is built directly on these choices.

## Out of scope

- No `frontend/src/` code, no `package.json` dependency installs — this phase only decides and
  records the decision. Installing the chosen libraries happens at the start of Phase 1.
- OQ4 (async order-flow observation), OQ5 (cart sync/guest cart), OQ6 (admin forms), OQ7
  (services granularity), OQ8 (payment touchpoint), OQ9 (loading/error UX) are **not** blocking
  for the shell and are deferred to the phases that need them (5, 4, 6, 2, 5, 1 respectively).

## Exit criteria

- Three ADRs exist under `docs/adr/`, status `Accepted`, each naming the chosen library/approach
  and the rejected alternatives with rationale.
- `docs/frontend-architecture.md` OQ1–OQ3 can be marked resolved (link to the ADRs) when the doc
  is next touched — not required by this phase, but the ADRs are the source of truth going
  forward.
