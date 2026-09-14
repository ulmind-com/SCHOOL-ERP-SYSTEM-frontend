'use client'

import { useEffect, useMemo, useRef } from 'react'
import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns'
import { cn } from '@/lib/utils'

type Day = { date: string; status: string; remark?: string }

const TONES: Record<string, { cell: string; label: string }> = {
  present: { cell: 'bg-success', label: 'Present' },
  absent: { cell: 'bg-danger', label: 'Absent' },
  late: { cell: 'bg-warning', label: 'Late' },
  leave: { cell: 'bg-info', label: 'Leave' },
  half_day: { cell: 'bg-ink', label: 'Half day' },
  holiday: { cell: 'bg-line', label: 'Holiday' },
}

const WEEKDAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', '']

/**
 * A year of attendance at a glance.
 *
 * A percentage tells you there is a problem; this tells you it is every Monday.
 * Weeks run down the columns the way a wall planner does, so a pattern shows up
 * as a horizontal band rather than something you have to count out.
 */
export function AttendanceCalendar({ days, maxWeeks = 53 }: { days: Day[]; maxWeeks?: number }) {
  const scroller = useRef<HTMLDivElement>(null)

  const { columns, months } = useMemo(() => {
    const byDate = new Map(days.map((d) => [d.date, d]))
    // Anchor on the most recent marked day rather than today, so a register
    // that stopped in March does not render as a wall of empty squares.
    const last = days.length ? parseISO(days[days.length - 1].date) : new Date()
    const end = startOfWeek(last, { weekStartsOn: 1 })

    // Size the window to the data, so a school four weeks into term does not
    // get a year of empty squares — but never more than a year, and never so
    // few that the shape of a term is lost.
    const first = days.length ? parseISO(days[0].date) : last
    const span = Math.ceil((differenceInCalendarDays(end, startOfWeek(first, { weekStartsOn: 1 })) + 1) / 7)
    const weeks = Math.min(maxWeeks, Math.max(12, span))
    const start = addDays(end, -7 * (weeks - 1))

    const columns: (Day | null)[][] = []
    const months: { index: number; label: string }[] = []
    let lastMonth = ''

    for (let week = 0; week < weeks; week += 1) {
      const column: (Day | null)[] = []
      for (let weekday = 0; weekday < 7; weekday += 1) {
        const day = addDays(start, week * 7 + weekday)
        if (differenceInCalendarDays(day, last) > 0) {
          column.push(null)
          continue
        }
        const key = format(day, 'yyyy-MM-dd')
        column.push(byDate.get(key) ?? { date: key, status: '' })
      }
      const monthLabel = format(addDays(start, week * 7), 'MMM')
      if (monthLabel !== lastMonth) {
        months.push({ index: week, label: monthLabel })
        lastMonth = monthLabel
      }
      columns.push(column)
    }
    return { columns, months }
  }, [days, maxWeeks])

  // The interesting end is the recent one, so start scrolled to it.
  useEffect(() => {
    const element = scroller.current
    if (element) element.scrollLeft = element.scrollWidth
  }, [columns])

  const present = days.filter((d) => ['present', 'late', 'half_day'].includes(d.status)).length

  return (
    <div className="space-y-3">
      <div ref={scroller} className="overflow-x-auto pb-1">
        <div className="inline-block min-w-full">
          <div className="flex gap-[3px] pl-8 text-[11px] font-semibold text-muted">
            {columns.map((_, week) => {
              const month = months.find((m) => m.index === week)
              return (
                <span key={week} className="w-[11px] shrink-0">
                  {month ? <span className="relative -left-px block w-8">{month.label}</span> : null}
                </span>
              )
            })}
          </div>

          <div className="mt-1 flex gap-[3px]">
            <div className="flex w-8 shrink-0 flex-col gap-[3px] text-[10px] font-semibold text-muted">
              {WEEKDAY_LABELS.map((label, index) => (
                <span key={index} className="flex h-[11px] items-center leading-none">
                  {label}
                </span>
              ))}
            </div>
            {columns.map((column, week) => (
              <div key={week} className="flex shrink-0 flex-col gap-[3px]">
                {column.map((day, weekday) => (
                  <span
                    key={weekday}
                    title={
                      day
                        ? `${format(parseISO(day.date), 'd MMM yyyy')} — ${
                            TONES[day.status]?.label ?? 'Not marked'
                          }${day.remark ? ` · ${day.remark}` : ''}`
                        : undefined
                    }
                    className={cn(
                      'h-[11px] w-[11px] rounded-[3px]',
                      !day && 'bg-transparent',
                      day && (TONES[day.status]?.cell ?? 'bg-surface-sunken'),
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-muted">
        <span className="font-semibold text-ink-soft">
          {present} of {days.length} day{days.length === 1 ? '' : 's'} attended
        </span>
        {Object.entries(TONES).map(([key, tone]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={cn('h-[10px] w-[10px] rounded-[3px]', tone.cell)} aria-hidden />
            {tone.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="h-[10px] w-[10px] rounded-[3px] bg-surface-sunken" aria-hidden />
          Not marked
        </span>
      </div>
    </div>
  )
}
