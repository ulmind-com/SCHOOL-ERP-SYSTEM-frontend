'use client'

import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Megaphone, SquareArrowOutUpRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ApiError, api } from '@/lib/api'

/**
 * Publish, close, and a way into the roster.
 *
 * Publishing lives here rather than in the form's status dropdown because it
 * is the moment the class is told the work exists — one door, so that never
 * happens silently.
 */
export function AssignmentActions({ row }: { row: any }) {
  const client = useQueryClient()

  const act = useMutation({
    mutationFn: (what: 'publish' | 'close') =>
      api.post<any>(`/homework/assignments/${row.id}/${what}`, {}),
    onSuccess: (data) => {
      toast.success(data.detail ?? 'Done')
      // The list is keyed by its API path, the same key useResourceList uses.
      void client.invalidateQueries({ queryKey: ['/assignments'] })
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'That did not work'),
  })

  return (
    <div className="flex items-center gap-1.5">
      {row.status === 'draft' && (
        <Button
          size="sm"
          variant="secondary"
          loading={act.isPending}
          onClick={() => act.mutate('publish')}
          title="Publish and notify the class"
        >
          <Megaphone className="h-3.5 w-3.5" aria-hidden />
          Publish
        </Button>
      )}
      {row.status === 'published' && (
        <Button
          size="sm"
          variant="ghost"
          loading={act.isPending}
          onClick={() => act.mutate('close')}
          title="Stop accepting it"
        >
          Close
        </Button>
      )}
      <Link href={`/assignments/${row.id}`}>
        <span
          className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-ink/[0.06] px-3
                     text-[13px] font-semibold text-ink transition hover:bg-ink/[0.1]"
        >
          <SquareArrowOutUpRight className="h-3.5 w-3.5" aria-hidden />
          Open
        </span>
      </Link>
    </div>
  )
}
