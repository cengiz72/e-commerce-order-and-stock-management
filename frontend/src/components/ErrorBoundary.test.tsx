// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary, ErrorFallback } from './ErrorBoundary'

/**
 * AC4 — a child that throws during render is contained: the fallback shows instead of the app
 * unmounting to a blank page.
 *
 * React logs every caught error through `console.error`; that is expected noise here, so it is
 * silenced per test rather than left to drown the run.
 */

function Boom({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) throw new Error('render exploded')
  return <p>Recovered content</p>
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ErrorBoundary (AC4)', () => {
  it('renders the fallback instead of letting the throw reach the app', () => {
    render(
      <div>
        <p>App shell</p>
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>
      </div>,
    )

    expect(screen.getByRole('alert').textContent).toContain('Something went wrong')
    expect(screen.getByText('render exploded')).toBeTruthy()
    // Containment: only the boundary's subtree was replaced.
    expect(screen.getByText('App shell')).toBeTruthy()
  })

  it('renders its children untouched when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>All fine</p>
      </ErrorBoundary>,
    )

    expect(screen.getByText('All fine')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('reports the error and the component stack to the caller', () => {
    const onError = vi.fn()

    render(
      <ErrorBoundary onError={onError}>
        <Boom />
      </ErrorBoundary>,
    )

    expect(onError).toHaveBeenCalledTimes(1)
    const [error, info] = onError.mock.calls[0]
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe('render exploded')
    expect(typeof (info as { componentStack?: string }).componentStack).toBe('string')
  })

  it('accepts a static replacement UI', () => {
    render(
      <ErrorBoundary fallback={<p>Order details are unavailable right now.</p>}>
        <Boom />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Order details are unavailable right now.')).toBeTruthy()
  })

  it('hands the error and a reset callback to a render-prop fallback', () => {
    function Retryable() {
      // The child stops throwing once the user has "fixed" whatever broke; `reset` is what lets
      // the boundary try rendering it again instead of staying broken until a full reload.
      const [shouldThrow, setShouldThrow] = useState(true)
      return (
        <ErrorBoundary
          fallback={({ error, reset }) => (
            <div>
              <p>Caught: {error.message}</p>
              <button
                type="button"
                onClick={() => {
                  setShouldThrow(false)
                  reset()
                }}
              >
                Retry
              </button>
            </div>
          )}
        >
          <Boom shouldThrow={shouldThrow} />
        </ErrorBoundary>
      )
    }

    render(<Retryable />)
    expect(screen.getByText('Caught: render exploded')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(screen.getByText('Recovered content')).toBeTruthy()
    expect(screen.queryByText('Caught: render exploded')).toBeNull()
  })
})

describe('ErrorFallback', () => {
  it('is usable on its own, for failures a boundary never sees', () => {
    // Event-handler and promise failures (a rejected `services/` call) bypass error boundaries
    // entirely, so features need the same UI without one.
    const onRetry = vi.fn()
    render(
      <ErrorFallback
        title="Could not load your orders"
        description="The order service did not respond."
        onRetry={onRetry}
      />,
    )

    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('Could not load your orders')
    expect(alert.textContent).toContain('The order service did not respond.')

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('omits the retry affordance when there is nothing to retry', () => {
    render(<ErrorFallback />)

    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByRole('alert').textContent).toContain('Something went wrong')
  })
})
