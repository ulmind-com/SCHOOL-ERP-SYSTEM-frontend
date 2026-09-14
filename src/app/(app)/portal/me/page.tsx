'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { FileText, IdCard, Mail, MapPin, Phone } from 'lucide-react'
import { AttendanceCalendar } from '@/components/students/attendance-calendar'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty'
import { Page } from '@/components/layout/page'
import { StatCard } from '@/components/ui/stat-card'
import { TabSwitcher } from '@/components/resource/tab-switcher'
import { useDownload } from '@/hooks/use-download'
import { api } from '@/lib/api'
import { money, percent, titleCase } from '@/lib/utils'

const TABS = ['Overview', 'Attendance', 'Results', 'Documents'] as const

/**
 * A family's own record.
 *
 * Everything arrives in one request — on a free-tier cold start, a home screen
 * that made eight would spend its first two seconds doing nothing useful.
 */
export default function MyRecordPage() {
  const { download, pending } = useDownload()
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview')
  const [index, setIndex] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['portal-me'],
    queryFn: () => api.get<any>('/portal/me'),
  })

  const students: any[] = data?.students ?? []
  const student = students[index]
  const isParent = Boolean(data?.viewer?.is_parent)

  const latestExam = useMemo(() => {
    const exams = student?.exam_results ?? []
    return exams.length ? exams[exams.length - 1] : null
  }, [student])

  if (isLoading) {
    return (
      <Page title="My Record">
        <div className="skeleton h-[180px] rounded-card" />
        <div className="skeleton h-[320px] rounded-card" />
      </Page>
    )
  }

  if (!student) {
    return (
      <Page title="My Record">
        <Card>
          <CardBody>
            <EmptyState
              icon="user"
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
      title={isParent ? student.full_name : 'My Record'}
      subtitle={[
        student.school_class?.name,
        student.section ? `Section ${student.section.name}` : null,
        student.admission_number,
        student.roll_number ? `Roll ${student.roll_number}` : null,
      ]
        .filter(Boolean)
        .join(' · ')}
      actions={
        <Button
          variant="secondary"
          loading={pending === `/print/id-card/${student.id}`}
          onClick={() =>
            download(`/print/id-card/${student.id}`, `id-${student.admission_number}.pdf`, {
              open: true,
            })
          }
        >
          <IdCard className="h-4 w-4" aria-hidden />
          ID card
        </Button>
      }
    >
      {/* A parent with more than one child picks between them. */}
      {students.length > 1 && (
        <TabSwitcher
          tabs={students.map((s: any) => s.full_name)}
          active={student.full_name}
          onChange={(name) => setIndex(students.findIndex((s: any) => s.full_name === name))}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          tone="mint"
          icon="check-square"
          label="Attendance"
          value={percent(student.attendance?.percentage, 0)}
          caption={`${student.attendance?.present ?? 0} of ${
            student.attendance?.total_days ?? 0
          } days present`}
        />
        <StatCard
          tone={student.fees?.outstanding > 0 ? 'blush' : 'mint'}
          icon="wallet"
          label="Fees due"
          value={money(student.fees?.outstanding ?? 0)}
          caption={
            student.fees?.outstanding > 0
              ? `${money(student.fees?.paid ?? 0)} paid of ${money(student.fees?.billed ?? 0)}`
              : 'Nothing outstanding'
          }
        />
        <StatCard
          tone="butter"
          icon="trophy"
          label={latestExam ? latestExam.exam_name : 'Latest result'}
          value={latestExam?.percentage != null ? percent(latestExam.percentage, 1) : '—'}
          caption={
            latestExam
              ? `${latestExam.obtained} of ${latestExam.max_marks} marks`
              : 'No marks entered yet'
          }
        />
        <StatCard
          tone="lilac"
          icon="folder"
          label="Documents"
          value={String(student.documents?.length ?? 0)}
          caption="Certificates and files on record"
        />
      </div>

      <TabSwitcher tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'Overview' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardBody className="flex flex-wrap items-start gap-5">
              <Avatar name={student.full_name} src={student.photo?.url} size={76} />
              <div className="min-w-[200px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[20px] font-extrabold tracking-tight text-ink">
                    {student.full_name}
                  </h2>
                  <Badge status={student.status} />
                </div>
                <p className="mt-1 text-[13.5px] text-muted">
                  {student.age ? `${student.age} years` : ''}
                  {student.gender ? ` · ${titleCase(student.gender)}` : ''}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink-soft">
                  {student.contact?.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted" aria-hidden />
                      {student.contact.phone}
                    </span>
                  )}
                  {student.contact?.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted" aria-hidden />
                      {student.contact.email}
                    </span>
                  )}
                  {student.address?.city && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted" aria-hidden />
                      {student.address.city}
                    </span>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Parents & guardians" />
            <CardBody className="pt-2">
              {student.guardians?.length ? (
                <ul className="space-y-2">
                  {student.guardians.map((guardian: any) => (
                    <li
                      key={guardian.id}
                      className="flex items-center gap-3 rounded-field bg-surface-sunken px-3.5 py-3"
                    >
                      <Avatar name={guardian.full_name} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-bold text-ink">
                          {guardian.full_name}
                        </p>
                        <p className="truncate text-[12.5px] text-muted">
                          {titleCase(guardian.relation ?? '')}
                        </p>
                      </div>
                      {guardian.contact?.phone && (
                        <span className="tabular shrink-0 text-[13px] font-semibold text-ink-soft">
                          {guardian.contact.phone}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon="users-round" title="No guardians on record" />
              )}
            </CardBody>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader title="Personal details" />
            <CardBody className="pt-2">
              <dl className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <Detail label="Date of birth" value={fmtDate(student.date_of_birth)} />
                <Detail label="Blood group" value={student.medical?.blood_group} />
                <Detail label="Category" value={student.category} />
                <Detail label="House" value={student.house} />
                <Detail label="Admitted on" value={fmtDate(student.admission_date)} />
                <Detail label="Transport" value={student.uses_transport ? 'Yes' : 'No'} />
                <Detail label="Hosteller" value={student.is_hosteller ? 'Yes' : 'No'} />
                <Detail label="Stream" value={student.stream} />
              </dl>
            </CardBody>
          </Card>
        </div>
      )}

      {tab === 'Attendance' && (
        <Card>
          <CardHeader
            title="Attendance"
            subtitle="This academic year, day by day"
            action={
              <span className="tabular text-[19px] font-extrabold text-ink">
                {percent(student.attendance?.percentage, 1)}
              </span>
            }
          />
          <CardBody className="pt-2">
            <div className="mb-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <Detail label="Days marked" value={String(student.attendance?.total_days ?? 0)} />
              <Detail label="Present" value={String(student.attendance?.present ?? 0)} />
              <Detail label="Absent" value={String(student.attendance?.absent ?? 0)} />
              <Detail label="Late" value={String(student.attendance?.late ?? 0)} />
              <Detail label="Leave" value={String(student.attendance?.leave ?? 0)} />
            </div>
            {student.attendance_days?.length ? (
              <AttendanceCalendar days={student.attendance_days} />
            ) : (
              <EmptyState
                icon="check-square"
                title="No attendance recorded yet"
                description="It appears here as soon as a register is taken for your section."
              />
            )}
          </CardBody>
        </Card>
      )}

      {tab === 'Results' && (
        <div className="space-y-4">
          {student.exam_results?.length ? (
            student.exam_results.map((exam: any) => (
              <Card key={exam.exam_id}>
                <CardHeader
                  title={exam.exam_name}
                  subtitle={titleCase(exam.exam_type ?? '')}
                  action={
                    <div className="flex items-center gap-3">
                      <span className="tabular text-[13.5px] font-bold text-ink">
                        {exam.obtained} / {exam.max_marks}
                      </span>
                      {exam.percentage != null && (
                        <Badge tone={exam.percentage >= 33 ? 'success' : 'danger'}>
                          {percent(exam.percentage, 1)}
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={pending === `/print/report-card/${student.id}/${exam.exam_id}`}
                        onClick={() =>
                          download(
                            `/print/report-card/${student.id}/${exam.exam_id}`,
                            `report-card-${exam.exam_name}.pdf`,
                            { open: true },
                          )
                        }
                      >
                        <FileText className="h-3.5 w-3.5" aria-hidden />
                        Report card
                      </Button>
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
                        row.marks_obtained == null ? (
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
                        row.percentage == null ? '—' : percent(row.percentage, 1),
                    },
                    {
                      key: 'grade',
                      header: 'Grade',
                      align: 'center',
                      cell: (row: any) => (
                        <span className="font-extrabold text-ink">{row.grade || '—'}</span>
                      ),
                    },
                    {
                      key: 'is_pass',
                      header: 'Result',
                      align: 'center',
                      cell: (row: any) =>
                        row.is_pass == null ? (
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
                  title="No marks yet"
                  description="Results appear here as soon as a teacher enters them."
                />
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {tab === 'Documents' && (
        <Card>
          <CardHeader
            title="Documents"
            subtitle="Certificates and files the school holds for you"
          />
          <CardBody className="pt-2">
            {student.documents?.length ? (
              <ul className="grid gap-2 sm:grid-cols-2">
                {student.documents.map((doc: any) => (
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
                title="No documents yet"
                description="Anything the office files against your record shows up here."
              />
            )}
          </CardBody>
        </Card>
      )}
    </Page>
  )
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-field bg-surface-sunken px-3.5 py-3">
      <dt className="text-[12px] font-semibold text-muted">{label}</dt>
      <dd className="mt-0.5 text-[14px] font-bold text-ink">{value || '—'}</dd>
    </div>
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
