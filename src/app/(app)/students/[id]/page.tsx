'use client'

import { use, useRef, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import {
  CalendarCheck,
  FileText,
  IdCard,
  Mail,
  MapPin,
  Phone,
  Receipt,
  Upload,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { AttendanceCalendar } from '@/components/students/attendance-calendar'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty'
import { Select } from '@/components/ui/input'
import { Page } from '@/components/layout/page'
import { useDownload } from '@/hooks/use-download'
import { useOptions } from '@/hooks/use-resource'
import { ApiError, api } from '@/lib/api'
import { useSession } from '@/lib/session'
import { cn, money, percent, titleCase } from '@/lib/utils'

const TABS = ['Overview', 'Attendance', 'Fees', 'Results', 'Documents'] as const

const DOCUMENT_CATEGORIES = [
  { value: 'student', label: 'General' },
  { value: 'identity', label: 'Identity proof' },
  { value: 'birth_certificate', label: 'Birth certificate' },
  { value: 'transfer_certificate', label: 'Transfer certificate' },
  { value: 'marksheet', label: 'Marksheet' },
  { value: 'photograph', label: 'Photograph' },
  { value: 'medical', label: 'Medical' },
]
type Tab = (typeof TABS)[number]

export default function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const can = useSession((state) => state.can)
  const [tab, setTab] = useState<Tab>('Overview')
  const { download, pending } = useDownload()
  const { data: exams } = useOptions('/exams')

  const { data, isLoading } = useQuery({
    queryKey: ['student-profile', id],
    queryFn: () => api.get<any>(`/students/${id}/profile`),
  })

  const { data: ledger } = useQuery({
    queryKey: ['student-ledger', id],
    enabled: tab === 'Fees' && can('invoices:read'),
    queryFn: () => api.get<any>(`/fees/ledger/${id}`),
  })

  if (isLoading || !data) {
    return (
      <Page title="Student">
        <div className="skeleton h-[200px] rounded-card" />
        <div className="skeleton h-[340px] rounded-card" />
      </Page>
    )
  }

  return (
    <Page
      title={data.full_name}
      subtitle={`${data.admission_number}${data.roll_number ? ` · Roll ${data.roll_number}` : ''}`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            loading={pending === `/print/id-card/${id}`}
            onClick={() =>
              download(`/print/id-card/${id}`, `id-${data.admission_number}.pdf`, { open: true })
            }
          >
            <IdCard className="h-4 w-4" aria-hidden />
            ID slip
          </Button>
          {exams?.length ? (
            <Button
              variant="secondary"
              loading={pending === `/print/report-card/${id}/${exams[0].id}`}
              onClick={() =>
                download(
                  `/print/report-card/${id}/${exams[0].id}`,
                  `report-card-${data.admission_number}.pdf`,
                  { open: true },
                )
              }
            >
              <FileText className="h-4 w-4" aria-hidden />
              Report card
            </Button>
          ) : null}
          {can('students:update') && (
            <Link href={`/students/${id}/edit`}>
              <Button variant="secondary">Edit</Button>
            </Link>
          )}
        </div>
      }
    >
      {/* Identity header */}
      <Card>
        <CardBody className="flex flex-wrap items-start gap-5">
          <Avatar name={data.full_name} src={data.photo?.url} size={88} />
          <div className="min-w-[200px] flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[22px] font-extrabold tracking-tight text-ink">
                {data.full_name}
              </h2>
              <Badge status={data.status} />
            </div>
            <p className="mt-1 text-[13.5px] text-muted">
              {data.school_class?.name ?? 'No class'}
              {data.section ? ` · Section ${data.section.name}` : ''}
              {data.age ? ` · ${data.age} years` : ''}
              {data.gender ? ` · ${titleCase(data.gender)}` : ''}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink-soft">
              {data.contact?.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted" aria-hidden />
                  {data.contact.phone}
                </span>
              )}
              {data.contact?.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted" aria-hidden />
                  {data.contact.email}
                </span>
              )}
              {data.address?.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted" aria-hidden />
                  {data.address.city}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Tile
              icon={<CalendarCheck className="h-4 w-4" aria-hidden />}
              label="Attendance"
              value={percent(data.attendance.percentage, 0)}
              tone="mint"
            />
            <Tile
              icon={<Receipt className="h-4 w-4" aria-hidden />}
              label="Outstanding"
              value={money(data.fees.outstanding)}
              tone={data.fees.outstanding > 0 ? 'blush' : 'mint'}
            />
            <Tile
              icon={<User className="h-4 w-4" aria-hidden />}
              label="Login"
              value={data.login ? titleCase(data.login.status) : 'None'}
              tone="lilac"
            />
          </div>
        </CardBody>
      </Card>

      {/* Tabs */}
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

      {tab === 'Overview' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Personal details" />
            <CardBody className="pt-2">
              <dl className="grid gap-3 sm:grid-cols-2">
                <Detail label="Date of birth" value={fmtDate(data.date_of_birth)} />
                <Detail label="Gender" value={titleCase(data.gender ?? '')} />
                <Detail label="Blood group" value={data.medical?.blood_group} />
                <Detail label="Category" value={data.category} />
                <Detail label="Religion" value={data.religion} />
                <Detail label="Nationality" value={data.nationality} />
                <Detail label="Admitted on" value={fmtDate(data.admission_date)} />
                <Detail label="House" value={data.house} />
              </dl>
              {data.address?.line1 && (
                <div className="mt-4 rounded-field bg-surface-sunken px-3.5 py-3">
                  <p className="text-[12px] font-semibold text-muted">Address</p>
                  <p className="mt-0.5 text-[13.5px] font-medium text-ink">
                    {[data.address.line1, data.address.line2, data.address.city,
                      data.address.state, data.address.postal_code]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Parents & guardians" />
            <CardBody className="pt-2">
              {data.guardians?.length ? (
                <ul className="space-y-3">
                  {data.guardians.map((guardian: any) => (
                    <li
                      key={guardian.id}
                      className="flex items-center gap-3 rounded-field bg-surface-sunken px-3.5 py-3"
                    >
                      <Avatar name={guardian.full_name} size={38} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-bold text-ink">
                          {guardian.full_name}
                        </p>
                        <p className="truncate text-[12.5px] text-muted">
                          {titleCase(guardian.relation ?? '')}
                          {guardian.occupation ? ` · ${guardian.occupation}` : ''}
                        </p>
                      </div>
                      {guardian.contact?.phone && (
                        <a
                          href={`tel:${guardian.contact.phone}`}
                          className="tabular shrink-0 text-[13px] font-semibold text-ink-soft
                                     underline-offset-4 hover:underline"
                        >
                          {guardian.contact.phone}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon="users-round"
                  title="No guardians linked"
                  description="Add a parent or guardian so they can follow this student's progress."
                />
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {tab === 'Attendance' && (
        <Card>
          <CardHeader title="Attendance summary" subtitle="This academic year" />
          <CardBody className="pt-2">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <Detail label="Days marked" value={String(data.attendance.total_days)} />
              <Detail label="Present" value={String(data.attendance.present)} />
              <Detail label="Absent" value={String(data.attendance.absent)} />
              <Detail label="Late" value={String(data.attendance.late)} />
              <Detail label="Percentage" value={percent(data.attendance.percentage, 1)} />
            </div>
            {data.attendance_days?.length ? (
              <div className="mt-5 border-t border-line pt-5">
                <p className="mb-3 text-[13px] font-bold text-ink">Day by day</p>
                <AttendanceCalendar days={data.attendance_days} />
              </div>
            ) : (
              <EmptyState
                className="mt-4"
                icon="check-square"
                title="No attendance recorded"
                description="Attendance will appear here once a register is taken for this student's section."
              />
            )}
          </CardBody>
        </Card>
      )}

      {tab === 'Fees' && (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Fee summary"
              subtitle="An invoice is a bill the school raised; a receipt is proof of a payment against one."
            />
            <CardBody className="grid gap-3 pt-2 sm:grid-cols-4">
              <Detail label="Invoices" value={String(data.fees.invoices)} />
              <Detail label="Billed" value={money(data.fees.billed)} />
              <Detail label="Paid" value={money(data.fees.paid)} />
              <Detail label="Outstanding" value={money(data.fees.outstanding)} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Invoices — what the school has charged"
              subtitle="One per billing period. The balance is what is still owed on it."
            />
            <DataTable
              columns={[
                { key: 'number', header: 'Invoice' },
                { key: 'period_label', header: 'Period' },
                {
                  key: 'due_date',
                  header: 'Due',
                  cell: (row: any) => fmtDate(row.due_date),
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
                      <span className="text-muted">—</span>
                    ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  align: 'center',
                  cell: (row: any) => <Badge status={row.status} />,
                },
                {
                  key: '__print',
                  header: '',
                  align: 'right',
                  cell: (row: any) => (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={pending === `/print/invoice/${row.id}`}
                      onClick={() =>
                        download(`/print/invoice/${row.id}`, `invoice-${row.number}.pdf`, {
                          open: true,
                        })
                      }
                    >
                      <FileText className="h-3.5 w-3.5" aria-hidden />
                      Bill
                    </Button>
                  ),
                },
              ]}
              rows={ledger?.invoices ?? []}
              empty={<EmptyState icon="file-text" title="No invoices raised yet" />}
            />
          </Card>

          <Card>
            <CardHeader
              title="Receipts — what has been paid"
              subtitle="Issued automatically on every payment, and numbered so two cannot collide."
            />
            <DataTable
              columns={[
                { key: 'receipt_number', header: 'Receipt' },
                {
                  key: 'paid_at',
                  header: 'Date',
                  cell: (row: any) => fmtDate(row.paid_at),
                },
                {
                  key: 'method',
                  header: 'Method',
                  cell: (row: any) => <Badge tone="neutral">{titleCase(row.method)}</Badge>,
                },
                {
                  key: 'amount',
                  header: 'Amount',
                  align: 'right',
                  cell: (row: any) => (
                    <span className="font-bold text-ink">{money(row.amount)}</span>
                  ),
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
                      Receipt
                    </Button>
                  ),
                },
              ]}
              rows={ledger?.payments ?? []}
              empty={<EmptyState icon="wallet" title="No payments recorded" />}
            />
          </Card>
        </div>
      )}

      {tab === 'Results' && (
        <div className="space-y-4">
          {/* Marks first: they exist as soon as a teacher enters them, whereas a
              report card only appears once the exam is published. */}
          {data.exam_results?.length ? (
            data.exam_results.map((exam: any) => (
              <Card key={exam.exam_id}>
                <CardHeader
                  title={exam.exam_name}
                  subtitle={[titleCase(exam.exam_type ?? ''), titleCase(exam.status ?? '')]
                    .filter(Boolean)
                    .join(' · ')}
                  action={
                    <div className="flex items-center gap-3">
                      <span className="tabular text-[13.5px] font-bold text-ink">
                        {exam.obtained} / {exam.max_marks}
                      </span>
                      {exam.percentage !== null && (
                        <Badge tone={exam.percentage >= 33 ? 'success' : 'danger'}>
                          {percent(exam.percentage, 1)}
                        </Badge>
                      )}
                      {exams?.length ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={pending === `/print/report-card/${id}/${exam.exam_id}`}
                          onClick={() =>
                            download(
                              `/print/report-card/${id}/${exam.exam_id}`,
                              `report-card-${data.admission_number}-${exam.exam_name}.pdf`,
                              { open: true },
                            )
                          }
                        >
                          <FileText className="h-3.5 w-3.5" aria-hidden />
                          PDF
                        </Button>
                      ) : null}
                    </div>
                  }
                />
                <DataTable
                  columns={[
                    {
                      key: 'subject_name',
                      header: 'Subject',
                      cell: (row: any) => (
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-bold text-ink">
                            {row.subject_name}
                          </p>
                          {row.code && <p className="text-[12px] text-muted">{row.code}</p>}
                        </div>
                      ),
                    },
                    {
                      key: 'marks_obtained',
                      header: 'Marks',
                      align: 'right',
                      cell: (row: any) =>
                        row.marks_obtained === null || row.marks_obtained === undefined ? (
                          <span className="text-muted">Not marked</span>
                        ) : (
                          <span className="tabular font-bold text-ink">
                            {row.marks_obtained} / {row.max_marks}
                          </span>
                        ),
                    },
                    {
                      key: 'percentage',
                      header: '%',
                      align: 'right',
                      cell: (row: any) =>
                        row.percentage === null || row.percentage === undefined
                          ? '—'
                          : percent(row.percentage, 1),
                    },
                    {
                      key: 'grade',
                      header: 'Grade',
                      align: 'center',
                      cell: (row: any) => row.grade || '—',
                    },
                    {
                      key: 'is_pass',
                      header: 'Result',
                      align: 'center',
                      cell: (row: any) =>
                        row.is_pass === null || row.is_pass === undefined ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <Badge tone={row.is_pass ? 'success' : 'danger'}>
                            {row.is_pass ? 'Pass' : 'Fail'}
                          </Badge>
                        ),
                    },
                  ]}
                  rows={exam.subjects}
                />
              </Card>
            ))
          ) : (
            <Card>
              <CardBody>
                <EmptyState
                  icon="trophy"
                  title="No marks entered yet"
                  description="Marks appear here as soon as a teacher saves them on the Results screen."
                />
              </CardBody>
            </Card>
          )}

          {data.report_cards?.length ? (
            <Card>
              <CardHeader title="Report cards" subtitle="Published results" />
              <CardBody className="pt-2">
                <ul className="divide-y divide-line">
                  {data.report_cards.map((card: any) => (
                    <li key={card.id} className="flex items-center gap-4 py-3">
                      <span className="flex-1 text-[14px] font-bold text-ink">
                        {card.exam_name ?? 'Examination'}
                      </span>
                      <span className="tabular text-[13.5px] font-semibold text-ink-soft">
                        {percent(card.percentage, 1)}
                      </span>
                      <Badge status={card.result} />
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}
        </div>
      )}

      {tab === 'Documents' && (
        <Card>
          <CardHeader
            title="Documents"
            subtitle="Birth certificates, transfer certificates and photographs"
            action={can('documents:create') ? <UploadButton studentId={id} /> : undefined}
          />
          <CardBody className="pt-2">
            {data.documents?.length ? (
              <ul className="grid gap-2 sm:grid-cols-2">
                {data.documents.map((doc: any) => (
                  <li key={doc.id}>
                    <a
                      href={doc.file?.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-field bg-surface-sunken px-3.5 py-3
                                 transition hover:bg-ink/[0.05]"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold text-ink">
                          {doc.name}
                        </span>
                        <span className="block truncate text-[12px] text-muted">
                          {titleCase(doc.category ?? 'general')}
                          {doc.created_at ? ` · ${fmtDate(doc.created_at)}` : ''}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon="folder"
                title="No documents uploaded"
                description="Birth certificates, transfer certificates and photographs live here."
              />
            )}
          </CardBody>
        </Card>
      )}
    </Page>
  )
}

function fmtDate(value?: string | null) {
  if (!value) return '—'
  try {
    return format(parseISO(value), 'd MMM yyyy')
  } catch {
    return '—'
  }
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-field bg-surface-sunken px-3.5 py-3">
      <dt className="text-[12px] font-semibold text-muted">{label}</dt>
      <dd className="tabular mt-0.5 text-[14px] font-bold text-ink">{value || '—'}</dd>
    </div>
  )
}

function Tile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: 'mint' | 'blush' | 'lilac'
}) {
  const tones = { mint: 'bg-mint', blush: 'bg-blush', lilac: 'bg-lilac' }
  return (
    <div className={cn('min-w-[120px] rounded-field px-3.5 py-3', tones[tone])}>
      <div className="flex items-center gap-1.5 text-ink/60">
        {icon}
        <span className="text-[12px] font-semibold">{label}</span>
      </div>
      <p className="tabular mt-1 text-[17px] font-extrabold text-ink">{value}</p>
    </div>
  )
}

/**
 * Files go to ImageKit through the API, which also files them in the vault
 * against this student — so the same upload shows up here, on the Documents
 * screen, and in the institution's storage total.
 */
function UploadButton({ studentId }: { studentId: string }) {
  const queryClient = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const [category, setCategory] = useState('student')

  const upload = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      form.append('category', category)
      form.append('owner_type', 'student')
      form.append('owner_id', studentId)
      form.append('name', file.name)
      return api.upload<any>('/files/upload', form)
    },
    onSuccess: () => {
      toast.success('Document uploaded')
      queryClient.invalidateQueries({ queryKey: ['student-profile', studentId] })
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not upload that file'),
  })

  return (
    <div className="flex items-center gap-2">
      <Select
        aria-label="Document type"
        value={category}
        onChange={(event) => setCategory(event.target.value)}
        containerClassName="w-auto"
        className="min-w-[150px] rounded-pill border-transparent bg-surface-sunken"
      >
        {DOCUMENT_CATEGORIES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <input
        ref={input}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) upload.mutate(file)
          // Clear it, or picking the same file twice does nothing.
          event.target.value = ''
        }}
      />
      <Button
        variant="secondary"
        size="md"
        loading={upload.isPending}
        onClick={() => input.current?.click()}
      >
        <Upload className="h-4 w-4" aria-hidden />
        Upload
      </Button>
    </div>
  )
}
