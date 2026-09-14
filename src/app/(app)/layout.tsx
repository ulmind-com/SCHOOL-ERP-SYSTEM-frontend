'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ImpersonationBanner } from '@/components/layout/impersonation-banner'
import { MenuProvider } from '@/components/layout/menu-context'
import { Sidebar } from '@/components/layout/sidebar'
import { FullPageLoader } from '@/components/ui/loader'
import { useSession } from '@/lib/session'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { status, hydrate } = useSession()
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    if (status === 'idle') void hydrate()
  }, [status, hydrate])

  useEffect(() => {
    if (status === 'anonymous') {
      const next = encodeURIComponent(pathname)
      router.replace(`/login?next=${next}`)
    }
  }, [status, pathname, router])

  useEffect(() => {
    setNavOpen(false)
  }, [pathname])

  if (status !== 'ready') return <BootScreen />

  return (
    <div className="min-h-dvh p-3 lg:p-4">
      <div className="mx-auto flex max-w-[1600px] gap-4">
        <div
          className={`fixed inset-y-3 left-3 z-40 lg:sticky lg:top-4 lg:z-auto lg:h-[calc(100dvh-2rem)]
                      ${navOpen ? '' : 'pointer-events-none lg:pointer-events-auto'}`}
        >
          <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />
        </div>

        {navOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
            className="fixed inset-0 z-30 bg-ink/20 backdrop-blur-[2px] lg:hidden"
          />
        )}

        <main className="min-w-0 flex-1 pb-10">
          <ImpersonationBanner />
          <MenuProvider value={() => setNavOpen(true)}>{children}</MenuProvider>
        </main>
      </div>
    </div>
  )
}


function BootScreen() {
  return <FullPageLoader message="Loading your workspace…" />
}
