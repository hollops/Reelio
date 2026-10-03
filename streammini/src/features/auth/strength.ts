import { PASSWORD_RULES } from './validation'

// Password STRENGTH is advice, not a rule: it nudges people towards better passwords but never
// blocks the form. (Blocking is the job of PASSWORD_RULES.) A rough score is enough here —
// real apps often use a library such as zxcvbn, which also knows dictionary words and names.

export type StrengthLevel = 'weak' | 'fair' | 'strong'

export interface Strength {
  level: StrengthLevel
  label: string
  /** How many of the 3 bar segments to fill. */
  filled: 1 | 2 | 3
  /** One short tip for doing better, when there is one. */
  tip?: string
}

// Passwords that meet our rules but appear at the top of every leaked-password list.
const COMMON = new Set([
  'password1',
  'password123',
  '12345678',
  '123456789',
  'qwerty123',
  'abc12345',
  'iloveyou1',
  'welcome1',
  'admin123',
  'letmein1',
])

export function passwordStrength(password: string): Strength | null {
  if (!password) return null // nothing typed yet: show no verdict at all

  const meetsRules = PASSWORD_RULES.every((rule) => rule.test(password))
  if (!meetsRules) return { level: 'weak', label: 'Weak', filled: 1 }
  if (COMMON.has(password.toLowerCase())) {
    return {
      level: 'weak',
      label: 'Weak',
      filled: 1,
      tip: 'This is a very common password. Pick something only you would use.',
    }
  }

  // Bonus points beyond the minimum rules.
  const extras = [
    password.length >= 12, // length matters most
    /[a-z]/.test(password) && /[A-Z]/.test(password), // mixed case
    /[^A-Za-z0-9]/.test(password), // a symbol, e.g. ! ? #
  ].filter(Boolean).length

  if (extras >= 2) return { level: 'strong', label: 'Strong', filled: 3 }
  return {
    level: 'fair',
    label: 'Fair',
    filled: 2,
    tip:
      password.length < 12
        ? 'Longer is stronger — try 12 or more characters.'
        : 'Add a capital letter or a symbol to make it stronger.',
  }
}
