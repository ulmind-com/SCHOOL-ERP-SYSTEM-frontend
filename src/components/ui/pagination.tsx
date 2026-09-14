'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PageMeta } from '@/lib/types'
import { cn } from '@/lib/utils'

export function Pagination({
  meta,
  onChange,
}: {
  meta: PageMeta
  onChange: (page: number) => void
}) {
  if (meta.total_pages <= 1) return null

  const from = (meta.page - 1) * meta.page_size + 1
  const to = Math.min(meta.page * meta.page_size, meta.total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <p className="tabular text-[13px] text-muted">
        {from}–{to} of {meta.total}
      </p>
      <div className="flex items-center gap-1">
        <PageButton
          disabled={!meta.has_prev}
          onClick={() => onChange(meta.page - 1)}
          label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </PageButton>
        {pageWindow(meta.page, meta.total_pages).map((page, index) =>
          page === '…' ? (
            <span key={`gap-${index}`} className="px-1.5 text-muted">
              …
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => onChange(page as number)}
              aria-current={page === meta.page ? 'page' : undefined}
              className={cn(
                'tabular h-8 min-w-8 rounded-lg px-2 text-[13px] font-semibold transition',
                page === meta.page
                  ? 'bg-ink text-white'
                  : 'text-ink-soft hover:bg-surface-sunken',
              )}
            >
              {page}
            </button>
          ),
        )}
        <PageButton
          disabled={!meta.has_next}
          onClick={() => onChange(meta.page + 1)}
          label="Next page"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </PageButton>
      </div>
    </div>
  )
}

function PageButton({
  children,
  disabled,
  onClick,
  label,
}: {
  children: React.ReactNode
  disabled?: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft transition
                 hover:bg-surface-sunken disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  )
}

/** 1 … 4 5 [6] 7 8 … 20 — keeps the control a fixed width at any page count. */
function pageWindow(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '…')[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) pages.push('…')
  for (let page = start; page <= end; page += 1) pages.push(page)
  if (end < total - 1) pages.push('…')
  pages.push(total)
  return pages
}
