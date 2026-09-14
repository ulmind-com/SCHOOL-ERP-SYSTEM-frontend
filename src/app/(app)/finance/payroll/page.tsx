'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Banknote, FileText, Play } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { ConfirmDialog, Drawer } from '@/components/ui/drawer'
import { DataTable } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty'
import { Input, Select } from '@/components/ui/input'
import { Page } from '@/components/layout/page'
import { Pagination } from '@/components/ui/pagination'
import { useResourceList } from '@/hooks/use-resource'
import { ApiError, api, tokens } from '@/lib/api'
import { useSession } from '@/lib/session'
import { cn, money, titleCase } from '@/lib/utils'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function PayrollPage() {
  const client = useQueryClient()
  const can = useSession((state) => state.can)
  const [generating, setGenerating] = useState(false)
  const [openRun, setOpenRun] = useState<string | null>(null)
  const [approving, setApproving] = useState<string | null>(null)
  const [paying, setPaying] = useState<string | null>(null)

  const runs = useResourceList<any>('/payroll/runs', { sortBy: 'period', sortDir: 'desc' })

  const detail = useQuery({
    queryKey: ['payroll-run', openRun],
    enabled: Boolean(openRun),
    queryFn: () => api.get<any>(`/payroll/runs/${openRun}/payslips`),
  })

  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['/payroll/runs'] })
    if (openRun) void client.invalidateQueries({ queryKey: ['payroll-run', openRun] })
  }

  const generate = useMutation({
    mutationFn: (body: unknown) => api.post<any>('/payroll/generate', body),
    onSuccess: (result) => {
      toast.success(result.detail)
      setGenerating(false)
      setOpenRun(result.run_id)
      refresh()
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not generate payroll'),
  })

  const approve = useMutation({
    mutationFn: (id: string) => api.post<any>(`/payroll/runs/${id}/approve`),
    onSuccess: (result) => {
      toast.success(result.detail)
      setApproving(null)
      refresh()
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not approve'),
  })

  const markPaid = useMutation({
    mutationFn: ({ id, reference }: { id: string; reference: string }) =>
      api.post<any>(`/payroll/runs/${id}/mark-paid`, { reference }),
    onSuccess: (result) => {
      toast.success(result.detail)
      setPaying(null)
      refresh()
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not mark paid'),
  })

  async function downloadPayslip(payslipId: string, label: string) {
    const base = process.env.NEXT_PUBLIC_API_URL ?? ''
    try {
      const response = await fetch(`${base}/api/v1/print/payslip/${payslipId}`, {
        headers: {
          Authorization: `Bearer ${tokens.access()}`,
          ...(tokens.tenant() ? { 'X-Tenant': tokens.tenant()! } : {}),
        },
      })
      if (!response.ok) throw new Error()
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = `payslip-${label}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Could not download the payslip')
    }
  }

  const run = detail.data?.run
  const today = new Date()

  return (
    <Page
      title="Payroll"
      subtitle="Generated from salary structures and staff attendance"
      actions={
        can('payroll:create') ? (
          <Button onClick={() => setGenerating(true)}>
            <Play className="h-4 w-4" aria-hidden />
            Run payroll
          </Button>
        ) : undefined
      }
    >
      <Card>
        <CardHeader title="Payroll runs" subtitle="Most recent first" />
        <DataTable
          columns={[
            {
              key: 'period',
              header: 'Period',
              sortable: true,
              cell: (row) => <span className="tabular font-bold text-ink">{row.period}</span>,
            },
            { key: 'staff_count', header: 'Staff', align: 'right' },
            {
              key: 'gross_total',
              header: 'Gross',
              align: 'right',
              cell: (row) => money(row.gross_total),
            },
            {
              key: 'deduction_total',
              header: 'Deductions',
              align: 'right',
              cell: (row) => money(row.deduction_total),
            },
            {
              key: 'net_total',
              header: 'Net',
              align: 'right',
              cell: (row) => <span className="font-bold text-ink">{money(row.net_total)}</span>,
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
              cell: (row) => (
                <div className="flex justify-end gap-1.5">
                  <Button size="sm" variant="secondary" onClick={() => setOpenRun(row.id)}>
                    Payslips
                  </Button>
                  {can('payroll:approve') && row.status === 'processing' && (
                    <Button size="sm" onClick={() => setApproving(row.id)}>
                      Approve
                    </Button>
                  )}
                  {can('payroll:approve') && row.status === 'approved' && (
                    <Button size="sm" onClick={() => setPaying(row.id)}>
                      <Banknote className="h-3.5 w-3.5" aria-hidden />
                      Mark paid
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
          rows={runs.data?.items ?? []}
          loading={runs.isLoading}
          sortBy={runs.state.sortBy}
          sortDir={runs.state.sortDir}
          onSort={runs.toggleSort}
          empty={
            <EmptyState
              icon="banknote"
              title="No payroll run yet"
              description="Run payroll for a month and payslips are generated from each person's salary structure and attendance."
              action={
                can('payroll:create') ? (
                  <Button onClick={() => setGenerating(true)}>
                    <Play className="h-4 w-4" aria-hidden />
                    Run payroll
                  </Button>
                ) : undefined
              }
            />
          }
        />
        {runs.data && <Pagination meta={runs.data.meta} onChange={runs.setPage} />}
      </Card>

      {/* Generate */}
      <Drawer
        open={generating}
        onClose={() => setGenerating(false)}
        title="Run payroll"
        subtitle="Re-running a draft replaces its payslips. An approved run is frozen."
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            generate.mutate({
              year: Number(form.get('year')),
              month: Number(form.get('month')),
            })
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Select name="month" label="Month" defaultValue={String(today.getMonth() + 1)}>
              {MONTHS.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </Select>
            <Input name="year" label="Year" type="number" defaultValue={today.getFullYear()} />
          </div>
          <p className="rounded-field bg-surface-sunken px-3.5 py-3 text-[12.5px] leading-relaxed text-muted">
            Loss of pay is taken from days actually marked absent. An unmarked day counts as
            worked — a gap in the register is a record-keeping problem, not evidence of absence.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setGenerating(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={generate.isPending}>
              Generate payslips
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Payslips */}
      <Drawer
        open={Boolean(openRun)}
        onClose={() => setOpenRun(null)}
        title={run ? `Payslips — ${run.period}` : 'Payslips'}
        subtitle={
          run
            ? `${run.staff_count} staff · net ${money(run.net_total)} · ${titleCase(run.status)}`
            : undefined
        }
        width="lg"
      >
        {detail.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-14" />
            ))}
          </div>
        ) : (
          <ul className="space-y-2">
            {(detail.data?.payslips ?? []).map((slip: any) => (
              <li
                key={slip.id}
                className="flex flex-wrap items-center gap-3 rounded-field border border-line px-3.5 py-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-bold text-ink">
                    {slip.staff_name}
                  </span>
                  <span className="block truncate text-[12px] text-muted">
                    {slip.designation || slip.employee_id} · {slip.present_days ?? 0}/
                    {slip.working_days ?? 0} days
                    {slip.lop_days ? ` · ${slip.lop_days} LOP` : ''}
                  </span>
                </span>
                <span className="text-right">
                  <span className="tabular block text-[14px] font-extrabold text-ink">
                    {money(slip.net_pay)}
                  </span>
                  <span className="tabular block text-[11.5px] text-muted">
                    gross {money(slip.gross)}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => downloadPayslip(slip.id, `${slip.period}-${slip.employee_id}`)}
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden />
                  PDF
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(approving)}
        onClose={() => setApproving(null)}
        onConfirm={() => approving && approve.mutate(approving)}
        title="Approve this payroll run?"
        message="Once approved the payslips are frozen and cannot be regenerated. Check the figures first."
        confirmLabel="Approve"
        loading={approve.isPending}
      />

      <Drawer
        open={Boolean(paying)}
        onClose={() => setPaying(null)}
        title="Mark salaries as paid"
        subtitle="Every member of staff is notified that their payslip is available"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            if (paying) markPaid.mutate({ id: paying, reference: String(form.get('reference')) })
          }}
        >
          <Input
            name="reference"
            label="Payment reference"
            placeholder="Bank transfer batch id"
            hint="Recorded on every payslip in this run"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setPaying(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={markPaid.isPending}>
              <BadgeCheck className="h-4 w-4" aria-hidden />
              Mark paid
            </Button>
          </div>
        </form>
      </Drawer>
    </Page>
  )
}
