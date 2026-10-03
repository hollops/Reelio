import { useLocation } from 'react-router'
import { PagePlaceholder } from '../components/PagePlaceholder'

export default function NotFoundPage() {
  const { pathname } = useLocation()
  return <PagePlaceholder name="404 — Page not found" detail={`Nothing lives at ${pathname}`} />
}
