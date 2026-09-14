'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { cn, money, titleCase } from '@/lib/utils'

export default function SubscriptionsPage() {
  const [expiring, setExpiring] = useState<number | ''>('')
  const [status, setStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['platform-subscriptions', status, expiring],
    queryFn: () =>
      api.get<any[]>('/platform/subscriptions', {
        status,
        expiring_days: expiring === '' ? undefined : expiring,
      }),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-white">Subscriptions</h1>
          <p className="mt-1 text-[14px] text-white/50">
            {data ? `${data.length} subscription records` : 'Renewals and billing cycles'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'All', value: '' as const },
            { label: 'Next 7 days', value: 7 },
            { label: 'Next 30 days', value: 30 },
            { label: 'Next 90 days', value: 90 },
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => setExpiring(option.value)}
              className={cn(
                'rounded-pill px-3.5 py-2 text-[13px] font-semibold transition',
                expiring === option.value
                  ? 'bg-white text-ink'
                  : 'bg-white/[0.06] text-white/60 hover:text-white',
              )}
            >
              {option.label}
            </button>
          ))}
          <select
            aria-label="Status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 rounded-pill border border-white/10 bg-white/[0.05] px-4 text-[13px]
                       text-white outline-none [&>option]:bg-ink"
          >
            <option value="">Any status</option>
            {['trialing', 'active', 'past_due', 'expired', 'cancelled', 'lifetime'].map((value) => (
              <option key={value} value={value}>
                {titleCase(value)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-card bg-white/[0.04]">
        {isLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        ) : !data?.length ? (
          <p className="px-6 py-16 text-center text-[14px] text-white/50">
            No subscriptions match that filter.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {['Institution', 'Plan', 'Cycle', 'Amount', 'Renews', 'Status'].map((header) => (
                    <th
                      key={header}
                      className="whitespace-nowrap px-5 py-3 text-left text-[11.5px] font-bold uppercase tracking-wide text-white/40"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row: any) => {
                  const end = row.current_period_end ? parseISO(row.current_period_end) : null
                  const days = end ? differenceInCalendarDays(end, new Date()) : null
                  return (
                    <tr key={row.id} className="border-b border-white/[0.06] last:border-0">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/platform/institutions/${row.institution.id}`}
                          className="block min-w-0"
                        >
                          <span className="block truncate text-[14px] font-bold text-white">
                            {row.institution.name}
                          </span>
                          <span className="block truncate text-[12px] text-white/40">
                            {row.institution.slug}
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-white/70">{titleCase(row.plan_key)}</td>
                      <td className="px-5 py-3.5 text-white/60">{titleCase(row.billing_cycle)}</td>
                      <td className="tabular px-5 py-3.5 text-white/80">{money(row.amount)}</td>
                      <td className="px-5 py-3.5">
                        {end ? (
                          <span className="text-white/70">
                            {format(end, 'd MMM yyyy')}
                            {days !== null && days <= 30 && days >= 0 && (
                              <span className="ml-2 text-[12px] font-semibold text-warning">
                                in {days}d
                              </span>
                            )}
                            {days !== null && days < 0 && (
                              <span className="ml-2 text-[12px] font-semibold text-danger">
                                overdue
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-white/40">Perpetual</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge status={row.status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
