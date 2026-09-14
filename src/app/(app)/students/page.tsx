'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, SlidersHorizontal } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExportButton } from '@/components/resource/export-button'
import { AssignRollNumbers } from '@/components/students/roll-numbers'
import { Card } from '@/components/ui/card'
import { DataTable, type Column } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty'
import { Input, Select } from '@/components/ui/input'
import { Page } from '@/components/layout/page'
import { Pagination } from '@/components/ui/pagination'
import { useOptions, useResourceList } from '@/hooks/use-resource'
import { useSession } from '@/lib/session'
import { money } from '@/lib/utils'

interface StudentRow {
  id: string
  full_name: string
  admission_number: string
  roll_number: string
  status: string
  gender: string
  current_class_id?: string
  current_section_id?: string
  outstanding_amount?: number
  photo?: { url?: string }
  contact?: { phone?: string; email?: string }
}

export default function StudentsPage() {
  const router = useRouter()
  const can = useSession((state) => state.can)
  const list = useResourceList<StudentRow>('/students', { sortBy: 'roll_number' })

  const { data: classes } = useOptions('/classes')
  const { data: sections } = useOptions('/sections', {
    class_id: list.state.filters.current_class_id || undefined,
  })

  const classNames = new Map((classes ?? []).map((c: any) => [c.id, c.name]))
  const sectionNames = new Map((sections ?? []).map((s: any) => [s.id, s.name]))

  const columns: Column<StudentRow>[] = [
    {
      key: 'full_name',
      header: 'Student',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.full_name} src={row.photo?.url} size={38} />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold text-ink">{row.full_name}</p>
            <p className="tabular truncate text-[12px] text-muted">{row.admission_number}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'roll_number',
      header: 'Roll',
      sortable: true,
      align: 'center',
      className: 'w-20',
      cell: (row) => <span className="tabular font-semibold">{row.roll_number || '—'}</span>,
    },
    {
      key: 'class',
      header: 'Class',
      cell: (row) => (
        <span className="font-medium">
          {classNames.get(row.current_class_id ?? '') ?? '—'}
          {row.current_section_id && sectionNames.get(row.current_section_id)
            ? ` · ${sectionNames.get(row.current_section_id)}`
            : ''}
        </span>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      cell: (row) => (
        <span className="tabular text-[13px]">{row.contact?.phone || '—'}</span>
      ),
    },
    {
      key: 'outstanding_amount',
      header: 'Dues',
      align: 'right',
      cell: (row) =>
        row.outstanding_amount ? (
          <span className="font-bold text-danger">{money(row.outstanding_amount)}</span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      cell: (row) => <Badge status={row.status} />,
    },
  ]

  return (
    <Page
      title="Students"
      subtitle={
        list.data ? `${list.data.meta.total} on the register` : 'Loading the register…'
      }
      actions={
        can('students:create') ? (
          <Link href="/students/new">
            <Button size="md">
              <Plus className="h-4 w-4" aria-hidden />
              Add Student
            </Button>
          </Link>
        ) : undefined
      }
    >
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
          <div className="min-w-[220px] flex-1">
            <Input
              type="search"
              placeholder="Search name, admission number or phone"
              value={list.state.search}
              onChange={(event) => list.setSearch(event.target.value)}
              leading={<Search className="h-4 w-4" aria-hidden />}
              className="rounded-pill border-transparent bg-surface-sunken"
            />
          </div>

          <Select
            aria-label="Filter by class"
            value={list.state.filters.current_class_id ?? ''}
            onChange={(event) => {
              list.setFilter('current_class_id', event.target.value)
              list.setFilter('current_section_id', '')
            }}
            containerClassName="w-auto"
            className="min-w-[150px] rounded-pill border-transparent bg-surface-sunken"
          >
            <option value="">All classes</option>
            {(classes ?? []).map((option: any) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Filter by section"
            value={list.state.filters.current_section_id ?? ''}
            onChange={(event) => list.setFilter('current_section_id', event.target.value)}
            containerClassName="w-auto"
            className="min-w-[130px] rounded-pill border-transparent bg-surface-sunken"
          >
            <option value="">All sections</option>
            {(sections ?? []).map((option: any) => (
              <option key={option.id} value={option.id}>
                Section {option.name}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Filter by status"
            value={list.state.filters.status ?? ''}
            onChange={(event) => list.setFilter('status', event.target.value)}
            containerClassName="w-auto"
            className="min-w-[130px] rounded-pill border-transparent bg-surface-sunken"
          >
            <option value="">Any status</option>
            {['active', 'inactive', 'graduated', 'transferred', 'dropped'].map((value) => (
              <option key={value} value={value}>
                {value[0].toUpperCase() + value.slice(1)}
              </option>
            ))}
          </Select>

          {can('students:update') && <AssignRollNumbers />}
          {can('students:export') && (
            <ExportButton path="/students" state={list.state} name="students" />
          )}
        </div>

        <DataTable
          columns={columns}
          rows={list.data?.items ?? []}
          loading={list.isLoading}
          sortBy={list.state.sortBy}
          sortDir={list.state.sortDir}
          onSort={list.toggleSort}
          onRowClick={(row) => router.push(`/students/${row.id}`)}
          empty={
            <EmptyState
              icon="users"
              title={
                list.state.search || list.activeFilters
                  ? 'No students match that'
                  : 'No students yet'
              }
              description={
                list.state.search || list.activeFilters
                  ? 'Try a different search or clear the filters.'
                  : 'Admit your first student to get started.'
              }
              action={
                can('students:create') && !list.state.search ? (
                  <Link href="/students/new">
                    <Button>
                      <Plus className="h-4 w-4" aria-hidden />
                      Add Student
                    </Button>
                  </Link>
                ) : undefined
              }
            />
          }
        />

        {list.data && <Pagination meta={list.data.meta} onChange={list.setPage} />}
      </Card>
    </Page>
  )
}
