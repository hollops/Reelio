// The shapes of data exchanged with the API — the contract both sides agree on.
// Field names follow the backend team's "Viora API Endpoints" reference.

export type Role = 'user' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  avatarUrl?: string
  createdAt: string
}

/** The public face of a user shown next to their videos (never includes the email). */
export interface Uploader {
  id: string
  name: string
  avatarUrl?: string
}

export const CATEGORIES = [
  'Music',
  'Gaming',
  'Education',
  'Comedy',
  'Tech',
  'Sports',
  'Food',
  'Travel',
] as const
export type Category = (typeof CATEGORIES)[number]

export interface Video {
  id: string
  title: string
  description: string
  category: Category
  thumbnailUrl: string
  videoUrl: string
  /** Length in seconds. */
  duration: number
  views: number
  likes: number
  uploader: Uploader
  createdAt: string
}

export interface Comment {
  id: string
  videoId: string
  userId: string
  authorName: string
  text: string
  createdAt: string
}

/** GET /videos/:id returns extra detail that list endpoints leave out. */
export interface VideoDetail extends Video {
  comments: Comment[]
  /** Whether the logged-in viewer has liked it (always false when logged out). */
  likedByMe: boolean
}

/** One entry in the viewer's watch history — also drives "Continue watching". */
export interface WatchHistory {
  videoId: string
  /** Seconds watched so far. */
  progress: number
  /** Total length in seconds. */
  duration: number
  updatedAt: string
}

/** GET /history returns each entry together with its video, for the History page. */
export interface WatchHistoryEntry extends WatchHistory {
  video: Video
}

// --- Request bodies ----------------------------------------------------------

export interface RegisterInput {
  name: string
  email: string
  password: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface ProgressInput {
  videoId: string
  progress: number
  duration: number
}

export interface VideoUpdateInput {
  title?: string
  description?: string
  category?: Category
}

// --- Response envelope -------------------------------------------------------

/** Every backend response is wrapped like this. apiClient unwraps `data` for the UI. */
export interface ApiEnvelope<T> {
  success: boolean
  message: string
  data?: T
  /** On 400/409: one message per form field, e.g. { email: 'Already registered.' }. */
  errors?: Record<string, string>
}
