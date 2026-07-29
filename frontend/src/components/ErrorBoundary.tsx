import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Button } from './Button'
import { cx } from './classNames'

/**
 * Render-error containment (docs/frontend-architecture.md §3.5, §3.8).
 *
 * ## The one justified class component in this codebase
 *
 * CLAUDE.md and `.claude/rules/code-style.md` say "functional components and hooks only, no class
 * components". That rule is about feature/page components. An error boundary is the single
 * documented exception React itself forces: `getDerivedStateFromError` / `componentDidCatch` have
 * **no hook equivalent** in React 18/19 — there is no `useErrorBoundary`, and React's own docs
 * state a class is required. The alternative would be a dependency (`react-error-boundary`) that
 * is itself a class under the hood, which is not worth a new package (CLAUDE.md — no new
 * dependencies without justification).
 *
 * The exception is contained: this file holds the only class in `src/`, it carries no business
 * logic, and the fallback UI it renders is a normal functional component ({@link ErrorFallback}).
 *
 * ## What it does and does not catch
 *
 * React error boundaries catch errors thrown while **rendering** the subtree (plus in lifecycle
 * methods and constructors). They do **not** catch errors in event handlers, in `setTimeout`, or
 * in rejected promises — so a failed `services/` call surfaced through an event handler still
 * needs the caller's own error handling; this is the last line of defence, not the first.
 */

export interface ErrorFallbackProps {
  /** The error that was caught, when there is one to show. */
  error?: Error | null
  /** Retry affordance. When omitted, no retry button renders. */
  onRetry?: () => void
  title?: ReactNode
  description?: ReactNode
  /** Label of the retry button. Defaults to `'Try again'`. */
  retryLabel?: string
  className?: string
}

/**
 * The visible half of the boundary — a plain functional component, so it can also be rendered
 * directly by a feature that caught a failure some other way (e.g. a rejected fetch in a hook)
 * and wants the same look.
 */
export function ErrorFallback({
  error,
  onRetry,
  title = 'Something went wrong',
  description,
  retryLabel = 'Try again',
  className,
}: ErrorFallbackProps) {
  return (
    <div role="alert" className={cx('ui-error-fallback', className)}>
      <p className="ui-error-fallback__title">{title}</p>
      {description == null ? null : (
        <p className="ui-error-fallback__description">{description}</p>
      )}
      {error?.message ? <p className="ui-error-fallback__detail">{error.message}</p> : null}
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  )
}

export interface ErrorBoundaryFallbackRenderProps {
  error: Error
  /** Clears the caught error and re-renders `children`. */
  reset: () => void
}

export interface ErrorBoundaryProps {
  children: ReactNode
  /**
   * Replacement UI. Either a static node, or a render function that receives the error and a
   * `reset` callback. Defaults to {@link ErrorFallback} wired to `reset`.
   */
  fallback?: ReactNode | ((props: ErrorBoundaryFallbackRenderProps) => ReactNode)
  /**
   * Side-channel for reporting (logging/telemetry). Called with React's component stack. Kept as
   * a prop rather than a built-in logger so this layer stays free of app concerns.
   */
  onError?: (error: Error, info: ErrorInfo) => void
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info)
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    const { children, fallback } = this.props

    if (error === null) return children

    if (typeof fallback === 'function') return fallback({ error, reset: this.reset })
    if (fallback !== undefined) return fallback
    return <ErrorFallback error={error} onRetry={this.reset} />
  }
}
