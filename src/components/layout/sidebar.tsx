'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HelpCircle, LogOut, Plus, Settings } from 'lucide-react'
import { Icon } from '@/lib/icons'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/utils'
import { Wordmark } from './logo'

export function Sidebar({
  open,
  onNavigate,
}: {
  open?: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const { navigation, user, can, signOut } = useSession()

  // The server already filtered by permission and enabled module; the sidebar
  // just renders what came back, so a plan change takes effect on next load.
  const groups = navigation.filter((group) => group.items.length > 0)

  return (
    <aside
      className={cn(
        'flex h-full w-[260px] shrink-0 flex-col rounded-panel bg-surface shadow-card',
        'transition-transform duration-200 lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-[110%] lg:translate-x-0',
      )}
    >
      <div className="px-6 pb-2 pt-6">
        <Wordmark />
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-2" aria-label="Main">
        {groups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="px-3 pb-2 text-[11.5px] font-bold uppercase tracking-[0.08em] text-muted">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`))
                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group flex items-center gap-3 rounded-field px-3 py-2.5 text-[14px] font-semibold transition',
                        active
                          ? 'bg-ink text-white'
                          : 'text-ink-soft hover:bg-surface-sunken hover:text-ink',
                      )}
                    >
                      <Icon
                        name={item.icon}
                        className={cn('h-[18px] w-[18px] shrink-0',
                          active ? 'text-white' : 'text-muted group-hover:text-ink')}
                        strokeWidth={2}
                        aria-hidden
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}

        {can('students:create') && <QuickAdd onNavigate={onNavigate} />}
      </nav>

      <div className="space-y-0.5 border-t border-line px-3 py-4">
        <SidebarAction href="/help" icon={HelpCircle} label="Help Center" onClick={onNavigate} />
        {can('settings:read') && (
          <SidebarAction href="/settings" icon={Settings} label="Settings" onClick={onNavigate} />
        )}
        <button
          type="button"
          onClick={() => {
            void signOut().then(() => {
              window.location.href = '/login'
            })
          }}
          className="flex w-full items-center gap-3 rounded-field px-3 py-2.5 text-[14px]
                     font-semibold text-ink-soft transition hover:bg-surface-sunken hover:text-ink"
        >
          <LogOut className="h-[18px] w-[18px] text-muted" strokeWidth={2} aria-hidden />
          Sign Out
        </button>
        {user && (
          <p className="px-3 pt-2 text-[11.5px] text-muted">
            Signed in as {user.roles[0] ?? 'User'}
          </p>
        )}
      </div>
    </aside>
  )
}

function SidebarAction({
  href,
  icon: IconComponent,
  label,
  onClick,
}: {
  href: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-field px-3 py-2.5 text-[14px] font-semibold
                 text-ink-soft transition hover:bg-surface-sunken hover:text-ink"
    >
      <IconComponent className="h-[18px] w-[18px] text-muted" strokeWidth={2} />
      {label}
    </Link>
  )
}

/** The "Quick Add New Students" card from the reference, permission-gated. */
function QuickAdd({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="mx-1 mb-4 rounded-card bg-surface-sunken p-5 text-center">
      <div className="mb-3 flex justify-center -space-x-2.5">
        {['bg-lilac', 'bg-butter', 'bg-blush'].map((tint, index) => (
          <span
            key={tint}
            className={cn(
              'h-9 w-9 rounded-full ring-2 ring-surface-sunken',
              tint,
              index === 1 && 'h-11 w-11',
            )}
            aria-hidden
          />
        ))}
      </div>
      <p className="text-[14px] font-bold leading-snug text-ink">Quick Add New Students</p>
      <Link
        href="/students/new"
        onClick={onNavigate}
        className="mt-3 inline-flex items-center gap-2 rounded-pill bg-ink px-4 py-2.5
                   text-[13px] font-semibold text-white transition hover:bg-ink/90"
      >
        <span className="grid h-4 w-4 place-items-center rounded-full bg-white/20">
          <Plus className="h-3 w-3" aria-hidden />
        </span>
        Add Student
      </Link>
    </div>
  )
}
