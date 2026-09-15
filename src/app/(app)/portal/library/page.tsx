'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { BookOpen, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Loader } from '@/components/ui/loader'
import { Page } from '@/components/layout/page'
import { Pagination } from '@/components/ui/pagination'
import { StatCard } from '@/components/ui/stat-card'
import { TabSwitcher } from '@/components/resource/tab-switcher'
import { useResourceList } from '@/hooks/use-resource'
import { api } from '@/lib/api'
import { cn, money } from '@/lib/utils'

const TABS = ['My books', 'Catalogue'] as const

/**
 * A family's own library, not the circulation desk.
 *
 * Reading the catalogue is the point of library:read; seeing who else has
 * borrowed what, when it is due and what they owe in fines is not.
 */
export default function PortalLibraryPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('My books')
  const tabs = <TabSwitcher tabs={TABS} active={tab} onChange={setTab} />

  const loans = useQuery({
    queryKey: ['my-loans'],
    queryFn: () => api.get<any>('/library/loans', { page_size: 100 }),
  })

  const rows: any[] = loans.data?.items ?? []
  const out = rows.filter((row) => ['issued', 'overdue'].includes(row.status))
  const overdue = rows.filter((row) => row.status === 'overdue')
  const fines = rows.reduce(
    (sum, row) => sum + (row.fine_paid ? 0 : Number(row.fine_amount || 0)),
    0,
  )

  if (loans.isLoading) {
    return (
      <Page title="Library">
        <Loader message="Fetching your books…" />
      </Page>
    )
  }

  return (
    <Page title="Library" subtitle="What you have out, and what the library holds">
      {tabs}

      {tab === 'My books' ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              tone="lilac"
              icon="book-up"
              label="With you"
              value={String(out.length)}
              caption={out.length ? 'Return them by the date shown' : 'Nothing borrowed'}
            />
            <StatCard
              tone={overdue.length ? 'blush' : 'mint'}
              icon="triangle-alert"
              label="Overdue"
              value={String(overdue.length)}
              caption={overdue.length ? 'Please return these' : 'All on time'}
            />
            <StatCard
              tone={fines > 0 ? 'blush' : 'mint'}
              icon="wallet"
              label="Fines"
              value={money(fines)}
              caption={fines > 0 ? 'Settle at the library desk' : 'Nothing owing'}
            />
          </div>

          <Card>
            <CardHeader title="Your borrowing" subtitle="Most recent first" />
            <DataTable
              columns={[
                {
                  key: 'item_title',
                  header: 'Book',
                  cell: (row: any) => (
                    <span className="font-bold text-ink">{row.item_title}</span>
                  ),
                },
                {
                  key: 'issued_on',
                  header: 'Taken out',
                  cell: (row: any) =>
                    row.issued_on ? format(parseISO(row.issued_on), 'd MMM') : '—',
                },
                {
                  key: 'due_date',
                  header: 'Due back',
                  cell: (row: any) => {
                    if (!row.due_date) return '—'
                    const due = parseISO(row.due_date)
                    const days = differenceInCalendarDays(new Date(), due)
                    const late = ['issued', 'overdue'].includes(row.status) && days > 0
                    return (
                      <span className={cn('tabular', late && 'font-bold text-danger')}>
                        {format(due, 'd MMM')}
                        {late && ` · ${days}d late`}
                      </span>
                    )
                  },
                },
                {
                  key: 'fine_amount',
                  header: 'Fine',
                  align: 'right',
                  cell: (row: any) =>
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
                  cell: (row: any) => <Badge status={row.status} />,
                },
              ]}
              rows={rows}
              empty={
                <EmptyState
                  icon="book-marked"
                  title="You have not borrowed anything yet"
                  description="Anything the library issues to you shows up here with its return date."
                />
              }
            />
          </Card>
        </>
      ) : (
        <Catalogue />
      )}
    </Page>
  )
}

function Catalogue() {
  const list = useResourceList<any>('/library/items', { sortBy: 'title' })

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
        <div className="min-w-[220px] flex-1">
          <Input
            type="search"
            placeholder="Search by title or author"
            value={list.state.search}
            onChange={(event) => list.setSearch(event.target.value)}
            leading={<Search className="h-4 w-4" aria-hidden />}
            className="rounded-pill border-transparent bg-surface-sunken"
          />
        </div>
      </div>

      <DataTable
        columns={[
          {
            key: 'title',
            header: 'Title',
            sortable: true,
            cell: (row: any) => (
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-field bg-surface-sunken">
                  <BookOpen className="h-4 w-4 text-muted" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-bold text-ink">{row.title}</p>
                  {row.author && <p className="truncate text-[12px] text-muted">{row.author}</p>}
                </div>
              </div>
            ),
          },
          { key: 'category', header: 'Category', cell: (row: any) => row.category || '—' },
          {
            key: 'available_copies',
            header: 'On the shelf',
            align: 'right',
            cell: (row: any) =>
              row.available_copies > 0 ? (
                <span className="font-semibold text-success">
                  {row.available_copies} of {row.total_copies}
                </span>
              ) : (
                <span className="font-semibold text-muted">All out</span>
              ),
          },
        ]}
        rows={list.data?.items ?? []}
        loading={list.isLoading}
        sortBy={list.state.sortBy}
        sortDir={list.state.sortDir}
        onSort={list.toggleSort}
        empty={<EmptyState icon="book-marked" title="Nothing in the catalogue yet" />}
      />
      {list.data && <Pagination meta={list.data.meta} onChange={list.setPage} />}
    </Card>
  )
}
