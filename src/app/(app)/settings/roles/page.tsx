'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Lock, Plus, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Drawer } from '@/components/ui/drawer'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Page } from '@/components/layout/page'
import { ApiError, api } from '@/lib/api'
import { useSession } from '@/lib/session'
import { cn, titleCase } from '@/lib/utils'

/**
 * Roles are per-institution documents, so a college can invent "Exam
 * Controller" without waiting on us. This editor writes the same permission
 * strings the API enforces — nothing is cosmetic.
 */
export default function RolesPage() {
  const client = useQueryClient()
  const can = useSession((state) => state.can)
  const [editing, setEditing] = useState<any>(null)
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const roles = useQuery({ queryKey: ['roles'], queryFn: () => api.get<any[]>('/roles') })
  const catalogue = useQuery({
    queryKey: ['role-catalogue'],
    queryFn: () => api.get<any>('/roles/catalogue'),
  })

  const invalidate = () => {
    void client.invalidateQueries({ queryKey: ['roles'] })
  }

  const create = useMutation({
    mutationFn: (body: unknown) => api.post<any>('/roles', body),
    onSuccess: () => {
      toast.success('Role created')
      close()
      invalidate()
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Could not save'),
  })

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) => api.patch<any>(`/roles/${id}`, body),
    onSuccess: () => {
      toast.success('Role updated')
      close()
      invalidate()
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Could not save'),
  })

  function open(role: any | null) {
    setEditing(role)
    setCreating(role === null)
    setSelected(new Set<string>(role?.permissions ?? []))
  }

  function close() {
    setEditing(null)
    setCreating(false)
    setSelected(new Set())
  }

  function toggleModule(moduleKey: string, permissions: string[], enabled: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (enabled) {
        next.delete(`${moduleKey}:*`)
        for (const permission of permissions) next.delete(permission)
      } else {
        next.add(`${moduleKey}:*`)
      }
      return next
    })
  }

  function togglePermission(permission: string, moduleKey: string, all: string[]) {
    setSelected((prev) => {
      const next = new Set(prev)
      // Expand a wildcard before removing one action from it, so the grid
      // reflects what is actually granted.
      if (next.has(`${moduleKey}:*`)) {
        next.delete(`${moduleKey}:*`)
        for (const p of all) next.add(p)
      }
      if (next.has(permission)) next.delete(permission)
      else next.add(permission)
      return next
    })
  }

  const isOn = (permission: string, moduleKey: string) =>
    selected.has('*') || selected.has(`${moduleKey}:*`) || selected.has(permission)

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const body = {
      name: form.get('name'),
      description: form.get('description'),
      portal: form.get('portal'),
      permissions: [...selected],
    }
    if (editing) update.mutate({ id: editing.id, body })
    else create.mutate(body)
  }

  return (
    <Page
      title="Roles & Permissions"
      subtitle={roles.data ? `${roles.data.length} roles defined` : 'Who can do what'}
      actions={
        can('roles:create') ? (
          <Button onClick={() => open(null)}>
            <Plus className="h-4 w-4" aria-hidden />
            New role
          </Button>
        ) : undefined
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(roles.data ?? []).map((role: any) => (
          <Card key={role.id}>
            <CardBody>
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    'grid h-10 w-10 shrink-0 place-items-center rounded-field',
                    role.is_owner ? 'bg-butter' : 'bg-surface-sunken',
                  )}
                >
                  <Shield className="h-5 w-5 text-ink" aria-hidden />
                </span>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {role.is_owner && <Badge tone="accent">Owner</Badge>}
                  {role.is_system && !role.is_owner && <Badge tone="neutral">Built-in</Badge>}
                  <Badge tone="info">{titleCase(role.portal)}</Badge>
                </div>
              </div>

              <h3 className="mt-3 text-[16px] font-extrabold text-ink">{role.name}</h3>
              <p className="mt-1 line-clamp-2 min-h-[36px] text-[12.5px] leading-relaxed text-muted">
                {role.description}
              </p>

              <dl className="mt-4 flex items-center gap-4">
                <div>
                  <dt className="text-[11.5px] font-semibold text-muted">Permissions</dt>
                  <dd className="tabular text-[15px] font-bold text-ink">
                    {role.permissions?.includes('*')
                      ? 'All'
                      : role.effective_permission_count ?? 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11.5px] font-semibold text-muted">Users</dt>
                  <dd className="tabular text-[15px] font-bold text-ink">{role.user_count ?? 0}</dd>
                </div>
              </dl>

              <div className="mt-4">
                {role.is_owner ? (
                  <p className="flex items-center gap-1.5 text-[12px] text-muted">
                    <Lock className="h-3.5 w-3.5" aria-hidden />
                    The owner role always has full access
                  </p>
                ) : (
                  can('roles:update') && (
                    <Button variant="secondary" size="sm" onClick={() => open(role)}>
                      Edit permissions
                    </Button>
                  )
                )}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Drawer
        open={creating || Boolean(editing)}
        onClose={close}
        title={editing ? `Edit ${editing.name}` : 'New role'}
        subtitle="Tick a whole module, or individual actions within it"
        width="lg"
      >
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input name="name" label="Role name" required defaultValue={editing?.name} />
            <Select name="portal" label="Lands in" defaultValue={editing?.portal ?? 'admin'}>
              {(catalogue.data?.portals ?? ['admin']).map((portal: string) => (
                <option key={portal} value={portal}>
                  {titleCase(portal)} portal
                </option>
              ))}
            </Select>
          </div>
          <Textarea name="description" label="Description" defaultValue={editing?.description} />

          <div className="space-y-5">
            {(catalogue.data?.groups ?? []).map((group: any) => (
              <section key={group.group}>
                <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-muted">
                  {group.group}
                </h3>
                <div className="space-y-2">
                  {group.modules.map((module: any) => {
                    const allOn = selected.has('*') || selected.has(`${module.key}:*`)
                    return (
                      <div
                        key={module.key}
                        className={cn(
                          'rounded-field border px-3.5 py-3',
                          module.enabled ? 'border-line' : 'border-line/60 opacity-55',
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="flex cursor-pointer items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={allOn}
                              disabled={!module.enabled}
                              onChange={() => toggleModule(module.key, module.permissions, allOn)}
                              className="h-4 w-4 rounded border-line accent-[rgb(17_18_20)]"
                            />
                            <span className="text-[13.5px] font-bold text-ink">{module.label}</span>
                          </label>
                          {!module.enabled && (
                            <Badge tone="neutral">
                              <Lock className="h-3 w-3" aria-hidden />
                              Not in plan
                            </Badge>
                          )}
                          <div className="ml-auto flex flex-wrap gap-1.5">
                            {module.actions.map((action: string) => {
                              const permission = `${module.key}:${action}`
                              const on = isOn(permission, module.key)
                              return (
                                <button
                                  key={action}
                                  type="button"
                                  disabled={!module.enabled}
                                  onClick={() =>
                                    togglePermission(permission, module.key, module.permissions)
                                  }
                                  className={cn(
                                    'rounded-pill px-2.5 py-1 text-[11.5px] font-bold transition',
                                    'disabled:pointer-events-none',
                                    on
                                      ? 'bg-ink text-white'
                                      : 'bg-surface-sunken text-muted hover:bg-ink/10 hover:text-ink',
                                  )}
                                >
                                  {titleCase(action)}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className="sticky bottom-0 -mx-6 flex justify-end gap-3 border-t border-line bg-surface px-6 py-4">
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              {editing ? 'Save role' : 'Create role'}
            </Button>
          </div>
        </form>
      </Drawer>
    </Page>
  )
}
