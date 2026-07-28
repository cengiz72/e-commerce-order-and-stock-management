import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from './classNames'
import { Spinner } from './Spinner'

/**
 * The design system's button (docs/frontend-architecture.md §3.5).
 *
 * Extends the native `<button>` props instead of re-declaring them, so callers keep
 * `onClick`, `type`, `form`, `aria-*` and friends with no wrapper churn. It adds exactly two
 * things: a visual `variant`, and a `loading` state that disables the button and shows a
 * spinner — the pattern every submit button in Phases 3–6 would otherwise re-invent.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  /** In-flight state: disables activation and shows a spinner, keeping the label in place. */
  loading?: boolean
  children?: ReactNode
}

export function Button({
  variant = 'primary',
  loading = false,
  disabled = false,
  // Native default is `submit`, which silently submits any surrounding form; `button` is the
  // safer default and callers opt into `type="submit"` explicitly.
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'ui-button',
        `ui-button--${variant}`,
        loading && 'ui-button--loading',
        className,
      )}
    >
      {/* Decorative: the button's own label already says what is happening. */}
      {loading ? <Spinner size="sm" label={null} className="ui-button__spinner" /> : null}
      {children}
    </button>
  )
}
