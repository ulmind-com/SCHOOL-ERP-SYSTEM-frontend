'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty'
import { Input, Select } from '@/components/ui/input'
import { Page } from '@/components/layout/page'
import { Pagination } from '@/components/ui/pagination'
import { api } from '@/lib/api'
import { titleCase } from '@/lib/utils'

const ENTITIES = [
  'students', 'staff', 'attendance', 'invoices', 'payments', 'users', 'roles',
  'classes', 'sections', 'subjects', 'tenant',
]

export default function AuditPage() {
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('')
  const [entityType, setEntityType] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, action, entityType],
    queryFn: () =>
      api.get<any>('/audit-log', { page, page_size: 50, action, entity_type: entityType }),
  })

  return (
    <Page
      title="Audit Log"
      subtitle={data ? `${data.meta.total} recorded actions` : 'Who changed what, and when'}
    >
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
          <div className="min-w-[200px] flex-1">
            <Input
              type="search"
              placeholder="Filter by action, e.g. students."
              value={action}
              onChange={(event) => {
                setAction(event.target.value)
                setPage(1)
              }}
              className="rounded-pill border-transparent bg-surface-sunken"
            />
          </div>
          <Select
            aria-label="Entity"
            value={entityType}
            onChange={(event) => {
              setEntityType(event.target.value)
              setPage(1)
            }}
            containerClassName="w-auto"
            className="min-w-[150px] rounded-pill border-transparent bg-surface-sunken"
          >
            <option value="">All records</option>
            {ENTITIES.map((value) => (
              <option key={value} value={value}>
                {titleCase(value)}
              </option>
            ))}
          </Select>
        </div>

        <DataTable
          columns={[
            {
              key: 'created_at',
              header: 'When',
              cell: (row: any) =>
                row.created_at ? format(parseISO(row.created_at), 'd MMM yyyy, h:mm a') : '—',
            },
            {
              key: 'actor_name',
              header: 'Who',
              cell: (row: any) => (
                <div className="flex items-center gap-2.5">
                  <Avatar name={row.actor_name || 'System'} size={28} />
                  <span className="truncate text-[13.5px] font-semibold text-ink">
                    {row.actor_name || 'System'}
                  </span>
                </div>
              ),
            },
            {
              key: 'action',
              header: 'Action',
              cell: (row: any) => (
                <span className="tabular text-[13px] font-semibold text-ink">{row.action}</span>
              ),
            },
            {
              key: 'entity_label',
              header: 'Record',
              cell: (row: any) => row.entity_label || '—',
            },
            {
              key: 'entity_type',
              header: 'Type',
              align: 'center',
              cell: (row: any) =>
                row.entity_type ? <Badge tone="neutral">{titleCase(row.entity_type)}</Badge> : '—',
            },
            {
              key: 'ip',
              header: 'IP',
              cell: (row: any) => <span className="tabular text-[12px]">{row.ip || '—'}</span>,
            },
          ]}
          rows={data?.items ?? []}
          loading={isLoading}
          empty={
            <EmptyState
              icon="scroll-text"
              title="Nothing logged yet"
              description="Every create, update and delete is recorded here automatically."
            />
          }
        />
        {data && <Pagination meta={data.meta} onChange={setPage} />}
      </Card>
    </Page>
  )
}
