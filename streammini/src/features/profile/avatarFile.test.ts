import { describe, expect, it } from 'vitest'
import {
  AVATAR_MAX_BYTES,
  AVATAR_MAX_PX,
  checkAvatarFile,
  prepareAvatar,
} from './avatarFile'

/**
 * Cover for the bug Imran's users hit: "cannot upload photo".
 *
 * Nothing was broken. The server takes 2MB and a photo off a phone is 3–5MB, so every
 * ordinary photo was turned away in the browser with "choose one under 2 MB" — a real
 * person being told their perfectly normal photo is wrong.
 *
 * The fix shrinks instead of refusing. These tests pin both halves of that: the size
 * rejection is gone, and the resize falls back to the original file rather than losing the
 * user's choice when a browser cannot decode the image.
 *
 * jsdom has no canvas and no image decoder, so `prepareAvatar` always takes its fallback
 * path here. That is precisely the path worth testing automatically — the happy path needs
 * a real browser, and it was checked in one.
 */

const fileOf = (bytes: number, type = 'image/jpeg', name = 'photo.jpg') =>
  new File([new Uint8Array(bytes)], name, { type })

describe('checkAvatarFile', () => {
  it('accepts a 4MB phone photo — the size that used to be refused', () => {
    expect(checkAvatarFile(fileOf(4 * 1024 * 1024))).toBeUndefined()
  })

  it('still accepts a small photo', () => {
    expect(checkAvatarFile(fileOf(50 * 1024))).toBeUndefined()
  })

  it('rejects a type the server cannot take', () => {
    expect(checkAvatarFile(fileOf(1000, 'image/gif', 'a.gif'))).toMatch(/JPG, PNG or WebP/)
  })

  it('rejects something absurd before trying to decode it', () => {
    expect(checkAvatarFile(fileOf(50 * 1024 * 1024))).toMatch(/too large to open/)
  })

  it('names the actual size so the message is useful', () => {
    expect(checkAvatarFile(fileOf(50 * 1024 * 1024))).toContain('50 MB')
  })
})

describe('prepareAvatar', () => {
  it('returns a small file untouched — nothing to gain from re-encoding', async () => {
    const small = fileOf(100 * 1024)
    await expect(prepareAvatar(small)).resolves.toBe(small)
  })

  it('returns the original when the image cannot be decoded, rather than failing', async () => {
    // These bytes are not a real JPEG, so the decode errors — the fallback path.
    const broken = fileOf(1024 * 1024, 'image/jpeg')
    const out = await prepareAvatar(broken, 300)
    expect(out).toBe(broken)
  })

  it('resolves rather than hanging when decoding never completes', async () => {
    const out = await prepareAvatar(fileOf(900 * 1024), 50)
    expect(out).toBeInstanceOf(File)
  })
})

describe('the constants the fix depends on', () => {
  it('targets a size far below the server limit', () => {
    // 512px of JPEG at quality 0.85 lands around 40–60KB, well inside 2MB.
    expect(AVATAR_MAX_PX).toBeLessThanOrEqual(1024)
    expect(AVATAR_MAX_BYTES).toBe(2 * 1024 * 1024)
  })
})
