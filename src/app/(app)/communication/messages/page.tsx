'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { Check, MessageSquarePlus, Search, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Drawer } from '@/components/ui/drawer'
import { EmptyState } from '@/components/ui/empty'
import { Input, Textarea } from '@/components/ui/input'
import { Page } from '@/components/layout/page'
import { ApiError, api } from '@/lib/api'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/utils'

interface Contact {
  id: string
  full_name: string
  email: string
  avatar_url?: string
  roles: string[]
}

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <Messages />
    </Suspense>
  )
}

function Messages() {
  const params = useSearchParams()
  const client = useQueryClient()
  const can = useSession((state) => state.can)

  const [activeId, setActiveId] = useState<string | null>(params.get('thread'))
  const [search, setSearch] = useState('')
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const threads = useQuery({
    queryKey: ['threads', search],
    queryFn: () => api.get<any>('/messages/threads', { search, page_size: 50 }),
    // Conversations are the one place a school expects near-live updates.
    refetchInterval: 20_000,
  })

  const thread = useQuery({
    queryKey: ['thread', activeId],
    enabled: Boolean(activeId),
    queryFn: () => api.get<any>(`/messages/threads/${activeId}`),
    refetchInterval: 12_000,
  })

  useEffect(() => {
    if (!activeId && threads.data?.items?.length) setActiveId(threads.data.items[0].id)
  }, [threads.data, activeId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread.data?.messages?.length])

  const send = useMutation({
    mutationFn: (body: string) =>
      api.post<any>(`/messages/threads/${activeId}/messages`, { body }),
    onSuccess: () => {
      setDraft('')
      void client.invalidateQueries({ queryKey: ['thread', activeId] })
      void client.invalidateQueries({ queryKey: ['threads'] })
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not send'),
  })

  const items = threads.data?.items ?? []

  return (
    <Page
      title="Messages"
      subtitle={
        threads.data
          ? `${threads.data.meta.total} conversation${threads.data.meta.total === 1 ? '' : 's'}`
          : 'Talk to staff, students and parents'
      }
      actions={
        can('messages:create') ? (
          <Button onClick={() => setComposing(true)}>
            <MessageSquarePlus className="h-4 w-4" aria-hidden />
            New message
          </Button>
        ) : undefined
      }
    >
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* ── Thread list ──────────────────────────────────────────────── */}
        <Card className="flex max-h-[calc(100dvh-13rem)] flex-col overflow-hidden">
          <div className="border-b border-line p-3">
            <Input
              type="search"
              placeholder="Search conversations"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              leading={<Search className="h-4 w-4" aria-hidden />}
              className="rounded-pill border-transparent bg-surface-sunken"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {threads.isLoading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton h-16" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                icon="message-square"
                title={search ? 'Nothing matches' : 'No conversations yet'}
                description={search ? undefined : 'Start one to reach a colleague or a parent.'}
              />
            ) : (
              <ul>
                {items.map((item: any) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(item.id)}
                      aria-current={item.id === activeId ? 'true' : undefined}
                      className={cn(
                        'flex w-full items-start gap-3 border-b border-line/70 px-4 py-3 text-left transition',
                        item.id === activeId ? 'bg-surface-sunken' : 'hover:bg-surface-sunken/60',
                      )}
                    >
                      <Avatar
                        name={item.participants[0]?.full_name ?? item.title}
                        src={item.participants[0]?.avatar_url}
                        size={38}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span
                            className={cn(
                              'truncate text-[14px]',
                              item.unread ? 'font-extrabold text-ink' : 'font-bold text-ink',
                            )}
                          >
                            {item.title}
                          </span>
                          <span className="shrink-0 text-[11px] text-muted">
                            {shortTime(item.last_message_at)}
                          </span>
                        </span>
                        <span className="mt-0.5 flex items-center gap-2">
                          <span
                            className={cn(
                              'min-w-0 flex-1 truncate text-[12.5px]',
                              item.unread ? 'font-semibold text-ink-soft' : 'text-muted',
                            )}
                          >
                            {item.last_message || 'No messages yet'}
                          </span>
                          {item.unread && (
                            <span
                              className="h-2 w-2 shrink-0 rounded-full bg-ink"
                              aria-label="Unread"
                            />
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* ── Conversation ─────────────────────────────────────────────── */}
        <Card className="flex max-h-[calc(100dvh-13rem)] min-h-[420px] flex-col overflow-hidden">
          {!activeId || !thread.data ? (
            <EmptyState
              className="m-auto"
              icon="message-square"
              title="Pick a conversation"
              description="Or start a new one to reach a colleague, student or parent."
            />
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
                <Avatar
                  name={thread.data.participants.find((p: any) => !p.is_me)?.full_name ?? '?'}
                  size={38}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold text-ink">{thread.data.title}</p>
                  <p className="truncate text-[12px] text-muted">
                    {thread.data.participants
                      .filter((p: any) => !p.is_me)
                      .map((p: any) => p.full_name)
                      .join(', ')}
                  </p>
                </div>
                {thread.data.type === 'group' && <Badge tone="neutral">Group</Badge>}
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
                {thread.data.messages.length === 0 ? (
                  <p className="py-10 text-center text-[13px] text-muted">
                    No messages yet — say hello.
                  </p>
                ) : (
                  thread.data.messages.map((message: any, index: number) => {
                    const previous = thread.data.messages[index - 1]
                    const showDay =
                      !previous || dayKey(previous.created_at) !== dayKey(message.created_at)
                    return (
                      <div key={message.id}>
                        {showDay && (
                          <p className="my-3 text-center text-[11.5px] font-semibold text-muted">
                            {dayLabel(message.created_at)}
                          </p>
                        )}
                        <div
                          className={cn(
                            'flex gap-2.5',
                            message.is_mine ? 'justify-end' : 'justify-start',
                          )}
                        >
                          {!message.is_mine && (
                            <Avatar name={message.sender_name} size={30} className="mt-auto" />
                          )}
                          <div
                            className={cn(
                              'max-w-[min(30rem,80%)] rounded-card px-4 py-2.5',
                              message.is_mine
                                ? 'rounded-br-md bg-ink text-white'
                                : 'rounded-bl-md bg-surface-sunken text-ink',
                            )}
                          >
                            {!message.is_mine && (
                              <p className="mb-0.5 text-[11.5px] font-bold text-muted">
                                {message.sender_name}
                              </p>
                            )}
                            <p className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed">
                              {message.body}
                            </p>
                            <p
                              className={cn(
                                'mt-1 flex items-center justify-end gap-1 text-[10.5px]',
                                message.is_mine ? 'text-white/45' : 'text-muted',
                              )}
                            >
                              {shortTime(message.created_at)}
                              {message.is_mine && <Check className="h-3 w-3" aria-hidden />}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={endRef} />
              </div>

              {can('messages:create') && (
                <form
                  className="flex items-end gap-2 border-t border-line p-3"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (draft.trim()) send.mutate(draft)
                  }}
                >
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      // Enter sends; Shift+Enter is a newline — what everyone expects.
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        if (draft.trim()) send.mutate(draft)
                      }
                    }}
                    rows={1}
                    placeholder="Write a message…  (Enter to send, Shift+Enter for a new line)"
                    aria-label="Message"
                    className="field max-h-32 min-h-[44px] flex-1 resize-none rounded-card"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    loading={send.isPending}
                    disabled={!draft.trim()}
                    aria-label="Send"
                  >
                    {!send.isPending && <Send className="h-4 w-4" aria-hidden />}
                  </Button>
                </form>
              )}
            </>
          )}
        </Card>
      </div>

      <ComposeDrawer
        open={composing}
        onClose={() => setComposing(false)}
        onStarted={(id) => {
          setComposing(false)
          setActiveId(id)
          void client.invalidateQueries({ queryKey: ['threads'] })
        }}
      />
    </Page>
  )
}

function ComposeDrawer({
  open,
  onClose,
  onStarted,
}: {
  open: boolean
  onClose: () => void
  onStarted: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Contact[]>([])
  const [body, setBody] = useState('')
  const [subject, setSubject] = useState('')

  const contacts = useQuery({
    queryKey: ['contacts', search],
    enabled: open,
    queryFn: () => api.get<Contact[]>('/messages/contacts', { search }),
  })

  const start = useMutation({
    mutationFn: () =>
      api.post<any>('/messages/threads', {
        participant_ids: selected.map((c) => c.id),
        subject: selected.length > 1 ? subject : '',
        body,
      }),
    onSuccess: (result) => {
      setSelected([])
      setBody('')
      setSubject('')
      onStarted(result.id)
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not start the conversation'),
  })

  const selectedIds = useMemo(() => new Set(selected.map((c) => c.id)), [selected])

  return (
    <Drawer open={open} onClose={onClose} title="New message" subtitle="Pick who to write to">
      <div className="space-y-4">
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((contact) => (
              <button
                key={contact.id}
                type="button"
                onClick={() => setSelected((prev) => prev.filter((c) => c.id !== contact.id))}
                className="chip bg-ink text-white"
              >
                {contact.full_name} ×
              </button>
            ))}
          </div>
        )}

        <Input
          type="search"
          placeholder="Search people"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          leading={<Search className="h-4 w-4" aria-hidden />}
        />

        <div className="max-h-64 overflow-y-auto rounded-field border border-line">
          {contacts.isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-11" />
              ))}
            </div>
          ) : !contacts.data?.length ? (
            <p className="p-6 text-center text-[13px] text-muted">
              {search ? 'Nobody matches that.' : 'No contacts available.'}
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {contacts.data.map((contact) => (
                <li key={contact.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setSelected((prev) =>
                        selectedIds.has(contact.id)
                          ? prev.filter((c) => c.id !== contact.id)
                          : [...prev, contact],
                      )
                    }
                    className={cn(
                      'flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition',
                      selectedIds.has(contact.id)
                        ? 'bg-surface-sunken'
                        : 'hover:bg-surface-sunken/60',
                    )}
                  >
                    <Avatar name={contact.full_name} src={contact.avatar_url} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-bold text-ink">
                        {contact.full_name}
                      </span>
                      <span className="block truncate text-[11.5px] text-muted">
                        {contact.roles.join(', ') || contact.email}
                      </span>
                    </span>
                    {selectedIds.has(contact.id) && (
                      <Check className="h-4 w-4 shrink-0 text-success" aria-hidden />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selected.length > 1 && (
          <Input
            label="Group subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Class 7 parents — sports day"
          />
        )}

        <Textarea
          label="Message"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write your message…"
        />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => start.mutate()}
            loading={start.isPending}
            disabled={!selected.length || !body.trim()}
          >
            <Send className="h-4 w-4" aria-hidden />
            Send
          </Button>
        </div>
      </div>
    </Drawer>
  )
}

function dayKey(value?: string) {
  return value ? value.slice(0, 10) : ''
}

function dayLabel(value?: string) {
  if (!value) return ''
  const when = parseISO(value)
  if (isToday(when)) return 'Today'
  if (isYesterday(when)) return 'Yesterday'
  return format(when, 'd MMMM yyyy')
}

function shortTime(value?: string) {
  if (!value) return ''
  try {
    const when = parseISO(value)
    return isToday(when) ? format(when, 'h:mm a') : format(when, 'd MMM')
  } catch {
    return ''
  }
}
