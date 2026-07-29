import { cx } from './classNames'

/**
 * Placeholder block shown while content loads (docs/frontend-architecture.md §3.5).
 *
 * Always `aria-hidden`: a skeleton is a visual stand-in, and announcing it would read as noise.
 * The surrounding region is responsible for telling assistive tech that it is busy (e.g.
 * `<DataTable loading>` marks its body `aria-busy`).
 */
export interface SkeletonProps {
  /** Number of stacked placeholder bars. */
  lines?: number
  /** CSS length for the bar width, e.g. `'12ch'`. Defaults to full width. */
  width?: string
  /** CSS length for a single bar's height. */
  height?: string
  className?: string
}

export function Skeleton({ lines = 1, width, height, className }: SkeletonProps) {
  return (
    <span aria-hidden="true" className={cx('ui-skeleton', className)}>
      {Array.from({ length: Math.max(1, lines) }, (_unused, index) => (
        <span key={index} className="ui-skeleton__line" style={{ width, height }} />
      ))}
    </span>
  )
}
