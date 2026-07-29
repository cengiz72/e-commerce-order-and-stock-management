import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { cx } from './classNames'

/**
 * Transient in-app message (docs/frontend-architecture.md §3.5).
 *
 * This is **UI only** and has nothing to do with notification-service — that service is a Kafka
 * consumer with no HTTP surface the browser can reach (docs/frontend-architecture.md §1, Facts).
 * Nothing here subscribes to anything.
 *
 * A single toast, not a queue: which toasts exist, in what order, and where they are stacked is
 * app-shell/provider state (a later ticket), and putting a global queue in `components/` would
 * drag app state into a props-in/UI-out layer. `onDismiss` + an optional auto-dismiss timer is
 * everything this component needs to be driven by whatever manages that list.
 */
export type ToastTone = 'info' | 'success' | 'warning' | 'error'

export interface ToastProps {
  tone?: ToastTone
  /** Optional bold headline above the message. */
  title?: ReactNode
  children: ReactNode
  /**
   * Called by the dismiss button and by the auto-dismiss timer. Without it, no dismiss button
   * renders and the toast stays until its owner unmounts it.
   */
  onDismiss?: () => void
  /**
   * Auto-dismiss delay in ms. Omit (or pass `0`) for a sticky toast — errors usually should be
   * sticky, since a message that vanishes before it is read is worse than no message.
   */
  duration?: number
  /** Accessible name of the dismiss button. Defaults to `'Dismiss'`. */
  dismissLabel?: string
  className?: string
}

export function Toast({
  tone = 'info',
  title,
  children,
  onDismiss,
  duration,
  dismissLabel = 'Dismiss',
  className,
}: ToastProps) {
  useEffect(() => {
    if (!onDismiss || duration == null || duration <= 0) return

    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [duration, onDismiss])

  return (
    <div
      // Errors interrupt; everything else is announced politely when the user is idle.
      role={tone === 'error' ? 'alert' : 'status'}
      className={cx('ui-toast', `ui-toast--${tone}`, className)}
    >
      <div className="ui-toast__content">
        {title == null ? null : <p className="ui-toast__title">{title}</p>}
        <div className="ui-toast__message">{children}</div>
      </div>
      {onDismiss ? (
        <button
          type="button"
          aria-label={dismissLabel}
          className="ui-toast__dismiss"
          onClick={onDismiss}
        >
          ×
        </button>
      ) : null}
    </div>
  )
}
