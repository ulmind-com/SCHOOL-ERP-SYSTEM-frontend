'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Bell, ChevronDown, Menu, Search } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useSession } from '@/lib/session'
import { cn, titleCase } from '@/lib/utils'

export function Topbar({
  title,
  subtitle,
  onMenu,
  actions,
}: {
  title: string
  subtitle?: string
  onMenu?: () => void
  actions?: React.ReactNode
}) {
  const { user, institution } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="flex flex-wrap items-center gap-4 px-1 py-1">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open navigation"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-field bg-surface shadow-card lg:hidden"
      >
        <Menu className="h-5 w-5 text-ink" aria-hidden />
      </button>

      <div className="min-w-0 flex-1 lg:flex-none">
        <h1 className="truncate text-[22px] font-extrabold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="truncate text-[13px] text-muted">{subtitle}</p>}
      </div>

      <div className="order-last w-full lg:order-none lg:mx-auto lg:w-auto lg:max-w-[420px] lg:flex-1">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search here..."
            aria-label="Search"
            className="h-11 w-full rounded-pill border border-transparent bg-surface pl-11 pr-14
                       text-sm text-ink shadow-card outline-none transition
                       placeholder:text-muted focus:border-ink/10 focus:ring-2 focus:ring-ink/5"
          />
          <kbd
            className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2
                       rounded-md bg-surface-sunken px-2 py-1 text-[11px] font-semibold
                       text-muted sm:block"
          >
            ⌘F
          </kbd>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {actions}

        <button
          type="button"
          aria-label="Notifications"
          className="relative grid h-11 w-11 place-items-center rounded-full bg-surface shadow-card
                     transition hover:bg-surface-sunken"
        >
          <Bell className="h-[18px] w-[18px] text-ink" strokeWidth={2} aria-hidden />
          <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-danger ring-2 ring-surface" />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex items-center gap-3 rounded-pill bg-surface py-1.5 pl-1.5 pr-3 shadow-card
                       transition hover:bg-surface-sunken"
          >
            <Avatar name={user?.full_name ?? '?'} src={user?.avatar_url} size={36} />
            <span className="hidden text-left sm:block">
              <span className="block max-w-[140px] truncate text-[14px] font-bold leading-tight text-ink">
                {user?.full_name ?? '—'}
              </span>
              <span className="block text-[12px] leading-tight text-muted">
                {user?.roles[0] ?? titleCase(user?.portal ?? '')}
              </span>
            </span>
            <ChevronDown
              className={cn('h-4 w-4 text-muted transition', menuOpen && 'rotate-180')}
              aria-hidden
            />
          </button>

          {menuOpen && (
            <>
              <button
                type="button"
                aria-label="Close menu"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setMenuOpen(false)}
              />
              <div
                role="menu"
                className="absolute right-0 z-20 mt-2 w-64 animate-fade-up rounded-card bg-surface p-2 shadow-pop"
              >
                <div className="border-b border-line px-3 pb-3 pt-2">
                  <p className="truncate text-[14px] font-bold text-ink">{user?.full_name}</p>
                  <p className="truncate text-[12.5px] text-muted">{user?.email}</p>
                  {institution && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge tone="neutral">{institution.name}</Badge>
                      {institution.deployment === 'dedicated' && (
                        <Badge status="dedicated">Dedicated</Badge>
                      )}
                    </div>
                  )}
                </div>
                <MenuLink href="/account" onClick={() => setMenuOpen(false)}>
                  My account
                </MenuLink>
                <MenuLink href="/account/password" onClick={() => setMenuOpen(false)}>
                  Change password
                </MenuLink>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function MenuLink({
  href,
  children,
  onClick,
}: {
  href: string
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      role="menuitem"
      className="block rounded-field px-3 py-2.5 text-[13.5px] font-semibold text-ink-soft
                 transition hover:bg-surface-sunken hover:text-ink"
    >
      {children}
    </Link>
  )
}
