'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns'
import { Check, Copy, Fingerprint, Link2, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { ConfirmDialog, Drawer } from '@/components/ui/drawer'
import { DataTable } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty'
import { Input, Select } from '@/components/ui/input'
import { Page } from '@/components/layout/page'
import { useOptions } from '@/hooks/use-resource'
import { ApiError, api } from '@/lib/api'
import { cn, titleCase } from '@/lib/utils'

const STATUS_TONE = { online: 'success', offline: 'danger', never: 'neutral' } as const

export default function BiometricsPage() {
  const client = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [enrolling, setEnrolling] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const devices = useQuery({
    queryKey: ['biometric-devices'],
    queryFn: () => api.get<any>('/biometrics/devices'),
    refetchInterval: 30_000,
  })
  const unmatched = useQuery({
    queryKey: ['biometric-unmatched'],
    queryFn: () => api.get<any[]>('/biometrics/unmatched'),
  })
  const punches = useQuery({
    queryKey: ['biometric-punches'],
    queryFn: () => api.get<any>('/biometrics/punches', { page_size: 25 }),
  })

  const { data: staff } = useOptions('/staff', { status: 'active' })
  const { data: students } = useOptions('/students', { status: 'active' })

  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['biometric-devices'] })
    void client.invalidateQueries({ queryKey: ['biometric-unmatched'] })
    void client.invalidateQueries({ queryKey: ['biometric-punches'] })
  }

  const addDevice = useMutation({
    mutationFn: (body: unknown) => api.post<any>('/biometrics/devices', body),
    onSuccess: () => {
      toast.success('Device registered')
      setAdding(false)
      refresh()
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not register'),
  })

  const removeDevice = useMutation({
    mutationFn: (serial: string) => api.delete(`/biometrics/devices/${serial}`),
    onSuccess: () => {
      toast.success('Device removed')
      setRemoving(null)
      refresh()
    },
  })

  const enrol = useMutation({
    mutationFn: (body: unknown) => api.post<any>('/biometrics/enrol', body),
    onSuccess: (result) => {
      toast.success(result.detail)
      setEnrolling(null)
      refresh()
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not link'),
  })

  const sync = useMutation({
    mutationFn: () => api.post<any>('/biometrics/sync'),
    onSuccess: (result) => {
      toast.success(result.detail)
      refresh()
    },
  })

  const hint = devices.data?.push_url_hint ?? ''

  return (
    <Page
      title="Biometric Attendance"
      subtitle="ZKTeco and other ADMS devices push attendance here directly"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => sync.mutate()} loading={sync.isPending}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Apply punches
          </Button>
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Add device
          </Button>
        </div>
      }
    >
      {devices.data && !devices.data.ingestion_enabled && (
        <Card>
          <CardBody className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-field bg-blush">
              <Fingerprint className="h-5 w-5 text-ink" aria-hidden />
            </span>
            <div>
              <p className="text-[15px] font-bold text-ink">Device ingestion is switched off</p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-muted">
                Set <code className="rounded bg-surface-sunken px-1.5 py-0.5 text-[12px]">
                BIOMETRIC_DEVICE_KEY</code> on the server. Until it is set, the endpoint
                refuses every device rather than accepting anonymous attendance.
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Devices"
          subtitle="A device is 'online' if it has checked in within ten minutes"
        />
        <CardBody className="pt-2">
          {!devices.data?.devices?.length ? (
            <EmptyState
              icon="fingerprint"
              title="No devices registered"
              description="Register the reader's serial number, then point it at this server."
              action={
                <Button onClick={() => setAdding(true)}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Add device
                </Button>
              }
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {devices.data.devices.map((device: any) => (
                <li
                  key={device.serial_number}
                  className="rounded-card border border-line p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-field bg-surface-sunken">
                      <Fingerprint className="h-5 w-5 text-ink" aria-hidden />
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge tone={STATUS_TONE[device.status as keyof typeof STATUS_TONE]}>
                        {device.status === 'never' ? 'Never seen' : titleCase(device.status)}
                      </Badge>
                      <button
                        type="button"
                        aria-label="Remove device"
                        onClick={() => setRemoving(device.serial_number)}
                        className="grid h-7 w-7 place-items-center rounded-lg text-muted transition hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 text-[14px] font-bold text-ink">{device.name}</p>
                  <p className="tabular text-[12px] text-muted">{device.serial_number}</p>
                  <dl className="mt-3 space-y-1 text-[12px]">
                    <div className="flex justify-between">
                      <dt className="text-muted">Location</dt>
                      <dd className="font-semibold text-ink">{device.location || '—'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted">Punches</dt>
                      <dd className="tabular font-semibold text-ink">{device.punch_count ?? 0}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted">Last seen</dt>
                      <dd className="font-semibold text-ink">
                        {device.last_seen_at
                          ? `${formatDistanceToNowStrict(parseISO(device.last_seen_at))} ago`
                          : 'never'}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          )}

          {hint && (
            <div className="mt-4 rounded-field bg-ink px-4 py-3">
              <p className="text-[11.5px] font-bold uppercase tracking-wide text-white/45">
                Device server path
              </p>
              <div className="mt-1 flex items-center gap-3">
                <code className="tabular min-w-0 flex-1 truncate text-[12.5px] text-butter">
                  {hint}
                </code>
                <button
                  type="button"
                  aria-label="Copy"
                  onClick={() => {
                    void navigator.clipboard.writeText(hint)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1500)
                  }}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="mt-1.5 text-[11.5px] text-white/45">
                Set this as the server address on the reader. It speaks plain ADMS — no app
                needed on the device.
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {unmatched.data && unmatched.data.length > 0 && (
        <Card>
          <CardHeader
            title="Unlinked enrolment ids"
            subtitle="These devices are sending punches nobody is linked to — the usual reason attendance looks empty"
          />
          <CardBody className="pt-2">
            <ul className="space-y-2">
              {unmatched.data.map((row: any) => (
                <li
                  key={row.biometric_id}
                  className="flex flex-wrap items-center gap-3 rounded-field border border-warning/30 bg-warning/[0.04] px-3.5 py-2.5"
                >
                  <span className="tabular grid h-9 w-9 shrink-0 place-items-center rounded-field bg-warning/15 text-[13px] font-bold text-ink">
                    {row.biometric_id}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-bold text-ink">
                      Enrolment id {row.biometric_id}
                    </span>
                    <span className="block text-[12px] text-muted">
                      {row.punches} punch(es) · {row.devices.join(', ')}
                      {row.last_seen
                        ? ` · last ${format(parseISO(row.last_seen), 'd MMM, h:mm a')}`
                        : ''}
                    </span>
                  </span>
                  <Button size="sm" onClick={() => setEnrolling(row.biometric_id)}>
                    <Link2 className="h-3.5 w-3.5" aria-hidden />
                    Link to a person
                  </Button>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Recent punches" subtitle="Raw device log" />
        <DataTable
          columns={[
            {
              key: 'local_time',
              header: 'Device time',
              // Already the device's wall clock, as a string — reformatting it
              // through a Date would re-apply the browser's own offset.
              cell: (row: any) => (
                <span className="tabular">
                  {row.local_time
                    ? format(parseISO(row.local_time.replace(' ', 'T')), 'd MMM yyyy, HH:mm:ss')
                    : format(parseISO(row.punched_at), 'd MMM yyyy, HH:mm:ss')}
                </span>
              ),
            },
            {
              key: 'biometric_id',
              header: 'Enrolment id',
              cell: (row: any) => <span className="tabular">{row.biometric_id}</span>,
            },
            {
              key: 'person',
              header: 'Person',
              cell: (row: any) =>
                row.person ? (
                  <span className="font-semibold text-ink">{row.person}</span>
                ) : (
                  <span className="text-warning">Not linked</span>
                ),
            },
            {
              key: 'person_type',
              header: 'Type',
              cell: (row: any) =>
                row.person_type ? <Badge tone="neutral">{titleCase(row.person_type)}</Badge> : '—',
            },
            { key: 'device_serial', header: 'Device' },
            {
              key: 'processed',
              header: 'Applied',
              align: 'center',
              cell: (row: any) =>
                row.processed ? (
                  <Badge tone="success">Applied</Badge>
                ) : (
                  <Badge tone="neutral">Pending</Badge>
                ),
            },
          ]}
          rows={punches.data?.items ?? []}
          loading={punches.isLoading}
          empty={
            <EmptyState
              icon="fingerprint"
              title="No punches received yet"
              description="Once a device is pointed at this server, its log appears here."
            />
          }
        />
      </Card>

      {/* Register a device */}
      <Drawer
        open={adding}
        onClose={() => setAdding(false)}
        title="Register a device"
        subtitle="The serial number is printed on the reader and shown in its menu"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            addDevice.mutate({
              serial_number: form.get('serial_number'),
              name: form.get('name'),
              location: form.get('location'),
              applies_to: form.get('applies_to'),
              timezone_offset_minutes: Number(form.get('timezone_offset_minutes')),
            })
          }}
        >
          <Input name="serial_number" label="Serial number" required placeholder="ZK6820251" />
          <Input name="name" label="Name" required placeholder="Main Gate Reader" />
          <Input name="location" label="Location" placeholder="Main Gate" />
          <Select name="applies_to" label="Records attendance for" defaultValue="staff">
            {['staff', 'students', 'both'].map((value) => (
              <option key={value} value={value}>
                {titleCase(value)}
              </option>
            ))}
          </Select>
          <Input
            name="timezone_offset_minutes"
            label="Device timezone offset (minutes)"
            type="number"
            defaultValue={330}
            hint="330 for IST. Used to convert the device clock to UTC."
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={addDevice.isPending}>
              Register
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Link an enrolment id */}
      <Drawer
        open={Boolean(enrolling)}
        onClose={() => setEnrolling(null)}
        title={`Link enrolment id ${enrolling ?? ''}`}
        subtitle="Choose the person enrolled on the device under this number"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            const type = String(form.get('person_type'))
            enrol.mutate({
              person_type: type,
              person_id: form.get(type === 'staff' ? 'staff_id' : 'student_id'),
              biometric_id: enrolling,
            })
          }}
        >
          <Select name="person_type" label="Person type" defaultValue="staff" id="person-type">
            <option value="staff">Staff</option>
            <option value="student">Student</option>
          </Select>
          <Select name="staff_id" label="Staff member">
            <option value="">Select…</option>
            {(staff ?? []).map((member: any) => (
              <option key={member.id} value={member.id}>
                {member.full_name} · {member.employee_id}
              </option>
            ))}
          </Select>
          <Select name="student_id" label="Student">
            <option value="">Select…</option>
            {(students ?? []).map((student: any) => (
              <option key={student.id} value={student.id}>
                {student.full_name} · {student.admission_number}
              </option>
            ))}
          </Select>
          <p className="text-[12px] text-muted">
            Fill in whichever matches the person type above.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEnrolling(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={enrol.isPending}>
              Link
            </Button>
          </div>
        </form>
      </Drawer>

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && removeDevice.mutate(removing)}
        title="Remove this device?"
        message="Punches already received are kept. The device will be refused if it checks in again."
        confirmLabel="Remove"
        loading={removeDevice.isPending}
      />
    </Page>
  )
}
