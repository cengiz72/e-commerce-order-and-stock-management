/**
 * Display text for a backend-owned status value.
 *
 * `'STOCK_RESERVED'` → `'Stock reserved'`.
 *
 * A single mechanical transform — separators become spaces, SCREAMING_CASE becomes sentence
 * case — and explicitly **not** a lookup table of known statuses. A table would be the hardcoded
 * enum `<StatusBadge>` must not have: order/payment statuses are server-owned and the set is
 * still open (postgre-schema.md A6/OQ2), so a status the backend adds tomorrow has to render
 * today without a code change here.
 *
 * Mixed-case input is left alone, on the assumption the backend already meant it that way.
 *
 * Lives outside `StatusBadge.tsx` so that file exports a component and nothing else
 * (React Fast Refresh / `react/only-export-components`).
 */
export function humanizeStatus(status: string): string {
  const spaced = status.replace(/[_-]+/g, ' ').trim()
  if (spaced === '') return status

  const isScreamingCase = spaced === spaced.toUpperCase()
  if (!isScreamingCase) return spaced

  const lowered = spaced.toLowerCase()
  return lowered.charAt(0).toUpperCase() + lowered.slice(1)
}
