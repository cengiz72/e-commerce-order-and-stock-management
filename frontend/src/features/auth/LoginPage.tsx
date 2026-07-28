import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../../hooks'
import { readLoginRedirect } from '../../routes/loginRedirect'
import { ROUTE_PATHS } from '../../routes/paths'

/**
 * Sign-in page (docs/frontend-architecture.md §3.8 — the public `login` route).
 *
 * The only page in this routing skeleton that does real work, because a guarded route is
 * useless without a way past it. It performs **no HTTP of its own**: it calls
 * `useAuth().login()`, which goes through `services/userService` (CLAUDE.md — API calls live
 * under `services/`, never inside components).
 *
 * Form UX (validation messages, per-field errors, disabled/dirty handling) is deliberately
 * minimal here and is a later ticket's scope.
 *
 * Note the leaf imports (`routes/loginRedirect`, `routes/paths`) rather than the `routes/`
 * barrel: the barrel re-exports the route table, which imports this page.
 */
export function LoginPage() {
  const { login, isAuthenticating } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Where a guard bounced the visitor from, if any; otherwise the storefront (AC4).
  const destination = readLoginRedirect(location.state) ?? ROUTE_PATHS.products

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const result = await login({ email, password })
    if (!result.ok) {
      // `login()` never throws; transport, credential and bad-token failures all arrive as one
      // normalized error shape.
      setError(result.error.message)
      return
    }
    // `replace`: the login form should not sit between the user and Back once they are in.
    void navigate(destination, { replace: true })
  }

  return (
    <section>
      <h1>Sign in</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error === null ? null : <p role="alert">{error}</p>}

        <button type="submit" disabled={isAuthenticating}>
          Sign in
        </button>
      </form>
      <p>
        <Link to={ROUTE_PATHS.register}>Create an account</Link>
      </p>
    </section>
  )
}
