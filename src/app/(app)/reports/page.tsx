'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, Download, FileSpreadsheet, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Donut, DonutLegend } from '@/components/charts/donut'
import { ReportChart } from '@/components/charts/report-chart'
import { DataTable, type Column } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty'
import { Icon } from '@/lib/icons'
import { Input, Select } from '@/components/ui/input'
import { Page } from '@/components/layout/page'
import { useOptions } from '@/hooks/use-resource'
import { api, tokens } from '@/lib/api'
import { cn, money, percent, titleCase } from '@/lib/utils'

const PALETTE = [
  'rgb(17 18 20)', 'rgb(250 238 124)', 'rgb(233 230 252)', 'rgb(251 222 222)',
  'rgb(223 245 229)', 'rgb(219 234 254)', 'rgb(140 144 150)',
]

export default function ReportsPage() {
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})

  const catalogue = useQuery({
    queryKey: ['report-catalogue'],
    queryFn: () => api.get<any>('/reports'),
  })

  const report = useQuery({
    queryKey: ['report', activeKey, filters],
    enabled: Boolean(activeKey),
    queryFn: () => api.get<any>(`/reports/${activeKey}`, filters),
  })

  const { data: classes } = useOptions('/classes')
  const { data: sections } = useOptions('/sections', { class_id: filters.class_id || undefined })
  const { data: exams } = useOptions('/exams')

  const active = useMemo(() => {
    for (const group of catalogue.data?.groups ?? []) {
      const found = group.reports.find((r: any) => r.key === activeKey)
      if (found) return found
    }
    return null
  }, [catalogue.data, activeKey])

  async function download(kind: 'csv' | 'xlsx') {
    if (!activeKey) return
    const base = process.env.NEXT_PUBLIC_API_URL ?? ''
    const query = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v) as [string, string][],
    )
    try {
      // Exports are authenticated, so they cannot be a plain <a href>.
      const response = await fetch(
        `${base}/api/v1/reports/${activeKey}/export.${kind}?${query}`,
        {
          headers: {
            Authorization: `Bearer ${tokens.access()}`,
            ...(tokens.tenant() ? { 'X-Tenant': tokens.tenant()! } : {}),
          },
        },
      )
      if (!response.ok) throw new Error(await response.text())
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${activeKey}.${kind}`
      link.click()
      URL.revokeObjectURL(url)
      toast.success(`${kind.toUpperCase()} downloaded`)
    } catch {
      toast.error('Export failed')
    }
  }

  // ── Catalogue view ──────────────────────────────────────────────────
  if (!activeKey) {
    const groups = (catalogue.data?.groups ?? []).map((group: any) => ({
      ...group,
      reports: group.reports.filter(
        (r: any) =>
          !search ||
          r.title.toLowerCase().includes(search.toLowerCase()) ||
          r.description.toLowerCase().includes(search.toLowerCase()),
      ),
    })).filter((group: any) => group.reports.length)

    return (
      <Page
        title="Reports"
        subtitle={
          catalogue.data ? `${catalogue.data.count} reports available to you` : 'Loading…'
        }
      >
        <Card>
          <div className="border-b border-line px-5 py-4">
            <Input
              type="search"
              placeholder="Search reports"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              leading={<Search className="h-4 w-4" aria-hidden />}
              className="rounded-pill border-transparent bg-surface-sunken"
            />
          </div>
          <CardBody className="space-y-7">
            {catalogue.isLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="skeleton h-28 rounded-card" />
                ))}
              </div>
            ) : !groups.length ? (
              <EmptyState
                icon="bar-chart-3"
                title="No reports match"
                description="Reports appear here for the modules you have access to."
              />
            ) : (
              groups.map((group: any) => (
                <section key={group.group}>
                  <h2 className="mb-3 text-[12px] font-bold uppercase tracking-wide text-muted">
                    {group.group}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {group.reports.map((item: any) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setFilters({})
                          setActiveKey(item.key)
                        }}
                        className="flex items-start gap-3 rounded-card border border-line bg-surface p-4
                                   text-left transition hover:border-ink/20 hover:shadow-card"
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-field bg-surface-sunken">
                          <Icon name={item.icon} className="h-5 w-5 text-ink" strokeWidth={2} aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[14px] font-bold text-ink">{item.title}</span>
                          <span className="mt-0.5 block text-[12.5px] leading-relaxed text-muted">
                            {item.description}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ))
            )}
          </CardBody>
        </Card>
      </Page>
    )
  }

  // ── Single report view ──────────────────────────────────────────────
  const data = report.data
  const columns: Column<any>[] = (data?.columns ?? []).map((column: any) => ({
    key: column.key,
    header: column.label,
    align: column.align,
    cell: (row: any) => renderCell(row[column.key], column.type),
  }))

  const needs = filterSpec(activeKey)

  return (
    <Page
      title={data?.title ?? active?.title ?? 'Report'}
      subtitle={data?.description ?? active?.description}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => setActiveKey(null)}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            All reports
          </Button>
          <Button variant="secondary" onClick={() => download('csv')} disabled={!data?.row_count}>
            <Download className="h-4 w-4" aria-hidden />
            CSV
          </Button>
          <Button onClick={() => download('xlsx')} disabled={!data?.row_count}>
            <FileSpreadsheet className="h-4 w-4" aria-hidden />
            Excel
          </Button>
        </div>
      }
    >
      {needs.length > 0 && (
        <Card>
          <div className="flex flex-wrap items-end gap-3 px-5 py-4">
            {needs.includes('dates') && (
              <>
                <Input
                  label="From"
                  type="date"
                  containerClassName="w-auto"
                  className="min-w-[150px]"
                  value={filters.start ?? ''}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, start: event.target.value }))
                  }
                />
                <Input
                  label="To"
                  type="date"
                  containerClassName="w-auto"
                  className="min-w-[150px]"
                  value={filters.end ?? ''}
                  onChange={(event) => setFilters((prev) => ({ ...prev, end: event.target.value }))}
                />
              </>
            )}
            {needs.includes('class') && (
              <Select
                label="Class"
                containerClassName="w-auto"
                className="min-w-[150px]"
                value={filters.class_id ?? ''}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, class_id: event.target.value, section_id: '' }))
                }
              >
                <option value="">All classes</option>
                {(classes ?? []).map((option: any) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            )}
            {needs.includes('section') && (
              <Select
                label="Section"
                containerClassName="w-auto"
                className="min-w-[140px]"
                value={filters.section_id ?? ''}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, section_id: event.target.value }))
                }
              >
                <option value="">All sections</option>
                {(sections ?? []).map((option: any) => (
                  <option key={option.id} value={option.id}>
                    Section {option.name}
                  </option>
                ))}
              </Select>
            )}
            {needs.includes('exam') && (
              <Select
                label="Exam"
                containerClassName="w-auto"
                className="min-w-[180px]"
                value={filters.exam_id ?? ''}
                onChange={(event) => setFilters((prev) => ({ ...prev, exam_id: event.target.value }))}
              >
                <option value="">Most recent</option>
                {(exams ?? []).map((option: any) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            )}
            {needs.includes('threshold') && (
              <Input
                label="Threshold %"
                type="number"
                min={0}
                max={100}
                containerClassName="w-auto"
                className="min-w-[120px]"
                value={filters.threshold ?? '75'}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, threshold: event.target.value }))
                }
              />
            )}
            {Object.values(filters).some(Boolean) && (
              <Button variant="ghost" size="sm" className="mb-0.5" onClick={() => setFilters({})}>
                Clear
              </Button>
            )}
          </div>
        </Card>
      )}

      {data?.summary?.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.summary.map((item: any) => (
            <div key={item.label} className="rounded-card bg-surface p-5 shadow-card">
              <p className="text-[12.5px] font-semibold text-muted">{item.label}</p>
              <p className="tabular mt-1.5 text-[24px] font-extrabold text-ink">
                {renderCell(item.value, item.type ?? 'number')}
              </p>
            </div>
          ))}
        </div>
      )}

      {data?.charts?.length > 0 && (
        <div
          className={cn(
            'grid gap-4',
            data.charts.length > 1 ? 'lg:grid-cols-2' : '',
          )}
        >
          {data.charts.map((chart: any) => (
            <Card key={chart.title}>
              <CardHeader title={chart.title} />
              <CardBody className="pt-2">
                {chart.type === 'donut' ? (
                  <>
                    <Donut
                      slices={chart.data.map((d: any, i: number) => ({
                        name: d.name,
                        value: d.value,
                        color: PALETTE[i % PALETTE.length],
                      }))}
                      centerLabel={chart.title}
                    />
                    <DonutLegend
                      slices={chart.data.map((d: any, i: number) => ({
                        name: d.name,
                        value: d.value,
                        color: PALETTE[i % PALETTE.length],
                      }))}
                    />
                  </>
                ) : (
                  <ReportChart chart={chart} />
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader
          title="Data"
          subtitle={
            data
              ? `${data.row_count} row${data.row_count === 1 ? '' : 's'} · generated ${format(
                  parseISO(data.generated_at),
                  'd MMM yyyy, h:mm a',
                )}`
              : undefined
          }
        />
        <DataTable
          columns={columns}
          rows={data?.rows ?? []}
          loading={report.isLoading}
          empty={
            <EmptyState
              icon="bar-chart-3"
              title="Nothing to show"
              description="There is no data for this report and these filters."
            />
          }
        />
      </Card>
    </Page>
  )
}

/** Which filters a report actually uses — keeps irrelevant controls off screen. */
function filterSpec(key: string): string[] {
  const spec: Record<string, string[]> = {
    student_roster: ['class', 'section'],
    student_demographics: [],
    staff_directory: [],
    attendance_register: ['dates', 'class', 'section'],
    attendance_defaulters: ['dates', 'class', 'section', 'threshold'],
    daily_attendance: ['dates', 'section'],
    fee_collection: ['dates'],
    fee_outstanding: ['class'],
    fee_by_class: [],
    expense_summary: ['dates'],
    exam_performance: ['exam'],
    student_marksheet: ['exam', 'class', 'section'],
    admission_funnel: ['dates'],
    library_circulation: ['dates'],
    transport_usage: [],
  }
  return spec[key] ?? []
}

function renderCell(value: any, type?: string) {
  if (value === null || value === undefined || value === '') return <span className="text-muted">—</span>
  switch (type) {
    case 'money':
      return <span className="font-semibold">{money(Number(value))}</span>
    case 'percent':
      return (
        <span
          className={cn(
            'font-semibold',
            Number(value) < 75 && Number(value) > 0 ? 'text-danger' : 'text-ink',
          )}
        >
          {percent(Number(value), 1)}
        </span>
      )
    case 'badge':
      return <Badge status={String(value)} />
    case 'number':
      return <span className="tabular">{value}</span>
    case 'date':
      return <span className="tabular">{value}</span>
    default:
      return String(value)
  }
}
