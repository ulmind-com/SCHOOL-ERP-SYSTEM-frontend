'use client'

import { cn } from '@/lib/utils'

/**
 * Pill tabs that sit under a page title, for screens that are really two
 * resources the user thinks of as one place ("Classes & Sections").
 */
export function TabSwitcher<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly T[]
  active: T
  onChange: (tab: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tabs.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => onChange(name)}
          aria-current={active === name ? 'page' : undefined}
          className={cn(
            'rounded-pill px-4 py-2 text-[13.5px] font-semibold transition',
            active === name
              ? 'bg-ink text-white'
              : 'bg-surface text-ink-soft shadow-card hover:bg-surface-sunken',
          )}
        >
          {name}
        </button>
      ))}
    </div>
  )
}
