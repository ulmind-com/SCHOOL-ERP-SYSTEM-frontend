'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { Building2, Check, Copy, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Input, Select } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { ApiError, api } from '@/lib/api'
import { cn, compactNumber, titleCase } from '@/lib/utils'

export default function InstitutionsPage() {
  const client = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [deployment, setDeployment] = useState('')
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['platform-tenants', page, search, status, deployment],
    queryFn: () =>
      api.get<any>('/platform/tenants', { page, page_size: 25, search, status, deployment }),
  })

  const plans = useQuery({
    queryKey: ['platform-plans'],
    queryFn: () => api.get<any[]>('/platform/plans'),
  })

  const provision = useMutation({
    mutationFn: (body: unknown) => api.post<any>('/platform/tenants', body),
    onSuccess: (result) => {
      setCreated(result)
      void client.invalidateQueries({ queryKey: ['platform-tenants'] })
      void client.invalidateQueries({ queryKey: ['platform-metrics'] })
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not provision'),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-white">Institutions</h1>
          <p className="mt-1 text-[14px] text-white/50">
            {data ? `${data.meta.total} provisioned` : 'Every school, college and university'}
          </p>
        </div>
        <Button
          onClick={() => {
            setCreated(null)
            setCreating(true)
          }}
          className="bg-white text-ink hover:bg-white/90"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Provision institution
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search name, address or email"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            className="h-11 w-full rounded-pill border border-white/10 bg-white/[0.05] pl-11 pr-4
                       text-sm text-white outline-none transition placeholder:text-white/35
                       focus:border-white/25"
          />
        </div>
        <DarkSelect value={status} onChange={setStatus} label="Any status">
          {['trial', 'active', 'suspended', 'cancelled'].map((value) => (
            <option key={value} value={value}>
              {titleCase(value)}
            </option>
          ))}
        </DarkSelect>
        <DarkSelect value={deployment} onChange={setDeployment} label="Any deployment">
          <option value="saas">Subscription</option>
          <option value="dedicated">Dedicated</option>
        </DarkSelect>
      </div>

      <div className="overflow-hidden rounded-card bg-white/[0.04]">
        {isLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <div className="px-6 py-16 text-center">
            <Building2 className="mx-auto h-8 w-8 text-white/25" aria-hidden />
            <p className="mt-3 text-[14px] font-semibold text-white/70">No institutions match</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {['Institution', 'Plan', 'Deployment', 'Students', 'Staff', 'Valid till', 'Status'].map(
                    (header) => (
                      <th
                        key={header}
                        className="whitespace-nowrap px-5 py-3 text-left text-[11.5px] font-bold uppercase tracking-wide text-white/40"
                      >
                        {header}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {data.items.map((tenant: any) => (
                  <tr key={tenant.id} className="border-b border-white/[0.06] last:border-0">
                    <td className="px-5 py-3.5">
                      <Link href={`/platform/institutions/${tenant.id}`} className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-field bg-white/10 text-[13px] font-bold text-white">
                          {tenant.name?.[0] ?? '?'}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] font-bold text-white">
                            {tenant.name}
                          </span>
                          <span className="block truncate text-[12px] text-white/40">
                            {tenant.slug} · {titleCase(tenant.institution_type)}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-white/70">{titleCase(tenant.plan_key || '—')}</td>
                    <td className="px-5 py-3.5">
                      {tenant.deployment === 'dedicated' ? (
                        <Badge tone="accent">Dedicated</Badge>
                      ) : (
                        <span className="text-white/50">Subscription</span>
                      )}
                    </td>
                    <td className="tabular px-5 py-3.5 text-white/70">
                      {compactNumber(tenant.usage?.students ?? 0)}
                      {tenant.limits?.max_students ? (
                        <span className="text-white/30"> / {compactNumber(tenant.limits.max_students)}</span>
                      ) : null}
                    </td>
                    <td className="tabular px-5 py-3.5 text-white/70">{tenant.usage?.staff ?? 0}</td>
                    <td className="px-5 py-3.5 text-white/60">
                      {tenant.subscription_valid_till
                        ? format(parseISO(tenant.subscription_valid_till), 'd MMM yyyy')
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge status={tenant.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && (
          <div className="border-t border-white/10 [&_p]:text-white/50 [&_button]:text-white/60">
            <Pagination meta={data.meta} onChange={setPage} />
          </div>
        )}
      </div>

      <Drawer
        open={creating}
        onClose={() => {
          setCreating(false)
          setCreated(null)
        }}
        title="Provision an institution"
        subtitle="Creates the institution, its roles, its owner login and its first academic year"
        width="lg"
      >
        {created ? (
          <div className="space-y-4">
            <div className="rounded-card bg-mint p-5">
              <p className="text-[15px] font-extrabold text-ink">{created.detail}</p>
              <dl className="mt-4 space-y-2.5">
                <Credential label="Sign-in address" value={created.slug} />
                <Credential label="Owner email" value={created.owner_email} />
                <Credential label="Temporary password" value={created.owner_password} />
                {created.license_key && (
                  <Credential label="Licence key" value={created.license_key} />
                )}
              </dl>
              <p className="mt-4 text-[12.5px] leading-relaxed text-ink/60">
                Share these securely. The owner is asked to set their own password on first
                sign-in.
              </p>
            </div>
            <Button
              onClick={() => {
                setCreated(null)
                setCreating(false)
              }}
            >
              Done
            </Button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              provision.mutate({
                name: form.get('name'),
                slug: String(form.get('slug') ?? '') || null,
                institution_type: form.get('institution_type'),
                owner_email: form.get('owner_email'),
                owner_name: form.get('owner_name'),
                owner_password: String(form.get('owner_password') ?? '') || null,
                plan_key: form.get('plan_key'),
                deployment: form.get('deployment'),
                phone: form.get('phone'),
                city: form.get('city'),
                state: form.get('state'),
                academic_year_start_month: Number(form.get('academic_year_start_month')),
              })
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="name" label="Institution name" required placeholder="Greenfield Public School" />
              <Input
                name="slug"
                label="Sign-in address"
                placeholder="Auto-generated"
                hint="Lowercase letters, numbers and hyphens"
              />
              <Select name="institution_type" label="Type" defaultValue="school">
                {['school', 'college', 'university', 'institute', 'coaching'].map((value) => (
                  <option key={value} value={value}>
                    {titleCase(value)}
                  </option>
                ))}
              </Select>
              <Select
                name="deployment"
                label="Deployment"
                defaultValue="saas"
                hint="Dedicated unlocks every module and removes all plan limits"
              >
                <option value="saas">Subscription (shared)</option>
                <option value="dedicated">Dedicated (own licence)</option>
              </Select>
              <Select name="plan_key" label="Plan" defaultValue="trial">
                {(plans.data ?? []).map((plan: any) => (
                  <option key={plan.key} value={plan.key}>
                    {plan.name}
                  </option>
                ))}
              </Select>
              <Select name="academic_year_start_month" label="Academic year starts" defaultValue="4">
                {['January','February','March','April','May','June','July','August','September','October','November','December'].map(
                  (month, index) => (
                    <option key={month} value={index + 1}>
                      {month}
                    </option>
                  ),
                )}
              </Select>
            </div>

            <fieldset className="space-y-4">
              <legend className="text-[12px] font-bold uppercase tracking-wide text-muted">
                Owner account
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="owner_name" label="Owner name" placeholder="Anita Sen" />
                <Input name="owner_email" label="Owner email" type="email" required />
                <Input
                  name="owner_password"
                  label="Temporary password"
                  placeholder="Auto-generated"
                  hint="They must change it on first sign-in"
                />
                <Input name="phone" label="Phone" type="tel" />
                <Input name="city" label="City" />
                <Input name="state" label="State" />
              </div>
            </fieldset>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={provision.isPending}>
                Provision
              </Button>
            </div>
          </form>
        )}
      </Drawer>
    </div>
  )
}

function Credential({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center gap-3">
      <dt className="w-40 shrink-0 text-[12px] font-semibold text-ink/55">{label}</dt>
      <dd className="tabular min-w-0 flex-1 select-all truncate text-[13.5px] font-bold text-ink">
        {value}
      </dd>
      <button
        type="button"
        aria-label={`Copy ${label}`}
        onClick={() => {
          void navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink/50 transition hover:bg-ink/10 hover:text-ink"
      >
        {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      </button>
    </div>
  )
}

function DarkSelect({
  value,
  onChange,
  label,
  children,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  children: React.ReactNode
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        'h-11 min-w-[160px] rounded-pill border border-white/10 bg-white/[0.05] px-4',
        'text-sm text-white outline-none transition focus:border-white/25',
        '[&>option]:bg-ink [&>option]:text-white',
      )}
    >
      <option value="">{label}</option>
      {children}
    </select>
  )
}
