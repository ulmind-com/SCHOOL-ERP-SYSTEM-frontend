'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { AlertTriangle, BookUp, Plus, RotateCcw, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Drawer } from '@/components/ui/drawer'
import { DataTable } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty'
import { Input, Select } from '@/components/ui/input'
import { Page } from '@/components/layout/page'
import { Pagination } from '@/components/ui/pagination'
import { ResourceScreen } from '@/components/resource/resource-screen'
import { LIBRARY_ITEMS } from '@/components/resource/defs'
import { StatCard } from '@/components/ui/stat-card'
import { useOptions, useResourceList } from '@/hooks/use-resource'
import { ApiError, api } from '@/lib/api'
import { useSession } from '@/lib/session'
import { cn, money, titleCase } from '@/lib/utils'

const TABS = ['Circulation', 'Catalogue'] as const

export default function LibraryPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Circulation')

  const tabs = (
    <div className="flex flex-wrap gap-1.5">
      {TABS.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => setTab(name)}
          aria-current={tab === name ? 'page' : undefined}
          className={cn(
            'rounded-pill px-4 py-2 text-[13.5px] font-semibold transition',
            tab === name
              ? 'bg-ink text-white'
              : 'bg-surface text-ink-soft shadow-card hover:bg-surface-sunken',
          )}
        >
          {name}
        </button>
      ))}
    </div>
  )

  return tab === 'Catalogue' ? (
    <ResourceScreen def={LIBRARY_ITEMS} prefix={tabs} />
  ) : (
    <Circulation tabs={tabs} />
  )
}

function Circulation({ tabs }: { tabs: React.ReactNode }) {
  const client = useQueryClient()
  const can = useSession((state) => state.can)
  const [issuing, setIssuing] = useState(false)
  const [returning, setReturning] = useState<any>(null)
  const [borrowerType, setBorrowerType] = useState('student')

  const dashboard = useQuery({
    queryKey: ['library-dashboard'],
    queryFn: () => api.get<any>('/library/dashboard'),
  })
  const loans = useResourceList<any>('/library/loans', { sortBy: 'issued_on', sortDir: 'desc' })

  const { data: items } = useOptions('/library/items')
  const { data: students } = useOptions('/students', { status: 'active' })
  const { data: staff } = useOptions('/staff', { status: 'active' })

  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['library-dashboard'] })
    void client.invalidateQueries({ queryKey: ['/library/loans'] })
    void client.invalidateQueries({ queryKey: ['options', '/library/items'] })
  }

  const issue = useMutation({
    mutationFn: (body: unknown) => api.post<any>('/library/issue', body),
    onSuccess: (result) => {
      toast.success(result.detail)
      setIssuing(false)
      refresh()
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not issue'),
  })

  const giveBack = useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      api.post<any>(`/library/loans/${id}/return`, body),
    onSuccess: (result) => {
      toast.success(result.detail)
      setReturning(null)
      refresh()
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not return'),
  })

  const renew = useMutation({
    mutationFn: (id: string) => api.post<any>(`/library/loans/${id}/renew`),
    onSuccess: (result) => {
      toast.success(result.detail)
      refresh()
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not renew'),
  })

  const markOverdue = useMutation({
    mutationFn: () => api.post<any>('/library/mark-overdue'),
    onSuccess: (result) => {
      toast.success(result.detail)
      refresh()
    },
  })

  const stats = dashboard.data

  return (
    <Page
      title="Library"
      subtitle="Issue, return and overdue tracking"
      actions={
        can('library:update') ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => markOverdue.mutate()}
              loading={markOverdue.isPending}
            >
              <AlertTriangle className="h-4 w-4" aria-hidden />
              Flag overdue
            </Button>
            <Button onClick={() => setIssuing(true)}>
              <BookUp className="h-4 w-4" aria-hidden />
              Issue item
            </Button>
          </div>
        ) : undefined
      }
    >
      {tabs}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          tone="butter"
          icon="book-marked"
          label="Catalogue"
          value={stats?.titles ?? 0}
          caption={`${stats?.available_copies ?? 0} of ${stats?.total_copies ?? 0} copies on the shelf`}
        />
        <StatCard
          tone="lilac"
          icon="book-up"
          label="On Loan"
          value={stats?.on_loan ?? 0}
          caption={`${stats?.due_today ?? 0} due back today`}
        />
        <StatCard
          tone="blush"
          icon="triangle-alert"
          label="Overdue"
          value={stats?.overdue ?? 0}
          caption="Borrowers are notified when flagged"
        />
      </div>

      <Card>
        <CardHeader title="Loans" subtitle="Most recent first" />
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
          <Select
            aria-label="Status"
            value={loans.state.filters.status ?? ''}
            onChange={(event) => loans.setFilter('status', event.target.value)}
            containerClassName="w-auto"
            className="min-w-[150px] rounded-pill border-transparent bg-surface-sunken"
          >
            <option value="">Any status</option>
            {['issued', 'overdue', 'returned', 'lost'].map((value) => (
              <option key={value} value={value}>
                {titleCase(value)}
              </option>
            ))}
          </Select>
        </div>

        <DataTable
          columns={[
            {
              key: 'item_title',
              header: 'Item',
              cell: (row) => <span className="font-bold text-ink">{row.item_title}</span>,
            },
            {
              key: 'borrower_name',
              header: 'Borrower',
              cell: (row) => (
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold text-ink">
                    {row.borrower_name}
                  </p>
                  <p className="text-[12px] text-muted">{titleCase(row.borrower_type ?? '')}</p>
                </div>
              ),
            },
            {
              key: 'issued_on',
              header: 'Issued',
              cell: (row) => (row.issued_on ? format(parseISO(row.issued_on), 'd MMM') : '—'),
            },
            {
              key: 'due_date',
              header: 'Due',
              sortable: true,
              cell: (row) => {
                if (!row.due_date) return '—'
                const due = parseISO(row.due_date)
                const late =
                  ['issued', 'overdue'].includes(row.status) &&
                  differenceInCalendarDays(new Date(), due) > 0
                return (
                  <span className={cn('tabular', late && 'font-bold text-danger')}>
                    {format(due, 'd MMM')}
                    {late && ` · ${differenceInCalendarDays(new Date(), due)}d late`}
                  </span>
                )
              },
            },
            {
              key: 'renewed_count',
              header: 'Renewals',
              align: 'center',
              cell: (row) => row.renewed_count ?? 0,
            },
            {
              key: 'fine_amount',
              header: 'Fine',
              align: 'right',
              cell: (row) =>
                row.fine_amount ? (
                  <span className="font-bold text-danger">{money(row.fine_amount)}</span>
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
            {
              key: '__actions',
              header: '',
              align: 'right',
              cell: (row) =>
                can('library:update') && ['issued', 'overdue'].includes(row.status) ? (
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Renew"
                      onClick={() => renew.mutate(row.id)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setReturning(row)}>
                      <Undo2 className="h-3.5 w-3.5" aria-hidden />
                      Return
                    </Button>
                  </div>
                ) : null,
            },
          ]}
          rows={loans.data?.items ?? []}
          loading={loans.isLoading}
          sortBy={loans.state.sortBy}
          sortDir={loans.state.sortDir}
          onSort={loans.toggleSort}
          empty={
            <EmptyState
              icon="book-marked"
              title="Nothing issued yet"
              description="Issue an item from the catalogue to start tracking it."
            />
          }
        />
        {loans.data && <Pagination meta={loans.data.meta} onChange={loans.setPage} />}
      </Card>

      <Drawer
        open={issuing}
        onClose={() => setIssuing(false)}
        title="Issue an item"
        subtitle="Copy counts and borrowing limits are checked automatically"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            issue.mutate({
              item_id: form.get('item_id'),
              borrower_type: borrowerType,
              borrower_id: form.get(borrowerType === 'staff' ? 'staff_id' : 'student_id'),
              due_date: String(form.get('due_date')) || null,
            })
          }}
        >
          <Select name="item_id" label="Item" required>
            <option value="">Select an item</option>
            {(items ?? [])
              .filter((item: any) => (item.available_copies ?? 0) > 0)
              .map((item: any) => (
                <option key={item.id} value={item.id}>
                  {item.title} — {item.available_copies} available
                </option>
              ))}
          </Select>

          <Select
            label="Borrower type"
            value={borrowerType}
            onChange={(event) => setBorrowerType(event.target.value)}
          >
            <option value="student">Student</option>
            <option value="staff">Staff</option>
          </Select>

          {borrowerType === 'student' ? (
            <Select name="student_id" label="Student" required>
              <option value="">Select a student</option>
              {(students ?? []).map((student: any) => (
                <option key={student.id} value={student.id}>
                  {student.full_name} · {student.admission_number}
                </option>
              ))}
            </Select>
          ) : (
            <Select name="staff_id" label="Staff member" required>
              <option value="">Select a staff member</option>
              {(staff ?? []).map((member: any) => (
                <option key={member.id} value={member.id}>
                  {member.full_name} · {member.employee_id}
                </option>
              ))}
            </Select>
          )}

          <Input
            name="due_date"
            label="Due date"
            type="date"
            hint="Leave blank to use the institution's default loan period"
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIssuing(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={issue.isPending}>
              Issue
            </Button>
          </div>
        </form>
      </Drawer>

      <Drawer
        open={Boolean(returning)}
        onClose={() => setReturning(null)}
        title="Return an item"
        subtitle={returning ? `${returning.item_title} — ${returning.borrower_name}` : undefined}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            giveBack.mutate({
              id: returning.id,
              body: {
                condition: form.get('condition'),
                waive_fine: form.get('waive_fine') === 'on',
              },
            })
          }}
        >
          <Select name="condition" label="Condition" defaultValue="good">
            <option value="good">Good — back on the shelf</option>
            <option value="damaged">Damaged — back on the shelf, flagged</option>
            <option value="lost">Lost — removed from stock</option>
          </Select>
          <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] font-semibold text-ink-soft">
            <input
              type="checkbox"
              name="waive_fine"
              className="h-4 w-4 rounded border-line accent-[rgb(17_18_20)]"
            />
            Waive any late fine
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setReturning(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={giveBack.isPending}>
              Confirm return
            </Button>
          </div>
        </form>
      </Drawer>
    </Page>
  )
}
