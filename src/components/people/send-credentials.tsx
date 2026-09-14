'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, KeyRound, MailCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Select } from '@/components/ui/input'
import { ApiError, api } from '@/lib/api'

type PersonType = 'student' | 'guardian' | 'staff'

const ROLE_CHOICES: Record<PersonType, { value: string; label: string }[]> = {
  student: [{ value: 'student', label: 'Student' }],
  guardian: [{ value: 'parent', label: 'Parent / Guardian' }],
  // A staff member is not always a teacher, and the role decides what they see.
  staff: [
    { value: 'teacher', label: 'Teacher' },
    { value: 'accountant', label: 'Accountant' },
    { value: 'librarian', label: 'Librarian' },
    { value: 'front_desk', label: 'Front Desk' },
    { value: 'hod', label: 'Head of Department' },
    { value: 'admin', label: 'Administrator' },
  ],
}

/**
 * One button for the three cases a school hits: the login was never created,
 * it was created before mail worked, or the parent deleted the message.
 *
 * Creating and re-sending are the same request because from the office's side
 * they are the same intention — get this person in.
 */
export function SendCredentials({
  personType,
  personId,
  name,
  hasLogin,
  size = 'md',
}: {
  personType: PersonType
  personId: string
  name?: string
  /** Changes the wording only; the server decides what actually happens. */
  hasLogin?: boolean
  size?: 'sm' | 'md'
}) {
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<any>(null)
  const roles = ROLE_CHOICES[personType]

  const send = useMutation({
    mutationFn: (roleKey: string) =>
      api.post<any>('/users/send-credentials', {
        person_type: personType,
        person_id: personId,
        role_key: roleKey,
      }),
    onSuccess: (data) => {
      setResult(data)
      if (data.email_sent !== false && !data.temporary_password) {
        toast.success(data.detail)
        setOpen(false)
      }
      void client.invalidateQueries({ queryKey: ['student-profile'] })
      void client.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not send the details'),
  })

  const label = hasLogin ? 'Resend login' : 'Send login'

  return (
    <>
      <Button
        variant="secondary"
        size={size}
        onClick={() => {
          setResult(null)
          // With one role there is nothing to ask, so do not ask.
          if (roles.length === 1) send.mutate(roles[0].value)
          setOpen(true)
        }}
        loading={send.isPending && roles.length === 1}
      >
        <KeyRound className="h-4 w-4" aria-hidden />
        {label}
      </Button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={hasLogin ? 'Resend sign-in details' : 'Create a login'}
        subtitle={name}
      >
        {result ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-card bg-surface-sunken p-4">
              <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-ink">{result.detail}</p>
                <p className="mt-1 text-[12.5px] text-muted">
                  They sign in at the same address everyone else does, with this email or
                  their phone number, and are asked to choose their own password straight
                  away.
                </p>
              </div>
            </div>

            {result.temporary_password && (
              <div className="rounded-card border border-warning/30 bg-warning/[0.06] p-4">
                <p className="text-[12.5px] font-semibold text-warning">
                  Nothing was emailed — pass this on yourself
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="tabular flex-1 rounded-field bg-surface px-3 py-2 text-[15px] font-bold text-ink">
                    {result.temporary_password}
                  </code>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      void navigator.clipboard.writeText(result.temporary_password)
                      toast.success('Copied')
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                    Copy
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => setOpen(false)}>Done</Button>
            </div>
          </div>
        ) : roles.length === 1 ? (
          <p className="text-[13.5px] text-muted">Sending…</p>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              send.mutate(String(new FormData(event.currentTarget).get('role_key')))
            }}
          >
            <Select
              name="role_key"
              label="Role"
              defaultValue={roles[0].value}
              hint="Decides which screens they see. Change it later under Settings → Roles."
            >
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </Select>
            <p className="text-[12.5px] text-muted">
              A password is generated and emailed to the address on their record. They are
              asked to change it the first time they sign in.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={send.isPending}>
                Send
              </Button>
            </div>
          </form>
        )}
      </Drawer>
    </>
  )
}
