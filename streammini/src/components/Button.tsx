import type { ButtonHTMLAttributes, Ref } from 'react'
import { buttonStyles, type ButtonSize, type ButtonVariant } from './buttonStyles'
import { Spinner } from './Spinner'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Shows a spinner and blocks clicks — e.g. while a request is in flight. */
  isLoading?: boolean
  /** Prompt 89 — e.g. to move focus to this button. (React 19: a ref is just a prop now.) */
  ref?: Ref<HTMLButtonElement>
}

export function Button({
  ref,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  // A plain <button> inside a form defaults to "submit". Default to "button" to avoid surprises.
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={buttonStyles({ variant, size, className })}
      {...rest}
    >
      {/* While loading, the label turns see-through rather than disappearing. That keeps the
          button's width (no layout jump) AND its name for screen readers: "Sign in, busy".
          (`invisible` would remove the name, leaving a button announced as just "button".) */}
      <span className={`inline-flex items-center gap-2 ${isLoading ? 'opacity-0' : ''}`}>
        {children}
      </span>
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          {/* label={null}: aria-busy on the button already announces the loading state. */}
          <Spinner label={null} />
        </span>
      )}
    </button>
  )
}
