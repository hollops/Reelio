import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// Runs before every test file. Anything here is the "world" each test starts in.

afterEach(() => {
  // Unmount anything still rendered, so one test's DOM cannot leak into the next.
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
})

beforeEach(() => {
  /**
   * jsdom implements the <video> ELEMENT but none of its playback: calling .play() throws
   * "Not implemented". Our player calls play()/pause() directly, so we stand in for them and
   * keep `paused` honest — that is the one piece of state the play/pause tests care about.
   */
  const media = window.HTMLMediaElement.prototype

  Object.defineProperty(media, 'paused', {
    configurable: true,
    get(this: HTMLMediaElement & { _paused?: boolean }) {
      return this._paused ?? true // a fresh <video> starts paused, like a real one
    },
  })

  vi.spyOn(media, 'play').mockImplementation(function (
    this: HTMLMediaElement & { _paused?: boolean },
  ) {
    this._paused = false
    this.dispatchEvent(new Event('play'))
    return Promise.resolve()
  })

  vi.spyOn(media, 'pause').mockImplementation(function (
    this: HTMLMediaElement & { _paused?: boolean },
  ) {
    this._paused = true
    this.dispatchEvent(new Event('pause'))
  })

  // jsdom has no layout, so these exist only as no-ops.
  media.load = vi.fn()
  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = vi.fn()
  }
  if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  }
})
