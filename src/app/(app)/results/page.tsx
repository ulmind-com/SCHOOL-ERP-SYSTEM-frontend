'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty'
import { Input, Select } from '@/components/ui/input'
import { Page } from '@/components/layout/page'
import { useOptions } from '@/hooks/use-resource'
import { ApiError, api } from '@/lib/api'
import { useSession } from '@/lib/session'
import { cn, percent } from '@/lib/utils'

/**
 * Marks entry: one exam, one subject, one section at a time — the way a
 * teacher actually works through a pile of answer scripts.
 */
export default function ResultsPage() {
  const client = useQueryClient()
  const can = useSession((state) => state.can)

  const [examId, setExamId] = useState('')
  const [classId, setClassId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [marks, setMarks] = useState<Record<string, string>>({})

  const { data: exams } = useOptions('/exams')
  const { data: classes } = useOptions('/classes')
  const { data: sections } = useOptions('/sections', { class_id: classId || undefined })
  const { data: subjects } = useOptions('/subjects', { class_id: classId || undefined })

  useEffect(() => {
    if (!examId && exams?.length) setExamId(exams[0].id)
  }, [exams, examId])
  useEffect(() => {
    if (!classId && classes?.length) setClassId(classes[0].id)
  }, [classes, classId])
  useEffect(() => {
    if (sections?.length) setSectionId((c) => (sections.some((s: any) => s.id === c) ? c : sections[0].id))
    else setSectionId('')
  }, [sections])
  useEffect(() => {
    if (subjects?.length) setSubjectId((c) => (subjects.some((s: any) => s.id === c) ? c : subjects[0].id))
    else setSubjectId('')
  }, [subjects])

  const roster = useQuery({
    queryKey: ['roster', sectionId],
    enabled: Boolean(sectionId),
    queryFn: () => api.get<any[]>(`/students/roster/${sectionId}`),
  })

  const existing = useQuery({
    queryKey: ['marks', examId, subjectId, sectionId],
    enabled: Boolean(examId && subjectId && sectionId),
    queryFn: () =>
      api.get<any>('/marks', {
        exam_id: examId,
        subject_id: subjectId,
        section_id: sectionId,
        page_size: 200,
      }),
  })

  useEffect(() => {
    const next: Record<string, string> = {}
    for (const row of existing.data?.items ?? []) {
      if (row.marks_obtained !== null && row.marks_obtained !== undefined) {
        next[row.student_id] = String(row.marks_obtained)
      }
    }
    setMarks(next)
  }, [existing.data])

  const subject = useMemo(
    () => (subjects ?? []).find((s: any) => s.id === subjectId),
    [subjects, subjectId],
  )
  const maxMarks = Number(subject?.max_marks ?? 100)
  const passMarks = Number(subject?.pass_marks ?? 33)

  const existingById = useMemo(
    () =>
      new Map<string, any>(
        (existing.data?.items ?? []).map((row: any) => [row.student_id as string, row]),
      ),
    [existing.data],
  )

  const save = useMutation({
    mutationFn: async () => {
      const students = roster.data ?? []
      for (const student of students) {
        const raw = marks[student.id]
        if (raw === undefined || raw === '') continue
        const obtained = Number(raw)
        const body = {
          exam_id: examId,
          student_id: student.id,
          subject_id: subjectId,
          section_id: sectionId,
          class_id: classId,
          max_marks: maxMarks,
          marks_obtained: obtained,
          total_marks: obtained,
          percentage: Math.round((obtained / maxMarks) * 10000) / 100,
          is_pass: obtained >= passMarks,
        }
        const found = existingById.get(student.id)
        if (found) await api.patch(`/marks/${found.id}`, body)
        else await api.post('/marks', body)
      }
    },
    onSuccess: () => {
      toast.success('Marks saved')
      void client.invalidateQueries({ queryKey: ['marks', examId, subjectId, sectionId] })
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Could not save marks'),
  })

  const entered = Object.values(marks).filter((v) => v !== '').length
  const students = roster.data ?? []

  return (
    <Page
      title="Results"
      subtitle="Enter marks by exam, subject and section"
      actions={
        can('exams:update') && students.length > 0 ? (
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!entered}>
            <Save className="h-4 w-4" aria-hidden />
            Save marks
          </Button>
        ) : undefined
      }
    >
      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b border-line px-5 py-4">
          <Select label="Exam" containerClassName="w-auto" className="min-w-[180px]" value={examId} onChange={(e) => setExamId(e.target.value)}>
            <option value="">Select an exam</option>
            {(exams ?? []).map((exam: any) => (
              <option key={exam.id} value={exam.id}>
                {exam.name}
              </option>
            ))}
          </Select>
          <Select label="Class" containerClassName="w-auto" className="min-w-[140px]" value={classId} onChange={(e) => setClassId(e.target.value)}>
            {(classes ?? []).map((option: any) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
          <Select label="Section" containerClassName="w-auto" className="min-w-[130px]" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            {(sections ?? []).map((option: any) => (
              <option key={option.id} value={option.id}>
                Section {option.name}
              </option>
            ))}
          </Select>
          <Select label="Subject" containerClassName="w-auto" className="min-w-[170px]" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {(subjects ?? []).map((option: any) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
          <div className="ml-auto pb-1 text-right">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted">
              Out of
            </p>
            <p className="tabular text-[19px] font-extrabold text-ink">{maxMarks}</p>
          </div>
        </div>

        <CardBody>
          {!examId ? (
            <EmptyState
              icon="file-badge"
              title="Create an exam first"
              description="Marks are entered against a scheduled examination."
            />
          ) : students.length === 0 ? (
            <EmptyState icon="users" title="No students in this section" />
          ) : (
            <>
              <ul className="space-y-2">
                {students.map((student: any) => {
                  const value = marks[student.id] ?? ''
                  const obtained = Number(value)
                  const valid = value !== '' && !Number.isNaN(obtained)
                  const failed = valid && obtained < passMarks
                  return (
                    <li
                      key={student.id}
                      className={cn(
                        'flex flex-wrap items-center gap-3 rounded-field border border-line px-3.5 py-2.5',
                        failed && 'border-danger/25 bg-danger/[0.03]',
                      )}
                    >
                      <span className="tabular w-7 shrink-0 text-center text-[13px] font-bold text-muted">
                        {student.roll_number || '—'}
                      </span>
                      <Avatar name={student.full_name} src={student.photo?.url} size={34} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-bold text-ink">
                          {student.full_name}
                        </span>
                        <span className="tabular block text-[12px] text-muted">
                          {student.admission_number}
                        </span>
                      </span>

                      {valid && (
                        <span className="tabular shrink-0 text-[13px] font-semibold text-muted">
                          {percent((obtained / maxMarks) * 100, 1)}
                        </span>
                      )}
                      {valid && <Badge status={failed ? 'failed' : 'paid'}>{failed ? 'Fail' : 'Pass'}</Badge>}

                      <Input
                        type="number"
                        min={0}
                        max={maxMarks}
                        step="any"
                        aria-label={`Marks for ${student.full_name}`}
                        value={value}
                        onChange={(event) =>
                          setMarks((prev) => ({ ...prev, [student.id]: event.target.value }))
                        }
                        containerClassName="w-24 shrink-0"
                        className="text-center font-bold"
                        placeholder="—"
                      />
                    </li>
                  )
                })}
              </ul>

              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-[13px] text-muted">
                  {entered} of {students.length} entered · pass mark {passMarks}
                </p>
                {can('exams:update') && (
                  <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!entered}>
                    <Save className="h-4 w-4" aria-hidden />
                    Save marks
                  </Button>
                )}
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </Page>
  )
}
