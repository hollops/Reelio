import type { ReactNode } from 'react'
import { formatDuration, formatDurationSpoken } from '../lib/format'

// A small, non-clickable label that tells you something at a glance.
//   neutral  — category tags ("Food", "Music")
//   accent   — something worth noticing ("New")
//   overlay  — sits on top of a thumbnail (durations); dark and see-through so it reads on any image

export type BadgeVariant = 'neutral' | 'accent' | 'overlay'

const variants: Record<BadgeVariant, string> = {
  neutral: 'bg-elevated text-fg-muted',
  accent: 'bg-accent text-accent-fg',
  overlay: 'bg-black/80 text-white',
}

export interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-caption font-semibold whitespace-nowrap ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}

/**
 * The "10:53" label in the corner of a thumbnail. Place it inside a `relative` container.
 * Screen readers hear "10 minutes, 53 seconds" instead of "ten fifty-three".
 */
export function DurationBadge({
  seconds,
  suffix,
  className = '',
}: {
  seconds: number
  /** Words after the time, e.g. "left" → "8:12 left" (Continue watching, Prompt 79). */
  suffix?: string
  className?: string
}) {
  return (
    <Badge variant="overlay" className={`absolute right-2 bottom-2 tabular-nums ${className}`}>
      <span aria-hidden="true">
        {formatDuration(seconds)}
        {suffix && ` ${suffix}`}
      </span>
      <span className="sr-only">
        {formatDurationSpoken(seconds)}
        {suffix && ` ${suffix}`}
      </span>
    </Badge>
  )
}
