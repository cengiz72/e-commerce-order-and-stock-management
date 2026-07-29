import { useCallback, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Toast } from '../../components'
import { ToastContext } from './context'
import type { ToastContextValue, ToastInput, ToastRecord } from './types'

/**
 * The app shell's toaster (docs/frontend-architecture.md §3.8 — "theme/toaster provider").
 *
 * `components/Toast` is one presentational toast and deliberately stops there: it says that
 * *"which toasts exist, in what order, and where they are stacked is app-shell/provider state
 * (a later ticket)"*, because a global queue inside a props-in/UI-out layer would drag app state
 * into the design system. This is that later ticket, and this is that queue.
 *
 * It owns *what is currently being said to the user*, and nothing else: no routing, no HTTP, no
 * domain rules. Features call `useToast().showToast(...)`; the shell decides where it lands.
 */

/** Auto-dismiss delay applied when a caller does not pick one. */
export const DEFAULT_TOAST_DURATION_MS = 5000

export interface ToastProviderProps {
  children?: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<readonly ToastRecord[]>([])
  // Ids only have to be unique within one mounted provider, so a counter beats `crypto.randomUUID`
  // (which is not available in every test environment) and stays stable across re-renders.
  const nextId = useRef(0)

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((input: ToastInput): string => {
    nextId.current += 1
    const id = `toast-${nextId.current}`
    const tone = input.tone ?? 'info'

    setToasts((current) => [
      ...current,
      {
        id,
        tone,
        title: input.title,
        message: input.message,
        // Errors are sticky by default: a message that vanishes before it is read is worse than
        // no message (components/Toast). Everything else fades on its own.
        duration: input.duration ?? (tone === 'error' ? 0 : DEFAULT_TOAST_DURATION_MS),
      },
    ])

    return id
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({ showToast, dismissToast }),
    [showToast, dismissToast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/*
        Always rendered, even when empty, so the stack has a stable position in the DOM. No
        `aria-live` here: each `<Toast>` already carries `role="status"`/`role="alert"`, and
        nesting one inside another live region makes screen readers announce twice.
      */}
      <div className="app-toast-viewport">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/**
 * One queued toast.
 *
 * Split out purely to give `<Toast>` a **stable** `onDismiss` identity: an inline
 * `() => dismissToast(id)` would be a new function on every provider render, and `Toast` keys its
 * auto-dismiss timer on that prop — so a toast next to any re-rendering UI would restart its
 * countdown forever and never disappear.
 */
function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastRecord
  onDismiss: (id: string) => void
}) {
  const { id } = toast
  const handleDismiss = useCallback(() => onDismiss(id), [id, onDismiss])

  return (
    <Toast
      tone={toast.tone}
      title={toast.title}
      duration={toast.duration}
      onDismiss={handleDismiss}
    >
      {toast.message}
    </Toast>
  )
}
