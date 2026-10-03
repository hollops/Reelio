import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError } from '../../lib/apiClient'
import type { FieldErrors } from './validation'

// The shared "recipe" behind the login and register forms. It owns:
//   values        what's typed in each box
//   errors        one message per box (from our checks or from the server)
//   formError     a message about the whole form ("Incorrect email or password.")
//   isSubmitting  true while the request is in flight (Prompt 29)
// and it moves keyboard focus to the first problem, so nobody has to hunt for it.

interface Options<F extends string> {
  initialValues: Record<F, string>
  validate: (values: Record<F, string>) => FieldErrors<F>
  /** Send the request. Throw (e.g. an ApiError) to show an error; return normally on success. */
  onSubmit: (values: Record<F, string>) => Promise<void>
}

export function useAuthForm<F extends string>({ initialValues, validate, onSubmit }: Options<F>) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<FieldErrors<F>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Before the first submit we stay quiet — nobody likes "invalid email" after typing one letter.
  // After it, each box is re-checked as the user types, so errors vanish the moment they're fixed.
  const [attempted, setAttempted] = useState(false)

  const formRef = useRef<HTMLFormElement>(null)
  const formErrorRef = useRef<HTMLDivElement>(null)
  // Where focus should go after the next render. A ref, not state: changing it must not re-render.
  const focusNext = useRef<F | 'form' | null>(null)

  // Runs after every render. Focus has to wait until then: while submitting, the whole form is
  // disabled, and a disabled box can't receive focus.
  useEffect(() => {
    const target = focusNext.current
    if (!target) return
    focusNext.current = null
    if (target === 'form') formErrorRef.current?.focus()
    else (formRef.current?.elements.namedItem(target) as HTMLElement | null)?.focus()
  })

  const fields = Object.keys(initialValues) as F[]
  const firstInvalid = (found: FieldErrors<F>) => fields.find((f) => found[f])

  function setField(field: F, value: string) {
    const next = { ...values, [field]: value }
    setValues(next)
    // Update only THIS box's message, so a server error on another box isn't wiped by typing here.
    if (attempted) setErrors((prev) => ({ ...prev, [field]: validate(next)[field] }))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault() // we send the data ourselves; stop the browser's full-page submit
    if (isSubmitting) return

    setAttempted(true)
    setFormError(null)

    // 1. Our own checks first — no point asking the server about an obviously bad email.
    const found = validate(values)
    setErrors(found)
    const first = firstInvalid(found)
    if (first) {
      focusNext.current = first
      return
    }

    // 2. Ask the server.
    setIsSubmitting(true)
    try {
      await onSubmit(values)
    } catch (err) {
      const serverErrors = err instanceof ApiError ? pickKnown(err.fieldErrors, fields) : {}
      const firstServer = firstInvalid(serverErrors)
      if (firstServer) {
        // e.g. 409 → "An account with this email already exists." under the Email box.
        setErrors(serverErrors)
        focusNext.current = firstServer
      } else {
        // Wrong password, server down, no connection… — a message for the whole form.
        setFormError(
          err instanceof ApiError ? err.message : 'Something went wrong. Please try again.',
        )
        focusNext.current = 'form'
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * Prompt 87 — show the form's own messages WITHOUT sending (for when something outside the
   * fields, like a missing file, already stops the submit). Returns true if the fields are fine.
   */
  function validateNow(): boolean {
    setAttempted(true)
    setFormError(null)
    const found = validate(values)
    setErrors(found)
    const first = firstInvalid(found)
    if (first) focusNext.current = first
    return !first
  }

  return {
    values,
    errors,
    formError,
    isSubmitting,
    setField,
    handleSubmit,
    validateNow,
    formRef,
    formErrorRef,
  }
}

/** Keep only the server's messages for boxes this form actually has. */
function pickKnown<F extends string>(all: Record<string, string>, fields: F[]): FieldErrors<F> {
  const known: FieldErrors<F> = {}
  for (const f of fields) if (all[f]) known[f] = all[f]
  return known
}
