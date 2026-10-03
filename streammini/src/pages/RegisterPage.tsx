import { useId } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { useToast } from '../components/toast/toastContext'
import { AuthCard } from '../features/auth/AuthCard'
import { useAuth } from '../features/auth/authContext'
import { redirectTarget } from '../features/auth/redirect'
import { SessionLoading } from '../features/auth/SessionLoading'
import { useAuthForm } from '../features/auth/useAuthForm'
import { PasswordStrength } from '../features/auth/PasswordStrength'
import { validateRegister } from '../features/auth/validation'
import { usePageTitle } from '../components/usePageTitle'

// Prompt 25: the form + our own checks.  Prompt 27: sending it, showing the server's answers.
// Prompt 29: frozen form + spinner while waiting.

export default function RegisterPage() {
  usePageTitle('Create account')
  const { status, register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const passwordHelpId = useId()
  const target = redirectTarget(location.state)

  const { values, errors, formError, isSubmitting, setField, handleSubmit, formRef, formErrorRef } =
    useAuthForm({
      initialValues: { name: '', email: '', password: '' },
      validate: validateRegister,
      onSubmit: async ({ name, email, password }) => {
        const user = await register({ name: name.trim(), email: email.trim(), password })
        toast.success(`Welcome to Viora, ${firstName(user.name)}!`)
        navigate(target, { replace: true }) // replace: Back shouldn't return to the sign-up form
      },
    })

  if (status === 'checking') return <SessionLoading />
  // Already signed in (and not in the middle of signing up)? This page has nothing to offer.
  if (status === 'authenticated' && !isSubmitting) return <Navigate to={target} replace />

  return (
    <AuthCard
      title="Create your account"
      subtitle="Upload videos, save them for later, and join the conversation."
      formError={formError}
      formErrorRef={formErrorRef}
      footer={
        <>
          Already have an account?{' '}
          {/* Pass the "where were they going" note along, so it survives switching pages. */}
          <Link
            to="/login"
            state={location.state}
            className="font-semibold text-accent-text hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      {/* noValidate: skip the browser's own pop-up bubbles; we show clearer messages ourselves. */}
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        {/* A disabled <fieldset> freezes every box and button inside it in one go (Prompt 29). */}
        <fieldset disabled={isSubmitting} className="space-y-5">
          <legend className="sr-only">Your details</legend>
          <Input
            label="Name"
            name="name"
            autoComplete="name"
            value={values.name}
            onChange={(e) => setField('name', e.target.value)}
            error={errors.name}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            spellCheck={false}
            value={values.email}
            onChange={(e) => setField('email', e.target.value)}
            error={errors.email}
          />
          {/* Grouped so the checklist sits close under its box, not a full gap away. */}
          <div className="space-y-2">
            <Input
              label="Password"
              name="password"
              type="password"
              // "new-password" tells password managers to offer a strong generated one.
              autoComplete="new-password"
              // Screen readers read the checklist with the box, like a hint.
              aria-describedby={passwordHelpId}
              value={values.password}
              onChange={(e) => setField('password', e.target.value)}
              error={errors.password}
            />
            {/* Prompt 33: live checklist + strength bar, updating as you type. */}
            <PasswordStrength id={passwordHelpId} password={values.password} />
          </div>
          <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full">
            Create account
          </Button>
        </fieldset>
      </form>
    </AuthCard>
  )
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name
}
