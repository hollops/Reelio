import type { ElementType, HTMLAttributes, ReactNode } from 'react'

// Layout helpers, so every page shares the same widths, margins and grid.
// Pages use these instead of hand-writing `mx-auto max-w-7xl px-4 …` each time.

const widths = {
  narrow: 'max-w-md', // forms: login, register, upload
  content: 'max-w-3xl', // reading: profile, settings
  wide: 'max-w-screen-2xl', // browsing: video grids, the watch page
}

export interface ContainerProps extends HTMLAttributes<HTMLElement> {
  size?: keyof typeof widths
  /** Render as a different element, e.g. as="section" or as="nav". Defaults to <div>. */
  as?: ElementType
  children: ReactNode
}

/** Centres content, caps its width, and keeps a side gutter (16px phone → 32px desktop). */
export function Container({
  size = 'wide',
  as: Tag = 'div',
  className = '',
  children,
  ...rest // any other attribute (aria-label, id…) passes straight through
}: ContainerProps) {
  return (
    <Tag className={`mx-auto w-full px-4 sm:px-6 lg:px-8 ${widths[size]} ${className}`} {...rest}>
      {children}
    </Tag>
  )
}

/**
 * The YouTube-style grid of video cards. Rather than fixed breakpoints, it fits as many columns
 * of at least 18rem (288px) as ITS OWN box allows — so it adapts inside narrow areas too.
 * `min(100%, 18rem)` stops a card from ever being wider than a small phone screen.
 */
export function VideoGrid({
  className = '',
  heading,
  children,
}: {
  className?: string
  /**
   * Prompt 94 — an unseen h2 above the grid. The cards' titles are h3s (right under Home's h2
   * rows); on a page whose grid sits straight under the h1, this keeps h1 → h2 → h3 — screen
   * reader users move by headings like a table of contents, and a skipped level looks broken.
   */
  heading?: string
  children: ReactNode
}) {
  return (
    <>
      {heading && <h2 className="sr-only">{heading}</h2>}
      <div
        className={`grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-x-4 gap-y-8 ${className}`}
      >
        {children}
      </div>
    </>
  )
}

export interface PageHeaderProps {
  title: string
  description?: string
  /** Buttons or links shown on the right (below the title on phones). */
  actions?: ReactNode
}

/** The same title block at the top of every page. The page's only <h1>. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 py-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-heading font-bold text-balance">{title}</h1>
        {description && <p className="mt-1 text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-3">{actions}</div>}
    </header>
  )
}
