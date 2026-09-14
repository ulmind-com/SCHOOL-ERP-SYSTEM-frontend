'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { ConfirmDialog, Drawer } from '@/components/ui/drawer'
import { EmptyState } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Page } from '@/components/layout/page'
import { useResourceList } from '@/hooks/use-resource'
import { ApiError, api } from '@/lib/api'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/utils'

interface Band {
  grade: string
  min: number
  max: number
  points: number
  remark: string
}

/** What most Indian boards use, offered as a starting point rather than a rule. */
const STARTER_BANDS: Band[] = [
  { grade: 'A+', min: 90, max: 100, points: 10, remark: 'Outstanding' },
  { grade: 'A', min: 80, max: 89.99, points: 9, remark: 'Excellent' },
  { grade: 'B+', min: 70, max: 79.99, points: 8, remark: 'Very good' },
  { grade: 'B', min: 60, max: 69.99, points: 7, remark: 'Good' },
  { grade: 'C', min: 50, max: 59.99, points: 6, remark: 'Satisfactory' },
  { grade: 'D', min: 33, max: 49.99, points: 5, remark: 'Needs improvement' },
  { grade: 'E', min: 0, max: 32.99, points: 0, remark: 'Unsatisfactory' },
]

/**
 * Grade bands are an array of objects, which the generic resource screen cannot
 * edit — hence this. An institution decides both where a pass sits and what each
 * band above it is called, because no two boards agree.
 */
export function GradeScalesScreen({ prefix }: { prefix?: React.ReactNode }) {
  const client = useQueryClient()
  const can = useSession((state) => state.can)
  const list = useResourceList<any>('/grade-scales', { sortBy: 'name' })
  const [editing, setEditing] = useState<any>(null)
  const [deleting, setDeleting] = useState<any>(null)

  const canEdit = can('exams:update')
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['/grade-scales'] })
    void client.invalidateQueries({ queryKey: ['options', '/grade-scales'] })
    void client.invalidateQueries({ queryKey: ['marking-scheme'] })
  }

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/grade-scales/${id}`),
    onSuccess: () => {
      toast.success('Grade scale deleted')
      setDeleting(null)
      refresh()
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not delete that scale'),
  })

  const scales = list.data?.items ?? []
  const newScale = () => setEditing({ bands: STARTER_BANDS, pass_percentage: 33 })

  return (
    <Page
      title="Grade Scales"
      subtitle="How a percentage becomes a grade, and where a pass sits"
      actions={
        canEdit ? (
          <Button onClick={newScale}>
            <Plus className="h-4 w-4" aria-hidden />
            New grade scale
          </Button>
        ) : undefined
      }
    >
      {prefix}

      {list.isLoading ? (
        <div className="skeleton h-[220px] rounded-card" />
      ) : scales.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon="trophy"
              title="No grade scales yet"
              description="Add one and every exam that does not name its own will use the default."
              action={
                canEdit ? (
                  <Button onClick={newScale}>
                    <Plus className="h-4 w-4" aria-hidden />
                    New grade scale
                  </Button>
                ) : undefined
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {scales.map((scale: any) => (
            <Card key={scale.id}>
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    {scale.name}
                    {scale.is_default && (
                      <Badge tone="neutral">
                        <Star className="h-3 w-3" aria-hidden />
                        Default
                      </Badge>
                    )}
                  </span>
                }
                subtitle={`Pass at ${scale.pass_percentage}% · ${scale.bands?.length ?? 0} band(s)`}
                action={
                  canEdit ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="secondary" onClick={() => setEditing(scale)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Delete ${scale.name}`}
                        onClick={() => setDeleting(scale)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </div>
                  ) : undefined
                }
              />
              <CardBody className="pt-2">
                <ul className="space-y-1.5">
                  {(scale.bands ?? []).map((band: Band, index: number) => (
                    <li
                      key={index}
                      className="flex items-center gap-3 rounded-field bg-surface-sunken px-3 py-2"
                    >
                      <span className="w-9 shrink-0 text-[14px] font-extrabold text-ink">
                        {band.grade}
                      </span>
                      <span className="tabular w-[104px] shrink-0 text-[13px] font-semibold text-ink-soft">
                        {band.min}% – {band.max}%
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted">
                        {band.remark}
                      </span>
                      <span
                        className={cn(
                          'tabular shrink-0 text-[12.5px] font-bold',
                          band.min >= scale.pass_percentage ? 'text-success' : 'text-danger',
                        )}
                      >
                        {band.points} pts
                      </span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <ScaleEditor
        scale={editing}
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
        title="Delete this grade scale?"
        message={
          deleting
            ? `Exams pointing at "${deleting.name}" will fall back to the institution default.`
            : ''
        }
        confirmLabel="Delete"
        loading={remove.isPending}
      />
    </Page>
  )
}

function ScaleEditor({
  scale,
  onClose,
  onSaved,
}: {
  scale: any
  onClose: () => void
  onSaved: () => void
}) {
  const [bands, setBands] = useState<Band[]>([])
  const [formKey, setFormKey] = useState(0)
  const [seededFor, setSeededFor] = useState<string | null>(null)

  // Re-seed the rows each time a different scale is opened, without an effect
  // that would render one frame of the previous scale's bands first.
  const openedFor = scale ? (scale.id ?? 'new') : null
  if (openedFor && openedFor !== seededFor) {
    setSeededFor(openedFor)
    setBands(scale.bands?.length ? scale.bands.map((b: Band) => ({ ...b })) : STARTER_BANDS)
    setFormKey((key) => key + 1)
  }
  if (!openedFor && seededFor) setSeededFor(null)

  const save = useMutation({
    mutationFn: (body: unknown) =>
      scale?.id
        ? api.patch<any>(`/grade-scales/${scale.id}`, body)
        : api.post<any>('/grade-scales', body),
    onSuccess: () => {
      toast.success(scale?.id ? 'Grade scale updated' : 'Grade scale created')
      onSaved()
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not save that scale'),
  })

  function setBand(index: number, patch: Partial<Band>) {
    setBands((prev) => prev.map((band, i) => (i === index ? { ...band, ...patch } : band)))
  }

  const problems = bandProblems(bands)

  return (
    <Drawer
      open={Boolean(scale)}
      onClose={onClose}
      title={scale?.id ? 'Edit grade scale' : 'New grade scale'}
      subtitle="A percentage has to fall inside exactly one band"
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
            pass_percentage: Number(form.get('pass_percentage')),
            is_default: form.get('is_default') === 'on',
            bands: bands.map((band) => ({
              grade: band.grade,
              min: Number(band.min),
              max: Number(band.max),
              points: Number(band.points) || 0,
              remark: band.remark ?? '',
            })),
          })
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            name="name"
            label="Name"
            required
            defaultValue={scale?.name ?? ''}
            placeholder="CBSE 10-point"
          />
          <Input
            name="pass_percentage"
            label="Pass percentage"
            type="number"
            min={0}
            max={100}
            step="any"
            required
            defaultValue={scale?.pass_percentage ?? 33}
            hint="Below this counts as a fail"
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] font-semibold text-ink-soft">
          <input
            type="checkbox"
            name="is_default"
            defaultChecked={Boolean(scale?.is_default)}
            className="h-4 w-4 rounded border-line accent-[rgb(17_18_20)]"
          />
          Use this scale wherever an exam does not name one
        </label>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-bold text-ink">Bands</p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() =>
                setBands((prev) => [...prev, { grade: '', min: 0, max: 0, points: 0, remark: '' }])
              }
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add band
            </Button>
          </div>

          <div className="space-y-2">
            {bands.map((band, index) => (
              <div
                key={index}
                className="grid grid-cols-[64px_1fr_1fr_auto] items-end gap-2 rounded-field
                           border border-line px-3 py-2.5
                           sm:grid-cols-[72px_1fr_1fr_80px_1.4fr_auto]"
              >
                <Input
                  aria-label={`Grade for band ${index + 1}`}
                  label={index === 0 ? 'Grade' : undefined}
                  value={band.grade}
                  onChange={(event) => setBand(index, { grade: event.target.value })}
                  className="text-center font-bold"
                />
                <Input
                  aria-label={`Minimum for band ${index + 1}`}
                  label={index === 0 ? 'From %' : undefined}
                  type="number"
                  step="any"
                  value={band.min}
                  onChange={(event) => setBand(index, { min: Number(event.target.value) })}
                />
                <Input
                  aria-label={`Maximum for band ${index + 1}`}
                  label={index === 0 ? 'To %' : undefined}
                  type="number"
                  step="any"
                  value={band.max}
                  onChange={(event) => setBand(index, { max: Number(event.target.value) })}
                />
                <Input
                  aria-label={`Points for band ${index + 1}`}
                  label={index === 0 ? 'Points' : undefined}
                  type="number"
                  step="any"
                  value={band.points}
                  onChange={(event) => setBand(index, { points: Number(event.target.value) })}
                  containerClassName="hidden sm:block"
                />
                <Input
                  aria-label={`Remark for band ${index + 1}`}
                  label={index === 0 ? 'Remark' : undefined}
                  value={band.remark}
                  onChange={(event) => setBand(index, { remark: event.target.value })}
                  containerClassName="hidden sm:block"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label={`Remove band ${index + 1}`}
                  onClick={() => setBands((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </div>
            ))}
          </div>

          {problems.length > 0 && (
            <p className="mt-2 rounded-field bg-warning/10 px-3 py-2 text-[12.5px] font-medium text-warning">
              {problems.join(' ')} A mark landing in a gap gets no grade at all.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending} disabled={bands.length === 0}>
            Save grade scale
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

/** Warns about the two mistakes that actually happen: holes and overlaps. */
function bandProblems(bands: Band[]): string[] {
  const sorted = [...bands].sort((a, b) => Number(a.min) - Number(b.min))
  const problems: string[] = []
  if (sorted.length && Number(sorted[0].min) > 0) {
    problems.push(`Nothing covers 0–${sorted[0].min}%.`)
  }
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const current = Number(sorted[i].max)
    const next = Number(sorted[i + 1].min)
    if (next > current + 0.011) problems.push(`Nothing covers ${current}–${next}%.`)
    if (next < current) problems.push(`${sorted[i].grade} and ${sorted[i + 1].grade} overlap.`)
  }
  const top = sorted[sorted.length - 1]
  if (top && Number(top.max) < 100) problems.push(`Nothing covers ${top.max}–100%.`)
  return problems
}
