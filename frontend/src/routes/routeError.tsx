import { Link, isRouteErrorResponse, useRouteError } from 'react-router'
import { ErrorFallback } from '../components'
import { ROUTE_PATHS } from './paths'

/**
 * What a route renders when it fails.
 *
 * ## Why this exists next to the shell's `ErrorBoundary`
 *
 * `App.tsx` wraps everything in `components/ErrorBoundary`, but a React error boundary only sees
 * errors that reach it — and React Router **catches route render errors first**, inside its own
 * boundary, before they can bubble to ours. With no `errorElement` it renders its built-in
 * "Unexpected Application Error!" screen with a raw stack trace, which is a developer artifact,
 * not a UI. So route errors need this, and everything outside the router (the providers, the
 * shell itself) needs the boundary in `App.tsx`. Two error paths, two catchers.
 *
 * ## Why no retry button
 *
 * A route error is cleared by navigating, not by re-rendering in place — there is nothing for a
 * "try again" to reset. A link out of the broken page is the honest affordance, and following it
 * clears the error as a side effect of the navigation.
 */
export function RouteErrorFallback() {
  const error = useRouteError()

  return (
    <ErrorFallback
      error={toDisplayableError(error)}
      title="This page could not be displayed"
      description={<Link to={ROUTE_PATHS.products}>Go to the product list</Link>}
    />
  )
}

/**
 * `useRouteError()` is typed `unknown` and really can be anything — a thrown `Error`, a
 * `Response` React Router turns into an `ErrorResponse` (a 404 from a future loader), or a value
 * someone threw that was never an error at all.
 */
function toDisplayableError(error: unknown): Error {
  if (isRouteErrorResponse(error)) {
    return new Error(`${error.status} ${error.statusText}`)
  }
  if (error instanceof Error) return error
  return new Error(String(error))
}
