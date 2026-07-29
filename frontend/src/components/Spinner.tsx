import { cx } from './classNames'

/**
 * Busy indicator for work that has no measurable progress (docs/frontend-architecture.md §3.5).
 *
 * Use for short, bounded waits (a submit in flight). Prefer `<Skeleton>` when the shape of the
 * content that is arriving is already known — it causes less layout shift.
 */
export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  /**
   * Accessible name announced to screen readers. `null` marks the spinner decorative — use that
   * only when a visible sibling already says what is loading (e.g. inside `<Button loading>`).
   */
  label?: string | null
  className?: string
}

export function Spinner({ size = 'md', label = 'Loading', className }: SpinnerProps) {
  const classes = cx('ui-spinner', `ui-spinner--${size}`, className)

  if (label === null) {
    return <span aria-hidden="true" className={classes} />
  }

  return <span role="status" aria-label={label} className={classes} />
}
