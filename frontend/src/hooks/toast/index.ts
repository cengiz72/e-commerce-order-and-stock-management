/**
 * Public surface of the toast module (docs/frontend-architecture.md §3.5, §3.8).
 *
 * Features import `useToast` from `hooks/`; only the app shell mounts `<ToastProvider>`. The
 * context object and the viewport are internals, so the stacking/placement can change without
 * touching a single caller.
 *
 * Not included, on purpose: any way to read the current queue — see `ToastContextValue`.
 */
export { DEFAULT_TOAST_DURATION_MS, ToastProvider } from './ToastProvider'
export type { ToastProviderProps } from './ToastProvider'
export { useToast } from './context'
export type { ToastContextValue, ToastInput, ToastTone } from './types'
