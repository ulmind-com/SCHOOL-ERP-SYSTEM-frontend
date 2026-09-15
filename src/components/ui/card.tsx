import { cn } from '@/lib/utils'

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('card', className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        // Wraps so a header's buttons drop below the title on a phone rather
        // than squeezing it down to two syllables.
        'flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-6 pt-5',
        className,
      )}
    >
      <div className="min-w-[180px] flex-1">
        {/* Wraps to two lines rather than truncating: on a phone a real title
            beside a badge had almost no room, and "Herbarium she…" tells a
            student nothing. */}
        <h3 className="line-clamp-2 text-[17px] font-bold text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 truncate text-[13px] text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function CardBody({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-5', className)}>{children}</div>
}
