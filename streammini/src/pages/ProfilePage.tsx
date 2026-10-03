import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react'
import { Avatar } from '../components/Avatar'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Container, PageHeader } from '../components/layout'
import { useToast } from '../components/toast/toastContext'
import { useAuth } from '../features/auth/authContext'
import { checkName } from '../features/auth/validation'
import { AVATAR_ACCEPT, checkAvatarFile } from '../features/profile/avatarFile'
import { updateProfile } from '../features/profile/profileApi'
import { ApiError } from '../lib/apiClient'
import { formatDate } from '../lib/format'
import type { User } from '../lib/types'
import { usePageTitle } from '../components/usePageTitle'

// Prompt 31: "Your profile" — read-only account facts, plus the two things that make up your
// YouTube-style channel identity: display name and photo. Prompt 32: saving them.

/**
 * What should happen to the photo when Save is pressed — always exactly ONE of these.
 * The either/or type makes nonsense like "remove it AND use this new file" impossible to write.
 */
type PhotoChange =
  { kind: 'keep' } | { kind: 'new'; file: File; previewUrl: string } | { kind: 'remove' }

export default function ProfilePage() {
  usePageTitle('Your profile')
  const { user } = useAuth()
  // ProtectedRoute guarantees a signed-in user; this line just proves it to TypeScript.
  if (!user) return null
  // key: if a different person signs in, start the form fresh instead of keeping old edits.
  return <ProfileForm key={user.id} user={user} />
}

function ProfileForm({ user }: { user: User }) {
  const toast = useToast()
  const { updateUser } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [name, setName] = useState(user.name)
  const [nameError, setNameError] = useState<string>()
  const [photo, setPhoto] = useState<PhotoChange>({ kind: 'keep' })
  const [photoError, setPhotoError] = useState<string>()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  // The current preview address, so it can be handed back if the page closes mid-edit.
  const previewUrlRef = useRef<string | null>(null)
  const photoStatusId = useId()

  // On leaving the page: release the preview's memory (see replacePhoto).
  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    },
    [],
  )

  /**
   * The ONE place the photo choice changes. A preview address (blob:…) holds the whole image
   * in memory until it's revoked, so the old one is always released before moving on.
   */
  function replacePhoto(next: PhotoChange) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = next.kind === 'new' ? next.previewUrl : null
    setPhoto(next)
  }

  function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Reset the picker, so choosing the SAME file again still counts as a change.
    e.target.value = ''
    if (!file) return // the user closed the dialog without choosing

    const problem = checkAvatarFile(file)
    setPhotoError(problem)
    if (problem) return
    // A temporary address for a file still on the user's computer — an instant preview, no upload.
    replacePhoto({ kind: 'new', file, previewUrl: URL.createObjectURL(file) })
  }

  // What the avatar shows right now: the pending choice, otherwise what's saved.
  const shownPhoto =
    photo.kind === 'new' ? photo.previewUrl : photo.kind === 'remove' ? undefined : user.avatarUrl
  const trimmedName = name.trim()
  const isDirty = trimmedName !== user.name || photo.kind !== 'keep'

  function onNameChange(value: string) {
    setName(value)
    // Once an error is showing, re-check as they type so it clears the moment it's fixed.
    if (nameError) setNameError(checkName(value))
  }

  function onCancel() {
    setName(user.name)
    setNameError(undefined)
    setPhotoError(undefined)
    replacePhoto({ kind: 'keep' })
  }

  // Prompt 32: send only what changed, then tell the whole app about the result.
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isSaving) return
    const problem = checkName(name)
    setNameError(problem)
    if (problem) {
      focusField('name')
      return
    }

    setIsSaving(true)
    try {
      const saved = await updateProfile({
        name: trimmedName !== user.name ? trimmedName : undefined,
        avatar: photo.kind === 'new' ? photo.file : undefined,
        removeAvatar: photo.kind === 'remove',
      })
      // The front desk now knows the new name/photo → NavBar, menus… all update together.
      updateUser(saved)
      // Start clean from what the SERVER saved (it may have tidied the name, resized the photo).
      setName(saved.name)
      replacePhoto({ kind: 'keep' })
      toast.success('Profile saved.')
    } catch (err) {
      const fields = err instanceof ApiError ? err.fieldErrors : {}
      if (fields.name || fields.avatar) {
        // The server rejected a specific box: show the message right there.
        setNameError(fields.name)
        setPhotoError(fields.avatar)
        if (fields.name) focusField('name')
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Could not save your profile.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  function focusField(field: string) {
    // Wait one frame: the box is disabled while saving and can't take focus until re-enabled.
    requestAnimationFrame(() =>
      (formRef.current?.elements.namedItem(field) as HTMLInputElement | null)?.focus(),
    )
  }

  return (
    <Container size="content" className="pb-16">
      <PageHeader title="Your profile" description="How you appear across Viora." />

      <form ref={formRef} onSubmit={onSubmit} noValidate>
        {/* Frozen while saving, so nothing can change mid-request. */}
        <fieldset disabled={isSaving} className="space-y-6">
          <legend className="sr-only">Edit your profile</legend>
          <section
            aria-labelledby="identity-heading"
            className="rounded-2xl border border-line bg-surface p-6"
          >
            <h2 id="identity-heading" className="text-title font-semibold">
              Channel identity
            </h2>
            <p className="mt-1 text-small text-fg-muted">
              Your name and photo appear on every video you upload and every comment you post.
            </p>

            {/* Photo */}
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Initials follow the name box live, so you see the result before saving. */}
              <Avatar name={trimmedName || user.name} src={shownPhoto} size="xl" decorative />
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {/* The real file input is hidden; this button opens it. */}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    aria-describedby={photoStatusId}
                  >
                    {shownPhoto ? 'Change photo' : 'Upload photo'}
                  </Button>
                  {shownPhoto && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => replacePhoto({ kind: 'remove' })}
                    >
                      Remove
                    </Button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={AVATAR_ACCEPT}
                    onChange={onPickFile}
                    hidden
                  />
                </div>
                {/* Always present, so screen readers announce each change ("not saved yet"). */}
                <p
                  id={photoStatusId}
                  role="status"
                  className={`text-caption ${photoError ? 'text-danger' : 'text-fg-muted'}`}
                >
                  {photoError ??
                    (photo.kind === 'new'
                      ? `“${photo.file.name}” selected — not saved yet.`
                      : photo.kind === 'remove'
                        ? 'Your photo will be removed when you save.'
                        : 'JPG, PNG or WebP, up to 2 MB.')}
                </p>
              </div>
            </div>

            {/* Display name */}
            <Input
              label="Display name"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              error={nameError}
              hint="Shown on your videos and comments."
              className="mt-6"
            />
          </section>

          <section
            aria-labelledby="account-heading"
            className="rounded-2xl border border-line bg-surface p-6"
          >
            <h2 id="account-heading" className="text-title font-semibold">
              Account
            </h2>
            {/* <dl>: a list of label → value pairs, read by screen readers as such. */}
            <dl className="mt-4 divide-y divide-line">
              <Detail label="Email">
                {user.email}
                <span className="block text-caption text-fg-subtle">
                  Changing your email needs a verification step, which isn’t part of this version.
                </span>
              </Detail>
              <Detail label="Account type">
                {user.role === 'admin' ? (
                  <Badge variant="accent">Admin</Badge>
                ) : (
                  <Badge>Member</Badge>
                )}
              </Detail>
              <Detail label="Member since">{formatDate(user.createdAt)}</Detail>
            </dl>
          </section>

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onCancel} disabled={!isDirty}>
              Cancel
            </Button>
            {/* Nothing changed → nothing to save. */}
            <Button type="submit" disabled={!isDirty} isLoading={isSaving}>
              Save changes
            </Button>
          </div>
        </fieldset>
      </form>
    </Container>
  )
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-small text-fg-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}
