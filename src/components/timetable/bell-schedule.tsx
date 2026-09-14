'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, GripVertical, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { ApiError, api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Period {
  id?: string
  name: string
  start_time: string
  end_time: string
  order: number
  is_break: boolean
}

/** A default day, offered only when a school has no schedule at all yet. */
const STARTER: Period[] = [
  { name: 'Period 1', start_time: '09:00', end_time: '09:45', order: 1, is_break: false },
  { name: 'Period 2', start_time: '09:45', end_time: '10:30', order: 2, is_break: false },
  { name: 'Short Break', start_time: '10:30', end_time: '10:45', order: 3, is_break: true },
  { name: 'Period 3', start_time: '10:45', end_time: '11:30', order: 4, is_break: false },
  { name: 'Period 4', start_time: '11:30', end_time: '12:15', order: 5, is_break: false },
  { name: 'Lunch', start_time: '12:15', end_time: '13:00', order: 6, is_break: true },
  { name: 'Period 5', start_time: '13:00', end_time: '13:45', order: 7, is_break: false },
  { name: 'Period 6', start_time: '13:45', end_time: '14:30', order: 8, is_break: false },
]

/**
 * The bell schedule, editable in place.
 *
 * Periods, their times and which of them are breaks belong to the school — a
 * half-day Saturday, a zero period, a longer lunch. The timetable grid is drawn
 * from whatever is set here, so this is the only place it needs changing.
 */
export function BellScheduleButton({ periods }: { periods: any[] }) {
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<Period[]>([])
  const [removed, setRemoved] = useState<string[]>([])

  function start() {
    const existing = [...(periods ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    setRows(
      existing.length
        ? existing.map((p) => ({
            id: p.id,
            name: p.name ?? '',
            start_time: p.start_time ?? '',
            end_time: p.end_time ?? '',
            order: p.order ?? 0,
            is_break: Boolean(p.is_break),
          }))
        : STARTER.map((p) => ({ ...p })),
    )
    setRemoved([])
    setOpen(true)
  }

  const save = useMutation({
    mutationFn: async () => {
      // Deletions first: a renumbered row could otherwise collide with one that
      // is on its way out.
      for (const id of removed) await api.delete(`/periods/${id}`)
      for (const [index, row] of rows.entries()) {
        const body = {
          name: row.name,
          start_time: row.start_time,
          end_time: row.end_time,
          order: index + 1,
          is_break: row.is_break,
        }
        if (row.id) await api.patch(`/periods/${row.id}`, body)
        else await api.post('/periods', body)
      }
    },
    onSuccess: () => {
      toast.success('Bell schedule saved')
      setOpen(false)
      void client.invalidateQueries({ queryKey: ['options', '/periods'] })
      void client.invalidateQueries({ queryKey: ['timetable'] })
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not save the schedule'),
  })

  function setRow(index: number, patch: Partial<Period>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function move(index: number, by: number) {
    setRows((prev) => {
      const target = index + by
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function remove(index: number) {
    const row = rows[index]
    if (row.id) setRemoved((prev) => [...prev, row.id as string])
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const overlaps = rows.some(
    (row, index) =>
      index > 0 &&
      Boolean(row.start_time) &&
      Boolean(rows[index - 1].end_time) &&
      row.start_time < rows[index - 1].end_time,
  )

  return (
    <>
      <Button variant="secondary" onClick={start}>
        <Clock className="h-4 w-4" aria-hidden />
        Bell schedule
      </Button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Bell schedule"
        subtitle="Periods, break times and the order they run in"
        width="lg"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            {rows.map((row, index) => (
              <div
                key={row.id ?? `new-${index}`}
                className={cn(
                  'grid grid-cols-[auto_1fr_auto] items-end gap-2 rounded-field border border-line px-3 py-2.5',
                  row.is_break && 'bg-surface-sunken',
                )}
              >
                <div className="flex flex-col items-center pb-2 text-[10px] leading-none">
                  <button
                    type="button"
                    aria-label={`Move ${row.name || 'this period'} up`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    className="p-0.5 text-muted transition hover:text-ink disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <GripVertical className="h-3 w-3 text-muted" aria-hidden />
                  <button
                    type="button"
                    aria-label={`Move ${row.name || 'this period'} down`}
                    disabled={index === rows.length - 1}
                    onClick={() => move(index, 1)}
                    className="p-0.5 text-muted transition hover:text-ink disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-[1.6fr_1fr_1fr_auto]">
                  <Input
                    aria-label={`Name of period ${index + 1}`}
                    label={index === 0 ? 'Name' : undefined}
                    value={row.name}
                    onChange={(event) => setRow(index, { name: event.target.value })}
                    placeholder="Period 1"
                  />
                  <Input
                    aria-label={`Start time of period ${index + 1}`}
                    label={index === 0 ? 'From' : undefined}
                    type="time"
                    value={row.start_time}
                    onChange={(event) => setRow(index, { start_time: event.target.value })}
                  />
                  <Input
                    aria-label={`End time of period ${index + 1}`}
                    label={index === 0 ? 'To' : undefined}
                    type="time"
                    value={row.end_time}
                    onChange={(event) => setRow(index, { end_time: event.target.value })}
                  />
                  <label
                    className="flex cursor-pointer items-center gap-2 whitespace-nowrap pb-2.5
                               text-[13px] font-semibold text-ink-soft"
                  >
                    <input
                      type="checkbox"
                      checked={row.is_break}
                      onChange={(event) => setRow(index, { is_break: event.target.checked })}
                      className="h-4 w-4 rounded border-line accent-[rgb(17_18_20)]"
                    />
                    Break
                  </label>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label={`Remove ${row.name || 'this period'}`}
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              setRows((prev) => [
                ...prev,
                {
                  name: `Period ${prev.filter((r) => !r.is_break).length + 1}`,
                  start_time: prev.at(-1)?.end_time ?? '09:00',
                  end_time: '',
                  order: prev.length + 1,
                  is_break: false,
                },
              ])
            }
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add a period
          </Button>

          {overlaps && (
            <p className="rounded-field bg-warning/10 px-3 py-2 text-[12.5px] font-medium text-warning">
              Some periods start before the one above them ends. That is allowed — parallel
              sessions do exist — but check it is what you meant.
            </p>
          )}

          <p className="text-[12.5px] text-muted">
            Breaks run across the whole week and cannot hold a lesson. Removing a period leaves
            any lessons already placed in it without a slot.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!rows.length}>
              Save schedule
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  )
}
