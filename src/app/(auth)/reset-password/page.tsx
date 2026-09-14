'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthShell } from '@/components/layout/auth-shell'
import { ApiError, api } from '@/lib/api'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordScreen />
    </Suspense>
  )
}

function ResetPasswordScreen() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await api.public.post('/auth/reset-password', { token, new_password: password })
      toast.success('Password set — sign in with it now')
      router.replace('/login')
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'We could not reach the server. Check your connection.',
      )
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <AuthShell>
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">Link incomplete</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-muted">
          This page needs the token from the email we sent. Open the link from your inbox, or
          request a new one.
        </p>
        <Link href="/forgot-password" className="mt-7 inline-block">
          <Button variant="secondary" size="lg">
            Request a new link
          </Button>
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <h1 className="text-[26px] font-extrabold tracking-tight text-ink">Choose a new password</h1>
      <p className="mt-1.5 text-[14px] text-muted">
        At least ten characters. Everywhere you are signed in will be signed out.
      </p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••••"
          leading={<Lock className="h-4 w-4" aria-hidden />}
        />
        <Input
          label="Confirm new password"
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

        <Button type="submit" size="lg" loading={loading} className="w-full">
          Set password
          {!loading && <ArrowRight className="h-4 w-4" aria-hidden />}
        </Button>
      </form>
    </AuthShell>
  )
}
