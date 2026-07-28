import type { ReactNode } from 'react'
import { cx } from './classNames'
import { DEFAULT_CURRENCY, formatMoney } from './moneyFormat'
import type { MoneyAmount } from './moneyFormat'

/**
 * `<Money>` — the one way a price/total reaches the screen (docs/frontend-architecture.md A11).
 *
 * Formatting rules and the no-float reasoning live in `./moneyFormat`. This component is the thin
 * presentational wrapper around it, so features never call `formatMoney` *and* re-decide markup.
 */
export interface MoneyProps {
  /**
   * The amount exactly as the backend sent it: a decimal string (`'19.99'`), never a `number`.
   * Typed as `string` rather than a numeric-literal type so a value straight off an API DTO
   * assigns without a cast; invalid content is handled at runtime via {@link MoneyProps.fallback}.
   */
  amount: MoneyAmount
  /** ISO-4217 code. Defaults to `'USD'`. */
  currency?: string
  /** BCP-47 locale tag. Defaults to the runtime's locale. */
  locale?: string
  /** Rendered when `amount` is not a usable decimal string. Defaults to an em dash. */
  fallback?: ReactNode
  className?: string
}

export function Money({
  amount,
  currency = DEFAULT_CURRENCY,
  locale,
  fallback = '—',
  className,
}: MoneyProps) {
  const formatted = formatMoney(amount, { currency, locale })

  if (formatted === null) {
    return <span className={cx('ui-money', 'ui-money--unavailable', className)}>{fallback}</span>
  }

  // `<data>` keeps the exact backend value in the DOM next to its formatted form, so the
  // machine-readable amount survives even though the user sees a localized string.
  return (
    <data className={cx('ui-money', className)} value={amount}>
      {formatted}
    </data>
  )
}
