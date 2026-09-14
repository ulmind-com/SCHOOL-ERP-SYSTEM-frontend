'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Building2, Lock, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/layout/logo'
import { ApiError, api, tokens } from '@/lib/api'
import { useSession } from '@/lib/session'
import type { InstitutionChoice, LoginResponse } from '@/lib/types'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  )
}

function LoginScreen() {
  const router = useRouter()
  const params = useSearchParams()
  const applyLogin = useSession((state) => state.applyLogin)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [institution, setInstitution] = useState<string | null>(null)
  const [choices, setChoices] = useState<InstitutionChoice[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [platformMode, setPlatformMode] = useState(false)

  const deploymentMode = process.env.NEXT_PUBLIC_DEPLOYMENT_MODE ?? 'saas'

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const path = platformMode ? '/auth/platform/login' : '/auth/login'
      const response = await api.public.post<LoginResponse>(path, {
        email,
        password,
        institution,
      })
      await applyLogin(response)
      if (response.institution) tokens.setTenant(response.institution.slug)
      const next = params.get('next')
      const home = platformMode ? '/platform' : next || '/dashboard'
      router.replace(response.must_change_password ? '/account/password?first=1' : home)
    } catch (caught) {
      if (caught instanceof ApiError) {
        // The API returns 409 with the list when one email belongs to several
        // institutions — ask which, rather than guessing.
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
      <Shell>
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">
          Which institution?
        </h1>
        <p className="mt-1.5 text-[14px] text-muted">
          {email} has an account at more than one.
        </p>
        <ul className="mt-6 space-y-2">
          {choices.map((choice) => (
            <li key={choice.slug}>
              <button
                type="button"
                onClick={() => {
                  setInstitution(choice.slug)
                  setChoices([])
                  toast.message(`Signing in to ${choice.name}`)
                }}
                className="flex w-full items-center gap-3 rounded-card border border-line bg-surface
                           p-4 text-left transition hover:border-ink/20 hover:bg-surface-sunken"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-field bg-lilac">
                  <Building2 className="h-5 w-5 text-ink" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold text-ink">
                    {choice.name}
                  </span>
                  <span className="block truncate text-[12.5px] capitalize text-muted">
                    {choice.institution_type}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setChoices([])}
          className="mt-5 text-[13px] font-semibold text-muted underline-offset-4 hover:underline"
        >
          Use a different email
        </button>
      </Shell>
    )
  }

  return (
    <Shell>
      <h1 className="text-[26px] font-extrabold tracking-tight text-ink">
        {platformMode ? 'Platform console' : 'Welcome back'}
      </h1>
      <p className="mt-1.5 text-[14px] text-muted">
        {platformMode
          ? 'Sign in to manage institutions, plans and subscriptions.'
          : 'Sign in to your institution workspace.'}
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

        {!platformMode && deploymentMode === 'saas' && (
          <Input
            label="Institution"
            hint="Leave blank unless your email is registered at more than one."
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

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[13px]">
        <Link
          href="/forgot-password"
          className="font-semibold text-ink-soft underline-offset-4 hover:underline"
        >
          Forgot password?
        </Link>
        {deploymentMode === 'saas' && (
          <button
            type="button"
            onClick={() => {
              setPlatformMode((mode) => !mode)
              setError('')
            }}
            className="font-semibold text-muted underline-offset-4 hover:underline"
          >
            {platformMode ? 'Institution sign-in' : 'Platform sign-in'}
          </button>
        )}
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,520px)]">
      {/* Marketing panel — hidden on small screens where it would just push the form down. */}
      <div className="relative hidden overflow-hidden bg-ink p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-2.5 text-white">
          <Logo className="text-butter" size={28} />
          <span className="text-[19px] font-extrabold tracking-tight">
            {process.env.NEXT_PUBLIC_APP_NAME ?? 'Scholarly'}
          </span>
        </div>

        <div className="relative z-10 max-w-lg">
          <h2 className="text-[40px] font-extrabold leading-[1.08] tracking-tight text-white">
            One system for the whole institution.
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-white/70">
            Admissions, attendance, examinations, fees, payroll and parent
            communication — for schools, colleges and universities.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              'Run it as a subscription, or own your deployment outright',
              'Every module gated by role, so people see only their work',
              'Built for Indian fee books, boards and academic calendars',
            ].map((line) => (
              <li key={line} className="flex items-start gap-3 text-[14px] text-white/80">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-butter" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-[12.5px] text-white/40">
          © {new Date().getFullYear()} {process.env.NEXT_PUBLIC_APP_NAME ?? 'Scholarly'}
        </p>

        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-1/3 h-[420px] w-[420px] rounded-full bg-butter/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 left-10 h-[320px] w-[320px] rounded-full bg-lilac/10 blur-3xl"
        />
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className={cn('w-full max-w-[400px]')}>
          <div className="mb-8 lg:hidden">
            <Logo className="text-ink" size={32} />
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
