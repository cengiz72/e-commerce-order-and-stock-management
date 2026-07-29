import type { ReactNode, SelectHTMLAttributes } from 'react'
import { cx } from './classNames'
import { Field } from './Field'
import { describedBy } from './fieldIds'

/**
 * Labelled single-choice select (docs/frontend-architecture.md §3.5).
 *
 * Options are passed as data rather than as `<option>` children so callers cannot smuggle
 * arbitrary markup into the control, and so a list mapped from an API response needs no JSX.
 *
 * `value` is a **string** on purpose: the ids this app selects by (`productId`, `categoryId`) are
 * opaque strings shared verbatim with the backend (mongodb-schema.md §3.1) and must never be
 * coerced to numbers.
 */
export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'children'> {
  /** Required: the label needs a stable target to point `htmlFor` at. */
  id: string
  label: ReactNode
  options: readonly SelectOption[]
  /**
   * Empty first entry, e.g. `'All categories'`. Its value is `''`, so "nothing chosen" stays
   * distinguishable from a real option.
   */
  placeholder?: string
  hint?: ReactNode
  error?: ReactNode
  /** Class for the field wrapper; `className` styles the `<select>` itself. */
  fieldClassName?: string
}

export function Select({
  id,
  label,
  options,
  placeholder,
  hint,
  error,
  fieldClassName,
  className,
  ...rest
}: SelectProps) {
  const invalid = error != null

  return (
    <Field id={id} label={label} hint={hint} error={error} className={fieldClassName}>
      <select
        {...rest}
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy(id, hint != null, invalid)}
        className={cx('ui-select', invalid && 'ui-select--invalid', className)}
      >
        {placeholder == null ? null : <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  )
}
