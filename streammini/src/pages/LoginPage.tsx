import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { Button } from '../components/Button'
import { Checkbox } from '../components/Checkbox'
import { Input } from '../components/Input'
import { useToast } from '../components/toast/toastContext'
import { AuthCard } from '../features/auth/AuthCard'
import { ForgotPasswordModal } from '../features/auth/ForgotPasswordModal'
import { useAuth } from '../features/auth/authContext'
import { redirectTarget } from '../features/auth/redirect'
import { SessionLoading } from '../features/auth/SessionLoading'
import { useAuthForm } from '../features/auth/useAuthForm'
import { validateLogin } from '../features/auth/validation'
import { usePageTitle } from '../components/usePageTitle'

// Prompt 26: the form + "Remember me".  Prompt 28: signing in and going back where you were headed.
// Prompt 29: frozen form + spinner while waiting.

export default function LoginPage() {
  usePageTitle('Sign in')
  const { status, login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const target = redirectTarget(location.state)
  // A checkbox is true/false, not text, so it lives beside the form's text values.
  const [remember, setRemember] = useState(true)
  // Prompt 34. `forgotKey` changes on every opening, so the pop-up always starts fresh.
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotKey, setForgotKey] = useState(0)
  function openForgot() {
    setForgotKey((k) => k + 1)
    setForgotOpen(true)
  }

  const { values, errors, formError, isSubmitting, setField, handleSubmit, formRef, formErrorRef } =
    useAuthForm({
      initialValues: { email: '', password: '' },
      validate: validateLogin,
      onSubmit: async ({ email, password }) => {
        const user = await login({ email: email.trim(), password }, { remember })
        toast.success(`Welcome back, ${user.name.trim().split(/\s+/)[0]}!`)
        navigate(target, { replace: true })
      },
    })

  if (status === 'checking') return <SessionLoading />
  if (status === 'authenticated' && !isSubmitting) return <Navigate to={target} replace />

  return (
    <AuthCard
      title="Sign in"
      subtitle={target === '/' ? 'Welcome back to Viora.' : 'Sign in to continue to that page.'}
      formError={formError}
      formErrorRef={formErrorRef}
      footer={
        <>
          New to Viora?{' '}
          <Link
            to="/register"
            state={location.state}
            className="font-semibold text-accent-text hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        <fieldset disabled={isSubmitting} className="space-y-5">
          <legend className="sr-only">Your sign-in details</legend>
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
          <Input
            label="Password"
            name="password"
            type="password"
            // "current-password" tells password managers to fill in the saved one.
            autoComplete="current-password"
            value={values.password}
            onChange={(e) => setField('password', e.target.value)}
            error={errors.password}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Checkbox
              label="Remember me"
              name="remember"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            {/* A BUTTON that looks like a link: it opens something here, it doesn't go anywhere. */}
            <button
              type="button"
              onClick={openForgot}
              className="rounded text-small font-semibold text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-text"
            >
              Forgot password?
            </button>
          </div>
          <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full">
            Sign in
          </Button>
        </fieldset>
      </form>

      <ForgotPasswordModal
        key={forgotKey}
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        initialEmail={values.email}
      />
    </AuthCard>
  )
}
