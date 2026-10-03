import { formatDuration } from '../../lib/format'

// Prompt 91 — chapters (YouTube's answer to "episodes"): named parts of one video.
// Stored the way YouTube does it — as lines at the end of the DESCRIPTION:
//
//     Chapters
//     0:00 Intro
//     1:30 The parade
//
// so no new database field is needed and the backend doesn't change. These pure helpers
// read them out of a description, write them back, and check the rules.

export interface Chapter {
  id: string // stable key for React while rows move around
  time: string // exactly what was typed, e.g. "1:30"
  title: string
}

export const CHAPTER_TITLE_MAX = 80
const HEADER = 'Chapters'
// "1:30 The parade", "1:02:03 - Fireworks" (an optional dash after the time)
const LINE = /^\s*((?:\d+:)?\d{1,2}:\d{2})\s+(?:[-–—]\s*)?(.+?)\s*$/

let nextId = 0
export const newChapter = (time = '', title = ''): Chapter => ({
  id: `ch${++nextId}`,
  time,
  title,
})

/** "1:30" → 90, "1:02:03" → 3723; null when it isn't a valid time. */
export function parseTimestamp(text: string): number | null {
  const m = /^(?:(\d+):)?(\d{1,2}):(\d{2})$/.exec(text.trim())
  if (!m) return null
  const [h, min, s] = [Number(m[1] ?? 0), Number(m[2]), Number(m[3])]
  if (s > 59 || (m[1] !== undefined && min > 59)) return null
  return h * 3600 + min * 60 + s
}

/** Split a description into its normal text and its chapters (only if they start at 0:00). */
export function splitChapters(description: string): { body: string; chapters: Chapter[] } {
  const lines = description.split('\n')
  const found = lines.flatMap((line, index) => {
    const m = LINE.exec(line)
    return m ? [{ index, time: m[1], title: m[2] }] : []
  })
  // YouTube's rule: no chapters unless the first one is at 0:00 — a stray "1:30" in a sentence-
  // like line stays part of the text.
  if (found.length === 0 || parseTimestamp(found[0].time) !== 0) {
    return { body: description.trim(), chapters: [] }
  }
  const used = new Set(found.map((f) => f.index))
  const body = lines
    .filter((line, i) => !used.has(i) && line.trim() !== HEADER)
    .join('\n')
    .trim()
  return { body, chapters: found.map((f) => newChapter(f.time, f.title)) }
}

/** The opposite: normal text + chapter lines, ready to save. */
export function joinChapters(body: string, chapters: Chapter[]): string {
  const text = body.trim()
  if (chapters.length === 0) return text
  const lines = chapters.map((c) => {
    const seconds = parseTimestamp(c.time)
    return `${seconds === null ? c.time.trim() : formatDuration(seconds)} ${c.title.trim()}`
  })
  return [text, [HEADER, ...lines].join('\n')].filter(Boolean).join('\n\n')
}

export interface ChapterErrors {
  time?: string
  title?: string
}

/** Problems per chapter (by id). Empty object = all fine. `duration` is the video's length, if known. */
export function validateChapters(
  chapters: Chapter[],
  duration?: number | null,
): Record<string, ChapterErrors> {
  const errors: Record<string, ChapterErrors> = {}
  let previous = -1
  chapters.forEach((c, i) => {
    const e: ChapterErrors = {}
    const seconds = parseTimestamp(c.time)
    if (seconds === null) e.time = 'Use a time like 1:30.'
    else if (i === 0 && seconds !== 0) e.time = 'The first chapter starts at 0:00.'
    else if (i > 0 && seconds <= previous) e.time = 'Each chapter must start after the one above.'
    else if (duration && seconds >= duration)
      e.time = `The video is only ${formatDuration(duration)} long.`
    if (seconds !== null) previous = Math.max(previous, seconds)

    const title = c.title.trim()
    if (!title) e.title = 'Give this chapter a name.'
    else if (title.length > CHAPTER_TITLE_MAX)
      e.title = `Keep chapter names to ${CHAPTER_TITLE_MAX} characters.`
    if (e.time || e.title) errors[c.id] = e
  })
  return errors
}
