'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Page } from '@/components/layout/page'
import { useSession } from '@/lib/session'
import { titleCase } from '@/lib/utils'

export default function AccountPage() {
  const { user, institution, deploymentMode } = useSession()
  if (!user) return null

  return (
    <Page title="My account" subtitle={user.email}>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader title="Profile" />
          <CardBody className="pt-2">
            <div className="flex items-center gap-4">
              <Avatar name={user.full_name} src={user.avatar_url} size={64} />
              <div className="min-w-0">
                <p className="truncate text-[18px] font-extrabold text-ink">{user.full_name}</p>
                <p className="truncate text-[13.5px] text-muted">{user.email}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {user.roles.map((role) => (
                    <Badge key={role} tone={user.is_owner ? 'accent' : 'neutral'}>
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              <Field label="Portal" value={titleCase(user.portal)} />
              <Field label="Permissions" value={`${user.permissions.length} granted`} />
              <Field
                label="Last sign-in"
                value={
                  user.last_login_at
                    ? new Date(user.last_login_at).toLocaleString('en-IN')
                    : 'First session'
                }
              />
              <Field label="Deployment" value={titleCase(deploymentMode)} />
            </dl>

            <div className="mt-6">
              <Link href="/account/password">
                <Button variant="secondary">Change password</Button>
              </Link>
            </div>
          </CardBody>
        </Card>

        {institution && (
          <Card>
            <CardHeader title="Institution" subtitle={institution.slug} />
            <CardBody className="pt-2">
              <p className="text-[18px] font-extrabold text-ink">{institution.name}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge tone="neutral">{titleCase(institution.institution_type)}</Badge>
                <Badge status={institution.status} />
                {institution.deployment === 'dedicated' ? (
                  <Badge status="dedicated">Own deployment</Badge>
                ) : (
                  <Badge tone="info">Subscription</Badge>
                )}
              </div>

              <dl className="mt-5 grid gap-3">
                <Field
                  label="Academic year"
                  value={institution.current_academic_year?.name ?? 'Not set'}
                />
                <Field
                  label="Modules enabled"
                  value={
                    institution.deployment === 'dedicated'
                      ? 'All modules'
                      : `${institution.enabled_modules.length} of 43`
                  }
                />
                <Field
                  label="Students"
                  value={
                    institution.limits.max_students
                      ? `${institution.usage.students} of ${institution.limits.max_students}`
                      : `${institution.usage.students} (unlimited)`
                  }
                />
              </dl>
            </CardBody>
          </Card>
        )}
      </div>
    </Page>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-field bg-surface-sunken px-3.5 py-3">
      <dt className="text-[12px] font-semibold text-muted">{label}</dt>
      <dd className="mt-0.5 text-[14px] font-bold text-ink">{value}</dd>
    </div>
  )
}
