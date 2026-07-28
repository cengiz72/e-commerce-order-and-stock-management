import type { ReactNode } from 'react'
import { cx } from './classNames'

/**
 * "There is nothing here" placeholder — empty cart, no search results, no orders yet
 * (docs/frontend-architecture.md §3.5).
 *
 * Distinct from an error: this is a successful response that happens to contain nothing. The
 * exact UX contract around empty/error/loading states is still open (OQ9); this component just
 * gives every feature the same shape to fill in.
 */
export interface EmptyStateProps {
  /** Short statement of what is missing, e.g. `'Your cart is empty'`. */
  title: ReactNode
  /** Optional supporting sentence. */
  description?: ReactNode
  /** Optional call to action, e.g. a `<Button>` or a link. */
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cx('ui-empty-state', className)}>
      <p className="ui-empty-state__title">{title}</p>
      {description == null ? null : (
        <p className="ui-empty-state__description">{description}</p>
      )}
      {action == null ? null : <div className="ui-empty-state__action">{action}</div>}
    </div>
  )
}
