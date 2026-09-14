'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { CalendarClock, CreditCard, FileText, Receipt, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty'
import { Loader } from '@/components/ui/loader'
import { Page } from '@/components/layout/page'
import { StatCard } from '@/components/ui/stat-card'
import { TabSwitcher } from '@/components/resource/tab-switcher'
import { useDownload } from '@/hooks/use-download'
import { ApiError, api } from '@/lib/api'
import { cn, money } from '@/lib/utils'

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

const CYCLE_LABEL: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  half_yearly: 'Half-yearly',
  semester: 'Per semester',
  yearly: 'Yearly',
  one_time: 'One-time',
}

const STATUS_TONE: Record<string, string> = {
  paid: 'border-success/25 bg-success/[0.04]',
  overdue: 'border-danger/30 bg-danger/[0.04]',
  partially_paid: 'border-warning/30 bg-warning/[0.05]',
  due: 'border-ink/15 bg-surface',
  scheduled: 'border-line bg-surface-sunken',
}

/**
 * What a family owes, on the schedule their institution actually charges.
 *
 * The instalments come from the fee structure rather than from invoices, so a
 * student sees the whole year — a school's twelve months, a college's two
 * semesters — including the ones the office has not raised yet. Only a raised
 * instalment can be paid; the rest are there so nobody is surprised.
 */
export default function PortalFeesPage() {
  const { download, pending } = useDownload()
  const [index, setIndex] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['portal-fees'],
    queryFn: () => api.get<any>('/portal/fees'),
  })

  const gateway = useQuery({
    queryKey: ['payment-status'],
    queryFn: () => api.get<any>('/payments/online/status'),
  })

  const students: any[] = data?.students ?? []
  const current = students[index]
  const pay = usePayment(current?.student?.id)

  useEffect(() => {
    if (index >= students.length) setIndex(0)
  }, [index, students.length])

  const instalments: any[] = current?.plan?.instalments ?? []
  const totals = current?.plan?.totals ?? {}
  const payments: any[] = current?.ledger?.payments ?? []
  const nextDue = current?.plan?.next_due

  const cycles = useMemo<string[]>(() => {
    const seen = new Set<string>()
    for (const structure of current?.plan?.structures ?? []) {
      for (const cycle of structure.cycles ?? []) seen.add(String(cycle))
    }
    return [...seen]
  }, [current])

  if (isLoading) {
    return (
      <Page title="Fees & Payments">
        <Loader message="Working out what you owe…" />
      </Page>
    )
  }

  if (!current) {
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
      subtitle={[
        current.student.full_name,
        current.plan.academic_year,
        cycles.length ? cycles.map((c: string) => CYCLE_LABEL[c] ?? c).join(' + ') : null,
      ]
        .filter(Boolean)
        .join(' · ')}
      actions={
        nextDue && gateway.data?.enabled ? (
          <Button
            size="lg"
            loading={pay.isPending}
            onClick={() => pay.mutate({ invoiceId: nextDue.invoice_id })}
          >
            <CreditCard className="h-4 w-4" aria-hidden />
            Pay {money(nextDue.balance)}
          </Button>
        ) : undefined
      }
    >
      {students.length > 1 && (
        <TabSwitcher
          tabs={students.map((s: any) => s.student.full_name)}
          active={current.student.full_name}
          onChange={(name) =>
            setIndex(students.findIndex((s: any) => s.student.full_name === name))
          }
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          tone={totals.due_now > 0 ? 'blush' : 'mint'}
          icon="wallet"
          label="Due now"
          value={money(totals.due_now ?? 0)}
          caption={
            totals.overdue > 0
              ? `${money(totals.overdue)} of it is past its date`
              : totals.due_now > 0
                ? 'Raised and awaiting payment'
                : 'Nothing outstanding — thank you'
          }
        />
        <StatCard tone="mint" icon="receipt" label="Paid so far" value={money(totals.paid ?? 0)} />
        <StatCard
          tone="lilac"
          icon="calendar-clock"
          label="Still to come"
          value={money(totals.not_yet_raised ?? 0)}
          caption="Scheduled but not yet billed"
        />
        <StatCard
          tone="butter"
          icon="file-text"
          label="This year"
          value={money(totals.year ?? 0)}
          caption={current.plan.structures?.[0]?.name ?? 'Fee plan'}
        />
      </div>

      {!gateway.data?.enabled && totals.due_now > 0 && (
        <Card>
          <CardBody className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden />
            <div>
              <p className="text-[13.5px] font-bold text-ink">Online payment is not switched on</p>
              <p className="mt-0.5 text-[13px] text-muted">
                Pay at the school office and the receipt will appear here.
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Your instalments"
          subtitle="Every payment this year, in the order they fall due"
        />
        <CardBody className="pt-2">
          {instalments.length === 0 ? (
            <EmptyState
              icon="wallet"
              title="No fee plan set up yet"
              description="Once the school assigns a fee structure to your class, the whole year appears here."
            />
          ) : (
            <ol className="space-y-2">
              {instalments.map((item: any) => (
                <Instalment
                  key={`${item.cycle}-${item.period_label}`}
                  item={item}
                  canPay={Boolean(gateway.data?.enabled)}
                  paying={pay.isPending && pay.variables?.invoiceId === item.invoice_id}
                  onPay={() => pay.mutate({ invoiceId: item.invoice_id })}
                  downloading={pending === `/print/invoice/${item.invoice_id}`}
                  onDownload={() =>
                    download(
                      `/print/invoice/${item.invoice_id}`,
                      `invoice-${item.invoice_number}.pdf`,
                      { open: true },
                    )
                  }
                />
              ))}
            </ol>
          )}
        </CardBody>
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
                  variant="secondary"
                  loading={pending === `/print/receipt/${row.id}`}
                  onClick={() =>
                    download(`/print/receipt/${row.id}`, `receipt-${row.receipt_number}.pdf`, {
                      open: true,
                    })
                  }
                >
                  <Receipt className="h-3.5 w-3.5" aria-hidden />
                  PDF
                </Button>
              ),
            },
          ]}
          rows={payments}
          empty={
            <EmptyState
              icon="wallet"
              title="No payments yet"
              description="A receipt is issued the moment a payment is recorded."
            />
          }
        />
      </Card>
    </Page>
  )
}

function Instalment({
  item,
  canPay,
  paying,
  onPay,
  downloading,
  onDownload,
}: {
  item: any
  canPay: boolean
  paying: boolean
  onPay: () => void
  downloading: boolean
  onDownload: () => void
}) {
  const due = parseISO(item.due_date)
  const days = differenceInCalendarDays(due, new Date())
  // Nothing that has not been billed is late — calling it overdue alarms a
  // family about a payment the office has not asked for.
  const when = !item.raised
    ? 'Not billed yet'
    : item.status === 'paid'
      ? 'Settled'
      : days < 0
        ? `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`
        : days === 0
          ? 'Due today'
          : `in ${days} day${days === 1 ? '' : 's'}`

  return (
    <li
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card border px-4 py-3',
        STATUS_TONE[item.status] ?? STATUS_TONE.due,
      )}
    >
      <div className="min-w-[160px] flex-1">
        <p className="text-[14px] font-bold text-ink">{item.period_label}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-muted">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden />
          {format(due, 'd MMM yyyy')}
          <span aria-hidden>·</span>
          {when}
          {item.lines?.length > 1 && (
            <>
              <span aria-hidden>·</span>
              {item.lines.map((line: any) => line.description).join(', ')}
            </>
          )}
        </p>
      </div>

      <div className="text-right">
        <p className="tabular text-[15px] font-extrabold text-ink">{money(item.amount)}</p>
        {item.paid > 0 && item.balance > 0 && (
          <p className="tabular text-[12px] text-muted">{money(item.paid)} paid</p>
        )}
      </div>

      <StatusChip status={item.status} />

      <div className="flex gap-2">
        {item.raised && (
          <Button size="sm" variant="secondary" loading={downloading} onClick={onDownload}>
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Bill
          </Button>
        )}
        {item.raised && item.balance > 0 && canPay && (
          <Button size="sm" loading={paying} onClick={onPay}>
            Pay {money(item.balance)}
          </Button>
        )}
      </div>
    </li>
  )
}

function StatusChip({ status }: { status: string }) {
  if (status === 'paid') return <Badge tone="success">Paid</Badge>
  if (status === 'overdue') return <Badge tone="danger">Overdue</Badge>
  if (status === 'partially_paid') return <Badge tone="warning">Part paid</Badge>
  if (status === 'due') return <Badge tone="neutral">Due</Badge>
  // Not billed yet — nothing to act on, so it should not look like a demand.
  return <Badge tone="neutral">Scheduled</Badge>
}

/**
 * Opens the gateway's own checkout and confirms the result with the API.
 *
 * The amount is never sent from here — the server reads it off the invoice — so
 * nothing the browser does can change what is charged.
 */
function usePayment(studentId?: string) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: async ({ invoiceId }: { invoiceId?: string }) => {
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
          description: order.invoice_number ? `Invoice ${order.invoice_number}` : 'Fee payment',
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
          modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
        })
        razorpay.open()
      })
    },
    onSuccess: (result) => {
      toast.success(result.detail ?? `Paid — receipt ${result.receipt_number}`)
      void client.invalidateQueries({ queryKey: ['portal-fees'] })
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
