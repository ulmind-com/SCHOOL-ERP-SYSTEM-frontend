'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { KeyRound, Search, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Drawer } from '@/components/ui/drawer'
import { DataTable } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty'
import { Input, Select } from '@/components/ui/input'
import { Page } from '@/components/layout/page'
import { Pagination } from '@/components/ui/pagination'
import { ApiError, api } from '@/lib/api'
import { useSession } from '@/lib/session'

export default function UsersPage() {
  const client = useQueryClient()
  const can = useSession((state) => state.can)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [inviting, setInviting] = useState(false)
  const [result, setResult] = useState<any>(null)

  const roles = useQuery({ queryKey: ['roles'], queryFn: () => api.get<any[]>('/roles') })

  const users = useQuery({
    queryKey: ['users', page, search, roleFilter],
    queryFn: () =>
      api.get<any>('/users', { page, page_size: 25, search, role_id: roleFilter }),
  })

  const invalidate = () => void client.invalidateQueries({ queryKey: ['users'] })

  const invite = useMutation({
    mutationFn: (body: unknown) => api.post<any>('/users', body),
    onSuccess: (data) => {
      setResult(data)
      invalidate()
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not create the account'),
  })

  const setActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.post<any>(`/users/${id}/${active ? 'activate' : 'deactivate'}`),
    onSuccess: (data) => {
      toast.success(data.detail)
      invalidate()
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not update the account'),
  })

  const resetPassword = useMutation({
    mutationFn: (id: string) => api.post<any>(`/users/${id}/reset-password`),
    onSuccess: (data) => setResult(data),
  })

  return (
    <Page
      title="Users & Access"
      subtitle={users.data ? `${users.data.meta.total} accounts` : 'Who can sign in'}
      actions={
        can('users:create') ? (
          <Button onClick={() => { setResult(null); setInviting(true) }}>
            <UserPlus className="h-4 w-4" aria-hidden />
            Invite user
          </Button>
        ) : undefined
      }
    >
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
          <div className="min-w-[220px] flex-1">
            <Input
              type="search"
              placeholder="Search name, email or phone"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              leading={<Search className="h-4 w-4" aria-hidden />}
              className="rounded-pill border-transparent bg-surface-sunken"
            />
          </div>
          <Select
            aria-label="Filter by role"
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value)
              setPage(1)
            }}
            containerClassName="w-auto"
            className="min-w-[160px] rounded-pill border-transparent bg-surface-sunken"
          >
            <option value="">All roles</option>
            {(roles.data ?? []).map((role: any) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
        </div>

        <DataTable
          columns={[
            {
              key: 'full_name',
              header: 'User',
              cell: (row: any) => (
                <div className="flex items-center gap-3">
                  <Avatar name={row.full_name} src={row.avatar_url} size={36} />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-bold text-ink">{row.full_name}</p>
                    <p className="truncate text-[12px] text-muted">{row.email}</p>
                  </div>
                </div>
              ),
            },
            {
              key: 'roles',
              header: 'Roles',
              cell: (row: any) => (
                <div className="flex flex-wrap gap-1">
                  {row.roles.map((role: any) => (
                    <Badge key={role.id} tone="neutral">
                      {role.name}
                    </Badge>
                  ))}
                </div>
              ),
            },
            {
              key: 'last_login_at',
              header: 'Last sign-in',
              cell: (row: any) =>
                row.last_login_at ? format(parseISO(row.last_login_at), 'd MMM, h:mm a') : 'Never',
            },
            {
              key: 'status',
              header: 'Status',
              align: 'center',
              cell: (row: any) => (
                <Badge status={row.is_active ? row.status : 'suspended'} />
              ),
            },
            {
              key: '__actions',
              header: '',
              align: 'right',
              cell: (row: any) =>
                can('users:update') ? (
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      title="Reset password"
                      aria-label="Reset password"
                      onClick={() => resetPassword.mutate(row.id)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-surface-sunken hover:text-ink"
                    >
                      <KeyRound className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <Button
                      size="sm"
                      variant={row.is_active ? 'ghost' : 'soft'}
                      onClick={() => setActive.mutate({ id: row.id, active: !row.is_active })}
                    >
                      {row.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                ) : null,
            },
          ]}
          rows={users.data?.items ?? []}
          loading={users.isLoading}
          empty={<EmptyState icon="user-cog" title="No users match that" />}
        />
        {users.data && <Pagination meta={users.data.meta} onChange={setPage} />}
      </Card>

      <Drawer
        open={inviting}
        onClose={() => {
          setInviting(false)
          setResult(null)
        }}
        title="Invite a user"
        subtitle="They receive an invitation to set their own password"
      >
        {result ? (
          <div className="space-y-4">
            <div className="rounded-card bg-mint p-4">
              <p className="text-[14px] font-bold text-ink">{result.detail}</p>
              {result.temporary_password && (
                <>
                  <p className="mt-3 text-[12px] font-semibold text-ink/60">Temporary password</p>
                  <p className="tabular mt-0.5 select-all text-[18px] font-extrabold text-ink">
                    {result.temporary_password}
                  </p>
                </>
              )}
              {result.invite_token && (
                <>
                  <p className="mt-3 text-[12px] font-semibold text-ink/60">
                    Invite token (development only)
                  </p>
                  <p className="mt-0.5 select-all break-all text-[11.5px] text-ink/70">
                    {result.invite_token}
                  </p>
                </>
              )}
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink/60">
                Share this securely. They will be asked to set their own password on first
                sign-in.
              </p>
            </div>
            <Button
              onClick={() => {
                setResult(null)
                setInviting(false)
              }}
            >
              Done
            </Button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              invite.mutate({
                email: form.get('email'),
                full_name: form.get('full_name'),
                phone: form.get('phone'),
                role_ids: [String(form.get('role_id'))],
                send_invite: form.get('send_invite') === 'on',
              })
            }}
          >
            <Input name="full_name" label="Full name" required placeholder="Anita Sen" />
            <Input name="email" label="Email" type="email" required placeholder="anita@school.edu" />
            <Input name="phone" label="Phone" type="tel" />
            <Select name="role_id" label="Role" required>
              <option value="">Select a role</option>
              {(roles.data ?? []).map((role: any) => (
                <option key={role.id} value={role.id}>
                  {role.name} — {role.description}
                </option>
              ))}
            </Select>
            <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] font-semibold text-ink-soft">
              <input
                type="checkbox"
                name="send_invite"
                defaultChecked
                className="h-4 w-4 rounded border-line accent-[rgb(17_18_20)]"
              />
              Send an invitation instead of a temporary password
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setInviting(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={invite.isPending}>
                Create account
              </Button>
            </div>
          </form>
        )}
      </Drawer>
    </Page>
  )
}
