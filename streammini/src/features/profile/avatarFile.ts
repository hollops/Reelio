// Rules for a profile photo, applied in the browser before anything is uploaded.
// (The backend — Cloudinary behind it — must check again: a renamed file can lie about its type.)

export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

/** What the SERVER accepts. The browser no longer rejects at this size — it shrinks instead. */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024

/**
 * The longest side we keep. An avatar is shown at about 80px; 512 still looks sharp on a
 * retina screen at twice that, and nothing on the page ever needs more.
 */
export const AVATAR_MAX_PX = 512

/** A ceiling that exists only to refuse something absurd before we try to decode it. */
const DECODE_CEILING_BYTES = 40 * 1024 * 1024

/** For the file picker's `accept` attribute: the OS dialog only offers these files. */
export const AVATAR_ACCEPT = AVATAR_TYPES.join(',')

/**
 * Is this file usable at all?
 *
 * Deliberately no size rejection. A photo straight off a phone is 3–5MB and every one of
 * them used to be turned away with "choose one under 2 MB" — which is a real person being
 * told their perfectly ordinary photo is wrong. `prepareAvatar` shrinks it instead.
 */
export function checkAvatarFile(file: File): string | undefined {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) {
    return 'Choose a JPG, PNG or WebP image.'
  }
  if (file.size > DECODE_CEILING_BYTES) {
    return `That file is ${formatMB(file.size)}, which is too large to open. Choose a photo.`
  }
  return undefined
}

/**
 * Shrink a photo to something sensible for an avatar.
 *
 * Draws it into a canvas at most AVATAR_MAX_PX on its longest side and re-encodes as JPEG.
 * A 4MB phone photo comes out around 40–60KB, which uploads instantly and is more than the
 * 80px circle will ever show.
 *
 * Returns the ORIGINAL file if anything goes wrong — a browser that cannot decode the image,
 * a canvas that refuses to export, or a timeout. The upload may then fail on size, which is
 * the behaviour we had before and is better than silently losing the user's choice.
 */
export function prepareAvatar(file: File, timeoutMs = 10_000): Promise<File> {
  return new Promise((resolve) => {
    // Nothing to gain: already small enough and already a format the server takes.
    if (file.size <= 256 * 1024) return resolve(file)

    const url = URL.createObjectURL(file)
    const img = new Image()
    let settled = false

    const finish = (result: File) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      resolve(result)
    }

    // A decode that never finishes must not leave the Save button disabled forever.
    const timer = setTimeout(() => finish(file), timeoutMs)

    img.onerror = () => finish(file)
    img.onload = () => {
      try {
        const scale = Math.min(1, AVATAR_MAX_PX / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return finish(file)

        // White underneath: a transparent PNG drawn onto an empty canvas and exported as
        // JPEG turns its transparency BLACK, which would look like a fault.
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0, w, h)

        canvas.toBlob(
          (blob) => {
            if (!blob) return finish(file)
            // Keep the original name so the user still recognises what they chose.
            const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
            finish(new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() }))
          },
          'image/jpeg',
          0.85,
        )
      } catch {
        finish(file)
      }
    }

    img.src = url
  })
}

function formatMB(bytes: number) {
  const mb = bytes / (1024 * 1024)
  return `${mb < 10 ? mb.toFixed(1).replace(/\.0$/, '') : Math.round(mb)} MB`
}
