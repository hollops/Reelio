import { useState, type ReactNode } from 'react'
import { Avatar } from '../components/Avatar'
import { Badge, DurationBadge } from '../components/Badge'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { ClockIcon, SearchIcon } from '../components/icons'
import { Input } from '../components/Input'
import { Container, PageHeader, VideoGrid } from '../components/layout'
import { Modal } from '../components/Modal'
import { SkeletonText, SkeletonVideoCard } from '../components/Skeleton'
import { Spinner } from '../components/Spinner'
import { useToast } from '../components/toast/toastContext'
import { useAuth } from '../features/auth/authContext'
import { SearchBar } from '../features/search/SearchBar'
import { FeaturedBanner } from '../features/videos/FeaturedBanner'
import { VideoCard } from '../features/videos/VideoCard'
import { VideoForm } from '../features/videos/VideoForm'
import { VideoRow } from '../features/videos/VideoRow'
import { api, ApiError, setToken } from '../lib/apiClient'
import { isRecent } from '../lib/format'
import { seedVideos } from '../lib/mockData'

const sampleVideos = seedVideos.slice(0, 6)
// A fixed "today" so the showcase always shows the same New badges, whatever the real date.
const DEMO_NOW = new Date('2026-09-27T12:00:00Z').getTime()

// VideoCard demo: four real videos, plus two edge cases every card must survive.
const cardVideos = [
  ...seedVideos.slice(0, 4),
  {
    ...seedVideos[4],
    id: 'demo-long-title',
    title:
      'A really, really long video title that keeps going well past two lines, to prove the card clamps it neatly with an ellipsis',
  },
  { ...seedVideos[5], id: 'demo-broken-thumb', thumbnailUrl: 'https://example.invalid/none.jpg' },
]

// Development-only showcase of every UI kit component in every state (a mini "Storybook").
// Only registered as a route in dev builds — see router.tsx.

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 border-b border-line pb-8">
      <h2 className="text-title font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="w-24 text-caption text-fg-subtle">{label}</span>
      {children}
    </div>
  )
}

export default function UiKitPage() {
  const [saving, setSaving] = useState(false)
  const [clicks, setClicks] = useState(0)
  const [openModal, setOpenModal] = useState<'confirm' | 'long' | null>(null)
  const closeModal = () => setOpenModal(null)
  const [postersLoading, setPostersLoading] = useState(true)
  const toast = useToast()
  const auth = useAuth()
  const [busy, setBusy] = useState<'ada' | 'admin' | null>(null)
  const [savedIds, setSavedIds] = useState<string[]>([cardVideos[1].id])
  const [debounced, setDebounced] = useState({ value: '', reports: 0 })

  async function quickLogin(who: 'ada' | 'admin') {
    setBusy(who)
    try {
      const user = await auth.login(
        who === 'ada'
          ? { email: 'ada@streammini.dev', password: 'password1' }
          : { email: 'admin@streammini.dev', password: 'admin123' },
      )
      toast.success(`Signed in as ${user.name}`)
    } finally {
      setBusy(null)
    }
  }

  async function wrongPassword() {
    try {
      await auth.login({ email: 'ada@streammini.dev', password: 'nope' })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unexpected error')
    }
  }

  // Swap the saved token for a fake one, then make any request: the server rejects it (401).
  async function expireSession() {
    setToken('mock-jwt.no-such-user')
    await api.get('/auth/me').catch(() => {})
  }

  function fakeSave() {
    setSaving(true)
    setClicks((n) => n + 1)
    setTimeout(() => setSaving(false), 1500)
  }

  return (
    <Container className="space-y-8 pb-16">
      <PageHeader title="UI Kit" description="Every shared component, in every state. Dev only." />

      <Section title="Auth (dev quick login)">
        <p className="text-small text-fg-muted">
          Until the login form exists (Prompts 25–28): sign in here and watch the real NavBar at the
          top change. Refresh the page — you stay signed in.
        </p>
        <Row label="Status">
          <code className="text-small" data-testid="auth-status">
            {auth.status}
            {auth.user ? ` — ${auth.user.name} (${auth.user.role})` : ''}
          </code>
        </Row>
        <Row label="Actions">
          <Button size="sm" isLoading={busy === 'ada'} onClick={() => quickLogin('ada')}>
            Sign in as Ada
          </Button>
          <Button size="sm" isLoading={busy === 'admin'} onClick={() => quickLogin('admin')}>
            Sign in as Admin
          </Button>
          <Button variant="secondary" size="sm" onClick={wrongPassword}>
            Wrong password
          </Button>
          <Button variant="secondary" size="sm" onClick={expireSession}>
            Simulate expired session
          </Button>
          <Button variant="ghost" size="sm" onClick={auth.logout}>
            Sign out
          </Button>
        </Row>
      </Section>

      <Section title="Button">
        <Row label="Variants">
          <Button variant="primary">▶ Play</Button>
          <Button variant="secondary">More Info</Button>
          <Button variant="ghost">Forgot password?</Button>
        </Row>
        <Row label="Sizes">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </Row>
        <Row label="Disabled">
          <Button disabled>Primary</Button>
          <Button variant="secondary" disabled>
            Secondary
          </Button>
          <Button variant="ghost" disabled>
            Ghost
          </Button>
        </Row>
        <Row label="Loading">
          <Button isLoading>Sign in</Button>
          <Button variant="secondary" isLoading>
            More Info
          </Button>
        </Row>
        <Row label="Try it">
          <Button onClick={fakeSave} isLoading={saving}>
            Save changes
          </Button>
          <span className="text-small text-fg-muted">
            Clicked {clicks} time{clicks === 1 ? '' : 's'} — try double-clicking fast.
          </span>
        </Row>
      </Section>

      <Section title="Input">
        <div className="grid max-w-md gap-5">
          <Input label="Name" placeholder="Ada Lovelace" />
          <Input
            label="Email"
            type="email"
            defaultValue="ada@streammini"
            error="Enter a valid email address."
          />
          <Input label="Password" type="password" defaultValue="password1" />
          <Input label="Disabled" defaultValue="Can't edit this" disabled />
        </div>
      </Section>

      <Section title="Badge">
        <Row label="Variants">
          <Badge>Food</Badge>
          <Badge>Music</Badge>
          <Badge variant="accent">New</Badge>
          <span className="rounded bg-fg-subtle p-1">
            <Badge variant="overlay">10:53</Badge>
          </span>
        </Row>
        <Row label="On a video">
          {/* One upload from yesterday (gets "New") and one from August (doesn't). */}
          {[seedVideos[7], seedVideos[2]].map((video) => (
            <div key={video.id} className="w-72 space-y-2">
              <div className="relative">
                <img
                  src={video.thumbnailUrl}
                  alt=""
                  className="aspect-video w-full rounded-xl bg-elevated object-cover"
                />
                <DurationBadge seconds={video.duration} />
              </div>
              <div className="flex gap-2">
                <Badge>{video.category}</Badge>
                {isRecent(video.createdAt, 7, DEMO_NOW) && <Badge variant="accent">New</Badge>}
              </div>
            </div>
          ))}
        </Row>
      </Section>

      <Section title="Avatar">
        <Row label="Sizes">
          {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
            <Avatar key={size} name="Ada Viewer" size={size} />
          ))}
        </Row>
        <Row label="Initials">
          {[
            'Lagos Beats',
            'Learn With Tobi',
            'Kitchen Chronicles',
            'prince',
            '  Femi   Ade  ',
            '',
          ].map((name) => (
            <span key={name} className="flex items-center gap-2">
              <Avatar name={name} size="sm" />
              <code className="text-caption text-fg-subtle">"{name}"</code>
            </span>
          ))}
        </Row>
        <Row label="Photo">
          <Avatar
            name="Photo loads"
            src="https://picsum.photos/seed/avatar-demo/128/128"
            size="lg"
          />
          <Avatar name="Broken Link" src="https://example.invalid/missing.jpg" size="lg" />
          <span className="text-small text-fg-muted">
            A working photo, then a broken one that falls back to initials.
          </span>
        </Row>
      </Section>

      <Section title="Toast">
        <Row label="Trigger">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => toast.success('Saved to Watch Later')}
          >
            Success
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => toast.error('Couldn’t save your comment. Check your connection.')}
          >
            Error
          </Button>
          <Button variant="secondary" size="sm" onClick={() => toast.info('Link copied')}>
            Info
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              toast.info('Removed from Watch Later', {
                action: { label: 'Undo', onClick: () => toast.success('Restored to Watch Later') },
              })
            }
          >
            With Undo
          </Button>
        </Row>
        <p className="text-small text-fg-muted">
          Try: click Success 5 times fast (only 3 stay), and hover a toast to pause its timer.
        </p>
      </Section>

      <Section title="EmptyState">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-line">
            <EmptyState
              icon={<ClockIcon />}
              title="Nothing saved yet"
              description="Videos you save for later will appear here."
              action={{ label: 'Browse videos', to: '/' }}
            />
          </div>
          <div className="rounded-xl border border-line">
            <EmptyState
              icon={<SearchIcon />}
              title="No results for “zzqx”"
              description="Try different keywords, or remove the category filter."
              action={{ label: 'Clear filters', onClick: () => toast.info('Filters cleared') }}
            />
          </div>
        </div>
      </Section>

      <Section title="Layout">
        <p className="text-small text-fg-muted">
          <code>VideoGrid</code> fits as many ≥18rem columns as its box allows. Resize the window to
          watch 1 → 2 → 3 → 4 columns. Below, the same grid inside a narrow 20rem box stays at 1.
        </p>
        <VideoGrid>
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="flex aspect-video items-center justify-center rounded-xl bg-surface text-fg-subtle"
            >
              Card {i + 1}
            </div>
          ))}
        </VideoGrid>
        <div className="w-80 max-w-full rounded-xl border border-dashed border-line p-3">
          <VideoGrid>
            {[1, 2].map((n) => (
              <div
                key={n}
                className="flex aspect-video items-center justify-center rounded-xl bg-surface text-fg-subtle"
              >
                Narrow {n}
              </div>
            ))}
          </VideoGrid>
        </div>
      </Section>

      <Section title="Spinner">
        <Row label="Sizes">
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" className="text-accent-text" />
        </Row>
      </Section>

      <Section title="VideoCard">
        <p className="text-small text-fg-muted">
          Hover a card (or Tab to its clock button): zoom, ▶ sign, and the Watch later button. On
          touch screens the button is always visible. Clicking it only flips local state here — the
          server is connected in Prompt 42.
        </p>
        <VideoGrid>
          {cardVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              now={DEMO_NOW}
              inWatchLater={savedIds.includes(video.id)}
              onToggleWatchLater={(v) =>
                setSavedIds((ids) =>
                  ids.includes(v.id) ? ids.filter((id) => id !== v.id) : [...ids, v.id],
                )
              }
            />
          ))}
        </VideoGrid>
      </Section>

      <Section title="VideoForm">
        <p className="text-small text-fg-muted">
          Prompt 86 — the shared form for uploading and editing. Try submitting it empty. This demo
          pretends to save (and fails on purpose if the title contains “fail”).
        </p>
        <div className="max-w-xl">
          <VideoForm
            submitLabel="Save"
            onSubmit={async (v) => {
              await new Promise((resolve) => setTimeout(resolve, 500))
              if (v.title.toLowerCase().includes('fail')) {
                throw new ApiError(400, 'Please fix the highlighted fields.', {
                  title: 'That title is not allowed (pretend server rule).',
                })
              }
              toast.success(`Saved “${v.title}” in ${v.category}.`)
            }}
          />
        </div>
      </Section>

      <Section title="SearchBar (debounced)">
        <p className="text-small text-fg-muted">
          Type quickly: the report below updates only once you pause for 300 ms — not on every key.
          (Prompt 57; the NavBar suggestions in Prompt 62 use this.)
        </p>
        <div className="max-w-xl">
          <SearchBar
            onDebouncedChange={(q) => setDebounced((d) => ({ value: q, reports: d.reports + 1 }))}
          />
        </div>
        <p className="text-small" data-testid="debounce-report">
          Reports: {debounced.reports} · last: “{debounced.value}”
        </p>
      </Section>

      <Section title="FeaturedBanner">
        <p className="text-small text-fg-muted">
          “Watch now” is a link to the Watch page; “Watch later” toggles here. Narrow the window:
          the fade switches from left-to-right to bottom-to-top.
        </p>
        <FeaturedBanner
          video={seedVideos[0]}
          now={DEMO_NOW}
          inWatchLater={savedIds.includes(seedVideos[0].id)}
          onToggleWatchLater={(v) =>
            setSavedIds((ids) =>
              ids.includes(v.id) ? ids.filter((id) => id !== v.id) : [...ids, v.id],
            )
          }
        />
      </Section>

      <Section title="VideoRow">
        <p className="text-small text-fg-muted">
          Hover the row for ‹ › buttons (hidden when there’s nothing more that way). Swipe or
          Shift+scroll works too. The short row fits, so it shows no arrows at all.
        </p>
        <VideoRow
          title="Trending"
          videos={seedVideos.slice(0, 10)}
          action={
            <a
              href="#videorow"
              className="text-small font-semibold text-accent-text hover:underline"
            >
              See all
            </a>
          }
          cardProps={(video) => ({ now: DEMO_NOW, inWatchLater: savedIds.includes(video.id) })}
        />
        <VideoRow title="Short row" videos={seedVideos.slice(10, 12)} />
      </Section>

      <Section title="Skeleton">
        <Row label="Toggle">
          <Button variant="secondary" size="sm" onClick={() => setPostersLoading((v) => !v)}>
            {postersLoading ? 'Show loaded content' : 'Show loading state'}
          </Button>
          <span className="text-small text-fg-muted">
            Watch the swap — the videos fill exactly the space the skeletons held.
          </span>
        </Row>
        <div aria-busy={postersLoading}>
          <VideoGrid>
            {sampleVideos.map((video) =>
              postersLoading ? (
                <SkeletonVideoCard key={video.id} />
              ) : (
                <VideoCard key={video.id} video={video} now={DEMO_NOW} />
              ),
            )}
          </VideoGrid>
        </div>
        <Row label="Text">
          <SkeletonText lines={3} className="w-full max-w-md" />
        </Row>
      </Section>

      <Section title="Modal">
        <Row label="Open">
          <Button variant="secondary" onClick={() => setOpenModal('confirm')}>
            Delete video…
          </Button>
          <Button variant="secondary" onClick={() => setOpenModal('long')}>
            Long content
          </Button>
        </Row>
        <p className="text-small text-fg-muted">
          Try: Escape, clicking the dark backdrop, the ✕, and pressing Tab — focus stays inside.
        </p>

        <Modal
          open={openModal === 'confirm'}
          onClose={closeModal}
          title="Delete “Every Group Project Ever”?"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={closeModal}>
                Cancel
              </Button>
              <Button onClick={closeModal}>Delete</Button>
            </>
          }
        >
          <p className="text-fg-muted">
            This deletes the video for everyone, along with its comments, likes and watch history.
            This can’t be undone.
          </p>
        </Modal>

        <Modal open={openModal === 'long'} onClose={closeModal} title="Terms of service">
          <div className="space-y-4 text-fg-muted">
            {Array.from({ length: 12 }, (_, i) => (
              <p key={i}>
                Section {i + 1}. Long content scrolls inside the modal, while the page behind it
                stays frozen in place.
              </p>
            ))}
          </div>
        </Modal>
      </Section>
    </Container>
  )
}
