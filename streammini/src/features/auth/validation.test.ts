import { describe, expect, it } from 'vitest'
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULES,
  checkEmail,
  checkName,
  validateLogin,
  validateRegister,
} from './validation'

// Prompt 102 — the auth rules, tested on their own.
// These are pure functions: same input, same answer, no DOM and no network. That makes them
// the cheapest thing in the codebase to test and the easiest to trust.

describe('checkEmail', () => {
  it('asks for an address when the box is empty', () => {
    expect(checkEmail('')).toBe('Enter your email address.')
    expect(checkEmail('   ')).toBe('Enter your email address.')
  })

  it.each(['ada', 'ada@', 'ada@example', '@example.com', 'ada example.com'])(
    'rejects %j as not an email address',
    (value) => {
      expect(checkEmail(value)).toMatch(/valid email address/)
    },
  )

  it.each(['ada@example.com', 'ada.obi@mail.co.uk', 'a+tag@sub.domain.ng'])(
    'accepts %j',
    (value) => {
      expect(checkEmail(value)).toBeUndefined()
    },
  )

  it('ignores surrounding spaces, because people paste addresses', () => {
    expect(checkEmail('  ada@example.com  ')).toBeUndefined()
  })
})

describe('checkName', () => {
  it('requires a name', () => {
    expect(checkName('  ')).toBe('Enter your name.')
  })

  it('accepts an ordinary name', () => {
    expect(checkName('Ada Obi')).toBeUndefined()
  })

  it('refuses a name long enough to break the layout', () => {
    expect(checkName('a'.repeat(51))).toMatch(/under 50 characters/)
  })

  it('counts the trimmed name, not the spaces around it', () => {
    expect(checkName(`   ${'a'.repeat(50)}   `)).toBeUndefined()
  })
})

describe('PASSWORD_RULES', () => {
  it('is the single source for both the checklist and the submit check', () => {
    // If this list ever disagreed with validateRegister, the live checklist could show all
    // ticks while the form refused to send. Same array feeds both — this guards that.
    expect(PASSWORD_RULES.map((r) => r.id)).toEqual(['length', 'number'])
  })

  it.each([
    ['short1', false, 'too short'],
    ['longenoughbutnodigits', false, 'no number'],
    ['longenough1', true, 'meets both rules'],
  ])('%j → %s (%s)', (password, expected) => {
    expect(PASSWORD_RULES.every((r) => r.test(password))).toBe(expected)
  })

  it(`treats ${PASSWORD_MIN_LENGTH} characters as long enough (boundary)`, () => {
    const lengthRule = PASSWORD_RULES.find((r) => r.id === 'length')!
    expect(lengthRule.test('a'.repeat(PASSWORD_MIN_LENGTH - 1))).toBe(false)
    expect(lengthRule.test('a'.repeat(PASSWORD_MIN_LENGTH))).toBe(true)
  })
})

describe('validateRegister', () => {
  it('passes a complete, valid form', () => {
    expect(
      validateRegister({ name: 'Ada Obi', email: 'ada@example.com', password: 'password1' }),
    ).toEqual({})
  })

  it('reports every bad field at once, not just the first', () => {
    const errors = validateRegister({ name: '', email: 'nope', password: '' })
    expect(Object.keys(errors).sort()).toEqual(['email', 'name', 'password'])
  })

  it('names the first unmet password rule, so the message is actionable', () => {
    expect(validateRegister({ name: 'Ada', email: 'a@b.co', password: 'short1' }).password).toBe(
      'Use at least 8 characters.',
    )
    expect(
      validateRegister({ name: 'Ada', email: 'a@b.co', password: 'longenough' }).password,
    ).toBe('Add at least one number (0–9).')
  })
})

describe('validateLogin', () => {
  it('passes a filled-in form', () => {
    expect(validateLogin({ email: 'ada@example.com', password: 'anything' })).toEqual({})
  })

  it('only asks whether the password is filled in', () => {
    // Deliberate: hinting at password rules on the LOGIN form helps attackers guess, and
    // older accounts may predate today's rules. "x" is a fine login attempt.
    expect(validateLogin({ email: 'ada@example.com', password: 'x' })).toEqual({})
    expect(validateLogin({ email: 'ada@example.com', password: '' }).password).toBe(
      'Enter your password.',
    )
  })

  it('still checks the email is shaped like one', () => {
    expect(validateLogin({ email: 'nope', password: 'x' }).email).toMatch(/valid email/)
  })
})
