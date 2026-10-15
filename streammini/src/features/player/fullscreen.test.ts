import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  canFullscreen,
  enterFullscreen,
  exitFullscreen,
  isFullscreen,
  onFullscreenChange,
} from './fullscreen'

/**
 * The full-screen button did nothing on phones.
 *
 * jsdom has no fullscreen of any kind, which is exactly what makes these tests possible: we
 * hand the helper a fake element shaped like each browser and check it reaches for the right
 * method. That is the whole bug — the old code only knew the standard API, and an iPhone has
 * none of it, so `container.requestFullscreen()` threw and the button sat there dead.
 *
 * Three worlds to cover:
 *   standard  — Chrome, Edge, Firefox, Android
 *   webkit    — older Safari, iPad: same idea, prefixed names
 *   iOS       — no element fullscreen at all; only the <video>, via webkitEnterFullscreen
 */

type AnyRecord = Record<string, unknown>

/** A container div as each browser family presents it. */
function container(kind: 'standard' | 'webkit' | 'none') {
  const el = document.createElement('div') as unknown as HTMLElement & AnyRecord
  if (kind === 'standard') el.requestFullscreen = vi.fn(() => Promise.resolve())
  if (kind === 'webkit') el.webkitRequestFullscreen = vi.fn(() => Promise.resolve())
  return el
}

/** A <video>; `ios` adds the methods only iPhones have. */
function videoEl(ios: boolean) {
  const v = document.createElement('video') as unknown as HTMLVideoElement & AnyRecord
  if (ios) {
    v.webkitEnterFullscreen = vi.fn()
    v.webkitExitFullscreen = vi.fn()
    v.webkitSupportsFullscreen = true
    v.webkitDisplayingFullscreen = false
  }
  return v
}

/** Pretend the document has something full screen (jsdom leaves these undefined). */
function setDocFullscreen(key: 'fullscreenElement' | 'webkitFullscreenElement', el: unknown) {
  Object.defineProperty(document, key, { value: el, configurable: true })
}

afterEach(() => {
  setDocFullscreen('fullscreenElement', null)
  setDocFullscreen('webkitFullscreenElement', null)
  vi.restoreAllMocks()
})

describe('enterFullscreen', () => {
  it('uses the standard API when the browser has it', () => {
    const el = container('standard')
    const v = videoEl(false)

    enterFullscreen(el, v)

    expect(el.requestFullscreen).toHaveBeenCalledOnce()
  })

  it('falls back to the webkit-prefixed name on older Safari', () => {
    const el = container('webkit')
    const v = videoEl(false)

    enterFullscreen(el, v)

    expect(el.webkitRequestFullscreen).toHaveBeenCalledOnce()
  })

  it('puts the VIDEO full screen on an iPhone, where elements cannot', () => {
    // This is the case that was broken: no requestFullscreen on the div at all.
    const el = container('none')
    const v = videoEl(true)

    enterFullscreen(el, v)

    expect(v.webkitEnterFullscreen).toHaveBeenCalledOnce()
  })

  it('does not throw when the element has no fullscreen method', () => {
    // The old code threw here — that is precisely why nothing happened on a phone.
    expect(() => enterFullscreen(container('none'), videoEl(false))).not.toThrow()
  })

  it('survives a rejected request instead of becoming an unhandled rejection', () => {
    const el = container('none') as unknown as HTMLElement & AnyRecord
    el.requestFullscreen = vi.fn(() => Promise.reject(new Error('gesture not trusted')))

    expect(() => enterFullscreen(el, videoEl(false))).not.toThrow()
  })

  it('does nothing at all when there is no element and no video', () => {
    expect(() => enterFullscreen(null, null)).not.toThrow()
  })
})

describe('exitFullscreen', () => {
  it('uses the standard exit when the document reports a fullscreen element', () => {
    const exit = vi.fn(() => Promise.resolve())
    Object.defineProperty(document, 'exitFullscreen', { value: exit, configurable: true })
    setDocFullscreen('fullscreenElement', container('standard'))

    exitFullscreen(videoEl(false))

    expect(exit).toHaveBeenCalledOnce()
  })

  it('exits the video directly on iOS, where the document knows nothing', () => {
    const v = videoEl(true)

    exitFullscreen(v)

    expect(v.webkitExitFullscreen).toHaveBeenCalledOnce()
  })

  it('does not throw with nothing full screen', () => {
    expect(() => exitFullscreen(null)).not.toThrow()
  })
})

describe('isFullscreen', () => {
  it('is true when the container is the document fullscreen element', () => {
    const el = container('standard')
    setDocFullscreen('fullscreenElement', el)

    expect(isFullscreen(el, videoEl(false))).toBe(true)
  })

  it('is true on iOS from the video flag alone', () => {
    // iOS never populates document.fullscreenElement. Reading only that is why the icon
    // would have stayed on "Full screen" even after the video filled the display.
    const v = videoEl(true) as unknown as HTMLVideoElement & AnyRecord
    v.webkitDisplayingFullscreen = true

    expect(isFullscreen(container('none'), v)).toBe(true)
  })

  it('is false when something ELSE on the page is full screen', () => {
    setDocFullscreen('fullscreenElement', document.createElement('section'))

    expect(isFullscreen(container('standard'), videoEl(false))).toBe(false)
  })

  it('is false when nothing is full screen', () => {
    expect(isFullscreen(container('standard'), videoEl(false))).toBe(false)
  })
})

describe('canFullscreen', () => {
  it('is true for a standard browser', () => {
    expect(canFullscreen(container('standard'), videoEl(false))).toBe(true)
  })

  it('is true on an iPhone, via the video', () => {
    expect(canFullscreen(container('none'), videoEl(true))).toBe(true)
  })

  it('is false where nothing supports it, so the button can be hidden', () => {
    expect(canFullscreen(container('none'), videoEl(false))).toBe(false)
  })
})

describe('onFullscreenChange', () => {
  it('hears the iOS events, which fire on the video rather than the document', () => {
    const v = videoEl(true)
    const handler = vi.fn()
    const stop = onFullscreenChange(v, handler)

    v.dispatchEvent(new Event('webkitbeginfullscreen'))
    expect(handler).toHaveBeenCalledOnce()

    v.dispatchEvent(new Event('webkitendfullscreen'))
    expect(handler).toHaveBeenCalledTimes(2)

    stop()
  })

  it('hears the standard document event', () => {
    const handler = vi.fn()
    const stop = onFullscreenChange(videoEl(false), handler)

    document.dispatchEvent(new Event('fullscreenchange'))

    expect(handler).toHaveBeenCalledOnce()
    stop()
  })

  it('unsubscribes everything it subscribed', () => {
    const v = videoEl(true)
    const handler = vi.fn()

    onFullscreenChange(v, handler)()

    document.dispatchEvent(new Event('fullscreenchange'))
    document.dispatchEvent(new Event('webkitfullscreenchange'))
    v.dispatchEvent(new Event('webkitbeginfullscreen'))

    expect(handler).not.toHaveBeenCalled()
  })
})
