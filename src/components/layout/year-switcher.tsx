'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown, CalendarRange } from 'lucide-react'
import { tokens } from '@/lib/api'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/utils'

/**
 * Which academic year the office is looking at.
 *
 * Staff only, and it opens on the current year every session — an admin who
 * left it on 2024-25 and came back a week later would otherwise read an empty
 * school and reasonably conclude the data had gone.
 */
export function YearSwitcher() {
  const [open, setOpen] = useState(false)
  const client = useQueryClient()
  const institution = useSession((state) => state.institution)
  const hydrate = useSession((state) => state.hydrate)

  const years = institution?.academic_years ?? []
  if (!institution?.can_switch_academic_year || years.length < 2) return null

  const activeId = institution.active_academic_year_id
  const active =
    years.find((year) => year.id === activeId) ?? years.find((y) => y.is_current)
  const isCurrent = Boolean(active?.is_current)

  const choose = async (id: string, current: boolean) => {
    tokens.setYear(current ? null : id)
    setOpen(false)
    // Everything on screen was fetched for the old year. Refetch only what is
    // mounted rather than every cached key — firing twenty requests at once is
    // how one of them gets its connection dropped.
    await hydrate()
    await client.invalidateQueries({ refetchType: 'active' })
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Academic year"
        className={cn(
          'flex h-11 items-center gap-2 rounded-pill px-3.5 text-[13px] font-bold shadow-card transition',
          isCurrent
            ? 'bg-surface text-ink hover:bg-surface-sunken'
            : 'bg-butter text-ink hover:bg-butter/80',
        )}
      >
        <CalendarRange className="h-4 w-4 shrink-0" aria-hidden />
        <span className="tabular">{active?.name ?? 'Year'}</span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 transition', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-2 w-60 animate-fade-up rounded-card bg-surface p-2 shadow-pop"
          >
            <p className="px-3 pb-2 pt-1 text-[11.5px] font-bold uppercase tracking-wide text-muted">
              Academic year
            </p>
            {years.map((year) => (
              <button
                key={year.id}
                type="button"
                role="menuitem"
                onClick={() => void choose(year.id, year.is_current)}
                className="flex w-full items-center gap-2 rounded-field px-3 py-2.5 text-left text-[13.5px] font-semibold text-ink-soft transition hover:bg-surface-sunken hover:text-ink"
              >
                <Check
                  className={cn(
                    'h-4 w-4 shrink-0',
                    year.id === active?.id ? 'opacity-100' : 'opacity-0',
                  )}
                  aria-hidden
                />
                <span className="tabular flex-1">{year.name}</span>
                {year.is_current && (
                  <span className="rounded-pill bg-mint px-2 py-0.5 text-[11px] font-bold text-ink">
                    current
                  </span>
                )}
              </button>
            ))}
            {!isCurrent && (
              <p className="border-t border-line px-3 pb-1 pt-2.5 text-[12px] text-muted">
                You are reading a past year. New records are still written into{' '}
                {years.find((y) => y.is_current)?.name ?? 'the current year'}.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
