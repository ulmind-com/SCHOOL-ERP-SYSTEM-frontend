'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Loader } from '@/components/ui/loader'
import { Page } from '@/components/layout/page'
import { useOptions } from '@/hooks/use-resource'
import { ApiError, api } from '@/lib/api'

const STATUSES = ['active', 'inactive', 'graduated', 'transferred', 'dropped', 'suspended']

/** A date input needs `YYYY-MM-DD`; the API sends a full timestamp. */
function dateValue(value: string | null | undefined) {
  return value ? String(value).slice(0, 10) : ''
}

export default function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: () => api.get<any>(`/students/${id}`),
  })

  // The section list depends on the chosen class, so it is state rather than a
  // plain default value — picking a new class has to repopulate it.
  const [classId, setClassId] = useState('')
  useEffect(() => {
    if (student?.current_class_id) setClassId(student.current_class_id)
  }, [student?.current_class_id])

  const { data: classes } = useOptions('/classes')
  const { data: sections } = useOptions('/sections', { class_id: classId || undefined })

  const mutation = useMutation({
    mutationFn: (body: unknown) => api.patch<any>(`/students/${id}`, body),
    onSuccess: () => {
      toast.success('Student updated')
      queryClient.invalidateQueries({ queryKey: ['student', id] })
      queryClient.invalidateQueries({ queryKey: ['student-profile', id] })
      queryClient.invalidateQueries({ queryKey: ['students'] })
      router.push(`/students/${id}`)
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFieldErrors(error.fields)
        toast.error(error.message)
      }
    },
  })

  if (isLoading || !student) {
    return (
      <Page title="Edit student">
        <Loader message="Fetching the record…" />
      </Page>
    )
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldErrors({})
    const form = new FormData(event.currentTarget)
    const value = (key: string) => String(form.get(key) ?? '').trim()

    mutation.mutate({
      first_name: value('first_name'),
      middle_name: value('middle_name'),
      last_name: value('last_name'),
      gender: value('gender'),
      date_of_birth: value('date_of_birth') || null,
      current_class_id: value('current_class_id') || null,
      current_section_id: value('current_section_id') || null,
      admission_number: value('admission_number'),
      roll_number: value('roll_number'),
      category: value('category'),
      house: value('house'),
      stream: value('stream'),
      status: value('status'),
      contact: { phone: value('phone'), email: value('email') },
      address: {
        line1: value('line1'),
        city: value('city'),
        state: value('state'),
        postal_code: value('postal_code'),
      },
      medical: { ...(student.medical ?? {}), blood_group: value('blood_group') },
      notes: value('notes'),
      uses_transport: form.get('uses_transport') === 'on',
      is_hosteller: form.get('is_hosteller') === 'on',
    })
  }

  const fullName = [student.first_name, student.middle_name, student.last_name]
    .filter(Boolean)
    .join(' ')

  return (
    <Page
      title={`Edit ${fullName}`}
      subtitle={student.admission_number}
      actions={
        <Link href={`/students/${id}`}>
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to profile
          </Button>
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardHeader title="Student details" />
          <CardBody className="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              name="first_name"
              label="First name"
              required
              defaultValue={student.first_name ?? ''}
              error={fieldErrors.first_name}
            />
            <Input name="middle_name" label="Middle name" defaultValue={student.middle_name ?? ''} />
            <Input name="last_name" label="Last name" defaultValue={student.last_name ?? ''} />
            <Input
              name="date_of_birth"
              label="Date of birth"
              type="date"
              defaultValue={dateValue(student.date_of_birth)}
            />
            <Select name="gender" label="Gender" defaultValue={student.gender ?? 'undisclosed'}>
              {['undisclosed', 'female', 'male', 'other'].map((value) => (
                <option key={value} value={value}>
                  {value[0].toUpperCase() + value.slice(1)}
                </option>
              ))}
            </Select>
            <Input
              name="blood_group"
              label="Blood group"
              defaultValue={student.medical?.blood_group ?? ''}
              placeholder="O+"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Placement" subtitle="Moving a section re-counts both strengths" />
          <CardBody className="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              name="current_class_id"
              label="Class"
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
            >
              <option value="">No class</option>
              {(classes ?? []).map((option: any) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
            <Select
              name="current_section_id"
              label="Section"
              disabled={!classId}
              defaultValue={student.current_section_id ?? ''}
              key={`section-${classId}`}
            >
              <option value="">No section</option>
              {(sections ?? []).map((option: any) => (
                <option key={option.id} value={option.id}>
                  Section {option.name}
                </option>
              ))}
            </Select>
            <Input
              name="admission_number"
              label="Admission number"
              defaultValue={student.admission_number ?? ''}
              error={fieldErrors.admission_number}
            />
            <Input name="roll_number" label="Roll number" defaultValue={student.roll_number ?? ''} />
            <Input name="category" label="Category" defaultValue={student.category ?? ''} />
            <Input name="house" label="House" defaultValue={student.house ?? ''} />
            <Input name="stream" label="Stream" defaultValue={student.stream ?? ''} />
            <Select name="status" label="Status" defaultValue={student.status ?? 'active'}>
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value[0].toUpperCase() + value.slice(1)}
                </option>
              ))}
            </Select>
            <div className="flex items-end gap-5 pb-2.5">
              <Checkbox
                name="uses_transport"
                label="Uses transport"
                defaultChecked={Boolean(student.uses_transport)}
              />
              <Checkbox
                name="is_hosteller"
                label="Hosteller"
                defaultChecked={Boolean(student.is_hosteller)}
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Contact" />
          <CardBody className="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
            <Input name="phone" label="Phone" defaultValue={student.contact?.phone ?? ''} />
            <Input
              name="email"
              label="Email"
              type="email"
              defaultValue={student.contact?.email ?? ''}
              error={fieldErrors['contact.email']}
            />
            <Input name="line1" label="Address" defaultValue={student.address?.line1 ?? ''} />
            <Input name="city" label="City" defaultValue={student.address?.city ?? ''} />
            <Input name="state" label="State" defaultValue={student.address?.state ?? ''} />
            <Input
              name="postal_code"
              label="PIN code"
              defaultValue={student.address?.postal_code ?? ''}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Internal notes"
            subtitle="Parents and guardians are edited on the Parents screen"
          />
          <CardBody className="pt-2">
            <Textarea name="notes" label="Notes" defaultValue={student.notes ?? ''} />
          </CardBody>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" loading={mutation.isPending}>
            <Save className="h-4 w-4" aria-hidden />
            Save changes
          </Button>
          <Link href={`/students/${id}`}>
            <Button type="button" variant="ghost" size="lg">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </Page>
  )
}

function Checkbox({
  name,
  label,
  defaultChecked,
}: {
  name: string
  label: string
  defaultChecked?: boolean
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] font-semibold text-ink-soft">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-line text-ink accent-[rgb(17_18_20)]"
      />
      {label}
    </label>
  )
}
