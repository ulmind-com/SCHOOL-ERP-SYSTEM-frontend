'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ListOrdered } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Input, Select } from '@/components/ui/input'
import { useOptions } from '@/hooks/use-resource'
import { ApiError, api } from '@/lib/api'

const ORDERS = [
  { value: 'first_name', label: 'First name (A–Z)' },
  { value: 'last_name', label: 'Surname (A–Z)' },
  { value: 'admission_number', label: 'Admission number' },
  { value: 'date_of_birth', label: 'Date of birth (oldest first)' },
]

/**
 * Numbering a whole section at once, because schools redo it every year and
 * nobody wants to open forty records to do it.
 */
export function AssignRollNumbers() {
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const [classId, setClassId] = useState('')
  const [result, setResult] = useState<any>(null)

  const { data: classes } = useOptions('/classes')
  const { data: sections } = useOptions('/sections', { class_id: classId || undefined })

  const assign = useMutation({
    mutationFn: (body: unknown) => api.post<any>('/students/assign-roll-numbers', body),
    onSuccess: (data) => {
      toast.success(data.detail)
      setResult(data)
      void client.invalidateQueries({ queryKey: ['/students'] })
      void client.invalidateQueries({ queryKey: ['options', '/students'] })
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not assign roll numbers'),
  })

  function close() {
    setOpen(false)
    setResult(null)
  }

  return (
    <>
      <Button variant="secondary" size="md" onClick={() => setOpen(true)}>
        <ListOrdered className="h-4 w-4" aria-hidden />
        Roll numbers
      </Button>

      <Drawer
        open={open}
        onClose={close}
        title="Assign roll numbers"
        subtitle="One section at a time, in whichever order the school uses"
      >
        {result ? (
          <div className="space-y-4">
            <div className="rounded-card bg-surface-sunken p-4">
              <p className="text-[13.5px] font-semibold text-ink">{result.detail}</p>
            </div>
            <ul className="max-h-[50vh] space-y-1 overflow-y-auto">
              {result.students.map((student: any) => (
                <li
                  key={student.student_id}
                  className="flex items-center gap-3 rounded-field bg-surface-sunken px-3 py-2"
                >
                  <span className="tabular w-8 shrink-0 text-center text-[13px] font-extrabold text-ink">
                    {student.roll_number}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink-soft">
                    {student.name}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setResult(null)}>
                Do another section
              </Button>
              <Button onClick={close}>Done</Button>
            </div>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              assign.mutate({
                section_id: String(form.get('section_id') ?? ''),
                order_by: String(form.get('order_by') ?? 'first_name'),
                start_at: Number(form.get('start_at')) || 1,
                overwrite: form.get('overwrite') === 'on',
              })
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Class"
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
                required
              >
                <option value="">Select a class</option>
                {(classes ?? []).map((option: any) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
              <Select name="section_id" label="Section" required disabled={!classId}>
                <option value="">Select a section</option>
                {(sections ?? []).map((option: any) => (
                  <option key={option.id} value={option.id}>
                    Section {option.name}
                  </option>
                ))}
              </Select>
            </div>

            <Select name="order_by" label="Order by" defaultValue="first_name">
              {ORDERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Input
              name="start_at"
              label="Start at"
              type="number"
              min={1}
              defaultValue={1}
              hint="Useful when a section continues the numbering of another"
            />

            <label className="flex cursor-pointer items-start gap-2.5 text-[13.5px] font-semibold text-ink-soft">
              <input
                type="checkbox"
                name="overwrite"
                className="mt-0.5 h-4 w-4 rounded border-line accent-[rgb(17_18_20)]"
              />
              <span>
                Renumber everyone
                <span className="mt-0.5 block text-[12.5px] font-normal text-muted">
                  Off by default: students who already have a roll number keep it, so a
                  mid-year admission slots into the gaps instead of shifting the whole register.
                </span>
              </span>
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" loading={assign.isPending}>
                Assign
              </Button>
            </div>
          </form>
        )}
      </Drawer>
    </>
  )
}
