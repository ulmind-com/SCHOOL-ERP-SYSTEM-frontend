'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { ArrowUpRight, CalendarDays, Megaphone } from 'lucide-react'
import { AttendanceTrend } from '@/components/charts/attendance-trend'
import { Donut, DonutLegend, type Slice } from '@/components/charts/donut'
import { Badge } from '@/components/ui/badge'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty'
import {
  HolidayToday,
  HolidaysNeedingAttention,
  UpcomingHolidays,
} from '@/components/dashboard/holidays'
import { Page } from '@/components/layout/page'
import { StatCard } from '@/components/ui/stat-card'
import { api } from '@/lib/api'
import { useSession } from '@/lib/session'
import { compactMoney, compactNumber, percent } from '@/lib/utils'

export default function DashboardPage() {
  const { user, institution } = useSession()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<any>('/dashboard'),
  })

  const heading =
    user?.portal === 'parent'
      ? 'Family Overview'
      : user?.portal === 'student'
        ? 'My Dashboard'
        : 'Dashboard'

  if (isLoading || !data) {
    return (
      <Page title={heading} subtitle={institution?.name}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-[160px] rounded-card" />
          ))}
        </div>
        <div className="skeleton h-[340px] rounded-card" />
      </Page>
    )
  }

  if (data.portal === 'parent') return <ParentDashboard data={data} heading={heading} />
  if (data.portal === 'student') return <StudentDashboard data={data} heading={heading} />
  if (data.portal === 'teacher') return <TeacherDashboard data={data} heading={heading} />
  return <AdminDashboard data={data} heading={heading} />
}

/* ── Admin ─────────────────────────────────────────────────────────────── */
function AdminDashboard({ data, heading }: { data: any; heading: string }) {
  const { stats, limits } = data
  const fees = stats.fees
  const attendance = stats.attendance_today
  const shut = attendance.holiday && attendance.counts === false

  const feeSlices: Slice[] = [
    { name: 'Collected', value: fees.collected, color: 'rgb(17 18 20)' },
    { name: 'Outstanding', value: fees.outstanding, color: 'rgb(250 238 124)' },
  ]

  return (
    <Page title={heading} subtitle={`${data.institution.name} · Student Management`}>
      <HolidayToday panel={data.holidays} />
      <HolidaysNeedingAttention panel={data.holidays} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          tone="butter"
          icon="users"
          label="Students"
          value={compactNumber(stats.students)}
          caption={
            limits?.students?.ceiling
              ? `${stats.students} of ${compactNumber(limits.students.ceiling)} on your plan`
              : `${stats.classes} classes · ${stats.staff} staff`
          }
          href="/students"
        />
        <StatCard
          tone={shut ? 'lilac' : 'blush'}
          icon={shut ? 'calendar-off' : 'check-square'}
          label="Attendance Rate"
          // A percentage on a day nobody was expected is not a number anyone
          // should read as one, so it is not shown as one.
          value={shut ? '—' : percent(attendance.percentage, 0)}
          caption={
            shut
              ? `Closed for ${attendance.holiday}`
              : attendance.marked
                ? `${attendance.present} present of ${attendance.marked} marked today`
                : 'No register taken yet today'
          }
          href="/attendance"
        />
        <StatCard
          tone="lilac"
          icon="wallet"
          label="Fee Collection"
          value={percent(fees.collection_rate, 0)}
          caption={`${compactMoney(fees.collected)} of ${compactMoney(fees.billed)} billed`}
          href="/finance/payments"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader
            title="Attendance"
            subtitle="Last 14 days"
            action={
              <div className="flex items-center gap-4 text-[12.5px] font-semibold text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-ink" aria-hidden /> Present
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blush" aria-hidden /> Absent
                </span>
              </div>
            }
          />
          <CardBody className="pt-2">
            <AttendanceTrend data={data.attendance_trend ?? []} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Fee Summary" subtitle="This academic year" />
          <CardBody className="pt-0">
            <Donut
              slices={feeSlices}
              centerLabel="collected"
              centerValue={percent(fees.collection_rate, 0)}
            />
            <DonutLegend slices={feeSlices} />
            <dl className="mt-5 grid grid-cols-2 gap-3">
              <Metric label="This month" value={compactMoney(fees.this_month)} />
              <Metric label="Receipts" value={String(fees.receipts_this_month)} />
              <Metric label="Billed" value={compactMoney(fees.billed)} />
              <Metric label="Outstanding" value={compactMoney(fees.outstanding)} tone="danger" />
            </dl>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Students by Class" subtitle="Active enrolment" />
          <CardBody className="pt-2">
            {data.students_by_class?.length ? (
              <ul className="space-y-3">
                {data.students_by_class.map((row: any) => {
                  const max = Math.max(
                    ...data.students_by_class.map((r: any) => r.count),
                    1,
                  )
                  return (
                    <li key={row.class} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 truncate text-[13.5px] font-semibold text-ink-soft">
                        {row.class}
                      </span>
                      <span className="h-2.5 flex-1 overflow-hidden rounded-pill bg-surface-sunken">
                        <span
                          className="block h-full rounded-pill bg-ink transition-all"
                          style={{ width: `${(row.count / max) * 100}%` }}
                        />
                      </span>
                      <span className="tabular w-10 shrink-0 text-right text-[13.5px] font-bold text-ink">
                        {row.count}
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <EmptyState
                icon="layers"
                title="No classes yet"
                description="Create your classes and sections to see enrolment here."
              />
            )}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Announcements"
              action={
                <Link
                  href="/communication/announcements"
                  className="chip bg-surface-sunken text-ink-soft transition hover:bg-ink/10"
                >
                  View all
                </Link>
              }
            />
            <CardBody className="pt-3">
              {data.announcements?.length ? (
                <ul className="space-y-3">
                  {data.announcements.slice(0, 4).map((item: any) => (
                    <li key={item.id} className="flex gap-3">
                      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-butter">
                        <Megaphone className="h-4 w-4 text-ink" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-bold text-ink">{item.title}</p>
                        <p className="text-[12px] text-muted">
                          {item.published_at
                            ? format(parseISO(item.published_at), 'd MMM, h:mm a')
                            : 'Draft'}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-center text-[13px] text-muted">Nothing posted yet.</p>
              )}
            </CardBody>
          </Card>

          <UpcomingHolidays panel={data.holidays} manage />

          <Card>
            <CardHeader
              title="Upcoming Events"
              action={
                <Link
                  href="/communication/events"
                  className="chip bg-surface-sunken text-ink-soft transition hover:bg-ink/10"
                >
                  All events
                </Link>
              }
            />
            <CardBody className="pt-3">
              {data.upcoming_events?.length ? (
                <ul className="space-y-3">
                  {data.upcoming_events.slice(0, 4).map((event: any) => (
                    <li key={event.id} className="flex gap-3">
                      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-lilac">
                        <CalendarDays className="h-4 w-4 text-ink" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-bold text-ink">{event.title}</p>
                        <p className="text-[12px] text-muted">
                          {event.start_at ? format(parseISO(event.start_at), 'd MMM yyyy') : '—'}
                        </p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-center text-[13px] text-muted">Calendar is clear.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </Page>
  )
}

/* ── Teacher ───────────────────────────────────────────────────────────── */
function TeacherDashboard({ data, heading }: { data: any; heading: string }) {
  const { stats } = data
  return (
    <Page title={heading} subtitle="Your classes today">
      <HolidayToday panel={data.holidays} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          tone="butter"
          icon="check-square"
          label="Registers Pending"
          value={stats.registers_pending}
          caption={`${stats.my_sections} section(s) assigned to you`}
          href="/attendance"
        />
        <StatCard
          tone="blush"
          icon="clipboard-list"
          label="To Grade"
          value={stats.submissions_to_grade}
          caption={`${stats.assignments_open} assignment(s) open`}
          href="/assignments"
        />
        <StatCard
          tone="lilac"
          icon="users"
          label="My Students"
          value={compactNumber(stats.my_students)}
          caption={`${stats.classes_today} class(es) scheduled today`}
        />
      </div>

      <Card>
        <CardHeader title="Today's Schedule" />
        <CardBody className="pt-2">
          {data.today_schedule?.length ? (
            <ul className="divide-y divide-line">
              {data.today_schedule.map((slot: any) => (
                <li key={slot.id} className="flex items-center gap-4 py-3">
                  <span className="tabular w-28 shrink-0 text-[13px] font-bold text-ink">
                    {slot.start_time} – {slot.end_time}
                  </span>
                  <span className="flex-1 truncate text-[14px] font-semibold text-ink-soft">
                    {slot.period_name || 'Period'}
                  </span>
                  {slot.room && <Badge tone="neutral">{slot.room}</Badge>}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon="calendar-clock"
              title="Nothing scheduled today"
              description="Your timetable for today is clear."
            />
          )}
        </CardBody>
      </Card>
      <UpcomingHolidays panel={data.holidays} />
    </Page>
  )
}

/* ── Student ───────────────────────────────────────────────────────────── */
function StudentDashboard({ data, heading }: { data: any; heading: string }) {
  return (
    <Page title={heading} subtitle={`${data.student.name} · ${data.student.admission_number}`}>
      <HolidayToday panel={data.holidays} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          tone="butter"
          icon="check-square"
          label="My Attendance"
          value={percent(data.attendance.percentage, 0)}
          caption={`${data.attendance.present} present of ${data.attendance.total_days} days`}
        />
        <StatCard
          tone="blush"
          icon="clipboard-list"
          label="Assignments Due"
          value={data.assignments_due?.length ?? 0}
          caption="Published and not yet past due"
          href="/assignments"
        />
        <StatCard
          tone="lilac"
          icon="wallet"
          label="Fees Outstanding"
          value={compactMoney(data.fees.outstanding)}
          caption={`${compactMoney(data.fees.paid)} paid so far`}
          href="/finance/invoices"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Today's Classes" />
          <CardBody className="pt-2">
            {data.today_schedule?.length ? (
              <ul className="divide-y divide-line">
                {data.today_schedule.map((slot: any) => (
                  <li key={slot.id} className="flex items-center gap-4 py-3">
                    <span className="tabular w-24 shrink-0 text-[13px] font-bold text-ink">
                      {slot.start_time}
                    </span>
                    <span className="flex-1 truncate text-[14px] font-semibold text-ink-soft">
                      {slot.period_name || 'Period'}
                    </span>
                    {slot.room && <Badge tone="neutral">{slot.room}</Badge>}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="calendar-clock" title="No classes today" />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Assignments Due" />
          <CardBody className="pt-2">
            {data.assignments_due?.length ? (
              <ul className="divide-y divide-line">
                {data.assignments_due.map((item: any) => (
                  <li key={item.id} className="flex items-center gap-3 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-bold text-ink">
                        {item.title}
                      </span>
                      <span className="text-[12px] text-muted">
                        Due {item.due_date ? format(parseISO(item.due_date), 'd MMM') : '—'}
                      </span>
                    </span>
                    <Badge status={item.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="clipboard-list" title="Nothing due" description="You're all caught up." />
            )}
          </CardBody>
        </Card>
      </div>
      <UpcomingHolidays panel={data.holidays} />
    </Page>
  )
}

/* ── Parent ────────────────────────────────────────────────────────────── */
function ParentDashboard({ data, heading }: { data: any; heading: string }) {
  return (
    <Page title={heading} subtitle={data.guardian.name}>
      <HolidayToday panel={data.holidays} />
      {data.children?.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.children.map((child: any) => (
            <Card key={child.id}>
              <CardHeader
                title={child.name}
                subtitle={`${child.class} ${child.section} · ${child.admission_number}`}
                action={
                  <Link
                    href={`/students/${child.id}`}
                    className="chip bg-surface-sunken text-ink-soft transition hover:bg-ink/10"
                  >
                    Open
                  </Link>
                }
              />
              <CardBody className="grid grid-cols-2 gap-3 pt-4">
                <Metric label="Attendance" value={percent(child.attendance.percentage, 0)} />
                <Metric
                  label="Outstanding"
                  value={compactMoney(child.fees.outstanding)}
                  tone={child.fees.outstanding > 0 ? 'danger' : undefined}
                />
                <Metric label="Days present" value={String(child.attendance.present)} />
                <Metric label="Paid" value={compactMoney(child.fees.paid)} />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon="users-round"
            title="No children linked yet"
            description="Ask the school office to link your account to your child's record."
          />
        </Card>
      )}
      <UpcomingHolidays panel={data.holidays} />
    </Page>
  )
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'danger'
}) {
  return (
    <div className="rounded-field bg-surface-sunken px-3.5 py-3">
      <dt className="text-[12px] font-semibold text-muted">{label}</dt>
      <dd
        className={`tabular mt-0.5 text-[17px] font-extrabold ${
          tone === 'danger' ? 'text-danger' : 'text-ink'
        }`}
      >
        {value}
      </dd>
    </div>
  )
}
