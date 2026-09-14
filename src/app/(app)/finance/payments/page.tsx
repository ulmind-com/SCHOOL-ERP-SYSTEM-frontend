'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { FileText, Receipt, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Donut, DonutLegend, type Slice } from '@/components/charts/donut'
import { Drawer } from '@/components/ui/drawer'
import { DataTable } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Page } from '@/components/layout/page'
import { Pagination } from '@/components/ui/pagination'
import { StatCard } from '@/components/ui/stat-card'
import { useDownload } from '@/hooks/use-download'
import { useOptions, useResourceList } from '@/hooks/use-resource'
import { ApiError, api } from '@/lib/api'
import { useSession } from '@/lib/session'
import { compactMoney, money, percent, titleCase } from '@/lib/utils'

const METHODS = ['cash', 'upi', 'card', 'net_banking', 'cheque', 'dd', 'bank_transfer']

export default function CollectionPage() {
  const client = useQueryClient()
  const can = useSession((state) => state.can)
  const [collecting, setCollecting] = useState(false)
  const [studentId, setStudentId] = useState('')
  const { download, pending } = useDownload()

  const summary = useQuery({
    queryKey: ['fees-summary'],
    queryFn: () => api.get<any>('/fees/summary'),
  })

  const payments = useResourceList<any>('/payments', {
    sortBy: 'paid_at',
    sortDir: 'desc',
  })

  const { data: students } = useOptions('/students', { status: 'active' })

  const ledger = useQuery({
    queryKey: ['ledger', studentId],
    enabled: Boolean(studentId),
    queryFn: () => api.get<any>(`/fees/ledger/${studentId}`),
  })

  const collect = useMutation({
    mutationFn: (body: unknown) => api.post<any>('/fees/collect', body),
    onSuccess: (result) => {
      toast.success(result.detail)
      setCollecting(false)
      setStudentId('')
      void client.invalidateQueries({ queryKey: ['/payments'] })
      void client.invalidateQueries({ queryKey: ['fees-summary'] })
      void client.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not record the payment'),
  })

  const stats = summary.data
  const slices: Slice[] = stats
    ? [
        { name: 'Collected', value: stats.paid, color: 'rgb(17 18 20)' },
        { name: 'Outstanding', value: stats.outstanding, color: 'rgb(250 238 124)' },
      ]
    : []

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    collect.mutate({
      student_id: studentId,
      amount: Number(form.get('amount')),
      method: String(form.get('method') ?? 'cash'),
      invoice_id: String(form.get('invoice_id') ?? '') || null,
      reference: String(form.get('reference') ?? ''),
      bank_name: String(form.get('bank_name') ?? ''),
      remarks: String(form.get('remarks') ?? ''),
    })
  }

  const outstanding = ledger.data?.totals?.outstanding ?? 0

  return (
    <Page
      title="Fee Collection"
      subtitle="Receipts are numbered automatically and cannot collide"
      actions={
        can('payments:collect') ? (
          <Button onClick={() => setCollecting(true)}>
            <Wallet className="h-4 w-4" aria-hidden />
            Collect payment
          </Button>
        ) : undefined
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          tone="butter"
          icon="wallet"
          label="Collected"
          value={compactMoney(stats?.paid)}
          caption={`${stats?.transactions ?? 0} receipts issued`}
        />
        <StatCard
          tone="blush"
          icon="receipt"
          label="Outstanding"
          value={compactMoney(stats?.outstanding)}
          caption={`${compactMoney(stats?.billed)} billed in total`}
        />
        <StatCard
          tone="lilac"
          icon="trending-up"
          label="Collection Rate"
          value={percent(stats?.collection_rate ?? 0, 0)}
          caption="Paid against billed"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.6fr]">
        <Card>
          <CardHeader title="Billed vs collected" />
          <CardBody className="pt-0">
            {stats?.billed ? (
              <>
                <Donut
                  slices={slices}
                  centerLabel="collected"
                  centerValue={percent(stats.collection_rate, 0)}
                />
                <DonutLegend slices={slices} />
              </>
            ) : (
              <EmptyState icon="receipt" title="Nothing billed yet" />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="By payment method" subtitle="All time" />
          <CardBody className="pt-2">
            {stats?.by_method?.length ? (
              <ul className="space-y-3">
                {stats.by_method.map((row: any) => {
                  const max = Math.max(...stats.by_method.map((r: any) => r.total), 1)
                  return (
                    <li key={row.method} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-[13.5px] font-semibold text-ink-soft">
                        {titleCase(row.method)}
                      </span>
                      <span className="h-2.5 flex-1 overflow-hidden rounded-pill bg-surface-sunken">
                        <span
                          className="block h-full rounded-pill bg-ink"
                          style={{ width: `${(row.total / max) * 100}%` }}
                        />
                      </span>
                      <span className="tabular w-24 shrink-0 text-right text-[13.5px] font-bold text-ink">
                        {money(row.total)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <EmptyState icon="wallet" title="No payments recorded yet" />
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Receipts" subtitle="Most recent first" />
        <DataTable
          columns={[
            {
              key: 'receipt_number',
              header: 'Receipt',
              cell: (r) => <span className="tabular font-bold text-ink">{r.receipt_number}</span>,
            },
            {
              key: 'paid_at',
              header: 'Date',
              sortable: true,
              cell: (r) => (r.paid_at ? format(parseISO(r.paid_at), 'd MMM yyyy, h:mm a') : '—'),
            },
            {
              key: 'invoice_number',
              header: 'Invoice',
              cell: (r) => <span className="tabular">{r.invoice_number || '—'}</span>,
            },
            {
              key: 'method',
              header: 'Method',
              cell: (r) => <Badge tone="neutral">{titleCase(r.method)}</Badge>,
            },
            { key: 'reference', header: 'Reference', cell: (r) => r.reference || '—' },
            {
              key: 'amount',
              header: 'Amount',
              align: 'right',
              sortable: true,
              cell: (r) => <span className="font-bold text-ink">{money(r.amount)}</span>,
            },
            {
              key: 'status',
              header: 'Status',
              align: 'center',
              cell: (r) => <Badge status={r.status} />,
            },
            {
              key: '__print',
              header: '',
              align: 'right',
              cell: (r) => (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Print receipt"
                  loading={pending === `/print/receipt/${r.id}`}
                  onClick={() =>
                    download(`/print/receipt/${r.id}`, `receipt-${r.receipt_number}.pdf`, {
                      open: true,
                    })
                  }
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden />
                </Button>
              ),
            },
          ]}
          rows={payments.data?.items ?? []}
          loading={payments.isLoading}
          sortBy={payments.state.sortBy}
          sortDir={payments.state.sortDir}
          onSort={payments.toggleSort}
          empty={
            <EmptyState
              icon="wallet"
              title="No receipts yet"
              description="Collected payments appear here with their receipt numbers."
            />
          }
        />
        {payments.data && <Pagination meta={payments.data.meta} onChange={payments.setPage} />}
      </Card>

      <Drawer
        open={collecting}
        onClose={() => {
          setCollecting(false)
          setStudentId('')
        }}
        title="Collect payment"
        subtitle="Leave the invoice blank to settle the oldest dues first"
      >
        <form onSubmit={submit} className="space-y-4">
          <Select
            label="Student"
            required
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
          >
            <option value="">Select a student</option>
            {(students ?? []).map((student: any) => (
              <option key={student.id} value={student.id}>
                {student.full_name} · {student.admission_number}
              </option>
            ))}
          </Select>

          {studentId && (
            <div className="rounded-field bg-surface-sunken px-4 py-3">
              <p className="text-[12px] font-semibold text-muted">Outstanding</p>
              <p className="tabular mt-0.5 text-[22px] font-extrabold text-ink">
                {money(outstanding)}
              </p>
              {ledger.data?.invoices?.filter((i: any) => i.balance > 0).length === 0 && (
                <p className="mt-1 text-[12.5px] text-success">Nothing due — fully settled.</p>
              )}
            </div>
          )}

          <Select
            name="invoice_id"
            label="Invoice (optional)"
            disabled={!studentId}
            hint="Leave blank to spread the payment across the oldest dues"
          >
            <option value="">Oldest dues first</option>
            {(ledger.data?.invoices ?? [])
              .filter((invoice: any) => invoice.balance > 0)
              .map((invoice: any) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.number} · {invoice.period_label} · {money(invoice.balance)} due
                </option>
              ))}
          </Select>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              name="amount"
              label="Amount"
              type="number"
              step="any"
              min="1"
              required
              placeholder="0"
              defaultValue={outstanding || undefined}
            />
            <Select name="method" label="Method" defaultValue="cash">
              {METHODS.map((method) => (
                <option key={method} value={method}>
                  {titleCase(method)}
                </option>
              ))}
            </Select>
            <Input name="reference" label="Reference" placeholder="UPI ref / cheque no." />
            <Input name="bank_name" label="Bank" placeholder="Optional" />
          </div>

          <Textarea name="remarks" label="Remarks" placeholder="Optional note for the receipt" />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setCollecting(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={collect.isPending} disabled={!studentId}>
              <Receipt className="h-4 w-4" aria-hidden />
              Record payment
            </Button>
          </div>
        </form>
      </Drawer>
    </Page>
  )
}
