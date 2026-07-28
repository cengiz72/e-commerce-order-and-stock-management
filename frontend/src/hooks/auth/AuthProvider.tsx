import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { requestLoginToken, setAuthTokenProvider } from '../../services'
import { AuthContext } from './context'
import { readUserFromToken } from './jwt'
import { readStoredToken, setStoredToken } from './tokenStore'
import { AuthErrorCode } from './types'
import type { AuthContextValue, AuthUser, LoginCredentials, LoginResult } from './types'

/**
 * Session provider for the app shell (docs/frontend-architecture.md §3.8, A4).
 *
 * It owns *who is signed in*, and nothing else: no routing, no UI, no redirects. The token
 * itself lives in `tokenStore` (in-memory) and reaches the HTTP client through the hook point
 * SCRUM-2 built (`setAuthTokenProvider`), so no component ever handles an `Authorization`
 * header.
 */

export interface AuthProviderProps {
  children?: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Bootstrap from whatever token the module already holds. On a real page load that is
  // always `null` (the module was just re-evaluated — see tokenStore), so a reload starts
  // anonymous; on a remount within the same page it keeps the session instead of dropping it.
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = readStoredToken()
    return token ? readUserFromToken(token) : null
  })
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  useEffect(() => {
    // Hand the client a *reader*, not a value, so every request sees the current token
    // without the client ever subscribing to React state.
    setAuthTokenProvider(readStoredToken)
    return () => {
      setAuthTokenProvider(null)
    }
  }, [])

  const login = useCallback(async (credentials: LoginCredentials): Promise<LoginResult> => {
    setIsAuthenticating(true)
    try {
      const result = await requestLoginToken(credentials)
      if (!result.ok) return { ok: false, error: result.error }

      const nextUser = readUserFromToken(result.token)
      if (!nextUser) {
        // A token we cannot read is unusable as a session even though HTTP said 200 — storing
        // it would leave the UI "signed in" as nobody.
        return {
          ok: false,
          error: {
            status: 0,
            code: AuthErrorCode.InvalidToken,
            message: 'Login token could not be decoded',
          },
        }
      }

      setStoredToken(result.token)
      setUser(nextUser)
      return { ok: true, user: nextUser }
    } finally {
      setIsAuthenticating(false)
    }
    // A failed attempt deliberately leaves any existing session alone: a mistyped password on
    // a re-authentication prompt should not sign the user out.
  }, [])

  const logout = useCallback(() => {
    setStoredToken(null)
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role,
      isAuthenticated: user !== null,
      isAuthenticating,
      login,
      logout,
    }),
    [user, isAuthenticating, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
