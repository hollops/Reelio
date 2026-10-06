import { CATEGORIES, type Category } from './types'

/**
 * TEMPORARY SHIM between our frontend contract and the Reelio backend.
 *
 * It exists because the two sides were built in parallel and disagree in small ways.
 * It runs ONLY when VITE_USE_MOCK_API=false — the mock speaks our contract exactly,
 * so nothing here touches it.
 *
 * Every entry below should eventually disappear:
 *   - the path renames go when either side agrees on one spelling
 *   - the field fills go when the backend's Video model gains category/views/likes
 *
 * To make that visible rather than permanent, `reportGaps()` logs once per missing
 * field in development. Silence means the shim is no longer doing anything, which is
 * the signal to delete it.
 */

// --- Requests ----------------------------------------------------------------

/** Our path -> the backend's path, where the two chose different words. */
const PATH_RENAMES: Record<string, string> = {
  '/auth/login': '/auth/loginuser',
  '/auth/register': '/auth/createuser',
  '/videos/my-videos': '/videos/mine',
}

const VIDEO_BY_ID = /^\/videos\/[^/]+$/

export function adaptRequest(
  method: string,
  path: string,
): { method: string; path: string } {
  // Query strings must survive the rename, so split them off first.
  const [bare, query] = path.split('?')
  const renamed = PATH_RENAMES[bare!] ?? bare!

  // The backend updates a video with PATCH; we ask with PUT. Same intent.
  const adaptedMethod = method === 'PUT' && VIDEO_BY_ID.test(renamed) ? 'PATCH' : method

  return { method: adaptedMethod, path: query ? `${renamed}?${query}` : renamed }
}

// --- Responses ---------------------------------------------------------------

const reported = new Set<string>()

/** Say once, in development, that the backend did not send a field we need. */
function reportGap(field: string): void {
  if (!import.meta.env.DEV || reported.has(field)) return
  reported.add(field)
  console.warn(
    `[adapter] The backend did not send "${field}". ` +
      `Using a placeholder — this shim can be removed once the field exists.`,
  )
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** Does this object look like a video? Enough fields to be confident, not just one. */
const looksLikeVideo = (o: Record<string, unknown>) =>
  'videoUrl' in o && ('title' in o || 'thumbnailUrl' in o)

/**
 * Walk anything the backend returned and reshape it into our types.
 *
 * Recursive on purpose: a video appears alone, inside an array, and nested inside a
 * history entry or a watch-later list. One walk covers all of them, so a new endpoint
 * returning videos needs no new code here.
 */
export function adaptResponse<T>(value: unknown): T {
  return walk(value) as T
}

function walk(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(walk)
  if (!isObject(value)) return value

  const out: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(value)) {
    // Mongo's _id is our id. __v is Mongoose bookkeeping and means nothing here.
    if (key === '__v') continue
    if (key === '_id') {
      out.id = String(raw)
      continue
    }
    if (key === 'uploadedBy') {
      // Populated with { _id, name } — our Uploader is { id, name, avatarUrl? }.
      if (isObject(raw)) {
        out.uploader = {
          id: String(raw._id ?? raw.id ?? ''),
          name: String(raw.name ?? 'Unknown'),
          ...(raw.avatarUrl ? { avatarUrl: String(raw.avatarUrl) } : {}),
        }
      } else {
        // Not populated: only the id came back. Keep it so the UI can still link.
        out.uploader = { id: String(raw ?? ''), name: 'Unknown' }
      }
      continue
    }
    out[key] = walk(raw)
  }

  // Fill the fields the backend's Video model does not have yet, so the UI renders
  // rather than crashing on undefined. Each one warns once in development.
  if (looksLikeVideo(out)) {
    if (out.views === undefined) {
      reportGap('Video.views')
      out.views = 0
    }
    if (out.likes === undefined) {
      reportGap('Video.likes')
      out.likes = 0
    }
    if (out.category === undefined) {
      reportGap('Video.category')
      // No neutral category exists, so this IS a guess. It is deliberately the first
      // one rather than something invented, and the warning above says so.
      out.category = CATEGORIES[0] satisfies Category
    }
    if (out.likedByMe === undefined) out.likedByMe = false
    if (out.comments === undefined) out.comments = []
  }

  return out
}

// --- The envelope ------------------------------------------------------------

/**
 * The Reelio backend answers in five different shapes, because most controllers do
 * not call its own sendSuccess() helper. Observed on the live deployment:
 *
 *   { message, token }                      POST /auth/loginuser
 *   { message, user }                       POST /auth/createuser
 *   { message, videos }                     GET  /videos
 *   { success, message, data: { video } }   PATCH /videos/:id
 *   { success, data: { savedVideos } }      GET  /watch-later
 *
 * …so the payload hides under nine different keys, and `success` is often absent.
 * Rather than teach every caller those shapes, we find the payload here, once.
 *
 * Returns a verdict instead of throwing, so ApiError stays built in one place
 * (apiClient) and this module has no circular import back into it.
 */
export interface EnvelopeVerdict {
  ok: boolean
  payload: unknown
  message?: string
  errors?: Record<string, string>
}

/** Auth replies are objects the caller reads whole ({ token, user }), never unwrapped. */
const isAuthPath = (path: string) => path.startsWith('/auth/')

export function adaptEnvelope(path: string, status: number, body: unknown): EnvelopeVerdict {
  const httpOk = status >= 200 && status < 300

  if (!isObject(body)) {
    return { ok: httpOk, payload: body }
  }

  const message = typeof body.message === 'string' ? body.message : undefined

  // An explicit success:false is a failure even on a 200, and a 4xx/5xx always is.
  // Note the absence of `success` means nothing here: most of their routes omit it.
  if (body.success === false || !httpOk) {
    const errors = isObject(body.errors) ? (body.errors as Record<string, string>) : undefined
    return { ok: false, payload: undefined, message, errors }
  }

  // Strip the envelope's own words; whatever remains is the payload.
  const { success: _success, message: _message, ...rest } = body
  let payload: unknown = 'data' in rest ? rest.data : rest

  if (!isAuthPath(path) && isObject(payload)) {
    // One remaining key holding an array or object is a wrapper: { videos: [...] },
    // { video: {...} }, { savedVideos: [...] }. Unwrap it to what the caller wants.
    // A single key holding a STRING (like { token }) is the payload itself, not a wrapper.
    const keys = Object.keys(payload)
    const only = keys.length === 1 ? (payload as Record<string, unknown>)[keys[0]!] : undefined
    if (only !== undefined && (Array.isArray(only) || isObject(only))) payload = only
  }

  // { success, message } alone (a delete) leaves nothing — that is a valid empty answer.
  if (isObject(payload) && Object.keys(payload).length === 0) payload = undefined

  return { ok: true, payload, message }
}
