'use client'

import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft' | 'outline'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const VARIANTS: Record<Variant, string> = {
  // Near-black pill — the single strong colour in the palette.
  primary: 'bg-ink text-white hover:bg-ink/90 active:bg-ink shadow-sm',
  secondary: 'bg-surface text-ink border border-line hover:bg-surface-sunken',
  outline: 'bg-transparent text-ink border border-ink/15 hover:border-ink/30 hover:bg-ink/[0.03]',
  ghost: 'bg-transparent text-ink-soft hover:bg-ink/[0.05] hover:text-ink',
  soft: 'bg-ink/[0.06] text-ink hover:bg-ink/[0.1]',
  danger: 'bg-danger text-white hover:bg-danger/90',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-[15px] gap-2',
  icon: 'h-9 w-9',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-pill font-semibold',
        'transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
})
