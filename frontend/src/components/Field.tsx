import type { ReactNode } from 'react'
import { cx } from './classNames'
import { errorId, hintId } from './fieldIds'

/**
 * Internal label/hint/error scaffolding shared by `<Input>` and `<Select>`.
 *
 * Not exported from `components/index.ts`: features compose fields out of `<Input>`/`<Select>`,
 * and keeping this private means the label/`aria-describedby` wiring can change without being a
 * breaking change for callers.
 */
export interface FieldProps {
  /** Id of the control being labelled. Also seeds the hint/error element ids. */
  id: string
  label: ReactNode
  hint?: ReactNode
  /** Validation message. Presence alone marks the field invalid. */
  error?: ReactNode
  className?: string
  children: ReactNode
}

export function Field({ id, label, hint, error, className, children }: FieldProps) {
  return (
    <div className={cx('ui-field', error != null && 'ui-field--invalid', className)}>
      <label className="ui-field__label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint == null ? null : (
        <p className="ui-field__hint" id={hintId(id)}>
          {hint}
        </p>
      )}
      {error == null ? null : (
        // `role="alert"` so a validation message that appears after submit is announced.
        <p className="ui-field__error" id={errorId(id)} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
