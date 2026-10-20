// The backdrop behind the sign-in and register cards: a wall of cover-art tiles
// drifting slowly upward, two spotlight glows, and the Viora "V" standing over
// the whole thing. It should say "video streaming" at a glance without competing
// with the thing people came here to do, which is type an email address.
//
// Three rules make a decorative background safe to put behind a form:
//   1. `pointer-events-none` — clicks pass straight through to the inputs.
//      Without it, a full-screen layer silently swallows every click.
//   2. `aria-hidden="true"` — decoration has nothing to read aloud, so a screen
//      reader skips it entirely and lands on "Email".
//   3. `motion-safe:` on every animation — large moving backgrounds are exactly
//      what triggers vestibular disorders. Anyone who has asked their device to
//      reduce motion gets the same composition, perfectly still.
//
// PAINT ORDER MATTERS HERE. Elements paint in DOM order, so anything later sits
// on top. The readability wash has to come after the tiles (to calm them) and
// before the V (so the V is not buried under it). An earlier version had the V
// above the wash in the file and it was invisible on screen.
//
// Every colour comes from a design token, so the whole thing re-themes itself in
// light mode with no extra code. That is the payoff for never writing raw hex.

/**
 * Tonal treatments for the tiles.
 *
 * Real cover art is varied, so uniform grey rectangles read as a spreadsheet
 * rather than a catalogue. These mix the two brand colours into `elevated` at
 * different angles and strengths: enough variety to look like distinct artwork,
 * while staying inside the one-accent rule the design tokens set out. Adding
 * unrelated hues would look livelier and quietly break the brand.
 */
const ART = [
  'bg-[linear-gradient(135deg,var(--color-accent)_-10%,var(--color-elevated)_65%)]',
  'bg-[linear-gradient(200deg,var(--color-accent-text)_-20%,var(--color-elevated)_60%)]',
  'bg-[linear-gradient(35deg,var(--color-elevated)_20%,var(--color-accent)_140%)]',
  'bg-elevated',
  'bg-[linear-gradient(160deg,var(--color-accent-text)_-30%,var(--color-elevated)_55%)]',
  'bg-[linear-gradient(300deg,var(--color-accent)_-40%,var(--color-elevated)_70%)]',
] as const

/**
 * The tile wall, written out rather than generated randomly.
 *
 * A fixed list keeps render pure: the same input always draws the same picture,
 * so React re-rendering the page never reshuffles the wall, and a test cannot
 * fail intermittently. `Math.random()` in a component body would do both.
 *
 * `tall` varies the shape so the wall reads as mixed content. `progress` draws
 * the little accent bar along the bottom, the way a streaming service marks
 * something you part-watched. `play` puts a play glyph on a few tiles. `lit`
 * picks out the ones that shimmer.
 */
const TILES = [
  { tall: true, art: 0, photo: '1074', progress: 0.62, play: true, lit: true },
  { tall: false, art: 3, photo: '1015', progress: null, play: false, lit: false },
  { tall: false, art: 1, photo: null, progress: 0.28, play: false, lit: false },
  { tall: true, art: 4, photo: '1016', progress: null, play: true, lit: false },
  { tall: false, art: 2, photo: '1018', progress: null, play: false, lit: true },
  { tall: false, art: 5, photo: null, progress: 0.81, play: false, lit: false },
  { tall: true, art: 3, photo: '1043', progress: null, play: false, lit: false },
  { tall: false, art: 0, photo: '1024', progress: 0.44, play: true, lit: false },
  { tall: false, art: 4, photo: null, progress: null, play: false, lit: true },
  { tall: true, art: 1, photo: '1036', progress: 0.15, play: false, lit: false },
  { tall: false, art: 5, photo: '110', progress: null, play: false, lit: false },
  { tall: false, art: 2, photo: null, progress: 0.7, play: true, lit: false },
  { tall: true, art: 0, photo: '1039', progress: null, play: false, lit: true },
  { tall: false, art: 4, photo: '1050', progress: 0.36, play: false, lit: false },
  { tall: false, art: 3, photo: null, progress: null, play: false, lit: false },
  { tall: true, art: 5, photo: '164', progress: 0.55, play: true, lit: false },
  { tall: false, art: 1, photo: null, progress: null, play: false, lit: true },
  { tall: false, art: 2, photo: null, progress: 0.23, play: false, lit: false },
] as const

function TileWall() {
  // The set is rendered twice. The animation shifts the whole column up by 50%,
  // which lands the second copy exactly where the first began — so the loop
  // closes with no visible jump. Shift by any other amount and you get a seam.
  return (
    <div className="absolute inset-x-0 top-0 h-[200%] motion-safe:animate-auth-wall">
      {[0, 1].map((copy) => (
        <div
          key={copy}
          className="grid h-1/2 grid-cols-3 content-start gap-3 p-3 sm:grid-cols-4 sm:gap-4 sm:p-4 lg:grid-cols-6"
        >
          {TILES.map((tile, i) => (
            <div
              key={i}
              className={[
                'relative grid place-items-center overflow-hidden rounded-lg border border-line',
                ART[tile.art],
                tile.tall ? 'aspect-[2/3]' : 'aspect-video',
                tile.lit ? 'opacity-45 motion-safe:animate-auth-shimmer' : 'opacity-45',
              ].join(' ')}
              // Staggered delays, so the lit tiles never brighten in unison. A
              // negative delay starts the animation already part-way through,
              // so no tile sits waiting its turn after the page loads.
              style={tile.lit ? { animationDelay: `-${(i % 5) * 1.4}s` } : undefined}
            >
              {/* The photograph, where a tile has one. The gradient above stays
                  underneath it, so a tile that is still loading (or whose file
                  is missing) shows brand-coloured artwork rather than a hole.
                  alt="" because this whole layer is aria-hidden decoration —
                  describing a landscape to a screen reader here would be noise.
                  Lazy: the form must never wait on background texture. */}
              {tile.photo && (
                <img
                  src={`/auth/${tile.photo}.jpg`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 size-full object-cover"
                />
              )}

              {/* `relative` matters: the photo above is absolutely positioned,
                  and positioned elements paint over static ones. Without this
                  the glyph would sit behind the picture and vanish.
                  White rather than a token colour because it lands on a
                  photograph, which looks the same in either theme. */}
              {tile.play && (
                <svg
                  viewBox="0 0 24 24"
                  className="relative size-1/4 fill-white/75 drop-shadow"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M8 5.5v13l11-6.5z" />
                </svg>
              )}

              {/* The part-watched bar. Width is the only inline style here,
                  because it differs per tile and Tailwind cannot express an
                  arbitrary runtime percentage as a utility class. */}
              {tile.progress !== null && (
                <span className="absolute inset-x-2 bottom-2 h-1 rounded-full bg-line-strong/50">
                  <span
                    className="block h-full rounded-full bg-accent"
                    style={{ width: `${tile.progress * 100}%` }}
                  />
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function AuthBackdrop() {
  return (
    <div
      aria-hidden="true"
      // fixed + inset-0: covers the viewport regardless of which container this
      // sits inside. z-0 keeps it above the page background but below the card
      // (z-10) and well below the sticky NavBar (z-40).
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* 1. The cover-art wall. */}
      <TileWall />

      {/* 2. Two spotlight glows, sized well beyond the viewport so their soft
             edges never drift into view. */}
      <div className="absolute -top-1/3 -left-1/4 size-[70vmax] rounded-full bg-[radial-gradient(circle,var(--color-accent)_0%,transparent_62%)] opacity-30 blur-3xl motion-safe:animate-auth-glow-a" />
      <div className="absolute -right-1/4 -bottom-1/3 size-[60vmax] rounded-full bg-[radial-gradient(circle,var(--color-accent-text)_0%,transparent_62%)] opacity-25 blur-3xl motion-safe:animate-auth-glow-b" />

      {/* 3. Readability wash. The tiles stay visible around the edges while the
             middle settles enough for the card to sit on it comfortably. This
             must come BEFORE the V in the file, or it paints over it. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--color-canvas)_26%,transparent_76%)]" />
      <div className="absolute inset-0 bg-canvas/45" />

      {/* 4. The Viora V, over the wash so it actually reads. Same letter and
             weight as Logo.tsx, so there is one brand mark rather than two that
             drift apart over time. */}
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-accent-text select-none text-[min(80vh,80vw)] leading-none font-extrabold opacity-20 motion-safe:animate-auth-breathe">
          V
        </span>
      </div>
    </div>
  )
}
