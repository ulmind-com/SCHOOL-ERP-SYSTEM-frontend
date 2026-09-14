'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { ConfirmDialog, Drawer } from '@/components/ui/drawer'
import { EmptyState } from '@/components/ui/empty'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Page } from '@/components/layout/page'
import { useOptions, useResourceList } from '@/hooks/use-resource'
import { ApiError, api } from '@/lib/api'
import { useSession } from '@/lib/session'
import { money } from '@/lib/utils'

interface Component {
  fee_head_id: string
  fee_head_name: string
  amount: number
  frequency: string
  is_optional: boolean
  due_day: number
}

/**
 * How often each line is charged. A structure mixes them freely — a monthly
 * tuition alongside a yearly lab fee and a one-time admission charge — and the
 * invoice run bills one cycle at a time.
 */
export const FREQUENCIES = [
  { value: 'monthly', label: 'Monthly', instalments: 12 },
  { value: 'quarterly', label: 'Quarterly', instalments: 4 },
  { value: 'half_yearly', label: 'Half-yearly', instalments: 2 },
  { value: 'semester', label: 'Per semester', instalments: 2 },
  { value: 'yearly', label: 'Yearly', instalments: 1 },
  { value: 'one_time', label: 'One-time', instalments: 1 },
]

const INSTALMENTS: Record<string, number> = Object.fromEntries(
  FREQUENCIES.map((f) => [f.value, f.instalments]),
)

const annualTotal = (components: Component[]) =>
  components.reduce(
    (sum, c) => sum + Number(c.amount || 0) * (INSTALMENTS[c.frequency] ?? 1),
    0,
  )

/**
 * Fee structures: what a class pays in a year, line by line.
 *
 * The component list is an array of objects, which the generic resource screen
 * cannot edit — and it is the part that matters, so it gets a real editor.
 */
export function FeeStructuresScreen({ prefix }: { prefix?: React.ReactNode }) {
  const client = useQueryClient()
  const can = useSession((state) => state.can)
  const list = useResourceList<any>('/fee-structures', { sortBy: 'name' })
  const [editing, setEditing] = useState<any>(null)
  const [deleting, setDeleting] = useState<any>(null)

  const { data: classes } = useOptions('/classes')
  const canEdit = can('fees:update')
  const canCreate = can('fees:create')

  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['/fee-structures'] })
    void client.invalidateQueries({ queryKey: ['options', '/fee-structures'] })
  }

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/fee-structures/${id}`),
    onSuccess: () => {
      toast.success('Fee structure deleted')
      setDeleting(null)
      refresh()
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not delete that structure'),
  })

  const structures = list.data?.items ?? []
  const classNames = new Map<string, string>(
    (classes ?? []).map((c: any) => [c.id as string, c.name as string]),
  )

  return (
    <Page
      title="Fee Structures"
      subtitle="What each class pays in a year, and on what schedule"
      actions={
        canCreate ? (
          <Button onClick={() => setEditing({ components: [], is_active: true })}>
            <Plus className="h-4 w-4" aria-hidden />
            New fee structure
          </Button>
        ) : undefined
      }
    >
      {prefix}

      {list.isLoading ? (
        <div className="skeleton h-[220px] rounded-card" />
      ) : structures.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon="receipt"
              title="No fee structures yet"
              description="A structure lists what a class is charged. Invoices are raised from it."
              action={
                canCreate ? (
                  <Button onClick={() => setEditing({ components: [], is_active: true })}>
                    <Plus className="h-4 w-4" aria-hidden />
                    New fee structure
                  </Button>
                ) : undefined
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {structures.map((structure: any) => (
            <Card key={structure.id}>
              <CardHeader
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    {structure.name}
                    {!structure.is_active && <Badge status="inactive" />}
                  </span>
                }
                subtitle={
                  <span className="flex flex-wrap items-center gap-x-2">
                    <span className="tabular font-bold text-ink">
                      {money(structure.annual_total ?? annualTotal(structure.components ?? []))}
                      <span className="ml-1 text-[11.5px] font-semibold text-muted">a year</span>
                    </span>
                    <span aria-hidden>·</span>
                    <span className="truncate">
                      {(structure.class_ids ?? [])
                        .map((id: string) => classNames.get(id))
                        .filter(Boolean)
                        .join(', ') || 'No classes assigned'}
                    </span>
                  </span>
                }
                action={
                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="secondary" onClick={() => setEditing(structure)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Duplicate ${structure.name}`}
                          onClick={() =>
                            setEditing({
                              ...structure,
                              id: undefined,
                              name: `${structure.name} (copy)`,
                            })
                          }
                        >
                          <Copy className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Delete ${structure.name}`}
                          onClick={() => setDeleting(structure)}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                      </div>
                    )}
                  </div>
                }
              />
              <CardBody className="pt-2">
                {structure.components?.length ? (
                  <ul className="space-y-1.5">
                    {structure.components.map((component: Component, index: number) => (
                      <li
                        key={index}
                        className="flex flex-wrap items-center gap-2 rounded-field bg-surface-sunken px-3 py-2"
                      >
                        <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">
                          {component.fee_head_name || 'Fee'}
                          {component.is_optional && (
                            <span className="ml-1.5 text-[11.5px] font-semibold text-muted">
                              optional
                            </span>
                          )}
                        </span>
                        <Badge tone="neutral">
                          {FREQUENCIES.find((f) => f.value === component.frequency)?.label ??
                            component.frequency}
                        </Badge>
                        <span className="tabular w-24 shrink-0 text-right text-[13.5px] font-bold text-ink">
                          {money(component.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] text-muted">No components — nothing would be billed.</p>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <StructureEditor
        structure={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          refresh()
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => remove.mutate(deleting.id)}
        title="Delete this fee structure?"
        message={
          deleting
            ? `Invoices already raised from "${deleting.name}" are not affected — only future runs.`
            : ''
        }
        confirmLabel="Delete"
        loading={remove.isPending}
      />
    </Page>
  )
}

function StructureEditor({
  structure,
  onClose,
  onSaved,
}: {
  structure: any
  onClose: () => void
  onSaved: () => void
}) {
  const { data: heads } = useOptions('/fee-heads')
  const { data: classes } = useOptions('/classes')
  const { data: years } = useOptions('/academic-years')

  const [components, setComponents] = useState<Component[]>([])
  const [classIds, setClassIds] = useState<string[]>([])
  const [formKey, setFormKey] = useState(0)
  const [seededFor, setSeededFor] = useState<string | null>(null)

  const openedFor = structure ? (structure.id ?? `new-${structure.name ?? ''}`) : null
  if (openedFor && openedFor !== seededFor) {
    setSeededFor(openedFor)
    setComponents((structure.components ?? []).map((c: Component) => ({ ...c })))
    setClassIds(structure.class_ids ?? [])
    setFormKey((key) => key + 1)
  }
  if (!openedFor && seededFor) setSeededFor(null)

  const save = useMutation({
    mutationFn: (body: unknown) =>
      structure?.id
        ? api.patch<any>(`/fee-structures/${structure.id}`, body)
        : api.post<any>('/fee-structures', body),
    onSuccess: () => {
      toast.success(structure?.id ? 'Fee structure updated' : 'Fee structure created')
      onSaved()
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not save that structure'),
  })

  function setComponent(index: number, patch: Partial<Component>) {
    setComponents((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  return (
    <Drawer
      open={Boolean(structure)}
      onClose={onClose}
      title={structure?.id ? 'Edit fee structure' : 'New fee structure'}
      subtitle="Each line carries its own schedule; the invoice run bills one at a time"
      width="lg"
    >
      <form
        key={formKey}
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          save.mutate({
            name: String(form.get('name') ?? ''),
            academic_year_id: String(form.get('academic_year_id') ?? ''),
            class_ids: classIds,
            late_fee_per_day: Number(form.get('late_fee_per_day')) || 0,
            late_fee_grace_days: Number(form.get('late_fee_grace_days')) || 0,
            max_late_fee: Number(form.get('max_late_fee')) || 0,
            is_active: form.get('is_active') === 'on',
            notes: String(form.get('notes') ?? ''),
            components: components.map((c) => ({
              fee_head_id: c.fee_head_id,
              fee_head_name: c.fee_head_name,
              amount: Number(c.amount) || 0,
              frequency: c.frequency,
              is_optional: Boolean(c.is_optional),
              due_day: Number(c.due_day) || 10,
            })),
          })
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            name="name"
            label="Name"
            required
            defaultValue={structure?.name ?? ''}
            placeholder="Class 8 — 2026/27"
          />
          <Select
            name="academic_year_id"
            label="Academic year"
            required
            defaultValue={structure?.academic_year_id ?? ''}
          >
            <option value="">Select a year</option>
            {(years ?? []).map((year: any) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-bold text-ink">Applies to</p>
          <div className="flex flex-wrap gap-2">
            {(classes ?? []).map((option: any) => {
              const on = classIds.includes(option.id)
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setClassIds((prev) =>
                      on ? prev.filter((id) => id !== option.id) : [...prev, option.id],
                    )
                  }
                  className={
                    on
                      ? 'rounded-pill bg-ink px-3.5 py-1.5 text-[13px] font-semibold text-white'
                      : 'rounded-pill bg-surface-sunken px-3.5 py-1.5 text-[13px] font-semibold text-ink-soft transition hover:bg-ink/[0.07]'
                  }
                >
                  {option.name}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-bold text-ink">Components</p>
            <span className="tabular text-[13px] font-bold text-ink">
              {money(annualTotal(components))}
              <span className="ml-1 text-[11.5px] font-semibold text-muted">a year</span>
            </span>
          </div>

          <div className="space-y-2">
            {components.map((component, index) => (
              <div key={index} className="rounded-field border border-line px-3 py-2.5">
                <div className="grid gap-2 sm:grid-cols-[1.6fr_1fr_1fr_auto]">
                  <Select
                    aria-label={`Fee head for line ${index + 1}`}
                    label={index === 0 ? 'Fee head' : undefined}
                    value={component.fee_head_id}
                    onChange={(event) => {
                      const head = (heads ?? []).find((h: any) => h.id === event.target.value)
                      setComponent(index, {
                        fee_head_id: event.target.value,
                        fee_head_name: head?.name ?? '',
                        // A head carries its own default, which is right far
                        // more often than zero.
                        amount: component.amount || Number(head?.default_amount ?? 0),
                      })
                    }}
                  >
                    <option value="">Select a fee head</option>
                    {(heads ?? []).map((head: any) => (
                      <option key={head.id} value={head.id}>
                        {head.name}
                        {head.code ? ` · ${head.code}` : ''}
                      </option>
                    ))}
                  </Select>
                  <Input
                    aria-label={`Amount for line ${index + 1}`}
                    label={index === 0 ? 'Amount' : undefined}
                    type="number"
                    min={0}
                    step="any"
                    value={component.amount}
                    onChange={(event) =>
                      setComponent(index, { amount: Number(event.target.value) })
                    }
                  />
                  <Select
                    aria-label={`Frequency for line ${index + 1}`}
                    label={index === 0 ? 'Charged' : undefined}
                    value={component.frequency}
                    onChange={(event) => setComponent(index, { frequency: event.target.value })}
                  >
                    {FREQUENCIES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove line ${index + 1}`}
                    onClick={() =>
                      setComponents((prev) => prev.filter((_, i) => i !== index))
                    }
                    className={index === 0 ? 'mt-6' : undefined}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-[12.5px] font-semibold text-ink-soft">
                    <input
                      type="checkbox"
                      checked={component.is_optional}
                      onChange={(event) =>
                        setComponent(index, { is_optional: event.target.checked })
                      }
                      className="h-4 w-4 rounded border-line accent-[rgb(17_18_20)]"
                    />
                    Optional — only billed to students who opted in
                  </label>
                  <label className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-soft">
                    Due on day
                    <input
                      type="number"
                      min={1}
                      max={28}
                      value={component.due_day}
                      onChange={(event) =>
                        setComponent(index, { due_day: Number(event.target.value) })
                      }
                      className="tabular w-14 rounded-field border border-line bg-surface px-2 py-1 text-center"
                    />
                  </label>
                  <span className="tabular text-[12.5px] text-muted">
                    {money(Number(component.amount || 0) * (INSTALMENTS[component.frequency] ?? 1))}{' '}
                    a year
                  </span>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() =>
              setComponents((prev) => [
                ...prev,
                {
                  fee_head_id: '',
                  fee_head_name: '',
                  amount: 0,
                  frequency: 'monthly',
                  is_optional: false,
                  due_day: 10,
                },
              ])
            }
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add a component
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            name="late_fee_per_day"
            label="Late fee per day"
            type="number"
            min={0}
            step="any"
            defaultValue={structure?.late_fee_per_day ?? 0}
          />
          <Input
            name="late_fee_grace_days"
            label="Grace days"
            type="number"
            min={0}
            defaultValue={structure?.late_fee_grace_days ?? 7}
          />
          <Input
            name="max_late_fee"
            label="Late fee cap"
            type="number"
            min={0}
            step="any"
            defaultValue={structure?.max_late_fee ?? 0}
            hint="0 means no cap"
          />
        </div>

        <Textarea name="notes" label="Notes" defaultValue={structure?.notes ?? ''} />

        <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] font-semibold text-ink-soft">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={structure?.is_active ?? true}
            className="h-4 w-4 rounded border-line accent-[rgb(17_18_20)]"
          />
          Active — available when raising invoices
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending} disabled={components.length === 0}>
            Save fee structure
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
