import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/toast/ToastProvider'
import { AuthProvider } from '../features/auth/AuthProvider'
import LoginPage from './LoginPage'

/**
 * Prompt 102 — the sign-in form, tested without a browser.
 *
 * We replace apiClient's `api` object so no request is ever made: the test decides what the
 * server "says". `importOriginal` keeps the real ApiError class, because the app checks
 * `err instanceof ApiError` — a fake class would never match and the test would prove nothing.
 */
vi.mock('../lib/apiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/apiClient')>()
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), delete: vi.fn(), put: vi.fn() } }
})

const { api, ApiError } = await import('../lib/apiClient')
const post = vi.mocked(api.post)

const signedInUser = {
  id: 'u_ada',
  name: 'Ada Obi',
  email: 'ada@example.com',
  role: 'user' as const,
  createdAt: new Date().toISOString(),
}

/** Everything LoginPage needs around it: an address bar, toasts and a session. */
function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <ToastProvider>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  post.mockReset()
})

describe('LoginPage', () => {
  it('shows the form to a signed-out visitor', async () => {
    renderLogin()
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password', { exact: true })).toBeInTheDocument()
  })

  it('refuses an empty form without calling the server', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Enter your email address.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
    // The point of client-side validation: no pointless round trip.
    expect(post).not.toHaveBeenCalled()
  })

  it('moves focus to the first box with a problem', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    // A keyboard or screen-reader user should land ON the problem, not have to hunt for it.
    await waitFor(() => expect(screen.getByLabelText('Email')).toHaveFocus())
  })

  it('rejects an address that is not shaped like an email', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.type(screen.getByLabelText('Password', { exact: true }), 'password1')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText(/valid email address/)).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })

  it('sends a valid form, trimming the email', async () => {
    const user = userEvent.setup()
    post.mockResolvedValue({ token: 'tok_123', user: signedInUser })
    renderLogin()

    await user.type(screen.getByLabelText('Email'), '  ada@example.com  ')
    await user.type(screen.getByLabelText('Password', { exact: true }), 'password1')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/auth/login', {
        email: 'ada@example.com', // trimmed — people paste addresses with spaces
        password: 'password1',
      }),
    )
  })

  it('shows the server’s reason when the password is wrong', async () => {
    const user = userEvent.setup()
    post.mockRejectedValue(new ApiError(401, 'Incorrect email or password.'))
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'ada@example.com')
    await user.type(screen.getByLabelText('Password', { exact: true }), 'wrongpass1')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Incorrect email or password.')).toBeInTheDocument()
  })

  it('places a server field error under the right box', async () => {
    const user = userEvent.setup()
    post.mockRejectedValue(
      new ApiError(400, 'Check the form.', { email: 'No account uses that address.' }),
    )
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'ghost@example.com')
    await user.type(screen.getByLabelText('Password', { exact: true }), 'password1')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('No account uses that address.')).toBeInTheDocument()
  })

  it('freezes the form while the request is in flight', async () => {
    const user = userEvent.setup()
    // A promise we control, so we can inspect the page mid-request.
    let release: (value: unknown) => void = () => {}
    post.mockImplementation(() => new Promise((resolve) => (release = resolve)))
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'ada@example.com')
    await user.type(screen.getByLabelText('Password', { exact: true }), 'password1')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    // Disabled inputs stop a second submit — the double-click problem, again.
    await waitFor(() => expect(screen.getByLabelText('Email')).toBeDisabled())

    release({ token: 'tok_123', user: signedInUser })
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
  })
})
