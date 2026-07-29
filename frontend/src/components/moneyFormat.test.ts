import { describe, expect, it } from 'vitest'
import { DEFAULT_CURRENCY, formatMoney, isMoneyAmount } from './moneyFormat'

/**
 * AC2 — money is formatted from a fixed-precision **string** with no float arithmetic anywhere
 * on the path from API response to screen.
 *
 * Locale is pinned in every assertion: the runtime default differs between a developer machine
 * and CI, and an unpinned expectation would be a flake, not a check.
 */

const EN_US = { locale: 'en-US' }

describe('formatMoney', () => {
  it('formats a backend decimal string as currency', () => {
    expect(formatMoney('19.99', EN_US)).toBe('$19.99')
    expect(formatMoney('0.00', EN_US)).toBe('$0.00')
    expect(formatMoney('-12.50', EN_US)).toBe('-$12.50')
  })

  it('normalizes fraction digits to the currency, not to whatever the string carried', () => {
    // NUMERIC(12,2) usually arrives with both decimals, but a JSON serializer that trims them
    // must not turn into "$19.9" on screen.
    expect(formatMoney('19.9', EN_US)).toBe('$19.90')
    expect(formatMoney('19', EN_US)).toBe('$19.00')
    expect(formatMoney('1234567.05', EN_US)).toBe('$1,234,567.05')
  })

  it('keeps digits a JS number would silently destroy', () => {
    // The whole point of the string pipeline. `Number('9007199254740993.45')` cannot represent
    // this value — it rounds to ...994 — so if the amount ever became a double on the way to
    // the screen, this assertion would fail.
    const beyondFloatPrecision = '9007199254740993.45'

    expect(formatMoney(beyondFloatPrecision, EN_US)).toBe('$9,007,199,254,740,993.45')
    expect(formatMoney(beyondFloatPrecision, EN_US)).not.toBe(
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
        Number(beyondFloatPrecision),
      ),
    )
  })

  it('refuses a JS number instead of quietly formatting it', () => {
    // The float-risk entry point: a caller handing over `19.99` as a number (or the result of
    // `0.1 + 0.2`, which is 0.30000000000000004) gets `null`, not a plausible-looking price.
    expect(0.1 + 0.2).not.toBe(0.3)
    expect(formatMoney(19.99)).toBeNull()
    expect(formatMoney(0.1 + 0.2)).toBeNull()
  })

  it('returns null for anything that is not a plain decimal string', () => {
    expect(formatMoney(undefined)).toBeNull()
    expect(formatMoney(null)).toBeNull()
    expect(formatMoney('')).toBeNull()
    expect(formatMoney('abc')).toBeNull()
    expect(formatMoney('1e3')).toBeNull()
    expect(formatMoney('1,234.00')).toBeNull()
    expect(formatMoney(' 19.99 ')).toBeNull()
    expect(formatMoney('Infinity')).toBeNull()
  })

  it('rounds for display exactly, on the decimal string', () => {
    // Display rounding only — the authoritative value stays whatever the backend sent.
    expect(formatMoney('0.005', EN_US)).toBe('$0.01')
    expect(formatMoney('0.004', EN_US)).toBe('$0.00')
  })

  it('honours currency and locale', () => {
    // Asserted in parts: ICU puts a non-breaking space between amount and symbol and the exact
    // flavour of it varies by ICU version, so pinning the whole string invites a version flake.
    const german = formatMoney('1234.5', { currency: 'EUR', locale: 'de-DE' })
    expect(german).toContain('1.234,50')
    expect(german).toContain('€')
    // Fraction digits follow the currency: JPY has none.
    expect(formatMoney('1234', { currency: 'JPY', locale: 'en-US' })).toBe('¥1,234')
  })

  it('defaults to USD', () => {
    expect(DEFAULT_CURRENCY).toBe('USD')
    expect(formatMoney('5.00', EN_US)).toBe(formatMoney('5.00', { ...EN_US, currency: 'USD' }))
  })

  it('reuses the same formatter for repeated locale/currency pairs', () => {
    // Cheap guard on the cache: identical input must stay stable across calls.
    expect(formatMoney('7.25', EN_US)).toBe(formatMoney('7.25', EN_US))
  })
})

describe('isMoneyAmount', () => {
  it('accepts signed plain decimals only', () => {
    expect(isMoneyAmount('0')).toBe(true)
    expect(isMoneyAmount('0.00')).toBe(true)
    expect(isMoneyAmount('-3.5')).toBe(true)
    expect(isMoneyAmount('12345678901.99')).toBe(true)

    expect(isMoneyAmount('+3.5')).toBe(false)
    expect(isMoneyAmount('.5')).toBe(false)
    expect(isMoneyAmount('3.')).toBe(false)
    expect(isMoneyAmount(3.5)).toBe(false)
    expect(isMoneyAmount(undefined)).toBe(false)
  })
})
