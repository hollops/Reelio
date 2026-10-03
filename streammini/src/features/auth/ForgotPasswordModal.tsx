import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Modal } from '../../components/Modal'
import { api, ApiError } from '../../lib/apiClient'
import { checkEmail } from './validation'

// Prompt 34: "Forgot password?" — collects an email and confirms that a reset link is on its way.
// Mock only: no email is really sent. Endpoint proposed to the backend: POST /auth/forgot-password.
//
// To start fresh every time it opens, the parent gives it a new `key` when opening it
// (a new key = React builds a brand-new component, with brand-new state).

interface Props {
  open: boolean
  onClose: () => void
  /** Whatever was already typed in the login form's Email box — no need to type it twice. */
  initialEmail?: string
}

/** The modal shows exactly one of these screens. */
type Step = { name: 'form' } | { name: 'sent'; email: string }

export function ForgotPasswordModal({ open, onClose, initialEmail = '' }: Props) {
  const [step, setStep] = useState<Step>({ name: 'form' })
  const [email, setEmail] = useState(initialEmail)
  const [error, setError] = useState<string>()
  const [isSending, setIsSending] = useState(false)

  const formId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const sentRef = useRef<HTMLParagraphElement>(null)

  // Put the cursor where the user needs it, whenever the screen changes. This runs after the
  // Modal's own effect (children's effects run first), so the <dialog> is already open here.
  useEffect(() => {
    if (!open) return
    if (step.name === 'form') {
      ;(formRef.current?.elements.namedItem('email') as HTMLInputElement | null)?.focus()
    } else {
      sentRef.current?.focus() // screen readers then read the confirmation straight away
    }
  }, [open, step.name])

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isSending) return
    const problem = checkEmail(email)
    setError(problem)
    if (problem) {
      ;(formRef.current?.elements.namedItem('email') as HTMLInputElement | null)?.focus()
      return
    }

    setIsSending(true)
    try {
      await api.post('/auth/forgot-password', { email: email.trim() })
      setStep({ name: 'sent', email: email.trim() })
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (err.fieldErrors.email ?? err.message)
          : 'Something went wrong. Please try again.',
      )
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={step.name === 'form' ? 'Reset your password' : 'Check your email'}
      footer={
        step.name === 'form' ? (
          <>
            <Button variant="ghost" onClick={onClose} disabled={isSending}>
              Cancel
            </Button>
            {/* form={formId}: this button lives in the footer, OUTSIDE the <form> element,
                but still submits it — a plain HTML feature. */}
            <Button type="submit" form={formId} isLoading={isSending}>
              Send reset link
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setStep({ name: 'form' })}>
              Use a different email
            </Button>
            <Button onClick={onClose}>Back to sign in</Button>
          </>
        )
      }
    >
      {step.name === 'form' ? (
        <form id={formId} ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4">
          <p className="text-small text-fg-muted">
            Enter the email you signed up with and we’ll send you a link to choose a new password.
          </p>
          <fieldset disabled={isSending}>
            <legend className="sr-only">Your email</legend>
            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (error) setError(checkEmail(e.target.value))
              }}
              error={error}
            />
          </fieldset>
        </form>
      ) : (
        <div className="space-y-3 text-small">
          {/* Deliberately "IF an account exists": we never reveal whether an email is registered. */}
          <p ref={sentRef} tabIndex={-1} className="outline-none">
            If an account exists for <strong className="break-all text-fg">{step.email}</strong>,
            we’ve sent a link to reset your password.
          </p>
          <p className="text-fg-muted">
            The link expires in 30 minutes. Can’t find it? Check your spam folder, or try again.
          </p>
        </div>
      )}
    </Modal>
  )
}
