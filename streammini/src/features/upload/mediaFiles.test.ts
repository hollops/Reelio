import { describe, expect, it } from 'vitest'
import { checkThumbnailFile, checkVideoFile, formatBytes, thumbnailFromVideo } from './mediaFiles'

/**
 * A File that REPORTS a size without allocating it. Writing 300MB of zeroes to prove a
 * size check works would be slow and pointless; size is a getter, so we override it.
 */
const fakeFile = (name: string, type: string, bytes: number) => {
  const file = new File([new Uint8Array(8)], name, { type })
  Object.defineProperty(file, 'size', { value: bytes })
  return file
}

describe('thumbnailFromVideo', () => {
  it('gives up rather than hanging when the video never seeks', async () => {
    // THE BUG THIS GUARDS. The function waits for the <video> element's `seeked` event.
    // Some codecs load metadata and then never complete a seek, so that event never
    // arrives — no error to catch, just silence. Before the timeout existed, the promise
    // never settled and the upload form sat on "Preparing your video…" indefinitely.
    //
    // jsdom fires no media events at all, which reproduces exactly that condition.
    const start = Date.now()
    await expect(thumbnailFromVideo(fakeFile('clip.mp4', 'video/mp4', 500), 320, 150))
      .rejects.toThrow(/timed out/i)
    // It must give up ON TIME, not eventually.
    expect(Date.now() - start).toBeLessThan(2000)
  })
})

describe('checkVideoFile', () => {
  it('accepts an ordinary mp4', () => {
    expect(checkVideoFile(fakeFile('clip.mp4', 'video/mp4', 1024))).toBeUndefined()
  })

  it('rejects something that is not a video', () => {
    expect(checkVideoFile(fakeFile('notes.pdf', 'application/pdf', 1024))).toMatch(/video file/i)
  })

  it('rejects a file over 200 MB, naming both sizes', () => {
    const message = checkVideoFile(fakeFile('huge.mp4', 'video/mp4', 300 * 1024 * 1024))
    // The browser check is a courtesy — the point is telling someone WHY before they wait
    // for a 300MB upload to fail at the far end.
    expect(message).toMatch(/200 MB/)
  })
})

describe('checkThumbnailFile', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('accepts %s', (type) => {
    expect(checkThumbnailFile(fakeFile('thumb', type, 1024))).toBeUndefined()
  })

  it('rejects a GIF, which Cloudinary is not set up for here', () => {
    expect(checkThumbnailFile(fakeFile('a.gif', 'image/gif', 1024))).toMatch(/JPG, PNG or WebP/)
  })
})

describe('formatBytes', () => {
  it.each([
    [500, '1 KB'],
    [1024 * 1024 * 2.5, '2.5 MB'],
    [1024 * 1024 * 150, '150 MB'],
  ])('%i bytes reads as %s', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected)
  })
})
