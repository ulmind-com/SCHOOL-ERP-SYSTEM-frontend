'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { CreditCard, FileText, Receipt, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty'
import { Page } from '@/components/layout/page'
import { StatCard } from '@/components/ui/stat-card'
import { TabSwitcher } from '@/components/resource/tab-switcher'
import { useDownload } from '@/hooks/use-download'
import { useOptions } from '@/hooks/use-resource'
import { ApiError, api } from '@/lib/api'
import { money } from '@/lib/utils'

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'
const PAYABLE = ['issued', 'partially_paid', 'overdue']

/**
 * What a family sees: their own bills, and a way to settle them.
 *
 * The list is the same data the bursar's screen shows, narrowed to this family
 * by the API rather than by anything here — a student who opens the network tab
 * still only ever receives their own invoices.
 */
export default function PortalFeesPage() {
  const { download, pending } = useDownload()
  const { data: children } = useOptions('/students')
  const [studentId, setStudentId] = useState('')

  useEffect(() => {
    if (!studentId && children?.length) setStudentId(children[0].id)
  }, [children, studentId])

  const ledger = useQuery({
    queryKey: ['my-ledger', studentId],
    enabled: Boolean(studentId),
    queryFn: () => api.get<any>(`/fees/ledger/${studentId}`),
  })

  const gateway = useQuery({
    queryKey: ['payment-status'],
    queryFn: () => api.get<any>('/payments/online/status'),
  })

  const invoices: any[] = ledger.data?.invoices ?? []
  const payments: any[] = ledger.data?.payments ?? []
  const totals = ledger.data?.totals ?? { billed: 0, paid: 0, outstanding: 0 }

  const unpaid = useMemo(
    () => invoices.filter((invoice) => PAYABLE.includes(invoice.status) && invoice.balance > 0),
    [invoices],
  )
  const overdue = unpaid.filter((invoice) => invoice.status === 'overdue')

  const pay = usePayment(studentId)
  const child = (children ?? []).find((c: any) => c.id === studentId)

  if (!children?.length) {
    return (
      <Page title="Fees & Payments">
        <Card>
          <CardBody>
            <EmptyState
              icon="wallet"
              title="No student linked to this account"
              description="Ask the school office to link your login to a student record."
            />
          </CardBody>
        </Card>
      </Page>
    )
  }

  return (
    <Page
      title="Fees & Payments"
      subtitle={child ? `${child.full_name} · ${child.admission_number}` : 'Your fee account'}
      actions={
        unpaid.length > 0 && gateway.data?.enabled ? (
          <Button
            size="lg"
            loading={pay.isPending}
            onClick={() => pay.mutate({ amount: totals.outstanding })}
          >
            <CreditCard className="h-4 w-4" aria-hidden />
            Pay {money(totals.outstanding)}
          </Button>
        ) : undefined
      }
    >
      {/* A parent with more than one child picks between them. */}
      {children.length > 1 && (
        <TabSwitcher
          tabs={children.map((c: any) => c.full_name)}
          active={child?.full_name ?? ''}
          onChange={(name) =>
            setStudentId(children.find((c: any) => c.full_name === name)?.id ?? '')
          }
        />
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard tone="lilac" icon="receipt" label="Billed" value={money(totals.billed)} />
        <StatCard tone="mint" icon="wallet" label="Paid" value={money(totals.paid)} />
        <StatCard
          tone={totals.outstanding > 0 ? 'blush' : 'mint'}
          icon="triangle-alert"
          label="Outstanding"
          value={money(totals.outstanding)}
          caption={
            overdue.length
              ? `${overdue.length} invoice(s) past their due date`
              : unpaid.length
                ? `${unpaid.length} invoice(s) awaiting payment`
                : 'Nothing due — thank you'
          }
        />
      </div>

      {!gateway.data?.enabled && unpaid.length > 0 && (
        <Card>
          <CardBody className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden />
            <div>
              <p className="text-[13.5px] font-bold text-ink">Online payment is not switched on</p>
              <p className="mt-0.5 text-[13px] text-muted">
                Pay at the school office and the receipt will appear here. {gateway.data?.detail}
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Invoices" subtitle="Newest first" />
        <DataTable
          columns={[
            {
              key: 'number',
              header: 'Invoice',
              cell: (row: any) => <span className="tabular font-bold text-ink">{row.number}</span>,
            },
            { key: 'period_label', header: 'Period', cell: (row: any) => row.period_label || '—' },
            {
              key: 'due_date',
              header: 'Due',
              cell: (row: any) =>
                row.due_date ? format(parseISO(row.due_date), 'd MMM yyyy') : '—',
            },
            {
              key: 'total',
              header: 'Total',
              align: 'right',
              cell: (row: any) => money(row.total),
            },
            {
              key: 'balance',
              header: 'Balance',
              align: 'right',
              cell: (row: any) =>
                row.balance > 0 ? (
                  <span className="font-bold text-danger">{money(row.balance)}</span>
                ) : (
                  <span className="text-muted">Settled</span>
                ),
            },
            {
              key: 'status',
              header: 'Status',
              align: 'center',
              cell: (row: any) => <Badge status={row.status} />,
            },
            {
              key: '__actions',
              header: '',
              align: 'right',
              cell: (row: any) => (
                <div className="flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Download invoice ${row.number}`}
                    loading={pending === `/print/invoice/${row.id}`}
                    onClick={() =>
                      download(`/print/invoice/${row.id}`, `invoice-${row.number}.pdf`, {
                        open: true,
                      })
                    }
                  >
                    <FileText className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                  {row.balance > 0 && gateway.data?.enabled && (
                    <Button
                      size="sm"
                      loading={pay.isPending && pay.variables?.invoiceId === row.id}
                      onClick={() => pay.mutate({ invoiceId: row.id })}
                    >
                      Pay {money(row.balance)}
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
          rows={invoices}
          loading={ledger.isLoading}
          empty={
            <EmptyState
              icon="file-text"
              title="No invoices yet"
              description="Fee invoices will appear here as the school raises them."
            />
          }
        />
      </Card>

      <Card>
        <CardHeader title="Receipts" subtitle="Every payment recorded against this student" />
        <DataTable
          columns={[
            {
              key: 'receipt_number',
              header: 'Receipt',
              cell: (row: any) => (
                <span className="tabular font-bold text-ink">{row.receipt_number}</span>
              ),
            },
            {
              key: 'paid_at',
              header: 'Paid on',
              cell: (row: any) => (row.paid_at ? format(parseISO(row.paid_at), 'd MMM yyyy') : '—'),
            },
            {
              key: 'method',
              header: 'Method',
              cell: (row: any) => <Badge tone="neutral">{String(row.method ?? '')}</Badge>,
            },
            {
              key: 'amount',
              header: 'Amount',
              align: 'right',
              cell: (row: any) => <span className="font-bold text-ink">{money(row.amount)}</span>,
            },
            {
              key: '__print',
              header: '',
              align: 'right',
              cell: (row: any) => (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Download receipt ${row.receipt_number}`}
                  loading={pending === `/print/receipt/${row.id}`}
                  onClick={() =>
                    download(`/print/receipt/${row.id}`, `receipt-${row.receipt_number}.pdf`, {
                      open: true,
                    })
                  }
                >
                  <Receipt className="h-3.5 w-3.5" aria-hidden />
                </Button>
              ),
            },
          ]}
          rows={payments}
          empty={
            <EmptyState
              icon="wallet"
              title="No payments yet"
              description="Receipts are issued automatically the moment a payment is recorded."
            />
          }
        />
      </Card>
    </Page>
  )
}

/**
 * Opens the gateway's own checkout and confirms the result with the API.
 *
 * The amount is never sent from here — the server reads it off the invoice — so
 * nothing the browser does can change what is charged. A webhook settles the
 * case where the payer closes the tab before the callback fires.
 */
function usePayment(studentId: string) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: async ({ invoiceId }: { invoiceId?: string; amount?: number }) => {
      await loadCheckout()
      const order = await api.post<any>('/payments/online/orders', {
        invoice_id: invoiceId ?? null,
        student_id: invoiceId ? null : studentId,
      })

      return new Promise<any>((resolve, reject) => {
        const razorpay = new (window as any).Razorpay({
          key: order.key_id,
          order_id: order.order_id,
          amount: order.amount_paise,
          currency: order.currency,
          name: order.student_name,
          description: order.invoice_number
            ? `Invoice ${order.invoice_number}`
            : 'Fee payment',
          prefill: order.prefill,
          handler: (response: any) => {
            api
              .post<any>('/payments/online/confirm', {
                order_id: response.razorpay_order_id,
                payment_id: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              })
              .then(resolve, reject)
          },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled')),
          },
        })
        razorpay.open()
      })
    },
    onSuccess: (result) => {
      toast.success(result.detail ?? `Paid — receipt ${result.receipt_number}`)
      void client.invalidateQueries({ queryKey: ['my-ledger'] })
    },
    onError: (error) => {
      if (error instanceof Error && error.message === 'Payment cancelled') return
      toast.error(error instanceof ApiError ? error.message : 'The payment could not be completed')
    },
  })
}

/** The gateway script is loaded on demand — no reason to ship it to every page. */
function loadCheckout(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if ((window as any).Razorpay) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Could not load the payment form')))
      return
    }
    const script = document.createElement('script')
    script.src = CHECKOUT_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load the payment form'))
    document.body.appendChild(script)
  })
}
