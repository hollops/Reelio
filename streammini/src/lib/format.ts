// Small, pure helpers that turn raw data into text people read. Shared across the app.

const pad2 = (n: number) => String(n).padStart(2, '0')

function split(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds || 0))
  return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}

/** Clock-style duration, like YouTube: 10 → "0:10", 653 → "10:53", 3723 → "1:02:03". */
export function formatDuration(totalSeconds: number): string {
  const { h, m, s } = split(totalSeconds)
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`
}

/** The same duration in words, for screen readers: 653 → "10 minutes, 53 seconds". */
export function formatDurationSpoken(totalSeconds: number): string {
  const { h, m, s } = split(totalSeconds)
  const part = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`
  const parts = [
    h && part(h, 'hour'),
    m && part(m, 'minute'),
    (s || (!h && !m)) && part(s, 'second'),
  ]
  return parts.filter(Boolean).join(', ')
}

/** True if the date is within the last `days` days — used for "New" badges. */
export function isRecent(isoDate: string, days = 7, now = Date.now()): boolean {
  const age = now - new Date(isoDate).getTime()
  return age >= 0 && age < days * 24 * 60 * 60 * 1000
}

// Formatters are created once and reused — building one is slow compared with using one.
const longDate = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' })
const compactOneDecimal = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
})
const compactWhole = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 0 })
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/**
 * A count, YouTube style: 999 → "999", 1234 → "1.2K", 184_200 → "184K", 3_400_000 → "3.4M".
 * A decimal only while the leading number is under 10 — "184.2K" is noise, "1.2K" is useful.
 * Shared by views, likes and anything else that's counted.
 */
export function formatCount(count: number): string {
  const n = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0
  const leading = n / 1000 ** Math.floor(Math.log10(Math.max(n, 1)) / 3) // 184_200 → 184.2
  const formatter = leading < 10 ? compactOneDecimal : compactWhole
  return formatter.format(n)
}

/** "1.2K views", "1 view". */
export function formatViews(views: number): string {
  const n = Number.isFinite(views) && views > 0 ? Math.floor(views) : 0
  return `${formatCount(n)} ${n === 1 ? 'view' : 'views'}`
}

// Largest unit first: "2 years ago" reads better than "730 days ago".
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

/** "3 days ago", "yesterday", "2 months ago" — YouTube style. `now` is injectable for tests. */
export function formatTimeAgo(isoDate: string, now = Date.now()): string {
  const then = new Date(isoDate).getTime()
  if (Number.isNaN(then)) return ''
  const seconds = Math.max(0, Math.round((now - then) / 1000)) // future dates count as "now"
  for (const [unit, size] of UNITS) {
    if (seconds >= size) return relative.format(-Math.floor(seconds / size), unit)
  }
  return 'just now'
}

/** "2026-09-27T10:00:00Z" → "27 September 2026". Empty string for an invalid date. */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate)
  return Number.isNaN(date.getTime()) ? '' : longDate.format(date)
}
