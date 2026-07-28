/**
 * Money formatting — the single place currency/decimal rendering happens
 * (docs/frontend-architecture.md A11, §3.5).
 *
 * ## Why this module exists
 *
 * Money is **fixed-precision on the backend** (`NUMERIC(12,2)` in Postgres,
 * `Decimal128` in Mongo — postgre-schema.md A4, mongodb-schema.md A5) and therefore arrives
 * over the wire as a **decimal string**, not a JS number. `0.1 + 0.2 !== 0.3` in IEEE-754, and
 * `Number('9007199254740993.45')` silently loses digits, so an amount must never be coerced
 * through `parseFloat`/`Number` on its way to the screen.
 *
 * The frontend also never *computes* money — totals arrive pre-computed from the backend
 * (`totalAmount`, `unitPrice`, `amount`). This module formats one amount at a time and offers
 * no arithmetic on purpose.
 *
 * ## How it avoids float
 *
 * `Intl.NumberFormat` (the ECMA-402 "NumberFormat v3" behaviour, ES2023) accepts a **decimal
 * string** and formats it exactly, without routing it through a double. So the amount travels
 * string → `Intl` → string and is never a `number` at any point. That is why no decimal library
 * (decimal.js / big.js / dinero.js) was added — the platform already covers formatting, and a
 * new dependency would need justifying (CLAUDE.md).
 *
 * Rounding, when an amount carries more fraction digits than the currency displays, is `Intl`'s
 * exact decimal rounding (half-expand), e.g. `'0.005'` → `$0.01`. It is display rounding only;
 * the authoritative value stays whatever the backend sent.
 */

/**
 * A backend money value: an optionally-signed decimal string such as `'19.99'`, `'0.00'`,
 * `'-12.50'` or `'1234'`.
 *
 * Deliberately *not* `number`. Callers hand over exactly what the API returned.
 */
export type MoneyAmount = string

/** ISO-4217 code, e.g. `'USD'`. `mongodb-schema.md` §3.4 defaults product prices to `USD`. */
export const DEFAULT_CURRENCY = 'USD'

/**
 * Plain decimal literal — no exponents, no `Infinity`, no thousands separators, no whitespace.
 * Anything else is treated as "not a money value I can trust" rather than guessed at.
 */
const DECIMAL_PATTERN = /^-?\d+(?:\.\d+)?$/

/**
 * Narrows a raw string to the shape `Intl.NumberFormat.format` accepts as an exact decimal.
 *
 * A type predicate rather than a cast, so the `Intl` call below stays type-checked instead of
 * being waved through with `as`.
 */
export function isMoneyAmount(value: unknown): value is `${number}` {
  return typeof value === 'string' && DECIMAL_PATTERN.test(value)
}

export interface FormatMoneyOptions {
  /** ISO-4217 currency code. Defaults to {@link DEFAULT_CURRENCY}. */
  currency?: string
  /** BCP-47 locale tag. Defaults to the runtime's locale. */
  locale?: string
}

/**
 * `Intl.NumberFormat` construction is the expensive part, so instances are reused per
 * locale+currency. The cache is unbounded in principle but bounded in practice by the handful
 * of currencies/locales an app renders.
 */
const formatterCache = new Map<string, Intl.NumberFormat>()

function getFormatter(locale: string | undefined, currency: string): Intl.NumberFormat {
  const key = `${locale ?? ''}|${currency}`
  const cached = formatterCache.get(key)
  if (cached) return cached

  // Fraction digits are left to the currency (2 for USD/EUR, 0 for JPY) rather than hardcoded.
  const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency })
  formatterCache.set(key, formatter)
  return formatter
}

/**
 * Formats a backend decimal string as currency.
 *
 * Returns `null` for anything that is not a plain decimal string (`undefined`, `''`, `'abc'`,
 * `'1e3'`, a `number`) so callers can render their own fallback instead of showing `NaN` or a
 * quietly wrong amount. An unknown/unsupported `currency` code throws from `Intl`; that is a
 * programming error, not user input, so it is not swallowed here.
 */
export function formatMoney(
  amount: unknown,
  { currency = DEFAULT_CURRENCY, locale }: FormatMoneyOptions = {},
): string | null {
  if (!isMoneyAmount(amount)) return null
  return getFormatter(locale, currency).format(amount)
}
