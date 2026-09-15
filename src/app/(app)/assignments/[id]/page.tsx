'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, ClipboardCheck, Megaphone, Paperclip, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Drawer } from '@/components/ui/drawer'
import { EmptyState } from '@/components/ui/empty'
import { Input, Textarea } from '@/components/ui/input'
import { Loader } from '@/components/ui/loader'
import { Page } from '@/components/layout/page'
import { StatCard } from '@/components/ui/stat-card'
import { ApiError, api } from '@/lib/api'
import { cn, titleCase } from '@/lib/utils'

interface Row {
  student_id: string
  name: string
  roll_number: string | number | ''
  admission_number: string
  submission_id: string | null
  status: string
  submitted_at: string | null
  marks: number | null
  grade: string
  feedback: string
  text_answer: string
  attachments: any[]
  collected_offline: boolean
}

interface Sheet {
  assignment: any
  submission_mode: 'online' | 'offline'
  set_by: string
  expected: number
  submitted: number
  graded: number
  late: number
  pending: number
  rows: Row[]
}

/**
 * One assignment, and everyone it was set for.
 *
 * The screen has two shapes because handing work in does. Online, the students
 * have already sent something and the teacher reads and marks it. Offline, the
 * paper is on the desk and the teacher is ticking a register — so that is
 * literally what this becomes, down to saving the whole roster at once.
 */
export default function AssignmentPage() {
  const { id } = useParams<{ id: string }>()
  const client = useQueryClient()
  const [ticked, setTicked] = useState<Set<string> | null>(null)
  const [grading, setGrading] = useState<Row | null>(null)

  const { data, isLoading, error } = useQuery<Sheet>({
    queryKey: ['assignment-sheet', id],
    queryFn: () => api.get<Sheet>(`/homework/assignments/${id}`),
  })

  const offline = data?.submission_mode === 'offline'

  // Seed the register from what is already recorded, once the sheet arrives.
  useEffect(() => {
    if (!data || ticked !== null) return
    setTicked(
      new Set(data.rows.filter((r) => r.status !== 'pending').map((r) => r.student_id)),
    )
  }, [data, ticked])

  const collect = useMutation({
    mutationFn: () =>
      api.post<any>(`/homework/assignments/${id}/collect`, {
        received: [...(ticked ?? [])],
      }),
    onSuccess: (result) => {
      toast.success(result.detail ?? 'Saved')
      void client.invalidateQueries({ queryKey: ['assignment-sheet', id] })
      void client.invalidateQueries({ queryKey: ['/assignments'] })
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Could not save that'),
  })

  const publish = useMutation({
    mutationFn: () => api.post<any>(`/homework/assignments/${id}/publish`, {}),
    onSuccess: (result) => {
      toast.success(result.detail ?? 'Published')
      void client.invalidateQueries({ queryKey: ['assignment-sheet', id] })
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Could not publish that'),
  })

  const dirty = useMemo(() => {
    if (!data || !ticked) return false
    const was = new Set(
      data.rows.filter((r) => r.status !== 'pending').map((r) => r.student_id),
    )
    return was.size !== ticked.size || [...ticked].some((s) => !was.has(s))
  }, [data, ticked])

  if (isLoading) {
    return (
      <Page title="Assignment">
        <Loader message="Opening the register…" />
      </Page>
    )
  }

  if (error || !data) {
    return (
      <Page title="Assignment">
        <Card>
          <CardBody>
            <EmptyState
              icon="clipboard-list"
              title="That assignment could not be opened"
              description={
                error instanceof ApiError ? error.message : 'It may have been deleted.'
              }
            />
          </CardBody>
        </Card>
      </Page>
    )
  }

  const work = data.assignment ?? {}
  const due = work.due_date ? parseISO(work.due_date) : null
  const draft = work.status === 'draft'

  const toggle = (studentId: string) =>
    setTicked((current) => {
      const next = new Set(current ?? [])
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })

  return (
    <Page
      title={work.title ?? 'Assignment'}
      subtitle={[
        titleCase(work.type ?? ''),
        data.set_by ? `Set by ${data.set_by}` : '',
        due ? `Due ${format(due, 'd MMM yyyy')}` : 'No due date',
        offline ? 'Collected in class' : 'Handed in through the portal',
      ]
        .filter(Boolean)
        .join(' · ')}
      actions={
        <div className="flex items-center gap-2">
          <Link href="/assignments">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-ink/[0.06] px-3 text-[13px] font-semibold text-ink transition hover:bg-ink/[0.1]">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              All assignments
            </span>
          </Link>
          {draft && (
            <Button
              size="sm"
              loading={publish.isPending}
              onClick={() => publish.mutate()}
            >
              <Megaphone className="h-3.5 w-3.5" aria-hidden />
              Publish
            </Button>
          )}
        </div>
      }
    >
      {draft && (
        <Card className="border border-warning/30">
          <CardBody className="flex flex-wrap items-center gap-3">
            <Megaphone className="h-5 w-5 shrink-0 text-warning" aria-hidden />
            <p className="min-w-[240px] flex-1 text-[13.5px] text-ink-soft">
              <span className="font-bold text-ink">This is still a draft. </span>
              Nobody has been told about it, and it does not appear on any student&rsquo;s
              homework screen. Publishing notifies the class.
            </p>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          tone="lilac"
          icon="users"
          label="Set for"
          value={String(data.expected)}
          caption={data.expected === 1 ? 'student' : 'students'}
        />
        <StatCard
          tone={data.pending ? 'butter' : 'mint'}
          icon="clipboard-check"
          label={offline ? 'Collected' : 'Handed in'}
          value={`${data.submitted}`}
          caption={data.pending ? `${data.pending} still outstanding` : 'Everyone is in'}
        />
        <StatCard
          tone="mint"
          icon="trophy"
          label="Graded"
          value={String(data.graded)}
          caption={
            data.submitted - data.graded > 0
              ? `${data.submitted - data.graded} waiting on you`
              : 'Nothing left to mark'
          }
        />
        <StatCard
          tone={data.late ? 'blush' : 'mint'}
          icon="clock"
          label="Late"
          value={String(data.late)}
          caption={data.late ? 'Handed in after the due date' : 'All on time'}
        />
      </div>

      <Card>
        <CardHeader
          title={offline ? 'Collection register' : 'Submissions'}
          subtitle={
            offline
              ? 'Tick everyone who handed the work in. Unticking undoes it.'
              : 'What each student sent, and what you have marked'
          }
          action={
            offline ? (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setTicked(
                      ticked && ticked.size === data.rows.length
                        ? new Set()
                        : new Set(data.rows.map((r) => r.student_id)),
                    )
                  }
                >
                  {ticked && ticked.size === data.rows.length ? 'Clear all' : 'Tick all'}
                </Button>
                <Button
                  size="sm"
                  disabled={!dirty}
                  loading={collect.isPending}
                  onClick={() => collect.mutate()}
                >
                  <Save className="h-3.5 w-3.5" aria-hidden />
                  Save register
                </Button>
              </div>
            ) : undefined
          }
        />
        <CardBody className="pt-3">
          {data.rows.length === 0 ? (
            <EmptyState
              icon="users"
              title="Nobody is in this class yet"
              description="Add students to the class or section this assignment was set for."
            />
          ) : (
            <ul className="divide-y divide-line">
              {data.rows.map((row) => (
                <StudentRow
                  key={row.student_id}
                  row={row}
                  offline={offline}
                  maxMarks={work.max_marks}
                  ticked={Boolean(ticked?.has(row.student_id))}
                  onToggle={() => toggle(row.student_id)}
                  onGrade={() => setGrading(row)}
                />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <GradeDrawer
        row={grading}
        maxMarks={work.max_marks}
        onClose={() => setGrading(null)}
        onSaved={() => {
          void client.invalidateQueries({ queryKey: ['assignment-sheet', id] })
          setGrading(null)
        }}
      />
    </Page>
  )
}

function StudentRow({
  row,
  offline,
  maxMarks,
  ticked,
  onToggle,
  onGrade,
}: {
  row: Row
  offline: boolean
  maxMarks?: number
  ticked: boolean
  onToggle: () => void
  onGrade: () => void
}) {
  const [open, setOpen] = useState(false)
  const handedIn = row.status !== 'pending'
  const locked = row.status === 'graded'

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-3">
        {offline && (
          <label
            className={cn(
              'flex cursor-pointer items-center gap-2.5 rounded-field px-1 py-1',
              locked && 'cursor-not-allowed opacity-70',
            )}
          >
            <input
              type="checkbox"
              checked={ticked || locked}
              disabled={locked}
              onChange={onToggle}
              aria-label={`${row.name} handed it in`}
              className="h-[18px] w-[18px] rounded-[5px] border-line accent-ink"
            />
          </label>
        )}

        <span className="tabular w-10 shrink-0 text-[12.5px] font-semibold text-muted">
          {row.roll_number !== '' && row.roll_number != null
            ? `#${row.roll_number}`
            : '—'}
        </span>

        <span className="min-w-[140px] flex-1">
          <span className="block text-[13.5px] font-bold text-ink">{row.name}</span>
          <span className="block text-[12px] text-muted">
            {row.submitted_at
              ? `${row.collected_offline ? 'Collected' : 'Sent'} ${format(
                  parseISO(row.submitted_at),
                  'd MMM, h:mm a',
                )}`
              : row.admission_number}
          </span>
        </span>

        {row.status === 'graded' ? (
          <Badge tone="success">
            {row.marks ?? '—'}
            {maxMarks ? ` / ${maxMarks}` : ''}
          </Badge>
        ) : row.status === 'late' ? (
          <Badge tone="warning">Late</Badge>
        ) : handedIn ? (
          <Badge tone="success">In</Badge>
        ) : (
          <Badge tone="neutral">Not yet</Badge>
        )}

        {!offline && (row.text_answer || row.attachments.length > 0) && (
          <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
            {open ? 'Hide' : 'Read'}
          </Button>
        )}

        <Button size="sm" variant="secondary" disabled={!handedIn} onClick={onGrade}>
          {row.status === 'graded' ? 'Change mark' : 'Mark'}
        </Button>
      </div>

      {open && (
        <div className="ml-[52px] mt-2 space-y-2 rounded-field bg-surface-sunken px-4 py-3">
          {row.text_answer && (
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-soft">
              {row.text_answer}
            </p>
          )}
          {row.attachments.map((file: any, index: number) => (
            <a
              key={file.url ?? index}
              href={file.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink underline-offset-4 hover:underline"
            >
              <Paperclip className="h-3.5 w-3.5" aria-hidden />
              {file.name ?? 'Attachment'}
            </a>
          ))}
        </div>
      )}

      {row.feedback && (
        <p className="ml-[52px] mt-2 text-[12.5px] text-muted">
          <span className="font-semibold text-ink-soft">Your note: </span>
          {row.feedback}
        </p>
      )}
    </li>
  )
}

function GradeDrawer({
  row,
  maxMarks,
  onClose,
  onSaved,
}: {
  row: Row | null
  maxMarks?: number
  onClose: () => void
  onSaved: () => void
}) {
  const save = useMutation({
    mutationFn: (body: { marks: number | null; feedback: string }) =>
      api.post<any>(`/homework/submissions/${row?.submission_id}/grade`, body),
    onSuccess: () => {
      toast.success('Marked')
      onSaved()
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not save that mark'),
  })

  return (
    <Drawer open={Boolean(row)} onClose={onClose} title="Mark this" subtitle={row?.name}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          const raw = String(form.get('marks') ?? '').trim()
          save.mutate({
            marks: raw === '' ? null : Number(raw),
            feedback: String(form.get('feedback') ?? ''),
          })
        }}
      >
        <Input
          name="marks"
          type="number"
          step="0.5"
          min={0}
          max={maxMarks || undefined}
          label={maxMarks ? `Marks (out of ${maxMarks})` : 'Marks'}
          defaultValue={row?.marks ?? ''}
        />
        <Textarea
          name="feedback"
          label="Note for the student"
          rows={5}
          defaultValue={row?.feedback ?? ''}
          placeholder="What they did well, and what to fix next time."
        />
        <p className="flex items-start gap-2 text-[12.5px] text-muted">
          <ClipboardCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          The student is notified as soon as you save, and the mark shows on their
          homework screen.
        </p>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            Save mark
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
