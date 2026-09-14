'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSession } from '@/lib/session'

/**
 * Impossible to miss while it is on, and gone the moment it is not.
 *
 * Someone who forgets they are inside a parent's account will eventually write
 * something as that parent. The audit trail records who really did it, but the
 * cheaper fix is a bar across the top that does not let you forget.
 */
export function ImpersonationBanner() {
  const viewingAs = useSession((state) => state.viewingAs)
  const stopViewingAs = useSession((state) => state.stopViewingAs)
  const router = useRouter()
  const [leaving, setLeaving] = useState(false)

  if (!viewingAs) return null

  return (
    <div
      role="status"
      className="sticky top-0 z-50 mb-3 flex flex-wrap items-center gap-x-3 gap-y-2
                 rounded-card bg-ink px-4 py-2.5 text-white shadow-card"
    >
      <Eye className="h-4 w-4 shrink-0 text-butter" aria-hidden />
      <p className="min-w-0 flex-1 text-[13.5px] font-semibold">
        Viewing as {viewingAs.name || viewingAs.email}
        <span className="ml-2 font-normal text-white/60">
          Everything you do here is recorded against your own name.
        </span>
      </p>
      <Button
        size="sm"
        variant="secondary"
        loading={leaving}
        onClick={async () => {
          setLeaving(true)
          await stopViewingAs()
          router.replace('/settings/users')
        }}
      >
        <LogOut className="h-3.5 w-3.5" aria-hidden />
        Back to my account
      </Button>
    </div>
  )
}
