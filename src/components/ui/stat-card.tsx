'use client'

import Link from 'next/link'
import { ArrowRight, MoreHorizontal, TrendingDown, TrendingUp } from 'lucide-react'
import { Icon } from '@/lib/icons'
import { cn } from '@/lib/utils'

type Tone = 'butter' | 'blush' | 'lilac' | 'mint' | 'sky' | 'plain'

const TONES: Record<Tone, string> = {
  butter: 'bg-butter',
  blush: 'bg-blush',
  lilac: 'bg-lilac',
  mint: 'bg-mint',
  sky: 'bg-sky',
  plain: 'bg-surface',
}

/**
 * The pastel headline tile from the reference: big number, a delta chip, and a
 * "See Details" pill that only renders when there is somewhere to go.
 */
export function StatCard({
  label,
  value,
  caption,
  icon,
  tone = 'plain',
  delta,
  href,
  className,
}: {
  label: string
  value: React.ReactNode
  caption?: string
  icon?: string
  tone?: Tone
  delta?: { value: number; direction?: 'up' | 'down' }
  href?: string
  className?: string
}) {
  const direction = delta?.direction ?? (Number(delta?.value) >= 0 ? 'up' : 'down')
  const DeltaIcon = direction === 'up' ? TrendingUp : TrendingDown

  return (
    <div
      className={cn(
        'relative flex min-h-[160px] flex-col justify-between rounded-card p-5 shadow-card',
        TONES[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          {icon && (
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-ink/[0.08]">
              <Icon name={icon} className="h-4 w-4 text-ink" strokeWidth={2.2} />
            </span>
          )}
          <span className="text-[15px] font-bold text-ink">{label}</span>
        </div>
        <MoreHorizontal className="h-4 w-4 shrink-0 text-ink/35" aria-hidden />
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="tabular text-stat text-ink">{value}</span>
            {delta && (
              <span
                className={cn(
                  'chip bg-white/70 tabular',
                  direction === 'up' ? 'text-success' : 'text-danger',
                )}
              >
                <DeltaIcon className="h-3 w-3" aria-hidden />
                {Math.abs(delta.value).toFixed(0)}%
              </span>
            )}
          </div>
          {caption && <p className="mt-1.5 truncate text-[13px] text-ink/55">{caption}</p>}
        </div>

        {href && (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-white px-3.5 py-2
                       text-[13px] font-semibold text-ink shadow-sm transition hover:bg-white/80"
          >
            See Details
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  )
}
