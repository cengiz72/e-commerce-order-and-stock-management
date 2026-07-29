import { createContext, useContext } from 'react'
import type { ToastContextValue } from './types'

/**
 * The toast context and its reader.
 *
 * Kept separate from `ToastProvider.tsx` so the provider file exports only components (and so
 * consumers depend on the hook, never on the context object itself) — the same split
 * `hooks/auth` uses.
 */

/** `null` means "no provider above me", which {@link useToast} turns into a hard error. */
export const ToastContext = createContext<ToastContextValue | null>(null)

/**
 * Raise or dismiss an in-app toast from anywhere in the app.
 *
 * This is **UI only** and has nothing to do with notification-service, which is a Kafka
 * consumer with no HTTP surface the browser can reach (docs/frontend-architecture.md §1, Facts).
 *
 * Throws outside `<ToastProvider>`, because silently swallowing messages would hide a wiring
 * bug behind a screen that simply never says anything.
 */
export function useToast(): ToastContextValue {
  const value = useContext(ToastContext)
  if (!value) {
    throw new Error('useToast must be used within a <ToastProvider>')
  }
  return value
}
