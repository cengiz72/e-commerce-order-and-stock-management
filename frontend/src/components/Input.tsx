import type { InputHTMLAttributes, ReactNode } from 'react'
import { cx } from './classNames'
import { Field } from './Field'
import { describedBy } from './fieldIds'

/**
 * Labelled text input (docs/frontend-architecture.md §3.5).
 *
 * Controlled or uncontrolled — that is the caller's business; this component only guarantees the
 * label/hint/error markup and the accessibility wiring between them.
 *
 * It holds **no validation logic**. `error` is a message the caller decided to show; whether a
 * value is valid is a feature/backend concern, and the form library question is still open
 * (docs/frontend-architecture.md OQ6).
 */
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  /** Required: the label needs a stable target to point `htmlFor` at. */
  id: string
  label: ReactNode
  /** Helper text shown under the control. */
  hint?: ReactNode
  /** Validation message. Also sets `aria-invalid` on the control. */
  error?: ReactNode
  /** Class for the field wrapper; `className` styles the `<input>` itself. */
  fieldClassName?: string
}

export function Input({
  id,
  label,
  hint,
  error,
  fieldClassName,
  className,
  ...rest
}: InputProps) {
  const invalid = error != null

  return (
    <Field id={id} label={label} hint={hint} error={error} className={fieldClassName}>
      <input
        {...rest}
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy(id, hint != null, invalid)}
        className={cx('ui-input', invalid && 'ui-input--invalid', className)}
      />
    </Field>
  )
}
