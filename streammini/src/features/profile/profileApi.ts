import { api } from '../../lib/apiClient'
import type { User } from '../../lib/types'

// Talking to the server about the signed-in user's own profile.
// Endpoint proposed to the backend teammate (not in the Viora list yet):
//   PUT /api/users/me   multipart/form-data   →   { success, message, data: User }

export interface ProfileChanges {
  /** Send only when it changed. */
  name?: string
  /** A new photo to upload… */
  avatar?: File
  /** …or ask for the current photo to be deleted. */
  removeAvatar?: boolean
}

export function updateProfile(changes: ProfileChanges): Promise<User> {
  // FormData, not JSON: JSON can't carry a file. The browser packs this as multipart/form-data.
  const form = new FormData()
  if (changes.name !== undefined) form.append('name', changes.name)
  if (changes.avatar) form.append('avatar', changes.avatar)
  if (changes.removeAvatar) form.append('removeAvatar', 'true')
  return api.put<User>('/users/me', form)
}
