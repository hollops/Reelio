// Helpers behind <Avatar>: initials and a stable colour for people without a photo.
// (Kept out of Avatar.tsx so that file only exports components — fast refresh needs that.)

/** "Ada Viewer" → "AV", "Learn With Tobi" → "LT", "prince" → "P", "" → "?". */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const first = words[0]
  const last = words.length > 1 ? words[words.length - 1] : ''
  // Array.from splits by character, not by byte, so names starting with accents or emoji work.
  return (Array.from(first)[0] + (last ? Array.from(last)[0] : '')).toUpperCase()
}

// Deep colours that all keep white initials above WCAG AA (4.5:1). Measured: lowest is
// olive at 4.99:1, highest blue at 6.70:1. Re-check contrast before adding a colour.
export const AVATAR_COLORS = [
  '#6d4aff', // violet (brand accent)
  '#0f766e', // teal
  '#b45309', // amber
  '#be123c', // rose
  '#1d4ed8', // blue
  '#4d7c0f', // olive
  '#a21caf', // fuchsia
  '#c2410c', // orange
] as const

/**
 * The same name always gets the same colour; different names spread across the palette.
 * Uses a simple string hash (djb2): turn the text into a number, then pick a colour by it.
 */
export function colorFor(name: string): string {
  let hash = 5381
  for (const ch of name.trim().toLowerCase()) hash = (hash * 33) ^ ch.codePointAt(0)!
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}
