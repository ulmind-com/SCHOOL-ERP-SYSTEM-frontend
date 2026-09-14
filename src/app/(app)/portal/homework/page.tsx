'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { CheckCircle2, Clock, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Drawer } from '@/components/ui/drawer'
import { EmptyState } from '@/components/ui/empty'
import { Loader } from '@/components/ui/loader'
import { Page } from '@/components/layout/page'
import { StatCard } from '@/components/ui/stat-card'
import { Textarea } from '@/components/ui/input'
import { TabSwitcher } from '@/components/resource/tab-switcher'
import { ApiError, api } from '@/lib/api'
import { cn, titleCase } from '@/lib/utils'

const TABS = ['To do', 'Submitted', 'All'] as const

/**
 * A student's own homework, with a way to hand it in.
 *
 * Not the administrative Assignments screen: that one edits the assignment,
 * which is the teacher's job, and it was reachable by anyone holding
 * assignments:read.
 */
export default function HomeworkPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('To do')
  const [answering, setAnswering] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['my-homework'],
    queryFn: () => api.get<any[]>('/homework/mine'),
  })

  const items = data ?? []
  const done = (item: any) => Boolean(item.submitted_at || item.status === 'graded')

  const shown = useMemo(() => {
    if (tab === 'Submitted') return items.filter(done)
    if (tab === 'To do') return items.filter((item) => !done(item))
    return items
  }, [items, tab])

  const overdue = items.filter(
    (item) => !done(item) && item.due_date && parseISO(item.due_date) < new Date(),
  )

  if (isLoading) {
    return (
      <Page title="Homework">
        <Loader message="Fetching your work…" />
      </Page>
    )
  }

  return (
    <Page title="Homework" subtitle="What has been set for your class">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          tone={items.filter((i) => !done(i)).length ? 'butter' : 'mint'}
          icon="clipboard-list"
          label="To do"
          value={String(items.filter((i) => !done(i)).length)}
          caption={overdue.length ? `${overdue.length} past the due date` : 'Nothing overdue'}
        />
        <StatCard
          tone="mint"
          icon="check-square"
          label="Handed in"
          value={String(items.filter(done).length)}
        />
        <StatCard
          tone="lilac"
          icon="trophy"
          label="Graded"
          value={String(items.filter((i) => i.status === 'graded').length)}
        />
      </div>

      <TabSwitcher tabs={TABS} active={tab} onChange={setTab} />

      {shown.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon="clipboard-list"
              title={tab === 'To do' ? 'Nothing due — nice' : 'Nothing here yet'}
              description={
                tab === 'To do'
                  ? 'Anything your teachers set will appear here.'
                  : 'Work you hand in shows up here with its grade.'
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {shown.map((item: any) => (
            <HomeworkCard
              key={item.id}
              item={item}
              done={done(item)}
              onAnswer={() => setAnswering(item)}
            />
          ))}
        </div>
      )}

      <SubmitDrawer item={answering} onClose={() => setAnswering(null)} />
    </Page>
  )
}

function HomeworkCard({
  item,
  done,
  onAnswer,
}: {
  item: any
  done: boolean
  onAnswer: () => void
}) {
  const due = item.due_date ? parseISO(item.due_date) : null
  const days = due ? differenceInCalendarDays(due, new Date()) : null
  const late = days !== null && days < 0 && !done

  return (
    <Card className={cn(late && 'border border-danger/30')}>
      <CardHeader
        title={item.title}
        subtitle={[item.subject_name, titleCase(item.type ?? '')].filter(Boolean).join(' · ')}
        action={
          <div className="flex items-center gap-3">
            {item.status === 'graded' ? (
              <Badge tone="success">
                {item.marks_obtained ?? '—'}
                {item.max_marks ? ` / ${item.max_marks}` : ''}
              </Badge>
            ) : done ? (
              <Badge tone="success">
                <CheckCircle2 className="h-3 w-3" aria-hidden />
                Handed in
              </Badge>
            ) : (
              <Button size="sm" onClick={onAnswer}>
                <Send className="h-3.5 w-3.5" aria-hidden />
                Hand in
              </Button>
            )}
          </div>
        }
      />
      <CardBody className="pt-2">
        {item.description && (
          <p className="text-[13.5px] leading-relaxed text-ink-soft">{item.description}</p>
        )}
        <p className="mt-2 flex flex-wrap items-center gap-x-2 text-[12.5px] text-muted">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          {due ? `Due ${format(due, 'd MMM yyyy')}` : 'No due date'}
          {days !== null && !done && (
            <>
              <span aria-hidden>·</span>
              <span className={cn(late && 'font-bold text-danger')}>
                {days < 0
                  ? `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} late`
                  : days === 0
                    ? 'today'
                    : `in ${days} day${days === 1 ? '' : 's'}`}
              </span>
            </>
          )}
          {item.allow_late_submission === false && !done && (
            <>
              <span aria-hidden>·</span>
              <span className="font-semibold text-warning">Late work is not accepted</span>
            </>
          )}
        </p>
        {item.feedback && (
          <p className="mt-3 rounded-field bg-surface-sunken px-3.5 py-2.5 text-[13px] text-ink-soft">
            <span className="font-bold text-ink">Teacher&rsquo;s note: </span>
            {item.feedback}
          </p>
        )}
      </CardBody>
    </Card>
  )
}

function SubmitDrawer({ item, onClose }: { item: any; onClose: () => void }) {
  const client = useQueryClient()

  const submit = useMutation({
    mutationFn: (content: string) =>
      api.post<any>('/homework/submit', { assignment_id: item.id, content }),
    onSuccess: (data) => {
      toast.success(data.detail ?? 'Handed in')
      void client.invalidateQueries({ queryKey: ['my-homework'] })
      onClose()
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not hand that in'),
  })

  return (
    <Drawer
      open={Boolean(item)}
      onClose={onClose}
      title="Hand in your work"
      subtitle={item?.title}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          submit.mutate(String(new FormData(event.currentTarget).get('content') ?? ''))
        }}
      >
        <Textarea
          name="content"
          label="Your answer"
          required
          rows={10}
          placeholder="Type your answer, or say where you have left the work."
        />
        <p className="text-[12.5px] text-muted">
          Your teacher sees this along with the time you handed it in.
        </p>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submit.isPending}>
            <Send className="h-4 w-4" aria-hidden />
            Hand in
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
