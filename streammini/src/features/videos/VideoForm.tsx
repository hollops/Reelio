import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '../../components/Button'
import { Select, TextArea } from '../../components/FormFields'
import { AlertIcon } from '../../components/icons'
import { Input } from '../../components/Input'
import { CATEGORIES } from '../../lib/types'
import { useAuthForm } from '../auth/useAuthForm'
import { joinChapters, splitChapters, validateChapters, type Chapter } from './chapters'
import { ChaptersEditor } from './ChaptersEditor'
import {
  DESCRIPTION_MAX,
  TITLE_MAX,
  validateVideoDetails,
  type VideoDetailsValues,
} from './videoValidation'

// Prompt 86 — ONE form for a video's details (the prompt's "TitleForm", YouTube-style):
// title, description, category. Used for uploading (87, empty) and editing (88, pre-filled),
// so the rules and the look can never drift apart between the two.
//
// It reuses the form "recipe" from Prompt 25 (useAuthForm): despite its name it's general —
// values, checks, server errors under the right box, focus on the first problem.

export interface VideoFormProps {
  initialValues?: Partial<VideoDetailsValues>
  submitLabel: string
  /** Send it. Throw an ApiError to show the server's messages under the right boxes. */
  onSubmit: (values: VideoDetailsValues) => Promise<void>
  onCancel?: () => void
  /** Extra parts inside the same <form> — the file picker (90), the chapters editor (91). */
  children?: ReactNode
  /** Prompt 90 — e.g. "still uploading": block submitting until it's done. */
  submitDisabled?: boolean
  /**
   * Prompt 87 — checks for the extra parts (e.g. "no file chosen"), run at the SAME moment as
   * the form's own checks, so every problem shows together. Return true if they're fine.
   */
  onValidate?: () => boolean
  /** Prompt 91 — the video's length in seconds, if known: no chapter may start after the end. */
  duration?: number | null
}

export function VideoForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
  children,
  submitDisabled = false,
  onValidate,
  duration,
}: VideoFormProps) {
  // Prompt 91 — chapters live at the end of the description; edit them as rows instead.
  // (Worked out once, when the form opens.)
  const [initial] = useState(() => splitChapters(initialValues?.description ?? ''))
  const [chapters, setChapters] = useState<Chapter[]>(initial.chapters)
  const [checkChapters, setCheckChapters] = useState(false) // only after the first Save
  const chapterErrors = checkChapters ? validateChapters(chapters, duration) : {}
  const chaptersRef = useRef<HTMLDivElement>(null)
  const focusChapter = useRef(false)

  // Chapters were the only problem → put focus on the first bad box once it's marked.
  useEffect(() => {
    if (!focusChapter.current) return
    focusChapter.current = false
    chaptersRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  })

  const {
    values,
    errors,
    formError,
    isSubmitting,
    setField,
    handleSubmit,
    validateNow,
    formRef,
    formErrorRef,
  } = useAuthForm({
    initialValues: {
      title: initialValues?.title ?? '',
      description: initial.body, // just the text — the chapter lines become rows below
      category: initialValues?.category ?? '',
    },
    validate: validateVideoDetails,
    onSubmit: (v) =>
      onSubmit({
        title: v.title.trim(),
        description: joinChapters(v.description, chapters), // text + chapter lines, together
        category: v.category,
      }),
  })

  // Prompt 87 — the extra checks (e.g. the file) run AT THE SAME TIME as the form's own, so every
  // problem shows together. If an extra check fails, show the field messages too, but send nothing.
  function submitAll(e: FormEvent<HTMLFormElement>) {
    const extrasOk = onValidate?.() ?? true
    setCheckChapters(true)
    const chaptersOk = Object.keys(validateChapters(chapters, duration)).length === 0
    if (extrasOk && chaptersOk) return handleSubmit(e)
    e.preventDefault()
    const fieldsOk = validateNow() // focuses the first bad field, if there is one
    if (fieldsOk && !chaptersOk) focusChapter.current = true
  }

  return (
    <form ref={formRef} onSubmit={submitAll} noValidate className="space-y-6">
      {/* A problem with the whole form (e.g. offline) — focused by the recipe when it appears. */}
      <div ref={formErrorRef} tabIndex={-1} role="alert" className="outline-none">
        {formError && (
          <p className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 p-3 text-small">
            <AlertIcon className="mt-0.5 size-4 shrink-0 text-danger" />
            {formError}
          </p>
        )}
      </div>

      {/* min-w-0: a fieldset is never narrower than its content by default — on a phone, the
          chapter rows would push the whole form off the screen. */}
      <fieldset disabled={isSubmitting} className="min-w-0 space-y-6">
        <legend className="sr-only">Video details</legend>
        {children}
        <Input
          label="Title"
          name="title"
          value={values.title}
          onChange={(e) => setField('title', e.target.value)}
          error={errors.title}
          // A live count, so nobody is surprised by the limit at the end.
          hint={`${values.title.trim().length} / ${TITLE_MAX}`}
          maxLength={TITLE_MAX + 20} // a little slack: we explain the limit instead of cutting text off
        />
        <TextArea
          label="Description"
          name="description"
          value={values.description}
          onChange={(e) => setField('description', e.target.value)}
          error={errors.description}
          hint={`Optional. Tell viewers what it's about — up to ${DESCRIPTION_MAX.toLocaleString()} characters.`}
          rows={6}
        />
        <div ref={chaptersRef}>
          <ChaptersEditor chapters={chapters} onChange={setChapters} errors={chapterErrors} />
        </div>
        <Select
          label="Category"
          name="category"
          options={CATEGORIES}
          placeholder="Choose a category"
          value={values.category}
          onChange={(e) => setField('category', e.target.value)}
          error={errors.category}
        />

        <div className="flex flex-wrap justify-end gap-3">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" isLoading={isSubmitting} disabled={submitDisabled}>
            {submitLabel}
          </Button>
        </div>
      </fieldset>
    </form>
  )
}
