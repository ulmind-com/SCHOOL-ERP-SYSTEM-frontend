'use client'

import { useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ExportButton } from '@/components/resource/export-button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog, Drawer } from '@/components/ui/drawer'
import { DataTable, type Column } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Page } from '@/components/layout/page'
import { Pagination } from '@/components/ui/pagination'
import { useCreate, useOptions, useRemove, useResourceList, useUpdate } from '@/hooks/use-resource'
import { ApiError } from '@/lib/api'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/utils'
import type { FieldDef, FilterDef, ResourceDef } from './types'

/**
 * One screen definition drives list, create and edit for a resource — the
 * counterpart to the API's CRUD factory. Anything a resource needs beyond this
 * gets its own page rather than another flag in here.
 */
export function ResourceScreen<T extends { id: string }>({
  def,
  prefix,
}: {
  def: ResourceDef<T>
  /** Rendered inside the page, above the table — used for tab switchers so
   *  they sit under the page title rather than floating above it. */
  prefix?: React.ReactNode
}) {
  const can = useSession((state) => state.can)
  const list = useResourceList<T>(def.path, {
    sortBy: def.defaultSort,
    sortDir: def.defaultSortDir ?? 'asc',
  })

  const [editing, setEditing] = useState<T | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<T | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const create = useCreate(def.path, def.invalidates)
  const update = useUpdate(def.path, def.invalidates)
  const remove = useRemove(def.path, def.invalidates)

  const canCreate = can(`${def.module}:create`)
  // Whoever may read the list may take a copy of it; modules that declare a
  // dedicated export permission have the API enforce that on top.
  const canRead = can(`${def.module}:read`)
  const canUpdate = can(`${def.module}:update`)
  const canDelete = can(`${def.module}:delete`)

  const columns = useMemo<Column<T>[]>(() => {
    const base = [...def.columns]
    if (canUpdate || canDelete || def.rowActions) {
      base.push({
        key: '__actions',
        header: '',
        align: 'right',
        className: def.rowActions ? 'w-44' : 'w-24',
        cell: (row) => (
          <div
            className="flex items-center justify-end gap-1"
            // The row itself may navigate; the controls in it must not.
            onClick={(event) => event.stopPropagation()}
          >
            {def.rowActions?.(row)}
            {canUpdate && (
              <button
                type="button"
                aria-label="Edit"
                onClick={(event) => {
                  event.stopPropagation()
                  setErrors({})
                  setEditing(row)
                }}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-surface-sunken hover:text-ink"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                aria-label="Delete"
                onClick={(event) => {
                  event.stopPropagation()
                  setDeleting(row)
                }}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
          </div>
        ),
      })
    }
    return base
  }, [def.columns, canUpdate, canDelete])

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors({})
    const body = buildBody(def.fields, new FormData(event.currentTarget))

    const onError = (error: unknown) => {
      if (error instanceof ApiError) {
        setErrors(error.fields)
        if (!Object.keys(error.fields).length) toast.error(error.message)
      }
    }

    if (editing) {
      update.mutate(
        { id: editing.id, body },
        {
          onSuccess: () => {
            toast.success(`${def.singular} updated`)
            setEditing(null)
          },
          onError,
        },
      )
    } else {
      create.mutate(body, {
        onSuccess: () => {
          toast.success(`${def.singular} created`)
          setCreating(false)
        },
        onError,
      })
    }
  }

  const open = creating || Boolean(editing)

  return (
    <Page
      title={def.title}
      subtitle={list.data ? `${list.data.meta.total} ${def.plural.toLowerCase()}` : def.subtitle}
      actions={
        <div className="flex flex-wrap gap-2">
          {canRead && <ExportButton path={def.path} state={list.state} name={def.path.slice(1)} />}
          {canCreate && (
            <Button
              onClick={() => {
                setErrors({})
                setCreating(true)
              }}
            >
              <Plus className="h-4 w-4" aria-hidden />
              {def.createLabel ?? `New ${def.singular.toLowerCase()}`}
            </Button>
          )}
        </div>
      }
    >
      {prefix}
      <Card>
        {(def.searchable !== false || def.filters?.length) && (
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
            {def.searchable !== false && (
              <div className="min-w-[200px] flex-1">
                <Input
                  type="search"
                  placeholder={def.searchPlaceholder ?? `Search ${def.plural.toLowerCase()}`}
                  value={list.state.search}
                  onChange={(event) => list.setSearch(event.target.value)}
                  leading={<Search className="h-4 w-4" aria-hidden />}
                  className="rounded-pill border-transparent bg-surface-sunken"
                />
              </div>
            )}
            {def.filters?.map((filter) => (
              <FilterControl
                key={filter.name}
                filter={filter}
                value={list.state.filters[filter.name] ?? ''}
                onChange={(value) => list.setFilter(filter.name, value)}
              />
            ))}
          </div>
        )}

        <DataTable
          columns={columns}
          rows={list.data?.items ?? []}
          loading={list.isLoading}
          sortBy={list.state.sortBy}
          sortDir={list.state.sortDir}
          onSort={list.toggleSort}
          onRowClick={def.onRowClick}
          empty={
            <EmptyState
              icon={def.icon}
              title={
                list.state.search || list.activeFilters
                  ? `No ${def.plural.toLowerCase()} match that`
                  : def.emptyTitle ?? `No ${def.plural.toLowerCase()} yet`
              }
              description={
                list.state.search || list.activeFilters
                  ? 'Try a different search or clear the filters.'
                  : def.emptyDescription
              }
              action={
                canCreate && !list.state.search ? (
                  <Button onClick={() => setCreating(true)}>
                    <Plus className="h-4 w-4" aria-hidden />
                    {def.createLabel ?? `New ${def.singular.toLowerCase()}`}
                  </Button>
                ) : undefined
              }
            />
          }
        />

        {list.data && <Pagination meta={list.data.meta} onChange={list.setPage} />}
      </Card>

      <Drawer
        open={open}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
        title={editing ? `Edit ${def.singular.toLowerCase()}` : `New ${def.singular.toLowerCase()}`}
        subtitle={def.formSubtitle}
        width={def.formWidth}
      >
        <form onSubmit={submit} className="space-y-5">
          {groupFields(def.fields).map(([section, fields]) => (
            <fieldset key={section ?? 'main'} className="space-y-4">
              {section && (
                <legend className="text-[12px] font-bold uppercase tracking-wide text-muted">
                  {section}
                </legend>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {fields.map((field) => (
                  <FormField
                    key={field.name}
                    field={field}
                    defaultValue={editing ? readValue(editing, field.name) : field.defaultValue}
                    error={errors[field.name]}
                  />
                ))}
              </div>
            </fieldset>
          ))}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setCreating(false)
                setEditing(null)
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              {editing ? 'Save changes' : `Create ${def.singular.toLowerCase()}`}
            </Button>
          </div>
        </form>
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return
          remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }}
        title={`Delete this ${def.singular.toLowerCase()}?`}
        message="It is removed from lists but kept in the record, so it can be restored later."
        loading={remove.isPending}
      />
    </Page>
  )
}

/* ── Field rendering ───────────────────────────────────────────────────── */
function FormField({
  field,
  defaultValue,
  error,
}: {
  field: FieldDef
  defaultValue?: any
  error?: string
}) {
  const span = field.full ? 'sm:col-span-2' : ''

  if (field.type === 'remote-select') {
    return <RemoteSelect field={field} defaultValue={defaultValue} error={error} className={span} />
  }

  if (field.type === 'select') {
    return (
      <Select
        name={field.name}
        label={field.label}
        defaultValue={defaultValue ?? field.defaultValue ?? ''}
        error={error}
        required={field.required}
        containerClassName={span}
      >
        {!field.required && <option value="">—</option>}
        {(field.options ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    )
  }

  if (field.type === 'textarea') {
    return (
      <Textarea
        name={field.name}
        label={field.label}
        defaultValue={defaultValue ?? ''}
        placeholder={field.placeholder}
        error={error}
        containerClassName="sm:col-span-2"
      />
    )
  }

  if (field.type === 'checkbox') {
    return (
      <label
        className={cn(
          'flex cursor-pointer items-center gap-2.5 self-end pb-2.5 text-[13.5px] font-semibold text-ink-soft',
          span,
        )}
      >
        <input
          type="checkbox"
          name={field.name}
          defaultChecked={Boolean(defaultValue ?? field.defaultValue)}
          className="h-4 w-4 rounded border-line accent-[rgb(17_18_20)]"
        />
        {field.label}
      </label>
    )
  }

  return (
    <Input
      name={field.name}
      label={field.label}
      type={field.type ?? 'text'}
      step={field.type === 'number' ? 'any' : undefined}
      defaultValue={formatDefault(field, defaultValue)}
      placeholder={field.placeholder}
      hint={field.hint}
      error={error}
      required={field.required}
      containerClassName={span}
    />
  )
}

function RemoteSelect({
  field,
  defaultValue,
  error,
  className,
}: {
  field: FieldDef
  defaultValue?: any
  error?: string
  className?: string
}) {
  const { data, isLoading } = useOptions(field.optionsFrom ?? '', field.optionsQuery)
  return (
    <Select
      name={field.name}
      label={field.label}
      defaultValue={defaultValue ?? ''}
      error={error}
      required={field.required}
      disabled={isLoading}
      containerClassName={className}
    >
      <option value="">{isLoading ? 'Loading…' : '—'}</option>
      {(data ?? []).map((option: any) => (
        <option key={option.id} value={option.id}>
          {field.optionLabel ? field.optionLabel(option) : option.name ?? option.title ?? option.id}
        </option>
      ))}
    </Select>
  )
}

function FilterControl({
  filter,
  value,
  onChange,
}: {
  filter: FilterDef
  value: string
  onChange: (value: string) => void
}) {
  const { data } = useOptions(filter.optionsFrom ?? '', filter.optionsQuery)
  const options =
    filter.options ??
    (data ?? []).map((option: any) => ({
      value: option.id,
      label: filter.optionLabel ? filter.optionLabel(option) : option.name ?? option.title,
    }))

  return (
    <Select
      aria-label={filter.label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      containerClassName="w-auto"
      className="min-w-[140px] rounded-pill border-transparent bg-surface-sunken"
    >
      <option value="">{filter.label}</option>
      {options.map((option: any) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  )
}

/* ── Helpers ───────────────────────────────────────────────────────────── */
function groupFields(fields: FieldDef[]): [string | undefined, FieldDef[]][] {
  const groups = new Map<string | undefined, FieldDef[]>()
  for (const field of fields) {
    groups.set(field.section, [...(groups.get(field.section) ?? []), field])
  }
  return [...groups.entries()]
}

/** Supports dotted names like `contact.phone`, so nested shapes stay flat in the form. */
function readValue(row: any, name: string) {
  return name.split('.').reduce((value, key) => value?.[key], row)
}

function formatDefault(field: FieldDef, value: any) {
  if (value === undefined || value === null) return field.defaultValue ?? ''
  if (field.type === 'date' && typeof value === 'string') return value.slice(0, 10)
  return value
}

function buildBody(fields: FieldDef[], form: FormData) {
  const body: Record<string, any> = {}
  for (const field of fields) {
    let value: any
    if (field.type === 'checkbox') {
      value = form.get(field.name) === 'on'
    } else {
      const raw = form.get(field.name)
      value = raw === null ? undefined : String(raw).trim()
      if (value === '' && !field.required) value = undefined
      if (value !== undefined && field.type === 'number') value = Number(value)
    }
    if (value === undefined) continue

    // Dotted names rebuild the nested object the API expects.
    const path = field.name.split('.')
    let target = body
    for (const key of path.slice(0, -1)) {
      target[key] ??= {}
      target = target[key]
    }
    target[path[path.length - 1]] = value
  }
  return body
}
