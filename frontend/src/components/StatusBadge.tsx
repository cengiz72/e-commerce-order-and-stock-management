import type { ReactNode } from 'react'
import { cx } from './classNames'
import { humanizeStatus } from './statusLabel'

/**
 * Renders a backend-owned status value — order status, payment status, product status
 * (docs/frontend-architecture.md §3.3, §3.5).
 *
 * ## Why `status` is an open `string`
 *
 * The order lifecycle is **server-owned and not finalized** (postgre-schema.md A6/OQ2: the
 * `PENDING → STOCK_RESERVED / STOCK_REJECTED → PAID → CANCELLED` set is still an assumption),
 * and it advances asynchronously through Kafka where the browser can only observe the result.
 * A union type or a `switch` over known values here would mean this component starts rendering
 * blanks — or crashing — the day the backend adds a status. So:
 *
 * - `status` is typed `string`, not a union;
 * - there is **no** status → colour map, because that map would be exactly the hardcoded enum
 *   this component must not have. A caller that knows what a status means may pass `tone`;
 *   otherwise every status renders in the neutral tone;
 * - the raw value is preserved in `data-status`, so styling/tests can key off the exact string
 *   the backend returned even though the visible label is prettified.
 *
 * This component also encodes **no transition graph**: it renders one status, never a sequence,
 * and knows nothing about what may follow.
 */
export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export interface StatusBadgeProps {
  /** Whatever the backend returned, e.g. `'STOCK_RESERVED'`. Unknown values render fine. */
  status: string
  /**
   * Visible text override, for when a feature has its own copy for a status it recognizes.
   * Defaults to a generic prettification of `status` (see {@link humanizeStatus}).
   */
  label?: ReactNode
  /**
   * Visual emphasis. Intentionally *not* derived from `status` — see the note above. Defaults to
   * `'neutral'`.
   */
  tone?: StatusTone
  className?: string
}

export function StatusBadge({ status, label, tone = 'neutral', className }: StatusBadgeProps) {
  return (
    <span
      className={cx('ui-status-badge', `ui-status-badge--${tone}`, className)}
      data-status={status}
    >
      {label ?? humanizeStatus(status)}
    </span>
  )
}
