// Button styles on their own, so links that should LOOK like buttons can share them.
// Kept out of Button.tsx because a file exporting both components and helpers breaks fast refresh.

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const base =
  'relative inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-text ' +
  'disabled:cursor-not-allowed disabled:opacity-50'

// `hover:not-disabled:` (not `hover:enabled:`) so the hover also works on links, which are never "enabled".
const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-fg hover:not-disabled:bg-accent-hover',
  secondary: 'bg-elevated text-fg hover:not-disabled:bg-line',
  ghost: 'bg-transparent text-fg-muted hover:not-disabled:bg-elevated hover:not-disabled:text-fg',
  // Prompt 89 — for actions that can't be undone (always with clear words, not colour alone).
  danger: 'bg-danger-solid text-white hover:not-disabled:bg-danger-solid-hover',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-small',
  md: 'h-10 px-4 text-small',
  lg: 'h-12 px-6 text-body',
}

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  className = '',
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`.trim()
}
