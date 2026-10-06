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
