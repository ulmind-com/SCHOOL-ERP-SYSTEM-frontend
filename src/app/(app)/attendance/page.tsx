'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { CalendarOff, CheckCheck, Lock, Save, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty'
import { Input, Select } from '@/components/ui/input'
import { Page } from '@/components/layout/page'
import { useOptions } from '@/hooks/use-resource'
import { ApiError, api } from '@/lib/api'
import { useSession } from '@/lib/session'
import { cn, percent, titleCase } from '@/lib/utils'

type Status = 'present' | 'absent' | 'late' | 'leave' | 'half_day'

const STATUSES: { value: Status; label: string; short: string; className: string }[] = [
  { value: 'present', label: 'Present', short: 'P', className: 'bg-success text-white' },
  { value: 'absent', label: 'Absent', short: 'A', className: 'bg-danger text-white' },
  { value: 'late', label: 'Late', short: 'L', className: 'bg-warning text-white' },
  { value: 'leave', label: 'Leave', short: 'LV', className: 'bg-info text-white' },
  { value: 'half_day', label: 'Half day', short: 'H', className: 'bg-ink text-white' },
]

interface RegisterStudent {
  student_id: string
  full_name: string
  roll_number: string
  admission_number: string
  photo: string
  status: Status | null
  remark: string
}

export default function AttendancePage() {
  const client = useQueryClient()
  const can = useSession((state) => state.can)

  const [classId, setClassId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [marks, setMarks] = useState<Record<string, Status>>({})

  const { data: classes } = useOptions('/classes')
  const { data: sections } = useOptions('/sections', { class_id: classId || undefined })

  // Land on the first class/section so the page is useful without any clicks.
  useEffect(() => {
    if (!classId && classes?.length) setClassId(classes[0].id)
  }, [classes, classId])
  useEffect(() => {
    if (sections?.length) setSectionId((current) =>
      sections.some((s: any) => s.id === current) ? current : sections[0].id,
    )
    else setSectionId('')
  }, [sections])

  const register = useQuery({
    queryKey: ['register', sectionId, date],
    enabled: Boolean(sectionId),
    queryFn: () =>
      api.get<any>('/attendance/register', { section_id: sectionId, date }),
  })

  // Reset local marks whenever a different register loads.
  useEffect(() => {
    if (!register.data) return
    const initial: Record<string, Status> = {}
    for (const row of register.data.students as RegisterStudent[]) {
      if (row.status) initial[row.student_id] = row.status
    }
    setMarks(initial)
    setBeforeBulk(null)
    setTakeAnyway(false)
  }, [register.data])

  const students: RegisterStudent[] = register.data?.students ?? []
  const locked = Boolean(register.data?.is_locked)
  const holiday = register.data?.holiday ?? null
  // A holiday the school teaches through is a normal register with a note on
  // it; one it is shut for is not a register at all.
  const closed = Boolean(holiday && !holiday.attendance_required)
  const [takeAnyway, setTakeAnyway] = useState(false)

  const tally = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, leave: 0, half_day: 0, unmarked: 0 }
    for (const student of students) {
      const status = marks[student.student_id]
      if (status) counts[status] += 1
      else counts.unmarked += 1
    }
    return counts
  }, [students, marks])

  const save = useMutation({
    mutationFn: () =>
      api.post<any>('/attendance/register', {
        section_id: sectionId,
        date,
        despite_holiday: takeAnyway,
        entries: students.map((student) => ({
          student_id: student.student_id,
          status: marks[student.student_id] ?? 'present',
        })),
      }),
    onSuccess: (result) => {
      toast.success(result.detail)
      void client.invalidateQueries({ queryKey: ['register', sectionId, date] })
      void client.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not save attendance'),
  })

  // Pressing "All present" a second time puts the register back the way it was,
  // so a mis-click costs nothing — otherwise the only way back is to reload and
  // lose everything already marked.
  const [beforeBulk, setBeforeBulk] = useState<Record<string, Status> | null>(null)

  const bulkApplied = (status: Status) =>
    students.length > 0 && students.every((s) => marks[s.student_id] === status)

  function markAll(status: Status) {
    if (bulkApplied(status) && beforeBulk) {
      setMarks(beforeBulk)
      setBeforeBulk(null)
      return
    }
    setBeforeBulk(marks)
    setMarks(Object.fromEntries(students.map((s) => [s.student_id, status])))
  }

  return (
    <Page
      title="Attendance"
      subtitle={
        register.data?.section
          ? `${register.data.section.name ? `Section ${register.data.section.name}` : ''} · ${format(new Date(date), 'EEEE, d MMMM yyyy')}`
          : 'Take and review daily registers'
      }
      actions={
        can('attendance:create') && students.length > 0 && !locked && (!closed || takeAnyway) ? (
          <Button onClick={() => save.mutate()} loading={save.isPending}>
            <Save className="h-4 w-4" aria-hidden />
            Save register
          </Button>
        ) : undefined
      }
    >
      {holiday && (
        <Card className={closed ? 'border border-info/30' : 'border border-warning/30'}>
          <CardBody className="flex flex-wrap items-start gap-3">
            <CalendarOff
              className={cn('mt-0.5 h-5 w-5 shrink-0', closed ? 'text-info' : 'text-warning')}
              aria-hidden
            />
            <div className="min-w-[220px] flex-1">
              <p className="text-[14px] font-bold text-ink">
                {holiday.name}
                <span className="ml-2 text-[12.5px] font-semibold text-muted">
                  {titleCase(holiday.type ?? '')}
                  {holiday.end_date && holiday.end_date !== holiday.start_date
                    ? ` · ${fmtRange(holiday.start_date, holiday.end_date)}`
                    : ''}
                </span>
              </p>
              <p className="mt-0.5 text-[13px] text-muted">
                {closed
                  ? 'The institution is closed. No register is taken and the day counts against nobody.'
                  : 'Celebrated at school — the register is taken as usual and it counts.'}
                {holiday.description ? ` ${holiday.description}` : ''}
              </p>
            </div>
            {closed && can('attendance:create') && (
              <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-semibold text-ink-soft">
                <input
                  type="checkbox"
                  checked={takeAnyway}
                  onChange={(event) => setTakeAnyway(event.target.checked)}
                  className="h-4 w-4 rounded border-line accent-[rgb(17_18_20)]"
                />
                Take it anyway — extra class
              </label>
            )}
          </CardBody>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-end gap-3 px-5 py-4">
          <Select
            label="Class"
            containerClassName="w-auto"
            className="min-w-[160px]"
            value={classId}
            onChange={(event) => setClassId(event.target.value)}
          >
            {(classes ?? []).map((option: any) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
          <Select
            label="Section"
            containerClassName="w-auto"
            className="min-w-[140px]"
            value={sectionId}
            onChange={(event) => setSectionId(event.target.value)}
          >
            {(sections ?? []).map((option: any) => (
              <option key={option.id} value={option.id}>
                Section {option.name}
              </option>
            ))}
          </Select>
          <Input
            label="Date"
            type="date"
            containerClassName="w-auto"
            className="min-w-[160px]"
            max={format(new Date(), 'yyyy-MM-dd')}
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />

          <div className="ml-auto flex flex-wrap items-center gap-2 pb-0.5">
            {register.data?.already_taken && (
              <Badge tone="success">
                <CheckCheck className="h-3 w-3" aria-hidden />
                Taken
              </Badge>
            )}
            {locked && (
              <Badge tone="danger">
                <Lock className="h-3 w-3" aria-hidden />
                Locked
              </Badge>
            )}
            {!locked && students.length > 0 && (!closed || takeAnyway) && (
              <>
                <Button
                  variant={bulkApplied('present') ? 'secondary' : 'soft'}
                  size="sm"
                  onClick={() => markAll('present')}
                >
                  {bulkApplied('present') && beforeBulk ? 'Undo all present' : 'All present'}
                </Button>
                <Button
                  variant={bulkApplied('absent') ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => markAll('absent')}
                >
                  {bulkApplied('absent') && beforeBulk ? 'Undo all absent' : 'All absent'}
                </Button>
              </>
            )}
          </div>
        </div>

        {closed && !takeAnyway && students.length > 0 && (
          <p className="border-t border-line px-5 py-3.5 text-[13px] text-muted">
            The register is closed for this day. Nothing here counts for or against anyone —
            tick <span className="font-semibold text-ink">Take it anyway</span> above if a class
            genuinely ran.
          </p>
        )}

        {students.length > 0 && (
          <div className="grid grid-cols-2 gap-3 border-y border-line bg-surface-sunken px-5 py-4 sm:grid-cols-6">
            <Tally label="Strength" value={students.length} />
            <Tally label="Present" value={tally.present} tone="text-success" />
            <Tally label="Absent" value={tally.absent} tone="text-danger" />
            <Tally label="Late" value={tally.late} tone="text-warning" />
            <Tally label="Leave" value={tally.leave} tone="text-info" />
            <Tally
              label="Rate"
              value={percent(
                students.length
                  ? ((tally.present + tally.late + tally.half_day * 0.5) / students.length) * 100
                  : 0,
                0,
              )}
            />
          </div>
        )}

        <CardBody className="pt-4">
          {register.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-14" />
              ))}
            </div>
          ) : students.length === 0 ? (
            <EmptyState
              icon="users"
              title="No students in this section"
              description="Admit students into this section, or pick a different one above."
            />
          ) : (
            <ul className="space-y-2">
              {students.map((student) => {
                const status = marks[student.student_id]
                return (
                  <li
                    key={student.student_id}
                    className={cn(
                      'flex flex-wrap items-center gap-3 rounded-field border border-line px-3.5 py-2.5 transition',
                      status === 'absent' && 'border-danger/25 bg-danger/[0.03]',
                      status === 'present' && 'border-success/25 bg-success/[0.03]',
                    )}
                  >
                    <span className="tabular w-7 shrink-0 text-center text-[13px] font-bold text-muted">
                      {student.roll_number || '—'}
                    </span>
                    <Avatar name={student.full_name} src={student.photo} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-bold text-ink">
                        {student.full_name}
                      </span>
                      <span className="tabular block truncate text-[12px] text-muted">
                        {student.admission_number}
                      </span>
                    </span>

                    <div
                      role="radiogroup"
                      aria-label={`Attendance for ${student.full_name}`}
                      className="flex shrink-0 gap-1"
                    >
                      {STATUSES.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={status === option.value}
                          aria-label={option.label}
                          title={option.label}
                          disabled={locked || !can('attendance:create')}
                          onClick={() =>
                            setMarks((prev) => ({ ...prev, [student.student_id]: option.value }))
                          }
                          className={cn(
                            'h-9 w-9 rounded-field text-[12px] font-bold transition',
                            'disabled:pointer-events-none disabled:opacity-40',
                            status === option.value
                              ? option.className
                              : 'bg-surface-sunken text-muted hover:bg-ink/[0.08] hover:text-ink',
                          )}
                        >
                          {option.short}
                        </button>
                      ))}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardBody>

        {students.length > 0 && !locked && can('attendance:create') && (!closed || takeAnyway) && (
          <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
            <p className="text-[13px] text-muted">
              {tally.unmarked > 0
                ? `${tally.unmarked} unmarked — they will be saved as present.`
                : 'Every student marked.'}
            </p>
            <Button onClick={() => save.mutate()} loading={save.isPending}>
              <Save className="h-4 w-4" aria-hidden />
              Save register
            </Button>
          </div>
        )}
      </Card>
    </Page>
  )
}

function Tally({
  label,
  value,
  tone,
}: {
  label: string
  value: number | string
  tone?: string
}) {
  return (
    <div>
      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={cn('tabular mt-0.5 text-[19px] font-extrabold text-ink', tone)}>{value}</p>
    </div>
  )
}

function fmtRange(from: string, to: string) {
  try {
    return `${format(new Date(from), 'd MMM')} – ${format(new Date(to), 'd MMM')}`
  } catch {
    return ''
  }
}
