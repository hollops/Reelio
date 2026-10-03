import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Outermost fuse: catches crashes even in the app-wide providers (Toast, Auth). */}
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
