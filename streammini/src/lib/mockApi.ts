// A fake backend that runs inside the browser. It answers the same paths, with the same
// envelope ({ success, message, data, errors? }), status codes and rules as the real
// backend (the team's "Viora API Endpoints" contract) — so the UI can't tell the difference.
import type { HttpMethod, RawResponse } from './apiClient'
import { getToken } from './apiClient'
import { FALLBACK_MEDIA, seedUsers, seedVideos, type MockUser } from './mockData'
import {
  CATEGORIES,
  type ApiEnvelope,
  type AuthResponse,
  type Category,
  type Comment,
  type User,
  type Video,
  type VideoDetail,
  type WatchHistory,
  type WatchHistoryEntry,
} from './types'

// --- In-memory database, persisted to localStorage ---------------------------

interface MockDb {
  users: MockUser[]
  videos: Video[]
  comments: Comment[]
  likes: Record<string, string[]> // videoId -> userIds who liked it
  watchLater: Record<string, string[]> // userId -> videoIds, newest first
  history: Record<string, WatchHistory[]> // userId -> one entry per video, newest first
}

// Bump the version whenever the seed data or MockDb shape changes, so browsers holding
// an old saved copy start fresh instead of loading stale data.
const DB_KEY = 'streammini.mockdb.v4'

function freshDb(): MockDb {
  return {
    users: structuredClone(seedUsers),
    videos: structuredClone(seedVideos),
    comments: [],
    likes: {},
    watchLater: {},
    history: {},
  }
}

function loadDb(): MockDb {
  try {
    const saved = localStorage.getItem(DB_KEY)
    if (saved) {
      const db = JSON.parse(saved) as MockDb
      // Uploaded files live at temporary blob: URLs that die when the page reloads.
      // Swap any dead ones for a sample, so old uploads still play after a refresh.
      for (const v of db.videos) {
        if (v.videoUrl.startsWith('blob:')) Object.assign(v, FALLBACK_MEDIA.video)
        if (v.thumbnailUrl.startsWith('blob:')) v.thumbnailUrl = FALLBACK_MEDIA.thumbnailUrl
      }
      return db
    }
  } catch {
    // Corrupt or unavailable storage: start fresh.
  }
  return freshDb()
}

let db = loadDb()

// Prompt 83 — behave like ONE server shared by every tab. Each tab keeps its own copy of this
// fake database in memory; when another tab saves a change, reload it — otherwise this tab
// would keep serving its old copy (a real server has only one copy, so this can't happen there).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === DB_KEY) db = loadDb()
  })
}

function saveDb() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch {
    // Storage unavailable: changes last until the page is refreshed.
  }
}

/** Wipe all mock changes and restore the seed data. */
export function resetMockDb() {
  db = freshDb()
  saveDb()
}

// --- Errors ------------------------------------------------------------------

/** Thrown by handlers; the router turns it into an error envelope with this status. */
class HttpError extends Error {
  readonly status: number
  readonly errors?: Record<string, string>

  constructor(status: number, message: string, errors?: Record<string, string>) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

function invalid(errors: Record<string, string>, status = 400): never {
  throw new HttpError(status, 'Please fix the highlighted fields.', errors)
}

// --- Helpers -----------------------------------------------------------------

const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`
const now = () => new Date().toISOString()
const networkDelay = () => new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 400))

function publicUser({ password: _password, ...user }: MockUser): User {
  return user
}

function issueToken(user: MockUser): AuthResponse {
  return { user: publicUser(user), token: `mock-jwt.${user.id}` }
}

function userFromToken(): MockUser | null {
  const token = getToken()
  if (!token?.startsWith('mock-jwt.')) return null
  const userId = token.slice('mock-jwt.'.length)
  return db.users.find((u) => u.id === userId) ?? null
}

function findVideo(id: string): Video {
  const video = db.videos.find((v) => v.id === id)
  if (!video) throw new HttpError(404, 'That video could not be found.')
  return video
}

function assertCanModify(video: Video, user: MockUser) {
  if (video.uploader.id !== user.id && user.role !== 'admin') {
    throw new HttpError(403, 'You can only change videos you uploaded.')
  }
}

type Body = Record<string, unknown>

/** Accept both JSON bodies and FormData (file uploads), and hand back a plain object. */
function toBody(body: unknown): Body {
  if (body instanceof FormData) return Object.fromEntries(body.entries())
  return (body ?? {}) as Body
}

function text(body: Body, field: string): string {
  const value = body[field]
  return typeof value === 'string' ? value.trim() : ''
}

const isCategory = (value: string): value is Category =>
  (CATEGORIES as readonly string[]).includes(value)

function removeVideoEverywhere(videoId: string) {
  db.videos = db.videos.filter((v) => v.id !== videoId)
  db.comments = db.comments.filter((c) => c.videoId !== videoId)
  delete db.likes[videoId]
  for (const userId of Object.keys(db.watchLater)) {
    db.watchLater[userId] = db.watchLater[userId].filter((id) => id !== videoId)
  }
  for (const userId of Object.keys(db.history)) {
    db.history[userId] = db.history[userId].filter((h) => h.videoId !== videoId)
  }
}

// --- Router ------------------------------------------------------------------

type Access = 'public' | 'user' | 'admin'

interface Context {
  params: Record<string, string>
  query: URLSearchParams
  body: Body
  /** The logged-in user, or null. Always set on 'user' and 'admin' routes. */
  user: MockUser | null
  me: MockUser // same as user, but only safe to use on 'user' / 'admin' routes
}

/** What a handler returns: the data, plus an optional message and status. */
interface Reply {
  data?: unknown
  message?: string
  status?: number
}

interface Route {
  method: HttpMethod
  pattern: RegExp
  keys: string[]
  access: Access
  /** May be async — e.g. resizing an uploaded image takes a moment. */
  handler: (ctx: Context) => Reply | Promise<Reply>
}

const routes: Route[] = []

function route(method: HttpMethod, path: string, access: Access, handler: Route['handler']) {
  const keys: string[] = []
  const source = path.replace(/:(\w+)/g, (_, key: string) => {
    keys.push(key)
    return '([^/]+)'
  })
  routes.push({ method, pattern: new RegExp(`^${source}$`), keys, access, handler })
}

const envelope = (success: boolean, message: string, extra: Partial<ApiEnvelope<unknown>> = {}) =>
  ({ success, message, ...extra }) satisfies ApiEnvelope<unknown>

/** The mock's "network": same signature as the real transport in apiClient. */
export async function mockTransport(
  method: HttpMethod,
  path: string,
  body?: unknown,
): Promise<RawResponse> {
  await networkDelay()
  const url = new URL(path, 'http://mock.local')

  // Routes are matched in the order they're registered, so specific paths like
  // /videos/my-videos must be registered before /videos/:id (same rule as in Express).
  for (const r of routes) {
    if (r.method !== method) continue
    const match = url.pathname.match(r.pattern)
    if (!match) continue

    try {
      const user = userFromToken()
      if (r.access !== 'public' && !user) throw new HttpError(401, 'Please log in to continue.')
      if (r.access === 'admin' && user?.role !== 'admin') {
        throw new HttpError(403, 'Only admins can do that.')
      }

      const params = Object.fromEntries(
        r.keys.map((key, i) => [key, decodeURIComponent(match[i + 1])]),
      )
      const reply = await r.handler({
        params,
        query: url.searchParams,
        body: toBody(body),
        user,
        me: user as MockUser,
      })
      saveDb()
      return {
        status: reply.status ?? 200,
        // Hand back a copy, so the UI can never accidentally edit the "database".
        body: envelope(true, reply.message ?? 'Operation successful', {
          data: reply.data === undefined ? undefined : structuredClone(reply.data),
        }),
      }
    } catch (err) {
      if (!(err instanceof HttpError)) throw err
      return { status: err.status, body: envelope(false, err.message, { errors: err.errors }) }
    }
  }

  return { status: 404, body: envelope(false, `No route for ${method} ${url.pathname}`) }
}

// --- 1. Auth -----------------------------------------------------------------

route('POST', '/auth/register', 'public', ({ body }) => {
  const name = text(body, 'name')
  const email = text(body, 'email').toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''

  const errors: Record<string, string> = {}
  if (!name) errors.name = 'Name is required.'
  if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Enter a valid email address.'
  if (password.length < 8) errors.password = 'Password must be at least 8 characters.'
  else if (!/\d/.test(password)) errors.password = 'Password must contain at least one number.'
  if (Object.keys(errors).length) invalid(errors)

  if (db.users.some((u) => u.email === email)) {
    invalid({ email: 'An account with this email already exists.' }, 409)
  }

  // Public registration always creates a regular user, never an admin.
  const user: MockUser = { id: newId('u'), name, email, password, role: 'user', createdAt: now() }
  db.users.push(user)
  return { status: 201, message: 'Account created', data: issueToken(user) }
})

route('POST', '/auth/login', 'public', ({ body }) => {
  const email = text(body, 'email').toLowerCase()
  const user = db.users.find((u) => u.email === email && u.password === body.password)
  // Same message whether the email or the password is wrong, so attackers can't probe accounts.
  if (!user) throw new HttpError(401, 'Incorrect email or password.')
  return { message: 'Logged in', data: issueToken(user) }
})

route('GET', '/auth/me', 'user', ({ me }) => ({ data: publicUser(me) }))

// Proposed for the backend (not in the Viora list yet): POST /auth/forgot-password { email }.
// ALWAYS the same 200 reply, whether or not the account exists. Saying "no account with that
// email" would let anyone test addresses to learn who is registered ("account enumeration").
route('POST', '/auth/forgot-password', 'public', ({ body }) => {
  const email = text(body, 'email').toLowerCase()
  if (!/^\S+@\S+\.\S+$/.test(email)) invalid({ email: 'Enter a valid email address.' })

  // A real server would email a one-time link that expires. The mock just notes it for developers.
  if (db.users.some((u) => u.email === email)) {
    console.info(`[mock] Password reset link would be emailed to ${email}`)
  }
  return { message: 'If an account exists for that email, a reset link has been sent.' }
})

// --- 1b. Profile (proposed for the backend: not in the Viora list yet) ---------
// PUT /users/me — multipart FormData:
//   name          new display name (optional)
//   avatar        image file (optional)       ← same field name the backend's upload uses
//   removeAvatar  "true" to delete the photo  (optional)
// Replies with the updated user.

const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const AVATAR_MAX_BYTES = 2 * 1024 * 1024

route('PUT', '/users/me', 'user', async ({ body, me }) => {
  const errors: Record<string, string> = {}

  const hasName = typeof body.name === 'string'
  const name = text(body, 'name')
  if (hasName && !name) errors.name = 'Name is required.'
  else if (name.length > 50) errors.name = 'Name must be 50 characters or fewer.'

  const file = body.avatar
  const hasFile = file instanceof File && file.size > 0
  // The server repeats the browser's checks: requests can be sent without our UI at all.
  if (hasFile && !AVATAR_TYPES.includes(file.type))
    errors.avatar = 'Avatar must be JPG, PNG or WebP.'
  else if (hasFile && file.size > AVATAR_MAX_BYTES)
    errors.avatar = 'Avatar must be 2 MB or smaller.'
  if (Object.keys(errors).length) invalid(errors)

  // Do the step that can fail FIRST, then change anything — all or nothing, never half-saved.
  let newAvatar: string | undefined
  if (hasFile) {
    // Like Cloudinary would, store a small resized copy — also keeps it inside localStorage limits.
    try {
      newAvatar = await shrinkImage(file, 256)
    } catch {
      invalid({ avatar: 'That image could not be read. Try a different file.' })
    }
  }

  if (hasName) me.name = name
  if (body.removeAvatar === 'true') delete me.avatarUrl
  if (newAvatar) me.avatarUrl = newAvatar

  // Videos and comments carry a copy of their author's name/photo, so refresh those copies.
  for (const v of db.videos) {
    if (v.uploader.id === me.id) v.uploader = { id: me.id, name: me.name, avatarUrl: me.avatarUrl }
  }
  for (const c of db.comments) if (c.userId === me.id) c.authorName = me.name

  return { message: 'Profile updated', data: publicUser(me) }
})

/** Resize an image so its longer side is at most `maxSide` px; returns a data: URL. */
async function shrinkImage(file: File, maxSide: number): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/webp', 0.85)
}

// --- 2. Videos ---------------------------------------------------------------
// Browsing and search are public (team decision); uploading and changing need a login.

route('GET', '/videos', 'public', ({ query }) => {
  const q = (query.get('q') ?? '').trim().toLowerCase()
  const category = query.get('category')
  const sort = query.get('sort') ?? 'newest'

  const results = db.videos.filter((v) => {
    if (category && v.category !== category) return false
    if (!q) return true
    const haystack = [v.title, v.description, v.category, v.uploader.name].join(' ').toLowerCase()
    return haystack.includes(q)
  })
  results.sort((a, b) =>
    sort === 'popular' ? b.views - a.views : b.createdAt.localeCompare(a.createdAt),
  )
  return { data: results }
})

// Must come before /videos/:id, or "my-videos" would be read as a video id.
route('GET', '/videos/my-videos', 'user', ({ me }) => ({
  data: db.videos
    .filter((v) => v.uploader.id === me.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
}))

route('GET', '/videos/:id', 'public', ({ params, user }): Reply => {
  const video = findVideo(params.id)
  video.views += 1 // opening the watch page counts as a view
  const detail: VideoDetail = {
    ...video,
    comments: db.comments
      .filter((c) => c.videoId === video.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    likedByMe: user ? (db.likes[video.id] ?? []).includes(user.id) : false,
  }
  return { data: detail }
})

route('POST', '/videos', 'user', ({ body, me }) => {
  const title = text(body, 'title')
  const description = text(body, 'description')
  const category = text(body, 'category')
  const file = body.video
  const thumb = body.thumbnail
  const hasFile = file instanceof Blob && file.size > 0
  const videoUrl = hasFile ? URL.createObjectURL(file) : text(body, 'videoUrl')

  const errors: Record<string, string> = {}
  if (!title) errors.title = 'Give your video a title.'
  else if (title.length > 100) errors.title = 'Titles are limited to 100 characters.'
  if (!isCategory(category)) errors.category = 'Choose a category.'
  if (!videoUrl) errors.video = 'Choose a video file to upload.'
  if (Object.keys(errors).length) invalid(errors)

  const video: Video = {
    id: newId('v'),
    title,
    description,
    category: category as Category,
    // Cloudinary would generate a thumbnail; the mock falls back to a placeholder.
    thumbnailUrl:
      thumb instanceof Blob && thumb.size > 0
        ? URL.createObjectURL(thumb)
        : FALLBACK_MEDIA.thumbnailUrl,
    videoUrl,
    // The real backend reads the length from the file; the uploader page sends it for the mock.
    duration: Number(body.duration) || 0,
    views: 0,
    likes: 0,
    uploader: { id: me.id, name: me.name, avatarUrl: me.avatarUrl },
    createdAt: now(),
  }
  db.videos.unshift(video)
  return { status: 201, message: 'Video uploaded', data: video }
})

route('PUT', '/videos/:id', 'user', ({ params, body, me }) => {
  const video = findVideo(params.id)
  assertCanModify(video, me)

  const errors: Record<string, string> = {}
  if ('title' in body) {
    const title = text(body, 'title')
    if (!title) errors.title = 'Title is required.'
    else if (title.length > 100) errors.title = 'Titles are limited to 100 characters.'
    else video.title = title
  }
  if ('description' in body) video.description = text(body, 'description')
  if ('category' in body) {
    const category = text(body, 'category')
    if (isCategory(category)) video.category = category
    else errors.category = 'Choose a category.'
  }
  if (Object.keys(errors).length) invalid(errors)
  return { message: 'Video updated', data: video }
})

route('DELETE', '/videos/:id', 'user', ({ params, me }) => {
  const video = findVideo(params.id)
  assertCanModify(video, me)
  removeVideoEverywhere(video.id)
  return { message: 'Video deleted' }
})

// --- Comments & likes --------------------------------------------------------

route('POST', '/videos/:id/comments', 'user', ({ params, body, me }) => {
  const video = findVideo(params.id)
  const commentText = text(body, 'text')
  if (!commentText) invalid({ text: 'Comment cannot be empty.' })
  if (commentText.length > 500) invalid({ text: 'Comments are limited to 500 characters.' })

  const comment: Comment = {
    id: newId('c'),
    videoId: video.id,
    userId: me.id,
    authorName: me.name,
    text: commentText,
    createdAt: now(),
  }
  db.comments.push(comment)
  return { status: 201, message: 'Comment added', data: comment }
})

function setLike(videoId: string, userId: string, liked: boolean) {
  const video = findVideo(videoId)
  const likers = (db.likes[video.id] ??= [])
  const already = likers.includes(userId)
  if (liked && !already) {
    likers.push(userId)
    video.likes += 1
  }
  if (!liked && already) {
    db.likes[video.id] = likers.filter((id) => id !== userId)
    video.likes -= 1
  }
  return { data: { likes: video.likes, likedByMe: liked } }
}

route('POST', '/videos/:id/like', 'user', ({ params, me }) => setLike(params.id, me.id, true))
route('DELETE', '/videos/:id/like', 'user', ({ params, me }) => setLike(params.id, me.id, false))

// --- 3. Watch history / playback ---------------------------------------------

const historyOf = (userId: string) => (db.history[userId] ??= [])

route('POST', '/history', 'user', ({ body, me }) => {
  const video = findVideo(text(body, 'videoId'))
  const progress = Number(body.progress)
  const duration = Number(body.duration)
  const errors: Record<string, string> = {}
  if (!Number.isFinite(progress) || progress < 0) errors.progress = 'Must be 0 or more seconds.'
  if (!Number.isFinite(duration) || duration <= 0) errors.duration = 'Must be more than 0 seconds.'
  if (Object.keys(errors).length) invalid(errors)

  // One entry per video: the newest position replaces the old one and moves to the top.
  const entry: WatchHistory = { videoId: video.id, progress, duration, updatedAt: now() }
  db.history[me.id] = [entry, ...historyOf(me.id).filter((h) => h.videoId !== video.id)]
  return { message: 'Progress saved', data: entry }
})

route('GET', '/history', 'user', ({ me }) => {
  const entries: WatchHistoryEntry[] = []
  for (const h of historyOf(me.id)) {
    const video = db.videos.find((v) => v.id === h.videoId)
    if (video) entries.push({ ...h, video })
  }
  return { data: entries }
})

// Resume playback: the saved position for one video, or null if never watched.
route('GET', '/history/:videoId', 'user', ({ params, me }) => ({
  data: historyOf(me.id).find((h) => h.videoId === params.videoId) ?? null,
}))

route('DELETE', '/history/:videoId', 'user', ({ params, me }) => {
  db.history[me.id] = historyOf(me.id).filter((h) => h.videoId !== params.videoId)
  return { message: 'Removed from history' }
})

// --- Watch Later -------------------------------------------------------------

const watchLaterOf = (userId: string) => (db.watchLater[userId] ??= [])

route('GET', '/watch-later', 'user', ({ me }) => ({
  data: watchLaterOf(me.id)
    .map((id) => db.videos.find((v) => v.id === id))
    .filter((v): v is Video => Boolean(v)),
}))

route('POST', '/watch-later', 'user', ({ body, me }) => {
  const video = findVideo(text(body, 'videoId'))
  const list = watchLaterOf(me.id)
  if (!list.includes(video.id)) list.unshift(video.id)
  return { status: 201, message: 'Saved to Watch Later', data: video }
})

route('DELETE', '/watch-later/:videoId', 'user', ({ params, me }) => {
  db.watchLater[me.id] = watchLaterOf(me.id).filter((id) => id !== params.videoId)
  return { message: 'Removed from Watch Later' }
})

// --- 4. Admin ----------------------------------------------------------------

route('GET', '/admin/users', 'admin', () => ({ data: db.users.map(publicUser) }))

route('GET', '/admin/videos', 'admin', () => ({
  data: [...db.videos].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
}))

route('DELETE', '/admin/videos/:id', 'admin', ({ params }) => {
  removeVideoEverywhere(findVideo(params.id).id)
  return { message: 'Video deleted' }
})
