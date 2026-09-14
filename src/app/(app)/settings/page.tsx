'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check, Database, Download, KeyRound, Lock, Palette, Settings2, ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Icon } from '@/lib/icons'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Page } from '@/components/layout/page'
import { useDownload } from '@/hooks/use-download'
import { ApiError, api } from '@/lib/api'
import { useSession } from '@/lib/session'
import { cn, titleCase } from '@/lib/utils'

const TABS = ['Profile', 'Localisation', 'Modules', 'Branding', 'Notifications', 'Data', 'Licence'] as const
type Tab = (typeof TABS)[number]

export default function SettingsPage() {
  const client = useQueryClient()
  const hydrate = useSession((state) => state.hydrate)
  const [tab, setTab] = useState<Tab>('Profile')

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<any>('/settings'),
  })

  const save = useMutation({
    mutationFn: ({ path, body, method = 'patch' }: { path: string; body: unknown; method?: 'patch' | 'put' }) =>
      method === 'put' ? api.put<any>(path, body) : api.patch<any>(path, body),
    onSuccess: () => {
      toast.success('Settings saved')
      void client.invalidateQueries({ queryKey: ['settings'] })
      void hydrate()
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not save settings'),
  })

  if (isLoading || !data) {
    return (
      <Page title="Settings">
        <div className="skeleton h-[400px] rounded-card" />
      </Page>
    )
  }

  const institution = data.institution

  return (
    <Page
      title="Settings"
      subtitle={`${institution.name} · ${institution.slug}`}
      actions={
        <Badge status={data.is_dedicated ? 'dedicated' : institution.status}>
          {data.is_dedicated ? 'Own deployment' : titleCase(institution.status)}
        </Badge>
      }
    >
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            aria-current={tab === name ? 'page' : undefined}
            className={cn(
              'rounded-pill px-4 py-2 text-[13.5px] font-semibold transition',
              tab === name ? 'bg-ink text-white' : 'bg-surface text-ink-soft shadow-card hover:bg-surface-sunken',
            )}
          >
            {name}
          </button>
        ))}
      </div>

      {tab === 'Profile' && (
        <Card>
          <CardHeader title="Institution details" subtitle="Shown on receipts, certificates and the portal" />
          <CardBody>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault()
                const form = new FormData(event.currentTarget)
                save.mutate({
                  path: '/settings/profile',
                  body: {
                    name: form.get('name'),
                    legal_name: form.get('legal_name'),
                    institution_type: form.get('institution_type'),
                    website: form.get('website'),
                    affiliation_board: form.get('affiliation_board'),
                    registration_number: form.get('registration_number'),
                    contact: { email: form.get('email'), phone: form.get('phone') },
                    address: {
                      line1: form.get('line1'),
                      city: form.get('city'),
                      state: form.get('state'),
                      postal_code: form.get('postal_code'),
                    },
                  },
                })
              }}
            >
              <Input name="name" label="Display name" defaultValue={institution.name} required />
              <Input name="legal_name" label="Legal name" defaultValue={institution.legal_name} />
              <Select
                name="institution_type"
                label="Type"
                defaultValue={institution.institution_type}
              >
                {['school', 'college', 'university', 'institute', 'coaching'].map((value) => (
                  <option key={value} value={value}>
                    {titleCase(value)}
                  </option>
                ))}
              </Select>
              <Input
                name="affiliation_board"
                label="Board / affiliation"
                defaultValue={institution.affiliation_board}
                placeholder="CBSE / ICSE / State / UGC"
              />
              <Input
                name="registration_number"
                label="Registration number"
                defaultValue={institution.registration_number}
              />
              <Input name="website" label="Website" defaultValue={institution.website} />
              <Input name="email" label="Email" type="email" defaultValue={institution.contact?.email} />
              <Input name="phone" label="Phone" type="tel" defaultValue={institution.contact?.phone} />
              <Input name="line1" label="Address" defaultValue={institution.address?.line1} containerClassName="sm:col-span-2" />
              <Input name="city" label="City" defaultValue={institution.address?.city} />
              <Input name="state" label="State" defaultValue={institution.address?.state} />
              <Input name="postal_code" label="PIN code" defaultValue={institution.address?.postal_code} />
              <div className="sm:col-span-2">
                <Button type="submit" loading={save.isPending}>
                  Save details
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {tab === 'Localisation' && (
        <Card>
          <CardHeader
            title="Localisation"
            subtitle="Affects dates, currency and where the academic year begins"
          />
          <CardBody>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault()
                const form = new FormData(event.currentTarget)
                save.mutate({
                  path: '/settings/localisation',
                  body: {
                    timezone: form.get('timezone'),
                    currency: form.get('currency'),
                    locale: form.get('locale'),
                    academic_year_start_month: Number(form.get('academic_year_start_month')),
                  },
                })
              }}
            >
              <Input name="timezone" label="Timezone" defaultValue={institution.timezone} />
              <Input name="currency" label="Currency" defaultValue={institution.currency} />
              <Input name="locale" label="Locale" defaultValue={institution.locale} />
              <Select
                name="academic_year_start_month"
                label="Academic year starts in"
                defaultValue={String(institution.academic_year_start_month ?? 4)}
              >
                {[
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December',
                ].map((month, index) => (
                  <option key={month} value={index + 1}>
                    {month}
                  </option>
                ))}
              </Select>
              <div className="sm:col-span-2">
                <Button type="submit" loading={save.isPending}>
                  Save localisation
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {tab === 'Modules' && <ModulesTab data={data} save={save} />}

      {tab === 'Branding' && (
        <Card>
          <CardHeader title="Branding" subtitle="Colours used across the portal" />
          <CardBody>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault()
                const form = new FormData(event.currentTarget)
                save.mutate({
                  path: '/settings/branding',
                  body: {
                    primary_color: form.get('primary_color'),
                    accent_color: form.get('accent_color'),
                    tagline: form.get('tagline'),
                  },
                })
              }}
            >
              <Input
                name="primary_color"
                label="Primary colour"
                type="color"
                defaultValue={institution.branding?.primary_color ?? '#111214'}
              />
              <Input
                name="accent_color"
                label="Accent colour"
                type="color"
                defaultValue={institution.branding?.accent_color ?? '#FAEE7C'}
              />
              <Textarea
                name="tagline"
                label="Tagline"
                defaultValue={institution.branding?.tagline}
                placeholder="Shown under the logo on the sign-in page"
              />
              <div className="sm:col-span-2">
                <Button type="submit" loading={save.isPending}>
                  <Palette className="h-4 w-4" aria-hidden />
                  Save branding
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {tab === 'Notifications' && <NotificationsTab />}

      {tab === 'Data' && <DataTab />}

      {tab === 'Licence' && <LicenceTab isDedicated={data.is_dedicated} />}
    </Page>
  )
}

function ModulesTab({ data, save }: { data: any; save: any }) {
  const [selected, setSelected] = useState<Set<string>>(
    () =>
      new Set(
        data.modules.flatMap((group: any) =>
          group.modules.filter((m: any) => m.enabled).map((m: any) => m.key),
        ),
      ),
  )

  function toggle(key: string, optional: boolean) {
    if (!optional) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <Card>
      <CardHeader
        title="Modules"
        subtitle={
          data.is_dedicated
            ? 'This deployment is yours — switch on anything you need.'
            : 'Your plan sets what is available. Switching something off hides it everywhere.'
        }
        action={
          data.can_manage_modules ? (
            <Button
              loading={save.isPending}
              onClick={() =>
                save.mutate({
                  path: '/settings/modules',
                  method: 'put',
                  body: { enabled_modules: [...selected] },
                })
              }
            >
              <Settings2 className="h-4 w-4" aria-hidden />
              Save modules
            </Button>
          ) : undefined
        }
      />
      <CardBody className="space-y-6 pt-2">
        {data.modules.map((group: any) => (
          <section key={group.group}>
            <h3 className="mb-3 text-[12px] font-bold uppercase tracking-wide text-muted">
              {group.group}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {group.modules.map((module: any) => {
                const on = selected.has(module.key) || !module.optional
                const available = data.is_dedicated || module.enabled || !module.optional
                return (
                  <button
                    key={module.key}
                    type="button"
                    disabled={!module.optional || !data.can_manage_modules || !available}
                    onClick={() => toggle(module.key, module.optional)}
                    className={cn(
                      'flex items-center gap-3 rounded-field border px-3.5 py-3 text-left transition',
                      on
                        ? 'border-ink/15 bg-surface-sunken'
                        : 'border-line bg-surface hover:border-ink/15',
                      (!module.optional || !available) && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-8 w-8 shrink-0 place-items-center rounded-[10px]',
                        on ? 'bg-ink text-white' : 'bg-surface-sunken text-muted',
                      )}
                    >
                      <Icon name={module.icon} className="h-4 w-4" strokeWidth={2} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-bold text-ink">
                        {module.label}
                      </span>
                      <span className="block text-[11.5px] text-muted">
                        {!module.optional
                          ? 'Always on'
                          : !available
                            ? 'Not in your plan'
                            : on
                              ? 'Enabled'
                              : 'Disabled'}
                      </span>
                    </span>
                    {on && <Check className="h-4 w-4 shrink-0 text-success" aria-hidden />}
                    {!available && module.optional && (
                      <Lock className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
                    )}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </CardBody>
    </Card>
  )
}

function NotificationsTab() {
  const { data } = useQuery({
    queryKey: ['broadcast-channels'],
    queryFn: () => api.get<any>('/broadcast/channels'),
  })

  if (!data) return <div className="skeleton h-64 rounded-card" />

  return (
    <Card>
      <CardHeader
        title="Delivery channels"
        subtitle="In-app always works. The rest need a provider — an unconfigured channel is skipped, never failed."
      />
      <CardBody className="pt-2">
        <ul className="space-y-2">
          {data.channels.map((channel: any) => (
            <li
              key={channel.channel}
              className="flex flex-wrap items-center gap-3 rounded-field border border-line px-3.5 py-3"
            >
              <span
                className={cn(
                  'grid h-9 w-9 shrink-0 place-items-center rounded-field',
                  channel.configured ? 'bg-mint' : 'bg-surface-sunken',
                )}
              >
                <Icon
                  name={
                    { in_app: 'bell', email: 'mail', sms: 'message-square',
                      push: 'smartphone', whatsapp: 'message-circle' }[
                      channel.channel as string
                    ] ?? 'bell'
                  }
                  className="h-4 w-4 text-ink"
                  strokeWidth={2}
                  aria-hidden
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold text-ink">{channel.label}</span>
                <span className="block truncate text-[12px] text-muted">{channel.detail}</span>
              </span>
              <Badge tone={channel.configured ? 'success' : 'neutral'}>
                {channel.configured ? 'Configured' : 'Not set up'}
              </Badge>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12.5px] text-muted">
          Currently sending on:{' '}
          <span className="font-semibold text-ink">
            {data.enabled_for_institution.map(titleCase).join(', ')}
          </span>
        </p>
      </CardBody>
    </Card>
  )
}

function DataTab() {
  const { download, pending } = useDownload()
  const { data } = useQuery({
    queryKey: ['export-summary'],
    queryFn: () => api.get<any>('/settings/export/summary'),
  })

  return (
    <Card>
      <CardHeader
        title="Export your data"
        subtitle="Every record this institution owns, in the shape the database holds it"
        action={
          <span className="grid h-10 w-10 place-items-center rounded-field bg-lilac">
            <Database className="h-5 w-5 text-ink" aria-hidden />
          </span>
        }
      />
      <CardBody className="pt-2">
        {!data ? (
          <div className="skeleton h-24" />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Collections" value={String(data.collections)} />
              <Field label="Documents" value={data.documents.toLocaleString('en-IN')} />
              <Field label="Format" value="Extended JSON" />
            </div>

            <p className="mt-4 text-[13px] leading-relaxed text-muted">
              Ids are preserved, so this loads into your own deployment unchanged —
              <code className="mx-1 rounded bg-surface-sunken px-1.5 py-0.5 text-[12px]">
                mongoimport --jsonArray
              </code>
              and it is done. Credentials and session tokens are stripped:{' '}
              {data.redacted_fields.join(', ')}.
            </p>

            <div className="mt-5">
              <Button
                loading={pending === '/settings/export'}
                onClick={() => download('/settings/export', 'export.zip')}
              >
                <Download className="h-4 w-4" aria-hidden />
                Download everything
              </Button>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  )
}

function LicenceTab({ isDedicated }: { isDedicated: boolean }) {
  const { data } = useQuery({
    queryKey: ['licence'],
    queryFn: () => api.get<any>('/settings/license'),
  })

  if (!data) return <div className="skeleton h-64 rounded-card" />

  return (
    <Card>
      <CardHeader
        title="Licence"
        subtitle={data.note}
        action={
          <span className="grid h-10 w-10 place-items-center rounded-field bg-mint">
            <ShieldCheck className="h-5 w-5 text-ink" aria-hidden />
          </span>
        }
      />
      <CardBody className="pt-2">
        <dl className="grid gap-3 sm:grid-cols-2">
          <Field label="Deployment" value={titleCase(data.deployment)} />
          <Field label="Plan" value={titleCase(data.plan_key || 'none')} />
          <Field label="Subscription" value={titleCase(data.subscription_status)} />
          <Field
            label="Valid till"
            value={data.subscription_valid_till ?? (isDedicated ? 'Perpetual' : '—')}
          />
        </dl>

        {data.license_key && (
          <div className="mt-4 rounded-field bg-ink px-4 py-4">
            <div className="flex items-center gap-2 text-white/50">
              <KeyRound className="h-3.5 w-3.5" aria-hidden />
              <span className="text-[11.5px] font-bold uppercase tracking-wide">Licence key</span>
            </div>
            <p className="tabular mt-1.5 select-all text-[16px] font-bold tracking-wide text-butter">
              {data.license_key}
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-white/50">
              Keep this safe. It identifies your deployment when you move onto your own server.
            </p>
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {Object.entries(data.limits as Record<string, number | null>).map(([key, value]) => (
            <Field
              key={key}
              label={titleCase(key.replace('max_', ''))}
              value={value === null ? 'Unlimited' : String(value)}
            />
          ))}
        </div>
      </CardBody>
    </Card>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-field bg-surface-sunken px-3.5 py-3">
      <dt className="text-[12px] font-semibold text-muted">{label}</dt>
      <dd className="tabular mt-0.5 text-[14px] font-bold text-ink">{value}</dd>
    </div>
  )
}
