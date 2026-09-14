'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Lock, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthShell } from '@/components/layout/auth-shell'
import { Loader } from '@/components/ui/loader'
import { ApiError, api, tokens } from '@/lib/api'
import { useSession } from '@/lib/session'
import type { LoginResponse } from '@/lib/types'

/** Where each kind of account belongs once it is through the door. */
const HOME_FOR: Record<string, string> = {
  student: '/portal/me',
  parent: '/portal/me',
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteScreen />
    </Suspense>
  )
}

/**
 * Where an invitation email lands.
 *
 * Deliberately not the sign-in box: someone arriving here has no password yet,
 * and "Welcome back" is the wrong thing to say to a parent opening their first
 * message from the school. It greets them by name, names the institution, and
 * asks for one thing.
 */
function AcceptInviteScreen() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') ?? ''
  const applyLogin = useSession((state) => state.applyLogin)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const invite = useQuery({
    queryKey: ['invite', token],
    enabled: Boolean(token),
    retry: false,
    queryFn: () => api.public.get<any>(`/auth/invite/${token}`),
  })

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const response = await api.public.post<LoginResponse>('/auth/accept-invite', {
        token,
        password,
      })
      await applyLogin(response)
      if (response.institution) tokens.setTenant(response.institution.slug)
      toast.success(`Welcome, ${response.user.full_name.split(' ')[0]}`)
      router.replace(HOME_FOR[response.user.portal] ?? '/dashboard')
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'We could not reach the server. Check your connection.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (!token) {
    return (
      <AuthShell>
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">Link incomplete</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-muted">
          This page needs the code from the email the school sent you. Open the link from your
          inbox, or ask the office to send it again.
        </p>
        <Link href="/login" className="mt-7 inline-block">
          <Button variant="secondary" size="lg">
            Go to sign in
          </Button>
        </Link>
      </AuthShell>
    )
  }

  if (invite.isLoading) {
    return (
      <AuthShell>
        <Loader message="Checking your invitation…" />
      </AuthShell>
    )
  }

  if (!invite.data?.valid) {
    return (
      <AuthShell>
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">
          This invitation has expired
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-muted">
          {invite.data?.detail ??
            'Invitations are good for seven days. Ask the school office to send a new one.'}
        </p>
        <Link href="/login" className="mt-7 inline-block">
          <Button variant="secondary" size="lg">
            Go to sign in
          </Button>
        </Link>
      </AuthShell>
    )
  }

  const { full_name: fullName, email, roles, institution } = invite.data
  const firstName = (fullName || '').split(' ')[0]

  return (
    <AuthShell>
      <h1 className="text-[26px] font-extrabold tracking-tight text-ink">
        {firstName ? `Welcome, ${firstName}` : 'Welcome'}
      </h1>
      <p className="mt-1.5 text-[14px] text-muted">
        {institution?.name
          ? `${institution.name} has set up your account.`
          : 'Your account has been set up.'}{' '}
        Choose a password and you are in.
      </p>

      <div className="mt-5 rounded-card bg-surface-sunken px-4 py-3.5">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">
          Signing in as
        </p>
        <p className="mt-0.5 text-[14.5px] font-bold text-ink">{fullName || email}</p>
        <p className="mt-0.5 text-[12.5px] text-muted">
          {email}
          {roles?.length ? ` · ${roles.join(', ')}` : ''}
        </p>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Input
          label="Choose a password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••••"
          leading={<Lock className="h-4 w-4" aria-hidden />}
          hint="At least ten characters."
        />
        <Input
          label="Type it again"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          placeholder="••••••••••"
          leading={<Lock className="h-4 w-4" aria-hidden />}
        />

        {error && (
          <p
            role="alert"
            className="rounded-field bg-danger/8 px-3.5 py-2.5 text-[13px] font-medium text-danger"
          >
            {error}
          </p>
        )}

        <Button type="submit" size="lg" loading={saving} className="w-full">
          Set password and continue
          {!saving && <ArrowRight className="h-4 w-4" aria-hidden />}
        </Button>
      </form>

      <p className="mt-5 flex items-start gap-2 text-[12.5px] text-muted">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Next time you can sign in with this email or the phone number the school has for you.
      </p>
    </AuthShell>
  )
}
