import { Link } from 'react-router'
import { Container } from './layout'
import { usePageTitle } from './usePageTitle'

// Temporary stand-in used by every page until its real UI is built.
export function PagePlaceholder({ name, detail }: { name: string; detail?: string }) {
  usePageTitle(name) // History, 404…
  return (
    <Container
      as="section"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center"
    >
      <h1 className="text-heading font-bold">{name}</h1>
      {detail && <p className="text-fg-muted">{detail}</p>}
      <Link
        to="/"
        className="inline-flex min-h-6 items-center text-small text-accent-text underline hover:text-fg"
      >
        Back to Home
      </Link>
    </Container>
  )
}
