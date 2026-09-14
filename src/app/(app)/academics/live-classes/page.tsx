'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { Ban, ExternalLink, Plus, Radio, Video } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { ConfirmDialog, Drawer } from '@/components/ui/drawer'
import { EmptyState } from '@/components/ui/empty'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Page } from '@/components/layout/page'
import { useOptions } from '@/hooks/use-resource'
import { ApiError, api } from '@/lib/api'
import { useSession } from '@/lib/session'
import { cn, titleCase } from '@/lib/utils'

const STATE_TONE = {
  live: 'danger',
  joinable: 'success',
  upcoming: 'neutral',
  ended: 'neutral',
  cancelled: 'danger',
} as const

export default function LiveClassesPage() {
  const client = useQueryClient()
  const can = useSession((state) => state.can)
  const [scheduling, setScheduling] = useState(false)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [classId, setClassId] = useState('')

  const classes = useQuery({
    queryKey: ['live-classes'],
    queryFn: () => api.get<any[]>('/live-classes', { days: 14 }),
    // The join window opens on a clock, so the page has to keep up with it.
    refetchInterval: 30_000,
  })

  const { data: classOptions } = useOptions('/classes')
  const { data: sections } = useOptions('/sections', { class_id: classId || undefined })
  const { data: subjects } = useOptions('/subjects', { class_id: classId || undefined })

  const schedule = useMutation({
    mutationFn: (body: unknown) => api.post<any>('/live-classes', body),
    onSuccess: (result) => {
      toast.success(result.detail)
      setScheduling(false)
      void client.invalidateQueries({ queryKey: ['live-classes'] })
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not schedule'),
  })

  const cancel = useMutation({
    mutationFn: (id: string) => api.post<any>(`/live-classes/${id}/cancel`),
    onSuccess: (result) => {
      toast.success(result.detail)
      setCancelling(null)
      void client.invalidateQueries({ queryKey: ['live-classes'] })
    },
  })

  const join = useMutation({
    mutationFn: (id: string) => api.post<any>(`/live-classes/${id}/join`),
    onSuccess: (result) => {
      window.open(result.meeting_url, '_blank', 'noopener,noreferrer')
      if (result.passcode) toast.message(`Passcode: ${result.passcode}`)
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not open the class'),
  })

  const items = classes.data ?? []

  return (
    <Page
      title="Live Classes"
      subtitle="Scheduled online sessions. Links open fifteen minutes before the start."
      actions={
        can('lms:create') ? (
          <Button onClick={() => setScheduling(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Schedule class
          </Button>
        ) : undefined
      }
    >
      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon="video"
            title="Nothing scheduled"
            description="Schedule a session and every student in the section is notified."
            action={
              can('lms:create') ? (
                <Button onClick={() => setScheduling(true)}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Schedule class
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item: any) => {
            const state = item.join_state as keyof typeof STATE_TONE
            const openable = state === 'live' || state === 'joinable'
            return (
              <Card key={item.id} className={cn(state === 'cancelled' && 'opacity-60')}>
                <CardBody>
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={cn(
                        'grid h-10 w-10 shrink-0 place-items-center rounded-field',
                        state === 'live' ? 'bg-blush' : 'bg-surface-sunken',
                      )}
                    >
                      {state === 'live' ? (
                        <Radio className="h-5 w-5 text-danger" aria-hidden />
                      ) : (
                        <Video className="h-5 w-5 text-ink" aria-hidden />
                      )}
                    </span>
                    <Badge tone={STATE_TONE[state]}>
                      {state === 'live' ? 'Live now' : titleCase(state)}
                    </Badge>
                  </div>

                  <h3 className="mt-3 truncate text-[15px] font-bold text-ink">{item.title}</h3>
                  <p className="mt-0.5 truncate text-[12.5px] text-muted">
                    {item.subject_name || titleCase(item.platform ?? 'other')} · {item.host_name}
                  </p>

                  <dl className="mt-3 space-y-1 text-[12.5px]">
                    <div className="flex justify-between">
                      <dt className="text-muted">Starts</dt>
                      <dd className="tabular font-semibold text-ink">
                        {format(parseISO(item.starts_at), 'd MMM, h:mm a')}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted">Duration</dt>
                      <dd className="tabular font-semibold text-ink">
                        {item.duration_minutes} min
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted">Joined</dt>
                      <dd className="tabular font-semibold text-ink">{item.attendee_count}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={!openable}
                      loading={join.isPending && join.variables === item.id}
                      onClick={() => join.mutate(item.id)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      {openable ? 'Join' : state === 'upcoming' ? 'Not open yet' : titleCase(state)}
                    </Button>
                    {can('lms:update') && state !== 'cancelled' && state !== 'ended' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Cancel class"
                        onClick={() => setCancelling(item.id)}
                      >
                        <Ban className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      <Drawer
        open={scheduling}
        onClose={() => setScheduling(false)}
        title="Schedule an online class"
        subtitle="Paste the link from Zoom, Meet or Teams — students are notified straight away"
        width="lg"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            const local = String(form.get('starts_at'))
            schedule.mutate({
              title: form.get('title'),
              // datetime-local has no zone; the browser's own offset is the
              // right one, since the teacher is scheduling in local time.
              starts_at: new Date(local).toISOString(),
              duration_minutes: Number(form.get('duration_minutes')),
              section_ids: [String(form.get('section_id'))],
              subject_id: String(form.get('subject_id')) || null,
              meeting_url: form.get('meeting_url'),
              meeting_id: form.get('meeting_id'),
              passcode: form.get('passcode'),
              platform: form.get('platform'),
              description: form.get('description'),
            })
          }}
        >
          <Input name="title" label="Title" required placeholder="Algebra revision" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Class"
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
            >
              <option value="">Select a class</option>
              {(classOptions ?? []).map((option: any) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
            <Select name="section_id" label="Section" required disabled={!classId}>
              <option value="">Select a section</option>
              {(sections ?? []).map((option: any) => (
                <option key={option.id} value={option.id}>
                  Section {option.name}
                </option>
              ))}
            </Select>
            <Select name="subject_id" label="Subject">
              <option value="">—</option>
              {(subjects ?? []).map((option: any) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
            <Select name="platform" label="Platform" defaultValue="meet">
              {['meet', 'zoom', 'teams', 'other'].map((value) => (
                <option key={value} value={value}>
                  {titleCase(value)}
                </option>
              ))}
            </Select>
            <Input name="starts_at" label="Starts at" type="datetime-local" required />
            <Input
              name="duration_minutes"
              label="Duration (minutes)"
              type="number"
              defaultValue={45}
            />
          </div>
          <Input
            name="meeting_url"
            label="Meeting link"
            required
            placeholder="https://meet.google.com/abc-defg-hij"
            hint="Withheld from students until fifteen minutes before the start"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input name="meeting_id" label="Meeting ID" placeholder="Optional" />
            <Input name="passcode" label="Passcode" placeholder="Optional" />
          </div>
          <Textarea name="description" label="Notes for students" />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setScheduling(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={schedule.isPending}>
              Schedule
            </Button>
          </div>
        </form>
      </Drawer>

      <ConfirmDialog
        open={Boolean(cancelling)}
        onClose={() => setCancelling(null)}
        onConfirm={() => cancelling && cancel.mutate(cancelling)}
        title="Cancel this class?"
        message="Every student in the section is notified straight away."
        confirmLabel="Cancel class"
        loading={cancel.isPending}
      />
    </Page>
  )
}
