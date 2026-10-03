import { passwordStrength, type StrengthLevel } from './strength'
import { PASSWORD_RULES } from './validation'

// Live feedback under the Register password box: a checklist of the rules that ticks itself off,
// and a 3-part strength bar. Colour is never the only signal — every state also has words,
// for people who can't tell red from green and for screen readers.

const barColor: Record<StrengthLevel, string> = {
  weak: 'bg-danger',
  fair: 'bg-warning',
  strong: 'bg-success',
}
const textColor: Record<StrengthLevel, string> = {
  weak: 'text-danger',
  fair: 'text-warning',
  strong: 'text-success',
}

export function PasswordStrength({ password, id }: { password: string; id: string }) {
  const strength = passwordStrength(password)

  return (
    <div id={id} className="space-y-2">
      <ul className="space-y-1" aria-label="Password requirements">
        {PASSWORD_RULES.map((rule) => {
          const met = rule.test(password)
          return (
            <li
              key={rule.id}
              className={`flex items-center gap-2 text-caption ${met ? 'text-success' : 'text-fg-muted'}`}
            >
              <span aria-hidden="true" className="inline-flex w-3 justify-center font-bold">
                {met ? '✓' : '•'}
              </span>
              {rule.label}
              <span className="sr-only">{met ? ' — met' : ' — not met yet'}</span>
            </li>
          )
        })}
      </ul>

      <div className={`flex items-center gap-3 ${strength ? '' : 'sr-only'}`}>
        {/* The bar is decoration; the word next to it carries the meaning. */}
        <div aria-hidden="true" className="flex flex-1 gap-1">
          {[1, 2, 3].map((segment) => (
            <span
              key={segment}
              className={`h-1.5 flex-1 rounded-full motion-safe:transition-colors ${
                strength && segment <= strength.filled ? barColor[strength.level] : 'bg-line'
              }`}
            />
          ))}
        </div>
        {/* aria-live: screen readers hear "Password strength: Fair" when the verdict CHANGES,
            not on every key. It stays in the page even when empty — a live region must exist
            BEFORE its text changes, or the first announcement can be missed. */}
        <p
          aria-live="polite"
          className={`text-caption font-semibold ${strength ? textColor[strength.level] : ''}`}
        >
          {strength && (
            <>
              <span className="sr-only">Password strength: </span>
              {strength.label}
            </>
          )}
        </p>
      </div>
      {strength?.tip && <p className="text-caption text-fg-muted">{strength.tip}</p>}
    </div>
  )
}
