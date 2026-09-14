'use client'

import { useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { cn, money } from '@/lib/utils'

export default function PlansPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['platform-plans'],
    queryFn: () => api.get<any[]>('/platform/plans'),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-tight text-white">Plans</h1>
        <p className="mt-1 text-[14px] text-white/50">
          What each price point unlocks. Editing a plan changes it for every institution on it.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-card bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(data ?? []).map((plan) => {
            const lifetime = plan.key === 'lifetime'
            return (
              <section
                key={plan.key}
                className={cn(
                  'flex flex-col rounded-card p-6',
                  lifetime ? 'bg-butter text-ink' : 'bg-white/[0.04] text-white',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-[19px] font-extrabold">{plan.name}</h2>
                  {!plan.is_public && <Badge tone="neutral">Internal</Badge>}
                </div>
                <p className={cn('mt-1.5 min-h-[40px] text-[13px] leading-relaxed', lifetime ? 'text-ink/60' : 'text-white/45')}>
                  {plan.description}
                </p>

                <p className="tabular mt-4 text-[30px] font-extrabold leading-none">
                  {lifetime
                    ? money(plan.price_lifetime ?? 0)
                    : plan.price_yearly
                      ? money(plan.price_yearly)
                      : 'Custom'}
                  {!lifetime && plan.price_yearly ? (
                    <span className={cn('text-[13px] font-semibold', lifetime ? 'text-ink/50' : 'text-white/40')}>
                      {' '}/ year
                    </span>
                  ) : null}
                </p>

                <ul className="mt-5 flex-1 space-y-2">
                  {(plan.highlights ?? []).map((highlight: string) => (
                    <li key={highlight} className="flex items-start gap-2 text-[13px]">
                      <Check
                        className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', lifetime ? 'text-ink' : 'text-butter')}
                        aria-hidden
                      />
                      <span className={lifetime ? 'text-ink/75' : 'text-white/65'}>{highlight}</span>
                    </li>
                  ))}
                </ul>

                <dl
                  className={cn(
                    'mt-5 grid grid-cols-2 gap-2 border-t pt-4 text-[12px]',
                    lifetime ? 'border-ink/15' : 'border-white/10',
                  )}
                >
                  <Limit label="Students" value={plan.limits?.max_students} lifetime={lifetime} />
                  <Limit label="Staff" value={plan.limits?.max_staff} lifetime={lifetime} />
                  <Limit label="Logins" value={plan.limits?.max_admin_users} lifetime={lifetime} />
                  <div>
                    <dt className={lifetime ? 'text-ink/50' : 'text-white/40'}>Modules</dt>
                    <dd className="tabular font-bold">{plan.included_modules?.length ?? 0}</dd>
                  </div>
                </dl>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Limit({
  label,
  value,
  lifetime,
}: {
  label: string
  value?: number | null
  lifetime: boolean
}) {
  return (
    <div>
      <dt className={lifetime ? 'text-ink/50' : 'text-white/40'}>{label}</dt>
      <dd className="tabular font-bold">{value ? value.toLocaleString('en-IN') : 'Unlimited'}</dd>
    </div>
  )
}
