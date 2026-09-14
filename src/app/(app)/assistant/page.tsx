'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Loader2, Send, Sparkles, Wrench } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty'
import { Page } from '@/components/layout/page'
import { ApiError, api } from '@/lib/api'
import { useSession } from '@/lib/session'
import { cn, firstName, titleCase } from '@/lib/utils'

interface Turn {
  role: 'user' | 'assistant'
  text: string
  tools?: string[]
  error?: boolean
}

export default function AssistantPage() {
  const user = useSession((state) => state.user)
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  // The API's own conversation format, kept so follow-ups keep their context.
  const [history, setHistory] = useState<any[]>([])
  const endRef = useRef<HTMLDivElement>(null)

  const status = useQuery({
    queryKey: ['assistant-status'],
    queryFn: () => api.get<any>('/assistant/status'),
  })

  const ask = useMutation({
    mutationFn: (question: string) =>
      api.post<any>('/assistant/ask', { question, history }),
    onSuccess: (result) => {
      setTurns((prev) => [
        ...prev,
        { role: 'assistant', text: result.answer, tools: result.tools_used },
      ])
      setHistory(result.messages ?? [])
    },
    onError: (error) => {
      setTurns((prev) => [
        ...prev,
        {
          role: 'assistant',
          error: true,
          text:
            error instanceof ApiError
              ? error.message
              : 'The assistant could not be reached.',
        },
      ])
    },
  })

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns.length, ask.isPending])

  function send(question: string) {
    const trimmed = question.trim()
    if (!trimmed || ask.isPending) return
    setTurns((prev) => [...prev, { role: 'user', text: trimmed }])
    setDraft('')
    ask.mutate(trimmed)
  }

  const enabled = status.data?.enabled

  return (
    <Page
      title="Assistant"
      subtitle="Ask about your institution's own data — attendance, fees, results"
    >
      {status.data && !enabled && (
        <Card>
          <CardBody className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-field bg-butter">
              <Sparkles className="h-5 w-5 text-ink" aria-hidden />
            </span>
            <div>
              <p className="text-[15px] font-bold text-ink">Assistant not configured</p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-muted">
                {status.data.detail} Once a key is set, it answers from your live records —
                it reads only what your role can already see, and cannot change anything.
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      <Card className="flex max-h-[calc(100dvh-15rem)] min-h-[460px] flex-col overflow-hidden">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {turns.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center">
              <EmptyState
                icon="sparkles"
                title={`Hello${firstName(user?.full_name) ? `, ${firstName(user?.full_name)}` : ''}`}
                description="Ask a question about your institution. Every answer is drawn from your live records."
              />
              <div className="mt-2 flex max-w-2xl flex-wrap justify-center gap-2">
                {(status.data?.suggestions ?? []).map((suggestion: string) => (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={!enabled}
                    onClick={() => send(suggestion)}
                    className="rounded-pill border border-line bg-surface px-3.5 py-2 text-[12.5px]
                               font-semibold text-ink-soft transition hover:border-ink/20
                               hover:text-ink disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            turns.map((turn, index) => (
              <div
                key={index}
                className={cn('flex gap-3', turn.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {turn.role === 'assistant' && (
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-butter">
                    <Sparkles className="h-4 w-4 text-ink" aria-hidden />
                  </span>
                )}
                <div
                  className={cn(
                    'max-w-[min(42rem,82%)] rounded-card px-4 py-3',
                    turn.role === 'user'
                      ? 'rounded-br-md bg-ink text-white'
                      : turn.error
                        ? 'rounded-bl-md bg-danger/8 text-danger'
                        : 'rounded-bl-md bg-surface-sunken text-ink',
                  )}
                >
                  <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed">
                    {turn.text}
                  </p>
                  {turn.tools && turn.tools.length > 0 && (
                    <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                      <Wrench className="h-3 w-3" aria-hidden />
                      {[...new Set(turn.tools)].map((tool) => (
                        <span key={tool} className="rounded-pill bg-white/70 px-2 py-0.5">
                          {titleCase(tool)}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
                {turn.role === 'user' && (
                  <Avatar name={user?.full_name ?? '?'} size={32} className="mt-0.5" />
                )}
              </div>
            ))
          )}

          {ask.isPending && (
            <div className="flex gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-butter">
                <Sparkles className="h-4 w-4 text-ink" aria-hidden />
              </span>
              <div className="flex items-center gap-2 rounded-card rounded-bl-md bg-surface-sunken px-4 py-3">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" aria-hidden />
                <span className="text-[13px] text-muted">Looking that up…</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          className="flex items-end gap-2 border-t border-line p-3"
          onSubmit={(event) => {
            event.preventDefault()
            send(draft)
          }}
        >
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                send(draft)
              }
            }}
            rows={1}
            disabled={!enabled}
            placeholder={
              enabled ? 'Ask about attendance, fees, results…' : 'Assistant not configured'
            }
            aria-label="Question"
            className="field max-h-32 min-h-[44px] flex-1 resize-none rounded-card"
          />
          <Button
            type="submit"
            size="icon"
            className="h-11 w-11 shrink-0"
            disabled={!enabled || !draft.trim() || ask.isPending}
            aria-label="Ask"
          >
            <Send className="h-4 w-4" aria-hidden />
          </Button>
        </form>
      </Card>

      <p className="px-1 text-[12px] text-muted">
        The assistant reads only what your role can already open, and cannot change any record.
        Check anything you are about to act on.
      </p>
    </Page>
  )
}
