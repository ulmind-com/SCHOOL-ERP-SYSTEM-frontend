'use client'

import dynamic from 'next/dynamic'
import { Logo } from '@/components/layout/logo'
import { cn } from '@/lib/utils'

/**
 * The animation is worth ~300 KB with its player, which is more than the screen
 * it is covering. Loading it lazily keeps it off the critical path; the mark
 * below stands in for the few hundred milliseconds that takes, so there is
 * never a blank frame.
 */
const LottiePlayer = dynamic(() => import('@/components/ui/lottie-player'), {
  ssr: false,
  loading: () => <Logo size={40} className="animate-pulse text-ink" />,
})

const SIZES = { sm: 64, md: 112, lg: 168 } as const

export function Loader({
  message,
  size = 'md',
  className,
}: {
  message?: string
  size?: keyof typeof SIZES
  className?: string
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex flex-col items-center justify-center gap-3 py-10', className)}
    >
      <LottiePlayer size={SIZES[size]} />
      {message && <p className="text-[13px] font-semibold text-muted">{message}</p>}
      <span className="sr-only">{message ?? 'Loading'}</span>
    </div>
  )
}

/** The whole-screen version, for before the shell itself can render. */
export function FullPageLoader({ message }: { message?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center">
      <Loader size="lg" message={message} />
    </div>
  )
}
