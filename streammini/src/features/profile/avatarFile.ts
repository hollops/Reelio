// Rules for a profile photo, checked in the browser before anything is uploaded.
// (The backend — Cloudinary behind it — must check again: a renamed file can lie about its type.)

export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024 // 2 MB — plenty for an 80px circle

/** For the file picker's `accept` attribute: the OS dialog only offers these files. */
export const AVATAR_ACCEPT = AVATAR_TYPES.join(',')

export function checkAvatarFile(file: File): string | undefined {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) {
    return 'Choose a JPG, PNG or WebP image.'
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return `That image is ${formatMB(file.size)}. Choose one under ${formatMB(AVATAR_MAX_BYTES)}.`
  }
  return undefined
}

function formatMB(bytes: number) {
  const mb = bytes / (1024 * 1024)
  return `${mb < 10 ? mb.toFixed(1).replace(/\.0$/, '') : Math.round(mb)} MB`
}
