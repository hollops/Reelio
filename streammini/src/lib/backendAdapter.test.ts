import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adaptEnvelope, adaptRequest, adaptResponse } from './backendAdapter'

// The shim between our contract and the Reelio backend. Pure functions, so every
// mismatch we found by reading their source can be pinned down here — before a
// backend is running, and before anyone has credentials.

beforeEach(() => {
  // The adapter warns about missing backend fields; that is deliberate, but noisy here.
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('adaptRequest', () => {
  it.each([
    ['/auth/login', '/auth/loginuser'],
    ['/auth/register', '/auth/createuser'],
    ['/videos/my-videos', '/videos/mine'],
  ])('renames %s to %s', (ours, theirs) => {
    expect(adaptRequest('POST', ours).path).toBe(theirs)
  })

  it('leaves paths we agree on alone', () => {
    for (const path of ['/videos', '/history', '/watch-later', '/admin/videos']) {
      expect(adaptRequest('GET', path).path).toBe(path)
    }
  })

  it('sends PATCH where the backend expects it, for a video update', () => {
    expect(adaptRequest('PUT', '/videos/abc123')).toEqual({
      method: 'PATCH',
      path: '/videos/abc123',
    })
  })

  it('does not turn every PUT into a PATCH', () => {
    // Only the video-update route differs; a blanket rule would break the others.
    expect(adaptRequest('PUT', '/users/me').method).toBe('PUT')
  })

  it('keeps the query string when a path is renamed', () => {
    expect(adaptRequest('GET', '/videos/my-videos?page=2').path).toBe('/videos/mine?page=2')
  })
})

describe('adaptResponse', () => {
  it('turns Mongo _id into id and drops __v', () => {
    const out = adaptResponse<{ id: string }>({ _id: 'abc123', __v: 0, name: 'Ada' })
    expect(out).toEqual({ id: 'abc123', name: 'Ada' })
  })

  it('reshapes a populated uploadedBy into our uploader', () => {
    const out = adaptResponse<{ uploader: { id: string; name: string } }>({
      _id: 'v1',
      title: 'Lagos Beats',
      videoUrl: '/v.mp4',
      uploadedBy: { _id: 'u7', name: 'Lagos Beats' },
    })
    expect(out.uploader).toEqual({ id: 'u7', name: 'Lagos Beats' })
  })

  it('still produces an uploader when the backend did not populate it', () => {
    // browseVideos populates; another endpoint might not. The UI must not crash either way.
    const out = adaptResponse<{ uploader: { id: string; name: string } }>({
      _id: 'v1',
      title: 'X',
      videoUrl: '/v.mp4',
      uploadedBy: 'u7',
    })
    expect(out.uploader).toEqual({ id: 'u7', name: 'Unknown' })
  })

  it('fills the fields their Video model does not have yet', () => {
    const out = adaptResponse<{ views: number; likes: number; category: string; comments: unknown[] }>({
      _id: 'v1',
      title: 'X',
      videoUrl: '/v.mp4',
      thumbnailUrl: '/t.jpg',
    })
    expect(out.views).toBe(0)
    expect(out.likes).toBe(0)
    expect(out.category).toBeTypeOf('string')
    expect(out.comments).toEqual([])
  })

  it('says out loud, once, which fields were missing', async () => {
    // The adapter warns ONCE per field per session, on purpose — repeating it for every
    // video would be noise. That state is module-level, so the tests above have already
    // used it up. Reset the module registry to get a fresh adapter.
    vi.resetModules()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fresh = await import('./backendAdapter')

    fresh.adaptResponse({ _id: 'v1', title: 'X', videoUrl: '/v.mp4' })
    const said = warn.mock.calls.flat().join(' ')
    expect(said).toMatch(/Video.views/)
    expect(said).toMatch(/Video.category/)

    // Said once, not again: a second video stays quiet.
    const before = warn.mock.calls.length
    fresh.adaptResponse({ _id: 'v2', title: 'Y', videoUrl: '/w.mp4' })
    expect(warn.mock.calls.length).toBe(before)
  })

  it('does not invent video fields on things that are not videos', () => {
    const user = adaptResponse<Record<string, unknown>>({ _id: 'u1', name: 'Ada', email: 'a@b.co' })
    expect(user).not.toHaveProperty('views')
    expect(user).not.toHaveProperty('category')
  })

  it('walks arrays and nested objects', () => {
    const out = adaptResponse<Array<{ id: string; video: { id: string } }>>([
      { _id: 'h1', video: { _id: 'v1', title: 'X', videoUrl: '/v.mp4' } },
      { _id: 'h2', video: { _id: 'v2', title: 'Y', videoUrl: '/w.mp4' } },
    ])
    expect(out.map((r) => r.id)).toEqual(['h1', 'h2'])
    expect(out[0]!.video.id).toBe('v1')
  })

  it('passes primitives and null through untouched', () => {
    expect(adaptResponse(null)).toBeNull()
    expect(adaptResponse('ok')).toBe('ok')
    expect(adaptResponse(42)).toBe(42)
  })
})

describe('adaptEnvelope', () => {
  // Every case below is a shape observed on the live Reelio deployment or read from
  // its controllers — not invented. If the backend standardises later, these fail loudly.

  it('finds the payload under "videos" when there is no success key at all', () => {
    // GET /videos, verbatim from https://viora-94kb.onrender.com/api/videos
    const v = adaptEnvelope('/videos', 200, {
      success: true,
      message: 'Videos retrieved successfully',
      videos: [{ _id: 'v1' }],
    })
    expect(v.ok).toBe(true)
    expect(v.payload).toEqual([{ _id: 'v1' }])
  })

  it('treats a missing success key as success, not failure', () => {
    // Their browseVideos omits `success` entirely. A strict reader would call it an error.
    const v = adaptEnvelope('/videos', 200, { message: 'ok', videos: [] })
    expect(v.ok).toBe(true)
    expect(v.payload).toEqual([])
  })

  it('digs through data to the single wrapped value', () => {
    // PATCH /videos/:id -> { success, message, data: { video } }
    const v = adaptEnvelope('/videos/v1', 200, {
      success: true,
      message: 'Video updated successfully',
      data: { video: { _id: 'v1', title: 'X' } },
    })
    expect(v.payload).toEqual({ _id: 'v1', title: 'X' })
  })

  it('unwraps data.savedVideos for watch later', () => {
    const v = adaptEnvelope('/watch-later', 200, {
      success: true,
      data: { savedVideos: [{ _id: 'v1' }] },
    })
    expect(v.payload).toEqual([{ _id: 'v1' }])
  })

  it('leaves /history alone, where data IS the payload', () => {
    const v = adaptEnvelope('/history', 200, {
      success: true,
      message: 'ok',
      data: [{ videoId: 'v1', progress: 10 }],
    })
    expect(v.payload).toEqual([{ videoId: 'v1', progress: 10 }])
  })

  it('keeps an auth reply whole instead of unwrapping it', () => {
    // POST /auth/loginuser -> { message, token }. The caller reads res.token and res.user,
    // so this must stay an OBJECT. Unwrapping the single key would hand back a bare string.
    const v = adaptEnvelope('/auth/login', 200, { message: 'Login successful', token: 'jwt.abc' })
    expect(v.payload).toEqual({ token: 'jwt.abc' })
  })

  it('keeps a register reply whole too', () => {
    const v = adaptEnvelope('/auth/register', 201, {
      message: 'User created successfully',
      user: { _id: 'u1', name: 'Ada' },
    })
    expect(v.payload).toEqual({ user: { _id: 'u1', name: 'Ada' } })
  })

  it('reports an explicit success:false as a failure, even on a 200', () => {
    const v = adaptEnvelope('/videos', 200, { success: false, message: 'Nope' })
    expect(v.ok).toBe(false)
    expect(v.message).toBe('Nope')
  })

  it('reports any non-2xx as a failure and keeps the server’s words', () => {
    const v = adaptEnvelope('/auth/login', 401, { message: 'Invalid credentials' })
    expect(v.ok).toBe(false)
    expect(v.message).toBe('Invalid credentials')
  })

  it('returns nothing for a delete that only confirms itself', () => {
    const v = adaptEnvelope('/videos/v1', 200, { success: true, message: 'Video deleted successfully' })
    expect(v.ok).toBe(true)
    expect(v.payload).toBeUndefined()
  })
})

describe('adaptEnvelope against the FIXED backend', () => {
  // These are the shapes the backend-fixes branch now returns. They prove the two sides
  // agree, and they fail if either drifts.

  it('hands login straight through as { token, user }', () => {
    const v = adaptEnvelope('/auth/login', 200, {
      success: true,
      message: 'Login successful',
      data: { token: 'jwt.abc', user: { _id: 'u1', name: 'Ada', role: 'user' } },
    })
    expect(v.ok).toBe(true)
    // The caller reads res.token and res.user, so both must survive as one object.
    expect(v.payload).toEqual({ token: 'jwt.abc', user: { _id: 'u1', name: 'Ada', role: 'user' } })
  })

  it('does the same for register, which now signs the user in', () => {
    const v = adaptEnvelope('/auth/register', 201, {
      success: true,
      message: 'User created successfully',
      data: { token: 'jwt.new', user: { _id: 'u2', name: 'Mike' } },
    })
    expect(v.payload).toHaveProperty('token', 'jwt.new')
    expect(v.payload).toHaveProperty('user')
  })

  it('returns the user itself from /auth/me, not a wrapper around it', () => {
    // The session restore calls api.get<User>('/auth/me') and expects a User, so the
    // backend sends the user AS data rather than as data.user.
    const v = adaptEnvelope('/auth/me', 200, {
      success: true,
      message: 'User retrieved successfully',
      data: { _id: 'u1', name: 'Ada', email: 'ada@example.com', role: 'user' },
    })
    expect(v.payload).toEqual({ _id: 'u1', name: 'Ada', email: 'ada@example.com', role: 'user' })
  })

  it('maps that user through adaptResponse into our shape', () => {
    const user = adaptResponse<{ id: string; name: string }>({
      _id: 'u1',
      name: 'Ada',
      email: 'ada@example.com',
      role: 'user',
      __v: 0,
    })
    expect(user.id).toBe('u1')
    expect(user).not.toHaveProperty('_id')
    expect(user).not.toHaveProperty('__v')
  })

  it('no longer needs to invent category or views once the backend sends them', () => {
    const warn = vi.mocked(console.warn)
    const before = warn.mock.calls.length
    const out = adaptResponse<{ category: string; views: number; likes: number }>({
      _id: 'v1',
      title: 'Lagos Beats',
      videoUrl: '/v.mp4',
      category: 'Music',
      views: 184000,
      likes: 9300,
    })
    expect(out.category).toBe('Music')
    expect(out.views).toBe(184000)
    // Silence here is the signal that the shim can eventually be deleted.
    expect(warn.mock.calls.length).toBe(before)
  })
})
