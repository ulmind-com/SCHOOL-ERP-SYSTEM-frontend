import { cn } from '@/lib/utils'

/** The mark from the reference: a solid droplet, near-black on light surfaces. */
export function Logo({ className, size = 26 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn('shrink-0', className)}
    >
      <path
        d="M16 3c4.9 5.4 7.8 10.1 7.8 14.4a7.8 7.8 0 1 1-15.6 0C8.2 13.1 11.1 8.4 16 3Z"
        fill="currentColor"
      />
      <path
        d="M16 10.5c2.2 2.5 3.5 4.7 3.5 6.7a3.5 3.5 0 1 1-7 0c0-2 1.3-4.2 3.5-6.7Z"
        fill="#fff"
        fillOpacity="0.9"
      />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Logo className="text-ink" />
      <span className="text-[19px] font-extrabold tracking-tight text-ink">
        {process.env.NEXT_PUBLIC_APP_NAME ?? 'Scholarly'}
      </span>
    </div>
  )
}
