/**
 * Id conventions tying a form control to its hint and error text.
 *
 * Kept next to `<Field>` but in their own module so `Field.tsx` exports a component and nothing
 * else (React Fast Refresh, and the `react/only-export-components` lint rule, both want that).
 * Internal to `components/` — not re-exported from the barrel.
 */

export function hintId(controlId: string): string {
  return `${controlId}-hint`
}

export function errorId(controlId: string): string {
  return `${controlId}-error`
}

/**
 * The `aria-describedby` value a control should carry for the hint/error it was given, or
 * `undefined` when it has neither.
 */
export function describedBy(
  controlId: string,
  hasHint: boolean,
  hasError: boolean,
): string | undefined {
  const ids = [hasHint && hintId(controlId), hasError && errorId(controlId)].filter(Boolean)
  return ids.length > 0 ? ids.join(' ') : undefined
}
