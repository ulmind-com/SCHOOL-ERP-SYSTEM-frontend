'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Page } from '@/components/layout/page'
import { useOptions } from '@/hooks/use-resource'
import { ApiError, api } from '@/lib/api'

/**
 * Admission in one submission: the student, their guardian and optionally both
 * logins. A front desk fills this once rather than visiting three screens.
 */
export default function NewStudentPage() {
  const router = useRouter()
  const { data: classes } = useOptions('/classes')
  const [classId, setClassId] = useState('')
  const { data: sections } = useOptions('/sections', { class_id: classId || undefined })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const mutation = useMutation({
    mutationFn: (body: unknown) => api.post<any>('/students/with-guardians', body),
    onSuccess: (result) => {
      toast.success(`Admitted — ${result.admission_number}`)
      router.push(`/students/${result.id}`)
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFieldErrors(error.fields)
        toast.error(error.message)
      }
    },
  })

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldErrors({})
    const form = new FormData(event.currentTarget)
    const value = (key: string) => String(form.get(key) ?? '').trim()

    const guardianName = value('guardian_name')
    mutation.mutate({
      student: {
        first_name: value('first_name'),
        middle_name: value('middle_name'),
        last_name: value('last_name'),
        gender: value('gender') || 'undisclosed',
        date_of_birth: value('date_of_birth') || null,
        current_class_id: value('current_class_id') || null,
        current_section_id: value('current_section_id') || null,
        admission_number: value('admission_number') || null,
        roll_number: value('roll_number') || null,
        category: value('category'),
        contact: {
          phone: value('phone'),
          email: value('email'),
        },
        address: {
          line1: value('line1'),
          city: value('city'),
          state: value('state'),
          postal_code: value('postal_code'),
        },
        medical: { blood_group: value('blood_group') },
        notes: value('notes'),
        uses_transport: form.get('uses_transport') === 'on',
        is_hosteller: form.get('is_hosteller') === 'on',
      },
      guardians: guardianName
        ? [
            {
              full_name: guardianName,
              relation: value('guardian_relation') || 'father',
              occupation: value('guardian_occupation'),
              contact: {
                phone: value('guardian_phone'),
                email: value('guardian_email'),
              },
            },
          ]
        : [],
      create_login: form.get('create_login') === 'on',
      create_guardian_login: form.get('create_guardian_login') === 'on',
    })
  }

  return (
    <Page
      title="Admit a student"
      subtitle="Admission and receipt numbers are generated automatically"
      actions={
        <Link href="/students">
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </Button>
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardHeader title="Student details" subtitle="Only the first name is required" />
          <CardBody className="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              name="first_name"
              label="First name"
              required
              placeholder="Riya"
              error={fieldErrors.first_name}
            />
            <Input name="middle_name" label="Middle name" placeholder="—" />
            <Input name="last_name" label="Last name" placeholder="Das" />
            <Input name="date_of_birth" label="Date of birth" type="date" />
            <Select name="gender" label="Gender" defaultValue="undisclosed">
              {['undisclosed', 'female', 'male', 'other'].map((value) => (
                <option key={value} value={value}>
                  {value[0].toUpperCase() + value.slice(1)}
                </option>
              ))}
            </Select>
            <Input name="blood_group" label="Blood group" placeholder="O+" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Placement"
            subtitle="Leave the admission number blank to have one generated"
          />
          <CardBody className="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              name="current_class_id"
              label="Class"
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
            >
              <option value="">Select a class</option>
              {(classes ?? []).map((option: any) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
            <Select name="current_section_id" label="Section" disabled={!classId}>
              <option value="">Select a section</option>
              {(sections ?? []).map((option: any) => (
                <option key={option.id} value={option.id}>
                  Section {option.name}
                </option>
              ))}
            </Select>
            <Input name="category" label="Category" placeholder="General / OBC / SC / ST" />
            <Input
              name="admission_number"
              label="Admission number"
              placeholder="Auto-generated"
              hint="Leave blank unless you are importing existing records"
              error={fieldErrors.admission_number}
            />
            <Input name="roll_number" label="Roll number" placeholder="Auto-assigned" />
            <div className="flex items-end gap-5 pb-2.5">
              <Checkbox name="uses_transport" label="Uses transport" />
              <Checkbox name="is_hosteller" label="Hosteller" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Contact" />
          <CardBody className="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
            <Input name="phone" label="Phone" placeholder="98xxxxxxxx" />
            <Input name="email" label="Email" type="email" placeholder="student@example.com" />
            <Input name="line1" label="Address" placeholder="House, street" />
            <Input name="city" label="City" placeholder="Kolkata" />
            <Input name="state" label="State" placeholder="West Bengal" />
            <Input name="postal_code" label="PIN code" placeholder="700001" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Parent or guardian"
            subtitle="Optional — you can add more guardians later"
          />
          <CardBody className="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
            <Input name="guardian_name" label="Full name" placeholder="Anita Das" />
            <Select name="guardian_relation" label="Relation" defaultValue="father">
              {['father', 'mother', 'guardian', 'other'].map((value) => (
                <option key={value} value={value}>
                  {value[0].toUpperCase() + value.slice(1)}
                </option>
              ))}
            </Select>
            <Input name="guardian_occupation" label="Occupation" placeholder="Teacher" />
            <Input name="guardian_phone" label="Phone" placeholder="98xxxxxxxx" />
            <Input name="guardian_email" label="Email" type="email" placeholder="parent@example.com" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Portal access" subtitle="Invitations go to the email addresses above" />
          <CardBody className="space-y-3 pt-2">
            <Checkbox name="create_login" label="Create a student login" />
            <Checkbox name="create_guardian_login" label="Create a parent login" />
            <Textarea name="notes" label="Internal notes" placeholder="Anything the office should know" />
          </CardBody>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" loading={mutation.isPending}>
            <UserPlus className="h-4 w-4" aria-hidden />
            Admit student
          </Button>
          <Link href="/students">
            <Button type="button" variant="ghost" size="lg">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </Page>
  )
}

function Checkbox({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] font-semibold text-ink-soft">
      <input
        type="checkbox"
        name={name}
        className="h-4 w-4 rounded border-line text-ink accent-[rgb(17_18_20)]"
      />
      {label}
    </label>
  )
}
