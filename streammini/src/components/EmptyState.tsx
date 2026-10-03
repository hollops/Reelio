import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Button } from './Button'
import { buttonStyles } from './buttonStyles'

// What a page shows when there's nothing to show: an icon, what's going on, and the way forward.
// A blank area looks broken; an empty state explains itself and points to the next step.

type EmptyAction =
  | { label: string; to: string } // goes somewhere → rendered as a link
  | { label: string; onClick: () => void } // does something → rendered as a button

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: EmptyAction
  /** An optional second way forward, shown as a quieter button beside the first. */
  secondaryAction?: EmptyAction
  className?: string
  /**
   * Prompt 94 — h2 when it sits inside a page with its own title (the usual case); h1 when the
   * empty state IS the page (e.g. "This video isn't available"), so every page has one main heading.
   */
  headingLevel?: 1 | 2
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className = '',
  headingLevel = 2,
}: EmptyStateProps) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'
  return (
    <div
      className={`mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center ${className}`}
    >
      {icon && (
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-surface text-fg-muted">
          {icon}
        </div>
      )}
      <Heading className="text-title font-semibold text-balance">{title}</Heading>
      {description && <p className="mt-2 text-small text-pretty text-fg-muted">{description}</p>}
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {action && <ActionButton action={action} variant="secondary" />}
          {secondaryAction && <ActionButton action={secondaryAction} variant="ghost" />}
        </div>
      )}
    </div>
  )
}

function ActionButton({
  action,
  variant,
}: {
  action: EmptyAction
  variant: 'secondary' | 'ghost'
}) {
  // Prompt 10's rule: goes somewhere → link; does something → button.
  return 'to' in action ? (
    <Link to={action.to} className={buttonStyles({ variant })}>
      {action.label}
    </Link>
  ) : (
    <Button variant={variant} onClick={action.onClick}>
      {action.label}
    </Button>
  )
}
