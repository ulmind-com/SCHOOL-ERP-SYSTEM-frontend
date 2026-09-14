'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDownload } from '@/hooks/use-download'
import type { ListState } from '@/hooks/use-resource'

/**
 * Downloads exactly what the list screen is showing.
 *
 * The API's export endpoint takes the same query string as the list endpoint,
 * so the current search, filters and sort carry over untouched — narrowing to
 * one section and then exporting gives that section, not the whole school.
 */
export function ExportButton({
  path,
  state,
  name,
  label = 'Export',
}: {
  /** Resource path, e.g. `/students`. */
  path: string
  state: ListState
  /** Filename stem; the date and extension are appended. */
  name: string
  label?: string
}) {
  const { download, pending } = useDownload()
  const [open, setOpen] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocumentClick(event: MouseEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocumentClick)
    return () => document.removeEventListener('mousedown', onDocumentClick)
  }, [open])

  function run(format: 'csv' | 'xlsx') {
    const query = new URLSearchParams()
    if (state.search) query.set('search', state.search)
    if (state.sortBy) query.set('sort_by', state.sortBy)
    query.set('sort_dir', state.sortDir)
    for (const [key, value] of Object.entries(state.filters)) {
      if (value) query.set(key, value)
    }
    query.set('format', format)
    const stamp = new Date().toISOString().slice(0, 10)
    setOpen(false)
    download(`${path}/export?${query.toString()}`, `${name}-${stamp}.${format}`)
  }

  return (
    <div ref={wrapper} className="relative">
      <Button
        variant="secondary"
        size="md"
        loading={Boolean(pending?.startsWith(`${path}/export`))}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download className="h-4 w-4" aria-hidden />
        {label}
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-card border
                     border-line bg-surface py-1 shadow-pop"
        >
          <MenuItem onClick={() => run('csv')} icon={<FileText className="h-4 w-4" aria-hidden />}>
            CSV
          </MenuItem>
          <MenuItem
            onClick={() => run('xlsx')}
            icon={<FileSpreadsheet className="h-4 w-4" aria-hidden />}
          >
            Excel
          </MenuItem>
        </div>
      )}
    </div>
  )
}

function MenuItem({
  onClick,
  icon,
  children,
}: {
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13.5px]
                 font-semibold text-ink-soft transition hover:bg-surface-sunken hover:text-ink"
    >
      {icon}
      {children}
    </button>
  )
}
