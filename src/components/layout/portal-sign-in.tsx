'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Building2, Lock, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthShell } from '@/components/layout/auth-shell'
import { ApiError, api, tokens } from '@/lib/api'
import { useSession } from '@/lib/session'
import type { InstitutionChoice, LoginResponse } from '@/lib/types'

export interface PortalCopy {
  heading: string
  intro: string
  /** What to call the identifier, in their words. */
  identifierLabel: string
  identifierHint: string
  /** Where this kind of account belongs once it is through the door. */
  home: string
  /** Shown under the form — what they will find inside. */
  bullets: string[]
}

/**
 * A sign-in door per audience.
 *
 * One set of credentials and one endpoint behind them — the role still decides
 * what anyone sees. What changes is the wording: a parent arriving at "Welcome
 * back · Sign in to your institution workspace" has no idea they are in the
 * right place, and a school can hand out a link that plainly says so.
 */
export function PortalSignIn({ copy }: { copy: PortalCopy }) {
  return (
    <Suspense fallback={null}>
      <PortalSignInForm copy={copy} />
    </Suspense>
  )
}

function PortalSignInForm({ copy }: { copy: PortalCopy }) {
  const router = useRouter()
  const params = useSearchParams()
  const applyLogin = useSession((state) => state.applyLogin)

  const [identifier, setIdentifier] = useState(() => params.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [institution, setInstitution] = useState<string | null>(null)
  const [choices, setChoices] = useState<InstitutionChoice[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const deploymentMode = process.env.NEXT_PUBLIC_DEPLOYMENT_MODE ?? 'saas'

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await api.public.post<LoginResponse>('/auth/login', {
        email: identifier,
        password,
        institution,
      })
      await applyLogin(response)
      if (response.institution) tokens.setTenant(response.institution.slug)
      router.replace(
        response.must_change_password
          ? '/account/password?first=1'
          : params.get('next') || copy.home,
      )
    } catch (caught) {
      if (caught instanceof ApiError) {
        if (caught.status === 409 && caught.meta.institutions) {
          setChoices(caught.meta.institutions as InstitutionChoice[])
          setError('')
        } else {
          setError(caught.message)
        }
      } else {
        setError('We could not reach the server. Check your connection.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (choices.length > 0) {
    return (
      <AuthShell>
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">Which institution?</h1>
        <p className="mt-1.5 text-[14px] text-muted">
          That account exists at more than one.
        </p>
        <ul className="mt-6 space-y-2">
          {choices.map((choice) => (
            <li key={choice.slug}>
              <button
                type="button"
                onClick={() => {
                  setInstitution(choice.slug)
                  setChoices([])
                }}
                className="flex w-full items-center gap-3 rounded-card border border-line bg-surface
                           p-4 text-left transition hover:border-ink/20 hover:bg-surface-sunken"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-field bg-lilac">
                  <Building2 className="h-5 w-5 text-ink" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-ink">
                  {choice.name}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <h1 className="text-[26px] font-extrabold tracking-tight text-ink">{copy.heading}</h1>
      <p className="mt-1.5 text-[14px] text-muted">{copy.intro}</p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <Input
          label={copy.identifierLabel}
          autoComplete="username"
          required
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="you@example.com or 98765 43210"
          hint={copy.identifierHint}
          leading={<Mail className="h-4 w-4" aria-hidden />}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          leading={<Lock className="h-4 w-4" aria-hidden />}
        />
        {deploymentMode === 'saas' && (
          <Input
            label="School or college"
            hint="Only needed if you are registered at more than one."
            value={institution ?? ''}
            onChange={(event) => setInstitution(event.target.value || null)}
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
          Sign in
          {!loading && <ArrowRight className="h-4 w-4" aria-hidden />}
        </Button>
      </form>

      <ul className="mt-6 space-y-1.5">
        {copy.bullets.map((line) => (
          <li key={line} className="flex items-start gap-2 text-[13px] text-muted">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-butter" aria-hidden />
            {line}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[13px]">
        <Link
          href="/forgot-password"
          className="font-semibold text-ink-soft underline-offset-4 hover:underline"
        >
          Forgot password?
        </Link>
        <Link
          href="/login"
          className="font-semibold text-muted underline-offset-4 hover:underline"
        >
          Institution sign-in
        </Link>
      </div>
    </AuthShell>
  )
}
