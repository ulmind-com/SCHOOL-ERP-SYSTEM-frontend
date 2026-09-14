'use client'

import { NotBuiltYet } from '@/components/layout/not-built'

export default function Screen() {
  return (
    <div className="space-y-6">
      <h1 className="text-[28px] font-extrabold tracking-tight text-white">Activity</h1>
      <NotBuiltYet
        dark
        icon="scroll-text"
        title="Activity"
        description="Platform-wide audit trail across every institution. Each institution's own trail is already visible inside its workspace."
        endpoints={['GET /audit-log']}
      />
    </div>
  )
}
