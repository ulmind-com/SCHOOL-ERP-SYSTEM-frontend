'use client'

import { useEffect, useMemo, useRef } from 'react'
import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns'
import { cn } from '@/lib/utils'

type Day = { date: string; status: string; remark?: string }

const TONES: { key: string; cell: string; label: string }[] = [
  { key: 'present', cell: 'bg-success', label: 'Present' },
  { key: 'absent', cell: 'bg-danger', label: 'Absent' },
  { key: 'late', cell: 'bg-warning', label: 'Late' },
  { key: 'half_day', cell: 'bg-ink', label: 'Half day' },
  { key: 'leave', cell: 'bg-info', label: 'Leave' },
  // A holiday is neither attended nor missed, so it gets a colour of its own —
  // distinct from "not marked", which is a day nobody got round to.
  { key: 'holiday', cell: 'bg-lilac', label: 'Holiday' },
]
const TONE_BY_KEY = new Map(TONES.map((t) => [t.key, t]))

const CELL = 15
const GAP = 4
const STEP = CELL + GAP
const GUTTER = 34
const WEEKDAYS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun']

/**
 * A year of attendance at a glance.
 *
 * A percentage tells you there is a problem; this tells you it is every Monday.
 * Weeks run down the columns the way a wall planner does, so a pattern reads as
 * a horizontal band rather than something you have to count out.
 */
export function AttendanceCalendar({ days, maxWeeks = 53 }: { days: Day[]; maxWeeks?: number }) {
  const scroller = useRef<HTMLDivElement>(null)

  const { columns, months, counts, marked } = useMemo(() => {
    const byDate = new Map(days.map((d) => [d.date, d]))
    // Anchor on the most recent marked day rather than today, so a register
    // that stopped in March does not render as a wall of empty squares.
    const last = days.length ? parseISO(days[days.length - 1].date) : new Date()
    const end = startOfWeek(last, { weekStartsOn: 1 })

    // Size the window to the data: a school four weeks into term should not get
    // a year of blanks, and nobody needs more than a year on one screen.
    const first = days.length ? parseISO(days[0].date) : last
    const span = Math.ceil(
      (differenceInCalendarDays(end, startOfWeek(first, { weekStartsOn: 1 })) + 1) / 7,
    )
    const weeks = Math.min(maxWeeks, Math.max(8, span))
    const start = addDays(end, -7 * (weeks - 1))

    const columns: (Day | null)[][] = []
    const months: { left: number; label: string }[] = []
    let lastLabel = ''

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
      // Label a column only when its month is new *and* the previous label has
      // had room to breathe — otherwise short months print on top of each other.
      const label = format(addDays(start, week * 7), 'MMM')
      const left = week * STEP
      if (label !== lastLabel && (!months.length || left - months[months.length - 1].left >= 30)) {
        months.push({ left, label })
        lastLabel = label
      } else if (label !== lastLabel) {
        lastLabel = label
      }
      columns.push(column)
    }

    const counts = new Map<string, number>()
    for (const day of days) counts.set(day.status, (counts.get(day.status) ?? 0) + 1)

    return { columns, months, counts, marked: days.length, width: weeks * STEP }
  }, [days, maxWeeks])

  // The interesting end is the recent one, so start scrolled to it.
  useEffect(() => {
    const element = scroller.current
    if (element) element.scrollLeft = element.scrollWidth
  }, [columns])

  const present =
    (counts.get('present') ?? 0) + (counts.get('late') ?? 0) + (counts.get('half_day') ?? 0)
  // Holidays are drawn but not counted — the same rule the percentage on the
  // record follows, so the two never disagree.
  const holidays = counts.get('holiday') ?? 0
  const teachingDays = marked - holidays - (counts.get('excused') ?? 0)
  const rate = teachingDays > 0 ? Math.round((present / teachingDays) * 100) : 0

  return (
    <div className="space-y-4">
      <div ref={scroller} className="overflow-x-auto pb-2">
        <div className="inline-block" style={{ paddingLeft: GUTTER }}>
          {/* Month labels sit on their own track, positioned rather than
              spaced, so a five-week month and a four-week one both land right. */}
          <div className="relative h-4" style={{ width: columns.length * STEP }}>
            {months.map((month) => (
              <span
                key={`${month.label}-${month.left}`}
                className="absolute top-0 text-[11px] font-semibold text-muted"
                style={{ left: month.left }}
              >
                {month.label}
              </span>
            ))}
          </div>

          <div className="relative mt-1 flex" style={{ gap: GAP }}>
            <div
              className="absolute flex flex-col text-[10px] font-semibold text-muted"
              style={{ left: -GUTTER, gap: GAP }}
            >
              {WEEKDAYS.map((label, index) => (
                <span key={index} className="flex items-center" style={{ height: CELL }}>
                  {label}
                </span>
              ))}
            </div>

            {columns.map((column, week) => (
              <div key={week} className="flex shrink-0 flex-col" style={{ gap: GAP }}>
                {column.map((day, weekday) => {
                  const tone = day ? TONE_BY_KEY.get(day.status) : undefined
                  return (
                    <span
                      key={weekday}
                      title={
                        day
                          ? `${format(parseISO(day.date), 'EEE d MMM yyyy')} — ${
                              tone?.label ?? 'Not marked'
                            }${day.remark ? ` · ${day.remark}` : ''}`
                          : undefined
                      }
                      aria-label={
                        day
                          ? `${format(parseISO(day.date), 'd MMMM yyyy')}: ${
                              tone?.label ?? 'not marked'
                            }`
                          : undefined
                      }
                      style={{ width: CELL, height: CELL }}
                      className={cn(
                        'rounded-[4px]',
                        !day && 'bg-transparent',
                        day && (tone?.cell ?? 'bg-surface-sunken'),
                      )}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-[13px] font-bold text-ink">
          {present} of {teachingDays} day{teachingDays === 1 ? '' : 's'} attended
          <span className="ml-1.5 font-semibold text-muted">({rate}%)</span>
        </span>
        {TONES.filter((tone) => counts.get(tone.key)).map((tone) => (
          <span key={tone.key} className="flex items-center gap-1.5 text-[12.5px] text-ink-soft">
            <span className={cn('h-[11px] w-[11px] rounded-[3px]', tone.cell)} aria-hidden />
            {tone.label}
            <span className="tabular font-bold">{counts.get(tone.key)}</span>
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
          <span className="h-[11px] w-[11px] rounded-[3px] bg-surface-sunken" aria-hidden />
          Not marked
        </span>
        {holidays > 0 && (
          <span className="text-[12px] text-muted">
            Holidays are shown but not counted
          </span>
        )}
      </div>
    </div>
  )
}
