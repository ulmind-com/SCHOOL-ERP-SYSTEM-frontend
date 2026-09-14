'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { ChevronDown } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty'
import { Input, Select } from '@/components/ui/input'
import { Page } from '@/components/layout/page'
import { Pagination } from '@/components/ui/pagination'
import { api } from '@/lib/api'
import { cn, titleCase } from '@/lib/utils'

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
              className: 'w-[120px]',
              cell: (row: any) =>
                row.created_at ? (
                  <span className="block whitespace-nowrap text-[13px] font-semibold text-ink">
                    {format(parseISO(row.created_at), 'd MMM')}
                    <span className="ml-1.5 font-normal text-muted">
                      {format(parseISO(row.created_at), 'h:mm a')}
                    </span>
                  </span>
                ) : (
                  '—'
                ),
            },
            {
              key: 'actor_name',
              header: 'Who',
              cell: (row: any) => (
                <div className="flex items-center gap-2.5">
                  <Avatar name={row.actor_name || 'System'} size={28} />
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold text-ink">
                      {row.actor_name || 'System'}
                    </p>
                    {/* An impersonated session writes under the borrowed
                        account, so the real hand has to be named here or the
                        trail reads as if the student did it themselves. */}
                    {row.on_behalf_of_name && (
                      <p className="truncate text-[11.5px] font-semibold text-warning">
                        via {row.on_behalf_of_name}
                      </p>
                    )}
                  </div>
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
              key: 'changes',
              header: 'What changed',
              cell: (row: any) => <Changes changes={row.changes} />,
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

/**
 * The field-level before and after behind an entry.
 *
 * "Someone updated a student" is not an audit trail; "fee concession went from
 * 0 to 100" is. Collapsed by default because most rows have several fields and
 * the table would be unreadable otherwise.
 */
function Changes({ changes }: { changes: Record<string, any> | null | undefined }) {
  const [open, setOpen] = useState(false)
  const entries = Object.entries(changes ?? {})
  if (entries.length === 0) return <span className="text-muted">—</span>

  const fieldDiffs = entries.filter(
    ([, value]) => value && typeof value === 'object' && 'to' in value,
  )
  const plain = entries.filter(([, value]) => !(value && typeof value === 'object' && 'to' in value))

  return (
    <div className="max-w-[320px]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex items-center gap-1 text-[12.5px] font-semibold text-ink-soft
                   underline-offset-4 hover:underline"
      >
        {entries.length} field{entries.length === 1 ? '' : 's'}
        <ChevronDown
          className={cn('h-3 w-3 transition', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open && (
        <dl className="mt-2 space-y-1.5">
          {fieldDiffs.map(([field, value]) => (
            <div key={field} className="rounded-field bg-surface-sunken px-2.5 py-1.5">
              <dt className="text-[11.5px] font-bold text-muted">{titleCase(field)}</dt>
              <dd className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12.5px]">
                <span className="text-danger line-through">{render(value.from)}</span>
                <span className="text-muted" aria-hidden>→</span>
                <span className="font-semibold text-success">{render(value.to)}</span>
              </dd>
            </div>
          ))}
          {plain.map(([field, value]) => (
            <div key={field} className="rounded-field bg-surface-sunken px-2.5 py-1.5">
              <dt className="text-[11.5px] font-bold text-muted">{titleCase(field)}</dt>
              <dd className="mt-0.5 text-[12.5px] font-semibold text-ink">{render(value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

function render(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'empty'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'empty'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
