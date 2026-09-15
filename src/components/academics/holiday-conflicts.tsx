'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { CalendarOff, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { ApiError, api } from '@/lib/api'
import { useSession } from '@/lib/session'

/**
 * What to do about registers taken on days a holiday now covers.
 *
 * Schools declare a holiday after the fact, and the registers for those days
 * already say children attended — untrue, and counted against everyone. Rather
 * than fixing it silently, the school is told and asked.
 */
export function HolidayConflicts({ holiday }: { holiday: any }) {
  const client = useQueryClient()
  const can = useSession((state) => state.can)
  const [dismissed, setDismissed] = useState(false)

  const closed = holiday?.attendance_required === false && holiday?.is_active !== false

  const conflicts = useQuery({
    queryKey: ['holiday-conflicts', holiday?.id],
    enabled: Boolean(holiday?.id) && closed,
    queryFn: () => api.get<any>(`/attendance/holidays/${holiday.id}/conflicts`),
  })

  const release = useMutation({
    mutationFn: () => api.post<any>(`/attendance/holidays/${holiday.id}/release`),
    onSuccess: (data) => {
      toast.success(data.detail)
      setDismissed(true)
      void client.invalidateQueries({ queryKey: ['holiday-conflicts', holiday.id] })
      void client.invalidateQueries({ queryKey: ['student-profile'] })
      void client.invalidateQueries({ queryKey: ['portal-me'] })
      void client.invalidateQueries({ queryKey: ['register'] })
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not update those records'),
  })

  const count = conflicts.data?.records ?? 0
  if (!closed || dismissed || count === 0) return null

  return (
    <Card className="border border-warning/30">
      <CardBody className="flex flex-wrap items-start gap-3">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
        <div className="min-w-[240px] flex-1">
          <p className="text-[14px] font-bold text-ink">
            Attendance was already taken during {holiday.name}
          </p>
          <p className="mt-0.5 text-[13px] text-muted">
            {conflicts.data.detail} Those days are still counting for and against every student
            in them.
          </p>
          {conflicts.data.dates?.length > 0 && (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-ink-soft">
              <CalendarOff className="h-3.5 w-3.5 text-muted" aria-hidden />
              {conflicts.data.dates.map((d: string) => format(parseISO(d), 'd MMM')).join(', ')}
            </p>
          )}
        </div>
        {can('attendance:create') && (
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDismissed(true)}>
              Leave them
            </Button>
            <Button size="sm" loading={release.isPending} onClick={() => release.mutate()}>
              Mark as holiday
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
