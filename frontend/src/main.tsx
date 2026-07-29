import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { createAppRouter } from './routes'

/**
 * Application entry point (docs/frontend-architecture.md §3.8).
 *
 * This file does the two things only the real browser may do — build the history-backed router
 * and mount React into the DOM — and nothing else. The provider composition itself lives in
 * `App.tsx`, so it can be exercised by tests without a `document` or a `window.history`.
 *
 * NOTE — the **server-state / data-fetching cache provider** that
 * docs/phases/01-app-shell-and-core-infrastructure.md lists for this bootstrap is deliberately
 * NOT wired, because OQ1 (which cache library) has no accepted ADR under `docs/adr/`:
 * docs/phases/00-foundation-decisions.md required one, and only the routing ADR (0002) was ever
 * written. It is deferred, not dropped — the full rationale, and the exact place it plugs into,
 * are in `App.tsx`.
 */

const container = document.getElementById('root')
if (!container) {
  // index.html owns this element; failing loudly beats silently rendering nothing.
  throw new Error('Root container #root was not found in the document')
}

createRoot(container).render(
  <StrictMode>
    <App router={createAppRouter()} />
  </StrictMode>,
)
