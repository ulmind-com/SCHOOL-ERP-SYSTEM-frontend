'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Building2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthShell } from '@/components/layout/auth-shell'
import { ApiError, api } from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [institution, setInstitution] = useState('')
  const [sent, setSent] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const deploymentMode = process.env.NEXT_PUBLIC_DEPLOYMENT_MODE ?? 'saas'

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await api.public.post<{ detail: string }>('/auth/forgot-password', {
        email,
        institution: institution || null,
      })
      // The API deliberately answers the same way whether or not the address
      // exists, so there is nothing here to leak.
      setSent(response.detail)
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

  if (sent) {
    return (
      <AuthShell>
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">Check your inbox</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-muted">{sent}</p>
        <p className="mt-3 text-[13px] text-muted">
          The link is good for one hour. If it does not arrive, check spam or ask your
          administrator to reset it for you.
        </p>
        <Link href="/login" className="mt-7 inline-block">
          <Button variant="secondary" size="lg">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to sign in
          </Button>
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <h1 className="text-[26px] font-extrabold tracking-tight text-ink">Reset your password</h1>
      <p className="mt-1.5 text-[14px] text-muted">
        We will email you a link to choose a new one.
      </p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <Input
          label="Email address"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@institution.edu"
          leading={<Mail className="h-4 w-4" aria-hidden />}
        />
        {deploymentMode === 'saas' && (
          <Input
            label="Institution"
            hint="Only needed if your email is registered at more than one."
            value={institution}
            onChange={(event) => setInstitution(event.target.value)}
            placeholder="greenfield-public-school"
            leading={<Building2 className="h-4 w-4" aria-hidden />}
          />
        )}

        {error && (
          <p
            role="alert"
            className="rounded-field bg-danger/8 px-3.5 py-2.5 text-[13px] font-medium text-danger"
          >
            {error}
          </p>
        )}

        <Button type="submit" size="lg" loading={loading} className="w-full">
          Send reset link
          {!loading && <ArrowRight className="h-4 w-4" aria-hidden />}
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-6 inline-block text-[13px] font-semibold text-ink-soft underline-offset-4 hover:underline"
      >
        Back to sign in
      </Link>
    </AuthShell>
  )
}
