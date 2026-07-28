import { createContext, useContext } from 'react'
import type { AuthContextValue } from './types'

/**
 * The session context and its reader.
 *
 * Kept separate from `AuthProvider.tsx` so the provider file exports only a component (and so
 * consumers depend on the hook, never on the context object itself).
 */

/**
 * `null` means "no provider above me", which `useAuth` turns into a hard error — as opposed
 * to a `user` of `null`, which legitimately means "signed out".
 */
export const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Read the current session from anywhere in the app (docs/frontend-architecture.md §3.7).
 *
 * When nobody is signed in it reports `user: null` and `role: undefined` (AC1). Throws when
 * used outside `<AuthProvider>`, because silently reporting "signed out" there would hide a
 * wiring bug behind a plausible-looking anonymous session.
 */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used within an <AuthProvider>')
  }
  return value
}
