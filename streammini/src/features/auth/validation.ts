import type { LoginInput, RegisterInput } from '../../lib/types'

// Client-side checks: instant feedback BEFORE a request is sent.
// This is a convenience, not security — the backend repeats every check, because anyone can
// bypass the browser and call the API directly. Keep these rules in step with the backend's.

/** One message per field; a field with no entry is valid. */
export type FieldErrors<F extends string> = Partial<Record<F, string>>

// "something@something.something" — the same loose rule the backend uses. Stricter email regexes
// reject real addresses; the true test of an email is sending mail to it.
export const EMAIL_PATTERN = /^\S+@\S+\.\S+$/
export const PASSWORD_MIN_LENGTH = 8

export interface PasswordRule {
  id: string
  /** Shown in the live checklist under the box. */
  label: string
  /** Shown as the error when the form is submitted without meeting it. */
  error: string
  test: (password: string) => boolean
}

/**
 * The password RULES — must all pass before the form can be sent (the backend enforces the same).
 * One list feeds both the live checklist and the submit check, so they can never disagree.
 */
export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: 'length',
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    error: `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
    test: (pw) => pw.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: 'number',
    label: 'At least one number (0–9)',
    error: 'Add at least one number (0–9).',
    test: (pw) => /\d/.test(pw),
  },
]

/** The email rule, shared by Login, Register and "Forgot password". */
export function checkEmail(email: string): string | undefined {
  if (!email.trim()) return 'Enter your email address.'
  if (!EMAIL_PATTERN.test(email.trim()))
    return 'Enter a valid email address, like name@example.com.'
  return undefined
}

export const NAME_MAX_LENGTH = 50

/** The name rule, shared by Register and the Profile page so the two can never disagree. */
export function checkName(value: string): string | undefined {
  const name = value.trim()
  if (!name) return 'Enter your name.'
  if (name.length > NAME_MAX_LENGTH) return `Keep your name under ${NAME_MAX_LENGTH} characters.`
  return undefined
}

export function validateRegister(values: RegisterInput): FieldErrors<keyof RegisterInput> {
  const errors: FieldErrors<keyof RegisterInput> = {}

  const name = checkName(values.name)
  if (name) errors.name = name

  const email = checkEmail(values.email)
  if (email) errors.email = email

  if (!values.password) errors.password = 'Choose a password.'
  else {
    // Report the first rule not yet met — the checklist under the box shows all of them.
    const unmet = PASSWORD_RULES.find((rule) => !rule.test(values.password))
    if (unmet) errors.password = unmet.error
  }

  return errors
}

export function validateLogin(values: LoginInput): FieldErrors<keyof LoginInput> {
  const errors: FieldErrors<keyof LoginInput> = {}

  const email = checkEmail(values.email)
  if (email) errors.email = email

  // No length rule here: login only asks "is it filled in?". Hinting at password rules on the
  // login form helps attackers guess, and older accounts may predate today's rules.
  if (!values.password) errors.password = 'Enter your password.'

  return errors
}
