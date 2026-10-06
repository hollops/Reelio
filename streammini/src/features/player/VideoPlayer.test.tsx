import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { VideoPlayer } from './VideoPlayer'

/**
 * Prompt 102 — the player's play/pause logic.
 *
 * jsdom has a <video> element but no playback engine, so src/test/setup.ts stands in for
 * .play() and .pause() and keeps `paused` honest. That is enough to test OUR logic — which
 * button shows, which method we call, what the keyboard does — without a real browser.
 *
 * What this canNOT test: that a video actually renders a frame, that fullscreen works, or
 * that the controls fade out on a real timeline. Those live in the Playwright tests, and
 * that division is the whole point of having both kinds.
 */

/**
 * The player deliberately waits for the video's metadata before it auto-starts
 * (`if (v.readyState < 1) return`), because it cannot seek to a resume point until it knows
 * the length. jsdom never loads media, so readyState stays 0 forever and autoplay would never
 * run — making an autoplay test pass for the wrong reason. Stating the precondition explicitly
 * is the honest fix.
 */
function givenMetadataHasLoaded(duration = 120) {
  Object.defineProperty(window.HTMLMediaElement.prototype, 'readyState', {
    configurable: true,
    get: () => 1, // HAVE_METADATA
  })
  Object.defineProperty(window.HTMLMediaElement.prototype, 'duration', {
    configurable: true,
    get: () => duration,
  })
}

function renderPlayer(props: Partial<Parameters<typeof VideoPlayer>[0]> = {}) {
  const result = render(
    <VideoPlayer src="/video.mp4" poster="/poster.jpg" title="Afrobeats Live Session" {...props} />,
  )
  const video = result.container.querySelector('video')!
  return { ...result, video }
}

describe('VideoPlayer play/pause', () => {
  it('starts paused, with one big Play button', () => {
    const { video } = renderPlayer()
    expect(video.paused).toBe(true)
    // Before the first play there are two ways in: the big centre button and the control bar.
    expect(screen.getAllByRole('button', { name: 'Play' }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument()
  })

  it('plays when the Play control is pressed', async () => {
    const user = userEvent.setup()
    const { video } = renderPlayer()

    await user.click(screen.getAllByRole('button', { name: 'Play' })[0])

    await waitFor(() => expect(video.paused).toBe(false))
    // The button must now offer the OPPOSITE action — that is what a toggle means.
    expect(await screen.findByRole('button', { name: 'Pause' })).toBeInTheDocument()
  })

  it('pauses again when pressed a second time', async () => {
    const user = userEvent.setup()
    const { video } = renderPlayer()

    await user.click(screen.getAllByRole('button', { name: 'Play' })[0])
    await screen.findByRole('button', { name: 'Pause' })

    await user.click(screen.getByRole('button', { name: 'Pause' }))

    await waitFor(() => expect(video.paused).toBe(true))
    expect(await screen.findByRole('button', { name: 'Play' })).toBeInTheDocument()
  })

  it('toggles with the K shortcut', async () => {
    const user = userEvent.setup()
    const { video } = renderPlayer()

    await user.keyboard('k')
    await waitFor(() => expect(video.paused).toBe(false))

    await user.keyboard('k')
    await waitFor(() => expect(video.paused).toBe(true))
  })

  it('toggles with the space bar', async () => {
    const user = userEvent.setup()
    const { video } = renderPlayer()

    await user.keyboard(' ')
    await waitFor(() => expect(video.paused).toBe(false))
  })

  it('advertises the K shortcut to screen readers', async () => {
    const user = userEvent.setup()
    renderPlayer()
    await user.click(screen.getAllByRole('button', { name: 'Play' })[0])

    const pause = await screen.findByRole('button', { name: 'Pause' })
    expect(pause).toHaveAttribute('aria-keyshortcuts', 'K')
  })

  it('starts by itself when autoPlay is asked for', async () => {
    givenMetadataHasLoaded()
    const { video } = renderPlayer({ autoPlay: true })
    await waitFor(() => expect(video.paused).toBe(false))
  })

  it('survives the browser blocking autoplay', async () => {
    // Real browsers reject play() when the viewer has not interacted with the page yet.
    // An unhandled rejection here would surface as a crash; the player must simply stay paused.
    givenMetadataHasLoaded()
    const play = vi
      .spyOn(window.HTMLMediaElement.prototype, 'play')
      .mockRejectedValue(
        new DOMException('play() failed because the user agent did not allow it', 'NotAllowedError'),
      )

    const { video } = renderPlayer({ autoPlay: true })

    // It really did try — without this the test would pass even if autoplay never ran.
    await waitFor(() => expect(play).toHaveBeenCalled())

    await waitFor(() => expect(video.paused).toBe(true))
    // Still usable: the Play button is right there.
    expect(screen.getAllByRole('button', { name: 'Play' }).length).toBeGreaterThan(0)
  })

  it('reports where the viewer got to when they pause', async () => {
    const user = userEvent.setup()
    const onProgress = vi.fn()
    givenMetadataHasLoaded(120) // jsdom loads no media, so state the length ourselves
    const { video } = renderPlayer({ onProgress })

    video.currentTime = 42

    await user.click(screen.getAllByRole('button', { name: 'Play' })[0])
    await screen.findByRole('button', { name: 'Pause' })
    await user.click(screen.getByRole('button', { name: 'Pause' }))

    await waitFor(() => expect(onProgress).toHaveBeenCalledWith(42, 120))
  })
})
