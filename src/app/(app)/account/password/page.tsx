'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Page } from '@/components/layout/page'
import { ApiError, api } from '@/lib/api'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/utils'

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={null}>
      <ChangePassword />
    </Suspense>
  )
}

/** Mirrors the server's rule set so the user sees the requirement before submitting. */
const RULES = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'One lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'One number', test: (v: string) => /\d/.test(v) },
]

function ChangePassword() {
  const router = useRouter()
  const params = useSearchParams()
  const first = params.get('first') === '1'
  const signOut = useSession((state) => state.signOut)

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const unmet = RULES.filter((rule) => !rule.test(next))
  const mismatch = confirm.length > 0 && confirm !== next
  const ready = current && next && !unmet.length && !mismatch

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/change-password', {
        current_password: current,
        new_password: next,
      })
      toast.success('Password updated. Sign in again with your new password.')
      // The API revokes every session on change, so the local tokens are stale.
      await signOut()
      router.replace('/login')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Page
      title={first ? 'Set your password' : 'Change password'}
      subtitle={
        first
          ? 'Your account was created with a temporary password. Choose your own to continue.'
          : 'You will be signed out of every device afterwards.'
      }
    >
      <div className="max-w-xl">
        <Card>
          <CardHeader
            title="Account security"
            subtitle="Choose something you have not used here before"
            action={
              <span className="grid h-10 w-10 place-items-center rounded-field bg-mint">
                <ShieldCheck className="h-5 w-5 text-ink" aria-hidden />
              </span>
            }
          />
          <CardBody>
            <form onSubmit={submit} className="space-y-4">
              <Input
                label={first ? 'Temporary password' : 'Current password'}
                type="password"
                autoComplete="current-password"
                required
                value={current}
                onChange={(event) => setCurrent(event.target.value)}
                leading={<Lock className="h-4 w-4" aria-hidden />}
              />
              <Input
                label="New password"
                type="password"
                autoComplete="new-password"
                required
                value={next}
                onChange={(event) => setNext(event.target.value)}
                leading={<Lock className="h-4 w-4" aria-hidden />}
              />
              <Input
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                error={mismatch ? 'Both passwords must match' : undefined}
                leading={<Lock className="h-4 w-4" aria-hidden />}
              />

              <ul className="grid gap-1.5 rounded-field bg-surface-sunken p-3.5 sm:grid-cols-2">
                {RULES.map((rule) => {
                  const met = rule.test(next)
                  return (
                    <li
                      key={rule.label}
                      className={cn(
                        'flex items-center gap-2 text-[12.5px] font-semibold transition',
                        met ? 'text-success' : 'text-muted',
                      )}
                    >
                      <span
                        className={cn(
                          'grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] text-white',
                          met ? 'bg-success' : 'bg-muted/40',
                        )}
                        aria-hidden
                      >
                        ✓
                      </span>
                      {rule.label}
                    </li>
                  )
                })}
              </ul>

              {error && (
                <p
                  role="alert"
                  className="rounded-field bg-danger/8 px-3.5 py-2.5 text-[13px] font-medium text-danger"
                >
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" loading={loading} disabled={!ready}>
                Update password
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </Page>
  )
}
