import { Link } from 'react-router'
import { ROUTE_PATHS } from '../../routes/paths'

/**
 * Registration page — **placeholder with no form, on purpose**.
 *
 * The route exists because A10 lists it, but there is nothing to submit to: the auth session
 * provider (`hooks/auth`) exposes `login`/`logout` only — `register()` was deliberately left
 * out of its scope — and user-service has no register endpoint yet. Rendering a form whose
 * submit handler could only be a no-op would look finished while doing nothing, so the form
 * lands with the `register()` support behind it.
 */
export function RegisterPage() {
  return (
    <section>
      <h1>Create an account</h1>
      <p>Registration is not available yet.</p>
      <p>
        <Link to={ROUTE_PATHS.login}>Already have an account? Sign in</Link>
      </p>
    </section>
  )
}
