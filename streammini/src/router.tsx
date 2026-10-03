import type { RouteObject } from 'react-router'
import { RootLayout } from './components/RootLayout'
import { RouteErrorPage } from './components/RouteErrorPage'
import { AdminRoute, ProtectedRoute } from './features/auth/RouteGuards'
import AdminPage from './pages/AdminPage'
import HistoryPage from './pages/HistoryPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import MyVideosPage from './pages/MyVideosPage'
import NotFoundPage from './pages/NotFoundPage'
import ProfilePage from './pages/ProfilePage'
import RegisterPage from './pages/RegisterPage'
import SearchPage from './pages/SearchPage'
import UploadPage from './pages/UploadPage'
import WatchLaterPage from './pages/WatchLaterPage'
import WatchPage from './pages/WatchPage'

// The app's address map: which page appears for which URL.
// Only the list lives here; App.tsx turns it into a browser router, and tests can load it into an in-memory one.
//
// Nesting reads like a set of doors:
//   RootLayout (NavBar)                     ← outer fuse: if the frame itself crashes
//   └── pathless route + errorElement       ← inner fuse: a page crash keeps the NavBar
//         ├── public pages                  ← anyone (browsing and search are public)
//         ├── ProtectedRoute → …            ← signed-in users only
//         └── AdminRoute → /admin           ← admins only
export const routes: RouteObject[] = [
  {
    // YouTube-style, even the watch page keeps the NavBar; the player itself can go full-screen.
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        // No path: this level exists only to catch page crashes *inside* the layout.
        errorElement: <RouteErrorPage />,
        children: [
          // Public
          { path: '/', element: <HomePage /> },
          { path: '/watch/:id', element: <WatchPage /> },
          { path: '/search', element: <SearchPage /> },
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },

          // Signed-in users (any logged-in user may upload; the admin moderates)
          {
            element: <ProtectedRoute />,
            children: [
              { path: '/profile', element: <ProfilePage /> },
              { path: '/upload', element: <UploadPage /> },
              { path: '/my-videos', element: <MyVideosPage /> },
              { path: '/history', element: <HistoryPage /> },
              { path: '/watch-later', element: <WatchLaterPage /> },
            ],
          },

          // Admins
          { element: <AdminRoute />, children: [{ path: '/admin', element: <AdminPage /> }] },

          // Development-only tools — never shipped to users.
          // Loaded lazily: a normal import would drag the page (and the mock seed data it shows,
          // demo passwords included) into production bundles even though the route is removed.
          ...(import.meta.env.DEV
            ? [
                {
                  path: '/dev/ui',
                  lazy: async () => ({ Component: (await import('./pages/UiKitPage')).default }),
                },
                // The Home layout with sample data (Prompt 38), before the real data arrives.
                {
                  path: '/dev/home',
                  lazy: async () => ({
                    Component: (await import('./pages/HomePreviewPage')).default,
                  }),
                },
                // The Watch page layout with sample data (Prompt 47), before the real data arrives.
                {
                  path: '/dev/watch',
                  lazy: async () => ({
                    Component: (await import('./pages/WatchPreviewPage')).default,
                  }),
                },
                // Deliberately crashes, so the error screen can be seen and tested.
                {
                  path: '/dev/crash',
                  lazy: async () => ({
                    Component: (): never => {
                      throw new Error('Test crash from /dev/crash (development only)')
                    },
                  }),
                },
              ]
            : []),

          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]
