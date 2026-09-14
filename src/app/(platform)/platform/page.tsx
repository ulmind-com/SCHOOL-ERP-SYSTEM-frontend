'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { ArrowUpRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { cn, compactMoney, compactNumber, titleCase } from '@/lib/utils'

export default function PlatformOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ['platform-metrics'],
    queryFn: () => api.get<any>('/platform/metrics'),
  })

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-card bg-white/5" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-tight text-white">Overview</h1>
        <p className="mt-1 text-[14px] text-white/50">
          Every institution running on {process.env.NEXT_PUBLIC_APP_NAME ?? 'Scholarly'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Institutions"
          value={compactNumber(data.institutions_total)}
          caption={`${data.institutions_active} active · ${data.institutions_trial} on trial`}
          tone="butter"
        />
        <Metric
          label="Students"
          value={compactNumber(data.students_total)}
          caption={`${compactNumber(data.staff_total)} staff across all institutions`}
          tone="blush"
        />
        <Metric
          label="Annual run rate"
          value={compactMoney(data.arr)}
          caption={`${compactMoney(data.mrr)} monthly`}
          tone="lilac"
        />
        <Metric
          label="Dedicated licences"
          value={String(data.institutions_dedicated)}
          caption="Institutions running their own deployment"
          tone="mint"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-card bg-white/[0.04] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-white">Recent signups</h2>
            <Link
              href="/platform/institutions"
              className="text-[13px] font-semibold text-white/60 underline-offset-4 hover:text-white hover:underline"
            >
              All institutions
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-white/10">
            {data.recent_signups.map((tenant: any) => (
              <li key={tenant.id}>
                <Link
                  href={`/platform/institutions/${tenant.id}`}
                  className="flex items-center gap-3 py-3 transition hover:opacity-80"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-field bg-white/10 text-[13px] font-bold text-white">
                    {tenant.name?.[0] ?? '?'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-bold text-white">
                      {tenant.name}
                    </span>
                    <span className="block truncate text-[12px] text-white/40">
                      {tenant.slug} ·{' '}
                      {tenant.created_at ? format(parseISO(tenant.created_at), 'd MMM yyyy') : '—'}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge status={tenant.deployment === 'dedicated' ? 'dedicated' : tenant.status}>
                      {tenant.deployment === 'dedicated' ? 'Dedicated' : titleCase(tenant.status)}
                    </Badge>
                    <ArrowUpRight className="h-4 w-4 text-white/30" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-4">
          <Breakdown title="By plan" rows={data.by_plan.map((r: any) => ({ label: titleCase(r.plan_key), value: r.count }))} />
          <Breakdown title="By type" rows={data.by_type.map((r: any) => ({ label: titleCase(r.type), value: r.count }))} />
          {data.expiring_in_30_days > 0 && (
            <div className="rounded-card bg-warning/15 p-5">
              <p className="text-[13px] font-bold text-warning">Renewals due</p>
              <p className="tabular mt-1 text-[26px] font-extrabold text-white">
                {data.expiring_in_30_days}
              </p>
              <p className="mt-1 text-[12.5px] text-white/50">
                subscription(s) expire in the next 30 days
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  caption,
  tone,
}: {
  label: string
  value: string
  caption: string
  tone: 'butter' | 'blush' | 'lilac' | 'mint'
}) {
  const tones = {
    butter: 'bg-butter text-ink',
    blush: 'bg-blush text-ink',
    lilac: 'bg-lilac text-ink',
    mint: 'bg-mint text-ink',
  }
  return (
    <div className={cn('rounded-card p-5', tones[tone])}>
      <p className="text-[13.5px] font-bold">{label}</p>
      <p className="tabular mt-3 text-stat">{value}</p>
      <p className="mt-1.5 text-[12.5px] text-ink/55">{caption}</p>
    </div>
  )
}

function Breakdown({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <section className="rounded-card bg-white/[0.04] p-5">
      <h2 className="text-[15px] font-bold text-white">{title}</h2>
      <ul className="mt-3 space-y-2.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate text-[12.5px] font-semibold text-white/60">
              {row.label}
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-pill bg-white/10">
              <span
                className="block h-full rounded-pill bg-butter"
                style={{ width: `${(row.value / max) * 100}%` }}
              />
            </span>
            <span className="tabular w-7 shrink-0 text-right text-[12.5px] font-bold text-white">
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
