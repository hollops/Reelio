import type { ReactNode, Ref } from 'react'
import { AlertIcon } from '../../components/icons'
import { Container } from '../../components/layout'

// The shared frame for the login and register pages: a centred card with a heading,
// an optional whole-form error, the form itself, and a footer ("New here? Create an account").

interface AuthCardProps {
  title: string
  subtitle: string
  /** A problem with the whole form, e.g. "Incorrect email or password." */
  formError?: string | null
  formErrorRef?: Ref<HTMLDivElement>
  footer: ReactNode
  children: ReactNode
}

export function AuthCard({
  title,
  subtitle,
  formError,
  formErrorRef,
  footer,
  children,
}: AuthCardProps) {
  return (
    <Container as="section" size="narrow" className="py-10 sm:py-16">
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-2xl sm:p-8">
        <header className="mb-6 space-y-1 text-center">
          <h1 className="text-heading font-bold">{title}</h1>
          <p className="text-fg-muted">{subtitle}</p>
        </header>

        {/* Always in the page (even when empty), so screen readers are already listening when
            a message appears. tabIndex={-1}: focusable by code, but not a Tab stop. */}
        <div ref={formErrorRef} tabIndex={-1} role="alert" className="outline-none">
          {formError && (
            <p className="mb-5 flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 p-3 text-small text-fg">
              <AlertIcon className="mt-0.5 size-4 shrink-0 text-danger" />
              {formError}
            </p>
          )}
        </div>

        {children}

        <div className="mt-6 border-t border-line pt-5 text-center text-small text-fg-muted">
          {footer}
        </div>
      </div>
    </Container>
  )
}
