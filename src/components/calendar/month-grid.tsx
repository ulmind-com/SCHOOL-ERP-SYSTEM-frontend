'use client'

import { useMemo } from 'react'
import {
  addDays,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { cn } from '@/lib/utils'

export interface CalendarHoliday {
  id: string
  name: string
  type: string
  description?: string
  attendance_required: boolean
  start_date: string
  end_date: string
}

export interface CalendarEvent {
  id: string
  title: string
  category: string
  location?: string
  all_day: boolean
  start_at: string
  end_at: string | null
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Two kinds of holiday, and they mean opposite things to a parent. */
export function holidayTone(holiday: CalendarHoliday) {
  return holiday.attendance_required ? 'bg-butter/45' : 'bg-lilac/70'
}

/** The 42 days a month's grid actually shows, leading and trailing days included. */
export function gridDays(month: Date) {
  const first = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  // Always six rows, so the grid does not change height between months.
  return eachDayOfInterval({ start: first, end: addDays(first, 41) })
}

export function holidaysOn(holidays: CalendarHoliday[], day: Date) {
  return holidays.filter((holiday) => {
    const from = parseISO(holiday.start_date)
    const to = parseISO(holiday.end_date)
    return day >= from && day <= to
  })
}

export function eventsOn(events: CalendarEvent[], day: Date) {
  return events.filter((event) => isSameDay(parseISO(event.start_at), day))
}

/**
 * A month at a glance: holidays shaded across every day they cover, events
 * listed under them.
 *
 * One grid for both, deliberately. A school's year is not two calendars, and
 * the question people open it with — "is there school that week?" — is only
 * answered by seeing them together.
 */
export function MonthGrid({
  month,
  holidays,
  events,
  selected,
  onSelect,
}: {
  month: Date
  holidays: CalendarHoliday[]
  events: CalendarEvent[]
  selected?: Date | null
  onSelect?: (day: Date) => void
}) {
  const days = useMemo(() => gridDays(month), [month])

  const today = new Date()

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 pb-2 sm:gap-1.5">
        {WEEKDAYS.map((label) => (
          <div
            key={label}
            className="text-center text-[11px] font-bold uppercase tracking-wide text-muted"
          >
            <span className="sm:hidden">{label[0]}</span>
            <span className="hidden sm:inline">{label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {days.map((day, index) => {
          const covering = holidaysOn(holidays, day)
          const holiday = covering.find((h) => h.attendance_required) ?? covering[0]
          const dayEvents = eventsOn(events, day)
          const outside = !isSameMonth(day, month)
          const isToday = isSameDay(day, today)
          const isSelected = selected ? isSameDay(day, selected) : false
          // Name the holiday once per week row, not on all five of its days.
          const labelIt =
            holiday && (index % 7 === 0 || isSameDay(day, parseISO(holiday.start_date)))

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelect?.(day)}
              aria-current={isToday ? 'date' : undefined}
              aria-label={`${format(day, 'd MMMM yyyy')}${
                holiday ? `, ${holiday.name}` : ''
              }${dayEvents.length ? `, ${dayEvents.length} event` : ''}`}
              className={cn(
                'flex min-h-[64px] flex-col items-start gap-1 rounded-field border p-1.5 text-left transition sm:min-h-[84px] sm:p-2',
                outside && 'opacity-40',
                holiday ? holidayTone(holiday) : 'bg-surface',
                isSelected
                  ? 'border-ink ring-1 ring-ink'
                  : 'border-line hover:border-ink/25',
              )}
            >
              <span
                className={cn(
                  'tabular grid h-5 w-5 shrink-0 place-items-center rounded-full text-[12px] font-bold',
                  isToday ? 'bg-ink text-white' : 'text-ink',
                )}
              >
                {format(day, 'd')}
              </span>

              {holiday && labelIt && (
                <span className="line-clamp-2 text-[10.5px] font-bold leading-tight text-ink sm:text-[11px]">
                  {holiday.name}
                </span>
              )}

              {dayEvents.slice(0, 1).map((event) => (
                <span
                  key={event.id}
                  className="line-clamp-1 w-full rounded-[4px] bg-ink/[0.08] px-1 py-0.5 text-[10px] font-semibold text-ink-soft sm:text-[10.5px]"
                >
                  {event.title}
                </span>
              ))}
              {dayEvents.length > 1 && (
                <span className="text-[10px] font-semibold text-muted">
                  +{dayEvents.length - 1} more
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function CalendarLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-muted',
        className,
      )}
    >
      <span className="flex items-center gap-1.5">
        <span className="h-[11px] w-[11px] rounded-[3px] bg-lilac" aria-hidden />
        Closed — no register
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-[11px] w-[11px] rounded-[3px] bg-butter" aria-hidden />
        Celebrated at school — register still taken
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-[11px] w-[11px] rounded-[3px] bg-ink/[0.15]" aria-hidden />
        Event
      </span>
    </div>
  )
}
