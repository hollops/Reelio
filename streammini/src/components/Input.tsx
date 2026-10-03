import { useId, useState, type InputHTMLAttributes } from 'react'

// A labelled text field with an optional hint, an optional error message and, for passwords,
// a show/hide toggle.

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  /** Helpful guidance shown under the box, e.g. "At least 8 characters". */
  hint?: string
  error?: string
}

export function Input({
  label,
  hint,
  error,
  type = 'text',
  className = '',
  'aria-describedby': extraDescribedBy, // e.g. a password checklist rendered outside this box
  ...rest
}: InputProps) {
  const id = useId() // unique id that links the label, hint and error to this exact box
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const [showPassword, setShowPassword] = useState(false)

  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type
  // Screen readers read these after the label: the error first (most urgent), then the hint.
  // Merged, not replaced — otherwise passing aria-describedby would silently unlink the error.
  const describedBy =
    [error && errorId, hint && hintId, extraDescribedBy].filter(Boolean).join(' ') || undefined

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="block text-small font-medium text-fg">
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type={inputType}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`h-11 w-full rounded-md border bg-surface px-3 text-body text-fg placeholder:text-fg-subtle focus:outline-2 focus:outline-offset-1 focus:outline-accent-text disabled:opacity-50 ${
            error ? 'border-danger' : 'border-line-strong'
          } ${isPassword ? 'pr-16' : ''}`}
          {...rest}
        />

        {isPassword && (
          <button
            type="button" // not "submit" — this sits inside a form
            onClick={() => setShowPassword((shown) => !shown)}
            aria-pressed={showPassword}
            disabled={rest.disabled}
            className="absolute inset-y-0 right-0 px-3 text-caption font-semibold text-fg-muted hover:text-fg disabled:opacity-50"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        )}
      </div>

      {error && (
        <p id={errorId} className="text-small text-danger">
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="text-caption text-fg-muted">
          {hint}
        </p>
      )}
    </div>
  )
}
