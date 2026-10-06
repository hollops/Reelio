import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { ToastProvider } from './components/toast/ToastProvider'
import { AuthProvider } from './features/auth/AuthProvider'
import { ThemeProvider } from './features/theme/ThemeProvider'
import { routes } from './router'

// Connects the address map to the browser's real address bar and back button.
const router = createBrowserRouter(routes)

function App() {
  return (
    // App-wide services wrap the router, so every page can use them.
    // Toasts sit outside Auth, so the session code can show messages ("Session expired").
    // Theme is outermost: toasts and the error screen must be themed too.
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
