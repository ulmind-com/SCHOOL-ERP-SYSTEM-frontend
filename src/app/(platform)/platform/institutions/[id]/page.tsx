'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, KeyRound, LogIn, Pause, Play, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog, Drawer } from '@/components/ui/drawer'
import { Input, Select, Textarea } from '@/components/ui/input'
import { ApiError, api, tokens } from '@/lib/api'
import { compactNumber, money, titleCase } from '@/lib/utils'

export default function InstitutionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const client = useQueryClient()
  const [changingPlan, setChangingPlan] = useState(false)
  const [converting, setConverting] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['platform-tenant', id],
    queryFn: () => api.get<any>(`/platform/tenants/${id}`),
  })
  const plans = useQuery({
    queryKey: ['platform-plans'],
    queryFn: () => api.get<any[]>('/platform/plans'),
  })

  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['platform-tenant', id] })
    void client.invalidateQueries({ queryKey: ['platform-tenants'] })
  }

  const setStatus = useMutation({
    mutationFn: (body: unknown) => api.post<any>(`/platform/tenants/${id}/status`, body),
    onSuccess: () => {
      toast.success('Status updated')
      refresh()
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Failed'),
  })

  const changePlan = useMutation({
    mutationFn: (body: unknown) => api.post<any>(`/platform/tenants/${id}/subscription`, body),
    onSuccess: () => {
      toast.success('Subscription updated')
      setChangingPlan(false)
      refresh()
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Failed'),
  })

  const convert = useMutation({
    mutationFn: () => api.post<any>(`/platform/tenants/${id}/convert-to-dedicated`),
    onSuccess: (result) => {
      toast.success(result.detail)
      setConverting(false)
      refresh()
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Failed'),
  })

  const impersonate = useMutation({
    mutationFn: (reason: string) =>
      api.post<any>(`/platform/tenants/${id}/impersonate`, { reason }),
    onSuccess: (result) => {
      // Swap the session for the support token and drop into their workspace.
      tokens.set(
        { access_token: result.access_token, refresh_token: '', token_type: 'bearer', expires_in: result.expires_in },
        result.institution.slug,
      )
      window.location.href = '/dashboard'
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Failed'),
  })

  if (isLoading || !data) {
    return <div className="h-64 animate-pulse rounded-card bg-white/5" />
  }

  const dedicated = data.deployment === 'dedicated'

  return (
    <div className="space-y-6">
      <Link
        href="/platform/institutions"
        className="inline-flex items-center gap-2 text-[13px] font-semibold text-white/50 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        All institutions
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-panel bg-white/10 text-[20px] font-extrabold text-white">
            {data.name?.[0] ?? '?'}
          </span>
          <div>
            <h1 className="text-[26px] font-extrabold tracking-tight text-white">{data.name}</h1>
            <p className="mt-1 text-[13.5px] text-white/45">
              {data.slug} · {titleCase(data.institution_type)} ·{' '}
              {data.created_at ? `since ${format(parseISO(data.created_at), 'MMM yyyy')}` : ''}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge status={data.status} />
              {dedicated ? <Badge tone="accent">Dedicated licence</Badge> : <Badge tone="info">Subscription</Badge>}
              <Badge tone="neutral">{titleCase(data.plan_key || 'no plan')}</Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!dedicated && (
            <Button variant="secondary" onClick={() => setChangingPlan(true)}>
              Change plan
            </Button>
          )}
          {data.status === 'suspended' ? (
            <Button onClick={() => setStatus.mutate({ status: 'active' })} loading={setStatus.isPending}>
              <Play className="h-4 w-4" aria-hidden />
              Restore access
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() => setStatus.mutate({ status: 'suspended', reason: 'Suspended from console' })}
              loading={setStatus.isPending}
            >
              <Pause className="h-4 w-4" aria-hidden />
              Suspend
            </Button>
          )}
          {!dedicated && (
            <Button variant="secondary" onClick={() => setConverting(true)}>
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Convert to dedicated
            </Button>
          )}
          {!dedicated && (
            <Button
              className="bg-white text-ink hover:bg-white/90"
              onClick={() => impersonate.mutate('Support session from the platform console')}
              loading={impersonate.isPending}
            >
              <LogIn className="h-4 w-4" aria-hidden />
              Open workspace
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Students" value={compactNumber(data.usage.students)} ceiling={data.limits?.max_students} />
        <Stat label="Staff" value={compactNumber(data.usage.staff)} ceiling={data.limits?.max_staff} />
        <Stat label="Users" value={compactNumber(data.usage.users)} ceiling={data.limits?.max_admin_users} />
        <Stat label="Storage" value={`${data.usage.storage_mb} MB`} ceiling={data.limits?.max_storage_mb} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-card bg-white/[0.04] p-6">
          <h2 className="text-[16px] font-bold text-white">Subscription</h2>
          <dl className="mt-4 space-y-2.5">
            <Row label="Plan" value={titleCase(data.plan_key || '—')} />
            <Row label="Status" value={titleCase(data.subscription_status ?? '—')} />
            <Row
              label="Valid till"
              value={
                data.subscription_valid_till
                  ? format(parseISO(data.subscription_valid_till), 'd MMM yyyy')
                  : dedicated
                    ? 'Perpetual'
                    : '—'
              }
            />
            <Row
              label="Amount"
              value={data.subscription?.amount ? money(data.subscription.amount) : '—'}
            />
            <Row label="Billing" value={titleCase(data.subscription?.billing_cycle ?? '—')} />
            <Row label="Modules" value={`${data.enabled_modules?.length ?? 0} enabled`} />
          </dl>
          {dedicated && data.license_key && (
            <div className="mt-4 rounded-field bg-butter/15 px-4 py-3">
              <p className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-butter">
                <KeyRound className="h-3.5 w-3.5" aria-hidden />
                Licence key
              </p>
              <p className="tabular mt-1 select-all text-[14px] font-bold text-white">
                {data.license_key}
              </p>
            </div>
          )}
        </section>

        <section className="rounded-card bg-white/[0.04] p-6">
          <h2 className="text-[16px] font-bold text-white">Owner &amp; contact</h2>
          <dl className="mt-4 space-y-2.5">
            <Row label="Owner" value={data.owner?.name ?? '—'} />
            <Row label="Email" value={data.owner?.email ?? '—'} />
            <Row
              label="Last sign-in"
              value={
                data.owner?.last_login_at
                  ? format(parseISO(data.owner.last_login_at), 'd MMM yyyy, h:mm a')
                  : 'Never'
              }
            />
            <Row label="Phone" value={data.contact?.phone || '—'} />
            <Row
              label="Location"
              value={[data.address?.city, data.address?.state].filter(Boolean).join(', ') || '—'}
            />
            <Row label="Classes" value={String(data.usage.classes ?? 0)} />
          </dl>
        </section>
      </div>

      <Drawer
        open={changingPlan}
        onClose={() => setChangingPlan(false)}
        title="Change subscription"
        subtitle="Updates the plan, its limits and which modules are unlocked"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            changePlan.mutate({
              plan_key: form.get('plan_key'),
              billing_cycle: form.get('billing_cycle'),
              amount: form.get('amount') ? Number(form.get('amount')) : null,
              valid_till: String(form.get('valid_till') ?? '') || null,
              payment_reference: form.get('payment_reference'),
              note: form.get('note'),
            })
          }}
        >
          <Select name="plan_key" label="Plan" required defaultValue={data.plan_key}>
            {(plans.data ?? []).map((plan: any) => (
              <option key={plan.key} value={plan.key}>
                {plan.name} — {money(plan.price_yearly)}/yr
              </option>
            ))}
          </Select>
          <Select name="billing_cycle" label="Billing cycle" defaultValue="yearly">
            {['monthly', 'yearly', 'lifetime'].map((value) => (
              <option key={value} value={value}>
                {titleCase(value)}
              </option>
            ))}
          </Select>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input name="amount" label="Amount" type="number" placeholder="Plan price" />
            <Input name="valid_till" label="Valid till" type="date" />
          </div>
          <Input name="payment_reference" label="Payment reference" placeholder="Invoice or transaction id" />
          <Textarea name="note" label="Note" />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setChangingPlan(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={changePlan.isPending}>
              Update subscription
            </Button>
          </div>
        </form>
      </Drawer>

      <ConfirmDialog
        open={converting}
        onClose={() => setConverting(false)}
        onConfirm={() => convert.mutate()}
        title="Convert to a dedicated licence?"
        message={`${data.name} keeps every record it already has, gains all 43 modules, and stops being limited by a plan. Their data can then be exported into their own deployment.`}
        confirmLabel="Convert"
        loading={convert.isPending}
      />
    </div>
  )
}

function Stat({ label, value, ceiling }: { label: string; value: string; ceiling?: number | null }) {
  return (
    <div className="rounded-card bg-white/[0.04] p-5">
      <p className="text-[12.5px] font-semibold text-white/45">{label}</p>
      <p className="tabular mt-1.5 text-[24px] font-extrabold text-white">{value}</p>
      <p className="mt-0.5 text-[12px] text-white/35">
        {ceiling ? `of ${compactNumber(ceiling)} allowed` : 'unlimited'}
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-2.5 last:border-0">
      <dt className="text-[12.5px] text-white/45">{label}</dt>
      <dd className="tabular truncate text-[13.5px] font-semibold text-white">{value}</dd>
    </div>
  )
}
