import { useEffect, useId, useRef } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { cx } from './classNames'

/**
 * Modal dialog (docs/frontend-architecture.md §3.5).
 *
 * **Controlled**: the owner holds `open` and reacts to `onClose`. The component never decides on
 * its own that it should be closed, because "did the save succeed, may we close?" is feature
 * logic and this layer holds none.
 *
 * Closing paths: the close button, `Escape`, and a click on the backdrop. Each one calls
 * `onClose`; none of them mutates state here.
 *
 * Deliberately *not* done here: rendering through a portal, and full focus-trapping. Both depend
 * on the app shell (where the portal root lives) and neither is needed by the current screens;
 * initial focus is moved into the dialog, which is the part that matters for keyboard users.
 */
export interface ModalProps {
  open: boolean
  /** Accessible name of the dialog; also rendered as its heading. */
  title: ReactNode
  /** Called for every dismissal path (button, `Escape`, backdrop). */
  onClose: () => void
  children?: ReactNode
  /** Action row, typically `<Button>`s. */
  footer?: ReactNode
  /** Accessible name of the close button. Defaults to `'Close'`. */
  closeLabel?: string
  className?: string
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  closeLabel = 'Close',
  className,
}: ModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  useEffect(() => {
    // Move focus into the dialog so the next Tab lands inside it rather than behind it.
    if (open) dialogRef.current?.focus()
  }, [open])

  if (!open) return null

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    // Only a click on the backdrop itself dismisses; clicks bubbling out of the dialog do not.
    if (event.target === event.currentTarget) onClose()
  }

  return (
    <div className="ui-modal__backdrop" onClick={handleBackdropClick}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx('ui-modal', className)}
      >
        <div className="ui-modal__header">
          <h2 className="ui-modal__title" id={titleId}>
            {title}
          </h2>
          <button
            type="button"
            aria-label={closeLabel}
            className="ui-modal__close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="ui-modal__body">{children}</div>
        {footer == null ? null : <div className="ui-modal__footer">{footer}</div>}
      </div>
    </div>
  )
}
