'use client'

import Link from 'next/link'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { CalendarOff, PartyPopper, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { cn, titleCase } from '@/lib/utils'

interface Holiday {
  id: string
  name: string
  type: string
  start_date: string
  end_date: string
  days: number
  starts_in: number
  attendance_required: boolean
}

interface Panel {
  today: {
    name: string
    type: string
    attendance_required: boolean
    end_date: string
  } | null
  upcoming: Holiday[]
  needs_attention?: { id: string; name: string; records: number; dates: string[] }[]
}

/**
 * A banner when today is one, and the next few after it.
 *
 * The same question for everyone, asked for different reasons: a parent plans
 * around it, a teacher stops wondering why no register is due.
 */
export function HolidayToday({ panel }: { panel?: Panel }) {
  const today = panel?.today
  if (!today) return null

  const until = parseISO(today.end_date)
  const more = differenceInCalendarDays(until, new Date())
  const celebrated = today.attendance_required

  return (
    <Card className={cn('border', celebrated ? 'border-warning/30' : 'border-lilac')}>
      <CardBody className="flex flex-wrap items-center gap-3">
        {celebrated ? (
          <PartyPopper className="h-5 w-5 shrink-0 text-warning" aria-hidden />
        ) : (
          <CalendarOff className="h-5 w-5 shrink-0 text-ink-soft" aria-hidden />
        )}
        <div className="min-w-[200px] flex-1">
          <p className="text-[15px] font-extrabold text-ink">
            Today is {today.name}
            <span className="ml-2 text-[12.5px] font-semibold text-muted">
              {titleCase(today.type ?? '')}
            </span>
          </p>
          <p className="mt-0.5 text-[13px] text-muted">
            {celebrated
              ? 'Celebrated at school — the register is taken as usual.'
              : 'The institution is closed. No register is taken and the day counts against nobody.'}
            {more > 0 &&
              ` Back on ${format(
                new Date(until.getTime() + 86_400_000),
                'EEEE d MMMM',
              )}.`}
          </p>
        </div>
      </CardBody>
    </Card>
  )
}

export function UpcomingHolidays({ panel, manage }: { panel?: Panel; manage?: boolean }) {
  const upcoming = panel?.upcoming ?? []
  if (upcoming.length === 0) return null

  return (
    <Card>
      <CardHeader
        title="Coming up"
        subtitle="Holidays in the next four months"
        action={
          manage ? (
            <Link
              href="/academics/holidays"
              className="text-[13px] font-semibold text-ink-soft underline-offset-4 hover:underline"
            >
              Manage
            </Link>
          ) : undefined
        }
      />
      <CardBody className="pt-2">
        <ul className="space-y-1.5">
          {upcoming.map((holiday) => (
            <li
              key={holiday.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-field bg-surface-sunken px-3.5 py-2.5"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-bold text-ink">{holiday.name}</span>
                <span className="block text-[12.5px] text-muted">
                  {holiday.days > 1
                    ? `${format(parseISO(holiday.start_date), 'd MMM')} – ${format(
                        parseISO(holiday.end_date),
                        'd MMM',
                      )} · ${holiday.days} days`
                    : format(parseISO(holiday.start_date), 'EEEE d MMMM')}
                </span>
              </span>
              {holiday.attendance_required && (
                <Badge tone="warning">Register taken</Badge>
              )}
              <span className="tabular shrink-0 text-[12.5px] font-semibold text-ink-soft">
                {holiday.starts_in === 0
                  ? 'today'
                  : holiday.starts_in === 1
                    ? 'tomorrow'
                    : `in ${holiday.starts_in} days`}
              </span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  )
}

/** Only the office can act on this, so only the office is shown it. */
export function HolidaysNeedingAttention({ panel }: { panel?: Panel }) {
  const rows = panel?.needs_attention ?? []
  if (rows.length === 0) return null

  return (
    <Card className="border border-warning/30">
      <CardBody className="flex flex-wrap items-start gap-3">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
        <div className="min-w-[240px] flex-1">
          <p className="text-[14px] font-bold text-ink">
            {rows.length === 1
              ? `Attendance was taken during ${rows[0].name}`
              : `${rows.length} holidays have attendance recorded inside them`}
          </p>
          <p className="mt-0.5 text-[13px] text-muted">
            {rows.reduce((sum, row) => sum + row.records, 0)} record(s) across{' '}
            {rows.map((row) => row.name).join(', ')}. Those days are still counting for and
            against every student in them.
          </p>
        </div>
        <Link href="/academics/holidays">
          <span className="rounded-pill bg-ink px-3.5 py-1.5 text-[13px] font-semibold text-white">
            Review
          </span>
        </Link>
      </CardBody>
    </Card>
  )
}
