'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Drawer } from '@/components/ui/drawer'
import { EmptyState } from '@/components/ui/empty'
import { Input, Select } from '@/components/ui/input'
import { BellScheduleButton } from '@/components/timetable/bell-schedule'
import { Page } from '@/components/layout/page'
import { useOptions } from '@/hooks/use-resource'
import { ApiError, api } from '@/lib/api'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/utils'

const DAYS = [
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
]

const SLOT_TINTS = ['bg-butter', 'bg-blush', 'bg-lilac', 'bg-mint', 'bg-sky']

/** Deterministic tint per subject, so the same subject reads the same all week. */
function tintFor(key: string) {
  let hash = 0
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return SLOT_TINTS[hash % SLOT_TINTS.length]
}

export default function TimetablePage() {
  const client = useQueryClient()
  const can = useSession((state) => state.can)
  const [classId, setClassId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [adding, setAdding] = useState<{ day: number; periodId: string } | null>(null)

  const { data: classes } = useOptions('/classes')
  const { data: sections } = useOptions('/sections', { class_id: classId || undefined })
  const { data: periods } = useOptions('/periods')
  const { data: subjects } = useOptions('/subjects', { class_id: classId || undefined })
  const { data: staff } = useOptions('/staff', { status: 'active' })

  useEffect(() => {
    if (!classId && classes?.length) setClassId(classes[0].id)
  }, [classes, classId])
  useEffect(() => {
    if (sections?.length) setSectionId((current) => (sections.some((s: any) => s.id === current) ? current : sections[0].id))
    else setSectionId('')
  }, [sections])

  const slots = useQuery({
    queryKey: ['timetable', sectionId],
    enabled: Boolean(sectionId),
    queryFn: () => api.get<any>('/timetable-slots', { section_id: sectionId, page_size: 200 }),
  })

  const subjectNames = useMemo(
    () => new Map((subjects ?? []).map((s: any) => [s.id, s.name])),
    [subjects],
  )
  const staffNames = useMemo(
    () => new Map((staff ?? []).map((s: any) => [s.id, s.full_name])),
    [staff],
  )

  const grid = useMemo(() => {
    const map = new Map<string, any>()
    for (const slot of slots.data?.items ?? []) {
      map.set(`${slot.day_of_week}:${slot.period_id}`, slot)
    }
    return map
  }, [slots.data])

  const create = useMutation({
    mutationFn: (body: unknown) => api.post<any>('/timetable-slots', body),
    onSuccess: () => {
      toast.success('Period scheduled')
      setAdding(null)
      void client.invalidateQueries({ queryKey: ['timetable', sectionId] })
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Could not save'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/timetable-slots/${id}`),
    onSuccess: () => {
      toast.success('Removed')
      void client.invalidateQueries({ queryKey: ['timetable', sectionId] })
    },
  })

  const teaching = (periods ?? []).filter((p: any) => !p.is_break)
  const editable = can('timetable:create')

  return (
    <Page
      title="Timetable"
      subtitle="Weekly schedule per section"
      actions={
        <div className="flex flex-wrap gap-2">
          {can('timetable:update') && <BellScheduleButton periods={periods ?? []} />}
          <Select
            aria-label="Class"
            value={classId}
            onChange={(event) => setClassId(event.target.value)}
            containerClassName="w-auto"
            className="min-w-[140px] rounded-pill border-transparent bg-surface shadow-card"
          >
            {(classes ?? []).map((option: any) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Section"
            value={sectionId}
            onChange={(event) => setSectionId(event.target.value)}
            containerClassName="w-auto"
            className="min-w-[130px] rounded-pill border-transparent bg-surface shadow-card"
          >
            {(sections ?? []).map((option: any) => (
              <option key={option.id} value={option.id}>
                Section {option.name}
              </option>
            ))}
          </Select>
        </div>
      }
    >
      <Card className="p-5">
        {!periods?.length ? (
          <EmptyState
            icon="calendar-clock"
            title="No periods defined"
            description="Set up the daily bell schedule before building a timetable."
            action={
              can('timetable:update') ? <BellScheduleButton periods={[]} /> : undefined
            }
          />
        ) : !sectionId ? (
          <EmptyState icon="layers" title="Create a section first" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-separate border-spacing-1.5">
              <thead>
                <tr>
                  <th className="w-28 text-left text-[11.5px] font-bold uppercase tracking-wide text-muted">
                    Period
                  </th>
                  {DAYS.map((day) => (
                    <th
                      key={day.value}
                      className="text-center text-[11.5px] font-bold uppercase tracking-wide text-muted"
                    >
                      {day.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(periods ?? []).map((period: any) => (
                  <tr key={period.id}>
                    <th className="text-left align-middle">
                      <span className="block text-[13px] font-bold text-ink">{period.name}</span>
                      <span className="tabular block text-[11px] text-muted">
                        {period.start_time}–{period.end_time}
                      </span>
                    </th>
                    {DAYS.map((day) => {
                      if (period.is_break) {
                        return (
                          <td key={day.value} className="h-16">
                            <div className="grid h-full place-items-center rounded-field bg-surface-sunken text-[11.5px] font-semibold text-muted">
                              {period.name}
                            </div>
                          </td>
                        )
                      }
                      const slot = grid.get(`${day.value}:${period.id}`)
                      if (!slot) {
                        return (
                          <td key={day.value} className="h-16">
                            <button
                              type="button"
                              disabled={!editable}
                              onClick={() => setAdding({ day: day.value, periodId: period.id })}
                              className="grid h-full w-full place-items-center rounded-field border border-dashed
                                         border-line text-muted transition hover:border-ink/25 hover:text-ink
                                         disabled:pointer-events-none disabled:opacity-40"
                            >
                              <Plus className="h-4 w-4" aria-hidden />
                              <span className="sr-only">
                                Add a period on {day.label} at {period.name}
                              </span>
                            </button>
                          </td>
                        )
                      }
                      return (
                        <td key={day.value} className="h-16">
                          <div
                            className={cn(
                              'group relative flex h-full flex-col justify-center rounded-field px-3 py-2',
                              tintFor(String(slot.subject_id ?? slot.id)),
                            )}
                          >
                            <span className="truncate text-[12.5px] font-bold text-ink">
                              {subjectNames.get(slot.subject_id) ?? slot.room ?? 'Class'}
                            </span>
                            <span className="truncate text-[11px] text-ink/55">
                              {staffNames.get(slot.staff_id) ?? '—'}
                              {slot.room ? ` · ${slot.room}` : ''}
                            </span>
                            {editable && (
                              <button
                                type="button"
                                aria-label="Remove"
                                onClick={() => remove.mutate(slot.id)}
                                className="absolute right-1.5 top-1.5 hidden rounded-md bg-white/70 p-1
                                           text-ink/60 transition hover:text-danger group-hover:block"
                              >
                                <Trash2 className="h-3 w-3" aria-hidden />
                              </button>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Drawer
        open={Boolean(adding)}
        onClose={() => setAdding(null)}
        title="Schedule a period"
        subtitle={
          adding
            ? `${DAYS.find((d) => d.value === adding.day)?.label} · ${
                teaching.find((p: any) => p.id === adding.periodId)?.name ?? ''
              }`
            : undefined
        }
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!adding) return
            const form = new FormData(event.currentTarget)
            const period = (periods ?? []).find((p: any) => p.id === adding.periodId)
            const section = (sections ?? []).find((s: any) => s.id === sectionId)
            create.mutate({
              section_id: sectionId,
              class_id: classId,
              academic_year_id: section?.academic_year_id,
              day_of_week: adding.day,
              period_id: adding.periodId,
              period_name: period?.name ?? '',
              start_time: period?.start_time ?? '',
              end_time: period?.end_time ?? '',
              subject_id: String(form.get('subject_id') ?? '') || null,
              staff_id: String(form.get('staff_id') ?? '') || null,
              room: form.get('room'),
              type: form.get('type'),
            })
          }}
        >
          <Select name="subject_id" label="Subject" required>
            <option value="">Select a subject</option>
            {(subjects ?? []).map((subject: any) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </Select>
          <Select name="staff_id" label="Teacher">
            <option value="">Unassigned</option>
            {(staff ?? []).map((member: any) => (
              <option key={member.id} value={member.id}>
                {member.full_name}
              </option>
            ))}
          </Select>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input name="room" label="Room" placeholder="R-101" />
            <Select name="type" label="Type" defaultValue="lecture">
              {['lecture', 'lab', 'tutorial', 'activity'].map((value) => (
                <option key={value} value={value}>
                  {value[0].toUpperCase() + value.slice(1)}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setAdding(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Add to timetable
            </Button>
          </div>
        </form>
      </Drawer>
    </Page>
  )
}
