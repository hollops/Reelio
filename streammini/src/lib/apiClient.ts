// The single messenger between the app and the backend.
// Components never call fetch() directly — they call api.get / api.post / etc.
//
// Every backend response arrives wrapped in an envelope: { success, message, data, errors? }.
// This file unwraps it, so components receive plain `data` on success and an ApiError on failure —
// whether the answer came from the real server or the in-browser mock.

import type { ApiEnvelope } from './types'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '')
/** Where the login token is saved. Exported so other tabs' changes can be recognised. */
export const TOKEN_KEY = 'streammini.token'
const TIMEOUT_MS = 15_000

// Mock is ON unless explicitly turned off, so a fresh clone works with no backend running.
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false'

if (import.meta.env.DEV) {
  console.info(`[api] Using ${USE_MOCK_API ? 'MOCK API (in-browser)' : `real API at ${BASE_URL}`}`)
}

// --- Token storage -----------------------------------------------------------
// "Remember me" decides WHERE the token lives:
//   localStorage   — survives closing the browser (remember me: on)
//   sessionStorage — forgotten when the browser/tab is closed (remember me: off)
// Storage can throw (private browsing, blocked storage), so every access is guarded.

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string, remember = true): void {
  try {
    // Only ever one copy, so the two places can't disagree.
    const [keep, drop] = remember ? [localStorage, sessionStorage] : [sessionStorage, localStorage]
    drop.removeItem(TOKEN_KEY)
    keep.setItem(TOKEN_KEY, token)
  } catch {
    // Storage unavailable: the session just won't survive a page refresh.
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    // Nothing to clear.
  }
}

// --- Errors ------------------------------------------------------------------
// Every failure, whatever caused it, reaches the UI as one ApiError shape.

export class ApiError extends Error {
  readonly status: number
  /** One message per form field, when the server rejected specific inputs (400 / 409). */
  readonly fieldErrors: Record<string, string>

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }

  get isUnauthorized() {
    return this.status === 401
  }

  get isNetworkError() {
    return this.status === 0
  }
}

// --- Transport ---------------------------------------------------------------
// A transport delivers one request and hands back the raw status + body. There are two:
// the real network (fetch) and the mock. Everything after that is shared.

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface RawResponse {
  status: number
  body: unknown
}

async function networkTransport(
  method: HttpMethod,
  path: string,
  body?: unknown,
): Promise<RawResponse> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  // File uploads go as FormData; the browser sets its own multipart Content-Type (with boundary).
  const isForm = body instanceof FormData
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (err) {
    // fetch only throws when no response arrived at all: offline, DNS failure, or timeout.
    const timedOut = err instanceof DOMException && err.name === 'TimeoutError'
    throw new ApiError(
      0,
      timedOut
        ? 'The server took too long to respond.'
        : 'Could not reach the server. Check your connection.',
    )
  }

  return { status: response.status, body: await readBody(response) }
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

// --- Unwrapping the envelope -------------------------------------------------

function isEnvelope(body: unknown): body is ApiEnvelope<unknown> {
  return typeof body === 'object' && body !== null && 'success' in body
}

function unwrap<T>({ status, body }: RawResponse): T {
  const ok = status >= 200 && status < 300

  if (ok) {
    // 204 No Content, or a success envelope without data (e.g. a DELETE).
    if (!isEnvelope(body)) return (body ?? undefined) as T
    if (body.success) return body.data as T
  }

  const envelope = isEnvelope(body) ? body : undefined
  throw new ApiError(status, envelope?.message || defaultMessage(status), envelope?.errors ?? {})
}

function defaultMessage(status: number): string {
  if (status === 401) return 'Your session has expired. Please log in again.'
  if (status === 403) return 'You do not have permission to do that.'
  if (status === 404) return 'That item could not be found.'
  if (status >= 500) return 'Something went wrong on our side. Please try again.'
  return `Request failed (${status}).`
}

// --- Core request ------------------------------------------------------------

// Someone (the AuthProvider) can ask to be told when the server rejects our token.
let unauthorizedHandler: (() => void) | null = null

/** Register a callback for "the token we sent was rejected". Returns an unsubscribe function. */
export function onUnauthorized(handler: () => void): () => void {
  unauthorizedHandler = handler
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null
  }
}

async function request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  const sentToken = getToken() !== null
  try {
    if (USE_MOCK_API) {
      // Loaded on demand: when the flag is off, the mock code is never downloaded.
      const { mockTransport } = await import('./mockApi')
      return unwrap<T>(await mockTransport(method, path, body))
    }
    return unwrap<T>(await networkTransport(method, path, body))
  } catch (err) {
    // A 401 while we HAD a token means the session died (expired, revoked…).
    // A 401 without one is just a wrong password, which the login form handles itself.
    if (err instanceof ApiError && err.isUnauthorized && sentToken) unauthorizedHandler?.()
    throw err
  }
}

// --- Public API --------------------------------------------------------------

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  /** `body` may be a plain object (sent as JSON) or FormData (for file uploads). */
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}
