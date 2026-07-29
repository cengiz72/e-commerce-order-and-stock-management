import type { ReactNode } from 'react'
import type { ToastTone } from '../../components'

/**
 * Public types of the toast module (docs/frontend-architecture.md §3.5, §3.8 — the app shell's
 * "toaster provider").
 *
 * The tone vocabulary is re-exported from `components/Toast` rather than redeclared, so the
 * queue and the thing it renders can never drift apart.
 */
export type { ToastTone }

/** What a caller passes to `showToast()`. */
export interface ToastInput {
  /** Defaults to `'info'`. */
  tone?: ToastTone
  /** Optional bold headline above the message. */
  title?: ReactNode
  message: ReactNode
  /**
   * Auto-dismiss delay in ms; `0` keeps the toast until it is dismissed. Defaults to
   * {@link DEFAULT_TOAST_DURATION_MS}, except for `error`, which defaults to sticky.
   */
  duration?: number
}

/** A queued toast, with every default already applied. Internal to the provider/viewport. */
export interface ToastRecord {
  id: string
  tone: ToastTone
  title?: ReactNode
  message: ReactNode
  duration: number
}

/**
 * Everything the provider exposes; read through `useToast()`, never from the context directly.
 *
 * Deliberately two functions and no list: *which* toasts are showing and *where* they are
 * stacked is the shell's business, and handing the array out would let a feature render its own
 * viewport somewhere else.
 */
export interface ToastContextValue {
  /** Queue a toast; returns its id so the caller can dismiss it early. */
  showToast: (toast: ToastInput) => string
  dismissToast: (id: string) => void
}
