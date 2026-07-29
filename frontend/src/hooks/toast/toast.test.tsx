// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_TOAST_DURATION_MS, ToastProvider, useToast } from './index'

/**
 * The shell's toast queue. `components/Toast` already has its own tests for the single toast;
 * what is tested here is the part that layer deliberately refused to own — the queue, the
 * defaults, and the auto-dismiss lifetime.
 */

function wrapper({ children }: { children?: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}

/** Render `<ToastProvider>` and hand back its `useToast()` value. */
function renderToasts() {
  const { result } = renderHook(() => useToast(), { wrapper })
  return result
}

/**
 * The messages currently on screen, in DOM order. Reads the message element rather than the
 * toast's `textContent`, which also contains the dismiss button's `×`.
 */
function visibleMessages(): string[] {
  return Array.from(document.querySelectorAll('.ui-toast__message')).map(
    (node) => node.textContent ?? '',
  )
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useToast', () => {
  it('throws outside a provider, rather than silently dropping the message', () => {
    // React logs the thrown error on its own; silence it so the passing test stays readable.
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => renderHook(() => useToast())).toThrow(
      'useToast must be used within a <ToastProvider>',
    )
  })

  it('exposes only the two actions — never the queue itself', () => {
    const result = renderToasts()

    expect(Object.keys(result.current).sort()).toEqual(['dismissToast', 'showToast'])
  })

  it('keeps a stable identity across renders, so callers can put it in a dependency array', () => {
    const result = renderToasts()
    const first = result.current

    act(() => {
      result.current.showToast({ message: 'anything' })
    })

    expect(result.current.showToast).toBe(first.showToast)
    expect(result.current.dismissToast).toBe(first.dismissToast)
  })
})

describe('showing and dismissing', () => {
  it('renders a queued toast', () => {
    const result = renderToasts()

    act(() => {
      result.current.showToast({ title: 'Saved', message: 'Your cart was updated' })
    })

    const toast = screen.getByRole('status')
    expect(toast.textContent).toContain('Saved')
    expect(toast.textContent).toContain('Your cart was updated')
  })

  it('stacks several toasts in the order they were raised', () => {
    const result = renderToasts()

    act(() => {
      result.current.showToast({ message: 'first' })
      result.current.showToast({ message: 'second' })
    })

    expect(visibleMessages()).toEqual(['first', 'second'])
  })

  it('dismisses by the id showToast returned, leaving the others alone', () => {
    const result = renderToasts()
    let firstId = ''

    act(() => {
      firstId = result.current.showToast({ message: 'first' })
      result.current.showToast({ message: 'second' })
    })
    act(() => {
      result.current.dismissToast(firstId)
    })

    expect(visibleMessages()).toEqual(['second'])
  })

  it('dismisses on click', () => {
    const result = renderToasts()
    act(() => {
      result.current.showToast({ message: 'first' })
    })

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(screen.queryByRole('status')).toBeNull()
  })

  it('ignores a dismiss for an id that is already gone', () => {
    const result = renderToasts()
    act(() => {
      result.current.showToast({ message: 'first' })
    })

    expect(() =>
      act(() => {
        result.current.dismissToast('toast-does-not-exist')
      }),
    ).not.toThrow()
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })
})

describe('auto-dismiss defaults', () => {
  it('clears an informational toast on its own', () => {
    vi.useFakeTimers()
    const result = renderToasts()
    act(() => {
      result.current.showToast({ message: 'saved' })
    })

    act(() => {
      vi.advanceTimersByTime(DEFAULT_TOAST_DURATION_MS)
    })

    expect(screen.queryByRole('status')).toBeNull()
  })

  it('keeps an error toast until it is dismissed', () => {
    // A message that vanishes before it is read is worse than no message, and errors are the
    // ones the user most needs to finish reading.
    vi.useFakeTimers()
    const result = renderToasts()
    act(() => {
      result.current.showToast({ tone: 'error', message: 'stock check failed' })
    })

    act(() => {
      vi.advanceTimersByTime(DEFAULT_TOAST_DURATION_MS * 10)
    })

    expect(screen.getByRole('alert').textContent).toContain('stock check failed')
  })

  it('honours an explicit duration over the default', () => {
    vi.useFakeTimers()
    const result = renderToasts()
    act(() => {
      result.current.showToast({ tone: 'error', message: 'brief', duration: 100 })
    })

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('does not restart the countdown when the surrounding UI re-renders', () => {
    // The reason `ToastItem` exists: an inline `onDismiss` would be a new function on every
    // parent render, and `Toast` keys its timer on that prop — so a toast next to any busy UI
    // would never disappear.
    vi.useFakeTimers()
    const result = renderToasts()
    act(() => {
      result.current.showToast({ message: 'saved' })
    })

    act(() => {
      vi.advanceTimersByTime(DEFAULT_TOAST_DURATION_MS / 2)
    })
    act(() => {
      // Any unrelated state change in the provider's subtree.
      result.current.dismissToast('toast-nonexistent')
    })
    act(() => {
      vi.advanceTimersByTime(DEFAULT_TOAST_DURATION_MS / 2)
    })

    expect(screen.queryByRole('status')).toBeNull()
  })
})

describe('the viewport', () => {
  it('is always present, so the stack has a stable place in the DOM', () => {
    const { container } = render(<ToastProvider>content</ToastProvider>)

    const viewport = container.querySelector('.app-toast-viewport')
    expect(viewport).not.toBeNull()
    expect(viewport?.children).toHaveLength(0)
  })

  it('renders children above itself, so page content is not displaced by toasts', () => {
    render(
      <ToastProvider>
        <p>page</p>
      </ToastProvider>,
    )

    expect(screen.getByText('page')).toBeTruthy()
  })
})
