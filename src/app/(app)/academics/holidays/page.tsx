'use client'

import { useQuery } from '@tanstack/react-query'
import { ResourceScreen } from '@/components/resource/resource-screen'
import { HolidayConflicts } from '@/components/academics/holiday-conflicts'
import { HOLIDAYS } from '@/components/resource/defs-more'
import { api } from '@/lib/api'

/**
 * The list, plus a notice for any closed holiday that already has registers
 * inside it — the case a school hits whenever it declares one after the fact.
 */
export default function Screen() {
  const list = useQuery({
    queryKey: ['holidays-for-conflicts'],
    queryFn: () => api.get<any>('/holidays', { page_size: 100, is_active: true }),
  })

  const closed = (list.data?.items ?? []).filter(
    (holiday: any) => holiday.attendance_required === false,
  )

  return (
    <ResourceScreen
      def={HOLIDAYS}
      prefix={
        closed.length > 0 ? (
          <div className="space-y-3">
            {closed.map((holiday: any) => (
              <HolidayConflicts key={holiday.id} holiday={holiday} />
            ))}
          </div>
        ) : undefined
      }
    />
  )
}
