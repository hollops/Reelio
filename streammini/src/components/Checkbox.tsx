import { useId, type InputHTMLAttributes } from 'react'

// A real <input type="checkbox"> (so Space toggles it and screen readers say "checkbox, checked"),
// tinted with the brand colour. Clicking the label text toggles it too.

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
}

export function Checkbox({ label, className = '', ...rest }: CheckboxProps) {
  const id = useId()
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <input
        id={id}
        type="checkbox"
        // accent-*: colours the browser's own checkbox — no custom drawing needed.
        className="size-4 cursor-pointer accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-text disabled:cursor-not-allowed disabled:opacity-50"
        {...rest}
      />
      <label htmlFor={id} className="cursor-pointer text-small text-fg-muted select-none">
        {label}
      </label>
    </div>
  )
}
