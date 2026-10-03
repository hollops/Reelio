import { useState } from 'react'
import { colorFor, initialsOf } from '../lib/avatar'

// A round picture of a person or channel. Shows their photo when there is one and it loads;
// otherwise their initials on a colour that's always the same for the same name.

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const sizes: Record<AvatarSize, string> = {
  xs: 'size-6 text-[0.625rem]', // 24px — tiny lists
  sm: 'size-8 text-caption', // 32px — comments
  md: 'size-9 text-caption', // 36px — video cards (YouTube's size)
  lg: 'size-12 text-body', // 48px — channel header, profile menu
  xl: 'size-20 text-heading', // 80px — profile page
}

export interface AvatarProps {
  name: string
  /** Photo URL. Missing, empty or broken → initials. */
  src?: string
  size?: AvatarSize
  /**
   * True when the person's name is already written next to the avatar (video cards, comments),
   * so screen readers skip it instead of reading the name twice.
   */
  decorative?: boolean
  className?: string
}

export function Avatar({
  name,
  src,
  size = 'md',
  decorative = false,
  className = '',
}: AvatarProps) {
  // Remember WHICH url failed, not just "it failed" — so if `src` changes to a new photo,
  // we automatically try again instead of staying stuck on initials.
  const [failedSrc, setFailedSrc] = useState<string>()
  const showPhoto = Boolean(src) && src !== failedSrc

  const a11y = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': name }

  return (
    <span
      {...a11y}
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white select-none ${sizes[size]} ${className}`}
      style={showPhoto ? undefined : { backgroundColor: colorFor(name) }}
    >
      {showPhoto ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailedSrc(src)}
          className="size-full bg-elevated object-cover"
        />
      ) : (
        initialsOf(name)
      )}
    </span>
  )
}
