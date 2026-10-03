import { useId, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

// Prompt 86 — a multi-line text box and a dropdown, built exactly like <Input> (Prompt 11):
// a label linked to its control, an optional hint and error, and the screen-reader wiring
// (aria-describedby / aria-invalid) so the hint and error are read with the control.

function describedBy(...ids: (string | false | undefined)[]) {
  return ids.filter(Boolean).join(' ') || undefined
}

const fieldClass = (error?: string) =>
  `w-full rounded-md border bg-surface px-3 text-body text-fg placeholder:text-fg-subtle focus:outline-2 focus:outline-offset-1 focus:outline-accent-text disabled:opacity-50 ${
    error ? 'border-danger' : 'border-line-strong'
  }`

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
  error?: string
}

export function TextArea({ label, hint, error, className = '', rows = 5, ...rest }: TextAreaProps) {
  const id = useId()
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="block text-small font-medium text-fg">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(error && `${id}-error`, hint && `${id}-hint`)}
        className={`${fieldClass(error)} resize-y py-2`}
        {...rest}
      />
      {error && (
        <p id={`${id}-error`} className="text-small text-danger">
          {error}
        </p>
      )}
      {hint && (
        <p id={`${id}-hint`} className="text-caption text-fg-muted">
          {hint}
        </p>
      )}
    </div>
  )
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: readonly string[]
  /** The first, empty choice, e.g. "Choose a category". */
  placeholder?: string
  hint?: string
  error?: string
}

export function Select({
  label,
  options,
  placeholder,
  hint,
  error,
  className = '',
  ...rest
}: SelectProps) {
  const id = useId()
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="block text-small font-medium text-fg">
        {label}
      </label>
      {/* A real <select>: phones show their own native picker, keyboards work for free. */}
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(error && `${id}-error`, hint && `${id}-hint`)}
        className={`${fieldClass(error)} h-11`}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} className="text-small text-danger">
          {error}
        </p>
      )}
      {hint && (
        <p id={`${id}-hint`} className="text-caption text-fg-muted">
          {hint}
        </p>
      )}
    </div>
  )
}
