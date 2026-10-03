import { CATEGORIES } from '../../lib/types'
import type { FieldErrors } from '../auth/validation'

// Prompt 86 — the checks for a video's details, matching the backend's own rules
// (the mock's POST/PUT /videos): a title of 1–100 characters and a real category.

export const TITLE_MAX = 100
export const DESCRIPTION_MAX = 5000

export interface VideoDetailsValues {
  title: string
  description: string
  category: string
}

export function validateVideoDetails(v: VideoDetailsValues): FieldErrors<keyof VideoDetailsValues> {
  const errors: FieldErrors<keyof VideoDetailsValues> = {}
  const title = v.title.trim()
  if (!title) errors.title = 'Give your video a title.'
  else if (title.length > TITLE_MAX)
    errors.title = `Keep the title to ${TITLE_MAX} characters or fewer.`
  if (v.description.length > DESCRIPTION_MAX) {
    errors.description = `Keep the description to ${DESCRIPTION_MAX.toLocaleString()} characters or fewer.`
  }
  if (!(CATEGORIES as readonly string[]).includes(v.category))
    errors.category = 'Choose a category.'
  return errors
}
