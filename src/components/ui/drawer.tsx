'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Overlays render through a portal on <body>.
 *
 * Page content sits inside an entrance animation, and any CSS transform on an
 * ancestor makes `position: fixed` resolve against that ancestor rather than
 * the viewport — which collapses a full-height sheet into the header's box.
 * Escaping the tree is the only reliable fix.
 */
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return createPortal(children, document.body)
}

/** Side sheet used for create/edit forms — keeps the list visible behind it. */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  footer,
  width = 'md',
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  footer?: React.ReactNode
  width?: 'md' | 'lg'
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]"
      />
      <div
        className={cn(
          'relative flex h-full w-full flex-col bg-surface shadow-pop',
          'animate-fade-up sm:rounded-l-panel',
          width === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div className="min-w-0">
            <h2 className="truncate text-[18px] font-extrabold tracking-tight text-ink">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 truncate text-[13px] text-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted
                       transition hover:bg-surface-sunken hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-line px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
    </Portal>
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete',
  loading,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  loading?: boolean
}) {
  if (!open) return null
  return (
    <Portal>
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="alertdialog" aria-modal="true">
      <button
        type="button"
        aria-label="Cancel"
        onClick={onClose}
        className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]"
      />
      <div className="relative w-full max-w-sm animate-fade-up rounded-card bg-surface p-6 shadow-pop">
        <h2 className="text-[17px] font-extrabold text-ink">{title}</h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-pill px-4 py-2 text-[13.5px] font-semibold text-ink-soft
                       transition hover:bg-surface-sunken"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-pill bg-danger px-4 py-2 text-[13.5px] font-semibold text-white
                       transition hover:bg-danger/90 disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  )
}
