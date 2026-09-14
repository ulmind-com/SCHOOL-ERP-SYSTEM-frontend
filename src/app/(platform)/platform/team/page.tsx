'use client'

import { NotBuiltYet } from '@/components/layout/not-built'

export default function Screen() {
  return (
    <div className="space-y-6">
      <h1 className="text-[28px] font-extrabold tracking-tight text-white">Platform Team</h1>
      <NotBuiltYet
        dark
        icon="user-cog"
        title="Platform Team"
        description="Company staff accounts and their platform roles. Managed directly in the database for now."
        endpoints={['POST /auth/platform/login']}
      />
    </div>
  )
}
