// A spinning circle for waits of unknown shape: button actions, player buffering, small panels.
// For content whose layout is known in advance (poster rows, detail pages), use <Skeleton> instead.

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  /** Read aloud by screen readers. Pass null when a parent already announces the loading state. */
  label?: string | null
  className?: string
}

const sizes = { sm: 'size-4', md: 'size-5', lg: 'size-10' }

export function Spinner({ size = 'md', label = 'Loading', className = '' }: SpinnerProps) {
  return (
    <span role={label ? 'status' : undefined} className={`inline-flex ${className}`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        // motion-safe: only spins if the user hasn't asked their device to reduce motion.
        className={`${sizes[size]} motion-safe:animate-spin`}
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
        <path
          d="M22 12a10 10 0 0 0-10-10"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </span>
  )
}
