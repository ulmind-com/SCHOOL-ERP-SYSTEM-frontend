'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Icon } from '@/lib/icons'
import { Logo } from '@/components/layout/logo'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/utils'

/**
 * The company console. Dark chrome, deliberately unlike the institution
 * workspace — nobody should ever be unsure which side of the product they are
 * looking at.
 */
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { status, user, navigation, hydrate, signOut } = useSession()

  useEffect(() => {
    if (status === 'idle') void hydrate()
  }, [status, hydrate])

  useEffect(() => {
    if (status === 'anonymous') router.replace('/login')
    else if (status === 'ready' && user && user.scope !== 'platform') router.replace('/dashboard')
  }, [status, user, router])

  if (status !== 'ready' || user?.scope !== 'platform') {
    return (
      <div className="grid min-h-dvh place-items-center bg-ink">
        <Logo size={40} className="animate-pulse text-butter" />
      </div>
    )
  }

  const items = navigation.flatMap((group) => group.items)

  return (
    <div className="min-h-dvh bg-ink">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-4 px-6 py-4">
          <Link href="/platform" className="flex items-center gap-2.5">
            <Logo size={26} className="text-butter" />
            <span className="text-[18px] font-extrabold tracking-tight text-white">
              {process.env.NEXT_PUBLIC_APP_NAME ?? 'Scholarly'}
            </span>
            <span className="rounded-pill bg-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white/70">
              Platform
            </span>
          </Link>

          <nav className="order-last flex w-full gap-1 overflow-x-auto lg:order-none lg:ml-6 lg:w-auto">
            {items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== '/platform' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-pill px-3.5 py-2 text-[13.5px] font-semibold transition',
                    active ? 'bg-white text-ink' : 'text-white/60 hover:bg-white/10 hover:text-white',
                  )}
                >
                  <Icon name={item.icon} className="h-4 w-4" strokeWidth={2} aria-hidden />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-[13.5px] font-bold leading-tight text-white">{user.full_name}</p>
              <p className="text-[11.5px] leading-tight text-white/45">{user.roles[0]}</p>
            </div>
            <Avatar name={user.full_name} size={36} />
            <button
              type="button"
              aria-label="Sign out"
              onClick={() => {
                void signOut().then(() => router.replace('/login'))
              }}
              className="grid h-9 w-9 place-items-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-6 py-8">{children}</main>
    </div>
  )
}
