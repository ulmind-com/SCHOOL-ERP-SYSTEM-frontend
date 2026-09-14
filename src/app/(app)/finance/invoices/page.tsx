'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { AlertTriangle, FileText, Search, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Drawer } from '@/components/ui/drawer'
import { DataTable } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty'
import { Input, Select } from '@/components/ui/input'
import { Page } from '@/components/layout/page'
import { Pagination } from '@/components/ui/pagination'
import { useOptions, useResourceList } from '@/hooks/use-resource'
import { ApiError, api } from '@/lib/api'
import { useSession } from '@/lib/session'
import { money } from '@/lib/utils'

export default function InvoicesPage() {
  const client = useQueryClient()
  const can = useSession((state) => state.can)
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState<any>(null)

  const list = useResourceList<any>('/invoices', { sortBy: 'due_date', sortDir: 'desc' })
  const { data: structures } = useOptions('/fee-structures')
  const { data: classes } = useOptions('/classes')
  const { data: years } = useOptions('/academic-years')

  const generate = useMutation({
    mutationFn: (body: any) => api.post<any>('/fees/generate-invoices', body),
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not raise invoices'),
  })

  const markOverdue = useMutation({
    mutationFn: () => api.post<any>('/fees/mark-overdue'),
    onSuccess: (result) => {
      toast.success(result.detail)
      void client.invalidateQueries({ queryKey: ['/invoices'] })
    },
  })

  function readForm(form: FormData, dryRun: boolean) {
    return {
      fee_structure_id: String(form.get('fee_structure_id') ?? ''),
      academic_year_id: String(form.get('academic_year_id') ?? ''),
      class_id: String(form.get('class_id') ?? '') || null,
      period_label: String(form.get('period_label') ?? '') || null,
      due_date: String(form.get('due_date') ?? '') || null,
      dry_run: dryRun,
    }
  }

  function runPreview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    generate.mutate(readForm(form, true), { onSuccess: (result) => setPreview({ ...result, form: readForm(form, false) }) })
  }

  function commit() {
    if (!preview?.form) return
    generate.mutate(preview.form, {
      onSuccess: (result) => {
        toast.success(result.detail)
        setPreview(null)
        setGenerating(false)
        void client.invalidateQueries({ queryKey: ['/invoices'] })
        void client.invalidateQueries({ queryKey: ['fees-summary'] })
      },
    })
  }

  return (
    <Page
      title="Fee Invoices"
      subtitle={list.data ? `${list.data.meta.total} invoices raised` : 'Billing history'}
      actions={
        can('invoices:create') ? (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => markOverdue.mutate()} loading={markOverdue.isPending}>
              <AlertTriangle className="h-4 w-4" aria-hidden />
              Mark overdue
            </Button>
            <Button onClick={() => setGenerating(true)}>
              <Sparkles className="h-4 w-4" aria-hidden />
              Raise invoices
            </Button>
          </div>
        ) : undefined
      }
    >
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
          <div className="min-w-[220px] flex-1">
            <Input
              type="search"
              placeholder="Search invoice number or period"
              value={list.state.search}
              onChange={(event) => list.setSearch(event.target.value)}
              leading={<Search className="h-4 w-4" aria-hidden />}
              className="rounded-pill border-transparent bg-surface-sunken"
            />
          </div>
          <Select
            aria-label="Status"
            value={list.state.filters.status ?? ''}
            onChange={(event) => list.setFilter('status', event.target.value)}
            containerClassName="w-auto"
            className="min-w-[150px] rounded-pill border-transparent bg-surface-sunken"
          >
            <option value="">Any status</option>
            {['issued', 'partially_paid', 'paid', 'overdue', 'cancelled'].map((value) => (
              <option key={value} value={value}>
                {value.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Class"
            value={list.state.filters.class_id ?? ''}
            onChange={(event) => list.setFilter('class_id', event.target.value)}
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
        </div>

        <DataTable
          columns={[
            {
              key: 'number',
              header: 'Invoice',
              cell: (r) => <span className="tabular font-bold text-ink">{r.number}</span>,
            },
            { key: 'period_label', header: 'Period', cell: (r) => r.period_label || '—' },
            {
              key: 'issue_date',
              header: 'Issued',
              cell: (r) => (r.issue_date ? format(parseISO(r.issue_date), 'd MMM yyyy') : '—'),
            },
            {
              key: 'due_date',
              header: 'Due',
              sortable: true,
              cell: (r) => (r.due_date ? format(parseISO(r.due_date), 'd MMM yyyy') : '—'),
            },
            {
              key: 'total',
              header: 'Total',
              align: 'right',
              sortable: true,
              cell: (r) => money(r.total),
            },
            {
              key: 'paid_amount',
              header: 'Paid',
              align: 'right',
              cell: (r) => money(r.paid_amount),
            },
            {
              key: 'balance',
              header: 'Balance',
              align: 'right',
              cell: (r) => {
                const balance = Number(r.total ?? 0) - Number(r.paid_amount ?? 0)
                return balance > 0 ? (
                  <span className="font-bold text-danger">{money(balance)}</span>
                ) : (
                  <span className="text-muted">—</span>
                )
              },
            },
            { key: 'status', header: 'Status', align: 'center', cell: (r) => <Badge status={r.status} /> },
          ]}
          rows={list.data?.items ?? []}
          loading={list.isLoading}
          sortBy={list.state.sortBy}
          sortDir={list.state.sortDir}
          onSort={list.toggleSort}
          empty={
            <EmptyState
              icon="file-text"
              title="No invoices yet"
              description="Raise invoices for a class from a fee structure to get started."
              action={
                can('invoices:create') ? (
                  <Button onClick={() => setGenerating(true)}>
                    <Sparkles className="h-4 w-4" aria-hidden />
                    Raise invoices
                  </Button>
                ) : undefined
              }
            />
          }
        />
        {list.data && <Pagination meta={list.data.meta} onChange={list.setPage} />}
      </Card>

      <Drawer
        open={generating}
        onClose={() => {
          setGenerating(false)
          setPreview(null)
        }}
        title="Raise invoices"
        subtitle="Preview before committing — re-running a period never double-bills"
        width="lg"
      >
        {preview ? (
          <div className="space-y-4">
            <div className="rounded-card bg-surface-sunken p-4">
              <p className="text-[13.5px] font-semibold text-ink">{preview.detail}</p>
              <p className="tabular mt-1 text-[24px] font-extrabold text-ink">
                {money(preview.total_billed)}
              </p>
              {preview.skipped_existing > 0 && (
                <p className="mt-1 text-[12.5px] text-warning">
                  {preview.skipped_existing} already have an invoice for this period and will be
                  skipped.
                </p>
              )}
            </div>

            <DataTable
              columns={[
                { key: 'name', header: 'Student', cell: (r: any) => <span className="font-bold text-ink">{r.name}</span> },
                { key: 'subtotal', header: 'Subtotal', align: 'right', cell: (r: any) => money(r.subtotal) },
                {
                  key: 'discount',
                  header: 'Discount',
                  align: 'right',
                  cell: (r: any) => (r.discount ? <span className="text-success">−{money(r.discount)}</span> : '—'),
                },
                { key: 'total', header: 'Total', align: 'right', cell: (r: any) => <span className="font-bold text-ink">{money(r.total)}</span> },
              ]}
              rows={preview.preview ?? []}
              empty={<EmptyState icon="users" title="No students matched" />}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setPreview(null)}>
                Back
              </Button>
              <Button onClick={commit} loading={generate.isPending} disabled={!preview.matched}>
                <FileText className="h-4 w-4" aria-hidden />
                Raise {preview.matched} invoice(s)
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={runPreview} className="space-y-4">
            <Select name="fee_structure_id" label="Fee structure" required>
              <option value="">Select a fee structure</option>
              {(structures ?? []).map((option: any) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
            <Select name="academic_year_id" label="Academic year" required>
              <option value="">Select a year</option>
              {(years ?? []).map((option: any) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
            <Select name="class_id" label="Class" hint="Leave blank to bill every class in the structure">
              <option value="">Every class in the structure</option>
              {(classes ?? []).map((option: any) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                name="period_label"
                label="Period"
                placeholder="September 2026"
                hint="Identifies the billing run"
              />
              <Input name="due_date" label="Due date" type="date" />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setGenerating(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={generate.isPending}>
                Preview
              </Button>
            </div>
          </form>
        )}
      </Drawer>
    </Page>
  )
}
