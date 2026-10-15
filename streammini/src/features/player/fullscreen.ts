/**
 * Going full screen, in the three ways browsers actually implement it.
 *
 * The standard Fullscreen API works on any element, and that is what Chrome, Edge, Firefox
 * and Android all use. Two other worlds exist, and skipping them is why the button did
 * nothing on a phone:
 *
 * 1. **iPhone Safari has no element fullscreen at all.** `div.requestFullscreen` is not just
 *    unsupported, it is *absent* — so the old `containerRef.current?.requestFullscreen()`
 *    threw. (Optional chaining guarded the ref being null, not the method being missing.)
 *    On iOS only the <video> itself can fill the screen, through `webkitEnterFullscreen()`,
 *    which hands over to Apple's own player UI.
 * 2. **Older WebKit** (iPad, older Safari on macOS) has element fullscreen, but under
 *    `webkit`-prefixed names.
 *
 * Everything non-standard is confined to this file so the player can just say
 * "go full screen" and not care which browser it is talking to.
 */

/** The prefixed members browsers ship but TypeScript's DOM types don't declare. */
type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void> | void
}

type WebkitElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

type IosVideo = HTMLVideoElement & {
  /** iOS only: put THIS video full screen, in the native player. */
  webkitEnterFullscreen?: () => void
  webkitExitFullscreen?: () => void
  /** False before metadata loads — iOS can't go full screen until it knows the size. */
  webkitSupportsFullscreen?: boolean
  webkitDisplayingFullscreen?: boolean
}

/** Whatever is full screen right now, under either spelling. */
function currentElement(): Element | null {
  const doc = document as WebkitDocument
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null
}

/**
 * Is the player full screen?
 *
 * On iOS nothing is ever in `document.fullscreenElement` — the video reports its own state
 * through `webkitDisplayingFullscreen` instead, so check that too or the icon never flips.
 */
export function isFullscreen(
  container: HTMLElement | null,
  video: HTMLVideoElement | null,
): boolean {
  const element = currentElement()
  if (element) return element === container || element === video
  return Boolean((video as IosVideo | null)?.webkitDisplayingFullscreen)
}

/**
 * Can this browser do it at all?
 *
 * Used to hide the button rather than show one that cannot work. On iOS the answer is "not
 * yet" until the video has its metadata, so this is re-checked rather than cached.
 */
export function canFullscreen(
  container: HTMLElement | null,
  video: HTMLVideoElement | null,
): boolean {
  const element = container as WebkitElement | null
  if (element?.requestFullscreen || element?.webkitRequestFullscreen) return true
  const ios = video as IosVideo | null
  return Boolean(ios?.webkitEnterFullscreen)
}

/** Go full screen — the whole player where possible, the bare video on iOS. */
export function enterFullscreen(
  container: HTMLElement | null,
  video: HTMLVideoElement | null,
): void {
  const element = container as WebkitElement | null

  // Preferred: the whole player box, so OUR controls go full screen with the picture.
  if (element?.requestFullscreen) {
    // Rejects when the gesture isn't trusted — a refusal, not a crash.
    void Promise.resolve(element.requestFullscreen()).catch(() => {})
    return
  }
  if (element?.webkitRequestFullscreen) {
    void Promise.resolve(element.webkitRequestFullscreen()).catch(() => {})
    return
  }

  // iPhone: only the video can do this, and we get Apple's controls instead of ours.
  // Worse than the real thing, and far better than a button that does nothing.
  ;(video as IosVideo | null)?.webkitEnterFullscreen?.()
}

/** Come back out, whichever way we went in. */
export function exitFullscreen(video: HTMLVideoElement | null): void {
  const doc = document as WebkitDocument

  if (doc.fullscreenElement && doc.exitFullscreen) {
    void Promise.resolve(doc.exitFullscreen()).catch(() => {})
    return
  }
  if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) {
    void Promise.resolve(doc.webkitExitFullscreen()).catch(() => {})
    return
  }
  ;(video as IosVideo | null)?.webkitExitFullscreen?.()
}

/**
 * Tell me whenever it changes — including the ways that aren't our button: Esc, the browser's
 * own UI, and iOS's native "Done".
 *
 * Returns the unsubscribe function, so an effect can just return it.
 */
export function onFullscreenChange(
  video: HTMLVideoElement | null,
  handler: () => void,
): () => void {
  document.addEventListener('fullscreenchange', handler)
  document.addEventListener('webkitfullscreenchange', handler)
  // iOS fires these on the VIDEO, not the document.
  video?.addEventListener('webkitbeginfullscreen', handler)
  video?.addEventListener('webkitendfullscreen', handler)

  return () => {
    document.removeEventListener('fullscreenchange', handler)
    document.removeEventListener('webkitfullscreenchange', handler)
    video?.removeEventListener('webkitbeginfullscreen', handler)
    video?.removeEventListener('webkitendfullscreen', handler)
  }
}
